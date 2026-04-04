import { describe, expect, it } from "vitest";
import { formatInput, renderDocx } from "@/features/formatter";
import { renderClipboardPayload } from "@/features/formatter/renderers/clipboard";

function collectText(block: { inlines: Array<{ type: "text"; value: string } | { type: "lineBreak" }> }): string {
  return block.inlines
    .map((inline) => (inline.type === "text" ? inline.value : "\n"))
    .join("")
    .trim();
}

describe("双模式结构策略", () => {
  it("标题编号策略：general 去编号，academic 保留编号", () => {
    const input = "1.2 研究背景";

    const generalDoc = formatInput(input, { modeId: "general" });
    const academicDoc = formatInput(input, { modeId: "academic" });

    expect(generalDoc.blocks[0]?.type).toBe("heading");
    expect(academicDoc.blocks[0]?.type).toBe("heading");

    if (generalDoc.blocks[0]?.type === "heading") {
      expect(generalDoc.blocks[0].inlines[0]?.type).toBe("text");
      expect(generalDoc.blocks[0].inlines[0]?.value).toBe("研究背景");
    }

    if (academicDoc.blocks[0]?.type === "heading") {
      expect(academicDoc.blocks[0].inlines[0]?.type).toBe("text");
      expect(academicDoc.blocks[0].inlines[0]?.value).toBe("1.2 研究背景");
    }
  });

  it("普通要点总结不强制转有序列表", () => {
    const input = `要点：\n- 成本可控\n- 部署简单\n- 维护方便`;

    const generalDoc = formatInput(input, { modeId: "general" });
    const academicDoc = formatInput(input, { modeId: "academic" });

    expect(generalDoc.blocks[1]?.type).toBe("list");
    expect(academicDoc.blocks[1]?.type).toBe("paragraph");
    expect(academicDoc.blocks[2]?.type).toBe("paragraph");
    expect(academicDoc.blocks[3]?.type).toBe("paragraph");

    if (generalDoc.blocks[1]?.type === "list") {
      expect(generalDoc.blocks[1].ordered).toBe(false);
    }
  });

  it("显式步骤语义下两个模式都可转有序列表", () => {
    const input = `实验步骤：\n- 配置环境\n- 运行样例\n- 记录结果`;

    const generalDoc = formatInput(input, { modeId: "general" });
    const academicDoc = formatInput(input, { modeId: "academic" });

    expect(generalDoc.blocks[1]?.type).toBe("list");
    expect(academicDoc.blocks[1]?.type).toBe("list");

    if (generalDoc.blocks[1]?.type === "list") {
      expect(generalDoc.blocks[1].ordered).toBe(true);
    }

    if (academicDoc.blocks[1]?.type === "list") {
      expect(academicDoc.blocks[1].ordered).toBe(true);
    }
  });

  it("仅时序语义时：general 可转有序，academic 转为分项段落", () => {
    const input = `建议执行：\n- 首先安装依赖\n- 然后运行测试\n- 最后打包`;

    const generalDoc = formatInput(input, { modeId: "general" });
    const academicDoc = formatInput(input, { modeId: "academic" });

    expect(generalDoc.blocks[1]?.type).toBe("list");
    expect(academicDoc.blocks[1]?.type).toBe("paragraph");
    expect(academicDoc.blocks[2]?.type).toBe("paragraph");
    expect(academicDoc.blocks[3]?.type).toBe("paragraph");

    if (generalDoc.blocks[1]?.type === "list") {
      expect(generalDoc.blocks[1].ordered).toBe(true);
    }
  });

  it("单个时序词不会触发步骤编号转换", () => {
    const input = `说明：\n- 然后补充背景说明`;
    const generalDoc = formatInput(input, { modeId: "general" });
    const academicDoc = formatInput(input, { modeId: "academic" });

    expect(generalDoc.blocks[1]?.type).toBe("list");
    if (generalDoc.blocks[1]?.type === "list") {
      expect(generalDoc.blocks[1].ordered).toBe(false);
    }

    expect(academicDoc.blocks[1]?.type).toBe("paragraph");
  });

  it("学术模式将解释型项目符号转为分项正文段落并保留关键词层次", () => {
    const input = `2、系统设计
- **模块划分**：按照采集、清洗、导出三层拆分，以降低耦合并便于测试。
- **接口约束**：统一输入输出结构，避免多处兼容分支导致回归风险。`;

    const generalDoc = formatInput(input, { modeId: "general" });
    const academicDoc = formatInput(input, { modeId: "academic" });

    expect(generalDoc.blocks[1]?.type).toBe("list");
    expect(academicDoc.blocks[1]?.type).toBe("paragraph");
    expect(academicDoc.blocks[2]?.type).toBe("paragraph");

    if (academicDoc.blocks[1]?.type === "paragraph") {
      const firstInline = academicDoc.blocks[1].inlines[0];
      expect(firstInline?.type).toBe("text");
      if (firstInline?.type === "text") {
        expect(Boolean(firstInline.marks?.bold)).toBe(true);
      }
      const text = academicDoc.blocks[1].inlines
        .filter((inline) => inline.type === "text")
        .map((inline) => inline.value)
        .join("");
      expect(text).toContain("模块划分");
      expect(text).toContain("：");
    }
  });

  it("学术模式对清单型项目符号去黑点并转独立分段", () => {
    const input = `注意事项：
- 不要泄露账号密码
- 不要在公共网络传输敏感文件`;

    const academicDoc = formatInput(input, { modeId: "academic" });
    expect(academicDoc.blocks[1]?.type).toBe("paragraph");
    expect(academicDoc.blocks[2]?.type).toBe("paragraph");
  });

  it("学术模式对嵌套黑点脏输入优先扁平化为清晰分段", () => {
    const input = `• 预处理\n  ◦ 去重\n  ◦ 异常值修正\n• 建模\n  ◦ 特征筛选\n  ◦ 训练与验证`;
    const academicDoc = formatInput(input, { modeId: "academic" });

    expect(academicDoc.blocks.every((block) => block.type === "paragraph")).toBe(true);
    expect(academicDoc.blocks.length).toBeGreaterThanOrEqual(4);
  });

  it("模式切换后复制与导出共享同一结构模型", async () => {
    const input = `1.2 研究背景\n\n实验步骤：\n- 配置环境\n- 运行样例`;

    const generalDoc = formatInput(input, { modeId: "general" });
    const academicDoc = formatInput(input, { modeId: "academic" });

    const generalClip = renderClipboardPayload(generalDoc);
    const academicClip = renderClipboardPayload(academicDoc);
    const generalBlob = await renderDocx(generalDoc);
    const academicBlob = await renderDocx(academicDoc);

    expect(generalClip.text).toContain("研究背景");
    expect(generalClip.text).not.toContain("1.2 研究背景");
    expect(academicClip.text).toContain("1.2 研究背景");

    expect(generalBlob.size).toBeGreaterThan(0);
    expect(academicBlob.size).toBeGreaterThan(0);
  });

  it("短说明 + 单个时序词不会误触发步骤编号", () => {
    const input = `说明：
- 然后补充背景说明`;
    const generalDoc = formatInput(input, { modeId: "general" });
    const academicDoc = formatInput(input, { modeId: "academic" });

    expect(generalDoc.blocks[1]?.type).toBe("list");
    if (generalDoc.blocks[1]?.type === "list") {
      expect(generalDoc.blocks[1].ordered).toBe(false);
      expect(generalDoc.blocks[1].items).toHaveLength(1);
    }

    expect(academicDoc.blocks[1]?.type).toBe("paragraph");
    if (academicDoc.blocks[1]?.type === "paragraph") {
      expect(collectText(academicDoc.blocks[1])).toContain("然后补充背景说明");
    }
  });

  it("两项中仅一项带时序词时 general 也不应误编号", () => {
    const input = `说明：
- 然后补充背景
- 其他说明`;
    const generalDoc = formatInput(input, { modeId: "general" });
    const academicDoc = formatInput(input, { modeId: "academic" });

    expect(generalDoc.blocks[1]?.type).toBe("list");
    if (generalDoc.blocks[1]?.type === "list") {
      expect(generalDoc.blocks[1].ordered).toBe(false);
      expect(generalDoc.blocks[1].items).toHaveLength(2);
    }

    expect(academicDoc.blocks[1]?.type).toBe("paragraph");
    expect(academicDoc.blocks[2]?.type).toBe("paragraph");
  });

  it("标题 + 嵌套黑点混排：academic 去符号后保持清晰分段", () => {
    const input = `一、方法框架
• 数据处理
  ◦ 去重
  ◦ 标准化
• 建模
  ◦ 特征筛选
  ◦ 训练与验证`;
    const generalDoc = formatInput(input, { modeId: "general" });
    const academicDoc = formatInput(input, { modeId: "academic" });

    expect(generalDoc.blocks[0]?.type).toBe("heading");
    expect(generalDoc.blocks[1]?.type).toBe("list");

    expect(academicDoc.blocks[0]?.type).toBe("heading");
    if (academicDoc.blocks[0]?.type === "heading") {
      expect(collectText(academicDoc.blocks[0])).toContain("一、方法框架");
    }

    const rest = academicDoc.blocks.slice(1);
    expect(rest.every((block) => block.type === "paragraph")).toBe(true);
    const merged = rest
      .filter((block): block is Extract<(typeof academicDoc.blocks)[number], { type: "paragraph" }> => block.type === "paragraph")
      .map((block) => collectText(block))
      .join("\n");
    expect(merged).toContain("数据处理");
    expect(merged).toContain("去重");
    expect(merged).toContain("建模");
  });

  it("解释型与清单型混合列表：academic 不丢关键词层次", () => {
    const input = `系统要点：
- **模块划分**：采用三层结构降低耦合。
- 研究背景
- **接口约束**：统一输入输出减少回归。`;
    const generalDoc = formatInput(input, { modeId: "general" });
    const academicDoc = formatInput(input, { modeId: "academic" });

    expect(generalDoc.blocks[1]?.type).toBe("list");

    expect(academicDoc.blocks[1]?.type).toBe("paragraph");
    expect(academicDoc.blocks[2]?.type).toBe("paragraph");
    expect(academicDoc.blocks[3]?.type).toBe("paragraph");

    if (academicDoc.blocks[1]?.type === "paragraph") {
      const firstInline = academicDoc.blocks[1].inlines[0];
      expect(firstInline?.type).toBe("text");
      if (firstInline?.type === "text") {
        expect(Boolean(firstInline.marks?.bold)).toBe(true);
      }
    }
    if (academicDoc.blocks[2]?.type === "paragraph") {
      expect(collectText(academicDoc.blocks[2])).toBe("研究背景");
    }
  });

  it("单项/两项边界列表不做过度结构推断", () => {
    const single = formatInput("- 数据来源", { modeId: "general" });
    const singleAcademic = formatInput("- 数据来源", { modeId: "academic" });
    expect(single.blocks[0]?.type).toBe("list");
    if (single.blocks[0]?.type === "list") {
      expect(single.blocks[0].ordered).toBe(false);
      expect(single.blocks[0].items).toHaveLength(1);
    }
    expect(singleAcademic.blocks[0]?.type).toBe("paragraph");

    const two = formatInput("- 数据来源\n- 研究背景", { modeId: "general" });
    const twoAcademic = formatInput("- 数据来源\n- 研究背景", { modeId: "academic" });
    expect(two.blocks[0]?.type).toBe("list");
    if (two.blocks[0]?.type === "list") {
      expect(two.blocks[0].ordered).toBe(false);
      expect(two.blocks[0].items).toHaveLength(2);
    }
    expect(twoAcademic.blocks[0]?.type).toBe("paragraph");
    expect(twoAcademic.blocks[1]?.type).toBe("paragraph");
  });

  it("含 LaTeX/数学符号列表项在两模式下都不应被破坏", () => {
    const input = `- 设损失函数为 $L=\\sum_i (y_i-\\hat{y}_i)^2$，然后进行梯度下降。
- 约束条件：$x \\in \\mathbb{R}^n$ 且 $\\|x\\|_2 \\le 1$。`;
    const generalDoc = formatInput(input, { modeId: "general" });
    const academicDoc = formatInput(input, { modeId: "academic" });

    expect(generalDoc.blocks[0]?.type).toBe("list");
    if (generalDoc.blocks[0]?.type === "list") {
      expect(generalDoc.blocks[0].ordered).toBe(false);
    }

    expect(academicDoc.blocks[0]?.type).toBe("paragraph");
    expect(academicDoc.blocks[1]?.type).toBe("paragraph");
    if (academicDoc.blocks[0]?.type === "paragraph" && academicDoc.blocks[1]?.type === "paragraph") {
      const combined = `${collectText(academicDoc.blocks[0])}\n${collectText(academicDoc.blocks[1])}`;
      expect(combined).toContain("$L=\\sum_i (y_i-\\hat{y}_i)^2$");
      expect(combined).toContain("\\mathbb{R}^n");
      expect(combined).toContain("\\|x\\|_2");
      expect(combined).toContain("\\le 1");
    }
  });
});
