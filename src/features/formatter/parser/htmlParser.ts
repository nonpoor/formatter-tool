import { parseFragment } from "parse5";
import type { BlockNode, InlineNode, TextMarks } from "@/features/formatter/model/types";
import { createInlineFromTextWithBreak, pushTextInline } from "@/features/formatter/utils";
import { parsePlainInput } from "@/features/formatter/parser/plainParser";

type HtmlNode = {
  nodeName: string;
  tagName?: string;
  value?: string;
  attrs?: Array<{ name: string; value: string }>;
  childNodes?: HtmlNode[];
};

const INLINE_ALLOWED = new Set(["strong", "em", "br"]);
const BLOCK_ALLOWED = new Set(["p", "ul", "ol", "li", "h1", "h2", "h3", "blockquote", "pre"]);

export function parseHtmlInput(input: string, warnings: string[]): BlockNode[] {
  const fragment = parseFragment(input) as HtmlNode;
  return parseHtmlBlocks(fragment.childNodes ?? [], warnings);
}

function parseHtmlBlocks(nodes: HtmlNode[], warnings: string[]): BlockNode[] {
  const blocks: BlockNode[] = [];

  for (const node of nodes) {
    if (node.nodeName === "#text") {
      const parsed = parsePlainInput(node.value ?? "");
      blocks.push(...parsed);
      continue;
    }

    const tag = (node.tagName ?? "").toLowerCase();
    if (!tag) {
      continue;
    }

    if (!BLOCK_ALLOWED.has(tag) && !INLINE_ALLOWED.has(tag)) {
      warnings.push(`已忽略不支持的 HTML 标签: <${tag}>`);
      blocks.push(...parseHtmlBlocks(node.childNodes ?? [], warnings));
      continue;
    }

    if (tag === "p") {
      const inlines = parseHtmlInlines(node.childNodes ?? [], warnings);
      if (inlines.length > 0) {
        blocks.push({ type: "paragraph", inlines });
      }
      continue;
    }

    if (tag === "h1" || tag === "h2" || tag === "h3") {
      const level = tag === "h1" ? 1 : tag === "h2" ? 2 : 3;
      const inlines = parseHtmlInlines(node.childNodes ?? [], warnings);
      if (inlines.length > 0) {
        blocks.push({ type: "heading", level, inlines });
      }
      continue;
    }

    if (tag === "ul" || tag === "ol") {
      const items = (node.childNodes ?? [])
        .filter((child) => child.tagName?.toLowerCase() === "li")
        .map((liNode) => {
          const itemBlocks = parseListItemBlocks(liNode, warnings);
          return { blocks: itemBlocks };
        })
        .filter((item) => item.blocks.length > 0);

      if (items.length > 0) {
        blocks.push({
          type: "list",
          ordered: tag === "ol",
          start: tag === "ol" ? getOlStart(node) : undefined,
          items,
        });
      }
      continue;
    }

    if (tag === "blockquote") {
      const inner = parseHtmlBlocks(node.childNodes ?? [], warnings);
      if (inner.length > 0) {
        blocks.push({ type: "blockquote", blocks: inner });
      }
      continue;
    }

    if (tag === "pre") {
      const text = extractText(node);
      if (text.trim()) {
        blocks.push({ type: "preformatted", text });
      }
      continue;
    }

    if (tag === "li") {
      const itemBlocks = parseListItemBlocks(node, warnings);
      if (itemBlocks.length > 0) {
        blocks.push(...itemBlocks);
      }
      continue;
    }

    if (tag === "strong" || tag === "em" || tag === "br") {
      const inlines = parseHtmlInlines([node], warnings);
      if (inlines.length > 0) {
        blocks.push({
          type: "paragraph",
          inlines,
        });
      }
    }
  }

  return blocks;
}

function parseListItemBlocks(node: HtmlNode, warnings: string[]): BlockNode[] {
  const childBlocks = parseHtmlBlocks(node.childNodes ?? [], warnings);
  if (childBlocks.length > 0) {
    return childBlocks;
  }

  const inlines = parseHtmlInlines(node.childNodes ?? [], warnings);
  if (inlines.length === 0) {
    return [];
  }
  return [{ type: "paragraph", inlines }];
}

function parseHtmlInlines(nodes: HtmlNode[], warnings: string[], inheritedMarks: TextMarks = {}): InlineNode[] {
  const inlines: InlineNode[] = [];

  for (const node of nodes) {
    if (node.nodeName === "#text") {
      pushTextInline(inlines, node.value ?? "", inheritedMarks);
      continue;
    }

    const tag = (node.tagName ?? "").toLowerCase();
    if (!tag) {
      continue;
    }

    if (tag === "br") {
      inlines.push({ type: "lineBreak" });
      continue;
    }

    if (tag === "strong") {
      inlines.push(...parseHtmlInlines(node.childNodes ?? [], warnings, { ...inheritedMarks, bold: true }));
      continue;
    }

    if (tag === "em") {
      inlines.push(...parseHtmlInlines(node.childNodes ?? [], warnings, { ...inheritedMarks, italic: true }));
      continue;
    }

    if (BLOCK_ALLOWED.has(tag)) {
      if (tag === "p") {
        inlines.push(...parseHtmlInlines(node.childNodes ?? [], warnings, inheritedMarks));
      } else if (tag === "pre") {
        const pre = createInlineFromTextWithBreak(extractText(node));
        inlines.push(...pre);
      }
      continue;
    }

    warnings.push(`已忽略不支持的 HTML 内联标签: <${tag}>`);
  }

  return inlines;
}

function extractText(node: HtmlNode): string {
  if (node.nodeName === "#text") {
    return node.value ?? "";
  }

  const children = node.childNodes ?? [];
  let result = "";
  for (const child of children) {
    if (child.tagName?.toLowerCase() === "br") {
      result += "\n";
      continue;
    }
    result += extractText(child);
  }
  return result;
}

function getOlStart(node: HtmlNode): number | undefined {
  const startAttr = node.attrs?.find((attr) => attr.name.toLowerCase() === "start")?.value;
  if (!startAttr) {
    return 1;
  }
  const parsed = Number.parseInt(startAttr, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }
  return parsed;
}
