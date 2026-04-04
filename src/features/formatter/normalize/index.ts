import type {
  BlockNode,
  DocumentModel,
  HeadingNumberingPolicy,
  ItemExpressionPolicy,
  InlineNode,
  NormalizeOptions,
  ParagraphBlock,
} from "@/features/formatter/model/types";
import { defaultModeId, getModePolicy, normalizeDefaults } from "@/features/formatter/config/policies";
import { transformTextPreservingMath } from "@/features/formatter/math/preservation";
import {
  charCountFromBlocks,
  cleanTextValue,
  collapseSpaces,
  createInlineFromTextWithBreak,
  plainTextFromInlines,
  pushTextInline,
} from "@/features/formatter/utils";

type ResolvedNormalizeOptions = {
  cleanupHeadingMarkers: boolean;
  aggressiveBlankLineCleanup: boolean;
  listRepair: boolean;
  modeId: "general" | "academic";
  headingNumbering: HeadingNumberingPolicy;
  itemExpressionPolicy: ItemExpressionPolicy;
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
const CN_NUMERIC_TOKEN = "[一二三四五六七八九十百千零〇两]+";
const HEADING_PATTERNS: Array<{ level: 1 | 2 | 3; pattern: RegExp }> = [
  { level: 3, pattern: /^([0-9０-９]+(?:\.[0-9０-９]+){2})\s+(.+)$/u },
  { level: 2, pattern: /^([0-9０-９]+(?:\.[0-9０-９]+){1})\s+(.+)$/u },
  { level: 2, pattern: new RegExp(`^[（(](${CN_NUMERIC_TOKEN})[）)]\\s*(.+)$`, "u") },
  { level: 1, pattern: /^([0-9０-９]+)[、.．]\s*(.+)$/u },
  { level: 1, pattern: new RegExp(`^(${CN_NUMERIC_TOKEN})、\\s*(.+)$`, "u") },
];

const EXPLICIT_STEP_REGEX = /(步骤|流程|实验步骤|实验过程|方法步骤|操作步骤)/u;
const SEQUENCE_PREFIX_REGEX = /^(首先|第一步|第[一二三四五六七八九十]+步|其次|然后|接着|随后|最后|最终|接下来)/u;

export function normalizeDocument(doc: DocumentModel, options: NormalizeOptions = {}): DocumentModel {
  const modeId = options.modeId ?? doc.meta.modeId ?? defaultModeId;
  const modePolicy = getModePolicy(modeId);
  const mergedOptions: ResolvedNormalizeOptions = {
    ...normalizeDefaults,
    ...options,
    modeId,
    headingNumbering: options.headingNumbering ?? modePolicy.headingNumbering,
    itemExpressionPolicy: options.itemExpressionPolicy ?? modePolicy.itemExpressionPolicy,
  };

  const normalizedBlocks = normalizeBlocks(doc.blocks, mergedOptions);
  const repairedBlocks = mergedOptions.listRepair ? repairLooseListBlocks(normalizedBlocks) : normalizedBlocks;
  const structuredBlocks = transformStructuredBlocks(repairedBlocks, mergedOptions);

  return {
    ...doc,
    blocks: structuredBlocks,
    meta: {
      ...doc.meta,
      modeId,
      stats: {
        blockCount: structuredBlocks.length,
        charCount: charCountFromBlocks(structuredBlocks),
      },
    },
  };
}

function normalizeBlocks(blocks: BlockNode[], options: ResolvedNormalizeOptions): BlockNode[] {
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

      const headingMatch = options.cleanupHeadingMarkers ? paragraphText.match(/^(#{1,3})\s+(.+)$/) : null;

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
    .map((line) => normalizeCollapsedText(line).trim())
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

    const cleaned = normalizeCollapsedText(inline.value);
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

function transformStructuredBlocks(blocks: BlockNode[], options: ResolvedNormalizeOptions, insideList = false): BlockNode[] {
  const result: BlockNode[] = [];
  let previousHint: string | null = null;

  for (const block of blocks) {
    if (block.type === "paragraph") {
      const splitBlocks = splitParagraphByStructuredMarkers(block, options, previousHint);
      if (splitBlocks) {
        const transformedSplit = transformStructuredBlocks(splitBlocks, options, insideList);
        result.push(...transformedSplit);
        previousHint = lastHintFromBlocks(transformedSplit) ?? previousHint;
        continue;
      }

      const headingBlock = insideList ? null : tryConvertParagraphToHeading(block, options.headingNumbering);
      if (headingBlock) {
        result.push(headingBlock);
        previousHint = plainTextFromInlines(headingBlock.inlines);
        continue;
      }

      result.push(block);
      previousHint = plainTextFromInlines(block.inlines);
      continue;
    }

    if (block.type === "list") {
      const items = block.items
        .map((item) => ({
          blocks: transformStructuredBlocks(item.blocks, options, true),
        }))
        .filter((item) => item.blocks.length > 0);

      if (items.length === 0) {
        continue;
      }

      const nextList: BlockNode = {
        type: "list",
        ordered: block.ordered,
        start: block.ordered ? normalizeListStart(block.start) : undefined,
        items,
      };

      const shouldConvert =
        nextList.type === "list" &&
        !nextList.ordered &&
        shouldConvertUnorderedList(nextList, previousHint, options.itemExpressionPolicy);

      if (!shouldConvert && options.modeId === "academic" && !nextList.ordered) {
        const normalizedItemBlocks = normalizeAcademicListExpression(nextList);
        result.push(...normalizedItemBlocks);
        previousHint = lastHintFromBlocks(normalizedItemBlocks) ?? previousHint;
        continue;
      }

      const finalList = shouldConvert ? toOrderedList(nextList) : nextList;
      result.push(finalList);
      previousHint = listSummaryHint(finalList);
      continue;
    }

    if (block.type === "blockquote") {
      const transformed = transformStructuredBlocks(block.blocks, options, insideList);
      if (transformed.length > 0) {
        result.push({
          type: "blockquote",
          blocks: transformed,
        });
        previousHint = lastHintFromBlocks(transformed) ?? previousHint;
      }
      continue;
    }

    result.push(block);
    previousHint = null;
  }

  return result;
}

function splitParagraphByStructuredMarkers(
  block: ParagraphBlock,
  options: ResolvedNormalizeOptions,
  previousHint: string | null,
): BlockNode[] | null {
  const text = plainTextFromInlines(block.inlines).replace(/\r\n/g, "\n");
  if (!text.includes("\n")) {
    return null;
  }

  const lines = text
    .split("\n")
    .map((line) => normalizeCollapsedText(line).trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return null;
  }

  const splitBlocks: BlockNode[] = [];
  let paragraphLines: string[] = [];
  let cursor = 0;
  let hasListGroup = false;

  while (cursor < lines.length) {
    const marker = parseListMarkerLine(lines[cursor]);
    if (!marker) {
      paragraphLines.push(lines[cursor]);
      cursor += 1;
      continue;
    }

    hasListGroup = true;
    if (paragraphLines.length > 0) {
      splitBlocks.push(createParagraphBlockFromLines(paragraphLines));
    }

    const markerGroup: ListMarkerResult[] = [marker];
    const currentOrderedType = marker.ordered;
    cursor += 1;

    while (cursor < lines.length) {
      const next = parseListMarkerLine(lines[cursor]);
      if (!next || next.ordered !== currentOrderedType) {
        break;
      }
      markerGroup.push(next);
      cursor += 1;
    }

    let nextList = createListBlockFromMarkers(markerGroup);
    if (
      !nextList.ordered &&
      shouldConvertUnorderedList(
        nextList,
        paragraphLines[paragraphLines.length - 1] ?? previousHint,
        options.itemExpressionPolicy,
      )
    ) {
      nextList = toOrderedList(nextList);
    }

    if (!nextList.ordered && options.modeId === "academic") {
      splitBlocks.push(...normalizeAcademicListExpression(nextList));
    } else {
      splitBlocks.push(nextList);
    }
    paragraphLines = [];
  }

  if (paragraphLines.length > 0) {
    splitBlocks.push(createParagraphBlockFromLines(paragraphLines));
  }

  return hasListGroup ? splitBlocks : null;
}

function tryConvertParagraphToHeading(
  block: ParagraphBlock,
  headingNumbering: HeadingNumberingPolicy,
): Extract<BlockNode, { type: "heading" }> | null {
  const text = normalizeCollapsedText(plainTextFromInlines(block.inlines)).trim();
  if (!text || text.includes("\n")) {
    return null;
  }

  for (const { level, pattern } of HEADING_PATTERNS) {
    const match = text.match(pattern);
    if (!match?.[2]) {
      continue;
    }

    const title = match[2].trim();
    if (!isHeadingTitle(title)) {
      continue;
    }

    return {
      type: "heading",
      level,
      inlines: [{ type: "text", value: headingNumbering === "preserve" ? text : title }],
    };
  }

  return null;
}

function isHeadingTitle(value: string): boolean {
  if (value.length < 2 || value.length > 40) {
    return false;
  }

  if (/[。！？；]/u.test(value)) {
    return false;
  }

  return true;
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
    .map((line) => normalizeCollapsedText(line).trim())
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

function createListBlockFromMarkers(markers: ListMarkerResult[]): Extract<BlockNode, { type: "list" }> {
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

function repairLooseListBlocks(blocks: BlockNode[], minimumItems = 1): BlockNode[] {
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

    if (items.length < minimumItems) {
      result.push(current);
      index += 1;
      continue;
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
    if (looksLikeDecimalHeadingLine(line)) {
      return null;
    }

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

function looksLikeDecimalHeadingLine(line: string): boolean {
  return /^([0-9０-９]+(?:\.[0-9０-９]+){1,2})\s+\S/u.test(line);
}

function parseListMarkerLine(line: string): ListMarkerResult | null {
  const text = normalizeCollapsedText(line).trim();
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

function shouldConvertUnorderedList(
  block: Extract<BlockNode, { type: "list" }>,
  contextHint: string | null,
  policy: ItemExpressionPolicy,
): boolean {
  const itemTexts = block.items
    .map((item) => listItemPrimaryText(item.blocks))
    .filter((text): text is string => Boolean(text));

  const contextMatched = hasExplicitStepCue(contextHint);
  const explicitCueCount = itemTexts.filter((text) => hasExplicitStepCue(text)).length;
  const groupedExplicitCue = explicitCueCount >= Math.max(2, Math.ceil(itemTexts.length / 2));
  if (contextMatched || groupedExplicitCue) {
    return true;
  }

  if (policy === "explicit_step_only") {
    return false;
  }

  return hasSequenceCue(itemTexts);
}

function shouldNormalizeExplanatoryList(block: Extract<BlockNode, { type: "list" }>): boolean {
  if (block.ordered || block.items.length < 2) {
    return false;
  }

  const analyses = block.items.map((item) => analyzeNarrativeItem(item.blocks));
  if (analyses.some((item) => item === null)) {
    return false;
  }

  const records = analyses.filter((item): item is NarrativeItemAnalysis => item !== null);
  if (records.length < 2) {
    return false;
  }

  const explanatoryCount = records.filter((item) => item.explanatory).length;
  if (explanatoryCount < 2 || explanatoryCount < Math.ceil(records.length * 0.6)) {
    return false;
  }

  const withDelimiter = records.filter((item) => item.hasKeywordDelimiter).length;
  const withBoldPrefix = records.filter((item) => item.hasLeadingBoldKeyword).length;
  if (withDelimiter < 2 && withBoldPrefix < 2) {
    return false;
  }

  const checklistLikeCount = records.filter((item) => item.checklistLike).length;
  if (checklistLikeCount >= records.length - 1) {
    return false;
  }

  return true;
}

/**
 * 学术模式下的主动取舍：
 * - 非步骤型无序列表默认去符号外观，转为分项正文段落。
 * - 对嵌套脏输入，当前 MVP 可优先保证可读性与分段清晰，允许扁平化而不强求完整层级保真。
 */
function normalizeAcademicListExpression(block: Extract<BlockNode, { type: "list" }>): BlockNode[] {
  const explanatory = shouldNormalizeExplanatoryList(block);

  return block.items.flatMap((item) => {
    if (explanatory) {
      const narrative = toNarrativeParagraph(item.blocks);
      if (narrative) {
        return [narrative];
      }
    }

    return flattenItemBlocksToParagraphs(item.blocks);
  });
}

function hasExplicitStepCue(text: string | null | undefined): boolean {
  if (!text) {
    return false;
  }
  return EXPLICIT_STEP_REGEX.test(text);
}

function hasSequenceCue(itemTexts: string[]): boolean {
  if (itemTexts.length < 2) {
    return false;
  }

  const matched = itemTexts.filter((text) => SEQUENCE_PREFIX_REGEX.test(text)).length;
  return matched >= 2 && matched >= Math.ceil(itemTexts.length / 2);
}

function listItemPrimaryText(blocks: BlockNode[]): string | null {
  const firstParagraph = blocks.find((block) => block.type === "paragraph" || block.type === "heading");
  if (firstParagraph && (firstParagraph.type === "paragraph" || firstParagraph.type === "heading")) {
    return plainTextFromInlines(firstParagraph.inlines).trim();
  }

  return null;
}

type NarrativeItemAnalysis = {
  explanatory: boolean;
  checklistLike: boolean;
  hasKeywordDelimiter: boolean;
  hasLeadingBoldKeyword: boolean;
};

function analyzeNarrativeItem(blocks: BlockNode[]): NarrativeItemAnalysis | null {
  const sourceBlock = extractSingleNarrativeSource(blocks);
  if (!sourceBlock) {
    return null;
  }

  const text = plainTextFromInlines(sourceBlock.inlines).trim();
  if (!text) {
    return null;
  }

  const split = splitKeywordAndExplanation(text);
  const hasKeywordDelimiter = Boolean(split);
  const hasLeadingBoldKeyword = hasLeadingBoldSegment(sourceBlock.inlines);
  const explanationText = split?.explanation ?? text;
  const explanationLike = looksLikeExplanation(explanationText);
  const checklistLike = looksLikeChecklistText(text);

  const explanatory =
    (hasKeywordDelimiter && split !== null && looksLikeShortKeyword(split.keyword) && explanationLike) ||
    (hasLeadingBoldKeyword && /[：:]/u.test(text) && explanationLike);

  return {
    explanatory,
    checklistLike,
    hasKeywordDelimiter,
    hasLeadingBoldKeyword,
  };
}

function toNarrativeParagraph(blocks: BlockNode[]): ParagraphBlock | null {
  const sourceBlock = extractSingleNarrativeSource(blocks);
  if (!sourceBlock) {
    return null;
  }

  return {
    type: "paragraph",
    inlines: sourceBlock.inlines,
  };
}

function flattenItemBlocksToParagraphs(blocks: BlockNode[]): ParagraphBlock[] {
  const paragraphs: ParagraphBlock[] = [];

  for (const block of blocks) {
    if (block.type === "paragraph" || block.type === "heading") {
      const text = plainTextFromInlines(block.inlines).trim();
      if (!text) {
        continue;
      }
      paragraphs.push({
        type: "paragraph",
        inlines: block.inlines,
      });
      continue;
    }

    if (block.type === "preformatted") {
      const lines = block.text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      for (const line of lines) {
        paragraphs.push({
          type: "paragraph",
          inlines: createInlineFromTextWithBreak(line),
        });
      }
      continue;
    }

    if (block.type === "blockquote") {
      paragraphs.push(...flattenItemBlocksToParagraphs(block.blocks));
      continue;
    }

    if (block.type === "list") {
      for (const item of block.items) {
        paragraphs.push(...flattenItemBlocksToParagraphs(item.blocks));
      }
      continue;
    }

    if (block.type === "table") {
      const headerText = block.headers.map((cell) => plainTextFromInlines(cell).trim()).join(" ");
      if (headerText) {
        paragraphs.push({
          type: "paragraph",
          inlines: createInlineFromTextWithBreak(headerText),
        });
      }
      for (const row of block.rows) {
        const rowText = row.map((cell) => plainTextFromInlines(cell).trim()).join(" ");
        if (!rowText) {
          continue;
        }
        paragraphs.push({
          type: "paragraph",
          inlines: createInlineFromTextWithBreak(rowText),
        });
      }
    }
  }

  return paragraphs;
}

function extractSingleNarrativeSource(blocks: BlockNode[]): Extract<BlockNode, { type: "paragraph" | "heading" }> | null {
  if (blocks.length !== 1) {
    return null;
  }

  const first = blocks[0];
  if (first.type === "paragraph" || first.type === "heading") {
    return first;
  }
  return null;
}

function splitKeywordAndExplanation(text: string): { keyword: string; explanation: string } | null {
  const match = text.match(/^([^：:]{1,24})[：:]\s*(.+)$/u);
  if (!match?.[1] || !match[2]) {
    return null;
  }

  return {
    keyword: match[1].trim(),
    explanation: match[2].trim(),
  };
}

function looksLikeShortKeyword(text: string): boolean {
  if (text.length < 2 || text.length > 20) {
    return false;
  }
  return !/[。！？；]/u.test(text);
}

function looksLikeExplanation(text: string): boolean {
  if (text.length >= 14) {
    return true;
  }
  return /[，。；]/u.test(text);
}

function looksLikeChecklistText(text: string): boolean {
  if (text.length > 12) {
    return false;
  }
  return !/[：:，。；]/u.test(text);
}

function hasLeadingBoldSegment(inlines: InlineNode[]): boolean {
  for (const inline of inlines) {
    if (inline.type !== "text") {
      continue;
    }
    const cleaned = inline.value.trim();
    if (!cleaned) {
      continue;
    }
    return Boolean(inline.marks?.bold);
  }
  return false;
}

function toOrderedList(block: Extract<BlockNode, { type: "list" }>): Extract<BlockNode, { type: "list" }> {
  return {
    ...block,
    ordered: true,
    start: block.ordered ? normalizeListStart(block.start) : 1,
  };
}

function listSummaryHint(block: Extract<BlockNode, { type: "list" }>): string | null {
  const firstItem = block.items[0];
  if (!firstItem) {
    return null;
  }
  return listItemPrimaryText(firstItem.blocks);
}

function lastHintFromBlocks(blocks: BlockNode[]): string | null {
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const block = blocks[index];
    if (block.type === "paragraph" || block.type === "heading") {
      return plainTextFromInlines(block.inlines);
    }
    if (block.type === "list") {
      return listSummaryHint(block);
    }
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

function normalizeCollapsedText(value: string): string {
  return transformTextPreservingMath(cleanTextValue(value), (maskedText) => collapseSpaces(maskedText));
}
