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
 assert.throws(()=>f(p,{kind:'convert',id:'test-1',expected:x.updatedAt,actor:'tester',cloth:'PP',width:64}),/group pending/);
 const y=f(p,{kind:'group',id:'test-1',expected:x.updatedAt,actor:'tester'}).record;
 const z=f(p,{kind:'convert',id:'test-1',expected:y.updatedAt,actor:'tester',cloth:'PP',width:64}).record;
 assert.equal(z.workNo,'CFM-101');assert.equal(p.pending[1].orderInboxId,'test-1');
 assert.equal(f(p,{kind:'convert',id:'test-1',expected:y.updatedAt,actor:'tester',cloth:'PP',width:64}).unchanged,true);
 assert.equal(p.pending.length,2);assert.equal(p.store.length,1);assert.equal(p.cutting.length,1);
 const x2=f(p,{kind:'add',id:'test-3',record:{...record,party:'SAMPLE 2'},actor:'tester'}).record;
 const z2=f(p,{kind:'convert',id:'test-3',expected:x2.updatedAt,actor:'tester',cloth:'PP',width:64,allowGroupPending:true}).record;
 assert.equal(z2.workNo,'CFM-102');assert.equal(Boolean(z2.groupSentAt),false);
 assert.equal(z2.history.at(-1).action,'WORK ORDER CREATED — GROUP PENDING');
 assert.equal(f(p,{kind:'convert',id:'test-3',expected:x2.updatedAt,actor:'tester',cloth:'PP',width:64,allowGroupPending:true}).unchanged,true);
 const g2=f(p,{kind:'group',id:'test-3',expected:z2.updatedAt,actor:'tester'}).record;
 assert.equal(Boolean(g2.groupSentAt),true);assert.equal(g2.workNo,'CFM-102');assert.equal(p.pending.length,3);

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

{
 const window={},document={readyState:'loading',addEventListener(){},getElementById(){return null}};
 for(const f of ['sync/bill-dispatch-ledger.js','cfm-advanced-bill-request-v444.js','cfm-morning-dispatch-v445.js'])runInNewContext(read(f),{window,document,setInterval:()=>1,clearInterval(){}});
 const p={pending:[{workNo:'CFM-TEST',party:'Sample',description:'Cloth',orderQty:12,status:'PENDING'},{workNo:'CFM-OLD',party:'Sample',description:'Cloth',orderQty:10,status:'DISPATCHED'},{workNo:'CFM-DONE',party:'Sample',description:'Cloth',orderQty:2,status:'COMPLETED'},{workNo:'CFM-ARCH',orderQty:7,status:'ARCHIVED'}],packingSlips:[{id:'TEST-1',workNo:'CFM-TEST',thisDispatched:4},{id:'TEST-2',workNo:'CFM-DONE',thisDispatched:2}]};
 const before=JSON.stringify(p),r=window.CFM_MORNING_DISPATCH_V445.build(p);
 assert.equal(r.open,1);assert.equal(r.rows.length,1);assert.equal(r.rows[0].balance,8);assert.equal(r.balance,8);assert.equal(r.review.length,1);assert.equal(r.closed.length,1);assert.equal(JSON.stringify(p),before);
 ok(true,'Morning dispatch list shows partial balance, excludes closed/archive, flags legacy quantities and never mutates ERP');
}

{
 const window={},document={readyState:'loading',addEventListener(){},getElementById(){return null}};
 for(const f of ['sync/bill-dispatch-ledger.js','cfm-advanced-bill-request-v444.js','cfm-morning-dashboard-v445.js'])runInNewContext(read(f),{window,document,setInterval:()=>1,clearInterval(){}});
 const r={workNo:'CFM-TEST',party:'SAMPLE',poNo:'P1',description:'Cloth',orderQty:12,cutQty:4,status:'PENDING'},p={pending:[r,{workNo:'CFM-OLD',party:'OLD',orderQty:10,cutQty:10,status:'DISPATCHED'}],packingSlips:[{id:'PACK-TEST',workNo:'CFM-TEST',thisDispatched:4}]};
 window.CFM_ADV_BILL_V444.transition(p,{id:'TEST',type:'BOTH',actor:'test',items:[{workNo:r.workNo,identity:JSON.stringify(['CFM-TEST','SAMPLE','P1','CLOTH',12]),qty:4}]});
 const before=JSON.stringify(p),d=window.CFM_MORNING_V445.calculate(p);
 assert.equal(d.totals.cutWO,1);assert.equal(d.totals.cutQty,8);assert.equal(d.totals.dispatchWO,1);assert.equal(d.totals.dispatchQty,8);assert.equal(d.totals.billQty,8);assert.equal(d.totals.challanQty,8);assert.equal(d.totals.review,1);assert.equal(JSON.stringify(p),before);
 ok(true,'Morning dashboard reports live 12/4/8 balance, flags legacy records and performs no writes');
}

