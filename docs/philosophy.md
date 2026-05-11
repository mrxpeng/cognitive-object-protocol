# Philosophy: From Documents to Cognitive Objects

Traditional documents assume that humans write and humans read. AI-era knowledge work is different:

```text
AI generates → Human reviews → Human comments → AI edits → Database stores → Agent reuses
```

COP treats a document as a cognitive object: a graph of semantically typed blocks with explicit relations, states, comments, operations, and views.

## Why not only Markdown?

Markdown is excellent for lightweight writing, but it does not explicitly model:

- claims;
- evidence;
- human review states;
- risks;
- comments targeted at stable block IDs;
- model operation logs;
- context packets for efficient model calls.

## Why not only HTML?

HTML is excellent as a view layer, but it should not be the canonical source for complex AI-era knowledge objects. Rendering markup is not the same as a durable knowledge graph.

## Why not only JSON?

JSON is a data carrier, not a full cognitive protocol. COP uses JSON as a physical representation, but adds standardized block types, relation types, operation types, states, views, and context packet semantics.
