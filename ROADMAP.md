# COP Roadmap

## v0.1 — Concept, Schema, Examples, CLI

Goal: Make the idea concrete, runnable, and discussable.

Deliverables:

- README
- SPEC v0.1 draft
- JSON Schemas
- Example `.cop.json` files
- CLI validator
- HTML renderer
- Markdown exporter
- Agent instructions
- Adversarial review prompt

## v0.2 — Operations and Context Packets

Goal: Make AI local edits safer and more structured.

Deliverables:

- Operation patch examples
- `cop apply-op`
- Context packet generator
- Revision log support
- Codex/Claude Code demo

## v0.3 — Viewer and Comments

Goal: Make human review and feedback first-class.

Deliverables:

- Web viewer
- Block tree
- Comment sidebar
- Risk view
- Evidence view
- Decision view

## v0.4 — MCP Server

Goal: Make COP objects usable by agent runtimes.

Deliverables:

- `cop-mcp-server`
- Resources: objects, blocks, views, context packets
- Tools: list_blocks, get_block, apply_operation, render_view, validate_object

## v0.5 — Storage Adapters

Goal: Make COP persistable as structured knowledge.

Deliverables:

- SQLite schema
- PostgreSQL schema
- Graph relation export
- Vector chunk export

## v1.0 — Stable Core

Goal: Freeze stable core schema and interoperability rules.

Deliverables:

- Stable JSON Schemas
- Compatibility test suite
- Reference implementations
- Security guide
- Governance model
