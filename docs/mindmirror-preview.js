const $ = selector => document.querySelector(selector);
const today = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
let done = false;

function showPage() {
  const route = location.hash.slice(1) || 'home';
  document.querySelectorAll('.page').forEach(page => page.classList.toggle('active', page.id === route));
  if (route === 'history') renderHistory();
}

function renderHistory() {
  const list = $('#journey-list');
  list.innerHTML = '<button class="history-item selected" type="button">界面预览旅程 · 第 1 天</button>';
  $('#history-detail').innerHTML = '<h2>界面预览旅程</h2><section class="history-day"><h3>第 1 天 · 引导与目标</h3><div class="bubble agent">你好，我是心境。今天先轻松认识一下：最近你最常刷什么？它通常给你带来什么？</div><p class="preview-note">这是界面示例。实时对话与历史保存需要运行独立项目的 Node 服务。</p></section>';
}

function render() {
  $('#journey-count').textContent = '第 1 天 · 引导与目标';
  $('#journey-date').textContent = today;
  $('#journey-progress').textContent = done ? '今天的界面演示已结束。' : '界面预览 · 八天反思旅程';
  $('#day-kicker').textContent = `第 1 天 · ${today}`;
  $('#day-title').textContent = '引导与目标';
  $('#day-description').textContent = '先轻松聊聊社交媒体带来的好处与困扰，再由你选择一个想尝试的小目标。';
  $('#conversation-focus').textContent = '从一件具体经历开始';
  $('#stage-list').innerHTML = done ? '<div class="stage done">今天的界面演示已结束</div>' : '<div class="stage active">1. 认识想法、情绪与行为</div><div class="stage">2. 梳理使用的利与弊</div><div class="stage">3. 选择个人目标</div>';
  $('#tool-heading').textContent = 'CBT 工具';
  $('#tool-description').textContent = '当你说出一个具体想法，心境会判断是否适合用工具来探索。';
  $('#messages').innerHTML = '<div class="bubble agent">你好，我是心境。接下来的几天，我会陪你聊聊使用社交媒体时发生的小事，帮你留意感受和想法；没有标准答案，也不用急着改变。今天先轻松认识一下：最近你最常刷什么？它通常给你带来什么？</div>';
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
