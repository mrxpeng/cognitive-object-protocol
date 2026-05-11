# Agent Integration

Agents should not rewrite entire COP objects by default. They should propose operations.

Example:

```json
{
  "operations": [
    {
      "op": "update_block",
      "target": "blk_001",
      "patch": {
        "content.text": "Rewritten text"
      },
      "reason": "Human requested a more cautious claim."
    }
  ]
}
```

## Recommended workflow

1. Validate COP object.
2. Generate context packet for task.
3. Ask model to output operations.
4. Validate operations.
5. Apply operations.
6. Re-validate object.
7. Render human view.