{
 const window={},document={readyState:'loading',addEventListener(){},getElementById(){return null}};
 runInNewContext(read('cfm-morning-dashboard-v445.js'),{window,document,setInterval:()=>1,clearInterval(){}});
 const f=window.CFM_MORNING_V445.productDetails;
 const d=f({description:'GA1270 60" CF BAG PORE SIZE 5 μ',cloth:'333 ANT',width:'50',itemCode:'EFPPL-TEST',description2:'Double layer'});
 assert.equal(d.size,'60 inch');assert.equal(d.micron,'5');assert.equal(d.width,'50');assert.equal(d.cloth,'333 ANT');assert.equal(d.spec,'Double layer');
 const missing=f({description:'FBD 19 FINGER NEW',width:'60'});
 assert.equal(missing.size,'');assert.equal(missing.micron,'');assert.equal(missing.width,'60');
 assert.ok(window.CFM_MORNING_V445.productCell({description:'<test>'}).includes('&lt;test&gt;'));
 ok(true,'Dashboard shows source-backed size, micron and specifications without guessing from cloth width or finger count');
}

{
 const window={},document={readyState:'loading',addEventListener(){},getElementById(){return null}};
 for(const f of ['sync/bill-dispatch-ledger.js','cfm-manual-dispatch-v447.js'])runInNewContext(read(f),{window,document,setInterval:()=>1,clearInterval(){}});
 const l=window.CFM_BILL_DISPATCH_LEDGER,m=window.CFM_MANUAL_DISPATCH_V447;
 const r={workNo:'CFM-TEST',party:'SAMPLE',poNo:'PO-1',description:'Cloth',orderQty:12,cutQty:4,status:'PENDING'},p={pending:[r],packingSlips:[{id:'P1',workNo:r.workNo,thisDispatched:2}],store:[{id:'ROLL'}],cutting:[{id:'CUT'}]};
 const cmd={id:'MD1',workNo:r.workNo,identity:l.identity(r),expectedPacking:2,expectedManual:0,expectedLast:'',total:4,actor:'tester',reason:'Old challan',dispatchDate:'2026-11-01'};
 const before=JSON.stringify([p.store,p.cutting,p.packingSlips]);m.transition(p,cmd);
 assert.equal(l.summarize(r,p.packingSlips).confirmedDispatchQty,4);assert.equal(l.summarize(r,p.packingSlips).balanceQty,8);
 m.transition(p,cmd);assert.equal(r.manualDispatchHistory.length,1);
 assert.throws(()=>m.transition(p,{...cmd,id:'MD2',expectedManual:2,expectedLast:'MD1',total:1}),/between/);
 assert.equal(JSON.stringify([p.store,p.cutting,p.packingSlips]),before);
 p.packingSlips.push({id:'P2',workNo:r.workNo,thisDispatched:3});assert.equal(l.summarize(r,p.packingSlips).balanceQty,5);
 m.transition(p,{...cmd,id:'MD3',expectedPacking:5,expectedManual:2,expectedLast:'MD1',total:12});
 assert.equal(r.status,'DISPATCHED');assert.equal(l.summarize(r,p.packingSlips).balanceQty,0);assert.equal(r.cutQty,4);
 assert.throws(()=>m.transition(p,{...cmd,id:'MD4',expectedPacking:5,expectedManual:7,expectedLast:'MD3',total:8}),/reopen/);
 m.transition(p,{...cmd,id:'MD4',expectedPacking:5,expectedManual:7,expectedLast:'MD3',total:8,reopen:true});
 assert.equal(r.status,'PENDING');assert.equal(l.summarize(r,p.packingSlips).balanceQty,4);
 ok(true,'Manual old dispatch reconciles total without duplicate packing qty or stock changes, supports verified full and reopen corrections');
}

