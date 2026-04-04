# ROADMAP

Related Docs:
- [PROJECT_BRIEF.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/PROJECT_BRIEF.md)
- [PRODUCT_PHASES.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/PRODUCT_PHASES.md)
- [TASKS.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/TASKS.md)

## 近期（当前阶段：MVP 收口）
1. 学术结构稳定性回归
- 目标：单段粘贴/整段粘贴输出一致性更高。
- 结果标准：关键样本集下无明显结构退步。

2. 交接文档体系固化
- 目标：新线程 2-5 分钟可接手。
- 结果标准：按 `START_HERE -> HANDOFF -> TASKS` 可直接进入开发。

3. 发布准备
- 目标：形成可演示、可分享版本。
- 结果标准：`lint + test + build` 持续通过，README 可独立指导使用。

## 中期（下一阶段）
1. 样本驱动规则优化
- 建立真实样本回归库，迭代 normalize 规则阈值。

2. `.docx` 结构体验增强
- 评估更标准的 Word 编号/样式能力，保证兼容性前提下升级。

3. 轻量部署体验完善
- 优化公开使用说明（Vercel、临时隧道、风险提示）。

4. 模板上传 + 智能填充设计落地
- 先以 `TemplateSchema + FillPlan` 轻量架构验证模板映射可行性（详见 `PRODUCT_PHASES.md` 的 Phase B 草案）。

## 后期（明确延后）
1. 模板上传与模板映射
2. AI 辅助问答/填充模块
3. Agent 化自动作业工作流

## 范围边界（防跑偏）
- 在“近期阶段”结束前，不进入模板上传和 AI Agent 开发。
- 若要进入后期项，必须先新增独立设计文档并确认里程碑切换。

## Need Verification
- 是否将“模板上传”作为下一阶段第一优先，需要结合真实用户样本与交付节奏再确认。
