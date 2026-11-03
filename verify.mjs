import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const context={window:{}};vm.runInNewContext(fs.readFileSync('data.js','utf8'),context);
const {nodes,edges,questions,sources}=context.window.ATLAS;
const ids=new Set(nodes.map(n=>n.id)),qids=new Set(questions.map(q=>q.id)),sids=new Set(sources.map(s=>s[0]));
assert.equal(ids.size,nodes.length);assert.equal(qids.size,questions.length);
for(const n of nodes){assert(n.sources.length);for(const s of n.sources)assert(sids.has(s),`${n.id}: missing source ${s}`);for(const f of ['mechanism','morph','clinic','pitfall'])assert(n[f]);assert(edges.some(e=>e.source===n.id||e.target===n.id),`${n.id}: isolated node`)}
for(const e of edges){assert(ids.has(e.source)&&ids.has(e.target));assert(e.label);assert.notEqual(e.source,e.target)}
for(const q of questions){assert(q.nodes.length);q.nodes.forEach(id=>assert(ids.has(id),`${q.id}: missing node ${id}`));assert([1,2,3].includes(q.level));assert(q.answer);if(q.pre){assert(qids.has(q.pre));assert(questions.find(p=>p.id===q.pre).level<=q.level);const seen=new Set([q.id]);let p=q;while(p.pre){assert(!seen.has(p.pre),'prerequisite cycle');seen.add(p.pre);p=questions.find(x=>x.id===p.pre)}}}
for(const f of ['index.html','style.css','app.js','data.js','icon.svg'])assert(fs.statSync(f).size>0);
assert.deepEqual([...new Set(questions.map(q=>q.kind))].sort(),['机制','概念','病例','综合'].sort());
console.log(`Verified ${nodes.length} knowledge nodes, ${edges.length} relations, ${questions.length} grounded questions, ${sources.length} sources.`);
