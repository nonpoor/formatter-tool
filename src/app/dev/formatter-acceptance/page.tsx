"use client";

import { useMemo, useState } from "react";
import {
  formatInput,
  modeOptions,
  renderDocx,
  renderClipboardPayload,
  type BlockNode,
  type DocumentModel,
  type InlineNode,
  type ModeId,
} from "@/features/formatter";
import {
  defaultMathAcceptanceSampleId,
  mathAcceptanceSamples,
} from "@/features/formatter/dev-samples/math-acceptance-samples";

export default function FormatterAcceptancePage() {
  const [modeId, setModeId] = useState<ModeId>("general");
  const [sampleId, setSampleId] = useState(defaultMathAcceptanceSampleId);
  const [input, setInput] = useState(getSampleById(defaultMathAcceptanceSampleId)?.input ?? "");
  const [busy, setBusy] = useState(false);

  const sample = useMemo(() => getSampleById(sampleId), [sampleId]);
  const doc = useMemo(() => formatInput(input, { modeId }), [input, modeId]);
  const clipboardPayload = useMemo(() => renderClipboardPayload(doc), [doc]);
  const docSummary = useMemo(() => summarizeDocument(doc), [doc]);

  function handleSampleChange(nextSampleId: string) {
    const next = getSampleById(nextSampleId);
    if (!next) {
      return;
    }
    setSampleId(nextSampleId);
    setInput(next.input);
  }

  async function handleExportDocx() {
    setBusy(true);
    try {
      const blob = await renderDocx(doc);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `acceptance-${sampleId}-${modeId}.docx`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: "Menlo, Monaco, Consolas, monospace" }}>
      <h1 style={{ marginTop: 0 }}>Formatter 半自动验收页（开发用）</h1>
      <p style={{ color: "#444", lineHeight: 1.5 }}>
        目标：快速验证数学公式文本保真，以及 general / academic 在列表学术化上的差异是否稳定。
      </p>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <label style={{ display: "grid", gap: 6 }}>
          样本
          <select value={sampleId} onChange={(e) => handleSampleChange(e.target.value)}>
            {mathAcceptanceSamples.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          模式
          <select value={modeId} onChange={(e) => setModeId(e.target.value as ModeId)}>
            {modeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      {sample ? (
        <section style={{ marginBottom: 16 }}>
          <p style={{ margin: "6px 0" }}>
            <strong>风险点：</strong>
            {sample.risk}
          </p>
          <p style={{ margin: "6px 0" }}>
            <strong>预期（{modeId}）：</strong>
            {sample.expect[modeId].structure}；{sample.expect[modeId].notes}
          </p>
        </section>
      ) : null}

      <section style={{ marginBottom: 16 }}>
        <label style={{ display: "grid", gap: 6 }}>
          输入
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{ minHeight: 180, width: "100%", padding: 10, resize: "vertical" }}
          />
        </label>
      </section>

      <section style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <span>sourceType: {doc.meta.sourceType}</span>
        <span>blocks: {doc.meta.stats.blockCount}</span>
        <span>chars: {doc.meta.stats.charCount}</span>
        <span>math detected: {String(doc.meta.math.detected)}</span>
        <span>math spans: {doc.meta.math.spanCount}</span>
        <span>protection applied: {String(doc.meta.math.protectionApplied)}</span>
        <button type="button" onClick={handleExportDocx} disabled={busy}>
          {busy ? "导出中..." : "导出 docx"}
        </button>
      </section>

      <section style={{ marginBottom: 16 }}>
        <h2>规范化预览</h2>
        <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 6 }}>
          <DocPreview doc={doc} />
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <label style={{ display: "grid", gap: 6 }}>
          Clipboard HTML
          <textarea readOnly value={clipboardPayload.html} style={{ minHeight: 180, width: "100%", padding: 10 }} />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Clipboard Text
          <textarea readOnly value={clipboardPayload.text} style={{ minHeight: 180, width: "100%", padding: 10 }} />
        </label>
      </section>

      <section>
        <h2>Document 结构摘要</h2>
        <pre style={{ background: "#f7f7f7", padding: 12, borderRadius: 6, overflowX: "auto" }}>
          {JSON.stringify(docSummary, null, 2)}
        </pre>
      </section>
    </main>
  );
}

function getSampleById(sampleId: string) {
  return mathAcceptanceSamples.find((item) => item.id === sampleId);
}

function summarizeDocument(doc: DocumentModel) {
  return doc.blocks.map((block, index) => ({
    index,
    type: block.type,
    preview: previewBlockText(block),
  }));
}

function previewBlockText(block: BlockNode): string {
  if (block.type === "paragraph" || block.type === "heading") {
    return inlineText(block.inlines);
  }
  if (block.type === "list") {
    return `ordered=${block.ordered}; items=${block.items.length}`;
  }
  if (block.type === "blockquote") {
    return `children=${block.blocks.length}`;
  }
  if (block.type === "table") {
    return `headers=${block.headers.length}; rows=${block.rows.length}`;
  }
  return block.text.split("\n")[0] ?? "";
}

function inlineText(inlines: InlineNode[]): string {
  return inlines
    .map((inline) => (inline.type === "lineBreak" ? "\\n" : inline.value))
    .join("")
    .slice(0, 120);
}

function DocPreview({ doc }: { doc: DocumentModel }) {
  if (doc.blocks.length === 0) {
    return <p>暂无内容</p>;
  }

  return (
    <div style={{ lineHeight: 1.6 }}>
      {doc.blocks.map((block, idx) => (
        <PreviewBlock key={`${block.type}-${idx}`} block={block} />
      ))}
    </div>
  );
}

function PreviewBlock({ block }: { block: BlockNode }) {
  if (block.type === "heading") {
    const text = renderInline(block.inlines);
    if (block.level === 1) {
      return <h1>{text}</h1>;
    }
    if (block.level === 2) {
      return <h2>{text}</h2>;
    }
    return <h3>{text}</h3>;
  }

  if (block.type === "paragraph") {
    return <p>{renderInline(block.inlines)}</p>;
  }

  if (block.type === "list") {
    const Tag = block.ordered ? "ol" : "ul";
    return (
      <Tag start={block.ordered ? block.start : undefined}>
        {block.items.map((item, idx) => (
          <li key={idx}>
            {item.blocks.map((child, childIdx) => (
              <PreviewBlock key={childIdx} block={child} />
            ))}
          </li>
        ))}
      </Tag>
    );
  }

  if (block.type === "blockquote") {
    return (
      <blockquote style={{ borderLeft: "3px solid #bbb", margin: 0, paddingLeft: 12 }}>
        {block.blocks.map((child, idx) => (
          <PreviewBlock key={idx} block={child} />
        ))}
      </blockquote>
    );
  }

  if (block.type === "table") {
    return (
      <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 12 }}>
        <thead>
          <tr>
            {block.headers.map((cell, idx) => (
              <th key={idx} style={{ border: "1px solid #ccc", padding: 4, textAlign: "left" }}>
                {renderInline(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIdx) => (
            <tr key={rowIdx}>
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} style={{ border: "1px solid #ccc", padding: 4 }}>
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return <pre>{block.text}</pre>;
}

function renderInline(inlines: InlineNode[]) {
  return inlines.map((inline, idx) => {
    if (inline.type === "lineBreak") {
      return <br key={idx} />;
    }

    let node = <>{inline.value}</>;
    if (inline.marks?.italic) {
      node = <em>{node}</em>;
    }
    if (inline.marks?.bold) {
      node = <strong>{node}</strong>;
    }
    return <span key={idx}>{node}</span>;
  });
}
