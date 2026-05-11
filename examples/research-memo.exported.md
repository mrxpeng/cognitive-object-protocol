# Rethinking documents for the AI era

- Protocol: COP 0.1
- Kind: research_memo
- Object ID: obj_research_memo_001

## title: blk_rm_title

Rethinking documents for the AI era

## summary: blk_rm_summary

AI-era documents should be modeled as cognitive objects: block graphs with state, operations, views, and context packets.

State: `{"confidence":0.9,"review_status":"unreviewed","trust_level":"reasoned"}`

## claim: blk_rm_claim_001

Markdown optimizes for lightweight human writing, but does not explicitly represent claims, evidence, review states, or model operations.

State: `{"confidence":0.86,"risk_level":"low"}`

## claim: blk_rm_claim_002

HTML optimizes for rendering and browser compatibility, but should usually be treated as a view export rather than the canonical source of AI-era knowledge objects.

State: `{"confidence":0.84,"risk_level":"low"}`

## decision: blk_rm_decision_001

COP v0.1 should prioritize schemas, examples, validation, and a renderer before advanced integrations.

State: `{"review_status":"needs_human_review"}`

## Relations

- `blk_rm_claim_001` **explains** `blk_rm_summary` (0.8)
- `blk_rm_claim_002` **explains** `blk_rm_summary` (0.78)
- `blk_rm_decision_001` **derived_from** `blk_rm_summary` (0.7)
