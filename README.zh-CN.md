# COP — Cognitive Object Protocol / 认知对象协议

[English](./README.md)

> ⚠️ **实验性工作草案 — v0.2.0-alpha.1。Schema 和 API 仍可能变化。**

> 面向 AI 编辑循环的结构化对象：Block 化、Operation 记录、人类审阅。

COP 是一个基于 JSON 的对象模型和参考 CLI，用于描述 AI 生成、人类批注和决策、模型按 block 局部修改的内容对象。它不是正式标准，不是浏览器协议，不是 Markdown 替代品，也不是生产级安全框架。它是一个可测试的对象模型和 CLI，用于 AI 生成、人类审阅、agent 可编辑的 cognitive objects。

v0.2 alpha 的重点是跑通第一个具体工作流：

```text
git diff → COP code_review 对象 → context packet → 模型生成 operation patch → apply-op → validate → render
```

---

## 谁适合尝试 COP？

当你的“文档”不只是文本，而是需要下面这些能力时，COP 才有意义：

- AI 生成代码审查、研究备忘录、会议决策、产品方案或合同审查；
- 人类需要针对具体结论、风险、任务进行批注；
- Agent 需要提出 block 级 operation patch，而不是重写全文；
- 系统需要记录 trust / review 状态、证据关系和操作历史；
- 后续还要渲染、导出、检索或复用这些对象。

不建议用 COP 处理：

- 简单个人笔记；
- 普通 README；
- 快速博客草稿；
- 一次性自然语言文本。

这些场景 Markdown 仍然更合适。

---

## COP 试图解决什么问题？

正在出现的新工作流是：

```text
AI 生成 → 人类审阅 → 人类批注 → AI 提出修改 → 人类批准 → 保存 → 复用
```

Markdown、HTML、JSON 都能解决一部分问题，但它们很难把这些东西作为一等公民：

| 需求 | Markdown | JSON | COP |
|---|---:|---:|---:|
| 语义 Block，例如 claim / risk / decision | ✗ | 部分 | ✓ |
| 每个 block 的 trust / review 状态 | ✗ | ✗ | ✓ |
| Operation log：谁改了什么 | ✗ | ✗ | ✓ |
| Block 之间的证据关系 | ✗ | ✗ | ✓ |
| 给模型调用的最小 context packet | ✗ | ✗ | ✓ |
| 人类批注绑定到具体 block | 部分 | ✗ | ✓ |

---

## v0.2 alpha：第一个真实工作流

v0.2 alpha 聚焦一个具体场景：**把 AI 辅助代码审查表示为 COP 对象**。

```bash
git diff main...HEAD > pr.diff
copctl from-diff pr.diff --out review.cop.json
copctl validate review.cop.json
copctl context review.cop.json --target blk_diff_summary --prompt --with-hash --estimate-tokens --out /tmp/context.json
# 模型返回 operation patch
copctl apply-op review.cop.json operation-patch.json --atomic --dry-run
copctl render review.cop.json --to html --out review.html
```

`from-diff` 只把 unified diff 转成结构化 COP review object；它本身不做语义代码审查。语义判断仍来自模型或人类审查者。

> 协议说明：v0.2 alpha 中 canonical COP schema version 仍是 `0.1`。`0.2.0-alpha.1` 是 CLI / reference implementation 的版本。

> 安全说明：任何模型生成的 block 更新都建议带 `preconditions.target_hash`。使用 `copctl context --with-hash` 或 `copctl hash` 获取目标 block hash。

---

## Before / After：Markdown vs COP

### Before：Markdown 代码审查

```md
The cache key is unsafe.
Evidence: user.id may be undefined.
Fix: include tenant id and guard missing user id.
```

这很容易读，但缺少：

- 稳定目标 block；
- block 级 trust / review 状态；
- claim 与 evidence 的显式关系；
- Agent 只修改某一条 claim 的安全方式。

### After：COP 对象

```json
{
  "id": "blk_cr_claim_001",
  "type": "claim",
  "content": { "format": "text", "text": "The cache key is unsafe." },
  "state": { "trust_level": "agent_generated", "review_status": "needs_human_review" }
}
```

