# COP v0.2 Alpha Specification Draft

**Protocol:** Cognitive Object Protocol  
**Version:** 0.1 draft  
**Status:** Experimental living draft — schemas may change before v0.2  

## 1. Purpose

COP defines a machine-readable, human-reviewable, agent-editable object model for AI-era knowledge work.

A COP object is not primarily a page. It is a structured cognitive object composed of semantic blocks, relations, states, comments, operations, views, and sources. Context packets are derived runtime artifacts, not canonical top-level document fields in v0.1.

## 2. Terminology

| Term | Meaning |
|---|---|
| Cognitive Object | A structured unit of knowledge work, such as a memo, review, meeting decision, PRD, or contract review. |
| Block | The smallest semantically addressable unit of content. |
| Relation | A typed edge connecting blocks or other entities. |
| State | Lifecycle, trust, review, risk, and freshness metadata. |
| Comment | Human or agent feedback targeted at a block or range. |
| Operation | A structured edit or state transition. |
| View | A role-specific or task-specific rendering plan. |
| Source | An evidence source, reference, file, URL, dataset, or quoted material. |
| Context Packet | A task-specific subset of the object prepared for a model call. |

## 3. Top-level object

A COP file MUST contain:

```json
{
  "protocol": "cop",
  "version": "0.1",
  "object": {},
  "blocks": [],
  "relations": []
}
```

A COP file MAY contain:

```json
{
  "comments": [],
  "operations": [],
  "views": [],
  "sources": [],
  "metadata": {}
}
```

## 4. Object model

The `object` describes the cognitive object itself.

Required fields:

| Field | Type | Description |
|---|---|---|
| id | string | Stable object ID. |
| type | string | Object type. |
| title | string | Human-readable title. |
| language | string | BCP-47-like language tag. |

Recommended fields:

| Field | Type | Description |
|---|---|---|

| created_at | string | ISO timestamp. |
| updated_at | string | ISO timestamp. |
| owner | string | User, team, or system owner. |
| description | string | Short description. |

Allowed `type` values in v0.1:

```text
research_memo
code_review
meeting_decision
product_prd
contract_review
content_review
case_summary
workflow
knowledge_card
conversation_summary
```

Other values MAY be used with the `x-` prefix, for example `x-medical-review`.

## 5. Block model

A block MUST contain:

| Field | Type | Description |
|---|---|---|
| id | string | Stable block ID. |
| type | string | Block type. |
| content | object | Content payload. |

A block MAY contain:

| Field | Type | Description |
|---|---|---|
| parent_id | string/null | Parent block. |
| order | number | Relative ordering. |
| state | object | State and trust metadata. |
| metadata | object | Extension metadata. |

### 5.1 v0.1 block types

```text
title
summary
section
paragraph
definition
claim
assumption
evidence
counter_evidence
risk
question
answer
decision
task
instruction
validation
```

Implementations SHOULD reject unknown block types by default, but MAY allow `x-` prefixed extension types.

### 5.2 Content payload

Minimal text content:

```json
{
  "format": "text",
  "text": "..."
}
```

Other content formats MAY include:

```text
text
markdown
json
table
code
media
```

## 6. Relation model

A relation connects two entities.

Required fields:

| Field | Type | Description |
|---|---|---|
| id | string | Stable relation ID. |
| from | string | Source entity ID. |
| to | string | Target entity ID. |
| type | string | Relation type. |

Optional fields:

| Field | Type | Description |
|---|---|---|
| strength | number | 0 to 1 edge confidence/weight. |
| metadata | object | Extension metadata. |

### 6.1 v0.1 relation types

```text
supports
contradicts
explains
depends_on
derived_from
updates
comments_on
risk_of
task_for
validates
references
```

## 7. State model

State can appear at object or block level.

Recommended state fields:

