import type { BlockNode } from "@/features/formatter/model/types";
import { createInlineFromTextWithBreak } from "@/features/formatter/utils";

export function parsePlainInput(input: string): BlockNode[] {
  const normalized = input.replace(/\r\n/g, "\n");
  const paragraphs = normalized.split(/\n{2,}/);
  const blocks: BlockNode[] = [];

  for (const paragraph of paragraphs) {
    const text = paragraph.trim();
    if (!text) {
      continue;
    }

    blocks.push({
      type: "paragraph",
      inlines: createInlineFromTextWithBreak(text),
    });
  }

  return blocks;
}

