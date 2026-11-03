# MindMirror 心境

独立 Web 项目。基于用户提供的 CHI 初稿第 3.2–3.4 节及访谈结果、讨论组织八天流程：首次引导、六天每日反思、第八天总结。对话由服务端通过火山方舟调用 DeepSeek-V4.1-Flash 经济版，读取 `knowledge.json` 中的 CBT 工具说明，并依据用户的自动想法选择证据探测器、可能性放大镜或视角转换。

每条消息由三个独立的 DeepSeek 角色协作：情境理解、CBT 策略、对话整合。前两个角色并行分析，第三个角色生成唯一可见回复；这会比单次模型调用消耗更多 Token。当前项目只提供文字输入，不调用音频模型。

初稿第 3.2 节规定第 1 天约 10 分钟，第 2—7 天每天完成一次反思，第 8 天回顾；第 3.3 节在形成更平衡的新想法后结束当次认知重构。初稿未规定对话轮数。Web 版本没有固定轮次上限：第 1 天先做自我介绍、轻松了解社交媒体使用的好处与困扰，在用户自己选定小目标后结束；用户也可随时点“结束今天”，系统保存历史并给一句小结。已结束的当天可点“继续今天”恢复对话。

## 启动

需要 Node.js 18 或更高版本。复制 `.env.example` 为 `.env`。在[火山方舟 API Key 管理](https://ark.volcengine.com/region:cn-beijing/apikey)创建 Key，并在[开通管理](https://ark.volcengine.com/region:cn-beijing/endpoint)确认模型已开通。可查看[安心体验模式](https://docs.volcengine.com/docs/ark/activation-management?lang=zh)，用免费额度测试。将 Key 填进本机 `.env` 的 `ARK_API_KEY`，然后运行：

```bash
npm start
```

打开 `http://127.0.0.1:5201`。不配置模型密钥时，服务端不会生成假装理解用户的固定回复，输入框会保持不可用。不要把 `.env` 提交到 GitHub。

`.env.example` 提供北京地域的方舟接口和示例模型 ID：

```dotenv
ARK_API_KEY=你创建的火山方舟API密钥
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_MODEL=deepseek-v4-1-flash-economy-261017
PORT=5201
HOST=127.0.0.1
```

若控制台开通的是别的模型，或要求填写推理接入点 ID，请把 `ARK_MODEL` 改成控制台显示的准确值。保存 `.env` 后重新运行 `npm start`，再刷新网页。网页输入框只输入练习内容；API Key 始终留在服务端，不能填进网页或提交到 GitHub。方舟接口格式见[官方兼容说明](https://docs.volcengine.com/docs/ark/compatible-with-openai-sdk?lang=zh)，可用模型以[官方列表](https://docs.volcengine.com/docs/ark/model-list?lang=zh)和你账号的控制台为准。

## 时间与记录

服务端在 `data/` 中按匿名浏览器 Cookie 保存多段独立旅程、开始日期、每日消息、当前步骤、选用工具和完成状态；每条消息带时间戳。以 Asia/Shanghai 日期计算第几天，同一日期继续上次会话，次日自动进入新阶段。点击“开启新对话”会立即从第一天重新开始，原对话可在“历史对话”中按旅程和日期查看；新对话不会读取旧旅程内容。八天之后保持第八天总结页面。清理浏览器 Cookie 会失去原记录的访问入口；换设备不会自动同步。

## 资料库

`knowledge.json` 是现阶段的可调用资料：包含 CHI 初稿定义的八天流程、证据探测器、可能性放大镜，以及访谈与讨论中写到的视角转换；同时记录 [NHS 思维记录练习](https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/self-help-cbt-techniques/thought-record/) 和 [CCI Thought Diary 资源](https://cci.health.wa.gov.au/Resources/For-Clinicians/Anxiety)的来源。Agent 每轮收到当前阶段与资料内容。后续若补充论文附件中的完整系统 Prompt 和工具表，再逐条扩展工具选择规则。

## 部署

需要一个可运行 Node 的服务和火山方舟 API Key；不必使用低代码平台。部署时在服务端设置 `HOST=0.0.0.0`、`ARK_API_KEY`、`ARK_BASE_URL`、`ARK_MODEL`。`data/` 保存了敏感的个人反思内容，正式对外部署前应改用受控数据库、明确用户身份与删除机制，并对模型接口设置用量限制。当前版本适合本机开发，不应把带真实用户记录的 `data/` 公开。