{
 const window={},document={readyState:'loading',addEventListener(){},getElementById(){return null}};
 for(const f of ['sync/bill-dispatch-ledger.js','cfm-manual-dispatch-v447.js'])runInNewContext(read(f),{window,document,setInterval:()=>1,clearInterval(){}});
 const l=window.CFM_BILL_DISPATCH_LEDGER,m=window.CFM_MANUAL_DISPATCH_V447;
 const r={workNo:'CFM-TEST',party:'SAMPLE',poNo:'P1',description:'Cloth',orderQty:12,cutQty:4,status:'PENDING'},p={pending:[r],packingSlips:[]};
 assert.equal(m.listState(p,r),'UNVERIFIED');
 const cmd={id:'T1',workNo:r.workNo,identity:l.identity(r),expectedPacking:0,expectedManual:0,expectedLast:'',total:4,actor:'test',reason:'old'};
 m.transition(p,cmd);assert.equal(m.listState(p,r),'PARTIAL');assert.equal(l.summarize(r,[]).balanceQty,8);
 m.transition(p,{...cmd,id:'T2',expectedManual:4,expectedLast:'T1',total:12});assert.equal(m.listState(p,r),'DONE');assert.equal(l.summarize(r,[]).balanceQty,0);
 ok(true,'Saved old dispatch entries leave default reconciliation queue; partial balance remains in dispatch ledger and completed history');
}

{
 const window={},document={readyState:'loading',addEventListener(){},getElementById(){return null}};
 for(const f of ['sync/bill-dispatch-ledger.js','cfm-manual-dispatch-v447.js'])runInNewContext(read(f),{window,document,setInterval:()=>1,clearInterval(){}});
 const l=window.CFM_BILL_DISPATCH_LEDGER,m=window.CFM_MANUAL_DISPATCH_V447;
 const r1={workNo:'CFM-TEST1',party:'SAMPLE',poNo:'P1',description:'Cloth',orderQty:12,cutQty:4,status:'PENDING'},r2={...r1,workNo:'CFM-TEST2',orderQty:5};
 const p={pending:[r1,r2],packingSlips:[{id:'P1',workNo:r1.workNo,thisDispatched:2}],store:[{id:'ROLL'}],cutting:[{id:'CUT'}]};
 const cmd=r=>({id:'MD-'+r.workNo,workNo:r.workNo,identity:l.identity(r),expectedPacking:r===r1?2:0,expectedManual:0,expectedLast:'',total:r.orderQty,actor:'test',reason:'Verified old dispatch'});
 const commands=[cmd(r1),cmd(r2)],before=JSON.stringify(p);
 assert.throws(()=>m.bulkTransition(p,[commands[0],{...commands[1],total:4}]),/full dispatch only/);assert.equal(JSON.stringify(p),before);
 assert.throws(()=>m.bulkTransition(p,[commands[0],commands[0]]),/Duplicate/);assert.equal(JSON.stringify(p),before);
 m.bulkTransition(p,commands);assert.equal(p.pending.every(r=>m.listState(p,r)==='DONE'),true);
 assert.equal(l.summarize(p.pending[0],p.packingSlips).confirmedDispatchQty,12);assert.equal(l.summarize(p.pending[0],p.packingSlips).manualQty,10);
 m.bulkTransition(p,commands);assert.equal(p.pending.every(r=>r.manualDispatchHistory.length===1),true);
 assert.equal(JSON.stringify([p.store,p.cutting,p.packingSlips]),JSON.stringify([JSON.parse(before).store,JSON.parse(before).cutting,JSON.parse(before).packingSlips]));
 ok(true,'Bulk full dispatch is atomic, idempotent, excludes saved entries and preserves stock/cutting/packing records');
}

{
 const window={},document={readyState:'loading',addEventListener(){}};
 runInNewContext(read('cfm-stitch-label-helper-v451.js'),{window,document});
 const f=window.CFM_STITCH_V451;
 assert.equal(f.orderNumber('CFM-461'),'461');
 assert.equal(f.explicitMicron({description:'ANFD 5 KL BAG 5 MICRON ANT'}),'5');
 assert.equal(f.explicitMicron({description:'JM-1 Finger/A/2 micron',description2:'60 inch'}),'2');
 assert.equal(f.explicitMicron({description:'FBD 19 FINGER',description2:'60 inch'}),'');
 assert.equal(f.getCode({itemCode:'',description:'Unknown product'}),'');
 ok(true,'Stitch label extracts only explicit micron, accepts work number and never fabricates missing code');
}

