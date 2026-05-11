# Fifth-round adversarial review prompt for Claude

You are an extremely strict open-source protocol architect, security reviewer, and developer-experience reviewer.

I will give you a GitHub project zip package:

**cognitive-object-protocol-v0.1.4-review.zip**

This is COP（Cognitive Object Protocol）v0.1.4-review, an experimental AI-native cognitive object protocol.

The prior review identified these must-fix items:

- Engine security paths were not covered by tests.
- `update_block` with `patch_format=json_patch` could modify protected fields such as `/id` and `/state/trust_level`.
- `SPEC.md` still mentioned top-level `context_packets`, `trust_level=verified`, and an older CLI version.
- The JSON Patch subset was not clearly documented as a restricted RFC 6902-style subset.
- `package.json` was missing npm release metadata.
- README did not have a strong before/after killer demo.

This v0.1.4-review claims to fix those items by adding:

- `tests/engine.test.mjs` covering prototype pollution, JSON Patch protected paths, trust escalation bypass, object_merge id overwrite, dangling relation, invalid comment status, replay protection, stale target_hash, valid target_hash apply, and input immutability.
- Protected JSON Patch path guards for `/id` and `/state/trust_level`.
- SPEC cleanup and “experimental living draft” language.
- Restricted JSON Patch subset documentation.
- npm metadata (`repository`, `bugs`, `homepage`, `keywords`, `engines.node`).
- README before/after AI code review demo.

## Required first step

Unzip the project and run:

```bash
npm install
npm run build
npm test
npm run validate:examples
npm pack
npx ./cognitive-object-protocol-0.1.4.tgz validate examples/code-review.cop.json
node dist/cli.js context examples/code-review.cop.json --target blk_cr_claim_001 --prompt --estimate-tokens
```

If any command fails, report:

- failed command;
- error log;
- whether it is a release blocker;
- affected file path;
- exact fix.

## Review focus

Do not praise the project by default. Focus on remaining weaknesses.

### 1. Engine security and tests

Review:

- `src/engine.ts`
- `tests/engine.test.mjs`

Answer:

- Do tests actually fail on the previous vulnerable behavior?
- Are protected paths sufficient?
- Should `/state/review_status`, `/state/lifecycle`, or `/type` be blocked rather than warned?
- Does `applyJsonPatch` correctly implement JSON Pointer edge cases?
- Can array paths or `/-` cause unexpected behavior?
- Can `add` create arbitrary nested structures that pass engine but fail schema?
- Does operation apply validate the resulting document, or can it produce invalid COP?
- Is replay protection enough without document-level monotonic sequence?

### 2. SPEC vs implementation consistency

Review `SPEC.md` against:

- `schemas/*.schema.json`
- `src/engine.ts`
- `src/cli.ts`
- `README.md`

Find any remaining inconsistency.

Output as a table:

| Section | Inconsistency | Severity | Fix |
|---|---|---:|---|

### 3. npm release readiness

Review:

- `package.json`
- `package-lock.json`
- `dist/`
- npm pack output

Answer:

- Is `cognitive-object-protocol` the right package name?
- Should it be `@cop-protocol/cli`?
- Should the `cop` alias be removed?
- Are `files` correct?
- Are there missing `exports` fields?
- Is Node version constraint appropriate?

### 4. README killer demo

Score README’s ability to make a TypeScript developer try the project in 10 minutes.

Give score 0–10.

Then propose exact README changes:

- first screen copy;
- before/after demo;
- quickstart;
- “when not to use COP”; 
- live demo or GitHub Pages plan.

### 5. Context packet and agent workflow

Review:

- `src/cli.ts`
- `schemas/context-packet.schema.json`
- `docs/context-packet.md`
- `AGENTS.md`

Answer:

- Is default instruction exclusion sufficient?
- Is XML wrapping enough to reduce prompt injection risk?
- Does the prompt format make it likely that Claude/Codex returns valid operations?
- Should `copctl context` generate an output schema for operations?
- Should it include target hash automatically in the expected output?

### 6. Release decision

Give one of:

- proceed
- proceed after small fixes
- pause
- redesign

Also provide:

- overall score 0–100;
- remaining must-fix items before public GitHub release;
- v0.2 top 3 priorities;
- whether you would star or close the tab if seeing the repo for the first time.

Be strict. Only facts and code matter.
