import type { CopBlock, CopDocument } from "./types.js";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function contentText(block: CopBlock): string {
  if (typeof block.content.text === "string") return block.content.text;
  if (block.content.data !== undefined) return JSON.stringify(block.content.data, null, 2);
  return "";
}

function blockLabel(type: string): string {
  return type.replace(/_/g, " ").toUpperCase();
}

function renderStateHuman(state: CopBlock["state"]): string {
  if (!state) return "";
  const parts: string[] = [];
  if (state.lifecycle) parts.push(`lifecycle: ${state.lifecycle}`);
  if (typeof state.confidence === "number") parts.push(`confidence: ${state.confidence}`);
  if (state.risk_level && state.risk_level !== "none") parts.push(`risk: ${state.risk_level}`);
  if (state.trust_level) parts.push(`trust: ${state.trust_level}`);
  if (state.review_status) parts.push(`review: ${state.review_status}`);
  if (state.freshness) parts.push(`freshness: ${state.freshness}`);
  return parts.join(" · ");
}

export function renderHtml(doc: CopDocument, viewId?: string): string {
  // Determine which block types to include based on view definition
  let includedTypes: Set<string> | null = null;
  if (viewId) {
    const view = (doc.views ?? []).find((v) => v.id === viewId);
    if (view && view.include.length > 0) {
      includedTypes = new Set(view.include);
    }
  }

  const blocks = [...doc.blocks]
    .filter((b) => !includedTypes || includedTypes.has(b.type))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const commentsByTarget = new Map<string, string[]>();
  for (const comment of doc.comments ?? []) {
    const arr = commentsByTarget.get(comment.target.id) ?? [];
    arr.push(`[${comment.type}] ${comment.content}`);
    commentsByTarget.set(comment.target.id, arr);
  }

  const blockHtml = blocks
    .map((block) => {
      const comments = commentsByTarget.get(block.id) ?? [];
      const isInstruction = block.type === "instruction";
      const riskClass = block.state?.risk_level
        ? `risk-${escapeHtml(String(block.state.risk_level))}`
        : "";
      const stateStr = renderStateHuman(block.state);

      const commentsHtml = comments.length
        ? `<div class="comments"><strong>Comments</strong>${comments
            .map((c) => `<p>${escapeHtml(c)}</p>`)
            .join("")}</div>`
        : "";

      const instructionWarning = isInstruction
        ? `<div class="instruction-warning">⚠️ INSTRUCTION BLOCK — review before sending to model</div>`
        : "";

      let contentHtml = "";
      if (block.content.format === "code") {
        contentHtml = `<pre><code>${escapeHtml(contentText(block))}</code></pre>`;
      } else {
        contentHtml = `<div class="block-content">${escapeHtml(contentText(block)).replace(
          /\n/g,
          "<br>"
        )}</div>`;
      }

      return `<section class="block block-${escapeHtml(block.type)} ${riskClass}" data-block-id="${escapeHtml(
        block.id
      )}" data-block-type="${escapeHtml(block.type)}">
      ${instructionWarning}
      <div class="block-meta">
        <span class="label">${escapeHtml(blockLabel(block.type))}</span>
        <code>${escapeHtml(block.id)}</code>
        ${stateStr ? `<span class="state-pills">${escapeHtml(stateStr)}</span>` : ""}
      </div>
      ${contentHtml}
      ${commentsHtml}
    </section>`;
    })
    .join("\n");

  const relationHtml = doc.relations
    .map(
      (rel) =>
        `<li><code>${escapeHtml(rel.from)}</code> <strong>${escapeHtml(rel.type)}</strong> <code>${escapeHtml(
          rel.to
        )}</code>${rel.strength !== undefined ? ` <span class="muted">(${rel.strength})</span>` : ""}</li>`
    )
    .join("\n");

  const viewTitle = viewId ? ` — ${viewId}` : "";

  return `<!doctype html>
<html lang="${escapeHtml(doc.object.language)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(doc.object.title)}${escapeHtml(viewTitle)}</title>
<style>
:root { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #172033; background: #f5f7fb; }
body { margin: 0; padding: 32px; }
main { max-width: 1040px; margin: 0 auto; }
.hero { background: #fff; border: 1px solid #e4e9f2; border-radius: 20px; padding: 28px; box-shadow: 0 8px 30px rgba(15,23,42,.06); margin-bottom: 18px; }
h1 { margin: 0 0 8px; font-size: 32px; letter-spacing: -0.03em; }
.subtitle { color: #64748b; margin: 0; }
.grid { display: grid; grid-template-columns: minmax(0,1fr) 320px; gap: 18px; }
.block, .panel { background: #fff; border: 1px solid #e4e9f2; border-radius: 16px; padding: 18px; margin-bottom: 14px; box-shadow: 0 4px 18px rgba(15,23,42,.04); }
.block-meta { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
.label { background: #1e3a8a; color: #fff; border-radius: 999px; padding: 4px 9px; font-size: 12px; font-weight: 700; }
.state-pills { background: #eef2ff; color: #3730a3; border-radius: 999px; padding: 4px 9px; font-size: 12px; }
.risk-high, .risk-critical { border-left: 4px solid #dc2626; }
.risk-medium { border-left: 4px solid #d97706; }
code { background: #f1f5f9; padding: 2px 5px; border-radius: 6px; font-size: 12px; }
pre { background: #1e293b; color: #e2e8f0; border-radius: 10px; padding: 14px; overflow-x: auto; }
pre code { background: none; color: inherit; padding: 0; }
.block-content { white-space: normal; line-height: 1.65; font-size: 16px; }
.comments { margin-top: 14px; padding: 12px; background: #f8fafc; border-left: 4px solid #94a3b8; border-radius: 10px; }
.instruction-warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 6px 12px; font-size: 13px; color: #92400e; margin-bottom: 10px; }
ul { padding-left: 20px; line-height: 1.6; }
.muted { color: #64748b; }
@media (max-width: 860px) { body { padding: 16px; } .grid { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<main>
  <header class="hero">
    <h1>${escapeHtml(doc.object.title)}</h1>
    <p class="subtitle">COP ${escapeHtml(doc.version)} · ${escapeHtml(doc.object.type)} · ${escapeHtml(doc.object.id)}${escapeHtml(viewTitle)}</p>
  </header>
  <div class="grid">
    <div>${blockHtml}</div>
    <aside>
      <section class="panel"><h2>Relations</h2><ul>${relationHtml || "<li><em>none</em></li>"}</ul></section>
      <section class="panel"><h2>Views</h2><ul>${
        (doc.views ?? []).length
          ? (doc.views ?? [])
              .map(
                (v) =>
                  `<li><code>${escapeHtml(v.id)}</code> <span class="muted">${escapeHtml(v.type)}</span></li>`
              )
              .join("")
          : "<li><em>none</em></li>"
      }</ul></section>
    </aside>
  </div>
</main>
</body>
</html>`;
}

