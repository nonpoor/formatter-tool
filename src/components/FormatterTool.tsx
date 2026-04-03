"use client";

import { useMemo, useState } from "react";
import type { ClipboardEvent } from "react";
import {
  detectSourceType,
  formatInput,
  renderDocx,
  templateOptions,
  type BlockNode,
  type DocumentModel,
  type FormatOptions,
  type InlineNode,
  type TemplateId,
} from "@/features/formatter";
import { copyOptimizedToClipboard } from "@/features/formatter/clipboard";
import styles from "./FormatterTool.module.css";

const initialInput = `# 标题示例

这是从 AI 网页复制来的内容，包含**加粗**和*斜体*。

- 第一条
- 第二条

> 这是引用
`;

const defaultOptions: Omit<FormatOptions, "templateId"> = {
  cleanupHeadingMarkers: true,
  aggressiveBlankLineCleanup: true,
  listRepair: true,
};

export function FormatterTool() {
  const [input, setInput] = useState(initialInput);
  const [templateId, setTemplateId] = useState<TemplateId>("default");
  const [options, setOptions] = useState(defaultOptions);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("已就绪");

  const detectedSourceType = useMemo(() => detectSourceType(input), [input]);
  const doc = useMemo(
    () =>
      formatInput(input, {
        ...options,
        templateId,
      }),
    [input, options, templateId],
  );

  async function handleExportDocx() {
    if (!doc.blocks.length) {
      setStatus("没有可导出的内容。");
      return;
    }

    setBusy(true);
    try {
      const blob = await renderDocx(doc);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "格式整理结果.docx";
      link.click();
      URL.revokeObjectURL(url);
      setStatus("已导出 .docx");
    } catch {
      setStatus("导出失败，请重试。");
    } finally {
      setBusy(false);
    }
  }

  async function handleCopyOptimized() {
    if (!doc.blocks.length) {
      setStatus("没有可复制的内容。");
      return;
    }

    setBusy(true);
    try {
      await copyOptimizedToClipboard(doc);
      setStatus("已复制优化版（含 HTML + 纯文本）。");
    } catch {
      setStatus("复制失败，请检查浏览器权限后重试。");
    } finally {
      setBusy(false);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const html = event.clipboardData.getData("text/html");
    const plain = event.clipboardData.getData("text/plain");

    if (!html) {
      return;
    }

    event.preventDefault();
    setInput(html || plain);
    setStatus("已接收富文本粘贴内容。");
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <h1>文本整理与格式转换工具</h1>
        <p>把 AI 网页复制内容整理成更适合 Word / WPS 的格式。</p>
      </header>

      <section className={styles.panel}>
        <div className={styles.row}>
          <label className={styles.label} htmlFor="template">
            模板
          </label>
          <select
            id="template"
            className={styles.select}
            value={templateId}
            onChange={(event) => setTemplateId(event.target.value as TemplateId)}
          >
            {templateOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.row}>
          <span className={styles.label}>规则开关</span>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={Boolean(options.cleanupHeadingMarkers)}
              onChange={(event) =>
                setOptions((prev) => ({
                  ...prev,
                  cleanupHeadingMarkers: event.target.checked,
                }))
              }
            />
            清理标题标记
          </label>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={Boolean(options.listRepair)}
              onChange={(event) =>
                setOptions((prev) => ({
                  ...prev,
                  listRepair: event.target.checked,
                }))
              }
            />
            列表修复
          </label>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={Boolean(options.aggressiveBlankLineCleanup)}
              onChange={(event) =>
                setOptions((prev) => ({
                  ...prev,
                  aggressiveBlankLineCleanup: event.target.checked,
                }))
              }
            />
            空行整理
          </label>
        </div>

        <label htmlFor="raw-input" className={styles.label}>
          输入内容（支持粘贴 Markdown / HTML / 混合文本）
        </label>
        <textarea
          id="raw-input"
          className={styles.textarea}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onPaste={handlePaste}
          placeholder="把 AI 输出内容粘贴到这里..."
        />

        <div className={styles.meta}>
          <span>识别类型：{detectedSourceType}</span>
          <span>
            块数：{doc.meta.stats.blockCount}，字符：{doc.meta.stats.charCount}
          </span>
        </div>
      </section>

      <section className={styles.actions}>
        <button type="button" className={styles.primary} onClick={handleExportDocx} disabled={busy}>
          导出 .docx
        </button>
        <button type="button" className={styles.secondary} onClick={handleCopyOptimized} disabled={busy}>
          复制优化版
        </button>
        <button
          type="button"
          className={styles.ghost}
          onClick={() => {
            setInput("");
            setStatus("已清空输入。");
          }}
          disabled={busy}
        >
          清空
        </button>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.previewTitle}>标准化预览</h2>
        <Preview doc={doc} />
      </section>

      <section className={styles.tip}>
        <h3>兼容建议</h3>
        <ul>
          <li>复制到 Word / WPS 时，优先选择保留源格式相关粘贴选项。</li>
          <li>如果目标环境限制富文本粘贴，可改用纯文本粘贴后再套用样式。</li>
        </ul>
      </section>

      <footer className={styles.status}>{status}</footer>
    </div>
  );
}

function Preview({ doc }: { doc: DocumentModel }) {
  if (doc.blocks.length === 0) {
    return <p className={styles.empty}>暂无内容</p>;
  }

  return (
    <div className={styles.preview}>
      {doc.blocks.map((block, index) => (
        <PreviewBlock key={`${block.type}-${index}`} block={block} />
      ))}
    </div>
  );
}

function PreviewBlock({ block }: { block: BlockNode }) {
  if (block.type === "heading") {
    if (block.level === 1) {
      return <h1 className={styles.h1}>{renderInlineNodes(block.inlines)}</h1>;
    }
    if (block.level === 2) {
      return <h2 className={styles.h2}>{renderInlineNodes(block.inlines)}</h2>;
    }
    return <h3 className={styles.h3}>{renderInlineNodes(block.inlines)}</h3>;
  }

  if (block.type === "paragraph") {
    return <p className={styles.paragraph}>{renderInlineNodes(block.inlines)}</p>;
  }

  if (block.type === "list") {
    const ListTag = block.ordered ? "ol" : "ul";
    return (
      <ListTag className={styles.list}>
        {block.items.map((item, idx) => (
          <li key={idx}>
            {item.blocks.map((inner, innerIdx) => (
              <PreviewBlock block={inner} key={innerIdx} />
            ))}
          </li>
        ))}
      </ListTag>
    );
  }

  if (block.type === "blockquote") {
    return (
      <blockquote className={styles.blockquote}>
        {block.blocks.map((inner, idx) => (
          <PreviewBlock key={idx} block={inner} />
        ))}
      </blockquote>
    );
  }

  return <pre className={styles.pre}>{block.text}</pre>;
}

function renderInlineNodes(inlines: InlineNode[]) {
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
