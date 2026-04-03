# ARCHITECTURE

## 总体流程
`输入 -> 解析(parse) -> 归一化(normalize) -> 渲染(render) -> 输出`

## 关键模块
1. 解析层：`src/features/formatter/parser/*`
2. 归一化层：`src/features/formatter/normalize/index.ts`
3. 渲染层：
   - 复制：`src/features/formatter/renderers/clipboard.ts`
   - 导出：`src/features/formatter/renderers/docx.ts`
4. 粘贴策略：`src/features/formatter/paste.ts`
5. 模板配置：`src/features/formatter/templates/index.ts`

## 数据模型
核心模型在 `src/features/formatter/model/types.ts`：
1. `DocumentModel`：完整文档。
2. `BlockNode`：`heading/paragraph/list/blockquote/preformatted/table`。
3. `InlineNode`：`text/lineBreak`。

## 行为约束
1. 解析器负责“尽量还原结构”，不做模板语义判断。
2. normalize 负责“结构清洗 + 规则修复 + 模式转换”。
3. render 层只消费统一 `DocumentModel`，不重复实现业务规则。

## 当前重构重点
学术结构模式（academic）：
1. 只在学术模板启用。
2. 标题编号映射 Heading 1-3。
3. 无序列表向有序子项统一，保证作业风格一致。
