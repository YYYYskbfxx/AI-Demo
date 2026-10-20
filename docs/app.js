const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const steps = ['回顾情境', '识别想法', '换个角度', '尝试行动'];
const demoCase = '我在复习考试，学了大概二十五分钟就打开短视频，本来想看一会儿，结果停不下来，后来有点自责。';
let activeView = 'mindmirror';
let mindStep = 0;
let mindHistory = [];
let lastResearchOutput = '';

function selectView(view) {
  activeView = view;
  $$('.project-link').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
  $$('.view').forEach((section) => section.classList.toggle('active', section.id === `${view}-view`));
  $('#crumb-title').textContent = view === 'mindmirror' ? '心境' : '访研搭档';
  $('#reset-button').innerHTML = view === 'mindmirror' ? '↻ <span>重新开始</span>' : '↻ <span>清空材料</span>';
  history.replaceState(null, '', view === 'mindmirror' ? '#mindmirror' : '#research');
}

function addMessage(role, content) {
  const stream = $('#mind-chat');
  const row = document.createElement('div');
  row.className = `message-row ${role === 'user' ? 'user-row' : 'assistant-row'}`;
  const avatar = role === 'assistant' ? '<div class="tiny-avatar">✳</div>' : '';
  const safeContent = escapeHtml(content).replace(/\n/g, '<br/>');
  row.innerHTML = `${avatar}<div class="message-stack"><div class="message ${role === 'user' ? 'user-message' : 'assistant-message'}">${safeContent}</div><span class="message-time">刚刚</span></div>`;
  stream.appendChild(row);
  stream.scrollTop = stream.scrollHeight;
  return row;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function localMindReply(step, input) {
  if (/自杀|自伤|自残|伤害自己|不想活|活不下去/.test(input)) return '听起来你现在可能很难受。心境不是紧急支持服务；如果你此刻有立即伤害自己的风险，请先联系身边可信任的人，或当地急救与危机支持。你不必独自面对。';
  const replies = [
    '听起来，你是在学习了一段时间后想暂时缓一缓。先不评价自己：当时你脑子里闪过的第一句话是什么？',
    '谢谢你把这个念头说出来。我们先把它当作一个想法，而不是事实。支持它的证据是什么？有没有哪一刻说明，也许还有别的选择？',
    '你已经看到了两面的信息。试着把它们放在一起：如果对一位处境相同的朋友说一句既理解他、也留有余地的话，你会怎么说？',
    `谢谢你为自己选出这一步：“${input.slice(0, 80)}”。一次练习到这里就可以了。你可以先照顾好此刻的需要，再观察这个小行动是否适合自己。`
  ];
  return replies[Math.min(step, replies.length - 1)];
}

function localResearchReply(input) {
  const excerpt = input.trim().split(/\r?\n/).map((line) => line.trim()).filter(Boolean)[0]?.slice(0, 100) || '';
  return `## 访谈材料初步整理（静态演示）\n\n### 关键发现\n- 输入材料包含一条可跟进线索：“${excerpt}${excerpt.length >= 100 ? '…' : ''}”。\n- 这只是基于片段的初步归纳，建议回看完整上下文后再确认。\n\n### 用户目标 / 痛点 / 行为线索\n- **行为线索：** 需要研究者继续按情境、行为、结果拆分。\n- **目标与痛点：** 当前示例不足以完整判断，暂不推断。\n\n### 待验证假设\n- 这段经历是否具有代表性？现有材料不足以判断。\n- 当时的目标、替代方案和决策影响因素是什么？\n\n### 建议追问\n1. “能不能带我回到最近一次发生这件事的具体场景？”\n2. “当时你最希望解决的是什么？后来怎么处理的？”\n\n> 静态离线示例仅用于体验交互，不代表接入大模型后的分析能力。`;
}

async function postJSON(url, payload, offlineContent) {
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json().catch(() => ({}));
    if (response.status === 404 || response.status === 405) return { content: offlineContent(), mode: 'static' };
    if (!response.ok) throw new Error(data.error || '暂时无法生成');
    return data;
  } catch (error) {
    if (error instanceof TypeError) return { content: offlineContent(), mode: 'static' };
    throw error;
  }
}

