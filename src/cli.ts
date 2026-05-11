#!/usr/bin/env node
import { Command } from "commander";
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { globSync } from "glob";
import { validateCopDocument } from "./validator.js";
import { renderHtml, renderMarkdown } from "./renderer.js";
import { applyOperations, hashEntity } from "./engine.js";
import type { CopDocument, CopOperation } from "./types.js";

function readCop(path: string): CopDocument {
  return JSON.parse(readFileSync(path, "utf8")) as CopDocument;
}

function writeCop(path: string, doc: CopDocument): void {
  writeFileSync(path, JSON.stringify(doc, null, 2), "utf8");
}

function expandInputs(inputs: string[]): string[] {
  const paths: string[] = [];
  for (const input of inputs) {
    const matches = globSync(input, { nodir: true });
    if (matches.length === 0) paths.push(input);
    else paths.push(...matches);
  }
  return [...new Set(paths)];
}

function writeOrPrint(output: string, out?: string): void {
  if (out) writeFileSync(out, output, "utf8");
  else process.stdout.write(output + "\n");
}

/** Rough token estimate — provider-neutral. CJK text may differ by 2-4x. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

const program = new Command();
program.name("copctl").alias("cop").description("Cognitive Object Protocol CLI").version("0.1.4");

// ─── validate ────────────────────────────────────────────────────────────────
program
  .command("validate")
  .description("Validate one or more COP JSON files")
  .argument("<files...>", "COP JSON files or glob patterns")
  .action((files: string[]) => {
    const paths = expandInputs(files);
    let failed = false;
    for (const path of paths) {
      try {
        const doc = readCop(path);
        const result = validateCopDocument(doc);
        if (result.valid) console.log(`✓ ${path}`);
        else { failed = true; console.error(`✗ ${path}`); }
        for (const issue of result.issues) {
          const prefix = issue.level === "error" ? "  error" : "  warning";
          console.error(`${prefix}: ${issue.message}`);
        }
      } catch (error) {
        failed = true;
        console.error(`✗ ${path}`);
        console.error(`  error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (failed) process.exitCode = 1;
  });

// ─── render ──────────────────────────────────────────────────────────────────
program
  .command("render")
  .description("Render COP to a view format")
  .argument("<file>", "COP JSON file")
  .option("--to <format>", "Output format: html", "html")
  .option("--view <viewId>", "Filter output by view definition id")
  .option("--out <path>", "Output path (stdout if omitted)")
  .action((file: string, options: { to: string; view?: string; out?: string }) => {
    const doc = readCop(file);
    const result = validateCopDocument(doc);
    if (!result.valid) {
      console.error("Cannot render invalid COP document.");
      for (const issue of result.issues.filter((i) => i.level === "error"))
        console.error(`  error: ${issue.message}`);
      process.exit(1);
    }
    if (options.to !== "html") {
      console.error(`Unsupported render format: ${options.to}. Supported: html`);
      process.exit(1);
    }
    writeOrPrint(renderHtml(doc, options.view), options.out);
  });

// ─── export ──────────────────────────────────────────────────────────────────
program
  .command("export")
  .description("Export COP to a portable format")
  .argument("<file>", "COP JSON file")
  .option("--to <format>", "Output format: markdown", "markdown")
  .option("--out <path>", "Output path (stdout if omitted)")
  .action((file: string, options: { to: string; out?: string }) => {
    const doc = readCop(file);
    const result = validateCopDocument(doc);
    if (!result.valid) {
      console.error("Cannot export invalid COP document.");
      for (const issue of result.issues.filter((i) => i.level === "error"))
        console.error(`  error: ${issue.message}`);
      process.exit(1);
    }
    if (options.to !== "markdown") {
      console.error(`Unsupported export format: ${options.to}. Supported: markdown`);
      process.exit(1);
    }
    writeOrPrint(renderMarkdown(doc), options.out);
  });

// ─── context ─────────────────────────────────────────────────────────────────
program
  .command("context")
  .description("Generate a minimal context packet for a target block")
  .argument("<file>", "COP JSON file")
  .requiredOption("--target <blockId>", "Target block ID")
  .option("--depth <n>", "Relation traversal depth", "1")
  .option("--prompt", "Output a ready-to-paste model prompt to stderr")
  .option("--prompt-out <path>", "Write prompt to a file instead of stderr")
  .option("--estimate-tokens", "Print rough token estimates (CJK text may differ by 2-4x)")
  .option("--include-instructions", "Include instruction blocks (excluded by default for safety)")
  .option("--out <path>", "Output path for the context packet JSON")
  .action((
    file: string,
    options: {
      target: string;
      depth: string;
      prompt: boolean;
      promptOut?: string;
      estimateTokens: boolean;
      includeInstructions: boolean;
      out?: string;
    }
  ) => {
    const doc = readCop(file);
    const depth = parseInt(options.depth, 10) || 1;

    const block = doc.blocks.find((b) => b.id === options.target);
    if (!block) {
      console.error(`Target block not found: ${options.target}`);
      process.exit(1);
    }

    // BFS over relations up to depth
    const visited = new Set<string>([options.target]);
    let frontier = new Set<string>([options.target]);
    for (let d = 0; d < depth; d++) {
      const next = new Set<string>();
      for (const rel of doc.relations) {
        if (frontier.has(rel.from) && !visited.has(rel.to)) next.add(rel.to);
        if (frontier.has(rel.to) && !visited.has(rel.from)) next.add(rel.from);
      }
      for (const id of next) visited.add(id);
      frontier = next;
    }
    visited.delete(options.target);

    const relatedRelations = doc.relations.filter(
      (rel) => rel.from === options.target || rel.to === options.target
    );

    // SECURITY: exclude instruction blocks by default
    let relatedBlocks = doc.blocks.filter((b) => visited.has(b.id));
    const excludedInstructions: string[] = [];
    if (!options.includeInstructions) {
      const before = relatedBlocks.length;
      relatedBlocks = relatedBlocks.filter((b) => {
        if (b.type === "instruction") {
          excludedInstructions.push(b.id);
          return false;
        }
        return true;
      });
      if (excludedInstructions.length > 0) {
        console.error(
          `  info: Excluded ${excludedInstructions.length} instruction block(s) from context packet: ${excludedInstructions.join(", ")}. Use --include-instructions to override.`
        );
      }
    }

    // Warn if focus block itself is an instruction
    if (block.type === "instruction") {
      console.error(
        `  warning: Target block ${block.id} is of type "instruction". Review content carefully before sending to model.`
      );
    }

    const comments = (doc.comments ?? []).filter((c) => c.target.id === options.target);

    const packet = {
      protocol: "cop-context",
      version: "0.1",
      id: `ctx_${basename(file).replace(/[^A-Za-z0-9]+/g, "_")}_${options.target}`,
      task: { type: "review_or_rewrite_block", target: options.target },
      focus: { block },
      context: { related_relations: relatedRelations, related_blocks: relatedBlocks, comments },
      expected_output: {
        format: "cop_operations",
        allowed_ops: ["update_block", "add_comment", "change_state", "create_block", "add_relation"],
        note: "Return only proposed operations. Do not set trust_level to human_reviewed.",
      },
    };

    const packetText = JSON.stringify(packet, null, 2);
    writeOrPrint(packetText, options.out);

    // Prompt generation — wrap block content in XML tags to reduce injection risk
    let promptText = "";
    if (options.prompt || options.promptOut) {
      const safeBlock = `<cop:block id="${block.id}" type="${block.type}">\n${JSON.stringify(block.content, null, 2)}\n</cop:block>`;
      const safeRelated = relatedBlocks
        .map(
          (b) =>
            `<cop:block id="${b.id}" type="${b.type}">\n${JSON.stringify(b.content, null, 2)}\n</cop:block>`
        )
        .join("\n");
      const safeComments = comments.length
        ? `<cop:comments>\n${JSON.stringify(comments, null, 2)}\n</cop:comments>`
        : "(none)";

      promptText = `You are editing a COP (Cognitive Object Protocol) document.

## Focus block
${safeBlock}

## Related blocks
${safeRelated || "(none)"}

## Human comments on this block
${safeComments}

## Task
Review or rewrite the focus block. Return ONLY a JSON object with an "operations" array.

Rules:
- Allowed operations: update_block, create_block, add_comment, add_relation, change_state
- Do NOT set trust_level to "human_reviewed"
- Do NOT rewrite the entire document
- Preserve all existing block IDs
- Prefer JSON Patch payloads (patch_format: "json_patch") for precise changes

## Response format
{
  "operations": [
    {
      "id": "op_<unique>",
      "op": "update_block",
      "target": "${options.target}",
      "actor": { "type": "agent", "name": "<model-name>" },
      "patch_format": "json_patch",
      "patch": [{ "op": "replace", "path": "/content/text", "value": "..." }],
      "reason": "...",
      "status": "proposed",
      "created_at": "${new Date().toISOString()}"
    }
  ]
}`;

      if (options.promptOut) {
        writeFileSync(options.promptOut, promptText, "utf8");
        console.error(`Prompt written to: ${options.promptOut}`);
      } else {
        console.error("\n--- PROMPT (copy to model) ---\n");
        process.stderr.write(promptText + "\n");
      }
    }

    if (options.estimateTokens) {
      console.error("\n--- TOKEN ESTIMATE (rough, ±25%; CJK text may differ by 2-4x) ---");
      console.error(`packet_json  chars=${packetText.length.toLocaleString()} approx_tokens≈${estimateTokens(packetText).toLocaleString()}`);
      if (promptText) {
        console.error(`prompt       chars=${promptText.length.toLocaleString()} approx_tokens≈${estimateTokens(promptText).toLocaleString()}`);
      }
    }
  });

// ─── apply-op ────────────────────────────────────────────────────────────────
program
  .command("apply-op")
  .alias("apply")
  .description("Apply proposed operation patches to a COP document")
  .argument("<file>", "COP JSON file to modify")
  .argument("<opfile>", "JSON file containing { operations: [...] }")
  .option("--dry-run", "Preview changes without writing to disk")
  .option("--out <path>", "Output path (overwrites input file if omitted)")
  .action((file: string, opfile: string, options: { dryRun: boolean; out?: string }) => {
    const doc = readCop(file);
    const opPayload = JSON.parse(readFileSync(opfile, "utf8")) as {
      operations: CopOperation[];
    };

    if (!Array.isArray(opPayload.operations)) {
      console.error('Operation file must have an { "operations": [...] } structure.');
      process.exit(1);
    }

    const { doc: newDoc, results, appliedCount, skippedCount } = applyOperations(
      doc,
      opPayload.operations
    );

    for (const [opId, result] of results) {
      if (result.applied) {
        console.log(`  applied: ${opId}`);
      } else {
        console.error(`  skipped: ${opId} — ${result.error}`);
      }
      for (const w of result.warnings) {
        console.error(`  warning: ${w}`);
      }
    }

    const validation = validateCopDocument(newDoc);
    if (!validation.valid) {
      console.error("\nResulting document failed validation:");
      for (const issue of validation.issues.filter((i) => i.level === "error")) {
        console.error(`  error: ${issue.message}`);
      }
      if (!options.dryRun) {
        console.error("No file written due to validation errors. Use --dry-run to inspect.");
        process.exit(1);
      }
    }

    console.log(`\nSummary: ${appliedCount} applied, ${skippedCount} skipped.`);

    if (!options.dryRun) {
      const outPath = options.out ?? file;
      writeCop(outPath, newDoc);
      console.log(`Written to: ${outPath}`);
    } else {
      console.log("Dry run — no files written.");
      process.stdout.write(JSON.stringify(newDoc, null, 2) + "\n");
    }
  });

// ─── hash ────────────────────────────────────────────────────────────────────
program
  .command("hash")
  .description("Print the stable hash of a block (for use as preconditions.target_hash)")
  .argument("<file>", "COP JSON file")
  .requiredOption("--target <blockId>", "Block ID to hash")
  .action((file: string, options: { target: string }) => {
    const doc = readCop(file);
    const block = doc.blocks.find((b) => b.id === options.target);
    if (!block) {
      console.error(`Block not found: ${options.target}`);
      process.exit(1);
    }
    console.log(hashEntity(block));
  });

program.parse();
