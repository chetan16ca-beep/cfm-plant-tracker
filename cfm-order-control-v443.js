/* V443 — Phone order inbox. Fresh database snapshot + CAS; no local draft upload. */
(function(){
'use strict';
const $=id=>document.getElementById(id),T=x=>String(x??'').trim(),N=x=>T(x).toUpperCase(),A=x=>Array.isArray(x)?x:[],E=x=>T(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ID=()=>globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2);
const signature=r=>JSON.stringify([N(r.party),N(r.poNo),N(r.description),N(r.specification),Number(r.qty)]);
const list=p=>A(p.orderInbox),byId=(p,id)=>list(p).find(x=>x.id===id);
const same=(a,b)=>signature(a)===signature(b);
const event=(r,action,actor)=>({...r,updatedAt:new Date().toISOString(),history:[...A(r.history),{action,actor,at:new Date().toISOString()}]});
function transition(p,cmd){
 const rows=list(p),current=byId(p,cmd.id),actor=T(cmd.actor);
 if(!actor)throw Error('Enter your name.');
 if(cmd.kind==='add'){
  if(current){if(!same(current,cmd.record))throw Error('Order ID conflict.');return {record:current,unchanged:true}}
  const r=cmd.record;
  if(!T(r.party)||!T(r.description)||!Number.isSafeInteger(r.qty)||r.qty<1)throw Error('Company, product and whole-number quantity required.');
  if(rows.some(x=>!x.cancelledAt&&same(x,r)))throw Error('Matching order already exists in Order Inbox. Check it before entering again.');
  const record=event({...r,id:cmd.id,orderNo:'ORD-'+String(1+Math.max(0,...rows.map(x=>Number(T(x.orderNo).match(/^ORD-(\d+)$/)?.[1])||0))).padStart(4,'0'),createdAt:new Date().toISOString(),receivedBy:actor},'RECEIVED',actor);
  p.orderInbox=[...rows,record];return {record};
 }
 if(!current)throw Error('Order no longer found.');
 if(current.cancelledAt)throw Error('Order already cancelled.');
 if(cmd.kind==='group'&&current.groupSentAt)return {record:current,unchanged:true};
 if(cmd.kind==='convert'&&current.workNo){
  if(A(p.pending).some(w=>w.workNo===current.workNo&&w.orderInboxId===current.id))return {record:current,unchanged:true};
  throw Error('Existing Work Order link needs review. No second Work Order created.');
 }
 if(current.updatedAt!==cmd.expected)throw Error('Another device changed this order. Refresh and review.');
 let record;
 if(cmd.kind==='group'){
  record=event({...current,groupSentAt:new Date().toISOString()},'GROUP CONFIRMED',actor);
 }else if(cmd.kind==='po'){
  if(current.workNo)throw Error('Work Order exists. Update PO through its verified edit workflow.');
  if(!T(cmd.poNo))throw Error('Enter actual PO number.');
  record=event({...current,poNo:T(cmd.poNo),groupSentAt:''},'PO UPDATED — GROUP RECONFIRMATION REQUIRED',actor);
 }else if(cmd.kind==='cancel'){
  if(current.workNo)throw Error('Work Order exists. Cannot cancel from inbox.');
  if(!T(cmd.reason))throw Error('Cancellation reason required.');
  record=event({...current,cancelledAt:new Date().toISOString(),cancelReason:T(cmd.reason)},'CANCELLED',actor);
 }else if(cmd.kind==='convert'){
  if(!current.groupSentAt&&cmd.allowGroupPending!==true)throw Error('Confirm direct creation while group pending.');
  if(!T(cmd.cloth)||!Number.isFinite(cmd.width)||cmd.width<=0)throw Error('Verified cloth and width required.');
  if(!T(current.itemCode))throw Error('Product code is missing. Review product master first.');
  const duplicates=A(p.pending).filter(w=>N(w.party)===N(current.party)&&N(w.poNo)===N(current.poNo)&&N(w.description)===N(current.description)&&Number(w.orderQty)===current.qty);
  if(duplicates.length)throw Error('Possible existing WO: '+duplicates.map(w=>w.workNo).join(', ')+'. Do not create a duplicate.');
  const next=1+Math.max(0,...A(p.pending).map(w=>Number(T(w.workNo).match(/^CFM-(\d+)$/)?.[1])||0));
  if(!Number.isSafeInteger(next)||next<1)throw Error('Cannot allocate Work No.');
  const wo={workNo:'CFM-'+next,party:current.party,poNo:current.poNo||'',orderDate:current.orderDate,deliveryDate:current.deliveryDate||'',itemCode:current.itemCode,eagleCode:'',description:current.description,description2:current.specification||'',cloth:T(cmd.cloth),width:cmd.width,orderQty:current.qty,cutQty:0,status:'PENDING',priority:current.priority,selectedSrl:'',reservedSrl:'',billStatus:'',challanStatus:'',billNo:'',challanNo:'',dispatchDate:'',accountsRemark:'',remark:current.remark||'',measurementStatus:'REQUIRED',orderInboxId:current.id};
  p.pending=[...p.pending,wo];record=event({...current,workNo:wo.workNo,workCreatedAt:new Date().toISOString()},current.groupSentAt?'WORK ORDER CREATED':'WORK ORDER CREATED — GROUP PENDING',actor);
 }else throw Error('Unsupported action.');
 p.orderInbox=rows.map(r=>r.id===cmd.id?record:r);return {record};
}
async function write(cmd){
 if(cloudBusy)throw Error('Another database save is running. Retry shortly.');
 cloudBusy=true;
 try{
  for(let attempt=0;attempt<3;attempt++){
   const snap=await cloudFetch();if(!snap||!validState(snap.payload)||!Number.isSafeInteger(Number(snap.version)))throw Error('Database not available.');
   const payload=clone(snap.payload),out=transition(payload,cmd);
   if(out.unchanged)return snap;
   const base=Number(snap.version),ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),20000);let ack,error;
   try{const res=await fetch(CLOUD_URL+'/rest/v1/cfm_shared_state?id=eq.main&version=eq.'+base,{method:'PATCH',signal:ctrl.signal,headers:{...cloudHeaders(),Prefer:'return=representation','x-cfm-base-version':String(base)},body:JSON.stringify({payload,version:base+1,updated_at:new Date().toISOString()})});if(!res.ok)throw Error('HTTP '+res.status);ack=await res.json()}catch(e){error=e}finally{clearTimeout(timer)}
   const verified=await cloudFetch(),found=byId(verified?.payload,cmd.id);
   if(found&&found.updatedAt===out.record.updatedAt&&signature(found)===signature(out.record)&&found.workNo===out.record.workNo){
    if(cmd.kind!=='convert'||A(verified.payload.pending).some(w=>w.workNo===found.workNo&&w.orderInboxId===found.id))return verified;
   }
   if(error)throw Error('Save not confirmed. Retry the same action to verify. '+error.message);
   if(A(ack).length===0)continue;
   throw Error('Save receipt not confirmed. Retry same action.');
  }
  throw Error('Database changed repeatedly. Retry.');
 }finally{cloudBusy=false}
}
let snap=null,busy=false,draftId=ID();
function status(msg){if($('ocStatus'))$('ocStatus').textContent=msg}
function actor(){return T($('ocActor')?.value)}
function message(r){return ['*NEW ORDER RECEIVED*','Order ID: '+r.orderNo,'Company: '+r.party,'PO No.: '+(r.poNo||'AWAITED'),'EFPPL Code: '+(r.itemCode||'VERIFY'),'Product: '+r.description,r.specification?'Specification: '+r.specification:'','Qty: '+r.qty+' Nos.','Source: '+r.source,'Priority: '+r.priority,r.deliveryDate?'Delivery: '+r.deliveryDate:'',r.remark?'Remark: '+r.remark:''].filter(Boolean).join('\n')}
function draw(){
 if(!snap)return;
 const rows=list(snap.payload),active=rows.filter(r=>!r.cancelledAt),q=N($('ocSearch').value),filter=$('ocFilter').value;
 const localDay=x=>new Date(x).toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'}),today=localDay(new Date());
 const todayRows=active.filter(r=>localDay(r.createdAt)===today);
 const metrics=[['Received today',todayRows.length],['All received',active.length],['Group Pending',active.filter(r=>!r.groupSentAt).length],['PO Awaited',active.filter(r=>!r.poNo).length],['WO Pending',active.filter(r=>!r.workNo).length],['WO Created',active.filter(r=>r.workNo).length]];
 $('ocMetrics').innerHTML=metrics.map(([k,v])=>'<div><small>'+k+'</small><b>'+v+'</b></div>').join('');
 $('ocCompanies').innerHTML=[...new Set(A(snap.payload.pending).map(r=>T(r.party)).filter(Boolean))].sort().map(x=>'<option value="'+E(x)+'"></option>').join('');
 $('ocRows').innerHTML=rows.slice().reverse().filter(r=>!q||N([r.orderNo,r.party,r.poNo,r.description,r.workNo].join(' ')).includes(q)).filter(r=>filter==='ALL'||filter==='GROUP'&&!r.cancelledAt&&!r.groupSentAt||filter==='PO'&&!r.cancelledAt&&!r.poNo||filter==='WO'&&!r.cancelledAt&&!r.workNo||filter==='DONE'&&r.workNo||filter==='CANCEL'&&r.cancelledAt).map(r=>{
  const btn=(action,label)=>'<button type="button" data-act="'+action+'" data-id="'+E(r.id)+'">'+label+'</button>';
  return '<article><b>'+E(r.orderNo)+' · '+E(r.party)+'</b><p>'+E(r.description)+' · '+E(r.qty)+' Nos. · '+E(r.itemCode||'Code not selected')+'</p><p>PO: '+E(r.poNo||'AWAITED')+' · '+E(r.source)+' · '+E(r.priority)+'</p><small>'+E(r.receivedBy)+' · '+E(new Date(r.createdAt).toLocaleString('en-IN'))+'</small><p><strong>'+E(r.cancelledAt?'CANCELLED':(r.workNo?'WO CREATED · '+r.workNo:'WORK ORDER PENDING')+' · '+(r.groupSentAt?'GROUP SENT':'GROUP PENDING'))+'</strong></p><div class="ocActions">'+(r.cancelledAt?'':btn('share','Copy / Share')+(!r.groupSentAt?btn('group','Confirm Group Sent'):'')+(!r.workNo?btn('convert','Create Work Order')+btn('po','Update PO')+btn('cancel','Cancel Order'):''))+(r.cancelledAt?'':btn('repeat','Repeat order'))+btn('history','History')+'</div></article>';
 }).join('')||'<p>No matching orders.</p>';
 status('Live database · '+rows.length+' received order records · Group, PO and WO counts overlap.');
}
async function refresh(){if(busy)return;try{snap=await cloudFetch();if(!snap||!validState(snap.payload))throw Error('Invalid database response');draw()}catch(e){status('Live read failed: '+e.message)}}
async function run(cmd){if(busy)return false;busy=true;const dialog=$('ocDialog');dialog.querySelectorAll('button').forEach(b=>{b.disabled=true});status('Saving directly to database…');try{snap=await write(cmd);draw();const saved=byId(snap.payload,cmd.id);status('Database verified · '+saved.orderNo+(saved.workNo?' · '+saved.workNo+' CREATED':'')+(!saved.groupSentAt?' · Group Pending':''));try{if(!cloudDirty)setTimeout(()=>cloudPoll(),0)}catch(_){}return true}catch(e){status(e.message);alert(e.message);return false}finally{busy=false;dialog.querySelectorAll('button').forEach(b=>{b.disabled=false})}}
function fillCodes(){
 const sel=$('ocCode');sel.innerHTML='<option value="">Choose EFPPL code</option>'+A(window.CFM_EFPPL?.master).map(x=>'<option value="'+E(x.code)+'">'+E(x.code+' | '+x.description)+'</option>').join('');
}
function mount(){
 if($('ocOpen'))return;
 const host=$('view-dashboard')||$('view-pending');if(!host)return;
 const button=document.createElement('button');button.id='ocOpen';button.type='button';button.textContent='ORDER CONTROL CENTER · Phone / PO / Group / WO';button.style.cssText='display:block;width:100%;margin:8px 0;padding:13px;background:#174b75;color:white;border:0;border-radius:9px;font-weight:800';host.prepend(button);
 const d=document.createElement('dialog');d.id='ocDialog';d.style.cssText='width:min(98vw,900px);max-height:94dvh;overflow:auto;padding:14px;border:1px solid #a4bbc9;border-radius:12px;color:#17374d;background:#fff;font:14px Arial';
 d.innerHTML='<style>#ocDialog *{box-sizing:border-box}#ocDialog label{display:block;font-weight:700;font-size:12px}#ocDialog input,#ocDialog select,#ocDialog textarea{display:block;width:100%;border:1px solid #b3c5d4;padding:9px;border-radius:6px;font:16px Arial;background:#fff;color:#17374d;margin:4px 0 8px}#ocDialog button{border:1px solid #a4bbc9;padding:9px;border-radius:6px;background:#eff6fb;color:#174b75;font-weight:700}#ocMetrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(105px,1fr));gap:6px;margin:10px 0}#ocMetrics div,#ocRows article{border:1px solid #cedce7;border-radius:7px;padding:10px;margin:4px 0}#ocMetrics b{display:block;font-size:21px}#ocRows p{margin:5px 0}#ocDialog .ocActions{display:flex;gap:6px;flex-wrap:wrap}#ocFields{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:5px 10px}</style><div style="display:flex;justify-content:space-between;gap:10px"><h2 style="margin:0">Order Control Center</h2><button id="ocClose">Close</button></div><label>Entry / action by (name)<input id="ocActor" autocomplete="name"></label><div id="ocMetrics"></div><details open><summary><b>+ New Order Received</b></summary><form id="ocForm"><div id="ocFields"><label>Company<input id="ocParty" list="ocCompanies" required></label><datalist id="ocCompanies"></datalist><label>Source<select id="ocSource"><option>Phone Call</option><option>WhatsApp</option><option>PO / Email</option><option>Other</option></select></label><label>PO No. (optional)<input id="ocPO" placeholder="PO awaited if blank"></label><label>Priority<select id="ocPriority"><option>NORMAL</option><option>URGENT</option></select></label><label>EFPPL Code<select id="ocCode"></select></label><label>Product description<input id="ocProduct" required></label><label>Specification<input id="ocSpec"></label><label>Qty (Nos.)<input id="ocQty" type="number" min="1" step="1" required></label><label>Delivery date<input id="ocDue" type="date"></label><label>Remark<textarea id="ocRemark" rows="2"></textarea></label></div><button type="submit" id="ocSave">Save Order · Direct Database</button></form></details><hr><label>Search<input id="ocSearch" placeholder="Order ID / company / PO / product"></label><label>Filter<select id="ocFilter"><option value="ALL">All Orders</option><option value="GROUP">Group Pending</option><option value="PO">PO Awaited</option><option value="WO">Work Order Pending</option><option value="DONE">WO Created</option><option value="CANCEL">Cancelled</option></select></label><button id="ocRefresh">Refresh live orders</button><p id="ocStatus" role="status"></p><div id="ocRows"></div>';
 document.body.append(d);button.onclick=()=>{if(!d.open)d.showModal();fillCodes();refresh()};
 $('ocClose').onclick=()=>{if(!busy)d.close()};d.addEventListener('cancel',e=>{if(busy)e.preventDefault()});$('ocRefresh').onclick=refresh;
 $('ocSearch').oninput=draw;$('ocFilter').onchange=draw;
 $('ocCode').onchange=()=>{const p=window.CFM_EFPPL?.byCode($('ocCode').value);if(p&&!T($('ocProduct').value))$('ocProduct').value=p.description};
 $('ocProduct').onchange=()=>{const p=window.CFM_EFPPL?.findCode($('ocProduct').value);if(p&&!$('ocCode').value)$('ocCode').value=p.code};
 $('ocForm').onsubmit=async e=>{e.preventDefault();const record={party:T($('ocParty').value),poNo:T($('ocPO').value),description:T($('ocProduct').value),specification:T($('ocSpec').value),itemCode:$('ocCode').value||window.CFM_EFPPL?.findCode($('ocProduct').value)?.code||'',qty:Number($('ocQty').value),source:$('ocSource').value,priority:$('ocPriority').value,orderDate:typeof todayISO==='function'?todayISO():new Date().toISOString().slice(0,10),deliveryDate:$('ocDue').value,remark:T($('ocRemark').value)};if(await run({kind:'add',id:draftId,actor:actor(),record})){draftId=ID();$('ocForm').reset()}};
 $('ocRows').onclick=async e=>{
  const b=e.target.closest('button[data-act]');if(!b||busy||!snap)return;const r=byId(snap.payload,b.dataset.id);if(!r)return;const kind=b.dataset.act;
  if(kind==='repeat'){if(!confirm('Start a new order draft from '+r.orderNo+'? Current unsaved form values will be replaced.'))return;$('ocParty').value=r.party;$('ocPO').value='';$('ocProduct').value=r.description;$('ocSpec').value=r.specification||'';$('ocCode').value=r.itemCode||'';$('ocQty').value=r.qty;$('ocDue').value='';$('ocRemark').value='';$('ocForm').closest('details').open=true;$('ocParty').focus();status('Repeat draft only. Enter new PO and verify before saving.');return}
  if(kind==='history'){alert(A(r.history).map(x=>x.at+' · '+x.action+' · '+x.actor).join('\n'));return}
  if(kind==='share'){const t=message(r);try{if(navigator.share){await navigator.share({text:t});return}await navigator.clipboard.writeText(t);status('Copied. Send in group, then confirm Group Sent.')}catch(e){if(e.name!=='AbortError')prompt('Copy this order:',t)}return}
  const cmd={kind,id:r.id,expected:r.updatedAt,actor:actor()};
  if(kind==='group'&&!confirm('Confirm the order was actually sent to your WhatsApp group?'))return;
  if(kind==='po'){const x=prompt('Actual PO No.',r.poNo||'');if(x===null)return;cmd.poNo=x}
  if(kind==='cancel'){const x=prompt('Cancellation reason');if(x===null)return;cmd.reason=x}
  if(kind==='convert'){if((!r.poNo||/^verb/i.test(T(r.poNo)))&&!confirm('Confirm authorised production with verbal / awaited PO?'))return;const cloth=prompt('Verified cloth quality');if(cloth===null)return;const width=prompt('Verified roll width (inch)');if(width===null)return;cmd.cloth=cloth;cmd.width=Number(width);if(!confirm('Create one Work Order for '+r.orderNo+'?'+(!r.groupSentAt?' Group Sent will remain pending.':'')))return;cmd.allowGroupPending=!r.groupSentAt}
  await run(cmd);
 };
 setInterval(()=>{if(d.open&&!busy&&!d.contains(document.activeElement))refresh()},20000);
}
window.CFM_ORDER_CONTROL_V443={transition,signature,message,mount};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
let attempts=0;const timer=setInterval(()=>{mount();if($('ocOpen')||++attempts>100)clearInterval(timer)},500);
})();