function updateStep() {
  const shown = Math.min(mindStep + 1, 4);
  $('#step-count').innerHTML = `${String(shown).padStart(2, '0')} <i>/ 04</i>`;
  $('#progress-bar').style.width = `${Math.max(25, Math.min(mindStep, 4) * 25)}%`;
  $$('.step-item').forEach((item, index) => {
    item.classList.toggle('current', index === Math.min(mindStep, 3));
    item.classList.toggle('done', index < mindStep);
  });
}

function clearMind() {
  mindStep = 0;
  mindHistory = [];
  updateStep();
  $('#mind-chat').innerHTML = '<div class="day-divider"><span>今天 · 一次练习</span></div><div class="message-row assistant-row"><div class="tiny-avatar">✳</div><div class="message-stack"><div class="message assistant-message">你好，我是心境。我们可以一起回看一次你不太想发生、却又重复出现的刷手机时刻。<br/><br/>你愿意从最近的一次开始吗？当时你正在做什么，心情怎么样？</div><span class="message-time">刚刚</span></div></div><div class="prompt-chips" id="starter-chips"><button>复习时总忍不住刷视频</button><button>睡前一打开就停不下来</button></div>';
  $('#mind-input').value = '';
  $('#mind-input').focus();
}

async function submitMind(event) {
  event.preventDefault();
  const field = $('#mind-input');
  const input = field.value.trim();
  if (!input) return;
  if (mindStep >= 4) { addMessage('assistant', '这次练习已经完成。你可以重新开始，或带着刚才选定的小行动继续今天。'); return; }
  $('#starter-chips')?.remove();
  addMessage('user', input);
  mindHistory.push({ role: 'user', content: input });
  field.value = '';
  field.style.height = 'auto';
  $('#typing-row').hidden = false;
  $('#mind-input').disabled = true;
  try {
    const currentStep = mindStep;
    const data = await postJSON('api/mindmirror', { step: currentStep, input, history: mindHistory.slice(0, -1) }, () => localMindReply(currentStep, input));
    $('#mode-label').textContent = data.mode === 'live' ? 'AI 模型已连接' : data.mode === 'safety' ? '安全提示已触发' : data.mode === 'static' ? '静态离线演示' : '离线体验模式';
    mindHistory.push({ role: 'assistant', content: data.content });
    addMessage('assistant', data.content);
    mindStep += 1;
    updateStep();
  } catch (error) {
    addMessage('assistant', `${error.message}。你可以稍后再试，或重新开始本次练习。`);
  } finally {
    $('#typing-row').hidden = true;
    $('#mind-input').disabled = false;
    $('#mind-input').focus();
  }
}

function fillSample() {
  $('#research-input').value = '受访者 A：上周我需要把手机里的十几张照片传到电脑，先试了聊天软件，画质会压缩；又找了数据线，但电脑没识别。\n研究者：那次你最希望快速完成什么？\n受访者 A：就是原画传过去，最好不用装新软件。我后来发到自己的云盘，再在电脑上下载，折腾了十多分钟。\n研究者：你平常会用云盘吗？\n受访者 A：不常用，只有这种情况才想起来。平时也不知道照片到底存在哪个设备。';
  $('#research-input').dispatchEvent(new Event('input'));
}

