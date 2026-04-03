import { describe, expect, it } from "vitest";
import { formatInput, renderDocx } from "@/features/formatter";
import { renderClipboard } from "@/features/formatter/renderers/clipboard";

describe("学术结构化模式", () => {
  it("学术模板下将章节编号识别为标题层级", () => {
    const input = `3、户籍制度与“流动人口”管理

1.1 制度背景

1.1.1 地方实践

一、现代治理逻辑

（一）概念边界`;

    const doc = formatInput(input, { templateId: "course-paper" });

    const headings = doc.blocks.filter((block) => block.type === "heading");
    expect(headings).toHaveLength(5);

    if (headings.every((block) => block.type === "heading")) {
      expect(headings.map((block) => block.level)).toEqual([1, 2, 3, 1, 2]);
      expect(headings.map((block) => block.inlines[0]).every((inline) => inline?.type === "text")).toBe(true);
    }
  });

  it("学术模板下将无序列表统一转为有序列表并保留嵌套", () => {
    const input = `- 主项
  - 子项A
  - 子项B`;
    const doc = formatInput(input, { templateId: "general-homework" });

    expect(doc.blocks[0]?.type).toBe("list");
    if (doc.blocks[0]?.type === "list") {
      expect(doc.blocks[0].ordered).toBe(true);
      expect(doc.blocks[0].start).toBe(1);

      const nested = doc.blocks[0].items[0]?.blocks.find((block) => block.type === "list");
      expect(nested?.type).toBe("list");
      if (nested?.type === "list") {
        expect(nested.ordered).toBe(true);
        expect(nested.start).toBe(1);
        expect(nested.items).toHaveLength(2);
      }
    }
  });

  it("学术模板下支持说明行 + 项目符号行拆分为段落 + 有序列表", () => {
    const input = `研究提示：
• 第一条
• 第二条`;
    const doc = formatInput(input, { templateId: "experiment-report" });

    expect(doc.blocks[0]?.type).toBe("paragraph");
    expect(doc.blocks[1]?.type).toBe("list");

    if (doc.blocks[1]?.type === "list") {
      expect(doc.blocks[1].ordered).toBe(true);
      expect(doc.blocks[1].items).toHaveLength(2);
    }

    const clip = renderClipboard(doc);
    expect(clip.text).toContain("1. 第一条");
    expect(clip.text).toContain("2. 第二条");
    expect(clip.text).not.toContain("- 第一条");
  });

  it("默认模板保持 legacy 行为（无序列表不强制转有序）", () => {
    const input = `• 第一条
• 第二条`;
    const doc = formatInput(input, { templateId: "default" });

    expect(doc.blocks[0]?.type).toBe("list");
    if (doc.blocks[0]?.type === "list") {
      expect(doc.blocks[0].ordered).toBe(false);
    }
  });

  it("学术模板下复制与导出共享同一结构模型", async () => {
    const input = `一、研究背景

• 观点A
• 观点B`;
    const doc = formatInput(input, { templateId: "course-paper" });
    const clip = renderClipboard(doc);
    const blob = await renderDocx(doc);

    expect(doc.blocks[0]?.type).toBe("heading");
    expect(doc.blocks[1]?.type).toBe("list");
    if (doc.blocks[1]?.type === "list") {
      expect(doc.blocks[1].ordered).toBe(true);
    }

    expect(clip.text).toContain("1. 观点A");
    expect(blob.size).toBeGreaterThan(0);
  });
});

