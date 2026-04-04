import { formatInput } from "@/features/formatter/index";
import { defaultModeId, pasteDefaults } from "@/features/formatter/config/policies";
import type { BlockNode, DocumentModel, ModeId } from "@/features/formatter/model/types";
import { renderClipboardPayload } from "@/features/formatter/renderers/clipboard";

export interface ResolvePastedInputArgs {
  plain?: string;
  html?: string;
  preserveRichText?: boolean;
  modeId?: ModeId;
}

export interface ResolvePastedInputResult {
  value: string;
  mode: "plain" | "html" | "empty";
}

export function resolvePastedInput(args: ResolvePastedInputArgs): ResolvePastedInputResult {
  const plain = (args.plain ?? "").trim();
  const html = (args.html ?? "").trim();
  const preserveRichText = args.preserveRichText ?? pasteDefaults.preserveRichText;
  const modeId = args.modeId ?? defaultModeId;

  if (!preserveRichText && plain && html) {
    const plainDoc = formatInput(args.plain ?? "", { modeId });
    const htmlDoc = formatInput(html, { modeId });

    if (shouldPreferHtmlProjection(plainDoc, htmlDoc)) {
      const projectedText = renderClipboardPayload(htmlDoc).text.trim();
      if (projectedText) {
        return {
          value: projectedText,
          mode: "plain",
        };
      }
    }
  }

  if (!preserveRichText && plain) {
    return {
      value: args.plain ?? "",
      mode: "plain",
    };
  }

  if (preserveRichText && html) {
    const sanitizedHtml = sanitizeHtmlToWhitelist(html, modeId);
    if (sanitizedHtml) {
      return {
        value: sanitizedHtml,
        mode: "html",
      };
    }
  }

  if (plain) {
    return {
      value: args.plain ?? "",
      mode: "plain",
    };
  }

  if (html) {
    const text = sanitizeHtmlToPlainText(html, modeId);
    if (text.trim()) {
      return {
        value: text,
        mode: "plain",
      };
    }
  }

  return {
    value: "",
    mode: "empty",
  };
}

function sanitizeHtmlToWhitelist(html: string, modeId: ModeId): string {
  const doc = formatInput(html, { modeId });
  return renderClipboardPayload(doc).html;
}

function sanitizeHtmlToPlainText(html: string, modeId: ModeId): string {
  const doc = formatInput(html, { modeId });
  return renderClipboardPayload(doc).text;
}

function shouldPreferHtmlProjection(plainDoc: DocumentModel, htmlDoc: DocumentModel): boolean {
  const plainScore = structureScore(plainDoc.blocks);
  const htmlScore = structureScore(htmlDoc.blocks);

  if (htmlScore <= plainScore) {
    return false;
  }

  // 只有在 HTML 结构明显更完整时才覆盖 plain，避免普通文本粘贴行为被打扰。
  return htmlScore >= plainScore + pasteDefaults.htmlProjectionMinScoreAdvantage;
}

function structureScore(blocks: BlockNode[]): number {
  let score = 0;

  for (const block of blocks) {
    if (block.type === "list") {
      score += 3 + block.items.length;
      for (const item of block.items) {
        score += structureScore(item.blocks);
      }
      continue;
    }

    if (block.type === "table") {
      score += 8 + block.rows.length;
      continue;
    }

    if (block.type === "blockquote") {
      score += 1 + structureScore(block.blocks);
    }
  }

  return score;
}
