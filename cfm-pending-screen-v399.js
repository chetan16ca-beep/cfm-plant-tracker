/* Pending Orders Screen V399. Visual layer only: reads verified Cloud snapshot,
   does not modify stock, dispatch, cutting or underlying work orders. */
(function(){
'use strict';
const css=[
'#view-pending .pd399{font-family:system-ui,-apple-system,sans-serif;color:#102e50;background:#f5f9fd;border:1px solid #c9dae8;border-radius:14px;padding:12px;margin:9px 0 14px;box-shadow:0 4px 15px #0b2c4710}',
'#view-pending .pd399 *{box-sizing:border-box}',
'#view-pending .pd399-top{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding-bottom:10px}',
'#view-pending .pd399-title{font-size:20px;font-weight:850;color:#113c6c}',
'#view-pending .pd399-caption{font-size:11px;color:#667e92;line-height:1.5;margin-top:2px}',
'#view-pending .pd399-counters{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:0 0 11px}',
'#view-pending .pd399-stat{padding:9px 10px;background:#fff;border:1px solid #cdddeb;border-radius:11px;min-width:0;text-align:center}',
'#view-pending .pd399-stat small{display:block;font-size:10px;font-weight:680;line-height:1.35;color:#647c92}',
'#view-pending .pd399-stat strong{display:block;font-size:23px;font-weight:850;line-height:1.3;font-variant-numeric:tabular-nums;color:#0e3867}',
'#view-pending .pd399-stat:nth-child(3) strong{color:#16754d}',
'#view-pending .pd399-stat:nth-child(4){background:#fff0ef;border-color:#e9c5c3}',
'#view-pending .pd399-stat:nth-child(4) strong{color:#b82226}',
'#view-pending .pd399-filters{display:grid!important;grid-template-columns:minmax(180px,2fr) repeat(3,minmax(110px,1fr));gap:8px!important;margin:0 0 12px!important;background:transparent!important;border:0!important;padding:0!important;align-items:stretch!important}',
'#view-pending .pd399-filters input,#view-pending .pd399-filters select{min-width:0!important;width:100%!important;border-radius:10px!important;background:#fff!important;border:1px solid #c9d9e5!important;padding:10px 11px!important;font-size:12px!important;min-height:40px!important;box-shadow:none!important}',
'#view-pending .pd399-list{display:grid;grid-template-columns:1fr;gap:11px}',
'#view-pending .pd399-work{display:grid;grid-template-columns:116px minmax(0,1fr) 260px;gap:12px;min-width:0;background:#fff;border:1px solid #d3e1ec;border-radius:14px;padding:13px;box-shadow:0 3px 10px #082d4b12}',
'#view-pending .pd399-num{display:flex;flex-direction:column;justify-content:center;align-items:center;gap:8px;background:#0a387c;color:#fff;border-radius:11px;min-height:134px;padding:10px 7px;text-align:center}',
'#view-pending .pd399-num small{font:750 11px system-ui;color:#e6f0ff}',
'#view-pending .pd399-num b{font:850 19px/1.3 system-ui;white-space:nowrap}',
'#view-pending .pd399-num span{font:750 9px/1.35 system-ui;padding:6px;background:#fff0a2;color:#40310e;border-radius:8px;max-width:100%}',
'#view-pending .pd399-detail{min-width:0}',
'#view-pending .pd399-po{display:block;background:linear-gradient(90deg,#e6f0fe,#fff);border-radius:7px;padding:4px 7px;font:850 17px/1.35 system-ui;color:#0c3169;overflow-wrap:anywhere}',
'#view-pending .pd399-line{display:grid;grid-template-columns:92px minmax(0,1fr);gap:5px;margin-top:5px;font:600 12px/1.35 system-ui}',
'#view-pending .pd399-line span{color:#657c91;font-weight:600}',
'#view-pending .pd399-line b{color:#17314e;overflow-wrap:anywhere;font-weight:750}',
'#view-pending .pd399-qty{min-width:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-content:start;gap:5px}',
'#view-pending .pd399-qty div{text-align:center;background:#edf4fb;border:1px solid #cbddec;border-radius:10px;padding:10px 2px}',
'#view-pending .pd399-qty div:nth-child(2){background:#e5f3ff}',
'#view-pending .pd399-qty div:last-child{background:#fff0f0;border-color:#eccaca}',
'#view-pending .pd399-qty small{display:block;font:750 10px/1.3 system-ui;color:#526d89}',
'#view-pending .pd399-qty b{display:block;font:850 24px/1.2 system-ui;color:#0b3b72;margin-top:4px;font-variant-numeric:tabular-nums}',
'#view-pending .pd399-qty div:last-child b{color:#b4232c}',
'#view-pending .pd399-attrs{grid-column:2/4;display:flex;flex-wrap:wrap;gap:5px;margin-top:-3px}',
'#view-pending .pd399-attrs span{font:650 11px/1.35 system-ui;background:#f2f6fa;border:1px solid #e6edf3;border-radius:6px;padding:5px 8px;color:#50667b;overflow-wrap:anywhere}',
'#view-pending .pd399-flow{grid-column:2/4;display:flex;align-items:center;justify-content:space-between;gap:5px;padding:4px 0}',
'#view-pending .pd399-flow span{font:700 11px/1.4 system-ui;color:#64798d;white-space:nowrap}',
'#view-pending .pd399-flow span:first-child{color:#126bbc}',
'#view-pending .pd399-flow em{flex:1;height:2px;background:#dae3e9;min-width:4px}',
'#view-pending .pd399-actions{grid-column:2/4;display:flex;flex-wrap:wrap;gap:6px}',
'#view-pending .pd399-actions button{border:1px solid #b8cfe0;border-radius:8px;background:#f6fafe;color:#164d7b;padding:8px 10px;min-height:36px;font:750 11px/1.3 system-ui;cursor:pointer;white-space:normal}',
'#view-pending .pd399-actions button.primary{background:#146fb4;border-color:#146fb4;color:#fff}',
'#view-pending .pd399-actions button.green{background:#078e6a;border-color:#078e6a;color:#fff}',
'#view-pending .pd399-actions button.danger{background:#bc3342;border-color:#bc3342;color:#fff}',
'#view-pending .pd399-actions button:disabled{background:#edf0f3;color:#7f8d9a;border-color:#d1dbe3;cursor:not-allowed}',
'#view-pending .pd399-info{font:600 11px/1.55 system-ui;color:#637c91;padding:4px 3px}',
'#view-pending .pd399-more{grid-column:1/4}',
'#view-pending .pd399-empty{padding:15px;background:#fff;border:1px dashed #bdd1df;border-radius:12px;color:#54748b;font:600 12px/1.5 system-ui}',
'#view-pending .pd399-advanced{border:1px solid #d3e2ea;border-radius:12px;background:#fff;margin:12px 0 0;overflow:hidden}',
'#view-pending .pd399-advanced>summary{padding:12px 14px;font:750 13px system-ui;color:#1c618b;cursor:pointer}',
'#view-pending .pd399-advanced>#pendingList{padding:9px}',
'#view-pending .pd399 small{letter-spacing:0}',
'@media(max-width:920px){#view-pending .pd399-work{grid-template-columns:98px minmax(0,1fr)}#view-pending .pd399-qty{grid-column:1/3;grid-row:2}#view-pending .pd399-attrs,#view-pending .pd399-flow,#view-pending .pd399-actions{grid-column:1/3}#view-pending .pd399-num{min-height:112px}#view-pending .pd399-line{grid-template-columns:86px minmax(0,1fr)}}',
'@media(max-width:650px){#view-pending .pd399{padding:9px}#view-pending .pd399-counters{grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}#view-pending .pd399-stat strong{font-size:19px}#view-pending .pd399-filters{grid-template-columns:repeat(2,minmax(0,1fr))}#view-pending .pd399-filters #pendingSearch{grid-column:1/3}#view-pending .pd399-work{padding:9px;gap:8px;grid-template-columns:88px minmax(0,1fr)}#view-pending .pd399-num b{font-size:15px}#view-pending .pd399-po{font-size:14px}#view-pending .pd399-line{font-size:11px;grid-template-columns:74px minmax(0,1fr);gap:3px}#view-pending .pd399-flow{overflow-x:auto;justify-content:flex-start}#view-pending .pd399-flow span{font-size:10px}#view-pending .pd399-actions button{flex:1 1 90px;padding:8px 6px}}'
].join('');
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>Math.max(0,Number(v)||0);
const f=v=>new Intl.NumberFormat('en-IN',{maximumFractionDigits:2}).format(v);
const normalize=v=>String(v||'').toUpperCase().trim();
let root,board,oldList,advanced,partyFilter,itemFilter,rendered='',dataAvailable=false;
function cloud(){
 try{
  if(typeof cfmPendingCloudRows!=='undefined'&&Array.isArray(cfmPendingCloudRows))return cfmPendingCloudRows;
  return null;
 }catch(e){return null}
}
function isDispatched(r){
 return ['DISPATCHED','ARCHIVED'].includes(normalize(r.status))||normalize(r.dispatchStatus)==='DISPATCHED'||!!r.dispatchDoneAt||!!r.archived;
}
function open(r){
 return !isDispatched(r)&&normalize(r.status)==='PENDING'&&!r.cutEntryPending&&n(r.orderQty)>n(r.cutQty);
}
function options(sel,values,first){
 const val=sel.value, signature=values.join('\u0001');
 if(sel.dataset.optionsSignature===signature)return;
 sel.dataset.optionsSignature=signature;
 sel.innerHTML='<option value="">'+first+'</option>'+values.map(v=>'<option value="'+E(v)+'">'+E(v)+'</option>').join('');
 if(values.includes(val))sel.value=val;
}
function allRows(){
 const all=cloud(), status=document.getElementById('pendingStatus')?.value||'OPEN';
 if(!all)return null;
 const search=(document.getElementById('pendingSearch')?.value||'').toLowerCase().trim();
 return all.filter(r=>{
  const st=normalize(r.status);
  const belongs=status==='ALL'||(status==='OPEN'?open(r):
   status==='CUTENTRY'?!!r.cutEntryPending&&!isDispatched(r):
   status==='COMPLETE'?st==='COMPLETED':
   status==='DISPATCHED'?isDispatched(r)&&!r.archived:
   status==='ARCHIVED'?!!r.archived||st==='ARCHIVED':open(r));
  if(!belongs)return false;
  if(partyFilter.value&&String(r.party||'')!==partyFilter.value)return false;
  if(itemFilter.value&&String(r.itemCode||r.eagleCode||r.description||'')!==itemFilter.value)return false;
  return !search||JSON.stringify(r).toLowerCase().includes(search);
 }).sort((a,b)=>String(b.workNo||'').localeCompare(String(a.workNo||''),undefined,{numeric:true}));
}
function indexFor(r){
 try{
  if(typeof state==='undefined'||!Array.isArray(state.pending))return -1;
  if(typeof cfmPendingListSignature==='function'&&cloud()&&cfmPendingListSignature(cloud())!==cfmPendingListSignature(state.pending))return -1;
  const idx=state.pending.findIndex(x=>normalize(x.workNo)===normalize(r.workNo));
  if(idx<0)return -1;
  const x=state.pending[idx];
  return normalize(x.status)===normalize(r.status)&&normalize(x.party)===normalize(r.party)&&Number(x.orderQty)===Number(r.orderQty)&&Number(x.cutQty||0)===Number(r.cutQty||0)?idx:-1;
 }catch(e){return -1}
}
function reveal(work){
 advanced.open=true;
 const search=document.getElementById('pendingSearch');
 if(search&&work){search.value=work;search.dispatchEvent(new Event('input',{bubbles:true}))}
 oldList?.scrollIntoView({behavior:'smooth',block:'start'});
}
function handle(action,work){
 const all=cloud()||[];
 const r=all.find(x=>normalize(x.workNo)===normalize(work));
 if(!r){reveal(work);return}
 const idx=indexFor(r);
 if(action==='more'){reveal(work);return}
 if(idx<0){reveal(work);return}
 try{
  if(action==='edit'&&typeof openPendingForm==='function')openPendingForm(idx);
  else if(action==='cut'&&typeof openCuttingFromPending==='function')openCuttingFromPending(idx);
  else if(action==='later'&&typeof markCutEntryPending==='function')markCutEntryPending(idx);
  else if(action==='plan'&&typeof toggleTomorrowPlan==='function')toggleTomorrowPlan(idx);
  else if(action==='delete'&&typeof deleteMistakeWork==='function')deleteMistakeWork(idx);
  else reveal(work);
 }catch(e){console.warn('Pending action unavailable',e);reveal(work)}
}
function card(r){
 const q=n(r.orderQty),cut=n(r.cutQty),balance=Math.max(0,q-cut),idx=indexFor(r),canAct=open(r)&&idx>=0;
 const wo=E(r.workNo||'-'),status=normalize(r.status)||'UNKNOWN',cutPending=r.cutEntryPending;
 const stage=cutPending?'CUT ENTRY PENDING':open(r)?'PENDING • CUTTING':status;
 const attrs=[['Cloth',r.cloth],['Width',r.width],['Cut',r.cutQty],['Delivery',r.deliveryDate],['Store SRL',r.srlNo]].map(([k,v])=>'<span>'+E(k)+': '+E(v||v===0?v:'-')+'</span>').join('');
 const action=(label,key,cl,disabled=false)=>'<button type="button" class="'+cl+'" data-pd399-act="'+key+'" data-pd399-work="'+wo+'"'+(disabled?' disabled title="Available in matching verified ERP work order only"':'')+'>'+label+'</button>';
 const isPending=canAct;
 return '<article class="pd399-work"><div class="pd399-num"><small>WO</small><b>'+wo+'</b><span>'+E(stage)+'</span></div>'+
  '<div class="pd399-detail"><div class="pd399-po">PO No.: '+E(r.poNo||'-')+'</div>'+
  '<div class="pd399-line"><span>Party</span><b>'+E(r.party||'-')+'</b></div>'+
  '<div class="pd399-line"><span>Item Code</span><b>'+E(r.itemCode||r.eagleCode||'-')+'</b></div>'+
  '<div class="pd399-line"><span>Product</span><b>'+E(r.description||'-')+'</b></div></div>'+
  '<div class="pd399-qty"><div><small>Order Qty</small><b>'+f(q)+'</b></div><div><small>Cut Qty</small><b>'+f(cut)+'</b></div><div><small>Pending Qty</small><b>'+f(balance)+'</b></div></div>'+
  '<div class="pd399-attrs">'+attrs+'</div>'+
  '<div class="pd399-flow" aria-label="Production stage labels, not verified completion ticks"><span>● Cutting</span><em></em><span>○ Stitching</span><em></em><span>○ Thread Cut</span><em></em><span>○ Gun Finish</span><em></em><span>○ Packing</span></div>'+
  '<div class="pd399-actions">'+
    action('✎ Edit','edit','',!isPending)+
    action('＋ Cutting Entry','cut','primary',!isPending)+
    action('✓ Cutting Done / Entry Later','later','primary',!isPending)+
    action('▣ Plan Tomorrow','plan','green',!isPending)+
    action('🗑 Delete Mistake','delete','danger',!isPending)+
    action('⋯ More / SRL','more','')+
  '</div>'+(!isPending?'<div class="pd399-more pd399-info">Verified Cloud record • Original ERP controls available under More / SRL</div>':'')+'</article>';
}
function draw(){
 if(!board||!board.isConnected||!root.classList.contains('active'))return;
 const all=cloud(),err=(typeof cfmPendingCloudError!=='undefined'&&cfmPendingCloudError)||'';
 if(!all){
  board.querySelector('.pd399-counters').innerHTML='';
  board.querySelector('.pd399-list').innerHTML='<div class="pd399-empty">☁ '+(err?'Cloud verification unavailable. Reconnect and sync to see verified orders.':'Verifying live Cloud Pending Orders…')+'</div>';
  board.querySelector('.pd399-caption').textContent='Waiting for Cloud verification • No unverified orders shown';
  rendered='';return;
 }
 const parties=[...new Set(all.map(r=>String(r.party||'').trim()).filter(Boolean))].sort();
 const items=[...new Set(all.map(r=>String(r.itemCode||r.eagleCode||r.description||'').trim()).filter(Boolean))].sort();
 options(partyFilter,parties,'All Parties');options(itemFilter,items,'All Items');
 const arr=allRows(),sig=JSON.stringify([all.map(r=>[r.workNo,r.status,r.orderQty,r.cutQty,r.party,r.itemCode,r.description,r.poNo,r.cloth,r.width]),partyFilter.value,itemFilter.value,document.getElementById('pendingStatus')?.value,document.getElementById('pendingSearch')?.value,err]);
 if(sig===rendered)return;rendered=sig;
 const pending=all.filter(open),inProcess=pending.filter(r=>n(r.cutQty)>0).length,ready=all.filter(r=>normalize(r.status)==='COMPLETED'&&!isDispatched(r)).length;
 board.querySelector('.pd399-counters').innerHTML=[['Total Orders',all.length],['In Process',inProcess],['Ready',ready],['Pending',pending.length]].map(p=>'<div class="pd399-stat"><small>'+p[0]+'</small><strong>'+f(p[1])+'</strong></div>').join('');
 board.querySelector('.pd399-caption').textContent=(err?'Last verified Cloud snapshot • Recheck unavailable':'Live verified Cloud orders • Real quantities')+' • '+arr.length+' shown';
 board.querySelector('.pd399-list').innerHTML=arr.length?arr.map(card).join(''):'<div class="pd399-empty">No verified work orders match the selected filters.</div>';
}
function init(){
 root=document.getElementById('view-pending');
 if(!root||document.getElementById('cfmPendingBoard399'))return;
 const filters=root.querySelector('.filters'),list=root.querySelector('#pendingList');
 if(!filters||!list)return;
 const style=document.createElement('style');style.id='cfmPendingBoard399CSS';style.textContent=css;document.head.appendChild(style);
 board=document.createElement('section');board.id='cfmPendingBoard399';board.className='pd399';
 board.innerHTML='<div class="pd399-top"><div><div class="pd399-title">📋 Pending Orders</div><div class="pd399-caption">Checking verified Cloud Orders…</div></div><button type="button" id="pd399Refresh" class="btn btn-sm">↻ Refresh</button></div><div class="pd399-counters"></div><div class="pd399-list"></div>';
 filters.before(board);filters.classList.add('pd399-filters');board.querySelector('.pd399-list').before(filters);
 partyFilter=document.createElement('select');partyFilter.id='pd399Party';partyFilter.setAttribute('aria-label','Filter by Party');
 itemFilter=document.createElement('select');itemFilter.id='pd399Item';itemFilter.setAttribute('aria-label','Filter by Item');
 const originalStatus=document.getElementById('pendingStatus');
 if(originalStatus){filters.insertBefore(partyFilter,originalStatus);filters.insertBefore(itemFilter,originalStatus)}else filters.append(partyFilter,itemFilter);
 advanced=document.createElement('details');advanced.className='pd399-advanced';advanced.innerHTML='<summary>⋯ More Details / Original Work Orders / Smart Cloth Allocation / SRL</summary>';
 board.after(advanced);advanced.append(list);oldList=list;
 board.addEventListener('click',e=>{
  const btn=e.target.closest('button');if(!btn)return;
  if(btn.id==='pd399Refresh'){if(typeof window.cfmPendingVerifyCloud==='function')Promise.resolve(window.cfmPendingVerifyCloud()).finally(()=>{rendered='';draw()});else{rendered='';draw()}return}
  const action=btn.getAttribute('data-pd399-act');if(action)handle(action,btn.getAttribute('data-pd399-work'));
 });
 for(const el of [partyFilter,itemFilter,document.getElementById('pendingSearch'),document.getElementById('pendingStatus')]){
  if(el){el.addEventListener('input',()=>{rendered='';draw()});el.addEventListener('change',()=>{rendered='';draw()})}
 }
 // Poll read-only values so multi-phone cloud rechecks update the display.
 setInterval(()=>{if(root.classList.contains('active'))draw()},2400);
 if(typeof window.cfmPendingVerifyCloud==='function')Promise.resolve(window.cfmPendingVerifyCloud()).finally(()=>{rendered='';draw()});
 draw();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();