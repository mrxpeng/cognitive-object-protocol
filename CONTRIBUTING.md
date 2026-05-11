# Contributing

COP is experimental. Contributions are welcome, especially in these areas:

- schema design;
- examples;
- validator improvements;
- renderer improvements;
- operation model review;
- security review;
- agent integration;
- database mapping.

## Before proposing a schema change

Please answer:

1. What real use case requires this change?
2. Can the current extension mechanism handle it?
3. Does the change increase model stability or reduce it?
4. Does the change make validation easier or harder?
5. Is the new field or enum value general enough for v0.1 core?

## Development

```bash
npm install
npm run build
npm test
npm run validate:examples
```
