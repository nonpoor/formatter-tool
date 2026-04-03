export type SourceType = "markdown" | "html" | "plain" | "mixed";

export type TemplateId = "default" | "experiment-report" | "course-paper" | "general-homework";

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

export type BlockNode = HeadingBlock | ParagraphBlock | ListBlock | BlockquoteBlock | PreformattedBlock;

export interface DocumentMeta {
  sourceType: SourceType;
  warnings: string[];
  stats: {
    blockCount: number;
    charCount: number;
  };
  templateId: TemplateId;
}

export interface DocumentModel {
  blocks: BlockNode[];
  meta: DocumentMeta;
}

export interface NormalizeOptions {
  cleanupHeadingMarkers?: boolean;
  aggressiveBlankLineCleanup?: boolean;
  listRepair?: boolean;
}

export interface FormatOptions extends NormalizeOptions {
  templateId?: TemplateId;
}
