import { describe, expect, it } from "vitest";
import { formatInput } from "@/features/formatter";

function blockTypes(doc: ReturnType<typeof formatInput>) {
  return doc.blocks.map((block) => block.type);
}

describe("解析器 - 受控子集", () => {
  it("支持 Markdown 标题、段落、加粗斜体、列表、引用", () => {
    const input = `# 一级标题\n\n普通段落，包含**加粗**和*斜体*。\n\n- 条目一\n- 条目二\n\n> 引用文本`;

    const doc = formatInput(input);

    expect(doc.meta.sourceType).toBe("markdown");
    expect(blockTypes(doc)).toEqual(["heading", "paragraph", "list", "blockquote"]);

    const paragraph = doc.blocks[1];
    expect(paragraph.type).toBe("paragraph");
    if (paragraph.type === "paragraph") {
      const hasBold = paragraph.inlines.some((item) => item.type === "text" && item.marks?.bold);
      const hasItalic = paragraph.inlines.some((item) => item.type === "text" && item.marks?.italic);
      expect(hasBold).toBe(true);
      expect(hasItalic).toBe(true);
    }
  });

  it("支持 HTML 白名单标签", () => {
    const input = `<h1>标题</h1><p>正文<strong>加粗</strong><em>斜体</em><br>换行</p><ul><li>项目A</li></ul><blockquote><p>引用</p></blockquote>`;

    const doc = formatInput(input);

    expect(doc.meta.sourceType).toBe("html");
    expect(blockTypes(doc)).toEqual(["heading", "paragraph", "list", "blockquote"]);
  });

  it("支持 Markdown + HTML 混合输入", () => {
    const input = `## 标题\n\n<p>这是一段<strong>混合</strong>内容</p>\n\n- 列表项`;
    const doc = formatInput(input);

    expect(doc.meta.sourceType).toBe("mixed");
    expect(doc.blocks.length).toBeGreaterThan(0);
  });

  it("保留有序列表的起始编号", () => {
    const input = `2. 第二项\n3. 第三项`;
    const doc = formatInput(input);

    expect(doc.blocks[0]?.type).toBe("list");
    if (doc.blocks[0]?.type === "list") {
      expect(doc.blocks[0].ordered).toBe(true);
      expect(doc.blocks[0].start).toBe(2);
      expect(doc.blocks[0].items).toHaveLength(2);
    }
  });

  it("支持 Markdown 管道表格识别", () => {
    const input = `| 列1 | 列2 |\n| --- | --- |\n| A | B |\n| C | D |`;
    const doc = formatInput(input);

    expect(doc.blocks[0]?.type).toBe("table");
    if (doc.blocks[0]?.type === "table") {
      expect(doc.blocks[0].headers).toHaveLength(2);
      expect(doc.blocks[0].rows).toHaveLength(2);
    }
  });
});
