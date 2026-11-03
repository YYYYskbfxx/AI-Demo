const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const demoCase = '我在复习考试，学了大概二十五分钟就打开短视频，本来想看一会儿，结果停不下来，后来有点自责。';
let mindStep = 0;
let mindHistory = [];

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


$('#mind-form').addEventListener('submit', submitMind);
$('#mind-input').addEventListener('input', (event) => { event.target.style.height = 'auto'; event.target.style.height = `${Math.min(event.target.scrollHeight, 80)}px`; });
$('#mind-chat').addEventListener('click', (event) => { if (event.target.matches('.prompt-chips button')) { $('#mind-input').value = event.target.textContent === '复习时总忍不住刷视频' ? demoCase : '昨晚准备睡觉，想着只看几分钟，回过神来已经很晚了，第二天有些疲惫。'; $('#mind-input').focus(); } });
$('#reset-button').addEventListener('click', clearMind);
$('#clear-chat').addEventListener('click', clearMind);
