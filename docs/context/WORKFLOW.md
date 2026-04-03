# WORKFLOW

Related Docs:
- [START_HERE.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/START_HERE.md)
- [HANDOFF.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/HANDOFF.md)
- [TASKS.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/TASKS.md)
- [PROJECT_BRIEF.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/PROJECT_BRIEF.md)

## Session Start (强制)
1. 先读代码再写文档
- 至少阅读本次任务相关源码文件后，才允许更新文档。
- 文档内容必须可追溯到当前代码或已有决策记录。

2. 不编造项目目标
- 项目目标以 `PROJECT_BRIEF.md` 为准。
- 若发现目标不清楚，先在文档中标注 `Need Verification`，不要自行虚构。

3. 启动阅读顺序
- `START_HERE -> HANDOFF -> TASKS -> ARCHITECTURE -> DECISIONS`

## Session Execution
1. 代码行为变更先补测试，再改实现，再验证。
2. 出现新决策或范围变化时，同步更新 `DECISIONS.md`。
3. 若任务涉及 UI，必须同时检查 `UI_STYLE_GUIDE.md`。

## Session Close (自动交接流程，强制)
每次任务结束都必须执行以下步骤，视为默认自动流程：
1. 更新 `HANDOFF.md`
- 写清本次目标、已完成内容、关键文件、剩余工作、风险。

2. 更新 `TASKS.md`
- 至少同步 `Now/Next`，移除已完成项，加入新待办和阻塞项。

3. 运行最小验证
- 文档变更：至少检查链接和状态一致性。
- 代码变更：执行 `npm run lint && npm test -- --run && npm run build`。

4. 交班输出
- 在回复中给出：变更摘要、验证结果、下一步建议。

## Need Verification
- “自动更新”目前是流程约束（由 AI 在收尾时执行），尚未实现为 Git hook 或 CI 自动化。
