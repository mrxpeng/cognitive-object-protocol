import { createRequire } from "node:module";
import type { ErrorObject } from "ajv";
const require = createRequire(import.meta.url);
const Ajv = require("ajv/dist/2020");
const addFormats = require("ajv-formats");
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { CopDocument } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const schemaDir = resolve(repoRoot, "schemas");

function loadJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

export type ValidationIssue = {
  level: "error" | "warning";
  message: string;
  path?: string;
};

export type ValidationResult = {
  valid: boolean;
  issues: ValidationIssue[];
};

export function createAjv(): any {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const schemas = [
    "state.schema.json",
    "object.schema.json",
    "block.schema.json",
    "relation.schema.json",
    "comment.schema.json",
    "operation.schema.json",
    "view.schema.json",
    "source.schema.json",
    "cop.schema.json",
  ];
  for (const file of schemas) {
    ajv.addSchema(loadJson(resolve(schemaDir, file)), `./${file}`);
  }
  return ajv;
}

function formatAjvError(error: ErrorObject): ValidationIssue {
  return {
    level: "error",
    path: error.instancePath || "/",
    message: `${error.instancePath || "/"} ${error.message ?? "schema error"}`,
  };
}

export function validateCopDocument(doc: unknown): ValidationResult {
  const ajv = createAjv();
  const validate =
    ajv.getSchema("https://cognitiveobjectprotocol.org/schemas/cop.schema.json") ??
    ajv.getSchema("./cop.schema.json");
  if (!validate) {
    return { valid: false, issues: [{ level: "error", message: "COP schema not found" }] };
  }

  const issues: ValidationIssue[] = [];

  // Schema validation
  const schemaValid = validate(doc);
  if (!schemaValid) {
    issues.push(...(validate.errors ?? []).map(formatAjvError));
  }

  // Reference and semantic validation always run
  issues.push(...validateReferences(doc as CopDocument));
  issues.push(...validateSemantics(doc as CopDocument));

  return {
    valid: !issues.some((issue) => issue.level === "error"),
    issues,
  };
}

export function validateReferences(doc: CopDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const blockIds = new Set<string>();
  const relationIds = new Set<string>();
  const commentIds = new Set<string>();
  const operationIds = new Set<string>();
  const sourceIds = new Set<string>((doc.sources ?? []).map((s) => s.id));

  // Build comment ID set first (comments can be relation targets)
  for (const comment of doc.comments ?? []) {
    if (commentIds.has(comment.id)) {
      issues.push({ level: "error", message: `Duplicate comment id: ${comment.id}` });
    }
    commentIds.add(comment.id);
  }

  for (const block of doc.blocks ?? []) {
    if (blockIds.has(block.id)) {
      issues.push({ level: "error", message: `Duplicate block id: ${block.id}` });
    }
    blockIds.add(block.id);
  }

  for (const relation of doc.relations ?? []) {
    if (relationIds.has(relation.id)) {
      issues.push({ level: "error", message: `Duplicate relation id: ${relation.id}` });
    }
    relationIds.add(relation.id);

    const knownIds = new Set([...blockIds, ...sourceIds, ...commentIds]);
    if (!knownIds.has(relation.from)) {
      issues.push({
        level: "error",
        message: `Relation ${relation.id} has unknown from reference: ${relation.from}`,
      });
    }
    if (!knownIds.has(relation.to)) {
      issues.push({
        level: "error",
        message: `Relation ${relation.id} has unknown to reference: ${relation.to}`,
      });
    }
  }

  for (const comment of doc.comments ?? []) {
    const allIds = new Set([...blockIds, ...relationIds]);
    if (!allIds.has(comment.target.id)) {
      issues.push({
        level: "warning",
        message: `Comment ${comment.id} targets unknown entity: ${comment.target.id}`,
      });
    }
  }

  for (const operation of doc.operations ?? []) {
    if (operationIds.has(operation.id)) {
      issues.push({ level: "error", message: `Duplicate operation id: ${operation.id}` });
    }
    operationIds.add(operation.id);
    if (operation.target) {
      const allIds = new Set([...blockIds, ...relationIds, ...commentIds]);
      if (!allIds.has(operation.target)) {
        issues.push({
          level: "warning",
          message: `Operation ${operation.id} targets unknown entity: ${operation.target}`,
        });
      }
    }
  }

  return issues;
}

export function validateSemantics(doc: CopDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Trust elevation: only human actors may set human_reviewed.
  // "verified" is intentionally not part of v0.1; it is reserved for future signed trust extensions.
  const HUMAN_ONLY_TRUST = new Set(["human_reviewed"]);
  for (const block of doc.blocks ?? []) {
    const tl = block.state?.trust_level;
    if (tl && HUMAN_ONLY_TRUST.has(tl)) {
      const setOp = (doc.operations ?? []).find(
        (op) =>
          op.op === "change_state" &&
          op.target === block.id &&
          op.status === "applied" &&
          op.patch &&
          (op.patch as any).trust_level === tl
      );
      if (setOp) {
        const actorType =
          typeof setOp.actor === "object" ? (setOp.actor as any).type : null;
        if (actorType && actorType !== "human") {
          issues.push({
            level: "error",
            message: `Block ${block.id} has trust_level "${tl}" set by non-human actor in operation ${setOp.id}. Only human actors may set human_reviewed.`,
          });
        }
      }
    }
  }

  // Warn on human actor without auth.verified
  for (const operation of doc.operations ?? []) {
    const actor = operation.actor;
    if (actor && typeof actor === "object") {
      const actorType = (actor as any).type;
      const auth = (actor as any).auth;
      if (actorType === "human" && !auth?.verified) {
        issues.push({
          level: "warning",
          message: `Operation ${operation.id} uses actor.type=human without auth.verified — treat as workflow metadata only, not cryptographic identity.`,
        });
      }
    }
  }

  // Applied update/change_state without target_hash — concurrent edit warning
  for (const operation of doc.operations ?? []) {
    if (
      operation.status === "applied" &&
      ["update_block", "change_state"].includes(operation.op)
    ) {
      if (!(operation as any).preconditions?.target_hash) {
        issues.push({
          level: "warning",
          message: `Applied operation ${operation.id} has no preconditions.target_hash — concurrent edit conflicts cannot be detected.`,
        });
      }
    }
  }

  // Instruction block warning — prompt injection risk
  for (const block of doc.blocks ?? []) {
    if (block.type === "instruction") {
      issues.push({
        level: "warning",
        message: `Block ${block.id} is of type "instruction". Review content before including in model context (prompt injection risk).`,
      });
    }
  }

  // content.text required for text/markdown/code formats
  const TEXT_FORMATS = new Set(["text", "markdown", "code"]);
  for (const block of doc.blocks ?? []) {
    if (TEXT_FORMATS.has(block.content.format) && typeof block.content.text !== "string") {
      issues.push({
        level: "error",
        message: `Block ${block.id} has format "${block.content.format}" but is missing content.text`,
      });
    }
  }

  return issues;
}
