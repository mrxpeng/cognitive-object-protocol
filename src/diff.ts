import { createHash } from "node:crypto";
import type { CopDocument, CopBlock, CopRelation } from "./types.js";

export type ParsedDiffFile = {
  oldPath: string;
  newPath: string;
  hunks: ParsedDiffHunk[];
};

export type ParsedDiffHunk = {
  header: string;
  oldStart?: number;
  oldLines?: number;
  newStart?: number;
  newLines?: number;
  lines: string[];
};

function sanitizeId(input: string): string {
  return input
    .replace(/^[ab]\//, "")
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || "item";
}

function shortHash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 8);
}

function stableIdPart(input: string): string {
  return `${sanitizeId(input)}_${shortHash(input)}`;
}

function parseHunkHeader(header: string): Partial<ParsedDiffHunk> {
  const m = header.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?/);
  if (!m) return {};
  return {
    oldStart: Number(m[1]),
    oldLines: Number(m[2] ?? "1"),
    newStart: Number(m[3]),
    newLines: Number(m[4] ?? "1"),
  };
}

export function parseUnifiedDiff(diffText: string): ParsedDiffFile[] {
  const files: ParsedDiffFile[] = [];
  let currentFile: ParsedDiffFile | null = null;
  let currentHunk: ParsedDiffHunk | null = null;

  const lines = diffText.replace(/\r\n/g, "\n").split("\n");
  for (const line of lines) {
    const gitHeader = line.match(/^diff --git a\/(.*?) b\/(.*)$/);
    if (gitHeader) {
      currentFile = { oldPath: gitHeader[1], newPath: gitHeader[2], hunks: [] };
      files.push(currentFile);
      currentHunk = null;
      continue;
    }

    if (!currentFile) {
      // Support bare unified diff with --- / +++ but no diff --git.
      const oldHeader = line.match(/^---\s+(?:a\/)?(.+)$/);
      if (oldHeader) {
        currentFile = { oldPath: oldHeader[1], newPath: oldHeader[1], hunks: [] };
        files.push(currentFile);
      }
      continue;
    }

    const newHeader = line.match(/^\+\+\+\s+(?:b\/)?(.+)$/);
    if (newHeader) {
      const np = newHeader[1];
      // Deleted file: +++ /dev/null means file was removed
      currentFile.newPath = np === "/dev/null" ? currentFile.oldPath : np;
      if (np === "/dev/null") {
        (currentFile as any)._deleted = true;
      }
      continue;
    }

    if (line.startsWith("@@")) {
      currentHunk = { header: line, ...parseHunkHeader(line), lines: [] };
      currentFile.hunks.push(currentHunk);
      continue;
    }

    if (currentHunk) currentHunk.lines.push(line);
  }

  return files.filter((f) => f.hunks.length > 0);
}

export type DiffToCopOptions = {
  title?: string;
  repo?: string;
  objectId?: string;
  language?: string;
  createdAt?: string;
};

function countChanges(hunks: ParsedDiffHunk[]): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  for (const h of hunks) {
    for (const line of h.lines) {
      if (line.startsWith("+") && !line.startsWith("+++")) additions++;
      else if (line.startsWith("-") && !line.startsWith("---")) deletions++;
    }
  }
  return { additions, deletions };
}

export function diffToCopDocument(diffText: string, options: DiffToCopOptions = {}): CopDocument {
  const files = parseUnifiedDiff(diffText);
  const createdAt = options.createdAt ?? new Date().toISOString();
  const objectId = options.objectId ?? `obj_diff_${Date.now()}`;
  const title = options.title ?? `COP code review from diff (${files.length} file${files.length === 1 ? "" : "s"})`;

  const blocks: CopBlock[] = [];
  const relations: CopRelation[] = [];

  const summaryId = "blk_diff_summary";
  const total = files.reduce(
    (acc, f) => {
      const c = countChanges(f.hunks);
      acc.additions += c.additions;
      acc.deletions += c.deletions;
      acc.hunks += f.hunks.length;
      return acc;
    },
    { additions: 0, deletions: 0, hunks: 0 }
  );

  blocks.push({
    id: summaryId,
    type: "summary",
    content: {
      format: "text",
      text: `Diff contains ${files.length} file(s), ${total.hunks} hunk(s), +${total.additions}/-${total.deletions}. Use COP context packets to review individual hunks or file claims.`,
    },
    order: 0,
    state: { trust_level: "agent_generated", review_status: "needs_human_review", freshness: "current" },
  });

  files.forEach((file, fileIndex) => {
    const filePart = stableIdPart(file.newPath);
    const fileId = `blk_diff_file_${filePart}`;
    const fileChanges = countChanges(file.hunks);
    blocks.push({
      id: fileId,
      type: "x-changed_file",
      content: {
        format: "json",
        data: {
          old_path: file.oldPath,
          new_path: file.newPath,
          hunks: file.hunks.length,
          additions: fileChanges.additions,
          deletions: fileChanges.deletions,
          ...((file as any)._deleted ? { deleted: true } : {}),
        },
      },
      order: blocks.length,
      state: { trust_level: "agent_generated", review_status: "needs_human_review" },
    });
    relations.push({
      id: `rel_diff_summary_${filePart}`,
      from: fileId,
      to: summaryId,
      type: "references",
      strength: 1,
    });

    file.hunks.forEach((hunk, hunkIndex) => {
      const hunkId = `blk_diff_hunk_${filePart}_${String(hunkIndex + 1).padStart(3, "0")}`;
      blocks.push({
        id: hunkId,
        type: "x-diff_hunk",
        content: {
          format: "code",
          language: "diff",
          text: [hunk.header, ...hunk.lines].join("\n"),
          data: {
            old_start: hunk.oldStart,
            old_lines: hunk.oldLines,
            new_start: hunk.newStart,
            new_lines: hunk.newLines,
            file: file.newPath,
          },
        },
        parent_id: fileId,
        order: blocks.length,
        state: { trust_level: "agent_generated", review_status: "needs_human_review" },
      });
      relations.push({
        id: `rel_diff_${filePart}_hunk_${hunkIndex + 1}`,
        from: hunkId,
        to: fileId,
        type: "references",
        strength: 1,
      });
    });
  });

  if (files.length === 0) {
    blocks.push({
      id: "blk_diff_empty_warning",
      type: "risk",
      content: { format: "text", text: "No unified diff hunks were parsed. Check input format before asking an agent to review this object." },
      order: blocks.length,
      state: { risk_level: "medium", trust_level: "agent_generated", review_status: "needs_human_review" },
    });
  }

  return {
    protocol: "cop",
    version: "0.1",
    object: {
      id: objectId,
      type: "code_review",
      title,
      language: options.language ?? "en",
      created_at: createdAt,
      state: { lifecycle: "draft", trust_level: "agent_generated", review_status: "needs_human_review" },
      metadata: { generated_from: "unified_diff", repo: options.repo ?? null },
    },
    blocks,
    relations,
    comments: [],
    operations: [],
    views: [
      { id: "view_review", type: "review_dashboard", include: ["summary", "x-changed_file", "x-diff_hunk", "risk", "task"], layout: "card_stack" },
      { id: "view_agent", type: "agent_context", include: ["blocks", "relations", "comments"], layout: "machine" },
    ],
    sources: [
      { id: "src_input_diff", type: "file", title: "Input unified diff", reliability: "unknown", accessed_at: createdAt },
    ],
  };
}
