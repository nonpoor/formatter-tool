import type { BlockNode, InlineNode, TextMarks } from "@/features/formatter/model/types";

const ZERO_WIDTH_CHAR_REGEX = /[\u200B-\u200D\uFEFF]/g;

export function cleanTextValue(value: string): string {
  return value.replace(ZERO_WIDTH_CHAR_REGEX, "");
}

export function collapseSpaces(value: string): string {
  return value.replace(/[ \t]+/g, " ");
}

export function pushTextInline(target: InlineNode[], value: string, marks?: TextMarks): void {
  const cleaned = cleanTextValue(value);
  if (!cleaned) {
    return;
  }

  const prev = target[target.length - 1];
  if (prev?.type === "text" && isSameMarks(prev.marks, marks)) {
    prev.value += cleaned;
    return;
  }

  target.push({
    type: "text",
    value: cleaned,
    marks: marks && Object.keys(marks).length > 0 ? { ...marks } : undefined,
  });
}

function isSameMarks(a?: TextMarks, b?: TextMarks): boolean {
  return Boolean(a?.bold) === Boolean(b?.bold) && Boolean(a?.italic) === Boolean(b?.italic);
}

export function plainTextFromInlines(inlines: InlineNode[]): string {
  return inlines
    .map((inline) => {
      if (inline.type === "lineBreak") {
        return "\n";
      }
      return inline.value;
    })
    .join("");
}

export function createInlineFromTextWithBreak(text: string): InlineNode[] {
  const normalized = cleanTextValue(text).replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const inlines: InlineNode[] = [];

  lines.forEach((line, idx) => {
    pushTextInline(inlines, line);
    if (idx < lines.length - 1) {
      inlines.push({ type: "lineBreak" });
    }
  });

  return inlines;
}

export function charCountFromBlocks(blocks: BlockNode[]): number {
  let total = 0;
  for (const block of blocks) {
    if (block.type === "heading" || block.type === "paragraph") {
      total += plainTextFromInlines(block.inlines).length;
    } else if (block.type === "list") {
      for (const item of block.items) {
        total += charCountFromBlocks(item.blocks);
      }
    } else if (block.type === "blockquote") {
      total += charCountFromBlocks(block.blocks);
    } else if (block.type === "preformatted") {
      total += cleanTextValue(block.text).length;
    } else if (block.type === "table") {
      for (const header of block.headers) {
        total += plainTextFromInlines(header).length;
      }
      for (const row of block.rows) {
        for (const cell of row) {
          total += plainTextFromInlines(cell).length;
        }
      }
    }
  }
  return total;
}
