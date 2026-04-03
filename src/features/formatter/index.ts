import type { DocumentModel, FormatOptions, TemplateId } from "@/features/formatter/model/types";
import { normalizeDocument } from "@/features/formatter/normalize";
import { parseInput } from "@/features/formatter/parser";
import { defaultTemplateId, getTemplateConfig } from "@/features/formatter/templates";

export function formatInput(raw: string, options: FormatOptions = {}): DocumentModel {
  const templateId = (options.templateId ?? defaultTemplateId) as TemplateId;
  const templateConfig = getTemplateConfig(templateId);
  const parsed = parseInput(raw, templateId);
  return normalizeDocument(parsed, {
    ...options,
    structureMode: options.structureMode ?? templateConfig.structureMode,
  });
}

export { renderDocx } from "@/features/formatter/renderers/docx";
export { renderClipboard } from "@/features/formatter/renderers/clipboard";
export { detectSourceType } from "@/features/formatter/parser";
export { templateOptions } from "@/features/formatter/templates";
export type {
  BlockNode,
  DocumentModel,
  FormatOptions,
  InlineNode,
  NormalizeOptions,
  TemplateId,
} from "@/features/formatter/model/types";
