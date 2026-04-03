import type { BlockNode, DocumentModel, InlineNode, ListItem, TableBlock } from "@/features/formatter/model/types";
import { plainTextFromInlines } from "@/features/formatter/utils";

export interface ClipboardPayload {
  html: string;
  text: string;
}

export function renderClipboard(doc: DocumentModel): ClipboardPayload {
  const html = doc.blocks.map((block) => renderBlockHtml(block)).join("");
  const text = renderPlainText(doc.blocks).trim();
  return { html, text };
}

function renderBlockHtml(block: BlockNode): string {
  if (block.type === "heading") {
    return `<h${block.level}>${renderInlineHtml(block.inlines)}</h${block.level}>`;
  }

  if (block.type === "paragraph") {
    return `<p>${renderInlineHtml(block.inlines)}</p>`;
  }

  if (block.type === "list") {
    const tag = block.ordered ? "ol" : "ul";
    const startAttr = block.ordered && (block.start ?? 1) > 1 ? ` start="${block.start}"` : "";

    const items = block.items
      .map((item) => renderListItemHtml(item).trim())
      .filter(Boolean)
      .map((itemHtml) => `<li>${itemHtml}</li>`)
      .join("");

    if (!items) {
      return "";
    }
    return `<${tag}${startAttr}>${items}</${tag}>`;
  }

  if (block.type === "blockquote") {
    const inner = block.blocks.map((child) => renderBlockHtml(child)).join("");
    return `<blockquote>${inner}</blockquote>`;
  }

  if (block.type === "table") {
    return renderTableHtml(block);
  }

  return `<pre>${escapeHtml(block.text)}</pre>`;
}

function renderListItemHtml(item: ListItem): string {
  const inlineParts: string[] = [];
  const nestedListParts: string[] = [];

  for (const block of item.blocks) {
    if (block.type === "paragraph" || block.type === "heading") {
      const value = renderInlineHtml(block.inlines).trim();
      if (value) {
        inlineParts.push(value);
      }
      continue;
    }

    if (block.type === "blockquote") {
      const quoteText = block.blocks
        .map((inner) => renderBlockPlainOneLine(inner))
        .filter(Boolean)
        .join(" ")
        .trim();
      if (quoteText) {
        inlineParts.push(`&gt; ${escapeHtml(quoteText)}`);
      }
      continue;
    }

    if (block.type === "preformatted") {
      const text = escapeHtml(block.text).trim();
      if (text) {
        inlineParts.push(text.replace(/\n/g, "<br>"));
      }
      continue;
    }

    if (block.type === "table") {
      const tableText = renderTablePlain(block).replace(/\n/g, "<br>").trim();
      if (tableText) {
        inlineParts.push(escapeHtml(tableText));
      }
      continue;
    }

    nestedListParts.push(renderBlockHtml(block));
  }

  const primary = inlineParts.join("<br>");
  return [primary, ...nestedListParts.filter(Boolean)].filter(Boolean).join("");
}

function renderInlineHtml(inlines: InlineNode[]): string {
  return inlines
    .map((inline) => {
      if (inline.type === "lineBreak") {
        return "<br>";
      }

      const escaped = escapeHtml(inline.value);
      if (inline.marks?.bold && inline.marks?.italic) {
        return `<strong><em>${escaped}</em></strong>`;
      }
      if (inline.marks?.bold) {
        return `<strong>${escaped}</strong>`;
      }
      if (inline.marks?.italic) {
        return `<em>${escaped}</em>`;
      }
      return escaped;
    })
    .join("");
}

function renderTableHtml(table: TableBlock): string {
  const headerHtml = table.headers.map((cell) => `<th>${renderInlineHtml(cell)}</th>`).join("");
  const bodyHtml = table.rows
    .map((row) => `<tr>${row.map((cell) => `<td>${renderInlineHtml(cell)}</td>`).join("")}</tr>`)
    .join("");

  return `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
}

function renderPlainText(blocks: BlockNode[], indent = ""): string {
  return blocks
    .map((block) => {
      if (block.type === "heading") {
        return `${indent}${plainTextFromInlines(block.inlines)}\n`;
      }
      if (block.type === "paragraph") {
        return `${indent}${plainTextFromInlines(block.inlines)}\n`;
      }
      if (block.type === "list") {
        const start = block.ordered ? block.start ?? 1 : 1;
        const lines = block.items
          .map((item, idx) => {
            const prefix = block.ordered ? `${start + idx}. ` : "- ";
            const [firstLine, ...restLines] = renderListItemPlain(item, `${indent}  `).split("\n");
            const mainLine = `${indent}${prefix}${firstLine ?? ""}`.trimEnd();
            const tail = restLines
              .filter((line) => line.trim().length > 0)
              .map((line) => `${indent}  ${line}`)
              .join("\n");
            return tail ? `${mainLine}\n${tail}` : mainLine;
          })
          .join("\n");
        return `${lines}\n`;
      }
      if (block.type === "blockquote") {
        return `${block.blocks
          .map((child) => renderPlainText([child], indent))
          .join("")
          .trim()
          .split("\n")
          .map((line) => `${indent}> ${line}`)
          .join("\n")}\n`;
      }
      if (block.type === "table") {
        return `${indent}${renderTablePlain(block).split("\n").join(`\n${indent}`)}\n`;
      }
      return `${indent}${block.text}\n`;
    })
    .join("\n");
}

function renderListItemPlain(item: ListItem, nestedIndent: string): string {
  const parts: string[] = [];

  for (const block of item.blocks) {
    if (block.type === "paragraph" || block.type === "heading") {
      parts.push(plainTextFromInlines(block.inlines));
      continue;
    }

    if (block.type === "preformatted") {
      parts.push(block.text);
      continue;
    }

    if (block.type === "blockquote") {
      const quote = block.blocks.map((inner) => renderBlockPlainOneLine(inner)).filter(Boolean).join(" ");
      if (quote) {
        parts.push(`> ${quote}`);
      }
      continue;
    }

    if (block.type === "table") {
      parts.push(renderTablePlain(block));
      continue;
    }

    const nested = renderPlainText([block], nestedIndent).trim();
    if (nested) {
      parts.push(nested);
    }
  }

  return parts.join("\n");
}

function renderBlockPlainOneLine(block: BlockNode): string {
  if (block.type === "paragraph" || block.type === "heading") {
    return plainTextFromInlines(block.inlines).replace(/\n/g, " ").trim();
  }
  if (block.type === "preformatted") {
    return block.text.replace(/\n/g, " ").trim();
  }
  if (block.type === "table") {
    return renderTablePlain(block).replace(/\n/g, " ").trim();
  }
  return renderPlainText([block]).replace(/\n/g, " ").trim();
}

function renderTablePlain(table: TableBlock): string {
  const header = table.headers.map((cell) => plainTextFromInlines(cell)).join("\t");
  const rows = table.rows.map((row) => row.map((cell) => plainTextFromInlines(cell)).join("\t"));
  return [header, ...rows].join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