| Field | Type | Description |
|---|---|---|
| lifecycle | string | draft/reviewing/approved/published/archived/deprecated/superseded |
| confidence | number | 0 to 1 confidence score. |
| risk_level | string | none/low/medium/high/critical |
| trust_level | string | untrusted/agent_generated/reasoned/human_reviewed |
| review_status | string | unreviewed/needs_human_review/reviewed/rejected/accepted |
| freshness | string | current/outdated/unknown |
| visibility | object | Role/agent/public visibility metadata. |

## 8. Comment model

A comment is feedback targeted at an object, block, range, relation, or operation.

Required fields:

| Field | Type | Description |
|---|---|---|
| id | string | Stable comment ID. |
| target | object | Target reference. |
| author | object | Author metadata. |
| type | string | Comment type. |
| content | string | Comment text. |
| status | string | open/accepted/rejected/resolved/superseded |

Comment types:

```text
note
rewrite_request
ask_for_evidence
risk_flag
approval
rejection
question
```

## 9. Operation model

An operation represents an intended or applied modification.

Required fields:

| Field | Type | Description |
|---|---|---|
| id | string | Stable operation ID. |
| op | string | Operation type. |
| actor | object/string | Human, agent, or system actor. |
| created_at | string | ISO timestamp. |

Optional fields:

| Field | Type | Description |
|---|---|---|
| target | string | Target entity ID. |
| patch_format | string | `object_merge` or `json_patch`. Default: `object_merge`. |
| patch | object/array | Patch payload. If `patch_format=json_patch`, this is an RFC 6902-style array. |
| preconditions | object | Optional conflict-detection preconditions such as `target_hash`. |
| reason | string | Why this operation was made. |
| status | string | proposed/applied/rejected/reverted |

Operation types recognized by the schema:

```text
create_block
update_block
delete_block
move_block
split_block
merge_blocks
add_relation
add_comment
resolve_comment
change_state
create_view
export_view
```

Reference CLI support in v0.2.0-alpha.1 is intentionally smaller than the full schema. The CLI can apply:

```text
update_block
change_state
create_block
add_comment
resolve_comment
add_relation
```

Other operation types are reserved by the schema for protocol discussion and future versions.

### Patch payloads

COP operations are semantic envelopes. Mechanical edits SHOULD use JSON Patch-style payloads when precision matters.

### JSON Patch subset

COP v0.1 implements a restricted RFC 6902-style patch payload for `update_block`.

Supported operations:

- `add`
- `replace`
- `remove`

Unsupported in v0.1:

- `move`
- `copy`
- `test`

This is intentional. COP operations are semantic envelopes; JSON Patch is only the mechanical patch payload used inside selected operation types. Conflict detection in v0.1 is handled through `preconditions.target_hash`, not through JSON Patch `test`.

Implementations MUST reject JSON Patch paths that modify protected fields, including:

- `/id`
- `/type`
- `/state/trust_level`

Implementations SHOULD reject or warn on patches that modify high-risk semantic fields, including:

- `/state/review_status`
- `/state/lifecycle`

Future versions may add field-level `test` support, but v0.1 prioritizes block-level hash preconditions.

Mechanical edits SHOULD use JSON Patch-style payloads when precision matters:

```json
{
  "op": "update_block",
  "target": "blk_001",
  "patch_format": "json_patch",
  "patch": [
    { "op": "replace", "path": "/content/text", "value": "New text" }
  ]
}
```

Simple object merge patches remain valid for v0.1 compatibility.

### Preconditions and conflict detection

Operations MAY include:

```json
{
  "preconditions": {
    "target_hash": "sha256:abc123..."
  }
}
```

Implementations SHOULD reject operations if the current target hash does not match the declared `target_hash`. This prevents silent overwrites when multiple agents edit the same block.

## 10. View model

A view is a rendering or filtering plan.

Required fields:

| Field | Type | Description |
|---|---|---|
| id | string | Stable view ID. |
| type | string | View type. |
| include | array | Block types or entity types included. |
| layout | string | Optional rendering layout such as `card_stack`, `two_column`, or `timeline`. |

Recommended view types:

```text
executive_summary
review_dashboard
agent_context
risk_view
evidence_view
task_view
full_document
```

## 11. Source model

