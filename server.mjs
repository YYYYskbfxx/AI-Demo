import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'docs');
const port = Number(process.env.PORT || 5196);
const host = process.env.HOST || '127.0.0.1';
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };

function loadEnv() {
  // Tiny .env reader keeps the demo dependency-free. Existing process vars win.
  return readFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '.env'), 'utf8')
    .then((raw) => raw.split(/\r?\n/).forEach((line) => {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    })).catch(() => {});
}

const rules = {
  mindmirror: `你是“心境”，一个用于社交媒体使用反思的认知行为练习原型。不是治疗师，不诊断，不羞辱、不强迫戒断。保持温和、简短，每轮只问一个具体问题。目标依次是：回顾触发情境和情绪；识别当时自动想法；区分事实与推测、检查支持和反证；形成更平衡的想法；选择一个低门槛的下一步。不要替用户编造经历。用户提到自伤或即时危险时，先鼓励联系可信任的人和当地紧急支持，不继续常规练习。当前阶段：` ,
  research: `你是“访研搭档”，帮助产品研究者整理访谈材料。只基于用户提供的原文，不补造受访者观点、背景或引用。将输出分为：1) 关键发现（每条包含原文证据）；2) 用户目标/痛点/行为线索；3) 仍待验证的假设；4) 后续追问建议。明确区分“受访者原话”和“分析推断”，如证据不足就写证据不足。不要输出可识别个人身份的信息。用中文简洁回答。`
};

function localMindReply(step, input) {
  const replies = [
    `听起来，这次打开短视频像是在“学习累了，想暂时缓一缓”的时刻发生的。先不急着评价自己：当时你脑子里闪过的第一句话是什么？`,
    `谢谢你把这个念头说出来。我们先把它当作一个想法，而不是事实。支持“我需要刷一会儿”的证据是什么？有没有哪一刻说明，也许还有别的选择？`,
    `你已经看到了两面的信息。试着把它们放在一起：如果对一位处境相同的朋友说一句既理解他、也留有余地的话，你会怎么说？`,
    `谢谢你为自己选出这一步：“${input.slice(0, 80)}”。一次练习到这里就可以了。你可以先照顾好此刻的需要，再观察这个小行动是否适合自己。`
  ];
  return replies[Math.min(step, replies.length - 1)];
}

function localResearchReply(input) {
  const clean = input.trim();
  const lines = clean.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const excerpt = lines[0]?.slice(0, 100) || clean.slice(0, 100);
  return `## 访谈材料初步整理（离线演示）\n\n### 关键发现\n- 目前材料出现了一个值得跟进的线索：受访者提到“${excerpt}${excerpt.length >= 100 ? '…' : ''}”。\n- 这只是基于输入文本的初步归纳，建议回看完整上下文后再确认。\n\n### 用户目标 / 痛点 / 行为线索\n- **行为线索：** ${lines.length ? `材料包含 ${lines.length} 段文本，可继续按情境、行为、结果拆分。` : '当前没有足够材料。'}\n- **目标与痛点：** 需要更多原文证据，暂不推断。\n\n### 待验证假设\n- 这段经历是否具有代表性？目前样本不足以判断。\n- 受访者当时的目标、替代方案和决策影响因素是什么？\n\n### 建议追问\n1. “能不能带我回到最近一次发生这件事的具体场景？”\n2. “当时你最希望解决的是什么？后来怎么处理的？”\n\n> 离线演示会保留证据边界；配置模型后可生成更完整的逐条证据映射。`;
}

function safetyReply(input) {
  return /自杀|自伤|自残|伤害自己|不想活|活不下去/.test(input)
    ? '听起来你现在可能很难受。心境不是紧急支持服务；如果你此刻有立即伤害自己的风险，请先联系身边可信任的人，或当地急救与危机支持。你不必独自面对。'
    : null;
}

function mindMessages({ step, input, history = [] }) {
  const phases = ['回顾情境与情绪：请追问当时脑中闪过的第一句话', '识别自动想法：帮助检查事实与推测，并询问一个更平衡的表达', '检查证据并重构：帮助用户整合出更平衡的想法，然后询问一个 5 分钟内可做的小行动', '结束练习：认可用户提出的小行动，并只根据对话内容简短总结情境、需要、平衡想法和行动。不要再追问，不补造用户没说的细节'];
  const transcript = history.slice(-10).map((m) => ({ role: m.role, content: String(m.content).slice(0, 1800) }));
  return [{ role: 'system', content: rules.mindmirror + (phases[step] || '结束练习') + '。每次回复最多 100 字。' }, ...transcript, { role: 'user', content: String(input).slice(0, 1800) }];
}

async function callModel(messages) {
  if (!process.env.OPENAI_API_KEY) return null;
  const base = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', messages, temperature: 0.45 })
  });
  if (!response.ok) throw new Error(`模型接口返回 ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

async function handleApi(req, res) {
  if (req.method !== 'POST' || !['/api/mindmirror', '/api/research'].includes(req.url)) {
    res.writeHead(404); return res.end(JSON.stringify({ error: 'Not found' }));
  }
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > 32_000) { res.writeHead(413); return res.end(JSON.stringify({ error: '内容过长' })); } }
  let body;
  try { body = JSON.parse(raw); } catch { res.writeHead(400); return res.end(JSON.stringify({ error: '请求格式无效' })); }
  try {
    const live = Boolean(process.env.OPENAI_API_KEY);
    const safety = req.url === '/api/mindmirror' ? safetyReply(String(body.input || '')) : null;
    const content = req.url === '/api/mindmirror'
      ? (safety || await callModel(mindMessages(body)) || localMindReply(Number(body.step || 0), String(body.input || '')))
      : (await callModel([{ role: 'system', content: rules.research }, { role: 'user', content: String(body.input || '').slice(0, 24_000) }]) || localResearchReply(String(body.input || '')));
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ content, mode: safety ? 'safety' : live ? 'live' : 'demo' }));
  } catch (error) {
    res.writeHead(502, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: `模型调用失败：${error.message}` }));
  }
}

await loadEnv();
http.createServer(async (req, res) => {
  if (req.url?.startsWith('/api/')) return handleApi(req, res);
  const requested = decodeURIComponent((req.url || '/').split('?')[0]);
  const safe = path.normalize(requested).replace(/^([.][.][/\\])+/, '').replace(/^[/\\]+/, '');
  const file = path.join(root, safe || 'index.html');
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream', 'x-content-type-options': 'nosniff' });
    res.end(data);
  } catch {
    const data = await readFile(path.join(root, 'index.html'));
    res.writeHead(200, { 'content-type': mime['.html'] }); res.end(data);
  }
}).listen(port, host, () => console.log(`AI Builder demos ready at http://${host}:${port}`));
