# COP compared with JSON-LD, Schema.org, Notion, and MCP

COP is intentionally narrow: it is a draft object protocol for AI-generated, human-reviewed, agent-editable knowledge work. It is not intended to replace all structured data formats, workspaces, or agent protocols.

## Summary

| System | Primary job | What it does well | What COP adds |
|---|---|---|---|
| JSON-LD | Linked data interoperability | Web-scale entity linking and semantic graph publishing | Block-level review state, operation logs, context packets, human feedback loops |
| Schema.org | Public structured-data vocabulary | Common types for web pages, entities, products, articles, organizations, datasets | AI editing lifecycle and cognitive-object workflow semantics |
| Notion Block API | Blocks inside a workspace product | Human-friendly workspace UI and page/block CRUD | Portable, product-neutral object model for agent edits, trust state, and graph storage |
| MCP Resource | Runtime context for model/tool integration | Standard way for LLM apps to access resources/tools | Defines what the AI-native cognitive object is; can be exposed through MCP |

## COP vs JSON-LD / Schema.org

COP should not compete with JSON-LD. JSON-LD and Schema.org are best viewed as interoperability layers for public entities and linked data. COP is focused on the AI editing loop:

```text
AI generates → human reviews → agent proposes operation → validator applies → graph/database stores → future context packet reuses
```

COP may later support JSON-LD export for blocks, sources, objects, or entities.

## COP vs Notion Block API

Notion remains a workspace and UI. COP is a portable protocol. A team already using Notion should not "switch" to COP. A more realistic path is:

```text
Notion / Confluence / Linear = workspace surfaces
COP = portable AI-native cognitive object layer
```

Future adapters can import/export Notion pages as COP objects.

## COP vs MCP

MCP is a connection protocol. COP is a content/object protocol.

```text
MCP: how agents access resources and tools.
COP: the structure of the AI-native object those agents read, edit, validate, and store.
```

A COP MCP server can expose:

- `cop://objects/{id}` as resources
- `cop://blocks/{id}` as resources
- `create_context_packet`, `apply_operation`, `validate_object`, `render_view` as tools

## When COP is not a good fit

Do not use COP for:

- simple notes;
- short README files;
- one-off blog drafts;
- documents that never need block-level AI edits;
- documents that do not require review state, evidence, graph relations, or audit logs.

Use COP when the work benefits from:

- block-level human feedback;
- AI operation patches instead of whole-document rewrites;
- trust/review/risk state;
- source and evidence links;
- context-packet generation;
- SQL / graph / vector database storage.
