import { formatInput } from "@/features/formatter/index";
import type { BlockNode, DocumentModel } from "@/features/formatter/model/types";
import { renderClipboard } from "@/features/formatter/renderers/clipboard";

export interface ResolvePastedInputArgs {
  plain?: string;
  html?: string;
  preserveRichText?: boolean;
}

export interface ResolvePastedInputResult {
  value: string;
  mode: "plain" | "html" | "empty";
}

export function resolvePastedInput(args: ResolvePastedInputArgs): ResolvePastedInputResult {
  const plain = (args.plain ?? "").trim();
  const html = (args.html ?? "").trim();
  const preserveRichText = Boolean(args.preserveRichText);

  if (!preserveRichText && plain && html) {
    const plainDoc = formatInput(args.plain ?? "");
    const htmlDoc = formatInput(html);

    if (shouldPreferHtmlProjection(plainDoc, htmlDoc)) {
      const projectedText = renderClipboard(htmlDoc).text.trim();
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
    const sanitizedHtml = sanitizeHtmlToWhitelist(html);
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
    const text = sanitizeHtmlToPlainText(html);
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

function sanitizeHtmlToWhitelist(html: string): string {
  const doc = formatInput(html);
  return renderClipboard(doc).html;
}

function sanitizeHtmlToPlainText(html: string): string {
  const doc = formatInput(html);
  return renderClipboard(doc).text;
}

function shouldPreferHtmlProjection(plainDoc: DocumentModel, htmlDoc: DocumentModel): boolean {
  const plainScore = structureScore(plainDoc.blocks);
  const htmlScore = structureScore(htmlDoc.blocks);

  if (htmlScore <= plainScore) {
    return false;
  }

  // 只有在 HTML 结构明显更完整时才覆盖 plain，避免普通文本粘贴行为被打扰。
  return htmlScore >= plainScore + 2;
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
