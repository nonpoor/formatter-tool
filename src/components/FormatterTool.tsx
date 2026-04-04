"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ClipboardEvent } from "react";
import {
  detectSourceType,
  formatInput,
  modeOptions,
  renderDocx,
  type BlockNode,
  type DocumentModel,
  type InlineNode,
  type ModeId,
} from "@/features/formatter";
import { copyOptimizedToClipboard } from "@/features/formatter/clipboard";
import { defaultModeId, normalizeDefaults } from "@/features/formatter/config/policies";
import { resolvePastedInput } from "@/features/formatter/paste";
import styles from "./FormatterTool.module.css";

const initialInput = `# 标题示例

这是从 AI 网页复制来的内容，包含**加粗**和*斜体*。

- 第一条
- 第二条

> 这是引用
`;

type StatusTone = "neutral" | "success" | "error";
type CopyState = "idle" | "success" | "error";

export function FormatterTool() {
  const [input, setInput] = useState(initialInput);
  const [modeId, setModeId] = useState<ModeId>(defaultModeId);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ message: string; tone: StatusTone }>({
    message: "已就绪",
    tone: "neutral",
  });
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const copyResetTimerRef = useRef<number | null>(null);

  const detectedSourceType = useMemo(() => detectSourceType(input), [input]);
  const doc = useMemo(
    () =>
      formatInput(input, {
        ...normalizeDefaults,
        modeId,
      }),
    [input, modeId],
  );

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current);
      }
    };
  }, []);

  function updateStatus(message: string, tone: StatusTone = "neutral") {
    setStatus({ message, tone });
  }

  function setTemporaryCopyState(nextState: Exclude<CopyState, "idle">) {
    setCopyState(nextState);
    if (copyResetTimerRef.current !== null) {
      window.clearTimeout(copyResetTimerRef.current);
    }
    copyResetTimerRef.current = window.setTimeout(() => {
      setCopyState("idle");
      copyResetTimerRef.current = null;
    }, 1800);
  }

  async function handleExportDocx() {
    if (!doc.blocks.length) {
      updateStatus("没有可导出的内容。", "error");
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
      updateStatus("已导出 .docx", "success");
    } catch {
      updateStatus("导出失败，请重试。", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleCopyOptimized() {
    if (!doc.blocks.length) {
      setCopyState("error");
      updateStatus("没有可复制的内容。", "error");
      return;
    }

    setBusy(true);
    try {
      await copyOptimizedToClipboard(doc);
      setTemporaryCopyState("success");
      updateStatus("已复制优化版（含 HTML + 纯文本）。", "success");
    } catch {
      setTemporaryCopyState("error");
      updateStatus("复制失败，请检查浏览器权限后重试。", "error");
    } finally {
      setBusy(false);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const html = event.clipboardData.getData("text/html");
    const plain = event.clipboardData.getData("text/plain");

    if (!html && !plain) {
      return;
    }

    event.preventDefault();
    const resolved = resolvePastedInput({
      html,
      plain,
      modeId,
    });
    setInput(resolved.value);

    if (resolved.mode === "html") {
      updateStatus("已粘贴并保留富文本（白名单清洗后）。", "success");
    } else if (resolved.mode === "plain") {
      updateStatus("已粘贴纯文本内容。", "success");
    } else {
      updateStatus("粘贴内容为空。", "neutral");
    }
  }

  const copyButtonLabel =
    copyState === "success" ? "已复制" : copyState === "error" ? "复制失败" : busy ? "复制中..." : "复制优化版";

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.kicker}>Formatter MVP</p>
        <h1>文本整理与格式转换</h1>
        <p>把 AI 内容整理为更适合 WPS 标题样式映射与目录生成的结构。</p>
      </header>

      <section className={styles.panel}>
        <div className={styles.row}>
          <label className={styles.label} htmlFor="mode">
            模式
          </label>
          <select
            id="mode"
            className={styles.select}
            value={modeId}
            onChange={(event) => setModeId(event.target.value as ModeId)}
          >
            {modeOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
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
          {busy ? "处理中..." : "导出 .docx"}
        </button>
        <button
          type="button"
          className={`${styles.secondary} ${copyState === "success" ? styles.secondarySuccess : ""} ${
            copyState === "error" ? styles.secondaryError : ""
          }`}
          onClick={handleCopyOptimized}
          disabled={busy}
          aria-live="polite"
        >
          {copyButtonLabel}
        </button>
        <button
          type="button"
          className={styles.ghost}
          onClick={() => {
            setInput("");
            updateStatus("已清空输入。", "neutral");
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
          <li>复制到 WPS 时，优先选择保留源格式相关粘贴选项。</li>
          <li>建议在 WPS 中继续使用标题样式工具检查目录层级映射。</li>
        </ul>
      </section>

      <footer className={`${styles.status} ${styles[`status${status.tone}`]}`} aria-live="polite">
        {status.message}
      </footer>
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
      <ListTag className={styles.list} start={block.ordered ? block.start : undefined}>
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

  if (block.type === "table") {
    return (
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {block.headers.map((cell, idx) => (
                <th key={idx}>{renderInlineNodes(cell)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{renderInlineNodes(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
