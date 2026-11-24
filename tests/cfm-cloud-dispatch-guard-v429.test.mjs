/* V429 original CFM Cloud overwrite safety. Read-only: no production writes. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../chunks/s2-008.txt',import.meta.url),'utf8');
const idx=src.indexOf('async function cloudPush(force=false)');
const end=src.indexOf('let cloudDirty=false;',idx);
const push=src.slice(idx,end);
const a=push.indexOf('const localWorkMap='),b=push.indexOf('const restored=',a);
const guard=push.slice(a,b);
const normalize=x=>String(x||'').trim().toUpperCase().replace(/\s+/g,' ');
const num=x=>Number.isFinite(Number(x))?Number(x):0;
const verify=new Function('state','remote','normalize','num',guard);
const run=(cloud,phone)=>verify({pending:[phone]},{payload:{pending:[cloud]}},normalize,num);

test('CFM sync Dashboard shows real Cloud status and not a generic pending banner',()=>{
 const start=src.indexOf('function setCloudBadge('),end=src.indexOf('function cloudStatePayload()',start);
 const code=src.slice(start,end);
 assert.doesNotThrow(()=>new Function(code));
 assert.match(code,/Review Required/);
 assert.match(code,/Phone Cache Limited/);
 assert.match(code,/Cloud Connected/);
 assert.match(code,/Sync Pending/);
 assert.doesNotMatch(code,/Syncing \/ Pending/);
});
test('Cloud protection runs before stale mobile can PATCH full snapshot',()=>{
 assert.doesNotThrow(()=>new Function(push));
 assert.ok(push.indexOf('const remote=await cloudFetch()')<a);
 assert.ok(a>0);
 assert.ok(b>a);
 assert.ok(b<push.indexOf("method:'PATCH'"));
 assert.match(push,/version=eq\./);
 assert.match(push,/already DISPATCHED in Cloud/);
});
test('Never revert a Cloud DISPATCHED Work Order to old phone pending',()=>{
 assert.throws(()=>run(
  {workNo:'CFM-461',status:'DISPATCHED',cutQty:1,dispatchDoneAt:'2026-11-15T14:50:14Z'},
  {workNo:'CFM-461',status:'PENDING',cutQty:1}),/already DISPATCHED/);
 assert.throws(()=>run(
  {workNo:'CFM-580',status:'DISPATCHED',cutQty:0,dispatchDoneAt:'2026-11-15'},
  {workNo:'CFM-580',status:'DISPATCHED',cutQty:0}),/already DISPATCHED/);
});
test('Never reduce completed Cloud Cutting from a stale phone',()=>{
 assert.throws(()=>run(
  {workNo:'CFM-782',status:'PENDING',cutQty:9},
  {workNo:'CFM-782',status:'PENDING',cutQty:4}),/Cloud Cutting Qty is higher/);
});
test('Safe phone order and new phone-only draft can still reach normal guarded flow',()=>{
 assert.doesNotThrow(()=>run(
  {workNo:'CFM-782',status:'PENDING',cutQty:4},
  {workNo:'CFM-782',status:'PENDING',cutQty:4}));
 assert.doesNotThrow(()=>verify(
  {pending:[{workNo:'CFM-783',status:'PENDING',cutQty:0}]},
  {payload:{pending:[{workNo:'CFM-782',status:'PENDING',cutQty:4}]}},
  normalize,num));
});
