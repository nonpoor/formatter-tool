# PROJECT_BRIEF

Related Docs:
- [START_HERE.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/START_HERE.md)
- [PRODUCT_PHASES.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/PRODUCT_PHASES.md)
- [ARCHITECTURE.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/ARCHITECTURE.md)
- [ROADMAP.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/ROADMAP.md)

## 项目要解决的问题
用户把 AI、网页、文档片段复制到 Word/WPS 时，常出现标题层级丢失、列表错乱、段落混排、表格失真。这个项目通过统一解析与归一化，把输入转为可复制/可导出的稳定结构，减少手工排版成本。

## 目标用户与场景
- 学生：课程论文、实验报告、通用作业。
- 内容整理者：将 AI 输出快速转为可交付文档。
- 高频场景：中文内容 + 混合来源粘贴 + 需要生成目录的作业格式。

## 当前范围（In Scope）
- 输入：Markdown / HTML / 混合 / 纯文本。
- 结构：标题、段落、列表、引用、代码块、表格。
- 输出：
  - 复制优化版（HTML + 纯文本）
  - `.docx` 导出
- 双模式（general / academic）：目录友好的层级输出与兼容性平衡。

## 当前非目标（Out of Scope）
- 模板上传与复杂模板映射。
- AI 自动写作/全自动作业 Agent。
- 云端账户系统、多人协作、在线数据库。
- 自动插入 Word TOC 字段。

## 产品层面核心原则
1. 稳定优先：优先降低“格式退步”而不是追求激进转换。
2. 三端一致：Preview / Clipboard / Docx 必须基于同一结构模型。
3. 模式收敛：MVP 只保留 `general` 与 `academic`，避免多模板扩张。
4. 可验证：每个行为变化应有测试和文档记录。
5. 边界清晰：当前阶段不扩展到 AI Agent 产品化实现。

## 当前开发阶段
- 阶段：MVP 后期收口。
- 重点：学术结构稳定性、回归防退化、文档交接体系。
- 发布目标：在真实作业样本下维持稳定输出后进入下一阶段。
- 阶段细化与切换闸门：见 [PRODUCT_PHASES.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/PRODUCT_PHASES.md)。
