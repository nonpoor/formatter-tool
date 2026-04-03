import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { BlockNode, InlineNode, TextMarks } from "@/features/formatter/model/types";
import { parseHtmlInput } from "@/features/formatter/parser/htmlParser";
import { cleanTextValue, pushTextInline } from "@/features/formatter/utils";

type MdNode = {
  type: string;
  depth?: number;
  ordered?: boolean;
  lang?: string | null;
  value?: string;
  children?: MdNode[];
};

export function parseMarkdownInput(input: string): BlockNode[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(input) as MdNode;
  return parseMarkdownBlocks(tree.children ?? []);
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
        blocks.push({ type: "paragraph", inlines });
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