模型提出的是经过验证的 operation，而不是重写全文：

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

这就是 COP 的核心循环：

```text
typed blocks → explicit relations → human comments → model operations → validated apply
```

---

## 快速开始

### 从仓库使用

```bash
git clone https://github.com/mrxpeng/cognitive-object-protocol
cd cognitive-object-protocol
npm install
npm run build

copctl validate examples/code-review.cop.json
copctl render examples/code-review.cop.json --to html --out /tmp/review.html
copctl export examples/code-review.cop.json --to markdown
copctl context examples/code-review.cop.json --target blk_cr_claim_001 --prompt --estimate-tokens
copctl hash examples/code-review.cop.json --target blk_cr_claim_001
copctl apply-op examples/code-review.cop.json examples/operation-patch.json --dry-run
```

### 作为 npm CLI 使用

```bash
# package 发布后
npx cognitive-object-protocol validate examples/code-review.cop.json
npx cognitive-object-protocol context examples/code-review.cop.json --target blk_cr_claim_001 --prompt
```

`copctl` 是推荐命令名。`cop` 只是便捷 alias，将来如果发生命名冲突可能移除。

---

## 当前包含什么？

| 路径 | 内容 |
|---|---|
| `schemas/` | COP 各实体的 JSON Schema |
| `examples/` | 示例 `.cop.json` 与 operation patch |
| `src/engine.ts` | Operation engine |
| `src/validator.ts` | Schema + reference + semantic validation |
| `src/renderer.ts` | HTML / Markdown 渲染 |
| `src/cli.ts` | CLI 层 |
| `SPEC.md` | 协议说明 |
| `ARCHITECTURE.md` | 架构、数据流、trust boundary |
| `AGENTS.md` | 给 Codex / Claude Code / Cursor 等 Agent 的工作规则 |
| `SECURITY.md` | 安全边界与已知风险 |
| `CHANGELOG.md` | 版本记录 |

---

## 设计原则

1. **Block-first**：最小单位是语义 block，而不是段落。
2. **Operation-logged**：AI 修改以 operation 形式提出，而不是整篇重写。
3. **Human-reviewed**：信任提升需要人类审阅。
4. **Stateful**：trust、risk、review、lifecycle 都是显式状态。
5. **Graph-aware**：block 之间通过 typed relation 连接。
6. **Context-efficient**：context packet 是给模型调用的最小相关上下文。
7. **Renderer-agnostic**：当前支持 HTML 渲染和 Markdown 导出；DOCX、PDF、JSON-LD 是路线图项目，不是当前功能。

---

## 当前限制

- `copctl from-diff` 只生成结构化 review object，不做语义代码分析。
- `from-diff` 支持标准 unified diff 和删除文件，但 rename / binary / metadata-only diff 仍是 alpha 限制。
- diff block ID 已加入稳定 hash 后缀，以降低非 ASCII 和特殊路径造成的 ID 碰撞。
- `--atomic` 是 CLI 层面的 all-or-nothing write guard，不是完整数据库事务。
- trust metadata 是工作流元数据，不是密码学身份认证。

---

## 安全说明

COP 对象可能包含 agent 生成内容、模型指令和 trust state。所有外部来源的 COP 对象在验证前都应视为不可信。

当前 CLI 会：

- 阻断 JSON Patch prototype pollution；
- 默认从 context packet 中排除 `instruction` block；
- 支持 `preconditions.target_hash` 防止 stale edit；
- 对 human actor 但没有 verified auth 的 operation 发出 warning。

详见 [`SECURITY.md`](./SECURITY.md)。

---

## 路线图、讨论与许可

- [`ROADMAP.md`](./ROADMAP.md) — v0.2 到 v1.0 规划
- [`docs/discussion-topics.md`](./docs/discussion-topics.md) — 开放讨论题
- [`docs/comparison.md`](./docs/comparison.md) — COP vs JSON-LD / Notion / MCP
- MIT License — [`LICENSE`](./LICENSE)
