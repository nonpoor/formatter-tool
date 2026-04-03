import type { DocumentModel, TemplateId } from "@/features/formatter/model/types";
import { parseMarkdownInput } from "@/features/formatter/parser/markdownParser";
import { parseHtmlInput } from "@/features/formatter/parser/htmlParser";
import { parsePlainInput } from "@/features/formatter/parser/plainParser";
import { detectSourceType } from "@/features/formatter/parser/sourceType";
import { defaultTemplateId } from "@/features/formatter/templates";
import { charCountFromBlocks } from "@/features/formatter/utils";

export function parseInput(raw: string, templateId: TemplateId = defaultTemplateId): DocumentModel {
  const sourceType = detectSourceType(raw);
  const warnings: string[] = [];

  let blocks;
  if (sourceType === "markdown" || sourceType === "mixed") {
    blocks = parseMarkdownInput(raw);
  } else if (sourceType === "html") {
    blocks = parseHtmlInput(raw, warnings);
  } else {
    blocks = parsePlainInput(raw);
  }

  return {
    blocks,
    meta: {
      sourceType,
      warnings,
      stats: {
        blockCount: blocks.length,
        charCount: charCountFromBlocks(blocks),
      },
      templateId,
    },
  };
}

export { detectSourceType } from "@/features/formatter/parser/sourceType";
