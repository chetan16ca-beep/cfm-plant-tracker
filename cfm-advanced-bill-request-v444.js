/* V444: quantity-specific accounts requests, not invoice or physical delivery records. */
(function(){
'use strict';
const $=id=>document.getElementById(id),T=x=>String(x??'').trim(),N=x=>T(x).toUpperCase(),A=x=>Array.isArray(x)?x:[],E=x=>T(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ID=()=>globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2);
const identity=r=>JSON.stringify([N(r.workNo),N(r.party),N(r.poNo),N(r.description),Number(r.orderQty)]);
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const types=t=>t==='BOTH'?['BILL','CHALLAN']:[t];
function summary(p,r,t){
 const order=Number(r.orderQty);if(!Number.isSafeInteger(order)||order<=0)throw Error('Invalid order quantity');
 const ledger=A(p.accountsQtyRequests),count={BILL:0,CHALLAN:0},seen=new Set();
 for(const req of ledger){if(!req.id||seen.has(req.id))throw Error('Duplicate request identity');seen.add(req.id);
  for(const line of A(req.items)){if(N(line.workNo)!==N(r.workNo))continue;if(line.identity!==identity(r))throw Error('Work Order identity changed; reconcile request history');
   if(!Number.isSafeInteger(line.qty)||line.qty<=0)throw Error('Invalid saved request quantity');
   for(const kind of types(req.type)){if(!(kind in count))throw Error('Unknown request type');count[kind]+=line.qty}
  }
 }
 for(const k of Object.keys(count))if(count[k]>order)throw Error('Request exceeds order quantity');
 const previous=Math.max(...types(t).map(k=>count[k]));
 const legacy=types(t).some(k=>count[k]===0&&(
 ['REQUESTED','DONE','READY'].includes(N(r[k==='BILL'?'billStatus':'challanStatus']))||T(r[k==='BILL'?'billNo':'challanNo'])||
 T(r[k==='BILL'?'billRequestedAt':'challanRequestedAt'])));
 const dispatch=window.CFM_BILL_DISPATCH_LEDGER.summarize(r,A(p.packingSlips));
 const ambiguousDispatch=dispatch.needsLegacyReview||(!dispatch.manualVerified&&!dispatch.confirmedDispatchQty&&(!!r.deliveredMaterial||!!r.dispatchDate||Number(r.dispatchQty)>0));
 return {order,bill:count.BILL,challan:count.CHALLAN,previous,remaining:order-previous,legacy,actual:ambiguousDispatch?null:dispatch.confirmedDispatchQty,dispatchPending:ambiguousDispatch?null:dispatch.balanceQty};
}
function transition(p,req){
 if(!['BILL','CHALLAN','BOTH'].includes(req.type)||!req.id||!T(req.actor)||!A(req.items).length)throw Error('Request type, operator and selected items required');
 const log=A(p.accountsQtyRequests),existing=log.find(x=>x.id===req.id);
 if(existing){if(!equal(existing.items,req.items)||existing.type!==req.type)throw Error('Request identity conflict');return existing}
 const seen=new Set();
 for(const i of req.items){
  if(seen.has(N(i.workNo)))throw Error('Duplicate Work Order in request');seen.add(N(i.workNo));
  const r=A(p.pending).find(x=>N(x.workNo)===N(i.workNo));
  if(!r||identity(r)!==i.identity||r.archived||N(r.status)==='ARCHIVED')throw Error('Work Order changed; refresh');
  const s=summary(p,r,req.type);
  if(s.legacy)throw Error(r.workNo+' has older Bill/Challan history with unknown quantity; reconcile before creating a new request.');
  if(!Number.isSafeInteger(i.qty)||i.qty<1||i.qty>s.remaining)throw Error(r.workNo+' request exceeds available '+s.remaining+' Nos.');
 }
 const no=1+Math.max(0,...log.map(x=>Number(T(x.requestNo).match(/^REQ-(\d+)$/)?.[1])||0));
 const rec={...req,requestNo:'REQ-'+String(no).padStart(5,'0'),createdAt:new Date().toISOString()};
 p.accountsQtyRequests=[...log,rec];return rec;
}
async function commit(req){
 if(cloudBusy)throw Error('Another database save is running. Retry shortly.');cloudBusy=true;
 try{for(let attempt=0;attempt<3;attempt++){
  const s=await cloudFetch();if(!s||!validState(s.payload)||!Number.isSafeInteger(Number(s.version)))throw Error('Database unavailable');
  if(A(s.payload.accountsQtyRequests).some(x=>x.id===req.id)){transition(clone(s.payload),req);return s}
  const payload=clone(s.payload),rec=transition(payload,req),base=Number(s.version);
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),20000);let ack,error;
  try{const res=await fetch(CLOUD_URL+'/rest/v1/cfm_shared_state?id=eq.main&version=eq.'+base,{method:'PATCH',signal:ctrl.signal,headers:{...cloudHeaders(),Prefer:'return=representation','x-cfm-base-version':String(base)},body:JSON.stringify({payload,version:base+1,updated_at:new Date().toISOString()})});if(!res.ok)throw Error('HTTP '+res.status);ack=await res.json()}catch(e){error=e}finally{clearTimeout(timer)}
  const read=await cloudFetch(),hit=A(read?.payload?.accountsQtyRequests).find(x=>x.id===rec.id);
  if(hit&&hit.requestNo===rec.requestNo&&equal(hit.items,rec.items))return read;
  if(error)throw Error('Save not confirmed. Retry same request: '+error.message);
  if(Array.isArray(ack)&&ack.length===0)continue;
  throw Error('Database receipt not verified; retry same request.');
 }throw Error('Concurrent database changes. Retry.')}finally{cloudBusy=false}
}
let snap=null,busy=false,attempt=null,selected=new Map(),saved=null;
const kind=()=>$('abrType').value;
function msg(t){$('abrStatus').textContent=t}
function productCode(r){const stored=T(r.itemCode||r.efpplCode);return /^EFPPL[- ]/i.test(stored)?stored:window.CFM_EFPPL?.codeForRow?.(r)?.code||'VERIFY CODE'}
function makeReq(){const items=[];for(const [id,q] of selected){const r=A(snap?.payload.pending).find(x=>N(x.workNo)===id);if(!r)throw Error('Work Order missing');const s=summary(snap.payload,r,kind()),qty=Number(q);
 if(s.legacy||!Number.isSafeInteger(qty)||qty<1||qty>s.remaining)throw Error('Verify '+r.workNo+' quantity');
 items.push({identity:identity(r),workNo:r.workNo,party:r.party,poNo:r.poNo||'',poDate:r.poDate||r.purchaseOrderDate||'',code:productCode(r),description:r.description,specification:r.description2||'',orderQty:s.order,qty,requestBalance:s.remaining-qty,previousBill:s.bill,previousChallan:s.challan,actualDispatch:s.actual,dispatchPending:s.dispatchPending});}
 if(!items.length)throw Error('Select at least one Work Order');return {id:ID(),type:kind(),actor:T($('abrActor').value),remark:T($('abrRemark').value),items};}
