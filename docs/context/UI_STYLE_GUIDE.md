# UI_STYLE_GUIDE

Related Docs:
- [START_HERE.md](/Users/nonpoor/coding/排版转换/formatter-tool/docs/context/START_HERE.md)
- [src/components/FormatterTool.tsx](/Users/nonpoor/coding/排版转换/formatter-tool/src/components/FormatterTool.tsx)
- [src/components/FormatterTool.module.css](/Users/nonpoor/coding/排版转换/formatter-tool/src/components/FormatterTool.module.css)

## 视觉方向
- 关键词：简约、克制、轻玻璃质感、苹果风格微动效。
- 目标：信息优先，不炫技，不牺牲可读性。

## 设计基线（来自现有实现）
- 容器宽度：`min(1120px, 92vw)`。
- 间距节奏：以 `12 / 18 / 24` 为主。
- 圆角层级：按钮胶囊、面板大圆角（20+）。
- 色彩语义：
  - 中性：灰蓝体系
  - 成功：绿色体系
  - 失败：红色体系

## 组件复用原则
1. 按钮语义固定三类：`primary`、`secondary`、`ghost`。
2. 状态反馈必须可见：文案变化 + 底部状态条（`aria-live`）。
3. 新控件优先复用已有 class，避免并行造轮子。

## 排版与层级
- 标题层级：页面主标题 > 卡片标题 > 内容正文。
- 文本区行高保持舒适（当前正文约 `1.72~1.75`）。
- 预览区与输入区视觉区分明确，但不使用强对比刺眼配色。

## 交互规范
1. 关键操作要有即时反馈。
2. `busy` 时相关按钮禁用，避免重复触发。
3. hover/active 动效短而克制（约 `150-220ms`）。
4. 避免长链路动画和无意义运动。

## 响应式规范
- 必须验证桌面与移动端（现有断点约 `780px`）。
- 移动端允许布局折行，但不能丢失主操作可达性。

## 新增页面/组件时必须遵守
1. 先在 PR 描述写明“与现有风格如何对齐”。
2. 不引入与主页面冲突的第二视觉语言。
3. 如果必须扩展设计语言，先更新本文件再改代码。

## 风格参考源
- 结构参考：`FormatterTool.tsx`
- 样式参考：`FormatterTool.module.css`
- 页面基础：`src/app/globals.css`
