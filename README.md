# COP — Cognitive Object Protocol / 认知对象协议

This README is bilingual. For a Chinese-only version, see [README.zh-CN.md](./README.zh-CN.md).

本 README 为中英对照。如果只想阅读中文版本，请看 [README.zh-CN.md](./README.zh-CN.md)。

> ⚠️ **Experimental working draft — v0.2.0-alpha.1. Schemas and APIs will change without notice.**
>
> ⚠️ **实验性工作草案 — v0.2.0-alpha.1。Schema 和 API 仍可能变化。**

> Structured documents for the AI editing loop: block-typed, operation-logged, human-reviewed.
>
> 面向 AI 编辑循环的结构化对象：Block 化、Operation 记录、人类审阅。

COP is a JSON-based object model and reference CLI for content that AI agents generate, humans annotate and decide on, and models edit **block-by-block** without rewriting the whole file. v0.2.0-alpha.1 adds the first concrete workflow tool: `copctl from-diff`.

COP 是一个基于 JSON 的对象模型和参考 CLI，用于描述 AI 生成、人类批注和决策、模型按 **block** 局部修改的内容对象，而不是每次重写全文。v0.2.0-alpha.1 加入了第一个具体工作流工具：`copctl from-diff`。

COP is not a standard, not a browser protocol, not a Markdown replacement, and not a production-grade security framework. It is a testable object model and CLI for AI-generated, human-reviewed, agent-editable cognitive objects.

COP 不是正式标准，不是浏览器协议，不是 Markdown 替代品，也不是生产级安全框架。它是一个可测试的对象模型和 CLI，用于讨论 AI 生成、人类审阅、agent 可编辑的 cognitive objects。

---

## Who should try COP? / 谁适合尝试 COP？

Use COP when a document is not just text, but a reviewable object that needs block-level AI edits, human comments, trust/review state, evidence relations, and operation history.

当你的“文档”不只是文本，而是一个需要被审阅、被批注、被局部修改、并保留状态和操作历史的对象时，COP 才有意义。

Good early use cases:

适合早期尝试的场景：

- AI code review reports / AI 代码审查报告
- research memos with claims and evidence / 带有结论和证据的研究备忘录
- meeting decisions with tasks and risks / 包含任务和风险的会议决策
- contract or policy reviews / 合同或政策审查
- product requirement reviews / 产品需求审查

Do **not** use COP for simple notes, ordinary README files, quick blog drafts, or one-off prose. Markdown is still better for those.

不建议用 COP 处理简单个人笔记、普通 README、快速博客草稿或一次性自然语言文本。这些场景 Markdown 仍然更合适。

---

## The problem / COP 试图解决什么问题？

The emerging AI document workflow:

正在出现的新工作流是：

```text
AI generates → Human reviews → Human comments → AI proposes edit → Human approves → Stored → Reused
AI 生成 → 人类审阅 → 人类批注 → AI 提出修改 → 人类批准 → 保存 → 复用
```

Markdown, HTML, and JSON each solve part of this. None of them make these **first-class**:

Markdown、HTML、JSON 都能解决一部分问题，但它们很难把下面这些能力作为一等公民：

| Need / 需求 | Markdown | JSON | COP |
|---|---:|---:|---:|
| Typed semantic blocks, such as claim, risk, decision / 语义 Block，例如 claim、risk、decision | ✗ | partial / 部分 | ✓ |
| Trust + review state on each block / 每个 block 的 trust + review 状态 | ✗ | ✗ | ✓ |
| Operation log: what changed, who proposed it / Operation log：谁改了什么 | ✗ | ✗ | ✓ |
| Typed evidence relations between blocks / Block 之间的证据关系 | ✗ | ✗ | ✓ |
| Minimal context packets for model calls / 给模型调用的最小 context packet | ✗ | ✗ | ✓ |
| Human comments tied to specific blocks / 人类批注绑定到具体 block | partial / 部分 | ✗ | ✓ |

---

## v0.2 alpha: first workflow loop / v0.2 alpha：第一个真实工作流

v0.2 alpha focuses on one concrete workflow: **AI-assisted code review as a COP object**.

v0.2 alpha 聚焦一个具体场景：**把 AI 辅助代码审查表示为 COP 对象**。

