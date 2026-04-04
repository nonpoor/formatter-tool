# TASKS

Related Docs:
- [HANDOFF.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/HANDOFF.md)
- [WORKFLOW.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/WORKFLOW.md)
- [DECISIONS.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/DECISIONS.md)
- [ARCHITECTURE.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/ARCHITECTURE.md)

## Now
1. 新线程对齐机制固化（高优先）
- 目标：任何新线程先读阶段总纲，保证 AI 对项目愿景与阶段边界理解一致。
- 位置：`docs/context/PRODUCT_PHASES.md`、`docs/context/START_HERE.md`。
- 验收标准：`START_HERE` 阅读顺序已前置 `PRODUCT_PHASES`，并在 HANDOFF 中可追溯。

2. 数学公式文本保真回归（高优先）
- 目标：确保常见 LaTeX 公式在 `general | academic | preview | clipboard | docx` 链路中不被破坏（当前不做渲染承诺）。
- 位置：`src/features/formatter/math/preservation.ts`、`src/features/formatter/normalize/index.ts`、`tests/formatter/math-preservation.test.ts`。
- 验收标准：`$...$`、`$$...$$`、`\\(...\\)`、`\\[...\\]` 样本稳定通过，学术模式去黑点规则不误伤公式。
- 进度：已完成并通过全量测试。

3. 半自动验收流固化（高优先）
- 目标：降低人工找样本成本，固定“样本库 + 调试页 + 自动化”流程。
- 位置：`src/features/formatter/dev-samples/math-acceptance-samples.ts`、`src/app/dev/formatter-acceptance/page.tsx`。
- 验收标准：可切换样本/模式，查看预览、clipboard html/text、doc 摘要、math spans 统计并导出 docx。
- 进度：已完成首版，可直接用于日常验收。

4. 交接文档一致性维护（高优先）
- 目标：代码状态和文档状态同步，避免新线程误判。
- 位置：`docs/context/*`。
- 验收标准：最新决策、样本入口、验收方式都可在 HANDOFF + DECISIONS 中追溯。

## Next
1. 最少人工 WPS/Word 验收执行
- 目标：仅保留必须人工验证的 3 类检查（目录映射、学术段落观感、公式粘贴后文本保真）。
- 验收标准：形成可复用的短清单并记录结果，不再大范围手工找样本。

2. 输入样本库持续扩充
- 目标：沉淀真实作业样本覆盖误判边界（尤其“短时序词”“脏嵌套+公式”“标题+列表+公式混排”）。
- 验收标准：新增样本可进入自动化测试或调试页，且附带风险点说明。

## Later
1. 模板上传与映射（未来功能，不在当前冲刺）
- 验收标准：有独立 PRD/设计文档，不影响现有 MVP 主链路。

2. AI 辅助模块（未来功能）
- 验收标准：明确边界（仅建议/仅填充/全自动）并完成安全策略评审。

## Blockers
- 目前无硬阻塞。
- 潜在软阻塞：缺少持续沉淀的真实用户样本库，可能影响规则优化效率。

## Nice to Have
1. 补充“问题样本 -> 预期结构 -> 实际结构”可视化调试页（仅开发态）。
2. 为 `normalize` 大文件拆分子模块（在功能稳定后进行，避免边改边拆导致风险叠加）。
