import type { StructureMode, TemplateId } from "@/features/formatter/model/types";

export interface TemplateConfig {
  id: TemplateId;
  label: string;
  paragraphSpacingAfter: number;
  headingSpacingAfter: number;
  fontSize: number;
  structureMode: StructureMode;
}

export const templateConfigs: Record<TemplateId, TemplateConfig> = {
  default: {
    id: "default",
    label: "默认",
    paragraphSpacingAfter: 180,
    headingSpacingAfter: 220,
    fontSize: 24,
    structureMode: "legacy",
  },
  "experiment-report": {
    id: "experiment-report",
    label: "实验报告",
    paragraphSpacingAfter: 220,
    headingSpacingAfter: 260,
    fontSize: 24,
    structureMode: "academic",
  },
  "course-paper": {
    id: "course-paper",
    label: "课程论文",
    paragraphSpacingAfter: 200,
    headingSpacingAfter: 240,
    fontSize: 24,
    structureMode: "academic",
  },
  "general-homework": {
    id: "general-homework",
    label: "通用作业",
    paragraphSpacingAfter: 160,
    headingSpacingAfter: 200,
    fontSize: 24,
    structureMode: "academic",
  },
};

export const templateOptions = Object.values(templateConfigs).map((item) => ({
  id: item.id,
  label: item.label,
}));

export const defaultTemplateId: TemplateId = "default";

export function getTemplateConfig(templateId?: TemplateId): TemplateConfig {
  if (!templateId) {
    return templateConfigs.default;
  }
  return templateConfigs[templateId] ?? templateConfigs.default;
}
