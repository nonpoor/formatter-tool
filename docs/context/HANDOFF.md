# HANDOFF

## 当前状态（最新）
- 日期：2026-04-03
- 分支：`main`
- 最近已推送提交：
  1. `5b8484d` feat: improve parser robustness and polish formatter UI
  2. `3f783c5` docs: add usage guide and public sharing instructions

## 进行中的工作（未提交）
当前工作区改动：
1. `src/features/formatter/index.ts`
2. `src/features/formatter/model/types.ts`
3. `src/features/formatter/normalize/index.ts`
4. `src/features/formatter/templates/index.ts`
5. `tests/formatter/academic-structure.test.ts`

对应目标：学术结构化重构方案落地（目录友好版）。

## 已验证
在当前会话内，学术重构改动已通过：
1. `npm test -- --run`（32/32）
2. `npm run lint`
3. `npm run build`

## 下一步建议（执行顺序）
1. 基于真实作业样本再补 2-3 个学术标题边界测试。
2. 确认 academic 模式下不会误判正文短句为标题。
3. 提交并推送学术重构改动。
4. 更新 `DECISIONS.md` 与 `README` 的学术模式说明。

## 新线程启动指令（复制即用）
请在新线程第一条消息直接使用：

```text
请先阅读以下文件并总结当前状态，再继续实现：
1) docs/context/PROJECT_BRIEF.md
2) docs/context/ARCHITECTURE.md
3) docs/context/DECISIONS.md
4) docs/context/ROADMAP.md
5) docs/context/HANDOFF.md

目标：继续推进“学术结构化重构（目录友好）”，不要做模板上传和AI Agent功能。
先给出你将修改的文件与验证命令，然后再开始改代码。
```
