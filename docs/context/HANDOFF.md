# HANDOFF

Related Docs:
- [START_HERE.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/START_HERE.md)
- [TASKS.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/TASKS.md)
- [WORKFLOW.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/WORKFLOW.md)
- [ARCHITECTURE.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/ARCHITECTURE.md)

## Last Updated
- Date: 2026-04-04
- By: Codex
- Scope: 数学公式文本保真 + 半自动验收落地

## Current Objective
在 MVP 阶段把产品主链路稳定在“AI 内容整理 -> 粘贴 WPS -> 标题样式映射/目录生成友好”。

## What Was Completed
- 新增阶段总纲文档 [PRODUCT_PHASES.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/PRODUCT_PHASES.md)，固化：
  - 北极星目标与三阶段边界（A/B/C）
  - Phase B（模板上传 + 智能填充）技术方案骨架
  - 新线程强制阅读顺序
- 模式体系收敛为 `general | academic`，不再暴露多模板入口。
- 类型与主流程完成迁移：
  - `TemplateId/templateId` -> `ModeId/modeId`
  - `formatInput/parseInput/meta` 全链路改为模式驱动
- `normalize` 行为收敛：
  - 模式差异仅保留两项：标题编号策略、无序转有序触发策略
  - 不再全量强转无序列表，改为“分项表达规范化策略”（`explicit_step_only` / `step_or_sequence`）
  - 学术模式对非步骤型无序项默认去黑点，规范为分项正文段落
  - 解释型项目符号保留关键词+解释层次；清单型短项保留独立分段
  - 嵌套脏输入当前 MVP 优先可读性（允许扁平化）
- 新增高风险误判回归测试：
  - 短说明 + 单个时序词（防误编号）
  - 标题 + 嵌套黑点混排（academic 去符号后分段稳定）
  - 解释型 + 清单型混合列表（防整组误处理）
  - 单项/两项边界列表（防过度推断）
  - LaTeX/数学符号列表项（防误清洗/误拆分）
- 默认策略集中到 `src/features/formatter/config/policies.ts`（normalize/paste/docx）。
- clipboard 命名与职责拆分：
  - 渲染：`renderClipboardPayload`
  - 写入：`writeClipboardPayload`
  - 组合调用：`copyOptimizedToClipboard`
- UI 收敛为双模式入口，隐藏高级开关，文案改为“更适合 WPS 标题样式映射与目录生成的结构”。
- 数学公式文本保真主链路落地（非渲染）：
  - 保护定界符：`$...$`、`$$...$$`、`\\(...\\)`、`\\[...\\]`
  - `parser/normalize` 接入保护，避免学术化清洗误伤公式
  - `DocumentMeta.math` 输出 `detected/spanCount/protectionApplied`
- 新增固定样本库：`src/features/formatter/dev-samples/math-acceptance-samples.ts`。
- 新增开发验收页：`/dev/formatter-acceptance`（样本切换、模式切换、预览、clipboard html/text、doc 摘要、导出 docx、math 识别统计）。
- 新增自动化回归：`tests/formatter/math-preservation.test.ts`，覆盖公式基础/复杂/学术边界冲突场景。
- 全量验证已通过：`npm run lint`、`npm test -- --run`、`npm run build`。

## Key Files
- `src/features/formatter/config/policies.ts`（策略集中配置）
- `src/features/formatter/normalize/index.ts`（模式差异核心实现）
- `src/features/formatter/paste.ts`（按当前模式做粘贴投影）
- `src/features/formatter/model/types.ts`（`ModeId` 与策略类型）
- `src/features/formatter/math/preservation.ts`（公式占位保护）
- `src/features/formatter/renderers/clipboard.ts` + `src/features/formatter/clipboard.ts`（渲染/写入职责拆分）
- `src/features/formatter/dev-samples/math-acceptance-samples.ts`（固定验收样本）
- `src/app/dev/formatter-acceptance/page.tsx`（半自动验收页）
- `tests/formatter/math-preservation.test.ts`、`tests/formatter/academic-structure.test.ts`、`tests/formatter/paste.test.ts`（回归）
- `src/components/FormatterTool.tsx`（双模式 UI）

## Important Context
- 真实用户反馈显示：整段粘贴常可识别，但“只粘贴某段”更容易丢层级。
- 当前策略优先稳健性和可交付性，不追求一次性覆盖所有语言/文体变体。
- 项目仍是前端本地工具形态，尚未进入“模板上传 + AI Agent”阶段。

## Key Decisions Made Recently
- MVP 只保留 `general | academic` 双模式入口。
- 分项表达规范化必须语义触发，不做全量强转。
- 学术模式默认去网页式黑点外观（步骤型除外），统一为分项正文表达。
- 模式差异严格限制为两项，不继续扩张。
- 不自动生成 Word TOC 字段，维持“目录友好结构”目标。

## Outstanding Work
- 人工 WPS/Word 最小验收（仅保留必要项）：
  - Heading 1-3 映射后目录生成是否稳定；
  - academic 去黑点后的分项段落粘贴观感是否符合论文正文习惯；
  - 含公式样本在“预览/复制/docx”与 WPS/Word 粘贴结果是否一致。
- 持续积累真实用户输入到固定样本库，优先补“误判高风险样本”。
- 评估 docx 端是否需要后续引入真正数学对象（当前不在 MVP）。

## Risks / Caveats
- `normalize/index.ts` 规则集中、耦合较高；改动容易牵一发动全身。
- 步骤语义识别是启发式规则，不是 NLP 语义理解，仍有边界误差。
- 当前 `.docx` 有序列表仍为显式编号前缀方案，不依赖 Word 多级编号样式。
- 当前“数学公式”是文本保真，不是公式渲染；WPS/Word 内显示效果仍依赖粘贴/字体/环境。

## Recommended Next Step
1. 新线程先按 `START_HERE -> PRODUCT_PHASES -> HANDOFF -> TASKS` 接管上下文。
2. 先看 [TASKS.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/TASKS.md) 的 `Now`。
3. 先补测试，再改 `normalize`，最后跑 `lint + test + build`。
4. 每次行为变化都更新 `DECISIONS.md` 与 `HANDOFF.md`。

## Handoff Checklist (每次收尾必做)
1. 更新 `Last Updated`、`What Was Completed`、`Outstanding Work`。
2. 同步更新 [TASKS.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/TASKS.md) 的 `Now/Next`。
3. 如有新决策，补充到 `DECISIONS.md`。