```bash
git diff main...HEAD > pr.diff
copctl from-diff pr.diff --out review.cop.json
copctl validate review.cop.json
copctl context review.cop.json --target blk_diff_summary --prompt --with-hash --estimate-tokens --out /tmp/context.json
# model returns operation patch / 模型返回 operation patch
copctl apply-op review.cop.json operation-patch.json --atomic --dry-run
copctl render review.cop.json --to html --out review.html
```

This is still an experimental workflow. `from-diff` creates a structural review object from a unified diff; it does not yet perform semantic code analysis by itself.

这仍然是实验性工作流。`from-diff` 只把 unified diff 转成结构化 review object；它本身不做语义代码审查。语义判断仍来自模型或人类审查者。

> Protocol note: the canonical COP schema version remains `0.1` in v0.2 alpha. `0.2.0-alpha.1` is the CLI/reference implementation version.
>
> 协议说明：v0.2 alpha 中 canonical COP schema version 仍是 `0.1`。`0.2.0-alpha.1` 是 CLI / reference implementation 的版本。

> Security note: model-generated patches should include `preconditions.target_hash` for any block update. Use `copctl context --with-hash` or `copctl hash` before asking a model to produce an operation patch.
>
> 安全说明：任何模型生成的 block 更新都建议带 `preconditions.target_hash`。使用 `copctl context --with-hash` 或 `copctl hash` 获取目标 block hash。

---

## Before / after: AI code review / Before / After：AI 代码审查

### Before: review as Markdown / Before：Markdown 审查

```md
The cache key is unsafe.
Evidence: user.id may be undefined.
Fix: include tenant id and guard missing user id.
```

This is readable, but it has no stable target, no block-level trust state, no relation between claim and evidence, and no safe way for an agent to modify only one claim without rewriting the whole review.

这很容易读，但缺少稳定目标 block、block 级 trust / review 状态、claim 与 evidence 的显式关系，也缺少让 agent 只修改某一条 claim 的安全方式。

### After: review as COP / After：COP 对象

```json
{
  "id": "blk_cr_claim_001",
  "type": "claim",
  "content": { "format": "text", "text": "The cache key is unsafe." },
  "state": { "trust_level": "agent_generated", "review_status": "needs_human_review" }
}
```

Then a model proposes a validated operation instead of rewriting the document:

然后模型提出的是经过验证的 operation，而不是重写全文：

```json
{
  "id": "op_update_cache_claim",
  "op": "update_block",
  "target": "blk_cr_claim_001",
  "patch_format": "json_patch",
  "patch": [
    { "op": "replace", "path": "/content/text", "value": "The cache key should include tenant and user guards." }
  ],
  "preconditions": { "target_hash": "sha256:..." }
}
```

That is the core COP loop:

这就是 COP 的核心循环：

```text
typed blocks → explicit relations → human comments → model operations → validated apply
语义 block → 显式关系 → 人类批注 → 模型 operation → 验证后应用
```

---

## Quickstart / 快速开始

### Option A: use from a cloned repository / 方式 A：从仓库使用

```bash
git clone https://github.com/mrxpeng/cognitive-object-protocol
cd cognitive-object-protocol
npm install
npm run build

# Validate / 校验
copctl validate examples/code-review.cop.json

# Render to HTML / 渲染为 HTML
copctl render examples/code-review.cop.json --to html --out /tmp/review.html

# Export to Markdown / 导出为 Markdown
copctl export examples/code-review.cop.json --to markdown

# Generate context packet + model prompt for a specific block
# 为指定 block 生成 context packet 和模型 prompt
copctl context examples/code-review.cop.json --target blk_cr_claim_001 --prompt --estimate-tokens

# Get the stable hash of a block for conflict detection
# 获取 block 的稳定 hash，用于冲突检测
copctl hash examples/code-review.cop.json --target blk_cr_claim_001

# Apply agent-proposed operation patches in dry-run mode
# 以 dry-run 方式应用 agent 提出的 operation patch
copctl apply-op examples/code-review.cop.json examples/operation-patch.json --dry-run
```

### Option B: use as an npm CLI package / 方式 B：作为 npm CLI 使用

```bash
# after the package is published / package 发布后
npx cognitive-object-protocol validate examples/code-review.cop.json
npx cognitive-object-protocol context examples/code-review.cop.json --target blk_cr_claim_001 --prompt
```

`copctl` is the canonical command name. `cop` is only a convenience alias and may be removed if naming conflicts appear.

`copctl` 是推荐命令名。`cop` 只是便捷 alias，将来如果发生命名冲突可能移除。

---

