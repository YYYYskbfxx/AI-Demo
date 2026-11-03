const $ = s => document.querySelector(s);
const stageLabels = {
  1: ['认识想法、情绪与行为', '梳理使用的利与弊', '选择个人目标'],
  daily: ['回顾使用时长', '识别关键时刻', '捕捉自动想法', '探索想法', '形成新想法'],
  8: ['回顾一周经历', '复习 CBT 工具', '总结与展望']
};
let state = null;
let selectedJourney = null;
let sending = false;
function showPage() { const route=location.hash.slice(1)||'home'; document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===route)); if(route==='history')renderHistory(); }
function render() {
  const day=state.day, phase=state.phase;
  $('#journey-count').textContent=`第 ${day} 天 · ${day===1?'引导与目标':day===8?'总结巩固':'每日反思'}`;
  $('#journey-date').textContent=state.date;
  $('#journey-progress').textContent=state.done?(day===8?'八天反思已完成。':'今天已结束，明天会自动进入下一天。'):`已记录 ${state.completedDates.length} 次完整练习`;
  $('#day-kicker').textContent=`第 ${day} 天 · ${state.date}`;
  $('#day-title').textContent=day===1?'引导与目标':day===8?'总结巩固':'每日反思';
  $('#day-description').textContent=day===1?'先轻松聊聊社交媒体带来的好处与困扰，再由你选择一个想尝试的小目标。':day===8?'回顾这段练习，并复习适合自己的工具。':'从今天的关键时刻出发，逐步探索自动想法。';
  $('#stage-list').innerHTML=state.done?'<div class="stage done">今天的反思已结束</div>':stageLabels[phase].map((label,i)=>`<div class="stage ${i<state.stage?'done':i===state.stage?'active':''}">${i+1}. ${label}</div>`).join('');
  $('#conversation-focus').textContent=state.focus||'从一件具体经历开始';
  $('#tool-heading').textContent=state.toolStatus==='using'?'正在使用的 CBT 工具':state.toolStatus==='recommended'?'建议尝试的 CBT 工具':'CBT 工具';
  $('#tool-description').textContent=state.tool==='evidence'?'证据探测器：一起查看支持与反驳当前想法的具体证据。':state.tool==='possibility'?'可能性放大镜：一起探索这个情境的其他可能解释。':state.tool==='perspective'?'视角转换：试着把对朋友的理解与善意，也带回自己的情境。':'当你说出一个具体想法，心境会判断是否适合用工具来探索。';
  const list=$('#messages');list.replaceChildren();for(const msg of state.messages){const e=document.createElement('div');e.className=`bubble ${msg.role==='user'?'user':'agent'}`;e.textContent=msg.content;list.append(e);}list.scrollTop=list.scrollHeight;
  const disabled=state.done||!state.modelReady||sending;$('#message').disabled=disabled;$('#chat-form button[type="submit"]').disabled=disabled;$('#message').placeholder=state.done?'今天的练习已完成，明天再见':state.modelReady?'可以从刚刚发生的一件小事说起…':'模型服务尚未配置，请先按 README 设置服务端密钥';
  $('#end-today').disabled=sending;
  $('#end-today').textContent=state.done?'继续今天':'结束今天';
}
async function renderHistory() {
  if(!state)return;
  const journeys=state.journeys||[];
  const list=$('#journey-list');list.replaceChildren();
  for(const journey of journeys){
    const button=document.createElement('button');button.type='button';button.className=`history-item ${journey.id===selectedJourney?'selected':''}`;
    button.textContent=`${journey.startedOn} 开始${journey.active?' · 当前':''} · ${journey.messageCount} 条发送`;
    button.addEventListener('click',()=>openJourney(journey.id));list.append(button);
  }
  if(journeys.length&&!journeys.some(j=>j.id===selectedJourney))await openJourney(journeys[0].id);
}
async function openJourney(id) {
  selectedJourney=id;
  const detail=$('#history-detail');detail.textContent='正在读取…';
  try {
    const response=await fetch(`/api/journeys/${id}`,{credentials:'same-origin'});const journey=await response.json();if(!response.ok)throw Error(journey.error||'读取失败');
    detail.replaceChildren();const title=document.createElement('h2');title.textContent=`${journey.startedOn} 开始的对话${journey.active?' · 当前':''}`;detail.append(title);
    for(const session of journey.sessions){const section=document.createElement('section');section.className='history-day';const heading=document.createElement('h3');heading.textContent=`${session.date} · 第 ${session.day} 天`;section.append(heading);for(const msg of session.messages){const bubble=document.createElement('div');bubble.className=`bubble ${msg.role==='user'?'user':'agent'}`;bubble.textContent=msg.content;section.append(bubble);}detail.append(section);}
    document.querySelectorAll('.history-item').forEach((b,i)=>b.classList.toggle('selected',state.journeys[i]?.id===id));
  }catch(error){detail.textContent=error.message;}
}
async function newConversation() {
  if(!state)return;
  if(!confirm('开启一段新的第一天对话？之前的对话会保存在“历史对话”中。'))return;
  const button=$('#new-conversation');button.disabled=true;
  try{const response=await fetch('/api/journeys/new',{method:'POST',credentials:'same-origin'});const data=await response.json();if(!response.ok)throw Error(data.error||'无法开启新对话');state=data;selectedJourney=null;render();location.hash='session';}catch(error){alert(error.message);}finally{button.disabled=false;}
}
async function endToday(){
  if(!state||sending)return;
  if(state.done){try{const response=await fetch('/api/reopen',{method:'POST',credentials:'same-origin'});const data=await response.json();if(!response.ok)throw Error(data.error||'无法继续今天的对话');state=data;render();}catch(error){alert(error.message);}return;}
  sending=true;$('#end-today').disabled=true;$('#chat-form button[type="submit"]').disabled=true;
  const waiting=appendBubble('agent','心境正在整理今天的小结…','waiting');
  try{const response=await fetch('/api/end',{method:'POST',credentials:'same-origin'});const data=await response.json();if(!response.ok)throw Error(data.error||'结束失败');state=data;render();}
  catch(error){waiting.remove();alert(error.message);}
  finally{sending=false;render();}
}
async function load() { try { const response=await fetch('/api/session',{credentials:'same-origin'});if(!response.ok)throw Error('无法读取练习记录');state=await response.json();render(); }catch(error){$('#journey-count').textContent='连接失败';$('#messages').textContent=error.message+'。请通过项目的 Node 服务打开页面。';} }
function appendBubble(role,content,extra='') {const bubble=document.createElement('div');bubble.className=`bubble ${role} ${extra}`;bubble.textContent=content;$('#messages').append(bubble);$('#messages').scrollTop=$('#messages').scrollHeight;return bubble;}
async function reveal(bubble,text) {
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){bubble.textContent=text;return;}
  const chunks=text.match(/.{1,3}/gs)||[text];
  for(const chunk of chunks){bubble.textContent+=chunk;$('#messages').scrollTop=$('#messages').scrollHeight;await new Promise(resolve=>setTimeout(resolve,22));}
}
async function sendText(text,fromRetry=false) {
  if(sending||!state)return;
  sending=true;const field=$('#message');field.value='';field.disabled=true;$('#chat-form button[type="submit"]').disabled=true;
  const userBubble=appendBubble('user',text);
  const waiting=appendBubble('agent','心境正在阅读并组织回应…','waiting');
  try{
    const response=await fetch('/api/chat',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({message:text})});
    const data=await response.json();if(!response.ok)throw Error(data.error||'发送失败');
    state=data;waiting.remove();userBubble.remove();render();
    const last=$('#messages .bubble:last-child');const answer=last?.textContent||'';
    if(last?.classList.contains('agent')){last.textContent='';await reveal(last,answer);}
  }catch(error){waiting.remove();const failed=appendBubble('agent',`这条消息未成功送达：${error.message}。`,'failed');const retry=document.createElement('button');retry.type='button';retry.className='retry';retry.textContent='重试发送';retry.addEventListener('click',()=>{userBubble.remove();failed.remove();sendText(text,true);});failed.append(retry);}
  finally{sending=false;const disabled=state.done||!state.modelReady;field.disabled=disabled;$('#chat-form button[type="submit"]').disabled=disabled;if(!disabled)field.focus();}
}
function submit(event) {event.preventDefault();const text=$('#message').value.trim();if(text)sendText(text);}
$('#start').addEventListener('click',()=>{location.hash='session';showPage();});
$('#chat-form').addEventListener('submit',submit);
$('#new-conversation').addEventListener('click',newConversation);
$('#end-today').addEventListener('click',endToday);
window.addEventListener('hashchange',showPage);
showPage();load();
