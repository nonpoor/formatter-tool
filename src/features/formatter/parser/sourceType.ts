import type { SourceType } from "@/features/formatter/model/types";

const HTML_TAG_REGEX = /<(p|br|strong|em|ul|ol|li|h1|h2|h3|blockquote|pre)\b[^>]*>/i;
const MARKDOWN_REGEX =
  /(^|\n)\s{0,3}(#{1,3}\s+|[-*+•●○◦▪▫·・‧]\s+|(?:\d+|[０-９]+)[.)）．、]\s*|[（(](?:\d+|[０-９]+)[)）]\s*|>\s+)|\*\*[^*]+\*\*|\*[^*\n]+\*|(^|\n)\s*```|(\|.+\|\n\|[\s:-]+\|)/m;

export function detectSourceType(input: string): SourceType {
  const value = input.trim();
  if (!value) {
    return "plain";
  }

  const hasHtml = HTML_TAG_REGEX.test(value);
  const hasMarkdown = MARKDOWN_REGEX.test(value);

  if (hasHtml && hasMarkdown) {
    return "mixed";
  }
  if (hasHtml) {
    return "html";
  }
  if (hasMarkdown) {
    return "markdown";
  }
  return "plain";
}