A source represents an evidence source or reference.

Recommended fields:

| Field | Type | Description |
|---|---|---|
| id | string | Stable source ID. |
| type | string | url/file/paper/book/dataset/conversation/email/unknown |
| title | string | Human-readable title. |
| url | string | Optional URL. |
| reliability | string | low/medium/high/unknown |
| published_at | string | Optional publication date. |
| accessed_at | string | Optional access date. |

## 12. Context packet model

A context packet is a minimal model-input bundle for a specific task. It is not itself a model call. v0.2 alpha implementations may render it as JSON or as a ready-to-paste prompt; API adapters are intentionally out of scope for the core protocol.

Required fields:

| Field | Type | Description |
|---|---|---|
| id | string | Stable context packet ID. |
| task | object | Task definition. |
| focus | object | Primary target. |
| context | object | Relevant supporting data. |
| expected_output | object | Expected model output format. |


## 12A. Diff-derived COP objects

The v0.2 alpha reference CLI includes `copctl from-diff` and `copctl from-git`. These commands are workflow helpers, not new canonical top-level protocol fields.

A diff-derived COP object SHOULD use:

- `object.type = "code_review"`
- `x-changed_file` blocks for changed files
- `x-diff_hunk` blocks for diff hunks
- `references` relations from hunk blocks to file blocks
- `references` relations from file blocks to the summary block

The `x-` prefix marks extension block types. Implementations MUST preserve unknown `x-` block types during round trips. `from-diff` is structural only: it does not claim to perform semantic code review.

## 13. Validation rules

A validator SHOULD check:

1. `protocol` equals `cop`.
2. `version` is supported.
3. Object ID exists.
4. Block IDs are unique.
5. Relation IDs are unique.
6. Relation `from` and `to` references exist where required.
7. Comments target valid entities where possible.
8. Operations use allowed operation types.
9. Operations with preconditions match current target state.
10. Block types use allowed values or `x-` extensions.
11. No required fields are missing.

## 14. Security considerations

COP objects may contain model instructions, claims, sources, and operations. Implementations SHOULD treat all external or agent-generated COP objects as untrusted until validated and reviewed.

Risks include:

- prompt injection inside instruction blocks;
- forged or low-quality sources;
- unsafe operations;
- misleading trust states or actor spoofing;
- permission leakage;
- automatic publication without human review;
- operation conflicts when multiple agents edit the same target.

Safe implementations SHOULD:

1. Separate instructions from content.
2. Require human approval for high-risk operations.
3. Track actor, timestamp, and precondition metadata.
4. Validate all object references.
5. Avoid executing arbitrary code embedded in blocks.
6. Treat rendered HTML as an export, not as the canonical source.
7. Treat `trust_level` as workflow metadata unless backed by an external identity system.


## 15. Relationship to adjacent systems

COP is not a replacement for JSON-LD, Schema.org, Notion, or MCP.

- JSON-LD / Schema.org: external linked-data and structured-data interoperability. COP may export or map to these systems, but COP defines the AI editing loop, block review state, operations, and context packets.
- Notion / Confluence / Linear: workspace and UI systems. COP can be a portable object layer underneath or beside them.
- MCP: runtime connection protocol for model resources and tools. COP objects can be exposed as MCP Resources; COP operations can be applied through MCP Tools.

See `docs/comparison.md`.

## 16. Compatibility

The v0.2 alpha reference CLI currently supports HTML rendering, Markdown export, and native COP JSON.

Future adapters MAY support DOCX, PDF, JSON-LD, and other formats.

COP MAY support integration with:

```text
GitHub
MCP
VS Code
Codex/Claude Code/Cursor
Notion/Feishu/Slack
SQL/Graph/Vector databases
```

## 17. Extension mechanism

Vendors or applications MAY introduce extension values using the `x-` prefix:

```json
{
  "type": "x-medical-risk",
  "metadata": {
    "domain": "orthopedics"
  }
}
```

Core v0.1 implementations SHOULD preserve unknown extension fields during roundtrips.
