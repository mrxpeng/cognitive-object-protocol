import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseUnifiedDiff, diffToCopDocument } from "../dist/diff.js";
import { validateCopDocument } from "../dist/validator.js";

const sampleDiff = readFileSync("examples/e2e-code-review/input.diff", "utf8");

test("parseUnifiedDiff extracts files and hunks", () => {
  const files = parseUnifiedDiff(sampleDiff);
  assert.ok(files.length >= 1);
  assert.ok(files[0].newPath);
  assert.ok(files[0].hunks.length >= 1);
  assert.match(files[0].hunks[0].header, /^@@/);
});

test("diffToCopDocument creates a valid code_review object", () => {
  const doc = diffToCopDocument(sampleDiff, { title: "Test diff review", objectId: "obj_test_diff", createdAt: "2026-05-10T00:00:00Z" });
  assert.equal(doc.protocol, "cop");
  assert.equal(doc.version, "0.1");
  assert.equal(doc.object.type, "code_review");
  assert.ok(doc.blocks.some((b) => b.type === "x-changed_file"));
  assert.ok(doc.blocks.some((b) => b.type === "x-diff_hunk"));
  assert.ok(doc.relations.length >= 1);
  const result = validateCopDocument(doc);
  assert.equal(result.valid, true, result.issues.map((i) => i.message).join("\n"));
});

test("diffToCopDocument handles empty input with a risk block", () => {
  const doc = diffToCopDocument("", { objectId: "obj_empty_diff", createdAt: "2026-05-10T00:00:00Z" });
  assert.ok(doc.blocks.some((b) => b.id === "blk_diff_empty_warning"));
  const result = validateCopDocument(doc);
  assert.equal(result.valid, true, result.issues.map((i) => i.message).join("\n"));
});

test("diffToCopDocument uses stable hash suffixes to avoid non-ASCII ID collisions", () => {
  const diff = `diff --git a/中文.ts b/中文.ts
--- a/中文.ts
+++ b/中文.ts
@@ -1 +1 @@
-old
+new

diff --git a/日文.ts b/日文.ts
--- a/日文.ts
+++ b/日文.ts
@@ -1 +1 @@
-old
+new
`;
  const doc = diffToCopDocument(diff, { objectId: "obj_unicode_diff", createdAt: "2026-05-10T00:00:00Z" });
  const ids = doc.blocks.map((b) => b.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(validateCopDocument(doc).valid, true);
  assert.equal(doc.blocks.filter((b) => b.type === "x-changed_file").length, 2);
});

test("diffToCopDocument handles paths sanitized to item without ID collision", () => {
  const diff = `diff --git a/🔥.ts b/🔥.ts
--- a/🔥.ts
+++ b/🔥.ts
@@ -1 +1 @@
-old
+new

diff --git a/💡.ts b/💡.ts
--- a/💡.ts
+++ b/💡.ts
@@ -1 +1 @@
-old
+new
`;
  const doc = diffToCopDocument(diff, { objectId: "obj_emoji_diff", createdAt: "2026-05-10T00:00:00Z" });
  const ids = doc.blocks.map((b) => b.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(validateCopDocument(doc).valid, true);
});

test("parseUnifiedDiff keeps multiple hunks for the same file", () => {
  const diff = `diff --git a/a.ts b/a.ts
--- a/a.ts
+++ b/a.ts
@@ -1 +1 @@
-a
+b
@@ -10 +10 @@
-c
+d`;
  const files = parseUnifiedDiff(diff);
  assert.equal(files.length, 1);
  assert.equal(files[0].hunks.length, 2);
});
