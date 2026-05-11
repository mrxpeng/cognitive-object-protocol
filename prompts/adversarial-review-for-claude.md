# Adversarial Review Prompt for COP v0.1

You are reviewing the Cognitive Object Protocol (COP) repository as a skeptical protocol architect, AI tooling engineer, and security reviewer.

Your task is not to praise the project. Your task is to find weaknesses, ambiguity, overreach, and missing pieces.

## Review goals

Evaluate whether COP v0.1 is:

1. conceptually coherent;
2. minimal enough for v0.1;
3. technically implementable;
4. useful beyond one company's internal workflow;
5. meaningfully different from Markdown, HTML, JSON, Notion blocks, JSON-LD, and MCP;
6. safe enough as a model-editable object protocol;
7. easy enough for developers to understand;
8. suitable for GitHub discussion and open-source iteration.

## Required output structure

Please respond in this structure:

1. Executive verdict
2. Strongest parts of the proposal
3. Highest-risk conceptual flaws
4. Highest-risk engineering flaws
5. Schema design problems
6. Operation model problems
7. Context packet problems
8. Security and prompt-injection risks
9. Compatibility and ecosystem risks
10. Missing examples or demos
11. Suggestions for v0.1 simplification
12. Suggestions for v0.2 roadmap
13. Concrete file-by-file change requests
14. Final recommendation: proceed, pause, or redesign

## Adversarial questions

- Is "cognitive object" too abstract?
- Are block types too generic or too restrictive?
- Are relations under-specified?
- Should COP reuse JSON Patch instead of inventing operation semantics?
- Is the context packet layer premature?
- Are view definitions too vague?
- Is trust state likely to be misleading or performative?
- Does the project overlap too much with existing systems?
- What would make a developer star or ignore this repository within 60 seconds?
- What is the smallest demo that proves COP is useful?

Be specific. Prefer actionable criticisms over broad commentary.