function renderMarkdown(text) {
  // Escape first; this tiny renderer supports the deliberately limited output format.
  return escapeHtml(text).split('\n').map((line) => {
    if (/^### /.test(line)) return `<h3>${line.slice(4)}</h3>`;
    if (/^## /.test(line)) return `<h2>${line.slice(3)}</h2>`;
    if (/^> /.test(line)) return `<blockquote>${line.slice(2)}</blockquote>`;
    if (/^- /.test(line)) return `<ul><li>${line.slice(2)}</li></ul>`;
    return line.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  }).join('\n').replace(/<\/ul>\n<ul>/g, '');
}

async function analyzeResearch() {
  const input = $('#research-input').value.trim();
  if (input.length < 20) {
    $('#output-state').className = 'output-state error';
    $('#output-state').innerHTML = '<i></i> 请补充更多材料';
    return;
  }
  const button = $('#analyze-button');
  button.disabled = true;
  button.innerHTML = '<span>✦</span> 正在整理证据…';
  $('#output-state').className = 'output-state';
  $('#output-state').innerHTML = '<i></i> 分析中';
  $('#research-output').className = 'output-body';
  $('#research-output').innerHTML = '<div class="result-markdown">正在识别原文线索、区分观察与推断…</div>';
  try {
    const data = await postJSON('api/research', { input }, () => localResearchReply(input));
    lastResearchOutput = data.content;
    $('#research-output').innerHTML = `<div class="result-markdown">${renderMarkdown(data.content)}</div>`;
    $('#output-state').className = 'output-state ready';
    $('#output-state').innerHTML = `<i></i> ${data.mode === 'live' ? 'AI 生成' : data.mode === 'static' ? '静态示例' : '离线示例'}`;
    $('#mode-label').textContent = data.mode === 'live' ? 'AI 模型已连接' : data.mode === 'static' ? '静态离线演示' : '离线体验模式';
    $('#copy-output').disabled = false;
  } catch (error) {
    $('#research-output').innerHTML = `<div class="result-markdown">${escapeHtml(error.message)}</div>`;
    $('#output-state').className = 'output-state error';
    $('#output-state').innerHTML = '<i></i> 生成失败';
  } finally {
    button.disabled = false;
    button.innerHTML = '<span>✦</span> 整理访谈洞察 <span class="button-arrow">→</span>';
  }
}

$$('.project-link').forEach((button) => button.addEventListener('click', () => selectView(button.dataset.view)));
$('#mind-form').addEventListener('submit', submitMind);
$('#mind-input').addEventListener('input', (event) => { event.target.style.height = 'auto'; event.target.style.height = `${Math.min(event.target.scrollHeight, 80)}px`; });
$('#mind-chat').addEventListener('click', (event) => { if (event.target.matches('.prompt-chips button')) { $('#mind-input').value = event.target.textContent === '复习时总忍不住刷视频' ? demoCase : '昨晚准备睡觉，想着只看几分钟，回过神来已经很晚了，第二天有些疲惫。'; $('#mind-input').focus(); } });
$('#reset-button').addEventListener('click', () => activeView === 'mindmirror' ? clearMind() : ( $('#research-input').value = '', $('#research-input').dispatchEvent(new Event('input')), $('#research-output').className = 'output-body empty', $('#research-output').innerHTML = '<div class="empty-illustration"><div class="empty-sheet"><span class="sheet-line long"></span><span class="sheet-line"></span><span class="sheet-line short"></span><span class="sheet-pin">✦</span></div><span class="orbit orbit-a"></span><span class="orbit orbit-b"></span></div><h3>把一段材料，变成下一步线索</h3><p>分析完成后，关键发现、原文证据、待验证假设和追问建议会显示在这里。</p><div class="empty-tags"><span>关键发现</span><span>证据引用</span><span>后续追问</span></div>', $('#output-state').className = 'output-state', $('#output-state').innerHTML = '<i></i> 等待材料', $('#copy-output').disabled = true, lastResearchOutput = ''));
$('#clear-chat').addEventListener('click', clearMind);
$('#sample-button').addEventListener('click', fillSample);
$('#research-input').addEventListener('input', (event) => { $('#char-count').textContent = `${event.target.value.length} / 12000`; });
$('#analyze-button').addEventListener('click', analyzeResearch);
$('#copy-output').addEventListener('click', async () => { if (lastResearchOutput) { await navigator.clipboard.writeText(lastResearchOutput); $('#copy-output').textContent = '已复制 ✓'; setTimeout(() => { $('#copy-output').textContent = '复制结果'; }, 1400); } });
$('#starter-chips').addEventListener('click', (event) => { if (event.target.matches('button')) { const input = $('#mind-input'); input.value = event.target.textContent === '复习时总忍不住刷视频' ? demoCase : '昨晚准备睡觉，想着只看几分钟，回过神来已经很晚了，第二天有些疲惫。'; input.focus(); } });
if (location.hash === '#research') selectView('research');