{
 const window={},document={readyState:'loading',addEventListener(){}};
 runInNewContext(read('cfm-all-report-print-v452.js'),{window,document,setInterval:()=>1});
 const api=window.CFM_REPORT_PRINT_V452,payload={departmentWork:[{date:'2026-11-16',workNo:'CFM-1',person:'<test>'}],reconstructedPersonWork:[{date:'2026-08-18',workNo:'CFM-2',doneQty:4},{date:'',workNo:'CFM-3'}],cutting:[],reconstructedBatchReports:[]};
 const before=JSON.stringify(payload),report=api.render({version:1,payload},['actual','person'],'','',true);
 assert.equal(api.selectRows(payload,api.specs[1],'2026-11-01','2026-11-30',false).length,0);
 assert.ok(report.includes('DATE NOT RECORDED')&&report.includes('NOT verified attendance')&&report.includes('&lt;test&gt;'));
 assert.ok(report.includes('CFM-1')&&report.includes('CFM-2')&&report.includes('CFM-3'));
 assert.equal(JSON.stringify(payload),before);
 ok(true,'All report print separates actual and review entries, supports undated rows and is read-only');
}

{
 const window={},document={readyState:'loading',addEventListener(){},getElementById(){return null}};
 runInNewContext(read('cfm-order-control-v443.js'),{window,document,setInterval:()=>1,clearInterval(){}});
 const {transition:f,candidates}=window.CFM_ORDER_CONTROL_V443;
 const r={id:'r',orderNo:'ORD-1',party:'SAMPLE',itemCode:'EFPPL-2001-CF-48-ORD',description:'CF Bag 48 Ordinary',specification:'5 micron',qty:5,orderDate:'2026-11-27',deliveryDate:'2026-11-30',updatedAt:'v1',poNo:'Verble'};
 const w={workNo:'CFM-792',party:'Sample',itemCode:r.itemCode,description:'CF BAG 48 ordinary 5micron',orderQty:5,orderDate:'2026-11-26',deliveryDate:r.deliveryDate,poNo:'Very',status:'PENDING',cloth:'333PL',width:50};
 const p={orderInbox:[r],pending:[w],store:[{id:'s'}],cutting:[{id:'c'}]};
 assert.equal(candidates(p,r).length,1);
 assert.throws(()=>f(p,{kind:'convert',id:'r',expected:'v1',actor:'test',cloth:'333PL',width:50,allowGroupPending:true}),/Matching existing/);
 assert.throws(()=>f(p,{kind:'link',id:'r',workNo:'CFM-792',expected:'v1',actor:'test'}),/not confirmed/);
 const x=f(p,{kind:'link',id:'r',workNo:'CFM-792',expected:'v1',actor:'test',confirmed:true}).record;
 assert.equal(x.workNo,'CFM-792');assert.equal(w.orderInboxId,'r');assert.equal(p.pending.length,1);assert.equal(Boolean(x.groupSentAt),false);
 assert.equal(f(p,{kind:'link',id:'r',workNo:'CFM-792',expected:'v1',actor:'test',confirmed:true}).unchanged,true);
 assert.equal(p.store.length,1);assert.equal(p.cutting.length,1);assert.equal(w.poNo,'Very');
 ok(true,'Existing WO candidate requires confirmation, links exactly once and preserves production/group details');
}

{
 const window={},document={readyState:'loading',addEventListener(){},getElementById(){return null}};
 for(const file of ['sync/bill-dispatch-ledger.js','cfm-advanced-bill-request-v444.js'])runInNewContext(read(file),{window,document,setInterval:()=>1,clearInterval(){}});
 const f=window.CFM_ADV_BILL_V444,r={workNo:'CFM-TEST',party:'SAMPLE',poNo:'P1',description:'Cloth',orderQty:12},p={pending:[r],packingSlips:[],store:[{id:'s'}],cutting:[{id:'c'}]};
 const items=f.simpleItems(p,[r],'BILL',()=>4);
 f.transition(p,{id:'simple',type:'BILL',actor:'test',items});
 assert.equal(f.simpleItems(p,[r],'BILL',()=>8)[0].requestBalance,0);
 assert.throws(()=>f.simpleItems(p,[r],'BILL',()=>9),/request balance/);
 assert.throws(()=>f.simpleItems(p,[{...r,orderQty:13}],'BILL',()=>1),/changed/);
 assert.equal(r.deliveredMaterial,undefined);
 assert.equal(p.store.length,1);assert.equal(p.cutting.length,1);
 ok(true,'Simple original form validates live quantities and preserves dispatch and stock');
}
