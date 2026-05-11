/**
 * COP Operation Engine — v0.2.0-alpha.1
 *
 * Extracted from CLI so it can be used independently by tests, MCP servers, etc.
 * All apply functions return { doc, results, ... } and never mutate the input document.
 */

import { createHash } from "node:crypto";
import type {
  CopBlock,
  CopComment,
  CopDocument,
  CopOperation,
  CopRelation,
} from "./types.js";

// ─── Utilities ────────────────────────────────────────────────────────────────

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

export function hashEntity(value: unknown): string {
  return `sha256:${createHash("sha256").update(stableStringify(value)).digest("hex")}`;
}

export function decodePointer(path: string): string[] {
  if (!path.startsWith("/"))
    throw new Error(`JSON Pointer must start with '/': ${path}`);
  const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);
  const parts = path
    .slice(1)
    .split("/")
    .map((p) => p.replace(/~1/g, "/").replace(/~0/g, "~"));
  for (const part of parts) {
    if (FORBIDDEN_KEYS.has(part)) {
      throw new Error(`Forbidden JSON Pointer key "${part}" — prototype pollution attempt blocked.`);
    }
  }
  return parts;
}

// ─── Protected path enforcement ───────────────────────────────────────────────

const FORBIDDEN_BLOCK_PATCH_PATHS = new Set([
  "/id",
  "/type",
  "/state/trust_level",
]);

const HIGH_RISK_BLOCK_PATCH_PATHS = new Set([
  "/state/review_status",
  "/state/lifecycle",
]);

/**
 * Check whether a JSON Patch path is allowed for update_block.
 * Blocks:
 *   - exact match with FORBIDDEN paths (/id, /type, /state/trust_level)
 *   - any path that is a PARENT of a forbidden path (e.g. /state replaces /state/trust_level)
 */
export function assertAllowedBlockPatchPath(path: string): void {
  if (FORBIDDEN_BLOCK_PATCH_PATHS.has(path)) {
    throw new Error(
      `Forbidden JSON Patch path "${path}". Protected fields may not be modified by update_block json_patch.`
    );
  }
  // Parent-path check: if the patch path is a prefix of any forbidden path,
  // the replacement would overwrite the protected field.
  for (const forbidden of FORBIDDEN_BLOCK_PATCH_PATHS) {
    if (forbidden.startsWith(path + "/")) {
      throw new Error(
        `Forbidden: JSON Patch path "${path}" would overwrite protected field "${forbidden}". Use a semantic operation instead.`
      );
    }
  }
}

export function warnHighRiskBlockPatchPath(path: string): string | null {
  if (HIGH_RISK_BLOCK_PATCH_PATHS.has(path)) {
    return `JSON Patch path "${path}" changes a high-risk semantic field — review carefully.`;
  }
  // Parent-path warning for high-risk paths
  for (const highRisk of HIGH_RISK_BLOCK_PATCH_PATHS) {
    if (highRisk.startsWith(path + "/")) {
      return `JSON Patch path "${path}" may overwrite high-risk field "${highRisk}" — review carefully.`;
    }
  }
  return null;
}

export function applyJsonPatch(target: unknown, patch: unknown[]): unknown {
  const cloned: any = JSON.parse(JSON.stringify(target));
  for (const item of patch) {
    const op = item as { op: string; path: string; value?: unknown };
    const parts = decodePointer(op.path);
    let parent: any = cloned;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      if (parent[key] === undefined || parent[key] === null) parent[key] = {};
      parent = parent[key];
    }
    const leaf = parts[parts.length - 1];
    if (op.op === "replace" || op.op === "add") parent[leaf] = op.value;
    else if (op.op === "remove") delete parent[leaf];
    else throw new Error(`Unsupported JSON Patch op: ${op.op}`);
  }
  return cloned;
}

export function mergePatch<T extends Record<string, unknown>>(
  target: T,
  patch: unknown
): { result: T; warnings: string[] } {
  const warnings: string[] = [];
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    return { result: target, warnings };
  }
  const p = patch as Record<string, unknown>;
  if ("id" in p) {
    throw new Error(`update_block may not change block.id (attempted to set id="${p.id}")`);
  }
  if ("type" in p && p.type !== (target as any).type) {
    warnings.push(`update_block changes block.type from "${(target as any).type}" to "${p.type}" — review carefully.`);
  }
  return { result: { ...target, ...p } as T, warnings };
}

export function checkPreconditions(op: CopOperation, current: unknown): string | null {
  const pre = (op as any).preconditions;
  if (!pre?.target_hash) return null;
  const actual = hashEntity(current);
  if (pre.target_hash !== actual) {
    return `precondition failed for ${op.id}: target_hash mismatch (expected ${pre.target_hash}, got ${actual})`;
  }
  return null;
}

