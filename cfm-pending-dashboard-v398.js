/* CFM Pending Dashboard V398: read-only display of Cloud-verified open work orders. */
(function(){
'use strict';
const css=[
'#cfmPendingBoard398{background:#f5faff;border:1px solid #cbdfe9;border-radius:15px;padding:12px;margin:10px 0;box-shadow:0 4px 15px #173c6110;color:#17374f}',
'#cfmPendingBoard398 *{box-sizing:border-box}',
'#cfmPendingBoard398 .pd-head{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:11px}',
'#cfmPendingBoard398 h3{font:800 18px system-ui;margin:0;color:#104971}',
'#cfmPendingBoard398 .pd-sub{display:block;font:500 11px/1.5 system-ui;color:#5a7a91;margin-top:3px}',
'#cfmPendingBoard398 button{border-radius:8px;cursor:pointer;background:#0e669e;color:#fff;border:1px solid #0e669e;padding:8px 11px;min-height:36px;font:700 12px system-ui}',
'#cfmPendingBoard398 .pd-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:12px}',
'#cfmPendingBoard398 .pd-kpi{background:#fff;border:1px solid #d8e7ef;border-radius:10px;padding:10px 8px;min-width:0}',
'#cfmPendingBoard398 .pd-kpi small{display:block;font:650 10px/1.35 system-ui;color:#668195}',
'#cfmPendingBoard398 .pd-kpi strong{font:850 22px/1.3 system-ui;color:#124869;display:block;margin-top:4px;font-variant-numeric:tabular-nums}',
'#cfmPendingBoard398 .pd-kpi:last-child{background:#edf8f1;border-color:#b5d9c1}',
'#cfmPendingBoard398 .pd-kpi:last-child strong{color:#16623f}',
'#cfmPendingBoard398 .pd-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}',
'#cfmPendingBoard398 .pd-card{min-width:0;background:#fff;border:1px solid #d5e3ed;border-left:4px solid #1982ae;border-radius:12px;padding:11px 12px}',
'#cfmPendingBoard398 .pd-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}',
'#cfmPendingBoard398 .pd-work{font:850 17px/1.3 system-ui;color:#154b70}',
'#cfmPendingBoard398 .pd-status{font:750 10px system-ui;background:#fff4d9;color:#916219;padding:4px 7px;border:1px solid #eed9ab;border-radius:8px}',
'#cfmPendingBoard398 .pd-party{font:750 12px/1.45 system-ui;margin:5px 0;color:#173b55;overflow-wrap:anywhere}',
'#cfmPendingBoard398 .pd-meta{font:500 11px/1.5 system-ui;color:#5b7387;display:flex;flex-wrap:wrap;gap:3px 13px;margin:7px 0;overflow-wrap:anywhere}',
'#cfmPendingBoard398 .pd-product{font:700 13px/1.4 system-ui;overflow-wrap:anywhere;background:#f5f9fc;border:1px solid #e3edf4;padding:8px;border-radius:8px;margin:8px 0}',
'#cfmPendingBoard398 .pd-qty{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:8px 0}',
'#cfmPendingBoard398 .pd-qty div{text-align:center;background:#f5f9fc;border:1px solid #d9e7f0;padding:6px 3px;border-radius:8px;min-width:0}',
'#cfmPendingBoard398 .pd-qty div:last-child{background:#eaf7ef;border-color:#b4dac4}',
'#cfmPendingBoard398 .pd-qty small{display:block;font:650 10px/1.25 system-ui;color:#617b8e}',
'#cfmPendingBoard398 .pd-qty b{display:block;font:850 19px/1.35 system-ui;color:#164c73;font-variant-numeric:tabular-nums}',
'#cfmPendingBoard398 .pd-qty div:last-child b{color:#196342}',
'#cfmPendingBoard398 .pd-bar{height:5px;border-radius:5px;background:#e1edf4;overflow:hidden;margin:5px 0 10px}',
'#cfmPendingBoard398 .pd-bar span{display:block;height:100%;background:#1685b7}',
'#cfmPendingBoard398 .pd-stages{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:9px}',
'#cfmPendingBoard398 .pd-stages span{background:#f2f6f9;border:1px solid #e1eaf0;color:#58778d;padding:4px 6px;border-radius:6px;font:600 10px system-ui}',
'#cfmPendingBoard398 .pd-card button{width:100%;background:#edf7ff;color:#155780;border-color:#c5ddec}',
'#cfmPendingBoard398 .pd-notice{padding:12px;background:#fff;border:1px dashed #bfd3e1;border-radius:8px;font:600 12px/1.5 system-ui;color:#526f82}',
'#cfmPendingBoard398 .pd-footer{text-align:center;margin-top:10px}',
'@media(max-width:760px){#cfmPendingBoard398{padding:10px}#cfmPendingBoard398 .pd-kpis{grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}#cfmPendingBoard398 .pd-kpi{padding:8px}#cfmPendingBoard398 .pd-kpi strong{font-size:20px}#cfmPendingBoard398 .pd-list{grid-template-columns:1fr;gap:8px}}'
].join('');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>Math.max(0,Number(v)||0);
const fmt=v=>new Intl.NumberFormat('en-IN',{maximumFractionDigits:2}).format(v);
let board=null,lastSignature='';
function rows(){
 try{
  if(typeof cfmPendingCloudRows==='undefined'||!Array.isArray(cfmPendingCloudRows))return null;
  return cfmPendingCloudRows.filter(r=>r&&String(r.status||'').trim().toUpperCase()==='PENDING'&&!r.archived&&!r.cutEntryPending&&!r.dispatchDoneAt&&String(r.dispatchStatus||'').toUpperCase()!=='DISPATCHED'&&n(r.orderQty)>n(r.cutQty));
 }catch(e){return null}
}
function openWork(work){
 if(typeof showView==='function')showView('pending');
 const status=document.getElementById('pendingStatus');
 if(status){status.value='OPEN';status.dispatchEvent(new Event('change',{bubbles:true}))}
 const search=document.getElementById('pendingSearch');
 if(search){search.value=work||'';search.dispatchEvent(new Event('input',{bubbles:true}))}
 if(typeof renderPending==='function')renderPending();
}
function draw(){
 if(!board||!board.isConnected||document.hidden)return;
 const all=rows(),err=(typeof cfmPendingCloudError!=='undefined'&&cfmPendingCloudError)||'';
 const signature=all===null?'waiting':JSON.stringify(all.map(r=>[r.workNo,r.party,r.poNo,r.itemCode,r.eagleCode,r.description,r.cloth,r.orderQty,r.cutQty,r.status]))+'|'+err;
 if(lastSignature===signature)return;
 lastSignature=signature;
 const stats=board.querySelector('.pd-kpis'),list=board.querySelector('.pd-list'),sub=board.querySelector('.pd-sub');
 if(!all){
  stats.innerHTML='';list.innerHTML='<div class="pd-notice">'+(err?'⚠ Cloud Pending verification unavailable. Please reconnect and sync.':'☁ Verifying Cloud Pending Orders. Unverified work orders will not be displayed.')+'</div>';
  sub.textContent=err?'Cloud verification unavailable':'Waiting for verified Cloud data';return;
 }
 all.sort((a,b)=>String(b.workNo||'').localeCompare(String(a.workNo||''),undefined,{numeric:true}));
 const total=all.reduce((s,r)=>s+n(r.orderQty),0),cut=all.reduce((s,r)=>s+n(r.cutQty),0),bal=all.reduce((s,r)=>s+Math.max(0,n(r.orderQty)-n(r.cutQty)),0);
 stats.innerHTML=[['Pending Orders',all.length],['Order Qty',total],['Cut Qty',cut],['Balance Qty',bal]].map(x=>'<div class="pd-kpi"><small>'+x[0]+'</small><strong>'+fmt(x[1])+'</strong></div>').join('');
 sub.textContent=(err?'Last verified Cloud snapshot • Recheck unavailable':'Verified Cloud Pending • Display only')+' • '+all.length+' work orders';
 list.innerHTML=all.slice(0,12).map(r=>{
  const q=n(r.orderQty),c=n(r.cutQty),b=Math.max(0,q-c),pct=q?Math.min(100,Math.round(c*100/q)):0;
  return '<article class="pd-card"><div class="pd-top"><span class="pd-work">'+esc(r.workNo||'-')+'</span><span class="pd-status">PENDING</span></div>'+
  '<div class="pd-party">'+esc(r.party||'-')+'</div>'+
  '<div class="pd-meta"><span>PO: '+esc(r.poNo||'-')+'</span><span>Item Code: '+esc(r.itemCode||'-')+'</span><span>EFPPL: '+esc(r.eagleCode||'-')+'</span><span>Cloth: '+esc(r.cloth||'-')+'</span></div>'+
  '<div class="pd-product">'+esc(r.description||'-')+'</div>'+
  '<div class="pd-qty"><div><small>Order Qty</small><b>'+fmt(q)+'</b></div><div><small>Cut Qty</small><b>'+fmt(c)+'</b></div><div><small>Balance</small><b>'+fmt(b)+'</b></div></div>'+
  '<div class="pd-bar"><span style="width:'+pct+'%"></span></div>'+
  '<div class="pd-stages" aria-label="Production stages, not completion status"><span>Cutting</span><span>Stitching</span><span>Thread Cut</span><span>Gun Finish</span><span>Packing</span></div>'+
  '<button type="button" data-work="'+esc(r.workNo||'')+'">View Work Order</button></article>';
 }).join('')||'<div class="pd-notice">No verified open Pending Orders.</div>';
}
function init(){
 const root=document.getElementById('view-dashboard');
 if(!root||document.getElementById('cfmPendingBoard398'))return;
 const style=document.createElement('style');style.id='cfmPendingBoard398Css';style.textContent=css;document.head.appendChild(style);
 board=document.createElement('section');board.id='cfmPendingBoard398';board.setAttribute('aria-label','Pending Work Order Dashboard');
 board.innerHTML='<div class="pd-head"><div><h3>📋 Pending Orders Dashboard</h3><small class="pd-sub">Loading verified Cloud data…</small></div><button type="button" data-all="1">All Pending</button></div><div class="pd-kpis"></div><div class="pd-list"></div><div class="pd-footer"><button type="button" data-all="1">View All Pending Orders</button></div>';
 const before=root.querySelector('.cfm-main-actions')||root.querySelector('#cfmPhotoStockPanel')||null;
 if(before)root.insertBefore(board,before);else root.appendChild(board);
 board.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-work'))openWork(b.getAttribute('data-work'));else if(b.hasAttribute('data-all'))openWork('')});
 draw();
 if(typeof window.cfmPendingVerifyCloud==='function')Promise.resolve(window.cfmPendingVerifyCloud()).then(()=>{lastSignature='';draw()}).catch(()=>{});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){lastSignature='';draw()}});
 setInterval(()=>{if(root.classList.contains('active'))draw()},4000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();