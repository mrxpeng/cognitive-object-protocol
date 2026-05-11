# E2E demo: AI code review loop

This folder shows the intended COP workflow around a code review object. It is intentionally minimal: v0.1 does not yet include `copctl from-diff`, so `review.cop.json` is pre-authored from `input.diff`.

## Current v0.1 workflow

```bash
# 1. Validate the COP review object
copctl validate examples/e2e-code-review/review.cop.json

# 2. Get a stable block hash for optimistic conflict detection
copctl hash examples/e2e-code-review/review.cop.json --target blk_cr_claim_001

# 3. Generate a model-ready context prompt for the target block
copctl context examples/e2e-code-review/review.cop.json \
  --target blk_cr_claim_001 \
  --prompt \
  --prompt-out /tmp/cop-review-prompt.md \
  --estimate-tokens

# 4. In a real workflow, paste /tmp/cop-review-prompt.md into a model.
#    For this demo, use the prepared operation patch:
copctl apply-op examples/e2e-code-review/review.cop.json \
  examples/e2e-code-review/operation-patch.json \
  --dry-run

# 5. Render a human-readable report
copctl render examples/e2e-code-review/review.cop.json \
  --to html \
  --out /tmp/cop-review.html
```

## Missing tool planned for v0.2

```bash
copctl from-diff input.diff --out review.cop.json
```

That command is intentionally not included in v0.1. It is the highest-priority workflow feature for v0.2.
