# Changelog

## v0.1.6 — Final pre-release hardening

- Fixed failed-operation mutation in `update_block`: candidate blocks are now checked before assignment.
- Added a test for JSON Patch `/type` overwrite rejection.
- Treat `/type` as a protected JSON Patch path.
- Removed stale `verified` language from validator messages.
- Updated README to v0.1.6 and added npm/npx usage plus a concrete E2E demo folder.
- Added `AGENTS.md`, `CONTRIBUTING.md`, `ROADMAP.md`, and `docs/` to npm package files.
- Clarified in SPEC that context packets are derived runtime artifacts, not canonical top-level document fields.

## v0.1.5 — Trust bypass fixes

### Security fixes
- **P1 fixed:** JSON Patch path `/state` replacement now blocked — parent-path check prevents overwriting `/state/trust_level` indirectly.
- **P1 fixed:** `update_block` (both `json_patch` and `object_merge`) now has a post-apply trust elevation check. If the resulting block has `trust_level: "human_reviewed"` and the actor is non-human, the operation is rejected.
- **P2 fixed:** renderer `riskClass` now escaped via `escapeHtml` (defense-in-depth).
- Prompt template no longer mentions "verified" (removed concept).
- Engine version string updated to v0.1.5.
- SPEC.md fixed duplicate `target_hash` key in preconditions example.

### Tests
- Added: `/state` parent-path replacement bypass test.
- Added: `object_merge` state trust elevation bypass test.
- Added: `constructor` key prototype pollution test.
- Added: `create_block` without id rejection test.
- Added: `add_comment` dangling target warning test.
- Total engine tests: 16.


## v0.1.4-review

- Added engine unit tests covering prototype pollution, protected JSON Patch paths, trust escalation bypass, dangling relations, replay protection, stale hash conflicts, and input immutability.
- Blocked `update_block` JSON Patch writes to `/id` and `/state/trust_level`.
- Added package metadata for npm publication readiness.
- Updated SPEC to mark v0.1.x as an experimental living draft.
- Removed stale `context_packets` and `verified` references from SPEC.
- Documented COP's restricted RFC 6902-style JSON Patch subset.
- Added README before/after demo for AI code review.


## v0.1.3 — Security & Engine refactor

### Security fixes
- **P0 fixed:** `applyJsonPatch` now blocks prototype pollution via `__proto__`, `constructor`, `prototype` keys in JSON Pointer paths.
- **P1 fixed:** `object_merge` (`update_block`) now forbids overwriting `block.id`; warns if `block.type` is changed.
- **P1 fixed:** `add_relation` now validates that `from` and `to` references exist in the document before applying.
- **P1 fixed:** `create_block` warns when an agent creates an `instruction` block.
- **P2 fixed:** `resolve_comment` now validates `status` against the allowed enum before applying.
- **Security:** `cop context --prompt` now wraps block content in `<cop:block>` XML tags to reduce prompt injection surface.
- **Security:** `cop context` now excludes `instruction` blocks by default; use `--include-instructions` to override.

### New features
- `cop context --prompt-out <file>` — write prompt to a file instead of stderr, preventing stdout/stderr mixing.
- `cop context --include-instructions` — explicit opt-in to include instruction blocks in context packet.
- `cop hash --target <blockId>` — prints the stable SHA-256 hash of a block for use as `preconditions.target_hash`.
- **Replay protection:** `apply-op` now rejects operations whose `id` already exists in the document's `operations[]`.

### Engine refactor
- Operation logic extracted from CLI into `src/engine.ts` (`applyOperations`, `hashEntity`, `decodePointer`, `applyJsonPatch`, `mergePatch`). CLI is now IO-only.

### Protocol changes
- `trust_level: "verified"` removed from v0.1 schema (reserved for v0.2). Documents using `verified` will fail validation.
- `comments_on` removed from relation type enum (redundant with `comment.target`).
- `context_packets` top-level field removed from `cop.schema.json` (context packets are derived/transient, not stored in documents).
- `research-memo.cop.json` example: removed redundant `blk_rm_title` block (object.title already carries this).

### Docs
- `CHANGELOG.md` added.
- `ARCHITECTURE.md` updated: concurrent edit safety caveat, engine separation note.
- `SECURITY.md` updated: prototype pollution note, instruction block guidance.

---

## v0.1.2 — Operation model expansion

- Added `patch_format: json_patch | object_merge`, `preconditions.target_hash`, `result` to operation schema.
- `apply-op` supports: `update_block`, `change_state`, `create_block`, `add_comment`, `resolve_comment`, `add_relation`.
- Added `--estimate-tokens` to `cop context`.
- `private: false`, dual bin `copctl`/`cop`.
- Added `docs/comparison.md` (COP vs JSON-LD / Schema.org / Notion / MCP).
- Added `.vscode/settings.json` schema binding.
- `SECURITY.md`: trust_level is declarative workflow metadata, not cryptographic proof.

---

## v0.1.1 — Schema consolidation

- `object.kind` renamed to `object.type`; `object.status` merged into `state.lifecycle`.
- `state.schema.json`: `additionalProperties: false`; `freshness` enum fixed (`stale` → `outdated`).
- `block.schema.json`: conditional required — `content.text` required when `format` is `text/markdown/code`.
- `relation.from`/`to`: entity-prefix pattern constraint added.
- `context-packet.schema.json`: `task.type` and `expected_output.format` enum-constrained.
- `ARCHITECTURE.md`, `AGENTS.md` added.
- README rewritten with concrete example and quickstart.

---

## v0.1.0 — Initial release

- SPEC, schemas, 5 example `.cop.json` files.
- CLI: `validate`, `render`, `export`, `context`.
- Validator: JSON Schema + reference checks.
- Renderer: HTML (with escapeHtml) + Markdown.
