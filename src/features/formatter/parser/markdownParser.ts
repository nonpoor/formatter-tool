import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { BlockNode, InlineNode, TextMarks } from "@/features/formatter/model/types";
import { maskMathSpans, restoreMathSpans } from "@/features/formatter/math/preservation";
import { parseHtmlInput } from "@/features/formatter/parser/htmlParser";
import { cleanTextValue, plainTextFromInlines, pushTextInline } from "@/features/formatter/utils";

type MdNode = {
  type: string;
  depth?: number;
  ordered?: boolean;
  start?: number | null;
  lang?: string | null;
  value?: string;
  align?: Array<"left" | "right" | "center" | null>;
  children?: MdNode[];
};

export function parseMarkdownInput(input: string): BlockNode[] {
  const masked = maskMathSpans(input);
  const tree = unified().use(remarkParse).use(remarkGfm).parse(masked.maskedText) as MdNode;
  const blocks = parseMarkdownBlocks(tree.children ?? []);
  return restoreMathInBlocks(blocks, masked.spans);
}

function parseMarkdownBlocks(nodes: MdNode[]): BlockNode[] {
  const blocks: BlockNode[] = [];

  for (const node of nodes) {
    if (node.type === "heading") {
      const level = clampHeadingLevel(node.depth ?? 1);
      const inlines = parseMarkdownInlines(node.children ?? []);
      if (inlines.length > 0) {
        blocks.push({ type: "heading", level, inlines });
      }
      continue;
    }

    if (node.type === "paragraph") {
      const inlines = parseMarkdownInlines(node.children ?? []);
      if (inlines.length > 0) {
        const paragraphText = plainTextFromInlines(inlines);
        if (looksLikePipeTableText(paragraphText)) {
          blocks.push({
            type: "preformatted",
            text: paragraphText,
          });
        } else {
          blocks.push({ type: "paragraph", inlines });
        }
      }
      continue;
    }

    if (node.type === "list") {
      const items = (node.children ?? [])
        .map((itemNode) => ({
          blocks: parseMarkdownBlocks(itemNode.children ?? []),
        }))
        .filter((item) => item.blocks.length > 0);

      if (items.length > 0) {
        blocks.push({
          type: "list",
          ordered: Boolean(node.ordered),
          start: Boolean(node.ordered) ? normalizeListStart(node.start) : undefined,
          items,
        });
      }
      continue;
    }

    if (node.type === "blockquote") {
      const inner = parseMarkdownBlocks(node.children ?? []);
      if (inner.length > 0) {
        blocks.push({ type: "blockquote", blocks: inner });
      }
      continue;
    }

    if (node.type === "code") {
      blocks.push({
        type: "preformatted",
        text: cleanTextValue(node.value ?? ""),
        language: node.lang ?? undefined,
      });
      continue;
    }

    if (node.type === "table") {
      const tableRows = node.children ?? [];
      if (tableRows.length === 0) {
        continue;
      }

      const headers = parseMarkdownTableRow(tableRows[0]);
      const rows = tableRows.slice(1).map((row) => parseMarkdownTableRow(row));

      if (headers.length > 0) {
        blocks.push({
          type: "table",
          headers,
          rows,
        });
      }
      continue;
    }

    if (node.type === "html") {
      const htmlBlocks = parseHtmlInput(node.value ?? "", []);
      blocks.push(...htmlBlocks);
    }
  }

  return blocks;
}

function parseMarkdownInlines(nodes: MdNode[], inheritedMarks: TextMarks = {}): InlineNode[] {
  const inlines: InlineNode[] = [];

  for (const node of nodes) {
    if (node.type === "text") {
      pushTextInline(inlines, node.value ?? "", inheritedMarks);
      continue;
    }

    if (node.type === "break") {
      inlines.push({ type: "lineBreak" });
      continue;
    }

    if (node.type === "inlineCode") {
      pushTextInline(inlines, node.value ?? "", inheritedMarks);
      continue;
    }

    if (node.type === "strong") {
      inlines.push(...parseMarkdownInlines(node.children ?? [], { ...inheritedMarks, bold: true }));
      continue;
    }

    if (node.type === "emphasis") {
      inlines.push(...parseMarkdownInlines(node.children ?? [], { ...inheritedMarks, italic: true }));
      continue;
    }

    if (node.children && node.children.length > 0) {
      inlines.push(...parseMarkdownInlines(node.children, inheritedMarks));
    }
  }

  return inlines;
}

function clampHeadingLevel(value: number): 1 | 2 | 3 {
  if (value <= 1) {
    return 1;
  }
  if (value === 2) {
    return 2;
  }
  return 3;
}

function parseMarkdownTableRow(node: MdNode): InlineNode[][] {
  if (node.type !== "tableRow") {
    return [];
  }

  return (node.children ?? []).map((cell) => parseMarkdownInlines(cell.children ?? []));
}

function normalizeListStart(start?: number | null): number {
  if (typeof start === "number" && Number.isFinite(start) && start > 0) {
    return Math.floor(start);
  }
  return 1;
}

function looksLikePipeTableText(text: string): boolean {
  const normalized = text.replace(/\r\n/g, "\n");
  return /\|/.test(normalized) && /\n/.test(normalized);
}

function restoreMathInBlocks(blocks: BlockNode[], spans: string[]): BlockNode[] {
  return blocks.map((block) => {
    if (block.type === "paragraph" || block.type === "heading") {
      return {
        ...block,
        inlines: restoreMathInInlines(block.inlines, spans),
      };
    }

    if (block.type === "list") {
      return {
        ...block,
        items: block.items.map((item) => ({
          blocks: restoreMathInBlocks(item.blocks, spans),
        })),
      };
    }

    if (block.type === "blockquote") {
      return {
        ...block,
        blocks: restoreMathInBlocks(block.blocks, spans),
      };
    }

    if (block.type === "table") {
      return {
        ...block,
        headers: block.headers.map((cell) => restoreMathInInlines(cell, spans)),
        rows: block.rows.map((row) => row.map((cell) => restoreMathInInlines(cell, spans))),
      };
    }

    if (block.type === "preformatted") {
      return {
        ...block,
        text: restoreMathSpans(block.text, spans),
      };
    }

    return block;
  });
}

function restoreMathInInlines(inlines: InlineNode[], spans: string[]): InlineNode[] {
  return inlines.map((inline) => {
    if (inline.type !== "text") {
      return inline;
    }
    return {
      ...inline,
      value: restoreMathSpans(inline.value, spans),
    };
  });
}
