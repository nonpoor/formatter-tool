# ARCHITECTURE

Related Docs:
- [PROJECT_BRIEF.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/PROJECT_BRIEF.md)
- [DECISIONS.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/DECISIONS.md)
- [src/features/formatter/README.md](/Users/nonpoor/coding/排版转换/formatter-tool/src/features/formatter/README.md)

## 整体架构
主链路：`Input -> Parse -> Normalize -> Render -> Output`

- 输入层：`src/components/FormatterTool.tsx`
- 核心流程入口：`src/features/formatter/index.ts`
- 输出形态：
  - 预览（React 渲染）
  - 复制（受控 HTML + plain text）
  - `.docx`（docx 库）

## 关键模块与职责
1. Parser（`src/features/formatter/parser/*`）
- 职责：按来源类型将原始文本投影为 `DocumentModel.blocks`。
- 原则：尽可能保留结构，不做模式语义决策。

2. Normalize（`src/features/formatter/normalize/index.ts`）
- 职责：清洗空白、修复松散列表、学术结构化转换。
- 原则：规则统一入口，行为变化优先在这里实现。
- 风险：该文件较大且规则耦合高，是主要回归风险点。

3. Renderers（`src/features/formatter/renderers/*`）
- `clipboard.ts`：输出白名单 HTML + 纯文本。
- `docx.ts`：将 `DocumentModel` 映射到 Word 结构（Heading 1-3、段落、表格等）。
- 原则：只消费模型，不新增业务判断。

4. Policies（`src/features/formatter/config/policies.ts`）
- 职责：集中定义默认策略与模式差异（`general | academic`）。
- 现状：MVP 阶段模式差异仅保留标题编号策略与无序转有序触发策略。

5. Paste Strategy（`src/features/formatter/paste.ts`）
- 职责：决定 `plain` 与 `html` 的粘贴优先策略。
- 现状：当 HTML 结构评分显著更好时，默认模式可使用 HTML 投影纯文本。

## 核心数据模型
定义于 `src/features/formatter/model/types.ts`：
- `DocumentModel`：统一文档模型，所有渲染端共享。
- `BlockNode`：`heading | paragraph | list | blockquote | preformatted | table`。
- `NormalizeOptions`：含 `modeId`、`headingNumbering`、`itemExpressionPolicy` 覆盖入口。

## 目录结构（关键）
- `src/app`：Next.js 页面入口
- `src/components`：页面组件与交互
- `src/features/formatter`：业务核心
- `tests/formatter`：回归测试
- `docs/context`：跨线程上下文文档

## 数据流与状态流
1. 用户在 `FormatterTool` 输入/粘贴文本。
2. `resolvePastedInput` 选择输入模式。
3. `formatInput` 调 `parseInput` 得到初始模型。
4. `normalizeDocument` 应用修复/学术结构规则。
5. 预览直接渲染模型；复制与导出分别调用 renderer。

## 高耦合与谨慎修改区域
1. `normalize/index.ts`
- 影响面：标题识别、列表识别、学术模式转换。
- 修改建议：先补测试，再改逻辑，再跑全量验证。

2. `renderers/docx.ts`
- 影响面：Word 可读性与目录可生成性。
- 修改建议：与 Word/WPS 实际打开效果联合验证。

3. `paste.ts`
- 影响面：单段粘贴与整段粘贴一致性。
- 修改建议：优先通过样本回归确认策略收益。

## 核心依赖
- `docx`：`.docx` 生成
- `unified` + `remark-parse` + `remark-gfm`：Markdown 解析
- `parse5`：HTML 解析
- `vitest`：测试
