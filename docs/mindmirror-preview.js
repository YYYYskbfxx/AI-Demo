const $ = selector => document.querySelector(selector);
const today = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
let done = false;
const sampleMessages = [
  { role: 'assistant', content: '你好，我是心境。今天先轻松聊聊：最近你最常在什么时候刷社交媒体？它给你带来什么？' },
  { role: 'user', content: '我晚上会刷短视频。原本只想休息十分钟，却常常一刷就过了睡觉时间。' },
  { role: 'assistant', content: '听起来，它确实给了你一点放松；同时，时间悄悄过去又让你有些困扰。回想昨晚，当你决定再看一个视频时，心里是怎么想的？' },
  { role: 'user', content: '我会想“再看一会儿没关系”，第二天又觉得自己没有自控力。' },
  { role: 'assistant', content: '你一边需要休息，一边担心影响第二天。我们先不用急着给自己下结论。昨晚准备继续刷的那个瞬间，你最明显的感受是什么？' }
];

function showPage() {
  const route = location.hash.slice(1) || 'session';
  document.querySelectorAll('.page').forEach(page => page.classList.toggle('active', page.id === route));
  if (route === 'history') renderHistory();
}

function renderHistory() {
  const list = $('#journey-list');
  list.innerHTML = '<button class="history-item selected" type="button">界面预览旅程 · 第 1 天</button>';
  const detail = $('#history-detail');
  detail.innerHTML = '<h2>界面预览旅程</h2><section class="history-day"><h3>第 1 天 · 引导与目标</h3></section>';
  const day = detail.querySelector('.history-day');
  sampleMessages.forEach(message => {
    const bubble = document.createElement('div');
    bubble.className = `bubble ${message.role === 'user' ? 'user' : 'agent'}`;
    bubble.textContent = message.content;
    day.append(bubble);
  });
  const note = document.createElement('p');
  note.className = 'preview-note';
  note.textContent = '以上为虚构的界面示例。实时对话与历史保存需要运行独立项目的 Node 服务。';
  day.append(note);
}

function render() {
  $('#journey-count').textContent = '第 1 天 · 引导与目标';
  $('#journey-date').textContent = today;
  $('#journey-progress').textContent = done ? '今天的界面演示已结束。' : '虚构示例对话 · 非实时模型';
  $('#day-kicker').textContent = `第 1 天 · ${today}`;
  $('#day-title').textContent = '引导与目标';
  $('#day-description').textContent = '先轻松聊聊社交媒体带来的好处与困扰，再由你选择一个想尝试的小目标。';
  $('#conversation-focus').textContent = '晚间刷短视频后，想继续放松又担心影响睡眠';
  $('#stage-list').innerHTML = done ? '<div class="stage done">今天的界面演示已结束</div>' : '<div class="stage done">1. 认识想法、情绪与行为</div><div class="stage active">2. 梳理使用的利与弊</div><div class="stage">3. 选择个人目标</div>';
  $('#tool-heading').textContent = 'CBT 工具';
  $('#tool-description').textContent = '当你说出一个具体想法，心境会判断是否适合用工具来探索。';
  const messages = $('#messages');
  messages.replaceChildren();
  sampleMessages.forEach(message => {
    const bubble = document.createElement('div');
    bubble.className = `bubble ${message.role === 'user' ? 'user' : 'agent'}`;
    bubble.textContent = message.content;
    messages.append(bubble);
  });
  requestAnimationFrame(() => { messages.scrollTop = messages.scrollHeight; });
  $('#message').disabled = true;
  $('#message').placeholder = '界面预览不连接模型；请运行独立项目体验实时对话';
  $('#chat-form button[type="submit"]').disabled = true;
  $('#end-today').textContent = done ? '继续今天' : '结束今天';
  let actions = $('.preview-actions');
  if (!actions) {
    actions = document.createElement('div');
    actions.className = 'preview-actions';
    actions.innerHTML = '<a href="https://github.com/YYYYskbfxx/MindMirror-Web-Agent">查看最新版源码与本机运行说明 ↗</a>';
    $('.conversation').append(actions);
  }
}

$('#start').addEventListener('click', () => { location.hash = 'session'; showPage(); });
$('#end-today').addEventListener('click', () => { done = !done; render(); });
$('#new-conversation').addEventListener('click', () => { done = false; render(); location.hash = 'session'; });
$('#chat-form').addEventListener('submit', event => event.preventDefault());
window.addEventListener('hashchange', showPage);
render();
showPage();
