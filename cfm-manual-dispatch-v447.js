/* Manual historical dispatch reconciliation. Cumulative actual quantity, no stock/cutting/packing write. */
(function(){
'use strict';
const $=id=>document.getElementById(id),T=x=>String(x??'').trim(),N=x=>T(x).toUpperCase(),A=x=>Array.isArray(x)?x:[],E=x=>T(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ledger=()=>window.CFM_BILL_DISPATCH_LEDGER,ID=()=>globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2);
function transition(p,cmd){
 const matches=A(p.pending).filter(r=>N(r.workNo)===N(cmd.workNo));
 if(matches.length!==1)throw Error('Work Order missing or duplicate');
 const r=matches[0],history=A(r.manualDispatchHistory),existing=history.find(x=>x.id===cmd.id);
 if(existing){if(existing.total!==cmd.total||existing.identity!==cmd.identity)throw Error('Request ID conflict');return existing}
 if(r.archived||['ARCHIVED','CANCELLED','CANCELED'].includes(N(r.status)))throw Error('Archived / cancelled Work Order');
 if(!cmd.id||ledger().identity(r)!==cmd.identity||!T(cmd.actor)||!T(cmd.reason))throw Error('Work Order changed, or operator/reason missing');
 const s=ledger().summarize(r,A(p.packingSlips)),last=history.at(-1);
 if(s.packingQty!==cmd.expectedPacking||s.manualQty!==cmd.expectedManual||(last?.id||'')!==cmd.expectedLast)throw Error('Dispatch history changed. Refresh before confirming.');
 if(!Number.isSafeInteger(cmd.total)||cmd.total<s.packingQty||cmd.total>s.orderQty)throw Error('Total actually sent must be between already recorded '+s.packingQty+' and order '+s.orderQty);
 const closed=N(r.status)==='DISPATCHED'||!!r.dispatchDoneAt;
 if(closed&&cmd.total<s.orderQty&&!cmd.reopen)throw Error('Previously closed order: explicit reopen confirmation required.');
 const rec={id:cmd.id,identity:cmd.identity,total:cmd.total,additionalQty:cmd.total-s.packingQty,packingQtyAtEntry:s.packingQty,previousManualQty:s.manualQty,previousStatus:r.status||'',actor:T(cmd.actor),reason:T(cmd.reason),dispatchDate:T(cmd.dispatchDate),billNo:T(cmd.billNo),challanNo:T(cmd.challanNo),recordedAt:new Date().toISOString()};
 r.manualDispatchHistory=[...history,rec];
 if(cmd.total===s.orderQty){r.status='DISPATCHED';r.dispatchDoneAt=r.dispatchDoneAt||rec.recordedAt;r.dispatchConfirmationSource='MANUAL_HISTORY_RECONCILIATION';r.dispatchBatchReportStatus=r.dispatchBatchReportStatus||'PENDING_REVIEW';}
 else if(closed){r.previousDispatchDoneAt=r.dispatchDoneAt||'';r.dispatchDoneAt='';r.status=Number(r.cutQty||0)>=s.orderQty?'COMPLETED':'PENDING';r.restoredAt=rec.recordedAt;r.dispatchConfirmationSource='MANUAL_HISTORY_RECONCILIATION';}
 return rec;
}
async function commit(cmd){
 if(cloudBusy)throw Error('Another save is running. Retry shortly.');cloudBusy=true;
 try{for(let i=0;i<3;i++){
  const s=await cloudFetch();if(!s||!validState(s.payload)||!Number.isSafeInteger(Number(s.version)))throw Error('Database unavailable');
  const p=clone(s.payload),r=p.pending.find(x=>N(x.workNo)===N(cmd.workNo)),already=A(r?.manualDispatchHistory).some(x=>x.id===cmd.id);
  const rec=transition(p,cmd);if(already)return s;
  const base=Number(s.version),ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),20000);let ack,err;
  try{const res=await fetch(CLOUD_URL+'/rest/v1/cfm_shared_state?id=eq.main&version=eq.'+base,{method:'PATCH',signal:ctrl.signal,headers:{...cloudHeaders(),Prefer:'return=representation','x-cfm-base-version':String(base)},body:JSON.stringify({payload:p,version:base+1,updated_at:new Date().toISOString()})});if(!res.ok)throw Error('HTTP '+res.status);ack=await res.json()}catch(e){err=e}finally{clearTimeout(timer)}
  const checked=await cloudFetch(),w=A(checked?.payload?.pending).find(x=>N(x.workNo)===N(cmd.workNo)),hit=A(w?.manualDispatchHistory).find(x=>x.id===cmd.id);
  if(hit&&Object.keys(rec).every(k=>hit[k]===rec[k]))return checked;
  if(err)throw Error('Receipt not verified. Retry same entry: '+err.message);
  if(Array.isArray(ack)&&!ack.length)continue;throw Error('Receipt not verified. Retry same entry.');
 }throw Error('Concurrent changes. Refresh and retry.')}finally{cloudBusy=false}
}
function bulkTransition(p,commands){
 if(!Array.isArray(commands)||!commands.length||commands.length>100)throw Error('Select 1–100 Work Orders');
 const seen=new Set(),copy=JSON.parse(JSON.stringify(p));
 const records=commands.map(cmd=>{
  const k=N(cmd.workNo);if(seen.has(k))throw Error('Duplicate selected Work Order');seen.add(k);
  const r=A(copy.pending).find(x=>N(x.workNo)===k);
  if(!r||cmd.total!==Number(r.orderQty))throw Error(cmd.workNo+': full dispatch only');
  if(!A(r.manualDispatchHistory).some(x=>x.id===cmd.id)&&listState(copy,r)==='DONE')throw Error(cmd.workNo+': already fully dispatched');
  return transition(copy,cmd);
 });
 p.pending=copy.pending;return records;
}
async function bulkCommit(commands){
 if(cloudBusy)throw Error('Another save is running. Retry shortly.');cloudBusy=true;
 try{for(let i=0;i<3;i++){
  const s=await cloudFetch();if(!s||!validState(s.payload)||!Number.isSafeInteger(Number(s.version)))throw Error('Database unavailable');
  const p=clone(s.payload),already=commands.every(c=>A(p.pending.find(x=>N(x.workNo)===N(c.workNo))?.manualDispatchHistory).some(x=>x.id===c.id));
  const records=bulkTransition(p,commands);if(already)return s;
  const base=Number(s.version),ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),20000);let ack,err;
  try{const res=await fetch(CLOUD_URL+'/rest/v1/cfm_shared_state?id=eq.main&version=eq.'+base,{method:'PATCH',signal:ctrl.signal,headers:{...cloudHeaders(),Prefer:'return=representation','x-cfm-base-version':String(base)},body:JSON.stringify({payload:p,version:base+1,updated_at:new Date().toISOString()})});if(!res.ok)throw Error('HTTP '+res.status);ack=await res.json()}catch(e){err=e}finally{clearTimeout(timer)}
  const checked=await cloudFetch();
  if(commands.every((c,j)=>{const w=A(checked?.payload?.pending).find(x=>N(x.workNo)===N(c.workNo)),hit=A(w?.manualDispatchHistory).find(x=>x.id===c.id);return hit&&Object.keys(records[j]).every(k=>hit[k]===records[j][k]);}))return checked;
  if(err)throw Error('Bulk receipt not verified. Retry same selection: '+err.message);
  if(Array.isArray(ack)&&!ack.length)continue;throw Error('Bulk receipt not verified. Retry same selection.');
 }throw Error('Concurrent changes. Retry same selection.')}finally{cloudBusy=false}
}
let snap=null,busy=false,attempt=null,bulkAttempt=null;const picked=new Set();
function bulkRows(){
 return A(snap?.payload?.pending).filter(r=>['UNVERIFIED','PARTIAL'].includes(listState(snap.payload,r)));
}
function drawBulk(){
 if(!snap)return;
 const q=N($('mdBulkSearch').value),rows=bulkRows(),valid=new Set(rows.map(r=>N(r.workNo)));
 if(!bulkAttempt)for(const k of picked)if(!valid.has(k))picked.delete(k);
 $('mdBulkRows').innerHTML=rows.filter(r=>!q||N([r.workNo,r.party,r.poNo,r.description].join(' ')).includes(q)).map(r=>{
  const d=ledger().summarize(r,A(snap.payload.packingSlips)),k=N(r.workNo);
  return '<label style="display:flex;gap:9px;align-items:flex-start;border-bottom:1px solid #d9e3ea;padding:7px 0"><input type="checkbox" data-md-bulk="'+E(k)+'" '+(picked.has(k)?'checked':'')+' '+(bulkAttempt?'disabled':'')+'><span><b>'+E(r.workNo)+' · '+E(r.party)+'</b><br>'+E(r.description)+'<br><small>Order '+d.orderQty+' · Recorded '+d.confirmedDispatchQty+' · Remaining '+d.balanceQty+' Nos.</small></span></label>';
 }).join('')||'No eligible Work Orders.';
 $('mdBulkCount').textContent=picked.size+' selected · '+rows.filter(r=>picked.has(N(r.workNo))).reduce((a,r)=>a+Number(r.orderQty),0)+' total order Nos.';
 $('mdBulkSave').disabled=busy||(!bulkAttempt&&!picked.size);
}
async function saveBulk(){
 if(busy||attempt)return;
 try{
  if(!bulkAttempt){
   const actor=T($('mdActor').value),reason=T($('mdReason').value);
   if(!actor||!reason)throw Error('Enter Updated by and Reason / evidence reference below.');
   const rows=bulkRows().filter(r=>picked.has(N(r.workNo)));
   if(!rows.length||rows.length>100)throw Error('Select 1–100 Work Orders');
   if(!confirm('Confirm ALL '+rows.length+' selected Work Orders were physically FULLY dispatched? No stock deduction.'))return;
   bulkAttempt=rows.map(r=>{const d=ledger().summarize(r,A(snap.payload.packingSlips));return {id:ID(),workNo:r.workNo,identity:ledger().identity(r),expectedPacking:d.packingQty,expectedManual:d.manualQty,expectedLast:A(r.manualDispatchHistory).at(-1)?.id||'',total:d.orderQty,actor,reason,reopen:false,dispatchDate:'',billNo:'',challanNo:''}});
  }
  busy=true;$('mdBulkSave').disabled=true;$('mdSave').disabled=true;msg('Saving all selected Work Orders directly…');
  snap=await bulkCommit(bulkAttempt);const count=bulkAttempt.length;bulkAttempt=null;picked.clear();$('mdWork').value='';drawOrders();drawBulk();msg('SAVED · '+count+' fully dispatched Work Orders removed from pending list.');window.CFM_MORNING_V445?.refresh();try{if(!cloudDirty)setTimeout(()=>cloudPoll(),0)}catch(_){}
 }catch(e){msg(e.message);alert(e.message)}finally{busy=false;drawBulk();$('mdSave').disabled=!!bulkAttempt||!row()}
}
const msg=x=>{$('mdStatus').textContent=x},row=()=>A(snap?.payload?.pending).find(r=>N(r.workNo)===N($('mdWork').value));
function listState(p,r){
 if(r.archived||['ARCHIVED','CANCELLED','CANCELED'].includes(N(r.status)))return 'EXCLUDED';
 try{const s=ledger().summarize(r,A(p.packingSlips));return s.balanceQty===0?'DONE':s.manualVerified?'PARTIAL':'UNVERIFIED'}catch(e){return 'REVIEW'}
}
function drawOrders(){
 const search=N($('mdSearch').value),current=$('mdWork').value;
 const mode=$('mdListMode').value;
 const rows=A(snap?.payload?.pending).filter(r=>{const k=listState(snap.payload,r);return (mode==='HISTORY'?k==='DONE'||k==='PARTIAL':k==='UNVERIFIED'||k==='REVIEW')&&(!search||N([r.workNo,r.party,r.poNo,r.description].join(' ')).includes(search))});
 $('mdListCount').textContent=rows.length+' Work Orders · '+(mode==='HISTORY'?'Saved / completed history':'Awaiting historical reconciliation');
 $('mdWork').innerHTML='<option value="">Select Work Order</option>'+rows.map(r=>'<option value="'+E(r.workNo)+'">'+E(r.workNo+' | '+r.party+' | '+r.description)+'</option>').join('');
 if(rows.some(r=>r.workNo===current))$('mdWork').value=current;
 drawDetail();
}
function drawDetail(){
 const r=row();$('mdSave').disabled=!r;const detail=$('mdDetail');if(!r){detail.textContent='Select Work Order.';$('mdTotal').value='';$('mdFull').checked=false;$('mdBalance').textContent='';$('mdHistory').textContent='';return}
 try{const s=ledger().summarize(r,A(snap.payload.packingSlips));detail.innerHTML='<b>'+E(r.party)+'</b><p>PO: '+E(r.poNo||'Not recorded')+' · '+E(r.description)+'</p><p>Order: '+s.orderQty+' · Already recorded in packing: '+s.packingQty+' · Manual old dispatch: '+s.manualQty+' · Recorded total: '+s.confirmedDispatchQty+'</p><small>Enter cumulative total actually dispatched, INCLUDING all saved packing slips. Not an additional shipment.</small>';
 $('mdTotal').min=String(s.packingQty);$('mdTotal').max=String(s.orderQty);$('mdTotal').value=s.confirmedDispatchQty||'';
 $('mdFull').checked=false;preview();
 $('mdHistory').innerHTML=A(r.manualDispatchHistory).slice().reverse().map(x=>'<p>'+E(x.recordedAt)+' · '+E(x.actor)+' · Total '+E(x.total)+' · Manual '+E(x.additionalQty)+' · '+E(x.reason)+' · Date '+E(x.dispatchDate||'Not recorded')+' · Bill '+E(x.billNo||'—')+' · Challan '+E(x.challanNo||'—')+'</p>').join('')||'No manual history.';
 }catch(e){detail.textContent=e.message;$('mdSave').disabled=true}
}
function preview(){const r=row();if(!r)return;try{const s=ledger().summarize(r,A(snap.payload.packingSlips)),q=Number($('mdTotal').value);$('mdBalance').textContent=$('mdTotal').value!==''&&Number.isSafeInteger(q)&&q>=s.packingQty&&q<=s.orderQty?'Actual sent: '+q+' Nos. · Dispatch balance: '+(s.orderQty-q)+' Nos.':'Verify total dispatched quantity.'}catch(e){$('mdBalance').textContent=e.message}}
async function refresh(){if(busy)return;try{snap=await cloudFetch();if(!snap||!validState(snap.payload))throw Error('Invalid database snapshot');drawOrders();drawBulk();msg('Live database loaded. No changes made.')}catch(e){msg(e.message)}}
function mount(){
 const host=$('cfm445Morning')||$('view-dashboard');if(!host||$('mdOpen'))return;
 const b=document.createElement('button');b.id='mdOpen';b.type='button';b.textContent='OLD DISPATCH UPDATE · Partial / Full';b.style.cssText='width:100%;margin:6px 0;padding:11px;background:#174b75;color:white;border:0;border-radius:7px;font-weight:800';host.prepend(b);
 const d=document.createElement('dialog');d.id='mdDialog';d.style.cssText='width:min(96vw,720px);max-height:94dvh;overflow:auto;background:white;color:#17374d;border:1px solid #aac2d1;border-radius:10px;padding:14px;font:14px Arial';
 d.innerHTML='<style>#mdDialog *{box-sizing:border-box}#mdDialog label{display:block;font-weight:bold;margin:6px 0}#mdDialog input:not([type=checkbox]),#mdDialog select,#mdDialog textarea{display:block;width:100%;padding:9px;font:16px Arial;border:1px solid #afc5d4;border-radius:6px;background:white;color:#17374d}#mdDialog button{padding:9px;border:1px solid #a9bfce;border-radius:6px;background:#eef6fb;color:#174b75;font-weight:700}#mdDetail,#mdBalance{border:1px solid #ccdce7;padding:9px;margin:8px 0;border-radius:6px}#mdDialog p{margin:5px 0}</style><div style="display:flex;justify-content:space-between"><h2 style="margin:0">Old Dispatch Update</h2><button id="mdClose">Close</button></div><label>List<select id="mdListMode"><option value="PENDING">Pending old dispatch update</option><option value="HISTORY">Saved / completed history &amp; corrections</option></select></label><p id="mdListCount"></p><details id="mdBulk"><summary><b>Multi Select · Full Dispatch</b></summary><p>Tick only Work Orders already fully sent. Use common operator and reason below. Individual dates and document references can be entered in single mode.</p><input id="mdBulkSearch" placeholder="Search WO / Company / PO / Product"><div id="mdBulkRows" style="max-height:40dvh;overflow:auto"></div><p id="mdBulkCount"></p><button type="button" id="mdBulkClear">Clear selection</button> <button type="button" id="mdBulkSave" disabled>Save selected Full Dispatch</button></details><label>Search Company / Work Order / PO<input id="mdSearch"></label><label>Work Order<select id="mdWork"></select></label><div id="mdDetail"></div><label><input type="checkbox" id="mdFull"> Full dispatch — entire order physically sent</label><label>Total previously dispatched (cumulative Nos.)<input type="number" id="mdTotal" min="0" step="1"></label><div id="mdBalance"></div><label>Actual dispatch date (if known)<input id="mdDate" type="date"></label><label>Bill No. (reference only)<input id="mdBill"></label><label>Challan No. (reference only)<input id="mdChallan"></label><label>Updated by<input id="mdActor"></label><label>Reason / evidence reference<textarea id="mdReason" rows="2" placeholder="Old delivery, challan reference, physical verification"></textarea></label><button id="mdSave" disabled>Save verified old dispatch</button> <button id="mdRefresh">Refresh</button><p id="mdStatus" role="status"></p><details><summary>Manual Dispatch History</summary><div id="mdHistory"></div></details><p>No stock deduction, new packing slip or invoice is generated.</p>';document.body.append(d);
 b.onclick=()=>{if(!d.open)d.showModal();if(!attempt&&!bulkAttempt){$('mdListMode').value='PENDING';refresh()}};
 $('mdClose').onclick=()=>{if(!busy)d.close()};d.addEventListener('cancel',e=>{if(busy)e.preventDefault()});
 $('mdBulkSearch').oninput=drawBulk;$('mdBulkRows').onchange=e=>{if(busy||bulkAttempt)return;const k=e.target.dataset.mdBulk;if(k){if(e.target.checked)picked.add(k);else picked.delete(k);drawBulk()}};
 $('mdBulkClear').onclick=()=>{if(!busy&&!bulkAttempt){picked.clear();drawBulk()}};$('mdBulkSave').onclick=saveBulk;
 $('mdListMode').onchange=()=>{if(!attempt){$('mdWork').value='';drawOrders()}};$('mdSearch').oninput=()=>{if(!attempt)drawOrders()};$('mdWork').onchange=()=>{if(!attempt)drawDetail()};$('mdRefresh').onclick=()=>{if(!attempt&&!bulkAttempt)refresh();else msg('Unverified save: retry original entry first.')};
 $('mdTotal').oninput=()=>{$('mdFull').checked=false;preview()};$('mdFull').onchange=()=>{if($('mdFull').checked&&row())$('mdTotal').value=row().orderQty;preview()};
 $('mdSave').onclick=async()=>{if(busy||bulkAttempt)return;try{
  if(!attempt){const r=row();if(!r)throw Error('Select Work Order');const s=ledger().summarize(r,A(snap.payload.packingSlips)),q=Number($('mdTotal').value),actor=T($('mdActor').value),reason=T($('mdReason').value);
   if($('mdTotal').value===''||!Number.isSafeInteger(q)||q<s.packingQty||q>s.orderQty||!actor||!reason)throw Error('Verify actual cumulative qty, operator and reason');
   if(s.manualVerified&&q===s.confirmedDispatchQty)throw Error('This total is already saved. No duplicate entry needed.');
   const reopen=(N(r.status)==='DISPATCHED'||!!r.dispatchDoneAt)&&q<s.orderQty;if(!confirm('Confirm ACTUAL total sent '+q+' of '+s.orderQty+' Nos. for '+r.workNo+'?'+(reopen?' Previously closed order will be reopened.':'')))return;
   attempt={id:ID(),workNo:r.workNo,identity:ledger().identity(r),expectedPacking:s.packingQty,expectedManual:s.manualQty,expectedLast:A(r.manualDispatchHistory).at(-1)?.id||'',total:q,actor,reason,reopen,dispatchDate:$('mdDate').value,billNo:T($('mdBill').value),challanNo:T($('mdChallan').value)};
  }
  busy=true;$('mdSave').disabled=true;msg('Saving directly to database…');snap=await commit(attempt);const wo=attempt.workNo;attempt=null;$('mdWork').value='';$('mdListMode').value='PENDING';$('mdSearch').value='';$('mdDate').value='';$('mdBill').value='';$('mdChallan').value='';$('mdReason').value='';drawOrders();drawBulk();msg('SAVED · '+wo+' removed from pending old dispatch update. See saved history for corrections.');window.CFM_MORNING_V445?.refresh();try{if(!cloudDirty)setTimeout(()=>cloudPoll(),0)}catch(_){}
 }catch(e){msg(e.message);alert(e.message)}finally{busy=false;$('mdSave').disabled=!attempt&&!row()}};
}
window.CFM_MANUAL_DISPATCH_V447={transition,mount,listState,bulkTransition};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();let n=0;const timer=setInterval(()=>{mount();if($('mdOpen')||++n>120)clearInterval(timer)},500);
})();