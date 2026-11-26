/* Read-only CI regression preflight for CFM. Does NOT create a Work Order. */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { Script, runInNewContext } from 'node:vm';
const file=p=>new URL('../'+p,import.meta.url),read=p=>readFileSync(file(p),'utf8');
let checks=0;
function ok(v,m){assert.ok(v,m);checks++;console.log('✓ '+m)}
function has(p,x){ok(read(p).includes(x),p+' includes '+x)}
const index=read('index.html');
const chunks=[...new Set([...index.matchAll(/chunks\/s\d-\d+\.txt/g)].map(x=>x[0]))];
ok(chunks.length>=27,'All source code chunks are referenced by the loader');
for(const p of chunks)ok(existsSync(file(p)),'Source chunk present: '+p);
const scripts=[
 'backup-safe.js','backup-guardian.js','cfm-sap-workorder-ui.js',
 'cfm-workno-reconcile.js','cfm-efppl-master-v330.js',
 'cfm-sop-register.js','cfm-department-sop-v319.js','cfm-plant-production-sop.js',
 'cfm-dashboard-compact-v343.js','cfm-theme-a-v344.js',
 'cfm-dashboard-bottom-v345.js','cfm-operator-safety-v347.js','cfm-cutting-reconciliation.js',
 'cfm-intelligence-core.js'
];
scripts.push('cfm-daily-person-safe-cloud-v424.js');
for(const p of scripts){
 ok(existsSync(file(p)),'ERP support script present: '+p);
 try{new Script(read(p),{filename:p})}catch(e){throw new Error('Syntax error in '+p+': '+e.message)}
 checks++;
}
for(const p of ['cfm-submodules-compact-v346.css','cfm-standalone-compact-v346.css','fast-work-order.html','po-workorder.html','cutting-print-live.html'])
 ok(existsSync(file(p)),'Critical workspace available: '+p);
has('fast-work-order.html','cfm_fast_po_reference');
has('fast-work-order.html','cfm_append_pending_orders');
has('chunks/s2-008.txt','function physicalStockSummary()');
has('chunks/s2-008.txt','function srlBalance(');
has('chunks/s2-008.txt','function renderPending()');
has('chunks/s2-008.txt',"selectedStatus==='DISPATCHED'");
has('chunks/s2-008.txt','async function cloudInit()');
has('backup-safe.js','indexedDB');
has('backup-guardian.js','indexedDB');
has('cfm-theme-a-v344.js','physicalStockSummary');
has('cfm-dashboard-bottom-v345.js','cfmV195DashboardAudit');
has('cfm-operator-safety-v347.js','cfmOperatorSafetyCheck');
has('index.html','cfm-operator-safety-v347.js?v=347');
for(const p of ['cfm-theme-a-v344.js','cfm-dashboard-bottom-v345.js','cfm-dashboard-compact-v343.js'])
 has('index.html',p);
const sop=read('cfm-plant-production-sop.js'), worker=read('chunks/s3-000.txt');
ok(sop.includes("if (kind === 'department') return; // Person work reports always save"), 'Daily Person Work save bypasses SOP hold');
ok(sop.includes("kind === 'order' || kind === 'department'"), 'Daily Work form does not require production SOP approval');
ok(worker.includes('rec.reportOnly=true;'), 'Daily Worker entries are logged as report-only');
ok(sop.includes('r.reportOnly !== true'), 'SOP production handover excludes report-only worker logs');
ok(worker.includes('x.reportOnly!==true'), 'Stage availability previews exclude unverified worker logs');
ok(sop.includes('supervisor:supervisor.trim(),reportOnly:false'), 'Verified Batch stage entries remain handover eligible');
has('index.html','cfm-plant-production-sop.js?v=438');
 has('index.html','cfm-sop-register.js?v=438');
 ok(sop.includes("await directRecord('departmentWork',intended,'cfmBatchEntryId'"), 'Batch save uses direct verified append');
 ok(sop.includes('version=eq.'+"'"+"+base") || sop.includes("version=eq.'+base"), 'Direct save uses current-version CAS');
 ok(read('cfm-sop-register.js').includes("await window.CFM_DIRECT_RECORD_V438('sopRecords'"), 'SOP checklist uses direct verified append');
ok(!index.includes('cfm-jessi-voice.js'),'Removed Jessi is not loaded again');
console.log('CFM read-only deployment safety checks passed: '+checks);

