import type {
  HeadingNumberingPolicy,
  ItemExpressionPolicy,
  ModeId,
  NormalizeOptions,
} from "@/features/formatter/model/types";

export interface ModePolicy {
  headingNumbering: HeadingNumberingPolicy;
  itemExpressionPolicy: ItemExpressionPolicy;
}

export interface ModeOption {
  id: ModeId;
  label: string;
}

export const modeOptions: ModeOption[] = [
  { id: "general", label: "通用" },
  { id: "academic", label: "学术" },
];

export const defaultModeId: ModeId = "general";

export const normalizeDefaults: Required<Pick<NormalizeOptions, "cleanupHeadingMarkers" | "aggressiveBlankLineCleanup" | "listRepair">> =
  {
    cleanupHeadingMarkers: true,
    aggressiveBlankLineCleanup: true,
    listRepair: true,
  };

export const pasteDefaults = {
  preserveRichText: false,
  htmlProjectionMinScoreAdvantage: 2,
} as const;

export const docxDefaults = {
  paragraphSpacingAfter: 200,
  headingSpacingAfter: 240,
  fontSize: 24,
} as const;

/**
 * MVP 阶段模式差异仅允许这两项：
 * 1) 标题编号是否保留
 * 2) 分项表达规范化策略
 */
export const modePolicies: Record<ModeId, ModePolicy> = {
  general: {
    headingNumbering: "strip",
    itemExpressionPolicy: "step_or_sequence",
  },
  academic: {
    headingNumbering: "preserve",
    itemExpressionPolicy: "explicit_step_only",
  },
};

export function getModePolicy(modeId?: ModeId): ModePolicy {
  if (!modeId) {
    return modePolicies[defaultModeId];
  }
  return modePolicies[modeId] ?? modePolicies[defaultModeId];
}
