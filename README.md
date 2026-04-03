# formatter-tool

把 AI 网页内容整理成更稳定的 Word/WPS 兼容格式的工具。  
重点解决“复制后列表乱掉、编号丢失、圆点识别不稳、表格变形”等问题。

仓库地址：[https://github.com/nonpoor/formatter-tool](https://github.com/nonpoor/formatter-tool)

## 功能概览

- 自动识别输入类型：Markdown / HTML / 混合 / 纯文本。
- 结构化标准化：标题、段落、引用、无序/有序列表、代码块、表格。
- 列表修复能力：
  - 支持常见圆点前缀（如 `•`、`●`、`○` 等）。
  - 支持中文编号前缀（如 `1）`、`3、`、全角数字）。
  - 支持“说明行 + 列表行”混排拆分。
  - 支持嵌套列表结构保留。
- 粘贴策略优化：
  - 默认优先纯文本；
  - 当 `text/html` 结构明显更完整时，自动采用 HTML 投影后的结构化纯文本，减少单段粘贴丢层级问题。
- 导出能力：
  - 一键导出 `.docx`
  - 一键复制优化版（HTML + 纯文本双通道）

## 已实现的核心模块

- 解析层：`src/features/formatter/parser/*`
- 归一化层：`src/features/formatter/normalize/index.ts`
- 渲染层：
  - 剪贴板渲染：`src/features/formatter/renderers/clipboard.ts`
  - Docx 渲染：`src/features/formatter/renderers/docx.ts`
- 粘贴分流策略：`src/features/formatter/paste.ts`
- UI：`src/components/FormatterTool.tsx`

## 本地运行

```bash
npm ci
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)

## 质量检查命令

```bash
npm run lint
npm test -- --run
npm run build
```

## 不让朋友 clone，直接给公网链接（临时分享）

你可以让本机服务继续跑在 `localhost:3000`，再开一个隧道把它临时映射成公网地址。

### 方案 A：cloudflared（推荐）

```bash
# 先启动项目
npm run dev

# 另开一个终端，把本机 3000 端口映射出去
cloudflared tunnel --url http://localhost:3000
```

执行后会得到一个 `https://xxxxx.trycloudflare.com` 链接，直接发给朋友即可。

### 方案 B：localtunnel（无需安装，全局临时跑）

```bash
npm run dev
npx localtunnel --port 3000
```

会输出一个公网 URL（通常是 `https://*.loca.lt`）。

### 方案 C：ngrok（可配口令）

```bash
npm run dev
ngrok http 3000
```

会输出 `https://*.ngrok-free.app` 地址。

## 临时公网分享注意事项

- 你的电脑必须保持开机，`npm run dev` 和隧道命令都不能退出。
- 这是“临时链接”，不保证长期稳定，重启后地址可能变化。
- 不要在该环境输入敏感信息（账号密码、私密数据）。
- 建议只给可信朋友测试。

## 想长期稳定给朋友用（推荐）

直接部署到 Vercel（最快）：

1. 登录 Vercel 并导入该 GitHub 仓库。  
2. 保持默认 Next.js 配置，一键部署。  
3. 拿到固定线上地址后发给朋友。

## 当前状态（MVP）

- 核心功能可用，测试已覆盖主要解析与粘贴回归场景。
- 适合内部测试、小范围分享与持续迭代。

