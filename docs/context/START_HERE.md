# START_HERE

新线程第一入口。目标是 2 分钟内完成上下文接管。

## Project Summary
- 项目：`formatter-tool`
- 作用：把 Markdown/HTML/混合文本整理为稳定的学术/作业文档结构，并支持“复制优化版 + `.docx` 导出”。
- 技术栈：Next.js 16 + React 19 + TypeScript + Vitest + `docx`。

## Current Status
- 当前阶段：MVP 后期收口（稳定性与交接体系完善）。
- 已完成：学术结构模式（academic）已接入主流程，预览/复制/docx 共用同一 `DocumentModel`。
- 当前不做：模板上传、AI 自动写作 Agent、后端服务化。

## Current Top Priority
1. 保持学术结构模式稳定（尤其“单段粘贴 vs 整段粘贴”一致性）。
2. 任何改动都必须保证三端一致：Preview / Clipboard / Docx。
3. 控制需求边界，不提前扩展到“模板上传/AI Agent”。

## Read In This Order
1. [HANDOFF.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/HANDOFF.md)
2. [TASKS.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/TASKS.md)
3. [WORKFLOW.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/WORKFLOW.md)
4. [ARCHITECTURE.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/ARCHITECTURE.md)
5. [DECISIONS.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/DECISIONS.md)
6. [PROJECT_BRIEF.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/PROJECT_BRIEF.md)
7. [UI_STYLE_GUIDE.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/UI_STYLE_GUIDE.md)（仅 UI 任务）
8. 核心代码目录：`src/features/formatter/`

## Important Constraints
- `default` 模板使用 `legacy`；仅 `experiment-report`/`course-paper`/`general-homework` 使用 `academic`。
- 学术模式目标是“目录友好结构”，不是自动插入 Word TOC 字段。
- 规则实现集中在 normalize 阶段；render 层不重复做业务判断。
- UI 当前为收口版本，除非明确需求，不做大改。
- 禁止新增遥测/外部网络依赖。
- 先读代码再写文档，不允许脱离代码现状更新文档。
- 不编造项目目标，目标变更需先更新 `PROJECT_BRIEF.md` 并标注原因。

## Key Directories
- `src/features/formatter/parser`：输入解析
- `src/features/formatter/normalize`：核心规则（最高风险）
- `src/features/formatter/renderers`：clipboard/docx 输出
- `src/components/FormatterTool.tsx`：页面交互与状态反馈
- `tests/formatter`：回归测试
- `docs/context`：跨线程接力文档

## Run / Build / Test Commands
```bash
npm ci
npm run dev
npm run lint
npm test -- --run
npm run build
```

## Definition of Done (Current Work)
- 新增/修改规则后，`npm run lint && npm test -- --run && npm run build` 全通过。
- 至少有 1 条对应测试覆盖变更场景。
- 收尾时必须同步更新 HANDOFF/TASKS（见 [WORKFLOW.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/WORKFLOW.md)）。
