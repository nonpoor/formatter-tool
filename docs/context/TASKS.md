# TASKS

Related Docs:
- [HANDOFF.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/HANDOFF.md)
- [DECISIONS.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/DECISIONS.md)
- [ARCHITECTURE.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/ARCHITECTURE.md)

## Now
1. 学术结构边界回归（高优先）
- 目标：降低“抽取单段粘贴时层级失真”的概率。
- 位置：`tests/formatter/academic-structure.test.ts`、`tests/formatter/paste.test.ts`。
- 验收标准：新增样本可复现旧问题，并在修复后稳定通过。

2. 交接文档一致性维护（高优先）
- 目标：代码状态和文档状态同步，避免新线程误判。
- 位置：`docs/context/*`。
- 验收标准：最近一次改动可在 HANDOFF + DECISIONS 中找到记录。

## Next
1. `.docx` 输出结构增强评估
- 目标：评估是否需要引入更标准的 Word 编号样式（当前为文本编号前缀）。
- 验收标准：给出兼容性结论与是否实施的决策记录。

2. 输入样本集扩充
- 目标：沉淀真实作业样本作为回归集，覆盖中文编号、混合符号、表格混排。
- 验收标准：样本可自动化复测，且包含至少 10 组高价值样本。

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
