# formatter-tool

把 AI/网页复制内容整理成更稳定的 Word/WPS 兼容格式工具。  
当前重点是“作业与论文场景”的结构化输出：更稳的标题层级、列表、表格，以及目录友好导出。

仓库地址：[https://github.com/nonpoor/formatter-tool](https://github.com/nonpoor/formatter-tool)

## 当前能力

1. 输入识别：Markdown / HTML / 混合 / 纯文本。  
2. 结构归一化：标题、段落、列表、引用、代码块、表格。  
3. 粘贴策略：
   - 默认优先 `text/plain`；
   - 当 `text/html` 结构明显更完整时，自动采用 HTML 投影纯文本，减少“单段复制丢层级”。
4. 输出：
   - 复制优化版（HTML + 纯文本）
   - 导出 `.docx`
5. 学术结构模式（academic）：
   - 仅在学术模板启用（`experiment-report`、`course-paper`、`general-homework`）
   - 章节编号识别为标题层级（Heading 1-3）
   - 无序列表统一为有序子项，便于作业风格一致与目录整理
   - 作用于预览 / 复制 / 导出三端一致

## 模板行为差异

| 模板 | 结构模式 | 说明 |
|---|---|---|
| `default` | `legacy` | 兼容模式，保留通用行为 |
| `experiment-report` | `academic` | 学术结构化 |
| `course-paper` | `academic` | 学术结构化 |
| `general-homework` | `academic` | 学术结构化 |

说明：当前不自动插入 Word 目录字段（TOC），但会输出可用于目录生成的标题样式（Heading 1-3）。

## 项目结构

```text
src/
  app/                      Next.js 页面入口
  components/               UI 组件
  features/formatter/
    parser/                 输入解析
    normalize/              结构清洗与重排
    renderers/              clipboard/docx 渲染
    templates/              模板配置（含 structureMode）
tests/formatter/            回归测试
docs/context/               项目上下文与交接文档
```

## 本地运行

```bash
npm ci
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 质量检查

```bash
npm run lint
npm test -- --run
npm run build
```

## 快速分享给朋友（不需要 clone）

先启动本地服务：

```bash
npm run dev
```

另开终端映射公网（任选其一）：

```bash
# 推荐
cloudflared tunnel --url http://localhost:3000

# 或
npx localtunnel --port 3000

# 或
ngrok http 3000
```

注意：
1. 你电脑要保持开机，隧道和 `dev` 进程不能退出。  
2. 临时链接可能变化，不适合作长期稳定地址。  
3. 不要用于敏感数据处理。

## 长期部署（推荐）

建议直接部署到 Vercel：
1. 导入 GitHub 仓库。  
2. 使用默认 Next.js 配置一键部署。  
3. 获得固定线上地址供朋友长期使用。

## 跨线程协作（Codex 推荐）

新线程开始前，先阅读：

1. `docs/context/START_HERE.md`
2. `docs/context/HANDOFF.md`
3. `docs/context/TASKS.md`
4. `docs/context/WORKFLOW.md`
5. `docs/context/ARCHITECTURE.md`
6. `docs/context/DECISIONS.md`
7. `docs/context/PROJECT_BRIEF.md`
8. `docs/context/ROADMAP.md`
9. `docs/context/UI_STYLE_GUIDE.md`（涉及 UI 时）

项目级 AI 规则位于 `AGENTS.md`，用于约束“先读代码再写文档、不要编造目标、收尾自动更新 HANDOFF/TASKS”。

这样可以在有限上下文下持续推进同一项目，不丢决策与进度。
