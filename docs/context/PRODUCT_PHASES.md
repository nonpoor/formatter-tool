# PRODUCT_PHASES

Related Docs:
- [START_HERE.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/START_HERE.md)
- [PROJECT_BRIEF.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/PROJECT_BRIEF.md)
- [ROADMAP.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/ROADMAP.md)
- [DECISIONS.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/DECISIONS.md)

## 文档目的
- 固化产品长期愿景、阶段边界与切换闸门。
- 让新线程中的任何 AI 在最短时间内理解“现在做什么、暂时不做什么”。
- 防止需求漂移与“做了一半才发现走错方向”。

## 北极星目标
把“大学生从 AI 生成内容到可提交 WPS 报告”的流程，从高重复手工排版，收敛为可控、可复用、可验证的自动化流程。

## 用户核心痛点
1. 浏览器问 AI 与 WPS 来回切换，搬运成本高。
2. 标题、正文、分项结构不规范，目录生成成本高。
3. 各学校模板差异大，人工套模板耗时且易错。

## 分阶段路线

### Phase A（当前）：结构规范化 MVP
- 目标：把粘贴内容整理为更适合 WPS 标题样式映射与目录生成的结构。
- 当前主线：
  - 双模式 `general | academic`。
  - Preview / Clipboard / Docx 共用同一 DocumentModel。
  - 学术模式弱化网页式黑点，保留标题层级与目录友好性。
  - 数学公式当前阶段目标是“文本保真”，非渲染支持。
- 当前不做：
  - 模板上传与模板映射。
  - AI 自动写作 Agent。
  - 复杂后端服务化。

### Phase B（下一阶段）：模板上传 + 智能填充
- 目标：用户上传实验报告/课程论文模板，系统将规范化内容映射到模板并导出 Word。
- 成功标准：
  - 主流模板可稳定完成“标题 + 正文 + 分项”自动填充。
  - 失败时能回退为可编辑结果，不输出不可用文档。

### Phase C（最终）：可插拔模型 Agent 工作台
- 目标：支持用户 API Key 或本地模型，实现“提问生成 + 模板填充 + 导出”闭环。
- 成功标准：用户不再需要频繁在浏览器与 WPS 之间手工搬运排版。

## Phase B 技术方案骨架（Draft）

### B1. 核心原则
1. AI 负责语义匹配与内容生成，规则负责硬约束与兜底校验。
2. 不新增第三种基础模式；仍以 `general | academic` 为基础输入策略。
3. 不绕开现有 DocumentModel 主链路，模板填充应消费结构化结果而非原始脏文本。

### B2. 建议模块拆分
1. `template-ingestion`
- 解析用户上传模板（docx）中的结构锚点、样式信息与可填充区域。
- 输出：`TemplateSchema`（轻量结构，不直接绑定具体模型）。

2. `content-planning`
- 输入：用户原始需求 + 规范化文档结构 + 模板 Schema。
- 输出：`FillPlan`（槽位映射计划，包含置信度与回退策略）。

3. `content-generation`
- AI 生成或重写内容，满足模板槽位约束（长度、语气、段落结构）。
- 输出：结构化段落而非纯长文本。

4. `template-fill`
- 按 `FillPlan` 将内容写入模板并导出 docx。
- 保留必要样式映射，避免破坏模板原有格式基线。

5. `post-validate`
- 校验标题层级、目录友好性、空槽位、异常长度、公式文本保真。
- 输出：通过 / 警告 / 失败与原因。

### B3. 建议数据结构（轻量）
1. `TemplateSchema`
- `sections`: 模板章节定义（标题、层级、样式引用）
- `slots`: 可填充槽位（类型、约束、是否必填）
- `styleRefs`: 与 WPS/Word 样式相关的标识

2. `FillPlan`
- `slotId -> source` 映射（来自输入内容、AI 生成或人工补全）
- `confidence`（低置信度项要求用户确认）
- `fallback`（缺内容时的退化策略）

### B4. 执行流程（建议）
1. 用户上传模板 -> 解析成 `TemplateSchema`。
2. 用户粘贴原始内容 -> 进入现有 formatter 主链路得到 `DocumentModel`。
3. 规划器生成 `FillPlan`（可带 AI）。
4. 执行填充并导出 docx。
5. 运行后置校验并返回“可直接提交 / 需人工确认”的状态。

### B5. 风险与主动取舍
1. 模板异构极强，不能承诺首次实现就 100% 全自动命中。
2. Phase B 初期优先“高频模板族”而不是“全量模板泛化”。
3. 对低置信度映射保留人工确认点，避免静默错误。

### B6. MVP 到 Phase B 的切换闸门（Go / No-Go）
1. 当前主链路稳定：`npm run lint && npm test -- --run && npm run build` 持续通过。
2. 关键边界样本集（含公式、学术分项）回归稳定。
3. 有至少一批真实模板样本可用于迭代，不再只依赖假设。

## 全阶段约束（长期有效）
1. 不宣称“任意环境 100% 自动生成目录”。
2. 公式能力当前表述为“文本保真”，不是“公式渲染支持”。
3. 任何行为变更都必须有测试与文档记录。
4. 任务收尾必须更新 `HANDOFF.md` 与 `TASKS.md`。

## 新线程要求（强制）
新线程接手时，必须先阅读：
1. [START_HERE.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/START_HERE.md)
2. [PRODUCT_PHASES.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/PRODUCT_PHASES.md)
3. [HANDOFF.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/HANDOFF.md)
4. [TASKS.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/TASKS.md)

## Need Verification
- Phase B 起始里程碑是否“模板上传优先于 AI 生成器细化”，需要结合真实模板样本数量再确认。
