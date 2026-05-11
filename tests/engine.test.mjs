import test from "node:test";
import assert from "node:assert/strict";
import { applyOperations, applyJsonPatch, hashEntity } from "../dist/engine.js";
import { validateCopDocument } from "../dist/validator.js";

function baseDoc() {
  return {
    protocol: "cop",
    version: "0.1",
    object: {
      id: "obj_test",
      type: "code_review",
      title: "Engine Test",
      language: "en"
    },
    blocks: [
      {
        id: "blk_001",
        type: "claim",
        content: { format: "text", text: "Original claim" },
        state: {
          trust_level: "agent_generated",
          review_status: "needs_human_review"
        }
      },
      {
        id: "blk_002",
        type: "evidence",
        content: { format: "text", text: "Evidence" }
      }
    ],
    relations: [
      { id: "rel_001", from: "blk_002", to: "blk_001", type: "supports" }
    ],
    comments: [
      {
        id: "cmt_001",
        target: { id: "blk_001" },
        author: { type: "human", name: "Reviewer" },
        type: "note",
        content: "Needs work",
        status: "open"
      }
    ],
    operations: []
  };
}

test("applyJsonPatch blocks prototype pollution keys", () => {
  assert.throws(
    () => applyJsonPatch({ safe: true }, [{ op: "add", path: "/__proto__/polluted", value: true }]),
    /prototype pollution|Forbidden/
  );
  assert.equal({}.polluted, undefined);
});

test("object_merge update_block rejects block.id overwrite", () => {
  const doc = baseDoc();
  const result = applyOperations(doc, [{
    id: "op_overwrite_id",
    op: "update_block",
    target: "blk_001",
    actor: { type: "agent", name: "test-agent" },
    patch_format: "object_merge",
    patch: { id: "blk_hacked" },
    created_at: "2026-05-10T00:00:00Z"
  }]);
  const opResult = result.results.get("op_overwrite_id");
  assert.equal(opResult.applied, false);
  assert.match(opResult.error, /may not change block\.id/);
  assert.equal(result.doc.blocks[0].id, "blk_001");
});

test("json_patch update_block rejects block.id overwrite", () => {
  const doc = baseDoc();
  const result = applyOperations(doc, [{
    id: "op_json_patch_id",
    op: "update_block",
    target: "blk_001",
    actor: { type: "agent", name: "test-agent" },
    patch_format: "json_patch",
    patch: [{ op: "replace", path: "/id", value: "blk_hacked" }],
    created_at: "2026-05-10T00:00:00Z"
  }]);
  const opResult = result.results.get("op_json_patch_id");
  assert.equal(opResult.applied, false);
  assert.match(opResult.error, /Forbidden JSON Patch path|protected fields/i);
  assert.equal(result.doc.blocks[0].id, "blk_001");
});

test("json_patch update_block rejects trust_level elevation bypass", () => {
  const doc = baseDoc();
  const result = applyOperations(doc, [{
    id: "op_trust_bypass",
    op: "update_block",
    target: "blk_001",
    actor: { type: "agent", name: "test-agent" },
    patch_format: "json_patch",
    patch: [{ op: "add", path: "/state/trust_level", value: "human_reviewed" }],
    created_at: "2026-05-10T00:00:00Z"
  }]);
  const opResult = result.results.get("op_trust_bypass");
  assert.equal(opResult.applied, false);
  assert.match(opResult.error, /trust_level|Forbidden JSON Patch path|semantic operation/i);
  assert.equal(result.doc.blocks[0].state.trust_level, "agent_generated");
});

test("change_state rejects trust elevation by non-human actor", () => {
  const doc = baseDoc();
  const result = applyOperations(doc, [{
    id: "op_bad_trust",
    op: "change_state",
    target: "blk_001",
    actor: { type: "agent", name: "test-agent" },
    patch: { trust_level: "human_reviewed" },
    created_at: "2026-05-10T00:00:00Z"
  }]);
  const opResult = result.results.get("op_bad_trust");
  assert.equal(opResult.applied, false);
  assert.match(opResult.error, /non-human actor/);
});

