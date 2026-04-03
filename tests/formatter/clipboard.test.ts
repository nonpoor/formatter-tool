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

    expect(output.html).not.toMatch(/<(div|span|img|script)/i);
    expect(output.html).not.toMatch(/\b(class|style)=/i);

    expect(output.text).toContain("标题");
    expect(output.text).toContain("列表项");
  });

  it("列表项输出为稳定结构，避免 li 内块级嵌套和空项", () => {
    const doc: DocumentModel = {
      ...sampleDoc,
      blocks: [
        {
          type: "list",
          ordered: false,
          items: [
            {
              blocks: [
                { type: "paragraph", inlines: [{ type: "text", value: "第一行" }] },
                { type: "paragraph", inlines: [{ type: "text", value: "第二行" }] },
              ],
            },
            {
              blocks: [{ type: "paragraph", inlines: [{ type: "text", value: "   " }] }],
            },
          ],
        },
      ],
    };

    const output = renderClipboard(doc);

    expect(output.html).toContain("<ul>");
    expect(output.html).toContain("<li>第一行<br>第二行");
    expect(output.html).not.toContain("<li></li>");
    expect(output.html).not.toContain("<li><p>");
  });

  it("有序列表保留起始编号", () => {
    const doc: DocumentModel = {
      ...sampleDoc,
      blocks: [
        {
          type: "list",
          ordered: true,
          start: 2,
          items: [
            { blocks: [{ type: "paragraph", inlines: [{ type: "text", value: "二号" }] }] },
            { blocks: [{ type: "paragraph", inlines: [{ type: "text", value: "三号" }] }] },
          ],
        },
      ],
    };

    const output = renderClipboard(doc);
    expect(output.html).toContain('<ol start="2">');
    expect(output.text).toContain("2. 二号");
    expect(output.text).toContain("3. 三号");
  });

  it("表格输出为基础 table 结构", () => {
    const doc: DocumentModel = {
      ...sampleDoc,
      blocks: [
        {
          type: "table",
          headers: [
            [{ type: "text", value: "名称" }],
            [{ type: "text", value: "值" }],
          ],
          rows: [
            [
              [{ type: "text", value: "A" }],
              [{ type: "text", value: "1" }],
            ],
          ],
        },
      ],
    };

    const output = renderClipboard(doc);
    expect(output.html).toContain("<table>");
    expect(output.html).toContain("<thead>");
    expect(output.html).toContain("<tbody>");
    expect(output.text).toContain("名称\t值");
  });
});
