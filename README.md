# AI Builder Studio · AI 产品作品

**尹伊霄｜AI Builder 作品演示**

作品集包含两个 AI 产品：面向年轻人社交媒体使用反思的「心境 MindMirror」，以及帮助用户研究者整理访谈材料的「访研搭档」。

## 在线体验

[打开离线体验](https://YYYYskbfxx.github.io/AI-Demo/)

GitHub Pages 提供两个作品的离线交互体验。配置模型服务并部署 Node 服务后，可通过服务端调用模型进行实时生成。

## 1. 心境 MindMirror

### 项目背景

社交媒体已经成为年轻人社交、表达和获取信息的重要渠道，过度使用也会影响日常生活。单纯限制屏幕时间难以回应用户刷手机背后的情绪和想法。MindMirror 关注年轻人与社交媒体使用之间的关系，尝试用结构化自我反思帮助用户理解反复刷手机的情境。

### 项目内容

MindMirror 是一款以认知行为疗法（CBT）为基础的对话式智能体，通过日常对话引导用户回顾具体情境、识别自动想法、检查支持与反对证据，并形成更平衡的表达。研究稿介绍了为期 8 天、包含 50 名 18–25 岁参与者的候补名单对照研究，并结合量化评估与访谈了解使用效果和体验。

### 界面设计

页面采用「左侧练习导航 + 右侧对话主界面」布局。左侧呈现练习进度、当前步骤和情境提示；右侧以聊天气泡承载引导问题和用户回应，并提供示例情境快捷入口。对话按情境回顾、想法识别、证据检查和下一步行动逐步展开，让用户每次聚焦一个问题。

## 2. 访研搭档 Research Copilot

### 项目背景

用户访谈包含大量具体经历和语境信息，整理过程中容易出现原话与研究者解释混在一起、洞察难以回到证据的问题。访研搭档面向定性用户研究整理流程，帮助研究者从访谈材料中提取可继续分析的线索。

### 项目内容

研究者粘贴访谈片段后，系统归纳关键发现、用户目标与痛点、行为线索、待验证假设和后续追问，并为发现附上对应原文。输出将访谈引用、分析推断和待验证问题分开展示，方便研究者检查与补充。

### 界面设计

页面采用「左侧材料输入 + 右侧分析结果」双栏布局。左侧提供访谈文本输入框和示例材料入口，并展示证据优先、推断标注等整理方式；右侧集中呈现关键发现、证据摘录、待验证假设和追问建议，支持复制分析结果。

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

然后运行 `npm run dev`。服务端通过 `/api/mindmirror` 和 `/api/research` 调用 `/chat/completions`，API Key 只在服务端读取。不要将真实 `.env` 提交到仓库；使用前请确认模型服务商的数据处理政策。

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
- 页面不持久化输入内容；接入实时模型后，输入会发送至所配置的模型接口。

```text
ai-builder-demos/
├── docs/
│   ├── index.html       # 两个作品入口和界面
│   ├── styles.css       # 响应式样式
│   └── app.js           # 会话流程、演示回复和输出呈现
├── server.mjs           # 静态服务和可选模型代理
└── README.md
```

## License

MIT
