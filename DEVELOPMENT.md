# 作品集开发与运行说明

## 本地运行

需要 Node.js 18 或更高版本，无第三方运行依赖：

```bash
npm run dev
```

打开 `http://localhost:5196`。未配置模型接口时，系统使用离线演示回复。

## 接入 OpenAI 兼容接口

复制 `.env.example` 为 `.env`，填写服务商支持的模型和凭证：

```dotenv
OPENAI_API_KEY=your_key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
PORT=5196
```

然后运行 `npm run dev`。服务端通过 `/api/mindmirror`、`/api/research` 和新版工作台的 `/api/research-chat` 调用 `/chat/completions`，API Key 只在服务端读取。不要将真实 `.env` 提交到仓库；使用前请确认模型服务商的数据处理政策。独立的模拟资料 CSV 位于 `docs/sample-research/`。

## 部署在线 AI 体验

GitHub Pages 只能托管静态文件，不能运行 Node 服务或安全保存模型 Key。最简单的在线部署方式是把本仓库作为一个 Render Web Service 部署；Render 会同时托管网页和 `/api` 接口，因此不需要额外配置跨域。

1. 在 Render 选择 **New → Web Service**，连接 `YYYYskbfxx/AI-Demo` 仓库和 `main` 分支。
2. Runtime 选择 **Node**，Build Command 填 `npm install`，Start Command 填 `npm start`。
3. 在服务的 **Environment** 中添加 `HOST=0.0.0.0`，以及模型服务所需的 `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_MODEL`。`PORT` 由 Render 自动提供，无需手动设置。
4. 点击 **Deploy**。部署完成后打开 Render 提供的 `onrender.com` 地址，即可体验实时 AI 版本；GitHub Pages 地址仍然是离线体验版。

模型参数示例：

```text
OPENAI_API_KEY=在模型服务商创建的密钥
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
HOST=0.0.0.0
```

请将密钥直接填入 Render 的环境变量页面，不要写进网页代码、GitHub 仓库或聊天消息。使用其他 OpenAI 兼容服务商时，按其文档填写 Base URL、模型名和密钥。

在线接口会消耗模型账户额度。公开演示前请在模型服务商后台设置用量上限，并避免在演示中输入真实访谈、医疗或其他敏感信息。

## 技术实现

- 原生 HTML、CSS、JavaScript 前端，适配窄屏。
- Node.js 内置 HTTP 服务，无生产依赖。
- 可选 OpenAI 兼容接口；GitHub Pages 默认展示离线交互。
- Render 部署时由同一个 Node 服务托管网页与模型代理接口。
- 心境的静态界面预览不持久化练习内容；独立 Agent 服务在本机 `data/` 保存对话与日期记录，该目录不上传 GitHub。访研搭档的工作区保存在本机浏览器中；途序历史路线仅在当前页面会话保留。接入实时模型后，相关输入会发送至所配置的模型接口。

```text
ai-builder-demos/
├── docs/
│   ├── index.html       # 三个独立项目的入口
│   ├── mindmirror-project.html  # 心境项目介绍
│   ├── mindmirror.html  # 心境最新版设计的静态界面预览
│   ├── research.html    # 访研搭档
│   └── travel.html      # 途序
├── mindmirror/          # 新版心境 Agent 源码与运行说明
├── server.mjs           # 旧离线原型的静态服务和可选模型代理
└── README.md
```

## License

MIT
