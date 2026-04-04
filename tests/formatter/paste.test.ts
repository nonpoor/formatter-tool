import { describe, expect, it } from "vitest";
import { resolvePastedInput } from "@/features/formatter/paste";

describe("粘贴输入策略", () => {
  it("默认优先使用纯文本，避免把原始 HTML 直接塞入输入框", () => {
    const result = resolvePastedInput({
      plain: "这是纯文本内容",
      html: "<div style=\"font-size:16px\">这是 HTML 内容</div>",
      preserveRichText: false,
    });

    expect(result.mode).toBe("plain");
    expect(result.value).toBe("这是纯文本内容");
  });

  it("在开启保留富文本时，使用受控白名单 HTML", () => {
    const result = resolvePastedInput({
      plain: "纯文本兜底",
      html: "<div style=\"color:red\"><p>段落<strong>加粗</strong></p><script>alert(1)</script></div>",
      preserveRichText: true,
    });

    expect(result.mode).toBe("html");
    expect(result.value).toContain("<p>");
    expect(result.value).not.toMatch(/<script|style=|class=/i);
    expect(result.value).not.toContain("<div");
  });

  it("当 HTML 结构显著更完整时，默认模式也会优先使用其投影纯文本", () => {
    const result = resolvePastedInput({
      plain: `3. 户籍制度与“流动人口”管理
阿甘本曾深入讨论过“难民”的概念。
实例：在大城市中，由于没有户口无法享受社保。
映射：城市管理往往将这类人群视为“劳动力资源”。`,
      html: `<ol start="3"><li><p>户籍制度与“流动人口”管理</p><p>阿甘本曾深入讨论过“难民”的概念。</p><ul><li><strong>实例：</strong> 在大城市中，由于没有户口无法享受社保。</li><li><strong>映射：</strong> 城市管理往往将这类人群视为“劳动力资源”。</li></ul></li></ol>`,
      preserveRichText: false,
    });

    expect(result.mode).toBe("plain");
    expect(result.value).toContain("3. 户籍制度与“流动人口”管理");
    expect(result.value).toContain("- 实例：");
    expect(result.value).toContain("在大城市中，由于没有户口无法享受社保。");
    expect(result.value).toContain("- 映射：");
    expect(result.value).toContain("城市管理往往将这类人群视为“劳动力资源”。");
  });

  it("传入 modeId 后，HTML 投影纯文本与当前模式保持一致", () => {
    const html = "<p>1.2 研究背景</p>";

    const general = resolvePastedInput({
      plain: "",
      html,
      modeId: "general",
    });
    const academic = resolvePastedInput({
      plain: "",
      html,
      modeId: "academic",
    });

    expect(general.mode).toBe("plain");
    expect(academic.mode).toBe("plain");
    expect(general.value.trim()).toBe("研究背景");
    expect(academic.value.trim()).toBe("1.2 研究背景");
  });
});
