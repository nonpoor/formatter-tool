# formatter feature module

模块路径：`src/features/formatter`

## 模块职责
负责从原始输入到结构化输出的完整业务链路：
- 解析输入（Markdown/HTML/Plain）
- 归一化与结构修复（通用 / 学术双模式）
- 渲染复制内容与 docx
- 模式策略与流程编排

## 入口与主流程
- 入口文件：[index.ts](/Users/nonpoor/coding/排版转换/formatter-tool/src/features/formatter/index.ts)
- 主流程：`parseInput -> normalizeDocument -> renderClipboardPayload/renderDocx`

## 目录速览
- `parser/`：输入解析与来源识别
- `normalize/`：规则核心（高风险）
- `renderers/`：输出层
- `config/policies.ts`：默认策略与模式差异集中配置
- `model/`：类型定义
- `paste.ts`：粘贴策略选择
- `clipboard.ts`：浏览器剪贴板写入

## 关键依赖关系
1. `index.ts` 读取模式策略并决定 normalize 行为。
2. `normalize` 负责规则语义；render 层只做模型映射。
3. `paste.ts` 会调用 `formatInput` + `renderClipboardPayload` 做结构评分与投影。

## 当前状态
- 双模式已启用：`general` 与 `academic`。
- MVP 阶段模式差异仅保留：标题编号策略、无序转有序触发策略。
- 覆盖测试位于 `tests/formatter/*`，含 `academic-structure.test.ts`。

## 修改注意事项
1. 优先改 `normalize`，不要把规则散落到 renderer。
2. 改规则前先写/改测试样本，防止回归。
3. 若调整模式行为，同步更新 `config/policies.ts` 与文档。
4. 任何输出变化都要同时检查 preview、clipboard、docx。

## 常见坑
- 单段粘贴可能缺少完整上下文，容易触发边界识别问题。
- 标题识别是启发式规则，阈值过松会误判正文。
- `normalize/index.ts` 文件较大，改动时建议小步提交。
