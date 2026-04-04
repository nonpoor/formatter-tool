import { describe, expect, it } from "vitest";
import { formatInput } from "@/features/formatter";
import { renderClipboardPayload } from "@/features/formatter/renderers/clipboard";

describe("列表结构保留", () => {
  it("保留有序列表下的无序子列表，不把合法圆点删除", () => {
    const input = `2. 主项\n   - 子项A\n   - 子项B`;
    const doc = formatInput(input);

    expect(doc.blocks[0]?.type).toBe("list");
    if (doc.blocks[0]?.type === "list") {
      expect(doc.blocks[0].ordered).toBe(true);
      expect(doc.blocks[0].start).toBe(2);
    }

    const clip = renderClipboardPayload(doc);
    expect(clip.html).toContain('<ol start="2">');
    expect(clip.html).toContain("<ul>");
    expect(clip.text).toContain("2. 主项");
    expect(clip.text).toContain("- 子项A");
  });

  it("可识别多行合法圆点前缀为无序列表", () => {
    const input = `• 子项A\n• 子项B\n• 子项C`;
    const doc = formatInput(input);

    expect(doc.blocks[0]?.type).toBe("list");
    if (doc.blocks[0]?.type === "list") {
      expect(doc.blocks[0].ordered).toBe(false);
      expect(doc.blocks[0].items).toHaveLength(3);
    }
  });

  it("可识别中文前缀编号为有序列表", () => {
    const input = `1）第一项\n2）第二项\n3、第三项`;
    const doc = formatInput(input);

    expect(doc.blocks[0]?.type).toBe("list");
    if (doc.blocks[0]?.type === "list") {
      expect(doc.blocks[0].ordered).toBe(true);
      expect(doc.blocks[0].start).toBe(1);
      expect(doc.blocks[0].items).toHaveLength(3);
    }
  });

  it("可识别段落中的前缀说明 + 连续编号行", () => {
    const input = `如果找不到设置\n可能的情况：\n1）macOS 版本太旧\n2）地区限制\n3、订阅类型`;
    const doc = formatInput(input);

    expect(doc.blocks[0]?.type).toBe("paragraph");
    if (doc.blocks[0]?.type === "paragraph") {
      expect(doc.blocks[0].inlines[0]?.type).toBe("text");
    }

    expect(doc.blocks[1]?.type).toBe("list");
    if (doc.blocks[1]?.type === "list") {
      expect(doc.blocks[1].ordered).toBe(true);
      expect(doc.blocks[1].start).toBe(1);
      expect(doc.blocks[1].items).toHaveLength(3);
    }
  });

  it("可识别有序项中的说明行 + 合法圆点子项", () => {
    const input = `2. 拥抱“模型爆发期”\n正如你所说，开源模型的发展速度没人能预料。\n• 本地化趋势：技术越来越强。\n• API 的局限：有成本和延迟。`;
    const doc = formatInput(input);

    expect(doc.blocks[0]?.type).toBe("list");
    if (doc.blocks[0]?.type === "list") {
      expect(doc.blocks[0].ordered).toBe(true);
      expect(doc.blocks[0].start).toBe(2);

      const firstItemBlocks = doc.blocks[0].items[0]?.blocks ?? [];
      expect(firstItemBlocks[0]?.type).toBe("paragraph");
      expect(firstItemBlocks[1]?.type).toBe("list");
      if (firstItemBlocks[1]?.type === "list") {
        expect(firstItemBlocks[1].ordered).toBe(false);
        expect(firstItemBlocks[1].items).toHaveLength(2);
      }
    }
  });
});