export function renderMarkdown(doc: CopDocument): string {
  const lines: string[] = [];
  lines.push(`# ${doc.object.title}`);
  lines.push("");
  lines.push(`- Protocol: COP ${doc.version}`);
  lines.push(`- Type: ${doc.object.type}`);
  lines.push(`- Object ID: ${doc.object.id}`);
  if (doc.object.state?.lifecycle) lines.push(`- Lifecycle: ${doc.object.state.lifecycle}`);
  lines.push("");

  for (const block of [...doc.blocks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
    lines.push(`## ${block.type}: ${block.id}`);
    lines.push("");

    if (block.content.format === "code") {
      const lang = block.content.language ?? "";
      lines.push(`\`\`\`${lang}`);
      lines.push(contentText(block));
      lines.push("```");
    } else {
      lines.push(contentText(block));
    }
    lines.push("");

    if (block.state) {
      const s = block.state;
      const parts: string[] = [];
      if (s.lifecycle) parts.push(`lifecycle: **${s.lifecycle}**`);
      if (typeof s.confidence === "number") parts.push(`confidence: **${s.confidence}**`);
      if (s.risk_level && s.risk_level !== "none") parts.push(`risk: **${s.risk_level}**`);
      if (s.trust_level) parts.push(`trust: **${s.trust_level}**`);
      if (s.review_status) parts.push(`review: **${s.review_status}**`);
      if (s.freshness) parts.push(`freshness: **${s.freshness}**`);
      if (parts.length) {
        lines.push(`> ${parts.join(" · ")}`);
        lines.push("");
      }
    }
  }

  if (doc.relations.length) {
    lines.push("## Relations");
    lines.push("");
    for (const rel of doc.relations) {
      lines.push(
        `- \`${rel.from}\` **${rel.type}** \`${rel.to}\`${
          rel.strength !== undefined ? ` (strength: ${rel.strength})` : ""
        }`
      );
    }
    lines.push("");
  }

  if ((doc.comments ?? []).length) {
    lines.push("## Comments");
    lines.push("");
    for (const c of doc.comments ?? []) {
      lines.push(
        `- **[${c.type}]** on \`${c.target.id}\` by ${c.author.role ?? c.author.type ?? "unknown"}: ${c.content}`
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}
