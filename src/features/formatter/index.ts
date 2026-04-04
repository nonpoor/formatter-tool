import type { DocumentModel, FormatOptions, ModeId } from "@/features/formatter/model/types";
import { defaultModeId, getModePolicy, modeOptions, normalizeDefaults } from "@/features/formatter/config/policies";
import { normalizeDocument } from "@/features/formatter/normalize";
import { parseInput } from "@/features/formatter/parser";

export function formatInput(raw: string, options: FormatOptions = {}): DocumentModel {
  const modeId = (options.modeId ?? defaultModeId) as ModeId;
  const modePolicy = getModePolicy(modeId);
  const parsed = parseInput(raw, modeId);
  return normalizeDocument(parsed, {
    ...normalizeDefaults,
    ...options,
    modeId,
    headingNumbering: options.headingNumbering ?? modePolicy.headingNumbering,
    itemExpressionPolicy: options.itemExpressionPolicy ?? modePolicy.itemExpressionPolicy,
  });
}

export { renderDocx } from "@/features/formatter/renderers/docx";
export { renderClipboardPayload } from "@/features/formatter/renderers/clipboard";
export { detectSourceType } from "@/features/formatter/parser";
export { modeOptions };
export type {
  BlockNode,
  DocumentModel,
  FormatOptions,
  InlineNode,
  ModeId,
  NormalizeOptions,
} from "@/features/formatter/model/types";