const COMMENT_STATUSES = new Set(["open", "accepted", "rejected", "resolved", "superseded"]);

export function validateCommentStatus(status: string): void {
  if (!COMMENT_STATUSES.has(status)) {
    throw new Error(`Invalid comment status "${status}". Allowed: ${[...COMMENT_STATUSES].join(", ")}`);
  }
}

// ─── Trust guard ──────────────────────────────────────────────────────────────

const HUMAN_ONLY_TRUST = new Set(["human_reviewed"]);

/**
 * After any block modification via update_block, verify the resulting block
 * has not acquired a HUMAN_ONLY trust_level from a non-human actor.
 * This catches both json_patch parent-path replacement and object_merge state overwrite.
 */
function assertNoTrustElevation(
  block: CopBlock,
  originalTrustLevel: string | undefined,
  actorType: string | null,
  opId: string
): void {
  const newTrust = block.state?.trust_level;
  if (
    newTrust &&
    newTrust !== originalTrustLevel &&
    HUMAN_ONLY_TRUST.has(newTrust) &&
    actorType !== "human"
  ) {
    throw new Error(
      `operation ${opId}: update_block resulted in trust_level "${newTrust}" from non-human actor — rejected. Use change_state with a human actor to elevate trust.`
    );
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type OperationResult = {
  applied: boolean;
  warnings: string[];
  error?: string;
};

export type EngineResult = {
  doc: CopDocument;
  results: Map<string, OperationResult>;
  appliedCount: number;
  skippedCount: number;
};

// ─── Main apply function ──────────────────────────────────────────────────────

const SUPPORTED_OPS = new Set([
  "update_block",
  "change_state",
  "create_block",
  "add_comment",
  "resolve_comment",
  "add_relation",
]);

export function applyOperations(
  inputDoc: CopDocument,
  operations: CopOperation[]
): EngineResult {
  const doc: CopDocument = JSON.parse(JSON.stringify(inputDoc));
  const results = new Map<string, OperationResult>();
  let appliedCount = 0;
  let skippedCount = 0;

  for (const op of operations) {
    const opId = op.id ?? "(no id)";
    const opWarnings: string[] = [];

    try {
      if (!SUPPORTED_OPS.has(op.op)) {
        throw new Error(`op "${op.op}" is not executable by engine v0.2.0-alpha.1 (supported: ${[...SUPPORTED_OPS].join(", ")})`);
      }

      // Replay protection
      if (op.id && (doc.operations ?? []).some((o) => o.id === op.id)) {
        throw new Error(`operation ${op.id} already exists in document (replay rejected)`);
      }

      // Actor type extraction (used by multiple checks)
      const actorType =
        op.actor && typeof op.actor === "object"
          ? String((op.actor as any).type ?? "") || null
          : null;

      // Trust elevation guard for change_state
      if (op.op === "change_state" && op.patch) {
        const newTrust = (op.patch as any).trust_level;
        if (newTrust && HUMAN_ONLY_TRUST.has(newTrust) && actorType !== "human") {
          throw new Error(`operation ${opId} attempts to set trust_level "${newTrust}" from non-human actor — rejected`);
        }
        if (actorType === "human" && !(op.actor as any).auth?.verified) {
          opWarnings.push(`actor.type=human without auth.verified — treat as workflow metadata, not cryptographic identity`);
        }
      }

      // ── update_block ──
      if (op.op === "update_block") {
        if (!op.target) throw new Error("update_block missing target");
        const idx = doc.blocks.findIndex((b) => b.id === op.target);
        if (idx === -1) throw new Error(`block not found: ${op.target}`);
        const conflict = checkPreconditions(op, doc.blocks[idx]);
        if (conflict) throw new Error(conflict);

        const originalTrust = doc.blocks[idx].state?.trust_level;
        const fmt = (op as any).patch_format ?? "object_merge";

        let candidateBlock: CopBlock;
        if (fmt === "json_patch") {
          if (!Array.isArray(op.patch)) {
            throw new Error("update_block with patch_format=json_patch requires patch to be an array");
          }
          for (const item of op.patch as any[]) {
            const patchPath = String(item?.path ?? "");
            assertAllowedBlockPatchPath(patchPath);
            const warning = warnHighRiskBlockPatchPath(patchPath);
            if (warning) opWarnings.push(warning);
          }
          candidateBlock = applyJsonPatch(doc.blocks[idx], op.patch as unknown[]) as CopBlock;
        } else {
          const { result, warnings } = mergePatch(doc.blocks[idx] as Record<string, unknown>, op.patch);
          candidateBlock = result as unknown as CopBlock;
          opWarnings.push(...warnings);
        }

        // Post-apply trust elevation check (catches both json_patch and object_merge bypasses)
        // Important: check the candidate BEFORE assigning it into the document so failed ops
        // cannot leave partial mutations behind.
        assertNoTrustElevation(candidateBlock, originalTrust, actorType, opId);
        doc.blocks[idx] = candidateBlock;
      }

      // ── change_state ──
      else if (op.op === "change_state") {
        if (!op.target) throw new Error("change_state missing target");
        const idx = doc.blocks.findIndex((b) => b.id === op.target);
        if (idx === -1) throw new Error(`block not found for change_state: ${op.target}`);
        const conflict = checkPreconditions(op, doc.blocks[idx]);
        if (conflict) throw new Error(conflict);
        doc.blocks[idx].state = { ...(doc.blocks[idx].state ?? {}), ...((op.patch ?? {}) as any) };
      }

      // ── create_block ──
      else if (op.op === "create_block") {
        const block = (op.patch as any)?.block as CopBlock | undefined;
        if (!block) throw new Error("create_block requires patch.block");
        if (!block.id || !block.type || !block.content) {
          throw new Error("create_block: block must have id, type, and content");
        }
        if (doc.blocks.some((b) => b.id === block.id)) {
          throw new Error(`block already exists: ${block.id}`);
        }
        // SECURITY: reject create_block with elevated trust from non-human actor
        if (block.state?.trust_level && HUMAN_ONLY_TRUST.has(block.state.trust_level) && actorType !== "human") {
          throw new Error(
            `create_block: block "${block.id}" has trust_level "${block.state.trust_level}" but actor is not human — rejected. Use change_state with a human actor to set trust.`
          );
        }
        if (block.type === "instruction" && actorType !== "human") {
          opWarnings.push(`creating instruction block "${block.id}" from non-human actor — high prompt injection risk`);
        }
        doc.blocks.push(block);
      }

      // ── add_relation ──
      else if (op.op === "add_relation") {
        const relation = (op.patch as any)?.relation as CopRelation | undefined;
        if (!relation) throw new Error("add_relation requires patch.relation");
        if (!relation.id || !relation.from || !relation.to || !relation.type) {
          throw new Error("add_relation: relation must have id, from, to, and type");
        }
        if (doc.relations.some((r) => r.id === relation.id)) {
          throw new Error(`relation already exists: ${relation.id}`);
        }
        const knownIds = new Set([
          ...doc.blocks.map((b) => b.id),
          ...(doc.sources ?? []).map((s) => s.id),
        ]);
        if (!knownIds.has(relation.from)) throw new Error(`add_relation: unknown from reference: ${relation.from}`);
        if (!knownIds.has(relation.to)) throw new Error(`add_relation: unknown to reference: ${relation.to}`);
        doc.relations.push(relation);
      }

      // ── add_comment ──
      else if (op.op === "add_comment") {
        const comment = (op.patch as any)?.comment as CopComment | undefined;
        if (!comment) throw new Error("add_comment requires patch.comment");
        if (!comment.id || !comment.target || !comment.content) {
          throw new Error("add_comment: comment must have id, target, and content");
        }
        if (!doc.comments) doc.comments = [];
        if (doc.comments.some((c) => c.id === comment.id)) throw new Error(`comment already exists: ${comment.id}`);
        const allIds = new Set([...doc.blocks.map((b) => b.id), ...doc.relations.map((r) => r.id)]);
        if (!allIds.has(comment.target.id)) {
          opWarnings.push(`add_comment targets unknown entity: ${comment.target.id} — comment will be dangling`);
        }
        doc.comments.push(comment);
      }

      // ── resolve_comment ──
      else if (op.op === "resolve_comment") {
        if (!op.target) throw new Error("resolve_comment missing target comment id");
        if (!doc.comments) doc.comments = [];
        const idx = doc.comments.findIndex((c) => c.id === op.target);
        if (idx === -1) throw new Error(`comment not found: ${op.target}`);
        const newStatus = String((op.patch as any)?.status ?? "resolved");
        validateCommentStatus(newStatus);
        if (doc.comments[idx].status !== "open" && newStatus === "resolved") {
          opWarnings.push(`resolve_comment: comment ${op.target} status is "${doc.comments[idx].status}", not "open" — proceeding anyway`);
        }
        doc.comments[idx].status = newStatus;
      }

      // Record applied operation
      if (!doc.operations) doc.operations = [];
      doc.operations.push({ ...op, status: "applied", created_at: op.created_at ?? new Date().toISOString() });
      results.set(opId, { applied: true, warnings: opWarnings });
      appliedCount++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.set(opId, { applied: false, warnings: opWarnings, error: msg });
      skippedCount++;
    }
  }

  return { doc, results, appliedCount, skippedCount };
}