// V424: Daily Person Work Cloud upload is isolated from conflicted phone stock and orders.
const daily=read('cfm-daily-person-safe-cloud-v424.js');
ok(daily.includes("payload.departmentWork=original.map(copy).concat(copy(record))"),'Daily Work performs one append only');
ok(daily.includes("for(const key of Object.keys(before.payload))"),'Other Cloud families preserved');
ok(daily.includes("version=eq."),'Cloud compare-and-swap remains mandatory');
ok(daily.includes('const verified=await cloudFetch()'),'Daily Work Cloud receipt is checked');
has('index.html','cfm-daily-person-safe-cloud-v424.js?v=425');

// V425 targeted Daily Work has an independent verified Cloud receipt and protected mobile recovery.
ok(daily.includes("pending.set(entry.cfmDailyEntryId,copy(entry))"),'Every Daily Work save enters the targeted Cloud queue');
ok(daily.includes("recoverLocalDailyWork"),'Offline recovery/retry path exists');
ok(daily.includes("state.departmentWork.push(copy(remoteRecord))"),'Other mobile Daily Work received by immutable ID');
ok(daily.includes("JSON.stringify(cloudStatePayload())===JSON.stringify(verified.payload)"),'Full-state version must not advance on unaligned local records');

{
 const initial={version:10,payload:{pending:[{workNo:'CFM-TEST',orderQty:4}],store:[{srlNo:'TEST-SRL'}],cutting:[{id:'CUT-TEST'}],sopRecords:[],departmentWork:[]}};
 let server=structuredClone(initial),writes=0;
 const win={},doc={readyState:'loading',addEventListener(){},getElementById(){return null}};
 const ctx={window:win,document:doc,cloudBusy:false,cloudDirty:true,validState:p=>Array.isArray(p.pending),clone:structuredClone,
  CLOUD_URL:'https://test.invalid',cloudHeaders:()=>({}),AbortController,setTimeout:()=>1,clearTimeout(){},
  cloudFetch:async()=>structuredClone(server),
  fetch:async(url,options)=>{writes++;const body=JSON.parse(options.body);assert.match(url,new RegExp('version=eq\\.'+server.version+'$'));
   assert.deepEqual(body.payload.pending,initial.payload.pending);assert.deepEqual(body.payload.store,initial.payload.store);assert.deepEqual(body.payload.cutting,initial.payload.cutting);
   server={version:body.version,payload:body.payload};return {ok:true,json:async()=>[server]}}};
 runInNewContext(sop,ctx,{timeout:1000});
 const rec={id:'TEST-SOP',results:{A:'PASS'},operator:'TEST'};
 await win.CFM_DIRECT_RECORD_V438('sopRecords',rec,'id',()=> '');
 await win.CFM_DIRECT_RECORD_V438('sopRecords',{operator:'TEST',results:{A:'PASS'},id:'TEST-SOP'},'id',()=> '');
 assert.equal(writes,1);assert.equal(server.payload.sopRecords.length,1);
 await assert.rejects(win.CFM_DIRECT_RECORD_V438('sopRecords',{...rec,operator:'OTHER'},'id',()=> ''),/identity conflict/);
 await assert.rejects(win.CFM_DIRECT_RECORD_V438('departmentWork',{cfmBatchEntryId:'TEST-BATCH'},'cfmBatchEntryId',()=> 'Stage limit'),/Stage limit/);
 assert.equal(writes,1);assert.equal(ctx.cloudBusy,false);
 ok(true,'Direct SOP append preserves production data, rejects conflicts and safely retries same receipt');
}

{
 const first=worker.indexOf('const cfmBillQty442=new Map()'),last=worker.indexOf('function billRequestMessage(){',first);
 assert.ok(first>=0&&last>first);
 const render=runInNewContext(worker.slice(first,last)+'\ncfmBillRequestFormat442');
 const rows=[{party:'SAMPLE PHARMA',poNo:'PO-1',workNo:'CFM-1',itemCode:'EFPPL-7000-SFC',description:'Spiral Filter Cloth',description2:'64 x 380',orderQty:24},{party:'SAMPLE PHARMA',poNo:'PO-2',workNo:'CFM-2',itemCode:'EFPPL-3002-BFB',description:'Basket Filter Bag',orderQty:5},{party:'SAMPLE PHARMA',poNo:'PO-1',workNo:'CFM-3',itemCode:'EFPPL-3001-SNF',description:'SNF Filter Bag',orderQty:3}];
 const out=render(rows,'CHALLAN','','26/11/2026',r=>r.workNo==='CFM-1'?'2':String(r.orderQty),r=>r.itemCode);
 assert.ok(out.includes('*Company Name:* SAMPLE PHARMA\n*PO No.:* PO-1'));
 assert.ok(out.indexOf('CFM-3')<out.indexOf('*PO No.:* PO-2'));
 assert.ok(out.includes('EFPPL Code: EFPPL-7000-SFC'));
 assert.ok(out.includes('*Total Qty: 10 Nos.*'));
 assert.ok(out.includes('*CHALLAN REQUEST*'));
 assert.ok(render(rows,'BOTH','','26/11/2026',()=>'',r=>r.itemCode).includes('*Total Qty: VERIFY QTY*'));
 ok(true,'Bill/challan grouping, codes, partial quantities and invalid quantity guard');
}

