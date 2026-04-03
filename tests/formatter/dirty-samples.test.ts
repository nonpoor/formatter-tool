import { describe, expect, it } from "vitest";
import { formatInput } from "@/features/formatter";

const dirtySamples = [
  `# 标题\n\n<p>混合<strong>输入</strong></p>\n\n1. A\n2. B`,
  `\n\n\n段落一\n\n\n\n段落二\n\n`,
  `<p>• 项目一</p><p>• 项目二</p>`,
  `This is English，这是中文，AI often outputs **mixed** text.`,
  `> 引用\n\n- 列表\n\n### 小节\n\n\u200B结尾`,
];

describe("脏样例回归", () => {
  dirtySamples.forEach((input, idx) => {
    it(`样例 ${idx + 1} 可被稳定处理`, () => {
      const doc = formatInput(input);
      expect(doc.blocks.length).toBeGreaterThan(0);

      const serialized = JSON.stringify(doc);
      expect(serialized).not.toContain("\\u200b");
      expect(serialized).not.toContain("\\ufeff");
    });
  });
});
