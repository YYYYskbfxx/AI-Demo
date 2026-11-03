import http from 'node:http';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(root, 'data');
const knowledge = JSON.parse(await readFile(path.join(root, 'knowledge.json'), 'utf8'));
const envText = await readFile(path.join(root, '.env'), 'utf8').catch(() => '');
for (const line of envText.split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
}
const port = Number(process.env.PORT || 5201);
const host = process.env.HOST || '127.0.0.1';
const stages = {
  1: ['psychoeducation', 'pros_cons', 'goal'],
  daily: ['usage', 'event', 'thought', 'tool', 'belief'],
  8: ['review', 'tool_review', 'future']
};
const introductions = {
  1: '你好，我是心境。接下来的几天，我会陪你聊聊使用社交媒体时发生的小事，帮你留意感受和想法；没有标准答案，也不用急着改变。今天先轻松认识一下：最近你最常刷什么？它通常给你带来什么感觉？',
  daily: '今天我们从一次具体的使用经历开始。你今天大约使用了多长时间的社交媒体？',
  8: '今天一起回顾这段练习。过去一周，哪一次社交媒体使用经历给你留下的印象最深？'
};
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8' };
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Shanghai', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
const elapsed = (a,b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
const dayFor = (record) => Math.min(8, Math.max(1, elapsed(record.startedOn,today()) + 1));
const phaseFor = (day) => day === 1 ? 1 : day === 8 ? 8 : 'daily';
const safeId = (v) => /^[a-f0-9]{48}$/.test(v || '') ? v : null;
const cookieId = (req) => safeId((req.headers.cookie || '').split(';').map(x=>x.trim()).find(x=>x.startsWith('mm_session='))?.slice(11));
const fileFor = (id) => path.join(dataDir, `${id}.json`);
async function save(record) { await mkdir(dataDir,{recursive:true}); const target=fileFor(record.id); const temp=`${target}.${randomBytes(4).toString('hex')}.tmp`; await writeFile(temp,JSON.stringify(record),'utf8'); await rename(temp,target); }
async function getRecord(req,res) {
  let id=cookieId(req), record;
  if (id) record=JSON.parse(await readFile(fileFor(id),'utf8').catch(()=> 'null'));
  if (!record) { id=randomBytes(24).toString('hex'); record={id,startedOn:today(),sessions:{}}; await save(record); res.setHeader('Set-Cookie',`mm_session=${id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000${req.headers['x-forwarded-proto']==='https'?' ; Secure':''}`); }
  if (!record.journeys) {
    const journey={id:randomBytes(12).toString('hex'),startedOn:record.startedOn,sessions:record.sessions};
    record.journeys=[journey];record.activeJourneyId=journey.id;
    delete record.startedOn;delete record.sessions;
    await save(record);
  }
  return record;
}
function activeJourney(record) { return record.journeys.find(j=>j.id===record.activeJourneyId)||record.journeys.at(-1); }
function current(record) {
  const journey=activeJourney(record),day=dayFor(journey),date=today();
  if (!journey.sessions[date]) journey.sessions[date]={day,date,stage:0,focus:'从一件具体经历开始',tool:null,toolStatus:'none',toolTurns:0,done:false,messages:[{role:'assistant',content:introductions[phaseFor(day)],at:new Date().toISOString()}]};
  return {journey,day,date,session:journey.sessions[date]};
}
function journeyList(record) { return record.journeys.map(j=>({id:j.id,startedOn:j.startedOn,active:j.id===record.activeJourneyId,dates:Object.keys(j.sessions).sort(),messageCount:Object.values(j.sessions).reduce((n,s)=>n+s.messages.filter(m=>m.role==='user').length,0)})).reverse(); }
function publicState(record) { const {journey,day,date,session}=current(record); return {day,date,startedOn:journey.startedOn,phase:phaseFor(day),stage:session.stage,focus:session.focus||'从一件具体经历开始',tool:session.tool,toolStatus:session.toolStatus||'none',done:session.done,messages:session.messages,completedDates:Object.values(journey.sessions).filter(s=>s.done).map(s=>s.date),journeys:journeyList(record),modelReady:Boolean(process.env.ARK_API_KEY)}; }
function json(res,status,data) { res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(data)); }
function safety(input) { return /自杀|自伤|自残|伤害自己|不想活|活不下去|想死/.test(input); }
function promptFor(state) {
  const sequence=stages[state.phase];
  return `你是“心境”MindMirror。依据研究初稿第3.2—3.4节，你是冷静、温和、可靠的反思伙伴，有CBT方法知识，也像体贴的朋友那样认真听。不要自称持证心理咨询师或医生，不承诺疗效。你的任务是帮助用户自己看见想法，不是连续盘问、纠错或完成问卷。
每轮先接住用户刚说的具体内容和感受。用自然口语回应，少重复“听起来”“我注意到”“你愿意”等固定句式；不夸大情绪，不代替用户解释动机。用户只是分享、需要休息或已表达清楚时，可以只回应和陪伴，不必提问。确实需要推进反思时最多问一个轻巧的问题；同一个信息不要换说法反复追问。用户要方案时给一个低负担的选择，允许用户不做。不要强迫积极重构，也不要把正常疲惫变成待治疗的问题。
八天结构：第1天用生活例子轻轻介绍想法—情绪—行为，听用户说社交媒体带来的好处与困扰，再协助选择一个用户认可的小目标；第2—7天围绕一个关键时刻、自动想法、一个CBT工具和用户自己认可的新想法；第8天回顾和结束。当前第${state.day}天，内部步骤 ${sequence[state.stage]}，下一步骤 ${sequence[state.stage+1]||'结束'}，本日已收到${state.turns}条用户消息。没有固定轮数，也不用赶进度。阶段只是内部导航，不要向用户念步骤名。
${state.day===1?'今天是轻松的认识与入组，不要把用户的每句话都当作需要挑战的认知扭曲。用户说出“刷时开心，事后懊恼”等利弊时，先把两面感受简洁地放在一起，承认这种矛盾很常见，不继续追问更深的原因；然后邀请用户从减少熬夜、减少拖延、改善情绪或提高专注中挑一个最想尝试的小方向，也允许自定义。用户选定或说出个人目标后，简短复述今天的利弊与目标，温和结束当天，finishToday=true。若目标尚未出现，不要以“练习完成”收尾。':'当用户形成一个自己认可的更平衡想法或明确表示今天想结束时，简短回顾后自然收束，finishToday=true。不要为追求步骤完整而无限延长对话。'}
CBT工具资料：${JSON.stringify(knowledge)}。每轮都评估当前用户的具体想法是否适合一个工具，不受当前第几天或内部步骤限制。自我否定或非黑即白用evidence；揣测别人想法用possibility；自责或人际视角局限用perspective。若只是出现了相应想法但尚未开始练习，标记recommended；只有本轮回复实际开始询问工具中的一个步骤，才标记using。没有足够具体的想法时tool=null、toolStatus=none。把工具融入自然对话，每次只做其中一小步；不替用户编造证据、猜测他人真实想法或直接宣布“你想错了”。若给方案，优先用与当前情境匹配的工具或一个低负担行动建议，不一次罗列多个方案。避免诊断、保证疗效和空泛夸赞。真实危险或自伤内容不继续常规练习。
只返回JSON对象，字段为 reply（约60—160字的自然中文，收束时可更短）、focus（不超过14字，概括本轮实际在谈的情境或想法）、tool（evidence/possibility/perspective/null）、toolStatus（none/recommended/using）、advance（布尔值）、goalChosen（布尔值，只有用户自己明确说出第一天想尝试的小目标才为true）、finishToday（布尔值）。以往对话用于理解持续情境，不可编造记忆。`;
}
async function callModel(state,input) {
  const base=(process.env.ARK_BASE_URL||'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/,'');
  const previous=state.previous?.length?[{role:'user',content:`以下是此前日期的用户反思摘录，仅用于理解连续情境：\n${state.previous.join('\n')}`}]:[];
  const recent=state.messages.slice(-12).map(m=>({role:m.role==='assistant'?'assistant':'user',content:m.content.slice(0,1000)}));
  const advisorMessages=[...recent,{role:'user',content:input}];
  async function askAdvisor(instruction) {
    const response=await fetch(`${base}/chat/completions`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${process.env.ARK_API_KEY}`},body:JSON.stringify({model:process.env.ARK_MODEL||'deepseek-v4-1-flash-economy-261017',messages:[{role:'system',content:instruction},...advisorMessages],max_tokens:450,thinking:{type:'disabled'},response_format:{type:'json_object'}}),signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw new Error(`分析角色接口返回 ${response.status}`);
    const payload=await response.json();return JSON.parse(payload.choices?.[0]?.message?.content||'{}');
  }
  const [contextCall,toolCall]=await Promise.allSettled([
    askAdvisor('你是心境的情境理解角色，只做内部分析，不直接回复用户。依据最新一句及前文，识别用户的具体情境、情绪、当前诉求（倾诉/求方案/澄清）、需要避免的误解。不要诊断，不编造。只返回JSON：{"situation":"不超过35字","emotion":"不超过15字","need":"不超过25字","avoid":"不超过25字"}。'),
    askAdvisor(`你是心境的CBT策略角色，只做内部分析，不直接回复用户。当前第${state.day}天。${state.day===1?'第一天以认识、利弊梳理和目标选择为主，除非用户明确要求，否则不要推荐CBT练习，也不要深挖认知扭曲。':'根据用户最新自动想法和资料库选择工具，并判断本轮只做哪一小步。没有具体自动想法就不选工具。'}资料库：${JSON.stringify(knowledge.tools)}。只返回JSON：{"tool":"evidence/possibility/perspective/null","status":"none/recommended/using","step":"不超过35字","reason":"不超过25字"}。`)
  ]);
  const context=contextCall.status==='fulfilled'?contextCall.value:null;
  const strategy=toolCall.status==='fulfilled'?toolCall.value:null;
  const advice=`内部角色提示，仅供参考，必须以用户原话和CBT资料为准；不要向用户展示角色分析。情境理解：${JSON.stringify(context)}；CBT策略：${JSON.stringify(strategy)}。最终回复需自行核对，不可照抄错误推断。`;
  const messages=[{role:'system',content:promptFor(state)},{role:'system',content:advice},...previous,...recent,{role:'user',content:input}];
  let result;
  for(let attempt=0;attempt<2;attempt++) {
    const body={model:process.env.ARK_MODEL||'deepseek-v4-1-flash-economy-261017',messages,max_tokens:attempt===0?3000:900,thinking:{type:attempt===0?'enabled':'disabled'},response_format:{type:'json_object'}};
    if(attempt===0)body.reasoning_effort='low';
    const response=await fetch(`${base}/chat/completions`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${process.env.ARK_API_KEY}`},body:JSON.stringify(body),signal:AbortSignal.timeout(120000)});
    if(!response.ok) {
      const errorBody=await response.json().catch(()=>({}));
      const code=errorBody.error?.code;
      if(code==='ModelNotOpen') throw new Error(`当前账号尚未开通模型 ${process.env.ARK_MODEL||'deepseek-v4-1-flash-economy-261017'}，请到火山方舟控制台开通，或将 ARK_MODEL 改为已开通的模型 ID`);
      if(response.status===401||response.status===403) throw new Error('火山方舟认证失败，请检查 ARK_API_KEY 和模型访问权限');
      throw new Error(`火山方舟接口返回 ${response.status}${code?`（${code}）`:''}`);
    }
    const payload=await response.json();
    const raw=payload.choices?.[0]?.message?.content?.trim()||'';
    try { result=JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g,'')); } catch { result=null; }
    if(typeof result?.reply==='string'&&result.reply.trim())break;
    if(attempt===1)throw new Error('模型两次未返回有效回应，请稍后重试');
  }
  const tool=['evidence','possibility','perspective'].includes(result.tool)?result.tool:null;
  return {reply:result.reply.slice(0,700),focus:typeof result.focus==='string'?result.focus.trim().slice(0,28):'',tool,toolStatus:tool&&['recommended','using'].includes(result.toolStatus)?result.toolStatus:'none',advance:result.advance===true,goalChosen:result.goalChosen===true,finishToday:result.finishToday===true};
}
async function closeMessage(session,day) {
  const userMessages=session.messages.filter(m=>m.role==='user').slice(-6).map(m=>m.content.slice(0,250));
  if(!userMessages.length)return '今天先到这里。之后想继续时，我们再从一件具体经历慢慢开始。';
  if(!process.env.ARK_API_KEY)return '今天先到这里。你愿意花时间看一看自己的感受，已经足够了。';
  const base=(process.env.ARK_BASE_URL||'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/,'');
  try {
    const response=await fetch(`${base}/chat/completions`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${process.env.ARK_API_KEY}`},body:JSON.stringify({model:process.env.ARK_MODEL||'deepseek-v4-1-flash-economy-261017',messages:[{role:'system',content:'你是心境。用户主动结束今天的反思。只依据用户原话写一句60—120字的温和小结：点出一个具体情境或感受、用户已有的观察，并自然结束。不要再提问，不夸大进步，不诊断，不编造。只返回JSON对象：{"reply":"..."}。'},{role:'user',content:`第${day}天，用户今天说过：${JSON.stringify(userMessages)}`}],max_tokens:350,thinking:{type:'disabled'},response_format:{type:'json_object'}}),signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw new Error('summary unavailable');
    const payload=await response.json();const result=JSON.parse(payload.choices?.[0]?.message?.content||'{}');
    if(typeof result.reply==='string'&&result.reply.trim())return result.reply.trim().slice(0,400);
  }catch{}
  return '今天先到这里。刚才说过的感受可以先放一放，不必现在把所有问题想明白。';
}
async function handle(req,res) {
  const pathname=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`).pathname;
  if(pathname.startsWith('/api/')) {
    if(!['GET','POST'].includes(req.method)) return json(res,405,{error:'Method not allowed'});
    const record=await getRecord(req,res);
    if(pathname==='/api/session'&&req.method==='GET') { const state=publicState(record);await save(record);return json(res,200,state); }
    if(pathname==='/api/end'&&req.method==='POST') {
      const {day,session}=current(record);
      if(session.done)return json(res,200,publicState(record));
      const reply=await closeMessage(session,day);
      session.messages.push({role:'assistant',content:reply,at:new Date().toISOString()});
      session.done=true;await save(record);return json(res,200,publicState(record));
    }
    if(pathname==='/api/reopen'&&req.method==='POST') {
      const {session}=current(record);session.done=false;await save(record);return json(res,200,publicState(record));
    }
    if(pathname==='/api/journeys'&&req.method==='GET') return json(res,200,{journeys:journeyList(record)});
    if(pathname==='/api/journeys/new'&&req.method==='POST') {
      const journey={id:randomBytes(12).toString('hex'),startedOn:today(),sessions:{}};
      record.journeys.push(journey);record.activeJourneyId=journey.id;
      const state=publicState(record);await save(record);return json(res,200,state);
    }
    const historyMatch=pathname.match(/^\/api\/journeys\/([a-f0-9]{24})$/);
    if(historyMatch&&req.method==='GET') {
      const journey=record.journeys.find(j=>j.id===historyMatch[1]);
      if(!journey)return json(res,404,{error:'未找到对话记录'});
      return json(res,200,{id:journey.id,startedOn:journey.startedOn,active:journey.id===record.activeJourneyId,sessions:Object.values(journey.sessions).sort((a,b)=>a.date.localeCompare(b.date)).map(s=>({date:s.date,day:s.day,messages:s.messages}))});
    }
    if(pathname==='/api/chat'&&req.method==='POST') {
      if(!process.env.ARK_API_KEY) return json(res,503,{error:'尚未配置火山方舟模型接口，请在服务端设置 ARK_API_KEY'});
      let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>4000)return json(res,413,{error:'内容过长'});}
      let input;try{input=String(JSON.parse(raw).message||'').trim();}catch{return json(res,400,{error:'请求格式错误'});}
      if(!input||input.length>1500)return json(res,400,{error:'请输入不超过1500字的内容'});
      const {day,session}=current(record);if(session.done)return json(res,409,{error:'今天的练习已经完成，明天会自动进入下一阶段。'});
      if(safety(input)) {session.messages.push({role:'user',content:input,at:new Date().toISOString()},{role:'assistant',content:'听起来你现在很难受。请先联系身边可信任的人；如果有立即伤害自己的风险，请联系当地紧急支持。我们先暂停练习。',at:new Date().toISOString()});await save(record);return json(res,200,publicState(record));}
      try {
        const phase=phaseFor(day);
        const previous=Object.values(activeJourney(record).sessions).filter(s=>s.date!==session.date).sort((a,b)=>a.date.localeCompare(b.date)).slice(-7).flatMap(s=>s.messages.filter(m=>m.role==='user').slice(-3).map(m=>`${s.date}: ${m.content.slice(0,240)}`));
        const turns=session.messages.filter(m=>m.role==='user').length+1;
        const result=await callModel({...session,day,phase,previous,turns},input);
        const stepName=stages[phase][session.stage];
        session.focus=result.focus||session.focus;
        session.tool=result.tool;
        session.toolStatus=result.toolStatus;
        if(result.advance){if(stepName==='tool'&&!session.tool)result.advance=false;else if(session.stage<stages[phase].length-1)session.stage++;else if(day!==1||result.goalChosen)session.done=true;}
        if(day===1&&result.goalChosen)session.stage=2;
        if(result.finishToday&&(day!==1||result.goalChosen||/结束|先到这|下次再聊|明天再/.test(input)))session.done=true;
        const at=new Date().toISOString();session.messages.push({role:'user',content:input,at},{role:'assistant',content:result.reply,at});
        if(session.messages.length>80)session.messages=session.messages.slice(-80);
        await save(record);return json(res,200,publicState(record));
      } catch(error) {return json(res,502,{error:`模型暂时无法回应：${error.message}`});}
    }
    return json(res,404,{error:'Not found'});
  }
  const file=pathname==='/'?'index.html':pathname.slice(1);
  if(!['index.html','styles.css','app.js'].includes(file))return json(res,404,{error:'Not found'});
  const body=await readFile(path.join(root,file));res.writeHead(200,{'content-type':mime[path.extname(file)],'cache-control':'no-store'});res.end(body);
}
http.createServer((req,res)=>{handle(req,res).catch(error=>json(res,500,{error:'服务暂时不可用'}));}).listen(port,host,()=>console.log(`MindMirror ready at http://${host}:${port}`));
