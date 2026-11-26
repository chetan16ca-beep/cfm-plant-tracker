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
function mount(){
 if($('abrOpen'))return;const anchor=$('billRequestPreview');if(!anchor)return;
 const b=document.createElement('button');b.id='abrOpen';b.type='button';b.textContent='ADVANCED BILL / CHALLAN REQUEST · Partial Qty';b.style.cssText='width:100%;padding:12px;border:0;border-radius:8px;background:#174b75;color:white;font-weight:800;margin:8px 0';anchor.before(b);
 const d=document.createElement('dialog');d.id='abrDialog';d.style.cssText='width:min(98vw,960px);max-height:94dvh;overflow:auto;background:white;color:#17374d;border:1px solid #9bb4c5;border-radius:12px;padding:12px;font:14px Arial';d.innerHTML='<style>#abrDialog *{box-sizing:border-box}#abrDialog input:not([type=checkbox]),#abrDialog select,#abrDialog textarea{max-width:100%;padding:8px;border:1px solid #aabdc9;border-radius:6px;background:white;color:#17374d;font-size:16px}#abrDialog button{padding:9px;border:1px solid #a9becf;border-radius:6px;background:#f0f7fc;color:#174b75;font-weight:700}#abrDialog article{border:1px solid #c1d3df;border-radius:7px;padding:8px;margin:7px 0}#abrDialog small{display:block;color:#4d6474}#abrDialog p{margin:5px 0}#abrDialog .abrGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;margin:6px 0}#abrDialog .abrGrid div{border:1px solid #cbd9e2;padding:6px}#abrDialog .abrGrid b{font-size:18px}#abrDialog [data-qty]{width:90px}#abrPreview{white-space:pre-wrap;overflow-wrap:anywhere;background:#f6f9fb;border:1px solid #c5d4df;padding:10px;font:13px/1.4 Arial}</style><div style="display:flex;justify-content:space-between"><h2 style="margin:0">Bill / Challan Control</h2><button id="abrClose">Close</button></div><p>Request is not a bill or dispatch confirmation.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><label>Type <select id="abrType"><option>BILL</option><option>CHALLAN</option><option>BOTH</option></select></label><label>Company <input id="abrParty" list="abrParties" placeholder="All companies"></label><datalist id="abrParties"></datalist><label>Search <input id="abrSearch" placeholder="WO / PO / product"></label><label>List <select id="abrFilter"><option value="REQUEST">Request pending</option><option value="DISPATCH">Dispatch pending</option><option value="REVIEW">Review legacy</option><option value="ALL">All</option></select></label><button id="abrRefresh">Refresh</button></div><p id="abrMetrics"></p><div id="abrRows" style="max-height:40dvh;overflow:auto"></div><label>Requested by <input id="abrActor"></label> <label>Remark <input id="abrRemark"></label><pre id="abrPreview"></pre><button id="abrSave">Save Request · Direct Database</button> <button id="abrShare" disabled>Copy / Share Saved Request</button><p id="abrStatus" role="status"></p><details><summary>Saved Request History</summary><div id="abrHistory"></div></details>';document.body.append(d);
 const reset=()=>{if(attempt){msg('Unverified save: retry original request first.');return false}selected.clear();saved=null;$('abrShare').disabled=true;return true};
 function open(){if(!d.open)d.showModal();const co=$('billRequestCompany')?.value;if(co&&!attempt)$('abrParty').value=co;refresh()}
 b.onclick=open;window.CFM_ADV_BILL_V444.open=open;
 $('abrClose').onclick=()=>{if(!busy)d.close()};d.addEventListener('cancel',e=>{if(busy)e.preventDefault()});
 $('abrRefresh').onclick=refresh;$('abrType').onchange=()=>{if(reset())draw();else $('abrType').value=attempt.type};$('abrParty').onchange=()=>{if(reset())draw()};$('abrSearch').oninput=draw;$('abrFilter').onchange=draw;$('abrRemark').oninput=preview;
 $('abrRows').onchange=e=>{if(attempt){draw();return}const el=e.target;if(el.dataset.pick){const id=el.dataset.pick;if(el.checked)selected.set(id,'');else selected.delete(id);saved=null;$('abrShare').disabled=true;draw()}else if(el.dataset.qty){selected.set(el.dataset.qty,el.value);preview()}};
 $('abrRows').oninput=e=>{if(e.target.dataset.qty&&!attempt){selected.set(e.target.dataset.qty,e.target.value);preview()}};
 $('abrSave').onclick=async()=>{if(busy)return;try{if(!attempt){const req=makeReq();if(!req.actor)throw Error('Enter requested by name');if(!confirm('Save quantity request? This does NOT confirm shipment or issue invoice.'))return;attempt=req}busy=true;$('abrSave').disabled=true;msg('Saving directly to database…');snap=await commit(attempt);saved=A(snap.payload.accountsQtyRequests).find(x=>x.id===attempt.id);attempt=null;selected.clear();draw();$('abrPreview').textContent=format(saved);$('abrShare').disabled=false;msg('Database verified · '+saved.requestNo);try{if(!cloudDirty)setTimeout(()=>cloudPoll(),0)}catch(_){}}catch(e){msg(e.message);alert(e.message)}finally{busy=false;$('abrSave').disabled=false}};
 $('abrShare').onclick=()=>{if(saved)share(saved)};$('abrHistory').onclick=e=>{const id=e.target.dataset.copy,r=A(snap?.payload.accountsQtyRequests).find(x=>x.id===id);if(r)share(r)};
}
window.CFM_ADV_BILL_V444={summary,transition,format,mount};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();let n=0;const timer=setInterval(()=>{mount();if($('abrOpen')||++n>120)clearInterval(timer)},500);
})();