function format(req){const groups=new Map();for(const x of req.items){const key=JSON.stringify([x.party,x.poNo]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(x)}
 const line='━━━━━━━━━━━━━━━━━━━━';let out='*EAGLE FILTRATION PRODUCT PVT. LTD.*\n'+line+'\n*'+(req.type==='BOTH'?'BILL + CHALLAN':req.type)+' REQUEST*\n'+line+'\n'+(req.requestNo?'Request No.: '+req.requestNo+'\n':'DRAFT — NOT RECORDED\n');let i=0;
 for(const items of groups.values()){const x=items[0];out+='\n*Company Name:* '+x.party+'\n*PO No.:* '+(x.poNo||'AWAITED')+'\n'+(x.poDate?'PO Date: '+x.poDate+'\n':'');for(const r of items){out+='\n────────────────────\n*ITEM – '+String(++i).padStart(2,'0')+'*\nWork Order No.: '+r.workNo+'\nEFPPL Code: '+r.code+'\nItem Description: '+r.description+'\n'+(r.specification?'Specification: '+r.specification+'\n':'')+'Order Qty: '+r.orderQty+' Nos.\n*Request Qty: '+r.qty+' Nos.*\nRequest Balance: '+r.requestBalance+' Nos.\nActual Dispatch Pending: '+(r.dispatchPending===null?'VERIFY HISTORY':r.dispatchPending+' Nos.')+'\n';}}
 return out+'\n'+line+'\n*Total Request Qty: '+req.items.reduce((a,x)=>a+x.qty,0)+' Nos.*\n'+line+(req.remark?'\nRemark: '+req.remark:'')+'\n\nKindly process as per the above details.\nCFM Department | EFPPL';
}
function preview(){try{$('abrPreview').textContent=format(makeReq())}catch(e){$('abrPreview').textContent=e.message}}
function draw(){
 if(!snap)return;const p=snap.payload,party=N($('abrParty').value),search=N($('abrSearch').value),filter=$('abrFilter').value;let data=[];
 for(const r of A(p.pending)){if(!r.workNo||r.archived||N(r.status)==='ARCHIVED'||!N(r.party))continue;if(party&&N(r.party)!==party)continue;if(search&&!N([r.workNo,r.party,r.poNo,r.description].join(' ')).includes(search))continue;try{const s=summary(p,r,kind());data.push({r,s})}catch(e){data.push({r,error:e.message})}}
 $('abrMetrics').textContent='Request pending: '+data.filter(x=>x.s&&!x.s.legacy&&x.s.remaining>0).length+' WO · Actual dispatch pending: '+data.filter(x=>x.s&&x.s.dispatchPending>0).length+' WO · Review: '+data.filter(x=>x.error||x.s?.legacy||x.s?.dispatchPending===null).length+' WO';
 $('abrRows').innerHTML=data.filter(x=>filter==='ALL'||filter==='DISPATCH'&&x.s?.dispatchPending>0||filter==='REQUEST'&&x.s&&!x.s.legacy&&x.s.remaining>0||filter==='REVIEW'&&(x.error||x.s?.legacy||x.s?.dispatchPending===null)).map(({r,s,error})=>{const id=N(r.workNo),checked=selected.has(id),blocked=error||s.legacy||s.remaining<=0;return '<article><div><b>'+E(r.workNo)+' · '+E(r.party)+'</b><small>PO '+E(r.poNo||'AWAITED')+' · '+E(productCode(r))+'</small><p>'+E(r.description)+'</p></div>'+(error?'<p>REVIEW: '+E(error)+'</p>':'<div class="abrGrid">'+[['Order Qty',s.order],['Bill Requested',s.bill],['Challan Requested',s.challan],['Request Pending',s.remaining],['Actual Sent',s.actual??'VERIFY'],['Dispatch Pending',s.dispatchPending??'VERIFY']].map(([k,v])=>'<div><small>'+k+'</small><b>'+v+'</b></div>').join('')+'</div><label><input data-pick="'+E(id)+'" type="checkbox" '+(checked?'checked ':'')+(blocked?'disabled':'')+'> Select · Request Qty <input data-qty="'+E(id)+'" type="number" min="1" max="'+s.remaining+'" step="1" value="'+E(selected.get(id)??'')+'" '+(!checked||blocked?'disabled':'')+'></label>'+(s.legacy?'<p>Older request quantity not recorded — review before new request.</p>':''))+'</article>'}).join('')||'<p>No matching records.</p>';
 $('abrHistory').innerHTML=A(p.accountsQtyRequests).slice().reverse().map(r=>'<article><b>'+E(r.requestNo)+' · '+E(r.type)+'</b><small>'+E(r.createdAt)+' · '+E(r.actor)+'</small><p>'+E(r.items.map(i=>i.workNo+' / '+i.qty+' Nos.').join(', '))+'</p><button data-copy="'+E(r.id)+'">Copy / Share saved request</button></article>').join('')||'<p>No quantity requests recorded yet.</p>';preview();
}
async function refresh(){if(busy)return;try{snap=await cloudFetch();if(!snap||!validState(snap.payload))throw Error('Invalid database snapshot');$('abrParties').innerHTML=[...new Set(A(snap.payload.pending).map(r=>T(r.party)).filter(Boolean))].sort().map(x=>'<option value="'+E(x)+'"></option>').join('');draw();msg('Live database · actual dispatch is based on confirmed packing records.')}catch(e){msg(e.message)}}
async function share(req){const t=format(req);try{if(navigator.share){await navigator.share({text:t});return}await navigator.clipboard.writeText(t);msg('Copied request. Send to Accounts.')}catch(e){if(e.name!=='AbortError')prompt('Copy request:',t)}}
/* V455: retain verified request ledger behind the original form; no advanced dialog. */
let simpleBusy=false,simpleAttempt=null,lastSimple=null;
function simpleItems(p,rows,type,qtyFor){
 const seen=new Set();
 return rows.map(local=>{
  const id=N(local.workNo),matches=A(p.pending).filter(w=>N(w.workNo)===id);
  if(seen.has(id)||matches.length!==1)throw Error('Work Order missing or duplicated. Refresh.');
  seen.add(id);const r=matches[0];
  if(identity(r)!==identity(local)||r.archived||['ARCHIVED','CANCELLED','CANCELED'].includes(N(r.status)))throw Error(r.workNo+' changed. Refresh ERP.');
  const s=summary(p,r,type),raw=T(qtyFor(local)),q=Number(raw);
  if(s.legacy)throw Error(r.workNo+' has older request history without a recorded quantity. Review before sending a new request.');
  if(!raw||!Number.isSafeInteger(q)||q<1||q>s.remaining)throw Error(r.workNo+' request balance '+s.remaining+' Nos. Enter valid quantity.');
  return {identity:identity(r),workNo:r.workNo,party:r.party,poNo:r.poNo||'',poDate:r.poDate||r.purchaseOrderDate||'',code:productCode(r),description:r.description,specification:r.description2||r.specification||'',orderQty:s.order,qty:q,requestBalance:s.remaining-q,previousBill:s.bill,previousChallan:s.challan,actualDispatch:s.actual,dispatchPending:s.dispatchPending};
 });
}
function simpleFormat(req){
 const rows=req.items.map(x=>({workNo:x.workNo,party:x.party,poNo:x.poNo,poDate:x.poDate,description:x.description,description2:x.specification,orderQty:x.orderQty,qty:x.qty,code:x.code}));
 return cfmBillRequestFormat442(rows,req.type,req.remark||'',String(req.createdAt||'').slice(0,10),r=>r.qty,r=>r.code);
}
const simpleStatus=t=>{$('abrStatus').textContent=t};
async function simpleShare(req,mode){
 const text=simpleFormat(req);
 if(mode==='save')return;
 if(mode==='share'){
  try{if(navigator.share){await navigator.share({text});return}}catch(e){if(e.name==='AbortError'){simpleStatus('Request saved. Share cancelled; use saved history to send again.');return}}
 }
 try{await navigator.clipboard.writeText(text);simpleStatus('Saved '+req.requestNo+' · copied. Paste into Accounts group.')}catch(_){prompt('Copy saved request:',text)}
}
function showHistory(p){
 const box=$('abrHistory');if(!box)return;
 box.innerHTML=A(p.accountsQtyRequests).slice().reverse().map(r=>'<p><b>'+E(r.requestNo)+' · '+E(r.type)+'</b> · '+E(A(r.items).map(i=>i.workNo+' / '+i.qty+' Nos.').join(', '))+' <button type="button" data-simple-copy="'+E(r.id)+'">Copy</button> <button type="button" data-simple-share="'+E(r.id)+'">Share</button></p>').join('')||'No saved quantity requests.';
}
async function simpleAction(mode){
 if(simpleBusy)return;
 const actor=T($('abrActor').value),rows=selectedBillRequests(),type=$('billRequestType')?.value||'BILL',remark=T($('billRequestRemark')?.value);
 const sig=JSON.stringify([type,remark,rows.map(r=>[identity(r),T(cfmBillQtyValue442(r))])]);
 if(lastSimple?.sig===sig&&!simpleAttempt){await simpleShare(lastSimple.record,mode);simpleStatus('Already saved · '+lastSimple.record.requestNo+' · use New Request for another quantity.');return}
 if(!simpleAttempt&&(!actor||!rows.length)){simpleStatus(!actor?'Enter Requested By.':'Select Company and Work Order.');if(!actor)$('abrActor').focus();return}
 simpleBusy=true;
 try{
  if(!simpleAttempt){
   simpleStatus('Checking live request balance…');const fresh=await cloudFetch();if(!fresh||!validState(fresh.payload))throw Error('Database unavailable.');
   const items=simpleItems(fresh.payload,rows,type,cfmBillQtyValue442);
   if(!confirm('Save '+type+' request for '+items.reduce((a,r)=>a+r.qty,0)+' Nos.? This does not mark material dispatched.')){simpleStatus('Cancelled. No changes.');return}
   simpleAttempt={sig,req:{id:ID(),type,actor,remark,items}};
  }
  simpleStatus('Saving request…');const live=await commit(simpleAttempt.req);
  const rec=A(live.payload.accountsQtyRequests).find(r=>r.id===simpleAttempt.req.id);if(!rec)throw Error('Receipt not verified.');
  lastSimple={sig:simpleAttempt.sig,record:rec};simpleAttempt=null;showHistory(live.payload);snap=live;
  simpleStatus('SAVED · '+rec.requestNo);try{if(!cloudDirty)setTimeout(()=>cloudPoll(),0)}catch(_){}
  await simpleShare(rec,mode);
 }catch(e){simpleStatus('NOT CONFIRMED · '+e.message);alert(e.message)}finally{simpleBusy=false}
}
function mount(){
 const anchor=$('billRequestPreview');if(!anchor||$('abrStatus'))return;
 const panel=document.createElement('div');panel.style.cssText='margin:8px 0;padding:8px;border:1px solid #c0d3e2;border-radius:8px';
 panel.innerHTML='<label>Requested By <input id="abrActor" autocomplete="name" placeholder="Name"></label><p id="abrStatus" role="status" aria-live="polite">Select Work Order and quantity, then use existing Copy / WhatsApp / Save buttons.</p><button id="abrNew" type="button">New Request</button> <details><summary>Saved Request History</summary><button id="abrHistoryRefresh" type="button">Load / Refresh History</button><div id="abrHistory"></div></details>';
 anchor.before(panel);
 $('abrNew').onclick=()=>{if(simpleBusy||simpleAttempt){simpleStatus('Resolve the unverified save first.');return}lastSimple=null;simpleStatus('New request ready. Verify quantity before saving.')};
 $('abrHistoryRefresh').onclick=async()=>{try{const s=await cloudFetch();if(!s||!validState(s.payload))throw Error('Database unavailable');snap=s;showHistory(s.payload)}catch(e){simpleStatus(e.message)}};
 $('abrHistory').onclick=e=>{const id=e.target.dataset.simpleCopy||e.target.dataset.simpleShare,r=A(snap?.payload.accountsQtyRequests).find(x=>x.id===id);if(r)simpleShare(r,e.target.dataset.simpleShare?'share':'copy')};
 window.CFM_ADV_BILL_V444.open=()=>simpleAction('save');
 window.CFM_ADV_BILL_V444.simpleAction=simpleAction;
}
window.CFM_ADV_BILL_V444={summary,transition,format,mount,simpleItems,simpleFormat};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();let n=0;const timer=setInterval(()=>{mount();if($('abrStatus')||++n>120)clearInterval(timer)},500);
})();