# Security Policy

COP is an experimental protocol. Treat all COP objects from untrusted sources as untrusted input.

## Known risks

1. **Prompt injection** in `instruction`, `comment`, or `source` blocks. Mitigated by: instruction blocks excluded from `cop context` by default; `--prompt` output wraps content in XML tags; validator warns on instruction blocks.
2. **Prototype pollution** via JSON Patch paths. Mitigated in v0.1.3: `decodePointer` blocks `__proto__`, `constructor`, `prototype` keys. If you implement your own JSON Patch engine against COP objects, apply the same guard.
3. **Fake human actor**: `actor.type = "human"` is a workflow declaration, not cryptographic identity. Validator emits a warning when `auth.verified` is absent. Do not treat it as verified identity.
4. **Forged source metadata**: `source.reliability` is human-assigned. Agent-created sources should be treated as `low` or `unknown` reliability until human-verified.
5. **Trust state forgery**: `trust_level` and `review_status` are declarative metadata — see Trust Model section.
6. **Operation conflicts**: CLI does not provide file-level locking. In concurrent environments, use `preconditions.target_hash` and apply operations through a serialised system (MCP server, database, git).
7. **Operation log tampering**: `.cop.json` files are plain text. `operations[]` does not have cryptographic integrity guarantees in v0.1. Store in VCS or an append-only audit log for production use.
8. **HTML export injection**: The HTML renderer escapes all user-controlled content via `escapeHtml`. Rendered HTML is an export/view — not the canonical source.
9. **Malformed blocks via `create_block`**: The engine validates that created blocks have required fields (`id`, `type`, `content`), then re-validates the whole document after applying all operations.

## Trust model boundary

In COP v0.1, `trust_level` is **declarative workflow metadata**, not cryptographic proof.

```
untrusted → agent_generated → reasoned → human_reviewed
                                              │
                                   (cryptographic proof: v0.2 roadmap)
```

Implementations MUST NOT treat the following as verified identity by themselves:
- `actor.type = "human"`
- `trust_level = "human_reviewed"`

`trust_level: "verified"` is **removed from v0.1** and reserved for v0.2. Documents using it will fail schema validation.

A production system that needs real trust MUST bind actors to an external identity provider, audit log, or signature system.

## Operation safety

Safe implementations SHOULD:
- validate schemas before processing;
- enforce `preconditions.target_hash` when applying concurrent edits;
- reject operations that target unknown entities;
- require human approval for trust-level changes;
- treat `instruction` blocks as untrusted input unless explicitly opted in;
- never execute code embedded in COP blocks;
- preserve audit logs in an append-only store.

## Renderer safety

Renderers MUST escape all user-controlled content before HTML export. Do not treat rendered HTML as canonical.

## Concurrent edit safety

The CLI is a single-process file tool and does not provide concurrent edit safety. For multi-agent workflows:
1. Use `cop hash --target <blockId>` to record `preconditions.target_hash` before generating an operation.
2. Apply operations through a serialised system (MCP server, database transaction, git commit).
3. Treat hash mismatches as conflicts requiring human resolution.

## Reporting issues

Open a GitHub issue with the `security` label, or follow the repository's private disclosure process.