{
 const window={},document={readyState:'loading',addEventListener(){},getElementById(){return null}};
 runInNewContext(read('cfm-order-control-v443.js'),{window,document,setInterval:()=>1,clearInterval(){}});
 const f=window.CFM_ORDER_CONTROL_V443.transition,p={pending:[{workNo:'CFM-100',party:'OLD'}],store:[{srlNo:'TEST'}],cutting:[{id:'TEST'}]};
 const record={party:'SAMPLE',description:'Spiral Filter Cloth',poNo:'',specification:'64x380',qty:10,source:'Phone Call',priority:'NORMAL',itemCode:'EFPPL-7000-SFC',orderDate:'2026-11-26'};
 const x=f(p,{kind:'add',id:'test-1',record,actor:'tester'}).record;
 assert.equal(p.orderInbox.length,1);
 assert.equal(f(p,{kind:'add',id:'test-1',record,actor:'tester'}).unchanged,true);
 assert.throws(()=>f(p,{kind:'add',id:'test-2',record,actor:'tester'}),/already exists/);
 assert.throws(()=>f(p,{kind:'convert',id:'test-1',expected:x.updatedAt,actor:'tester',cloth:'PP',width:64}),/Group Sent|group sent/);
 const y=f(p,{kind:'group',id:'test-1',expected:x.updatedAt,actor:'tester'}).record;
 const z=f(p,{kind:'convert',id:'test-1',expected:y.updatedAt,actor:'tester',cloth:'PP',width:64}).record;
 assert.equal(z.workNo,'CFM-101');assert.equal(p.pending[1].orderInboxId,'test-1');
 assert.equal(f(p,{kind:'convert',id:'test-1',expected:y.updatedAt,actor:'tester',cloth:'PP',width:64}).unchanged,true);
 assert.equal(p.pending.length,2);assert.equal(p.store.length,1);assert.equal(p.cutting.length,1);
 ok(true,'Order Inbox deduplicates entries and converts exactly once without changing stock/cutting');
}

{
 const window={},document={readyState:'loading',addEventListener(){},getElementById(){return null}};
 runInNewContext(read('sync/bill-dispatch-ledger.js'),{window});
 runInNewContext(read('cfm-advanced-bill-request-v444.js'),{window,document,setInterval:()=>1,clearInterval(){}});
 const f=window.CFM_ADV_BILL_V444,r={workNo:'CFM-TEST',party:'SAMPLE',poNo:'P1',description:'Cloth',orderQty:12},p={pending:[r],packingSlips:[],store:[{id:'test'}],cutting:[{id:'test'}]};
 const req={id:'TEST',type:'BOTH',actor:'test',items:[{workNo:r.workNo,identity:JSON.stringify(['CFM-TEST','SAMPLE','P1','CLOTH',12]),qty:4}]};
 f.transition(p,req);let s=f.summary(p,r,'BOTH');assert.equal(s.remaining,8);assert.equal(s.dispatchPending,12);assert.equal(s.bill,4);assert.equal(s.challan,4);
 p.packingSlips.push({id:'PACK-TEST',workNo:r.workNo,thisDispatched:4});assert.equal(f.summary(p,r,'BOTH').dispatchPending,8);
 f.transition(p,req);assert.equal(p.accountsQtyRequests.length,1);assert.throws(()=>f.transition(p,{...req,id:'TEST-2',items:[{...req.items[0],qty:9}]}),/exceeds/);
 assert.equal(p.store.length,1);assert.equal(p.cutting.length,1);assert.equal(r.deliveredMaterial,undefined);
 ok(true,'Partial quantity request and actual dispatch ledgers are separate; duplicate and over-request protection');
}
