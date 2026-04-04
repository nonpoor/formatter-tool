export type AcceptanceModeExpectation = {
  structure: string;
  notes: string;
};

export interface MathAcceptanceSample {
  id: string;
  title: string;
  category: "math_basic" | "math_complex" | "academic_boundary";
  input: string;
  risk: string;
  expect: {
    general: AcceptanceModeExpectation;
    academic: AcceptanceModeExpectation;
  };
}

export const mathAcceptanceSamples: MathAcceptanceSample[] = [
  {
    id: "inline-dollar",
    title: "行内公式 $...$",
    category: "math_basic",
    input: "设相似度为 $S = \\sum_{i=1}^{n} (w_i \\cdot v_i) + \\epsilon$，用于排序。",
    risk: "行内公式被空白清洗或转义破坏。",
    expect: {
      general: { structure: "paragraph", notes: "原样保留公式文本。" },
      academic: { structure: "paragraph", notes: "原样保留公式文本，不做列表化。" },
    },
  },
  {
    id: "block-dollar",
    title: "块级公式 $$...$$",
    category: "math_basic",
    input: "损失函数定义如下：\n$$L = \\frac{1}{n}\\sum_{i=1}^{n}(y_i-\\hat{y}_i)^2$$\n据此迭代优化。",
    risk: "多行公式被错误拆分或丢失反斜杠。",
    expect: {
      general: { structure: "paragraph+paragraph", notes: "块级公式保持完整文本。" },
      academic: { structure: "paragraph+paragraph", notes: "块级公式保持完整文本，不应被去符号规则误伤。" },
    },
  },
  {
    id: "inline-parenthesis",
    title: "行内公式 \\(...\\)",
    category: "math_basic",
    input: "当 \\(\\alpha + \\beta = 1\\) 时，模型达到平衡。",
    risk: "\\( \\) 形式被普通括号处理导致丢失。",
    expect: {
      general: { structure: "paragraph", notes: "保留 \\(\\) 包裹。" },
      academic: { structure: "paragraph", notes: "保留 \\(\\) 包裹。" },
    },
  },
  {
    id: "block-bracket",
    title: "块级公式 \\[...\\]",
    category: "math_basic",
    input: "定义约束：\n\\[x \\in \\mathbb{R}^n,\\ \\|x\\|_2 \\le 1\\]\n其中 n 为维度。",
    risk: "\\[ \\] 形式跨行时被截断。",
    expect: {
      general: { structure: "paragraph+paragraph", notes: "保留 \\[\\] 与公式内容。" },
      academic: { structure: "paragraph+paragraph", notes: "保留 \\[\\] 与公式内容。" },
    },
  },
  {
    id: "mixed-multi-math",
    title: "中文正文 + 多公式混排",
    category: "math_complex",
    input:
      "我们先计算 $a_t=\\alpha a_{t-1}+\\epsilon_t$，再根据 \\(p(y|x)\\) 做归一化，最后使用 $$J(\\theta)=\\sum_i\\log p(y_i|x_i)$$ 评估。",
    risk: "多种定界符混排导致匹配错位。",
    expect: {
      general: { structure: "paragraph", notes: "三个公式都应完整保留。" },
      academic: { structure: "paragraph", notes: "三个公式都应完整保留，且不被学术化规则改变。" },
    },
  },
  {
    id: "heading-with-math",
    title: "标题 + 公式",
    category: "math_complex",
    input: "2.2 误差分析 $E=mc^2$",
    risk: "标题识别时误删公式片段。",
    expect: {
      general: { structure: "heading", notes: "保留标题并去编号，公式文本仍在标题内。" },
      academic: { structure: "heading", notes: "保留标题编号与公式文本。" },
    },
  },
  {
    id: "explanatory-list-with-math",
    title: "解释型项目符号 + 公式",
    category: "academic_boundary",
    input:
      "- **损失函数**：采用 $L=\\sum_i(y_i-\\hat{y}_i)^2$，用于衡量预测误差。\n- **约束条件**：要求 $\\|x\\|_2 \\le 1$，避免参数发散。",
    risk: "academic 去黑点时丢失“关键词+解释”层次或破坏公式。",
    expect: {
      general: { structure: "unordered-list", notes: "保留列表外观与公式。" },
      academic: { structure: "paragraphs", notes: "去黑点，保留分项段落与关键词层次，公式原样保留。" },
    },
  },
  {
    id: "short-list-with-math",
    title: "短清单 + 公式",
    category: "academic_boundary",
    input: "- $\\alpha$\n- $\\beta$\n- $\\gamma$",
    risk: "短清单被误转有序或公式被拆坏。",
    expect: {
      general: { structure: "unordered-list", notes: "保留短清单。" },
      academic: { structure: "paragraphs", notes: "去黑点后保留独立分段，不应误转编号。" },
    },
  },
  {
    id: "step-list-with-math",
    title: "步骤流程 + 公式",
    category: "academic_boundary",
    input: "实验步骤：\n- 首先定义 $f(x)=x^2$\n- 然后计算 $\\frac{df}{dx}=2x$\n- 最后记录结果",
    risk: "步骤触发与公式保护冲突，导致公式被改写。",
    expect: {
      general: { structure: "ordered-list", notes: "满足步骤语义，转为有序列表。" },
      academic: { structure: "ordered-list", notes: "显式步骤语义触发有序，公式保持原样。" },
    },
  },
  {
    id: "nested-dirty-bullets-with-math",
    title: "嵌套黑点/空心点脏输入 + 公式",
    category: "academic_boundary",
    input: "• 预处理\n  ◦ 去重：$x_i \\leftarrow x_i - \\bar{x}$\n  ◦ 标准化：$z=\\frac{x-\\mu}{\\sigma}$\n• 建模\n  ◦ 训练：$\\theta_{t+1}=\\theta_t-\\eta\\nabla J$",
    risk: "脏输入扁平化过程中公式丢失或段落混乱。",
    expect: {
      general: { structure: "list-with-nesting", notes: "尽量保留列表感。" },
      academic: { structure: "paragraphs", notes: "MVP 优先去符号并清晰分段，允许不完整保留嵌套层级。" },
    },
  },
];

export const defaultMathAcceptanceSampleId = mathAcceptanceSamples[0]?.id ?? "inline-dollar";
