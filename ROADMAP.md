# COP Roadmap

## v0.1 — Concept, Schema, Examples, CLI

Status: completed as experimental working draft.

Delivered:

- JSON Schemas
- Example `.cop.json` files
- CLI validator
- HTML renderer
- Markdown exporter
- Operation engine
- Context packet generator
- Security notes and agent contribution instructions

## v0.2 — First workflow loop: diff → COP → context → operation

Goal: Make COP useful in one concrete developer workflow: AI-assisted code review.

Delivered in v0.2.0-alpha.1:

- `copctl from-diff <diff-file>`
- `copctl from-git --base <ref> --head <ref>`
- `copctl context --with-hash`
- `copctl context --max-tokens`
- `copctl context --include-relation-type / --exclude-relation-type`
- `copctl apply-op --atomic`
- generated-from-diff example

Still needed before v0.2 stable:

- stronger `from-diff` semantics and tests
- complete E2E example with model-generated patch fixture
- provider-specific prompt formats without direct API calls
- README demo simplification

## v0.3 — Viewer and Online Validator

Goal: Make human review and feedback easier to try.

Planned:

- GitHub Pages demo
- Paste JSON → validate → render preview
- Block tree
- Comment sidebar
- Risk view
- Evidence view

## v0.4 — MCP Server

Goal: Make COP objects usable by agent runtimes.

Planned:

- `cop-mcp-server`
- Resources: objects, blocks, views, context packets
- Tools: list_blocks, get_block, apply_operation, render_view, validate_object

## v0.5 — Storage Adapters

Goal: Make COP persistable as structured knowledge.

Planned:

- SQLite schema
- PostgreSQL schema
- Graph relation export
- Vector chunk export

## v1.0 — Stable Core

Goal: Freeze stable core schema and interoperability rules.

Planned:

- Stable JSON Schemas
- Compatibility test suite
- Reference implementations
- Security guide
- Governance model
