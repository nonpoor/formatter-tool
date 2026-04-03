import { describe, expect, it } from "vitest";
import { formatInput } from "@/features/formatter";

describe("纯文本表格识别", () => {
  it("识别 TSV 表格", () => {
    const input = `名称\t值\t备注\nA\t1\talpha\nB\t2\tbeta`;
    const doc = formatInput(input);

    expect(doc.blocks[0]?.type).toBe("table");
    if (doc.blocks[0]?.type === "table") {
      expect(doc.blocks[0].headers).toHaveLength(3);
      expect(doc.blocks[0].rows).toHaveLength(2);
    }
  });

  it("疑似但不完整的伪表格回退为预格式文本", () => {
    const input = `| 名称 | 值 |\n| --- |\n| A | 1 |`;
    const doc = formatInput(input);

    expect(doc.blocks[0]?.type).toBe("preformatted");
  });
});