test("add_relation rejects dangling from/to references", () => {
  const doc = baseDoc();
  const result = applyOperations(doc, [{
    id: "op_bad_relation",
    op: "add_relation",
    actor: { type: "agent", name: "test-agent" },
    patch: { relation: { id: "rel_bad", from: "blk_missing", to: "blk_001", type: "supports" } },
    created_at: "2026-05-10T00:00:00Z"
  }]);
  const opResult = result.results.get("op_bad_relation");
  assert.equal(opResult.applied, false);
  assert.match(opResult.error, /unknown from reference/);
});

test("resolve_comment rejects invalid status", () => {
  const doc = baseDoc();
  const result = applyOperations(doc, [{
    id: "op_bad_comment_status",
    op: "resolve_comment",
    target: "cmt_001",
    actor: { type: "human", name: "Reviewer" },
    patch: { status: "totally_done" },
    created_at: "2026-05-10T00:00:00Z"
  }]);
  const opResult = result.results.get("op_bad_comment_status");
  assert.equal(opResult.applied, false);
  assert.match(opResult.error, /Invalid comment status/);
});

test("replay protection rejects duplicated operation id already in document", () => {
  const doc = baseDoc();
  doc.operations.push({
    id: "op_existing",
    op: "update_block",
    target: "blk_001",
    actor: { type: "agent", name: "previous-agent" },
    patch: { content: { format: "text", text: "Old" } },
    status: "applied",
    created_at: "2026-05-10T00:00:00Z"
  });
  const result = applyOperations(doc, [{
    id: "op_existing",
    op: "update_block",
    target: "blk_001",
    actor: { type: "agent", name: "test-agent" },
    patch: { content: { format: "text", text: "New" } },
    created_at: "2026-05-10T00:01:00Z"
  }]);
  const opResult = result.results.get("op_existing");
  assert.equal(opResult.applied, false);
  assert.match(opResult.error, /already exists|replay rejected/);
});

test("preconditions.target_hash detects stale block", () => {
  const doc = baseDoc();
  const result = applyOperations(doc, [{
    id: "op_stale",
    op: "update_block",
    target: "blk_001",
    actor: { type: "agent", name: "test-agent" },
    patch: { content: { format: "text", text: "New claim" } },
    preconditions: { target_hash: "sha256:not_the_real_hash" },
    created_at: "2026-05-10T00:00:00Z"
  }]);
  const opResult = result.results.get("op_stale");
  assert.equal(opResult.applied, false);
  assert.match(opResult.error, /target_hash mismatch/);
});

test("valid update_block with target_hash applies and validates", () => {
  const doc = baseDoc();
  const targetHash = hashEntity(doc.blocks[0]);
  const result = applyOperations(doc, [{
    id: "op_valid_update",
    op: "update_block",
    target: "blk_001",
    actor: { type: "agent", name: "test-agent" },
    patch_format: "json_patch",
    patch: [{ op: "replace", path: "/content/text", value: "Updated claim" }],
    preconditions: { target_hash: targetHash },
    created_at: "2026-05-10T00:00:00Z"
  }]);
  const opResult = result.results.get("op_valid_update");
  assert.equal(opResult.applied, true);
  assert.equal(result.doc.blocks[0].content.text, "Updated claim");
  const validation = validateCopDocument(result.doc);
  assert.equal(validation.valid, true);
});

test("engine does not mutate input document", () => {
  const doc = baseDoc();
  const original = JSON.stringify(doc);
  applyOperations(doc, [{
    id: "op_no_mutate",
    op: "update_block",
    target: "blk_001",
    actor: { type: "agent", name: "test-agent" },
    patch: { content: { format: "text", text: "Changed" } },
    created_at: "2026-05-10T00:00:00Z"
  }]);
  assert.equal(JSON.stringify(doc), original);
});

