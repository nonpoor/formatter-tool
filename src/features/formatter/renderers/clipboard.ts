import type { BlockNode, DocumentModel, InlineNode } from "@/features/formatter/model/types";
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
    const items = block.items
      .map((item) => {
        if (item.blocks.length === 1 && item.blocks[0].type === "paragraph") {
          return `<li>${renderInlineHtml(item.blocks[0].inlines)}</li>`;
        }
        const content = item.blocks.map((child) => renderBlockHtml(child)).join("");
        return `<li>${content}</li>`;
      })
      .join("");
    return `<${tag}>${items}</${tag}>`;
  }

  if (block.type === "blockquote") {
    const inner = block.blocks.map((child) => renderBlockHtml(child)).join("");
    return `<blockquote>${inner}</blockquote>`;
  }

  return `<pre>${escapeHtml(block.text)}</pre>`;
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

function renderPlainText(blocks: BlockNode[]): string {
  return blocks
    .map((block) => {
      if (block.type === "heading") {
        return `${plainTextFromInlines(block.inlines)}\n`;
      }
      if (block.type === "paragraph") {
        return `${plainTextFromInlines(block.inlines)}\n`;
      }
      if (block.type === "list") {
        return `${block.items
          .map((item, idx) => {
            const prefix = block.ordered ? `${idx + 1}. ` : "- ";
            const content = item.blocks
              .map((child) => {
                if (child.type === "heading" || child.type === "paragraph") {
                  return plainTextFromInlines(child.inlines);
                }
                if (child.type === "preformatted") {
                  return child.text;
                }
                return renderPlainText([child]).trim();
              })
              .join(" ");
            return `${prefix}${content}`.trim();
          })
          .join("\n")}\n`;
      }
      if (block.type === "blockquote") {
        return `${block.blocks
          .map((child) => {
            if (child.type === "heading" || child.type === "paragraph") {
              return plainTextFromInlines(child.inlines)
                .split("\n")
                .map((line) => `> ${line}`)
                .join("\n");
            }
            if (child.type === "preformatted") {
              return child.text
                .split("\n")
                .map((line) => `> ${line}`)
                .join("\n");
            }
            return renderPlainText([child]).trim();
          })
          .join("\n")}\n`;
      }
      return `${block.text}\n`;
    })
    .join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

