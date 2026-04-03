import type { BlockNode, DocumentModel, InlineNode, NormalizeOptions, ParagraphBlock } from "@/features/formatter/model/types";
import {
  charCountFromBlocks,
  cleanTextValue,
  collapseSpaces,
  createInlineFromTextWithBreak,
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
  start?: number;
  content: string;
};

const UNORDERED_LIST_MARKER_REGEX = /^[-*+•●○◦▪▫·・‧]\s+(.+)$/u;
const ORDERED_LIST_MARKER_REGEXES = [
  /^([0-9０-９]+)[.)）．、]\s*(.+)$/u,
  /^[\(（]([0-9０-９]+)[\)）]\s*(.+)$/u,
];

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

      if (options.listRepair) {
        const splitBlocks = splitParagraphByLooseListMarkers(normalizedInlines);
        if (splitBlocks) {
          result.push(...splitBlocks);
          continue;
        }
      }

      result.push({
        type: "paragraph",
        inlines: normalizedInlines,
      });
      continue;
    }

    if (block.type === "list") {
      const items = block.items
        .map((item) => {
          const normalizedItemBlocks = normalizeBlocks(item.blocks, options);
          return {
            blocks: options.listRepair ? repairLooseListBlocks(normalizedItemBlocks) : normalizedItemBlocks,
          };
        })
        .filter((item) => item.blocks.length > 0);

      if (items.length > 0) {
        result.push({
          type: "list",
          ordered: block.ordered,
          start: block.ordered ? normalizeListStart(block.start) : undefined,
          items,
        });
      }
      continue;
    }

    if (block.type === "blockquote") {
      const normalizedChildren = normalizeBlocks(block.blocks, options);
      const repairedChildren = options.listRepair ? repairLooseListBlocks(normalizedChildren) : normalizedChildren;
      if (repairedChildren.length > 0) {
        result.push({
          type: "blockquote",
          blocks: repairedChildren,
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
      continue;
    }

    if (block.type === "table") {
      const headers = block.headers.map((cell) => normalizeParagraphInlines(cell));
      const rows = block.rows
        .map((row) => row.map((cell) => normalizeParagraphInlines(cell)))
        .filter((row) => row.some((cell) => plainTextFromInlines(cell).trim().length > 0));

      const width = Math.max(headers.length, ...rows.map((row) => row.length));
      if (width < 2 || headers.length === 0) {
        continue;
      }

      const normalizedHeaders = normalizeRowWidth(headers, width);
      const normalizedRows = rows.map((row) => normalizeRowWidth(row, width));

      result.push({
        type: "table",
        headers: normalizedHeaders,
        rows: normalizedRows,
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

function splitParagraphByLooseListMarkers(inlines: ParagraphBlock["inlines"]): BlockNode[] | null {
  if (inlines.some((inline) => inline.type === "text" && (inline.marks?.bold || inline.marks?.italic))) {
    return null;
  }

  const text = plainTextFromInlines(inlines).replace(/\r\n/g, "\n");
  if (!text.includes("\n")) {
    return null;
  }

  const lines = text
    .split("\n")
    .map((line) => collapseSpaces(cleanTextValue(line)).trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return null;
  }

  const blocks: BlockNode[] = [];
  let paragraphLines: string[] = [];
  let hasLooseList = false;
  let index = 0;

  while (index < lines.length) {
    const marker = parseListMarkerLine(lines[index]);
    if (!marker) {
      paragraphLines.push(lines[index]);
      index += 1;
      continue;
    }

    hasLooseList = true;
    if (paragraphLines.length > 0) {
      blocks.push(createParagraphBlockFromLines(paragraphLines));
      paragraphLines = [];
    }

    const markerGroup: ListMarkerResult[] = [marker];
    const ordered = marker.ordered;
    index += 1;

    while (index < lines.length) {
      const next = parseListMarkerLine(lines[index]);
      if (!next || next.ordered !== ordered) {
        break;
      }
      markerGroup.push(next);
      index += 1;
    }

    blocks.push(createListBlockFromMarkers(markerGroup));
  }

  if (paragraphLines.length > 0) {
    blocks.push(createParagraphBlockFromLines(paragraphLines));
  }

  if (!hasLooseList) {
    return null;
  }

  return blocks;
}

function createParagraphBlockFromLines(lines: string[]): ParagraphBlock {
  return {
    type: "paragraph",
    inlines: createInlineFromTextWithBreak(lines.join("\n")),
  };
}

function createListBlockFromMarkers(markers: ListMarkerResult[]): BlockNode {
  const ordered = markers[0]?.ordered ?? false;
  return {
    type: "list",
    ordered,
    start: ordered ? normalizeListStart(markers[0]?.start) : undefined,
    items: markers.map((marker) => ({
      blocks: [
        {
          type: "paragraph",
          inlines: createInlineFromTextWithBreak(marker.content),
        } as ParagraphBlock,
      ],
    })),
  };
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

    const currentMarkers = parseListMarkers(current);
    if (!currentMarkers || currentMarkers.length === 0) {
      result.push(current);
      index += 1;
      continue;
    }

    const ordered = currentMarkers[0].ordered;
    const items: Array<{ blocks: BlockNode[] }> = [];
    let cursor = index;
    while (cursor < blocks.length) {
      const candidate = blocks[cursor];
      if (candidate.type !== "paragraph") {
        break;
      }
      const candidateMarkers = parseListMarkers(candidate);
      if (!candidateMarkers || candidateMarkers.length === 0 || candidateMarkers[0].ordered !== ordered) {
        break;
      }

      for (const marker of candidateMarkers) {
        items.push({
          blocks: [
            {
              type: "paragraph",
              inlines: [{ type: "text", value: marker.content }],
            } as ParagraphBlock,
          ],
        });
      }
      cursor += 1;
    }

    result.push({
      type: "list",
      ordered,
      start: ordered ? normalizeListStart(currentMarkers[0].start) : undefined,
      items,
    });
    index = cursor;
  }

  return result;
}

function parseListMarkers(block: ParagraphBlock): ListMarkerResult[] | null {
  const text = plainTextFromInlines(block.inlines).replace(/\r\n/g, "\n");
  if (!text.trim()) {
    return null;
  }

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) {
    return null;
  }

  const markers: ListMarkerResult[] = [];
  let orderedType: boolean | null = null;

  for (const line of lines) {
    const marker = parseListMarkerLine(line);
    if (!marker) {
      return null;
    }

    if (orderedType === null) {
      orderedType = marker.ordered;
    } else if (orderedType !== marker.ordered) {
      return null;
    }

    markers.push(marker);
  }

  return markers;
}

function parseListMarkerLine(line: string): ListMarkerResult | null {
  const text = collapseSpaces(cleanTextValue(line)).trim();
  if (!text) {
    return null;
  }

  const unorderedMatch = text.match(UNORDERED_LIST_MARKER_REGEX);
  if (unorderedMatch?.[1]) {
    return {
      ordered: false,
      content: unorderedMatch[1].trim(),
    };
  }

  for (const pattern of ORDERED_LIST_MARKER_REGEXES) {
    const orderedMatch = text.match(pattern);
    if (!orderedMatch?.[1] || !orderedMatch[2]) {
      continue;
    }

    const start = parsePositiveInteger(orderedMatch[1]);
    return {
      ordered: true,
      start,
      content: orderedMatch[2].trim(),
    };
  }

  return null;
}

function parsePositiveInteger(value: string): number {
  const normalized = value.replace(/[０-９]/g, (digit) => String.fromCharCode(digit.charCodeAt(0) - 0xfee0));
  const parsed = Number.parseInt(normalized, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return 1;
}

function normalizeListStart(start?: number): number {
  if (typeof start === "number" && Number.isFinite(start) && start > 0) {
    return Math.floor(start);
  }
  return 1;
}

function normalizeRowWidth(row: InlineNode[][], width: number): InlineNode[][] {
  const normalized = [...row];
  while (normalized.length < width) {
    normalized.push([]);
  }
  return normalized.slice(0, width);
}