## Complete example: AI code review loop / 完整示例：AI 代码审查循环

**Step 1 — The COP document / 第一步：COP 文档** (`code-review.cop.json`)

```json
{
  "protocol": "cop",
  "version": "0.1",
  "object": { "id": "obj_cr_001", "type": "code_review", "title": "Cache key security review", "language": "en" },
  "blocks": [
    {
      "id": "blk_claim",
      "type": "claim",
      "order": 1,
      "content": { "format": "text", "text": "The cache key omits orgId, risking cross-tenant data leakage." },
      "state": { "confidence": 0.81, "risk_level": "high", "trust_level": "agent_generated", "review_status": "needs_human_review" }
    },
    {
      "id": "blk_evidence",
      "type": "evidence",
      "order": 2,
      "content": { "format": "code", "language": "ts", "text": "const key = `profile:${user.id}`;" }
    },
    {
      "id": "blk_task",
      "type": "task",
      "order": 3,
      "content": { "format": "text", "text": "Update cache key to include orgId. Add tenant isolation test." },
      "state": { "lifecycle": "draft" }
    }
  ],
  "relations": [
    { "id": "rel_001", "from": "blk_evidence", "to": "blk_claim", "type": "supports", "strength": 0.9 },
    { "id": "rel_002", "from": "blk_task", "to": "blk_claim", "type": "task_for", "strength": 1.0 }
  ]
}
```

**Step 2 — Generate context packet + prompt / 第二步：生成 context packet 和 prompt**

```bash
copctl hash code-review.cop.json --target blk_claim
# → sha256:abc123...

copctl context code-review.cop.json --target blk_claim --prompt --prompt-out /tmp/prompt.txt
# paste /tmp/prompt.txt into your model / 把 /tmp/prompt.txt 粘贴给模型
```

**Step 3 — Agent outputs a patch / 第三步：Agent 输出 patch** (`patch.json`)

```json
{
  "operations": [{
    "id": "op_001",
    "op": "update_block",
    "target": "blk_claim",
    "actor": { "type": "agent", "name": "review-agent" },
    "patch_format": "json_patch",
    "patch": [{ "op": "replace", "path": "/content/text", "value": "Cache key omits orgId — cross-tenant collision confirmed for shared-ID deployments." }],
    "preconditions": { "target_hash": "sha256:abc123..." },
    "reason": "Tightened wording after reviewing the tenant scoping logic.",
    "status": "proposed",
    "created_at": "2026-05-10T15:00:00Z"
  }]
}
```

**Step 4 — Apply and validate / 第四步：应用并校验**

```bash
copctl apply-op code-review.cop.json patch.json
copctl validate code-review.cop.json
```

---

## End-to-end demo / 端到端 demo

A minimal code-review workflow is included at [`examples/e2e-code-review/`](./examples/e2e-code-review/).

仓库中包含一个最小代码审查工作流示例：[`examples/e2e-code-review/`](./examples/e2e-code-review/)。

```bash
copctl validate examples/e2e-code-review/review.cop.json
copctl hash examples/e2e-code-review/review.cop.json --target blk_cr_claim_001
copctl context examples/e2e-code-review/review.cop.json --target blk_cr_claim_001 --prompt --prompt-out /tmp/cop-review-prompt.md --estimate-tokens
copctl apply-op examples/e2e-code-review/review.cop.json examples/e2e-code-review/operation-patch.json --dry-run
copctl render examples/e2e-code-review/review.cop.json --to html --out /tmp/cop-review.html
```

`copctl from-diff` is available in v0.2 alpha. It creates a structural COP review object from a unified diff; semantic review still comes from a model or human reviewer.

`copctl from-diff` 已在 v0.2 alpha 中可用。它会从 unified diff 创建结构化 COP review object；语义审查仍来自模型或人类审查者。

---

## What COP v0.2 alpha contains / v0.2 alpha 当前包含什么？