test("json_patch /state replacement is blocked (parent-path of /state/trust_level)", () => {
  const doc = baseDoc();
  const result = applyOperations(doc, [{
    id: "op_state_parent",
    op: "update_block",
    target: "blk_001",
    actor: { type: "agent", name: "test-agent" },
    patch_format: "json_patch",
    patch: [{ op: "replace", path: "/state", value: { trust_level: "human_reviewed", confidence: 0.99 } }],
    created_at: "2026-05-10T00:00:00Z"
  }]);
  const opResult = result.results.get("op_state_parent");
  assert.equal(opResult.applied, false);
  assert.match(opResult.error, /Forbidden|protected|trust_level|overwrite/i);
  assert.equal(result.doc.blocks[0].state.trust_level, "agent_generated");
});

test("object_merge state replacement blocked by post-apply trust check", () => {
  const doc = baseDoc();
  const result = applyOperations(doc, [{
    id: "op_merge_trust",
    op: "update_block",
    target: "blk_001",
    actor: { type: "agent", name: "test-agent" },
    patch: { state: { trust_level: "human_reviewed" } },
    created_at: "2026-05-10T00:00:00Z"
  }]);
  const opResult = result.results.get("op_merge_trust");
  assert.equal(opResult.applied, false);
  assert.match(opResult.error, /trust_level|non-human|change_state/i);
  assert.equal(result.doc.blocks[0].state.trust_level, "agent_generated");
});

test("json_patch constructor key is blocked", () => {
  assert.throws(
    () => applyJsonPatch({ x: 1 }, [{ op: "add", path: "/constructor/prototype/evil", value: true }]),
    /Forbidden|prototype pollution/
  );
});

test("create_block without id is rejected", () => {
  const doc = baseDoc();
  const result = applyOperations(doc, [{
    id: "op_no_id_block",
    op: "create_block",
    actor: { type: "agent", name: "test" },
    patch: { block: { type: "claim", content: { format: "text", text: "no id" } } },
    created_at: "2026-05-10T00:00:00Z"
  }]);
  const r = result.results.get("op_no_id_block");
  assert.equal(r.applied, false);
  assert.match(r.error, /must have id/);
});

test("add_comment with dangling target produces warning but applies", () => {
  const doc = baseDoc();
  const result = applyOperations(doc, [{
    id: "op_dangle_cmt",
    op: "add_comment",
    actor: { type: "agent", name: "test" },
    patch: {
      comment: {
        id: "cmt_new",
        target: { id: "blk_nonexistent" },
        author: { type: "agent" },
        type: "note",
        content: "dangling",
        status: "open"
      }
    },
    created_at: "2026-05-10T00:00:00Z"
  }]);
  const r = result.results.get("op_dangle_cmt");
  assert.equal(r.applied, true);
  assert.ok(r.warnings.some(w => /unknown entity/.test(w)));
});

test("json_patch update_block rejects block.type overwrite", () => {
  const doc = baseDoc();
  const result = applyOperations(doc, [{
    id: "op_type_overwrite",
    op: "update_block",
    target: "blk_001",
    actor: { type: "agent", name: "test-agent" },
    patch_format: "json_patch",
    patch: [{ op: "replace", path: "/type", value: "instruction" }],
    created_at: "2026-05-10T00:00:00Z"
  }]);
  const opResult = result.results.get("op_type_overwrite");
  assert.equal(opResult.applied, false);
  assert.match(opResult.error, /Forbidden JSON Patch path|protected fields|semantic operation/i);
  assert.equal(result.doc.blocks[0].type, "claim");
});

test("create_block rejects trust_level=human_reviewed from non-human actor", () => {
  const doc = baseDoc();
  const result = applyOperations(doc, [{
    id: "op_create_trust_bypass",
    op: "create_block",
    actor: { type: "agent", name: "test-agent" },
    patch: {
      block: {
        id: "blk_injected",
        type: "claim",
        content: { format: "text", text: "injected block" },
        state: { trust_level: "human_reviewed", review_status: "accepted" }
      }
    },
    created_at: "2026-05-10T00:00:00Z"
  }]);
  const r = result.results.get("op_create_trust_bypass");
  assert.equal(r.applied, false);
  assert.match(r.error, /trust_level|human_reviewed|not human/i);
});
