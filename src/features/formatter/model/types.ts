export type SourceType = "markdown" | "html" | "plain" | "mixed";
export type ModeId = "general" | "academic";
export type HeadingNumberingPolicy = "strip" | "preserve";
export type ItemExpressionPolicy = "step_or_sequence" | "explicit_step_only";

export interface TextMarks {
  bold?: boolean;
  italic?: boolean;
}

export type InlineNode =
  | {
      type: "text";
      value: string;
      marks?: TextMarks;
    }
  | {
      type: "lineBreak";
    };

export interface HeadingBlock {
  type: "heading";
  level: 1 | 2 | 3;
  inlines: InlineNode[];
}

export interface ParagraphBlock {
  type: "paragraph";
  inlines: InlineNode[];
}

export interface ListItem {
  blocks: BlockNode[];
}

export interface ListBlock {
  type: "list";
  ordered: boolean;
  start?: number;
  items: ListItem[];
}

export interface BlockquoteBlock {
  type: "blockquote";
  blocks: BlockNode[];
}

export interface PreformattedBlock {
  type: "preformatted";
  text: string;
  language?: string;
}

export interface TableBlock {
  type: "table";
  headers: InlineNode[][];
  rows: InlineNode[][][];
}

export type BlockNode = HeadingBlock | ParagraphBlock | ListBlock | BlockquoteBlock | PreformattedBlock | TableBlock;

export interface DocumentMeta {
  sourceType: SourceType;
  warnings: string[];
  stats: {
    blockCount: number;
    charCount: number;
  };
  math: {
    detected: boolean;
    spanCount: number;
    protectionApplied: boolean;
  };
  modeId: ModeId;
}

export interface DocumentModel {
  blocks: BlockNode[];
  meta: DocumentMeta;
}

export interface NormalizeOptions {
  cleanupHeadingMarkers?: boolean;
  aggressiveBlankLineCleanup?: boolean;
  listRepair?: boolean;
  modeId?: ModeId;
  headingNumbering?: HeadingNumberingPolicy;
  itemExpressionPolicy?: ItemExpressionPolicy;
}

export interface FormatOptions extends NormalizeOptions {
  modeId?: ModeId;
}
