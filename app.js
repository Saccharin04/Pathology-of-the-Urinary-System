'use strict';
const {nodes,edges,questions,sources}=window.ATLAS;
const $=s=>document.querySelector(s), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const byId=id=>nodes.find(n=>n.id===id);
let saved={};try{saved=JSON.parse(localStorage.getItem('renal-atlas-v1')||'{}')||{}}catch(e){}
let selected='K01',group='全部',query='',level=0,reviewOnly=false,zoom=1;
const reviewed=new Set((saved.reviewed||[]).filter(id=>questions.some(q=>q.id===id)));
const marks=new Set((saved.marks||[]).filter(id=>questions.some(q=>q.id===id)));
function toast(t){$('#toast').textContent=t;$('#toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').style.display='none',2300)}
function persist(){saved={notes:$('#notes').value,teaching:$('#teaching').value,reviewed:[...reviewed],marks:[...marks],dark:document.body.classList.contains('dark')};try{localStorage.setItem('renal-atlas-v1',JSON.stringify(saved));$('#save-status').textContent='已自动保存 · 仅保存在当前浏览器'}catch(e){$('#save-status').textContent='浏览器存储不可用，请及时导出手记'}$('#progress').textContent=`已展开 ${reviewed.size} / ${questions.length} 道讨论要点 · ${marks.size} 道待复习`}
document.body.classList.toggle('dark',saved.dark??window.matchMedia('(prefers-color-scheme: dark)').matches);
$('#theme').onclick=()=>{document.body.classList.toggle('dark');persist()};
$('#notes').value=typeof saved.notes==='string'?saved.notes:'';$('#teaching').value=typeof saved.teaching==='string'?saved.teaching:'';
$('#notes').addEventListener('input',persist);$('#teaching').addEventListener('input',persist);
const groups=['全部','基础','肾小球','小管间质','血管梗阻','肿瘤','功能桥接'];
$('#groups').innerHTML=groups.map(g=>`<button class="${g===group?'active':''}" data-group="${g}" aria-pressed="${g===group}">${g}</button>`).join('');
$('#groups').onclick=e=>{const b=e.target.closest('[data-group]');if(!b)return;group=b.dataset.group;document.querySelectorAll('[data-group]').forEach(x=>{x.classList.toggle('active',x.dataset.group===group);x.setAttribute('aria-pressed',x.dataset.group===group)});renderGraph()};
$('#search').oninput=e=>{query=e.target.value.trim().toLowerCase();renderGraph()};
const cols=[nodes.filter(n=>n.group==='基础'),nodes.filter(n=>n.group==='肾小球'),nodes.filter(n=>['小管间质','血管梗阻','肿瘤'].includes(n.group)),nodes.filter(n=>n.group==='功能桥接')];
const positions={};cols.forEach((col,c)=>col.forEach((n,i)=>positions[n.id]={x:20+c*245,y:60+i*76}));
function renderGraph(){
 const matched=nodes.filter(n=>(group==='全部'||n.group===group)&&(!query||[n.title,n.sub,n.mechanism,n.morph,n.clinic,n.id].join(' ').toLowerCase().includes(query)));
 const ids=new Set(matched.map(n=>n.id)), neighbors=new Set(ids);
 if(group!=='全部'||query)edges.forEach(e=>{if(ids.has(e.source)||ids.has(e.target)){neighbors.add(e.source);neighbors.add(e.target)}});
 const shown=nodes.filter(n=>neighbors.has(n.id));
 $('#map-status').textContent=`${matched.length} 个匹配节点${shown.length>matched.length?' · '+(shown.length-matched.length)+' 个相邻节点':''}`;
 if(!shown.length){$('#graph').innerHTML='<div class="empty">未找到匹配内容。试试“血尿”“足细胞”或“钾”。</div>';return}
 const w=990,h=870;
 let svg=`<svg class="graph-svg" xmlns="http://www.w3.org/2000/svg" width="${w*zoom}" height="${h*zoom}" viewBox="0 0 ${w} ${h}" role="group" aria-label="可交互知识图谱"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="var(--muted)"/></marker></defs>`;
 ['01 结构与方法','02 肾小球病变','03 其他部位病变','04 临床与功能桥接'].forEach((s,i)=>svg+=`<text class="column-label" x="${20+i*245}" y="28">${s}</text>`);
 const visibleEdges=edges.filter(e=>neighbors.has(e.source)&&neighbors.has(e.target));
 visibleEdges.sort((a,b)=>Number(a.source===selected||a.target===selected)-Number(b.source===selected||b.target===selected));
 visibleEdges.forEach(e=>{const a=positions[e.source],b=positions[e.target],focus=e.source===selected||e.target===selected;let d,lx,ly;
 if(a.x===b.x){const right=a.x+201;d=`M ${right} ${a.y+22} C ${right+26} ${a.y+22},${right+26} ${b.y+22},${right} ${b.y+22}`;lx=right+10;ly=(a.y+b.y)/2+22}
 else {const forward=b.x>a.x,ax=a.x+(forward?201:0),bx=b.x+(forward?0:201),ay=a.y+22,by=b.y+22;d=`M ${ax} ${ay} C ${(ax+bx)/2} ${ay}, ${(ax+bx)/2} ${by}, ${bx} ${by}`;lx=(ax+bx)/2;ly=(ay+by)/2-4}
 svg+=`<path class="edge ${focus?'focus':''}" d="${d}" marker-end="url(#arrow)" opacity="${focus?1:.32}"><title>${esc(byId(e.source).title+' → '+e.label+' → '+byId(e.target).title)}</title></path>`;
 if(focus)svg+=`<text class="edge-label focus" text-anchor="middle" x="${lx}" y="${ly}">${esc(e.label)}</text>`;
 });
 shown.forEach(n=>{const p=positions[n.id];svg+=`<g class="node ${selected===n.id?'selected':''}" transform="translate(${p.x},${p.y})" tabindex="0" role="button" data-node="${n.id}" aria-label="${n.id} ${esc(n.title)}" aria-pressed="${selected===n.id}" opacity="${ids.has(n.id)?1:.55}"><rect width="201" height="46" rx="10"/><text class="node-id" x="11" y="18">${n.id}</text><text class="node-title" x="11" y="34">${esc(n.title)}</text></g>`});
 $('#graph').innerHTML=svg+'</svg>';
 $('#zoomreset').textContent=Math.round(zoom*100)+'%';
}
function selectNode(id,scroll=false){selected=id;if(scroll){group='全部';query='';$('#search').value='';document.querySelectorAll('[data-group]').forEach(b=>{b.classList.toggle('active',b.dataset.group==='全部');b.setAttribute('aria-pressed',b.dataset.group==='全部')})}renderGraph();renderDetail();if(scroll){$('#knowledge').scrollIntoView({behavior:'smooth'});const p=positions[id];$('#map-scroll').scrollTo({top:Math.max(0,p.y*zoom-150),left:Math.max(0,p.x*zoom-120),behavior:'smooth'})}}
$('#graph').onclick=e=>{const n=e.target.closest('[data-node]');if(n)selectNode(n.dataset.node)};
$('#graph').onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-node]')){e.preventDefault();selectNode(e.target.dataset.node)}};
function renderDetail(){const n=byId(selected),related=questions.filter(q=>q.nodes.includes(n.id)),connections=edges.filter(e=>e.source===n.id||e.target===n.id);
 $('#detail').innerHTML=`<div class="detail-id">${n.id} / ${n.group}</div><h3>${esc(n.title)}</h3><div class="detail-sub">${esc(n.sub)}</div><h4>机制 / MECHANISM</h4><p>${esc(n.mechanism)}</p><h4>形态 / MORPHOLOGY</h4><p>${esc(n.morph)}</p><h4>临床连接 / CLINICAL LINK</h4><p>${esc(n.clinic)}</p><div class="caution"><b>辨析提醒</b><br>${esc(n.pitfall)}</div><h4>节点关系 · ${connections.length}</h4><div class="chips">${connections.map(e=>{const to=e.source===n.id?e.target:e.source;return `<button class="chip" data-goto="${to}">${e.source===n.id?'→':'←'} ${esc(e.label)} · ${esc(byId(to).title)}</button>`}).join('')}</div><h4>从这里提出问题 · ${related.length}</h4><div class="chips">${related.map(q=>`<button class="chip" data-qgoto="${q.id}">${q.id} · ${esc(q.title)}</button>`).join('')||'<p>继续沿相邻节点探索问题。</p>'}</div><h4>知识溯源</h4>${n.sources.map(id=>{const s=sources.find(s=>s[0]===id);return `<a href="${s[2]}" target="_blank" rel="noopener">${esc(s[1])} ↗</a>`}).join('')}`;
}
function gotoQuestion(id){level=0;reviewOnly=false;updateLevelButtons();renderQuestions();const c=document.getElementById(id);c.scrollIntoView({behavior:'smooth',block:'center'});c.setAttribute('tabindex','-1');c.focus({preventScroll:true})}
$('#detail').onclick=e=>{const g=e.target.closest('[data-goto]'),q=e.target.closest('[data-qgoto]');if(g)selectNode(g.dataset.goto,true);if(q)gotoQuestion(q.dataset.qgoto)};
$('#zoomin').onclick=()=>{zoom=Math.min(1.6,zoom+.15);renderGraph()};$('#zoomout').onclick=()=>{zoom=Math.max(.55,zoom-.15);renderGraph()};$('#zoomreset').onclick=()=>{zoom=1;renderGraph()};
function updateLevelButtons(){document.querySelectorAll('[data-level]').forEach(b=>{const active=Number(b.dataset.level)===level;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active)});$('#review-mode').setAttribute('aria-pressed',reviewOnly)}
$('#levels').onclick=e=>{const b=e.target.closest('[data-level]');if(!b)return;level=Number(b.dataset.level);updateLevelButtons();renderQuestions()};$('#review-mode').onclick=()=>{reviewOnly=!reviewOnly;updateLevelButtons();renderQuestions()};
function renderQuestions(){const qs=questions.filter(q=>(level===0||q.level===level)&&(!reviewOnly||marks.has(q.id)));$('#qcount').textContent=`显示 ${qs.length} / ${questions.length} 道 · 每题均已关联知识节点`;
 $('#question-list').innerHTML=qs.map(q=>`<article class="question-card" id="${q.id}"><div class="qmeta"><span>${q.id} / ${q.kind}</span><span class="level">${['','Ⅰ 记忆','Ⅱ 分析','Ⅲ 应用'][q.level]}</span></div><h3>${esc(q.title)}</h3><p>${esc(q.body)}</p><div class="chips">${q.nodes.map(id=>`<button class="chip" data-goto="${id}" title="返回知识节点">${id} ${esc(byId(id).title)}</button>`).join('')}</div><details data-answer="${q.id}"><summary>先独立思考，再展开讨论要点</summary><p>${esc(q.answer)}</p></details><div class="qbottom">${q.pre?`<button class="prereq" data-pre="${q.pre}">前置 ${q.pre} → 本题</button>`:'<span></span>'}<button data-mark="${q.id}" class="${marks.has(q.id)?'marked':''}" aria-pressed="${marks.has(q.id)}">${marks.has(q.id)?'● 已加入待复习':'＋ 加入待复习'}</button></div></article>`).join('')||'<div class="empty">这里还没有待复习问题。可在问题卡片中添加。</div>';
 document.querySelectorAll('[data-answer]').forEach(d=>d.addEventListener('toggle',()=>{if(d.open){reviewed.add(d.dataset.answer);persist()}}));
}
$('#question-list').onclick=e=>{const g=e.target.closest('[data-goto]'),pre=e.target.closest('[data-pre]'),m=e.target.closest('[data-mark]');if(g)selectNode(g.dataset.goto,true);if(pre)gotoQuestion(pre.dataset.pre);if(m){const id=m.dataset.mark;marks.has(id)?marks.delete(id):marks.add(id);persist();if(reviewOnly)renderQuestions();else{m.classList.toggle('marked',marks.has(id));m.setAttribute('aria-pressed',marks.has(id));m.textContent=marks.has(id)?'● 已加入待复习':'＋ 加入待复习'}}};
$('#sources').innerHTML=sources.map(s=>`<div class="source-item"><a href="${s[2]}" target="_blank" rel="noopener">${esc(s[1])} ↗</a><p>${esc(s[3])}</p></div>`).join('');
$('#export').onclick=()=>{persist();const text=`# Renal Atlas · 我的学习记录\n\n导出时间：${new Date().toLocaleString('zh-CN')}\n\n## 问题与反思\n${saved.notes||'尚未填写'}\n\n## 课堂使用 / 讲评记录\n${saved.teaching||'尚未记录真实课堂使用'}\n\n## 待复习问题\n${[...marks].map(id=>{const q=questions.find(q=>q.id===id);return `- ${id} ${q.title}（${q.nodes.join('、')}）`}).join('\n')||'无'}\n\n## 已展开讨论要点\n${[...reviewed].join('、')||'无'}\n\n说明：展开讨论要点不等于已掌握；本记录为浏览器本地学习记录。\n`;const blob=new Blob([text],{type:'text/markdown;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Renal-Atlas-学习手记.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('学习手记已导出')};
renderGraph();renderDetail();updateLevelButtons();renderQuestions();persist();

function renderQuestionNetwork(){
 const pos={};[1,2,3].forEach((l,c)=>questions.filter(q=>q.level===l).forEach((q,i)=>pos[q.id]={x:18+c*284,y:42+i*62}));
 const relations=questions.filter(q=>q.pre).map(q=>({a:q.pre,b:q.id,type:'前置 → 进阶'}));
 relations.push({a:'Q06',b:'Q10',type:'相似：读片推理'},{a:'Q13',b:'Q17',type:'相似：AKI与容量'});
 let s='<svg xmlns="http://www.w3.org/2000/svg" width="860" height="555" viewBox="0 0 860 555" role="group" aria-label="问题关系图">';
 ['Ⅰ 记忆 / 概念','Ⅱ 分析 / 机制','Ⅲ 应用 / 病例与综合'].forEach((t,i)=>s+=`<text class="qnet-heading" x="${18+i*284}" y="20">${t}</text>`);
 relations.forEach(r=>{const a=pos[r.a],b=pos[r.b],same=a.x===b.x;const d=same?`M${a.x+240} ${a.y+20} C${a.x+274} ${a.y+20},${b.x+274} ${b.y+20},${b.x+240} ${b.y+20}`:`M${a.x+240} ${a.y+20} C${a.x+265} ${a.y+20},${b.x-25} ${b.y+20},${b.x} ${b.y+20}`;s+=`<path d="${d}" class="qnet-edge ${same?'similar':''}"><title>${r.a} ${r.type} ${r.b}</title></path>`});
 questions.forEach(q=>{const p=pos[q.id],short=q.title.replace(/^病例[A-E] · /,'');s+=`<g role="button" tabindex="0" aria-label="跳转${q.id} ${esc(q.title)}" data-qnet="${q.id}" transform="translate(${p.x},${p.y})"><rect width="240" height="40" rx="9"/><text x="10" y="16" class="qnet-id">${q.id}${q.pre?' · 前置 '+q.pre:''}</text><text x="10" y="30" class="qnet-title">${esc(short.length>19?short.slice(0,18)+'…':short)}</text></g>`});
 $('#question-network').innerHTML=s+'</svg><p class="note-line">实线连接前置与进阶问题（左 → 右）；虚线连接同层相似问题（双向对照）。各题下方的知识标签显示其溯源。</p>';
}
$('#question-network').onclick=e=>{const q=e.target.closest('[data-qnet]');if(q)gotoQuestion(q.dataset.qnet)};
$('#question-network').onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-qnet]')){e.preventDefault();gotoQuestion(e.target.dataset.qnet)}};
renderQuestionNetwork();
