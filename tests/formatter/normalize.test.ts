import { describe, expect, it } from "vitest";
import { formatInput } from "@/features/formatter";

describe("归一化", () => {
  it("区分段落与段内换行", () => {
    const input = `第一行
第二行

新段落`;
    const doc = formatInput(input);

    expect(doc.blocks).toHaveLength(2);
    expect(doc.blocks[0].type).toBe("paragraph");
    if (doc.blocks[0].type === "paragraph") {
      expect(doc.blocks[0].inlines.some((x) => x.type === "lineBreak")).toBe(true);
    }
  });

  it("可把错乱列表段落修复为列表", () => {
    const input = `<p>- 第一项</p><p>- 第二项</p><p>普通段落</p>`;
    const doc = formatInput(input);

    expect(doc.blocks[0].type).toBe("list");
    if (doc.blocks[0].type === "list") {
      expect(doc.blocks[0].items).toHaveLength(2);
      expect(doc.blocks[0].ordered).toBe(false);
    }
    expect(doc.blocks[1].type).toBe("paragraph");
  });

  it("清理 AI 常见脏格式（多余空白与零宽字符）", () => {
    const input = "\u200B\uFEFF##   标题\n\n\n正文\u200B  内容";
    const doc = formatInput(input);

    expect(doc.blocks[0].type).toBe("heading");
    if (doc.blocks[0].type === "heading") {
      const text = doc.blocks[0].inlines.filter((x) => x.type === "text").map((x) => x.value).join("");
      expect(text).toBe("标题");
    }
  });
});
