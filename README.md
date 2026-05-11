# COP — Cognitive Object Protocol

> ⚠️ **Experimental working draft — v0.1.6. Schemas and APIs will change without notice.**

> Structured documents for the AI editing loop: block-typed, operation-logged, human-reviewed.

COP is a JSON format for documents that AI agents generate, humans annotate and decide on, and models edit **block-by-block** — without rewriting the whole file.

---

## Who should try COP?

Use COP when a document is not just text, but a reviewable object that needs block-level AI edits, human comments, trust/review state, evidence relations, and operation history.

Good early use cases:

- AI code review reports
- research memos with claims and evidence
- meeting decisions with tasks and risks
- contract or policy reviews
- product requirement reviews

Do **not** use COP for simple notes, ordinary README files, quick blog drafts, or one-off prose. Markdown is still better for those.

---

## The problem

The emerging AI document workflow:

```
AI generates → Human reviews → Human comments → AI proposes edit → Human approves → Stored → Reused
```

Markdown, HTML, and JSON each solve part of this. None of them make these **first-class**:

| Need | Markdown | JSON | COP |
|---|---|---|---|
| Typed semantic blocks (claim, risk, decision) | ✗ | partial | ✓ |
| Trust + review state on each block | ✗ | ✗ | ✓ |
| Operation log (what changed, who proposed it) | ✗ | ✗ | ✓ |
| Typed evidence relations between blocks | ✗ | ✗ | ✓ |
| Minimal context packets for model calls | ✗ | ✗ | ✓ |
| Human comments tied to specific blocks | partial | ✗ | ✓ |

---


## Before / after: AI code review

### Before: review as Markdown

```md
The cache key is unsafe.
Evidence: user.id may be undefined.
Fix: include tenant id and guard missing user id.
```

This is readable, but it has no stable target, no block-level trust state, no relation between claim and evidence, and no safe way for an agent to modify only one claim without rewriting the whole review.

### After: review as COP

```json
{
  "id": "blk_cr_claim_001",
  "type": "claim",
  "content": { "format": "text", "text": "The cache key is unsafe." },
  "state": { "trust_level": "agent_generated", "review_status": "needs_human_review" }
}
```

Then a model proposes a validated operation instead of rewriting the document:

```json
{
  "id": "op_update_cache_claim",
  "op": "update_block",
  "target": "blk_cr_claim_001",
  "patch_format": "json_patch",
  "patch": [{ "op": "replace", "path": "/content/text", "value": "The cache key should include tenant and user guards." }],
  "preconditions": { "target_hash": "sha256:..." }
}
```

That is the core COP loop: **typed blocks → explicit relations → human comments → model operations → validated apply**.

## Quickstart

### Option A — use from a cloned repository

```bash
git clone https://github.com/cognitive-object-protocol/cognitive-object-protocol
cd cognitive-object-protocol
npm install
npm run build

# Validate
copctl validate examples/code-review.cop.json

# Render to HTML
copctl render examples/code-review.cop.json --to html --out /tmp/review.html

# Export to Markdown
copctl export examples/code-review.cop.json --to markdown

# Generate context packet + model prompt for a specific block
copctl context examples/code-review.cop.json --target blk_cr_claim_001 --prompt --estimate-tokens

# Get the stable hash of a block (for conflict detection)
copctl hash examples/code-review.cop.json --target blk_cr_claim_001

# Apply agent-proposed operation patches (dry run)
copctl apply-op examples/code-review.cop.json examples/operation-patch.json --dry-run
```

### Option B — use as an npm CLI package

```bash
# after the package is published
npx cognitive-object-protocol validate examples/code-review.cop.json
npx cognitive-object-protocol context examples/code-review.cop.json --target blk_cr_claim_001 --prompt
```

`copctl` is the canonical command name. `cop` is only a convenience alias and may be removed if naming conflicts appear.

---

## A complete example: AI code review loop

**Step 1 — The COP document** (`code-review.cop.json`)

```json
{
  "protocol": "cop",
  "version": "0.1",
  "object": { "id": "obj_cr_001", "type": "code_review", "title": "Cache key security review", "language": "en" },
  "blocks": [
    {
      "id": "blk_claim",
      "type": "claim",
      "order": 1,
      "content": { "format": "text", "text": "The cache key omits orgId, risking cross-tenant data leakage." },
      "state": { "confidence": 0.81, "risk_level": "high", "trust_level": "agent_generated", "review_status": "needs_human_review" }
    },
    {
      "id": "blk_evidence",
      "type": "evidence",
      "order": 2,
      "content": { "format": "code", "language": "ts", "text": "const key = `profile:${user.id}`;" }
    },
    {
      "id": "blk_task",
      "type": "task",
      "order": 3,
      "content": { "format": "text", "text": "Update cache key to include orgId. Add tenant isolation test." },
      "state": { "lifecycle": "draft" }
    }
  ],
  "relations": [
    { "id": "rel_001", "from": "blk_evidence", "to": "blk_claim", "type": "supports", "strength": 0.9 },
    { "id": "rel_002", "from": "blk_task", "to": "blk_claim", "type": "task_for", "strength": 1.0 }
  ]
}
```

