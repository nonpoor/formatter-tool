import type { BlockNode, DocumentModel, InlineNode, NormalizeOptions, ParagraphBlock } from "@/features/formatter/model/types";
import {
  charCountFromBlocks,
  cleanTextValue,
  collapseSpaces,
  plainTextFromInlines,
  pushTextInline,
} from "@/features/formatter/utils";

const defaultOptions: Required<NormalizeOptions> = {
  cleanupHeadingMarkers: true,
  aggressiveBlankLineCleanup: true,
  listRepair: true,
};

type ListMarkerResult = {
  ordered: boolean;
  content: string;
};

export function normalizeDocument(doc: DocumentModel, options: NormalizeOptions = {}): DocumentModel {
  const mergedOptions = { ...defaultOptions, ...options };
  const normalizedBlocks = normalizeBlocks(doc.blocks, mergedOptions);
  const repairedBlocks = mergedOptions.listRepair ? repairLooseListBlocks(normalizedBlocks) : normalizedBlocks;

  return {
    ...doc,
    blocks: repairedBlocks,
    meta: {
      ...doc.meta,
      stats: {
        blockCount: repairedBlocks.length,
        charCount: charCountFromBlocks(repairedBlocks),
      },
    },
  };
}

function normalizeBlocks(blocks: BlockNode[], options: Required<NormalizeOptions>): BlockNode[] {
  const result: BlockNode[] = [];

  for (const block of blocks) {
    if (block.type === "heading") {
      const headingText = normalizeText(plainTextFromInlines(block.inlines));
      if (!headingText) {
        continue;
      }
      result.push({
        type: "heading",
        level: clampHeadingLevel(block.level),
        inlines: [{ type: "text", value: headingText }],
      });
      continue;
    }

    if (block.type === "paragraph") {
      const normalizedInlines = normalizeParagraphInlines(block.inlines);
      const paragraphText = normalizeText(plainTextFromInlines(normalizedInlines));
      if (!paragraphText) {
        continue;
      }

      const headingMatch = options.cleanupHeadingMarkers
        ? paragraphText.match(/^(#{1,3})\s+(.+)$/)
        : null;

      if (headingMatch) {
        result.push({
          type: "heading",
          level: clampHeadingLevel(headingMatch[1].length),
          inlines: [{ type: "text", value: headingMatch[2].trim() }],
        });
        continue;
      }

      result.push({
        type: "paragraph",
        inlines: normalizedInlines,
      });
      continue;
    }

    if (block.type === "list") {
      const items = block.items
        .map((item) => ({ blocks: normalizeBlocks(item.blocks, options) }))
        .filter((item) => item.blocks.length > 0);

      if (items.length > 0) {
        result.push({
          type: "list",
          ordered: block.ordered,
          items,
        });
      }
      continue;
    }

    if (block.type === "blockquote") {
      const normalizedChildren = normalizeBlocks(block.blocks, options);
      if (normalizedChildren.length > 0) {
        result.push({
          type: "blockquote",
          blocks: normalizedChildren,
        });
      }
      continue;
    }

    if (block.type === "preformatted") {
      const text = cleanTextValue(block.text.replace(/\r\n/g, "\n")).trimEnd();
      if (!text) {
        continue;
      }
      result.push({
        type: "preformatted",
        text,
        language: block.language,
      });
    }
  }

  if (!options.aggressiveBlankLineCleanup) {
    return result;
  }

  return result.filter((block) => {
    if (block.type === "paragraph") {
      return plainTextFromInlines(block.inlines).trim().length > 0;
    }
    return true;
  });
}

function normalizeText(input: string): string {
  const normalized = cleanTextValue(input)
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => collapseSpaces(line).trim())
    .join("\n");
  return normalized.trim();
}

function normalizeParagraphInlines(inlines: InlineNode[]): ParagraphBlock["inlines"] {
  const normalized: ParagraphBlock["inlines"] = [];

  for (const inline of inlines) {
    if (inline.type === "lineBreak") {
      const last = normalized[normalized.length - 1];
      if (last && last.type !== "lineBreak") {
        normalized.push({ type: "lineBreak" });
      }
      continue;
    }

    const cleaned = collapseSpaces(cleanTextValue(inline.value));
    if (!cleaned) {
      continue;
    }
    pushTextInline(normalized, cleaned, inline.marks);
  }

  while (normalized[0]?.type === "lineBreak") {
    normalized.shift();
  }
  while (normalized[normalized.length - 1]?.type === "lineBreak") {
    normalized.pop();
  }

  return normalized;
}

function clampHeadingLevel(level: number): 1 | 2 | 3 {
  if (level <= 1) {
    return 1;
  }
  if (level === 2) {
    return 2;
  }
  return 3;
}

function repairLooseListBlocks(blocks: BlockNode[]): BlockNode[] {
  const result: BlockNode[] = [];
  let index = 0;

  while (index < blocks.length) {
    const current = blocks[index];

    if (current.type !== "paragraph") {
      result.push(current);
      index += 1;
      continue;
    }

    const currentMarker = parseListMarker(current);
    if (!currentMarker) {
      result.push(current);
      index += 1;
      continue;
    }

    const items: Array<{ blocks: BlockNode[] }> = [];
    let cursor = index;
    while (cursor < blocks.length) {
      const candidate = blocks[cursor];
      if (candidate.type !== "paragraph") {
        break;
      }
      const marker = parseListMarker(candidate);
      if (!marker || marker.ordered !== currentMarker.ordered) {
        break;
      }
      items.push({
        blocks: [
          {
            type: "paragraph",
            inlines: [{ type: "text", value: marker.content }],
          } as ParagraphBlock,
        ],
      });
      cursor += 1;
    }

    result.push({
      type: "list",
      ordered: currentMarker.ordered,
      items,
    });
    index = cursor;
  }

  return result;
}

function parseListMarker(block: ParagraphBlock): ListMarkerResult | null {
  const text = plainTextFromInlines(block.inlines).trim();
  if (!text || text.includes("\n")) {
    return null;
  }

  const unorderedMatch = text.match(/^[-*•]\s+(.+)$/);
  if (unorderedMatch) {
    return {
      ordered: false,
      content: unorderedMatch[1].trim(),
    };
  }

  const orderedMatch = text.match(/^\d+[.)]\s+(.+)$/);
  if (orderedMatch) {
    return {
      ordered: true,
      content: orderedMatch[1].trim(),
    };
  }

  return null;
}