| Path / 路径 | Contents / 内容 |
|---|---|
| `schemas/` | JSON Schemas for all COP entities / COP 各实体的 JSON Schema |
| `examples/` | Example `.cop.json` files and operation patches / 示例 `.cop.json` 与 operation patch |
| `src/engine.ts` | Operation engine / Operation engine |
| `src/validator.ts` | Schema + reference + semantic validation / Schema、引用和语义校验 |
| `src/renderer.ts` | HTML + Markdown rendering / HTML 和 Markdown 渲染 |
| `src/cli.ts` | CLI layer / CLI 层 |
| `SPEC.md` | Protocol specification / 协议说明 |
| `ARCHITECTURE.md` | Data flow, modules, trust boundary / 数据流、模块、trust boundary |
| `AGENTS.md` | Instructions for Codex, Claude Code, Cursor, and similar agents / 给 Codex、Claude Code、Cursor 等 agent 的工作规则 |
| `SECURITY.md` | Security model, known risks, mitigations / 安全边界、已知风险和缓解措施 |
| `CHANGELOG.md` | Version history / 版本记录 |

---

## Design principles / 设计原则

1. **Block-first.** Smallest unit = typed semantic block, not paragraph.
   **Block-first。** 最小单位是语义 block，而不是段落。
2. **Operation-logged.** AI edits are proposed operations, not file rewrites.
   **Operation-logged。** AI 修改以 operation 形式提出，而不是整篇重写。
3. **Human-reviewed.** Trust elevation requires human review.
   **Human-reviewed。** 信任提升需要人类审阅。
4. **Stateful.** Trust, risk, review, and lifecycle are explicit state.
   **Stateful。** trust、risk、review、lifecycle 都是显式状态。
5. **Graph-aware.** Blocks link via typed, weighted relations.
   **Graph-aware。** block 之间通过 typed relation 连接。
6. **Context-efficient.** Context packets are the minimum relevant slice for a model call.
   **Context-efficient。** context packet 是给模型调用的最小相关上下文。
7. **Renderer-agnostic.** Renders to HTML and exports to Markdown today. DOCX, PDF, and JSON-LD are roadmap items, not current v0.2 alpha features.
   **Renderer-agnostic。** 当前支持 HTML 渲染和 Markdown 导出；DOCX、PDF、JSON-LD 是路线图项目，不是当前功能。

---

## Non-goals for v0.2 alpha / v0.2 alpha 的非目标

- Not a browser standard or W3C proposal. / 不是浏览器标准，也不是 W3C proposal。
- Not a replacement for Markdown notes or HTML pages. / 不是 Markdown 笔记或 HTML 页面替代品。
- Not a full knowledge-base product. / 不是完整知识库产品。
- Not a closed application format. / 不是封闭应用格式。
- Not cryptographically signed in v0.2 alpha. / v0.2 alpha 不提供密码学签名。

---

## Current limitations / 当前限制

- `copctl from-diff` is structural only. It does not perform semantic code analysis.
  `copctl from-diff` 只做结构化转换，不做语义代码分析。
- `copctl from-diff` handles standard unified diffs and deleted files, but rename, binary, and metadata-only diffs are still limited alpha behavior.
  `copctl from-diff` 支持标准 unified diff 和删除文件，但 rename、binary、metadata-only diff 仍是 alpha 限制。
- Generated diff block IDs include a stable hash suffix to avoid collisions for non-ASCII or heavily sanitized file paths.
  diff block ID 已加入稳定 hash 后缀，以降低非 ASCII 和特殊路径造成的 ID 碰撞。
- `--atomic` is a CLI-level all-or-nothing write guard, not a full database transaction.
  `--atomic` 是 CLI 层面的 all-or-nothing write guard，不是完整数据库事务。
- Trust metadata is workflow metadata, not cryptographic identity.
  trust metadata 是工作流元数据，不是密码学身份认证。

---

## Security note / 安全说明

COP objects may contain agent-generated content, model instructions, and trust state. Treat all externally received COP objects as untrusted until validated. The CLI blocks prototype pollution in JSON Patch paths and excludes `instruction` blocks from context packets by default. See [`SECURITY.md`](./SECURITY.md).

COP 对象可能包含 agent 生成内容、模型指令和 trust state。所有外部来源的 COP 对象在验证前都应视为不可信。当前 CLI 会阻断 JSON Patch prototype pollution，并默认从 context packet 中排除 `instruction` block。详见 [`SECURITY.md`](./SECURITY.md)。

---

## Roadmap, discussion, and license / 路线图、讨论与许可

- [`ROADMAP.md`](./ROADMAP.md) — v0.2 to v1.0 plans / v0.2 到 v1.0 规划
- [`docs/discussion-topics.md`](./docs/discussion-topics.md) — open questions / 开放讨论题
- [`docs/comparison.md`](./docs/comparison.md) — COP vs JSON-LD / Notion / MCP
- MIT License — [`LICENSE`](./LICENSE)