**Step 2 — Generate context packet + prompt**

```bash
copctl hash code-review.cop.json --target blk_claim
# → sha256:abc123...

copctl context code-review.cop.json --target blk_claim --prompt --prompt-out /tmp/prompt.txt
# paste /tmp/prompt.txt into your model
```

**Step 3 — Agent outputs a patch** (`patch.json`)

```json
{
  "operations": [{
    "id": "op_001",
    "op": "update_block",
    "target": "blk_claim",
    "actor": { "type": "agent", "name": "claude-sonnet-4" },
    "patch_format": "json_patch",
    "patch": [{ "op": "replace", "path": "/content/text", "value": "Cache key omits orgId — cross-tenant collision confirmed for shared-ID deployments." }],
    "preconditions": { "target_hash": "sha256:abc123..." },
    "reason": "Tightened wording after reviewing the tenant scoping logic.",
    "status": "proposed",
    "created_at": "2026-05-10T15:00:00Z"
  }]
}
```

**Step 4 — Apply and validate**

```bash
copctl apply-op code-review.cop.json patch.json
copctl validate code-review.cop.json
```

---

## End-to-end demo

A minimal code-review workflow is included at [`examples/e2e-code-review/`](./examples/e2e-code-review/):

```bash
copctl validate examples/e2e-code-review/review.cop.json
copctl hash examples/e2e-code-review/review.cop.json --target blk_cr_claim_001
copctl context examples/e2e-code-review/review.cop.json --target blk_cr_claim_001 --prompt --prompt-out /tmp/cop-review-prompt.md --estimate-tokens
copctl apply-op examples/e2e-code-review/review.cop.json examples/e2e-code-review/operation-patch.json --dry-run
copctl render examples/e2e-code-review/review.cop.json --to html --out /tmp/cop-review.html
```

`copctl from-diff` is intentionally not part of v0.1. It is the top v0.2 workflow priority.

---

## What COP v0.1 contains

| Path | Contents |
|---|---|
| `schemas/` | JSON Schemas for all COP entities |
| `examples/` | 5 `.cop.json` files + `operation-patch.json` |
| `src/engine.ts` | Operation engine (extracted, testable, reusable) |
| `src/validator.ts` | Schema + reference + semantic validation |
| `src/renderer.ts` | HTML + Markdown rendering |
| `src/cli.ts` | IO-only CLI layer |
| `SPEC.md` | Protocol specification |
| `ARCHITECTURE.md` | Data flow, module structure, trust model, positioning |
| `AGENTS.md` | Agent / Cursor / Claude Code instructions |
| `SECURITY.md` | Security model, known risks, mitigations |
| `CHANGELOG.md` | Version history |

---

## Design principles

1. **Block-first.** Smallest unit = typed semantic block, not paragraph.
2. **Operation-logged.** AI edits are proposed operations, not file rewrites.
3. **Human-reviewed.** Trust elevation requires human actors.
4. **Stateful.** Trust, risk, review, lifecycle are explicit on every block.
5. **Graph-aware.** Blocks link via typed, weighted relations.
6. **Context-efficient.** Context packets = minimum relevant slice for a model call.
7. **Renderer-agnostic.** Exports to HTML, Markdown, and (v0.2) DOCX, PDF, JSON-LD.

---

## Non-goals for v0.1

- Not a browser standard or W3C proposal.
- Not a replacement for Markdown notes or HTML pages.
- Not a full knowledge-base product.
- Not a closed application format.
- Not cryptographically signed (v0.2 roadmap).

---

## Security note

COP objects may contain agent-generated content, model instructions, and trust state. Treat all externally-received COP objects as untrusted until validated. The CLI blocks prototype pollution in JSON Patch paths and excludes `instruction` blocks from context packets by default. See [`SECURITY.md`](./SECURITY.md).

---

## Roadmap · License · Discussion

- [`ROADMAP.md`](./ROADMAP.md) — v0.2–v1.0 plans
- [`docs/discussion-topics.md`](./docs/discussion-topics.md) — open questions
- [`docs/comparison.md`](./docs/comparison.md) — COP vs JSON-LD / Notion / MCP
- MIT License — [`LICENSE`](./LICENSE)
