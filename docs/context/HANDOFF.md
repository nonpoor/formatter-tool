# HANDOFF

Related Docs:
- [START_HERE.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/START_HERE.md)
- [TASKS.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/TASKS.md)
- [WORKFLOW.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/WORKFLOW.md)
- [ARCHITECTURE.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/ARCHITECTURE.md)

## Last Updated
- Date: 2026-04-04
- By: Codex
- Scope: GitHub 推送 + 分支建立 + 交接流程固化

## Current Objective
把项目从“单线程上下文驱动”切换为“仓库内可长期维护的交接文档驱动”，让新 AI 线程 2-5 分钟接手。

## What Was Completed
- 学术结构模式已落地并合入主分支：
  - 学术模板启用 `structureMode: academic`
  - 标题编号映射 Heading 1-3
  - 无序列表在学术模板内统一为有序列表
  - Preview / Clipboard / Docx 共用统一模型
- 粘贴策略增强：当 HTML 结构显著更完整时，默认模式可采用 HTML 投影纯文本。
- UI 已完成一次收口（含复制反馈状态按钮）。
- 基础上下文文档已建立（本次继续重构为三层体系）。
- 新增 `docs/context/WORKFLOW.md` 与仓库级 `AGENTS.md`，固化“先读代码再写文档 + 收尾自动交接”流程。

## Key Files
- `src/features/formatter/normalize/index.ts`（学术规则核心）
- `src/features/formatter/paste.ts`（粘贴输入优先策略）
- `src/features/formatter/model/types.ts`（`structureMode` 类型）
- `src/features/formatter/templates/index.ts`（模板与模式映射）
- `tests/formatter/academic-structure.test.ts`（学术模式主回归）
- `src/components/FormatterTool.tsx`（页面操作与状态反馈）

## Important Context
- 真实用户反馈显示：整段粘贴常可识别，但“只粘贴某段”更容易丢层级。
- 当前策略优先稳健性和可交付性，不追求一次性覆盖所有语言/文体变体。
- 项目仍是前端本地工具形态，尚未进入“模板上传 + AI Agent”阶段。

## Key Decisions Made Recently
- 继续坚持“学术结构优先”方向，停止纠结圆点保留。
- `default` 保持兼容行为，学术模板才启用强规则，降低回归风险。
- 不自动生成 Word 目录字段，只保证 heading 样式可用于 Word 一键目录。

## Outstanding Work
- 用真实样本继续压测“单段粘贴”边界，减少误判与漏判。
- 持续收敛 `normalize` 的标题识别阈值（短句误判风险）。
- 完善发布/部署说明与对外使用路径（本地隧道、Vercel）。

## Risks / Caveats
- `normalize/index.ts` 规则集中、耦合较高；改动容易牵一发动全身。
- 学术标题识别是启发式规则，不是 NLP 语义理解，天然存在边界误差。
- 当前 `.docx` 有序列表为显式编号前缀方案，不依赖 Word 多级编号样式。

## Recommended Next Step
1. 先看 [TASKS.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/TASKS.md) 的 `Now`。
2. 先补测试，再改 `normalize`，最后跑 `lint + test + build`。
3. 每次行为变化都更新 `DECISIONS.md` 与 `HANDOFF.md`。

## Handoff Checklist (每次收尾必做)
1. 更新 `Last Updated`、`What Was Completed`、`Outstanding Work`。
2. 同步更新 [TASKS.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/TASKS.md) 的 `Now/Next`。
3. 如有新决策，补充到 `DECISIONS.md`。
