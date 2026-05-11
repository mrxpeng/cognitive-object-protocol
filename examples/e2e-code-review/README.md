# E2E demo: AI code review loop

This folder shows the intended COP workflow around a code review object.

v0.2 alpha adds `copctl from-diff`, so the flow can now start from a real unified diff.

## v0.2 alpha workflow

```bash
# 1. Generate a structural COP review object from a diff
copctl from-diff examples/e2e-code-review/input.diff \
  --out /tmp/review.cop.json

# 2. Validate the generated object
copctl validate /tmp/review.cop.json

# 3. Get a stable block hash for optimistic conflict detection
copctl hash /tmp/review.cop.json --target blk_diff_summary

# 4. Generate a model-ready context prompt for the target block
copctl context /tmp/review.cop.json \
  --target blk_diff_summary \
  --prompt \
  --with-hash \
  --prompt-out /tmp/cop-review-prompt.md \
  --estimate-tokens \
  --max-tokens 4000

# 5. In a real workflow, paste /tmp/cop-review-prompt.md into a model.
#    For this demo, use the prepared operation patch:
copctl apply-op examples/e2e-code-review/review.cop.json \
  examples/e2e-code-review/operation-patch.json \
  --atomic \
  --dry-run

# 6. Render a human-readable report
copctl render /tmp/review.cop.json \
  --to html \
  --out /tmp/cop-review.html
```

## Important limitation

`from-diff` is structural only. It identifies files and hunks, but it does not perform semantic code review. The semantic review still comes from a model or human reviewer that proposes COP operations.
