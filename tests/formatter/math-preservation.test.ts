import { describe, expect, it } from "vitest";
import { formatInput, renderDocx } from "@/features/formatter";
import { maskMathSpans } from "@/features/formatter/math/preservation";
import {
  mathAcceptanceSamples,
  type MathAcceptanceSample,
} from "@/features/formatter/dev-samples/math-acceptance-samples";
import { renderClipboardPayload } from "@/features/formatter/renderers/clipboard";

function collectParagraphText(doc: ReturnType<typeof formatInput>): string {
  return doc.blocks
    .filter((block) => block.type === "paragraph" || block.type === "heading")
    .flatMap((block) => block.inlines)
    .map((inline) => (inline.type === "text" ? inline.value : "\n"))
    .join("\n");
}

function assertMathSpansPreserved(sample: MathAcceptanceSample, modeId: "general" | "academic") {
  const doc = formatInput(sample.input, { modeId });
  const clip = renderClipboardPayload(doc);
  const rawMath = maskMathSpans(sample.input);

  expect(doc.meta.math.detected).toBe(rawMath.detected);
  expect(doc.meta.math.spanCount).toBe(rawMath.spanCount);
  expect(doc.meta.math.protectionApplied).toBe(rawMath.detected);

  for (const span of rawMath.spans) {
    expect(clip.text).toContain(span);
  }
}

describe("数学公式文本保真", () => {
  it("四类常见公式定界符在双模式下都可保真", () => {
    const ids = ["inline-dollar", "block-dollar", "inline-parenthesis", "block-bracket"];
    const targetSamples = mathAcceptanceSamples.filter((sample) => ids.includes(sample.id));

    expect(targetSamples).toHaveLength(4);
    targetSamples.forEach((sample) => {
      assertMathSpansPreserved(sample, "general");
      assertMathSpansPreserved(sample, "academic");
    });
  });

  it("解释型项目符号含公式时，academic 去黑点但保留关键词层次与公式", () => {
    const sample = mathAcceptanceSamples.find((item) => item.id === "explanatory-list-with-math");
    if (!sample) {
      throw new Error("sample not found: explanatory-list-with-math");
    }

    const generalDoc = formatInput(sample.input, { modeId: "general" });
    const academicDoc = formatInput(sample.input, { modeId: "academic" });

    expect(generalDoc.blocks[0]?.type).toBe("list");
    expect(academicDoc.blocks[0]?.type).toBe("paragraph");
    expect(academicDoc.blocks[1]?.type).toBe("paragraph");

    const academicText = collectParagraphText(academicDoc);
    expect(academicText).toContain("损失函数");
    expect(academicText).toContain("$L=\\sum_i(y_i-\\hat{y}_i)^2$");
    expect(academicText).toContain("$\\|x\\|_2 \\le 1$");
  });

  it("短清单含公式时，general 保留列表感，academic 转为独立段落", () => {
    const sample = mathAcceptanceSamples.find((item) => item.id === "short-list-with-math");
    if (!sample) {
      throw new Error("sample not found: short-list-with-math");
    }

    const generalDoc = formatInput(sample.input, { modeId: "general" });
    const academicDoc = formatInput(sample.input, { modeId: "academic" });

    expect(generalDoc.blocks[0]?.type).toBe("list");
    if (generalDoc.blocks[0]?.type === "list") {
      expect(generalDoc.blocks[0].ordered).toBe(false);
      expect(generalDoc.blocks[0].items).toHaveLength(3);
    }

    expect(academicDoc.blocks[0]?.type).toBe("paragraph");
    expect(academicDoc.blocks[1]?.type).toBe("paragraph");
    expect(academicDoc.blocks[2]?.type).toBe("paragraph");
    expect(academicDoc.blocks.every((block) => block.type === "paragraph")).toBe(true);
  });

  it("步骤流程含公式时，两个模式都仅在显式步骤语义下转有序", () => {
    const sample = mathAcceptanceSamples.find((item) => item.id === "step-list-with-math");
    if (!sample) {
      throw new Error("sample not found: step-list-with-math");
    }

    const generalDoc = formatInput(sample.input, { modeId: "general" });
    const academicDoc = formatInput(sample.input, { modeId: "academic" });
    const generalList = generalDoc.blocks.find((block) => block.type === "list");
    const academicList = academicDoc.blocks.find((block) => block.type === "list");

    expect(generalList?.type).toBe("list");
    expect(academicList?.type).toBe("list");
    if (generalList?.type === "list" && academicList?.type === "list") {
      expect(generalList.ordered).toBe(true);
      expect(academicList.ordered).toBe(true);
    }

    const nonStepInput = "说明：\n- 然后在 $x$ 上讨论边界条件";
    const nonStepGeneral = formatInput(nonStepInput, { modeId: "general" });
    expect(nonStepGeneral.blocks[1]?.type).toBe("list");
    if (nonStepGeneral.blocks[1]?.type === "list") {
      expect(nonStepGeneral.blocks[1].ordered).toBe(false);
    }
  });

  it("嵌套黑点/空心点脏输入含公式时，academic 可扁平化但保持分段和公式", () => {
    const sample = mathAcceptanceSamples.find((item) => item.id === "nested-dirty-bullets-with-math");
    if (!sample) {
      throw new Error("sample not found: nested-dirty-bullets-with-math");
    }

    const academicDoc = formatInput(sample.input, { modeId: "academic" });
    expect(academicDoc.blocks.every((block) => block.type === "paragraph")).toBe(true);

    const text = collectParagraphText(academicDoc);
    expect(text).toContain("$x_i \\leftarrow x_i - \\bar{x}$");
    expect(text).toContain("$z=\\frac{x-\\mu}{\\sigma}$");
    expect(text).toContain("$\\theta_{t+1}=\\theta_t-\\eta\\nabla J$");
  });

  it("预览/复制/导出链路共享同一文档模型，不破坏公式文本", async () => {
    const sample = mathAcceptanceSamples.find((item) => item.id === "mixed-multi-math");
    if (!sample) {
      throw new Error("sample not found: mixed-multi-math");
    }

    const doc = formatInput(sample.input, { modeId: "academic" });
    const clip = renderClipboardPayload(doc);
    const blob = await renderDocx(doc);

    expect(blob.size).toBeGreaterThan(0);
    expect(clip.text).toContain("$a_t=\\alpha a_{t-1}+\\epsilon_t$");
    expect(clip.text).toContain("\\(p(y|x)\\)");
    expect(clip.text).toContain("$$J(\\theta)=\\sum_i\\log p(y_i|x_i)$$");
  });
});
