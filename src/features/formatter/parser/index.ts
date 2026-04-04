import type { DocumentModel, ModeId } from "@/features/formatter/model/types";
import { analyzeMathSpans } from "@/features/formatter/math/preservation";
import { parseMarkdownInput } from "@/features/formatter/parser/markdownParser";
import { parseHtmlInput } from "@/features/formatter/parser/htmlParser";
import { parsePlainInput } from "@/features/formatter/parser/plainParser";
import { detectSourceType } from "@/features/formatter/parser/sourceType";
import { defaultModeId } from "@/features/formatter/config/policies";
import { charCountFromBlocks } from "@/features/formatter/utils";

export function parseInput(raw: string, modeId: ModeId = defaultModeId): DocumentModel {
  const sourceType = detectSourceType(raw);
  const mathInfo = analyzeMathSpans(raw);
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
      math: {
        detected: mathInfo.detected,
        spanCount: mathInfo.spanCount,
        protectionApplied: mathInfo.detected,
      },
      modeId,
    },
  };
}

export { detectSourceType } from "@/features/formatter/parser/sourceType";
