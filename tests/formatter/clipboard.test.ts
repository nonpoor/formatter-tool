import { describe, expect, it } from "vitest";
import { renderClipboard } from "@/features/formatter/renderers/clipboard";
import type { DocumentModel } from "@/features/formatter/model/types";

const sampleDoc: DocumentModel = {
  meta: {
    sourceType: "markdown",
    warnings: [],
    stats: { blockCount: 6, charCount: 16 },
    templateId: "default",
  },
  blocks: [
    { type: "heading", level: 1, inlines: [{ type: "text", value: "标题" }] },
    {
      type: "paragraph",
      inlines: [
        { type: "text", value: "正文" },
        { type: "text", value: "加粗", marks: { bold: true } },
        { type: "lineBreak" },
        { type: "text", value: "第二行", marks: { italic: true } },
      ],
    },
    {
      type: "list",
      ordered: false,
      items: [{ blocks: [{ type: "paragraph", inlines: [{ type: "text", value: "列表项" }] }] }],
    },
    {
      type: "blockquote",
      blocks: [{ type: "paragraph", inlines: [{ type: "text", value: "引用" }] }],
    },
    {
      type: "preformatted",
      text: "const a = 1;",
    },
    {
      type: "paragraph",
      inlines: [{ type: "text", value: "结束" }],
    },
  ],
};

describe("复制优化版输出", () => {
  it("输出保守 HTML 并提供纯文本", () => {
    const output = renderClipboard(sampleDoc);

    expect(output.html).toContain("<h1>");
    expect(output.html).toContain("<ul>");
    expect(output.html).toContain("<blockquote>");
    expect(output.html).toContain("<pre>");

    expect(output.html).not.toMatch(/<(div|span|table|img|script)/i);
    expect(output.html).not.toMatch(/\b(class|style)=/i);

    expect(output.text).toContain("标题");
    expect(output.text).toContain("列表项");
  });
});
