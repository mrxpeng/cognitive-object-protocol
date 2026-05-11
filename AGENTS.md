# COP Agent Instructions — v0.1.3

These instructions apply to all files in this repository and to any agent working with `.cop.json` files.

## Core rules (non-negotiable)

1. **Never set `trust_level` to `human_reviewed`.** Only human actors may do this. Agents may use `agent_generated` or `reasoned`.
2. **`trust_level: "verified"` does not exist in v0.1.** Do not use it.
3. **Never rewrite the entire document.** Use operation patches. One operation per semantic change.
4. **Preserve all existing `id` values.** Never rename, reassign, or overwrite `id` via `update_block`.
5. **Do not create dangling references.** Relations must point to existing block/source IDs. Comments must target existing blocks or relations.
6. **All agent-proposed operations must have `status: "proposed"`.** Only humans or trusted systems may set `applied`.
7. **Validate after changes.** Run `copctl validate <file>` before committing.
8. **Do not create `instruction` blocks** unless explicitly requested and reviewed by a human.

## Recording preconditions

Before proposing an `update_block` or `change_state` that modifies a specific block, record the block's current hash:

```bash
copctl hash examples/code-review.cop.json --target blk_cr_claim_001
# → sha256:abc123...
```

Include it in the operation:

```json
{
  "preconditions": { "target_hash": "sha256:abc123..." }
}
```

## Expected operation output format

```json
{
  "operations": [
    {
      "id": "op_<unique_id>",
      "op": "update_block",
      "target": "blk_...",
      "actor": { "type": "agent", "name": "<model-name>" },
      "patch_format": "json_patch",
      "patch": [
        { "op": "replace", "path": "/content/text", "value": "..." }
      ],
      "preconditions": { "target_hash": "sha256:..." },
      "reason": "Explain why this change was made.",
      "status": "proposed",
      "created_at": "<ISO timestamp>"
    }
  ]
}
```

Use `patch_format: "json_patch"` with precise `/content/text` paths when possible.
Use `patch_format: "object_merge"` only when replacing multiple fields at once.

## Supported operations in v0.1.3

| Op | Description | Required fields in patch |
|---|---|---|
| `update_block` | Update content or metadata of an existing block | patch (json_patch array or object_merge) |
| `change_state` | Update state fields (confidence, trust_level, review_status…) | patch (object with state fields) |
| `create_block` | Add a new block | patch.block (full block object) |
| `add_relation` | Add a typed edge between two existing entities | patch.relation (full relation object) |
| `add_comment` | Add a feedback comment on a block or relation | patch.comment (full comment object) |
| `resolve_comment` | Update a comment's status | patch.status (one of: open, accepted, rejected, resolved, superseded) |

## Block ID drift prevention

If you are uncertain which block ID to target, emit an `add_comment` instead of guessing:

```json
{
  "op": "add_comment",
  "patch": {
    "comment": {
      "id": "cmt_clarification_001",
      "target": { "id": "blk_best_guess" },
      "author": { "type": "agent" },
      "type": "question",
      "content": "I was unsure whether to target blk_X or blk_Y. Please clarify.",
      "status": "open"
    }
  }
}
```

## Editing schemas

- Changes must be reflected in `SPEC.md`.
- Do not add new required fields unless all existing examples still validate.
- Favour stable, small vocabularies.

## Editing docs

- Use precise language. COP is an "experimental draft protocol", not a "standard".
- Distinguish core protocol from rendered views.

## Cursor / Claude Code integration

`.cursor/rules` contains a summary of these instructions for Cursor users.
For Claude Code, this file (`AGENTS.md`) is read automatically.
