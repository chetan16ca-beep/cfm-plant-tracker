/* CFM ERP Pending Orders — approved corporate table design V400.
   Display only: all rows and totals are derived from a verified Cloud snapshot.
   Existing work order/SRL controls remain the authority for any action. */
(function(){
'use strict';
const CSS=[
'#view-pending.cfm400-ready{color:#173451}',
'#view-pending .cfm400{margin:0 0 12px;min-width:0;font-family:Inter,Segoe UI,Arial,sans-serif}',
'#view-pending .cfm400 *{box-sizing:border-box}',
'#view-pending .cfm400-head{display:flex;gap:14px;align-items:center;justify-content:space-between;margin:2px 0 12px}',
'#view-pending .cfm400-heading{display:flex;gap:10px;align-items:center}',
'#view-pending .cfm400-icon{display:grid;place-items:center;width:46px;height:46px;border-radius:13px;background:#e9f3ff;color:#0c54a2;font-size:26px;border:1px solid #caddf1}',
'#view-pending .cfm400-heading h2{font-size:23px!important;font-weight:850!important;color:#0c3159!important;margin:0!important}',
'#view-pending .cfm400-heading p{font-size:12px;color:#56738d;margin:3px 0 0}',
'#view-pending .cfm400-quick{position:relative}',
'#view-pending .cfm400-quick summary{list-style:none;cursor:pointer;background:linear-gradient(135deg,#007bba,#074f98);color:#fff;padding:10px 16px;border-radius:11px;box-shadow:0 4px 12px #1461a827;font-weight:800;font-size:12px;border:1px solid #2e9bcb}',
'#view-pending .cfm400-quick summary::-webkit-details-marker{display:none}',
'#view-pending .cfm400-quick[open] .cfm400-quick-panel{position:absolute;z-index:130;right:0;top:44px;min-width:245px;display:grid;gap:7px;padding:10px;background:#fff;border:1px solid #c8d9e9;border-radius:12px;box-shadow:0 10px 25px #0b39512b}',
'#view-pending .cfm400-quick-panel button{width:100%!important;white-space:normal!important;font-size:12px!important;min-height:39px;text-align:left}',
'#view-pending .cfm400-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:0 0 12px}',
'#view-pending .cfm400-kpi{display:flex;align-items:center;gap:12px;padding:14px 14px;min-width:0;min-height:82px;border-radius:13px;border:1px solid #cde0ef;background:linear-gradient(110deg,#edf6ff,#deefff)}',
'#view-pending .cfm400-kpi:nth-child(2){background:linear-gradient(110deg,#f0fff5,#dff7e9);border-color:#d6ecdd}',
'#view-pending .cfm400-kpi:nth-child(3){background:linear-gradient(110deg,#fff8ec,#ffefd3);border-color:#f4e6c6}',
'#view-pending .cfm400-kpi:nth-child(4){background:linear-gradient(110deg,#fff2f4,#ffe4ea);border-color:#f2d9df}',
'#view-pending .cfm400-kpi .cfm400-kicon{display:grid;place-items:center;flex:0 0 50px;height:50px;border-radius:14px;background:#ffffff91;font-size:26px;color:#0865a0}',
'#view-pending .cfm400-kpi small{display:block;font-size:12px;line-height:1.35;font-weight:700;color:#173b57}',
'#view-pending .cfm400-kpi strong{display:block;font-size:26px;line-height:1.2;font-weight:900;color:#102f53;font-variant-numeric:tabular-nums;margin-top:3px}',
'#view-pending .cfm400-filters,.cfm400 #view-pending .filters{position:static!important;top:auto!important;display:grid!important;grid-template-columns:minmax(200px,2.4fr) minmax(125px,1fr) minmax(125px,1fr) minmax(125px,1fr) 44px!important;gap:8px!important;background:transparent!important;padding:0!important;border:0!important;box-shadow:none!important;margin:0 0 13px!important;overflow:visible!important;width:100%!important}',
'#view-pending .cfm400-filters input,#view-pending .cfm400-filters select{width:100%!important;min-width:0!important;border-radius:9px!important;border:1px solid #c5d8e7!important;background:#fff!important;padding:9px 12px!important;height:42px!important;font-size:12px!important;box-shadow:none!important;color:#163d5a!important}',
'#view-pending .cfm400-filter-refresh{border:1px solid #bdd9ed;border-radius:9px;background:#fff;color:#006db1;font:800 18px system-ui;cursor:pointer;min-height:42px}',
'#view-pending .cfm400-status{font:600 11px/1.5 system-ui;color:#516f85;margin:4px 0 10px}',
'#view-pending .cfm400-tablebox{border:1px solid #d1e1ed;border-radius:13px;box-shadow:0 4px 18px #154e6b13;background:#fff;overflow:auto}',
'#view-pending .cfm400-table{border-collapse:separate;border-spacing:0;width:100%;min-width:1040px;font-family:inherit;table-layout:auto}',
'#view-pending .cfm400-table thead th{background:#0a4386;color:#fff;font:750 11px/1.3 system-ui;text-align:left;padding:11px 9px;border-right:1px solid #ffffff20;white-space:nowrap}',
'#view-pending .cfm400-table thead th:first-child{border-top-left-radius:11px}',
'#view-pending .cfm400-table thead th:last-child{border-top-right-radius:11px}',
'#view-pending .cfm400-table tbody td{padding:10px 8px;border-top:1px solid #e0ebf3;border-right:1px solid #edf2f7;font:600 11px/1.45 system-ui;color:#23465d;vertical-align:middle;overflow-wrap:anywhere}',
'#view-pending .cfm400-table tbody tr:nth-child(even){background:#f7fbff}',
'#view-pending .cfm400-table tbody tr:hover{background:#f0f7ff}',
'#view-pending .cfm400-workno{display:inline-block;padding:5px 9px;border-radius:7px;background:#e1efff;color:#08458f;font-weight:850;white-space:nowrap}',
'#view-pending .cfm400-center{text-align:center!important}',
'#view-pending .cfm400-q{display:block;text-align:center;border-radius:6px;padding:5px 6px;font-size:13px;font-weight:900;min-width:39px;font-variant-numeric:tabular-nums;background:#dcedfd;color:#0f488e}',
'#view-pending .cfm400-q.cut{background:#dbf4e2;color:#145939}',
'#view-pending .cfm400-q.bal{background:#fce1e8;color:#ae1b36}',
'#view-pending .cfm400-stages{display:flex;align-items:flex-start;gap:3px;justify-content:center;min-width:270px}',
'#view-pending .cfm400-stage{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:42px;gap:2px;text-align:center}',
'#view-pending .cfm400-stage i{display:grid;place-items:center;width:27px;height:27px;border-radius:50%;border:1px solid #cbd9e5;background:#f3f7fb;color:#617889;font:850 15px system-ui;font-style:normal}',
'#view-pending .cfm400-stage.done i{background:#16a252;color:#fff;border-color:#16a252}',
'#view-pending .cfm400-stage.partial i{background:#e9f7fd;color:#0974ad;border-color:#70bdde}',
'#view-pending .cfm400-stage small{font:600 9px/1.15 system-ui;color:#536f83}',
'#view-pending .cfm400-stage-arrow{font:700 15px system-ui;color:#7892a4;margin:5px 0 0}',
'#view-pending .cfm400-open{min-height:34px;min-width:70px;background:#fff;border:1px solid #a9c9e5;color:#0e4e8f;border-radius:8px;padding:7px 10px;font:750 11px system-ui;cursor:pointer}',
'#view-pending .cfm400-empty{padding:20px;text-align:center;color:#54758c;background:#fff;font:650 12px/1.5 system-ui}',
'#view-pending .cfm400-bottom{display:grid;grid-template-columns:1.12fr 1fr;gap:12px;margin:13px 0}',
'#view-pending .cfm400-panel{background:#fff;border:1px solid #d3e2ed;border-radius:13px;box-shadow:0 3px 13px #174b7311;padding:13px 15px;min-width:0}',
'#view-pending .cfm400-panel h3{font:850 17px/1.3 system-ui!important;color:#0c3b6c!important;margin:0 0 11px!important}',
'#view-pending .cfm400-actions{display:flex;gap:7px;flex-wrap:wrap}',
'#view-pending .cfm400-actions button{border:1px solid #c5daeb;border-radius:8px;background:#fff;color:#214561;min-height:37px;padding:8px 10px;font:750 11px/1.3 system-ui;cursor:pointer}',
'#view-pending .cfm400-actions button:first-child{background:#075dc3;color:#fff;border-color:#075dc3}',
'#view-pending .cfm400-actions button:last-child{background:#067c9d;color:#fff;border-color:#067c9d}',
'#view-pending .cfm400-actions button:disabled{opacity:.45;cursor:not-allowed}',
'#view-pending .cfm400-selected{font:650 11px/1.4 system-ui;color:#52728a;margin:3px 0 9px;display:flex;align-items:center;gap:7px;flex-wrap:wrap}',
'#view-pending .cfm400-selected select{max-width:230px;min-height:31px;background:#fff;border:1px solid #c3d9e8;border-radius:7px;color:#214764;font:650 11px system-ui;padding:5px}',
'#view-pending .cfm400-chiprow{display:flex;gap:7px;flex-wrap:wrap}',
'#view-pending .cfm400-chip{display:inline-flex;align-items:center;padding:8px 9px;border-radius:8px;background:#e8f4ff;color:#1e5380;border:1px solid #cce2f5;font:700 11px/1.3 system-ui}',
'#view-pending .cfm400-chip.good{background:#e3f7e8;color:#20663c;border-color:#c2e9ce}',
'#view-pending .cfm400-chip.warn{background:#fff1de;color:#ae611a;border-color:#f5dcc0}',
'#view-pending .cfm400-native{background:#fff;border:1px solid #d6e5ed;border-radius:11px;margin:12px 0;overflow:hidden}',
'#view-pending .cfm400-native>summary{padding:13px;cursor:pointer;font:750 13px system-ui;color:#165780}',
'#view-pending .cfm400-native:not([open])>#pendingList{display:none!important}',
'#view-pending .cfm400-native[open]>#pendingList{padding:10px}',
'@media(max-width:1120px){#view-pending .cfm400-kpis{gap:7px}#view-pending .cfm400-kpi{padding:10px;gap:6px}#view-pending .cfm400-kpi .cfm400-kicon{flex-basis:39px;height:40px;font-size:20px}#view-pending .cfm400-kpi small{font-size:10px}#view-pending .cfm400-kpi strong{font-size:21px}}',
'@media(max-width:800px){#view-pending .cfm400-heading h2{font-size:19px!important}#view-pending .cfm400-heading p{font-size:10px}#view-pending .cfm400-kpis{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}#view-pending .cfm400-filters{grid-template-columns:repeat(2,minmax(0,1fr))!important}#view-pending .cfm400-filters #pendingSearch{grid-column:1/-1}#view-pending .cfm400-filter-refresh{grid-column:auto}#view-pending .cfm400-bottom{grid-template-columns:1fr}#view-pending .cfm400-table{min-width:0}#view-pending .cfm400-table thead{display:none}#view-pending .cfm400-table tbody{display:grid;gap:9px;padding:8px;background:#f3f8fc}#view-pending .cfm400-table tbody tr{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid #d0e2ee;background:#fff;border-radius:11px;overflow:hidden;padding:7px;gap:5px;min-width:0}#view-pending .cfm400-table tbody td{border:0;padding:5px 7px;min-width:0}#view-pending .cfm400-table tbody td:before{content:attr(data-label);display:block;color:#758a9b;font:650 10px/1.2 system-ui;margin-bottom:3px}#view-pending .cfm400-table tbody td[data-col="no"]{display:none}#view-pending .cfm400-table tbody td[data-col="wo"]{grid-column:1/3}#view-pending .cfm400-table tbody td[data-col="party"]{grid-column:1/4;font-size:13px!important;font-weight:800!important}#view-pending .cfm400-table tbody td[data-col="product"]{grid-column:2/4}#view-pending .cfm400-table tbody td[data-col="stages"]{grid-column:1/4;border-top:1px solid #e3edf4}#view-pending .cfm400-table tbody td[data-col="action"]{grid-column:1/4}#view-pending .cfm400-stages{min-width:0;justify-content:space-between;gap:2px}#view-pending .cfm400-stage{min-width:32px}#view-pending .cfm400-stage small{font-size:9px}#view-pending .cfm400-open{width:100%}}',
'@media(max-width:440px){#view-pending .cfm400{margin:0}#view-pending .cfm400-head{flex-wrap:wrap}#view-pending .cfm400-kpi{min-height:68px;padding:8px}#view-pending .cfm400-kpi .cfm400-kicon{flex-basis:32px;height:32px;font-size:18px}#view-pending .cfm400-kpi strong{font-size:19px}#view-pending .cfm400-kpi small{font-size:10px}#view-pending .cfm400-panel h3{font-size:15px!important}}'
].join('');
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=x=>String(x??'').trim().toUpperCase();
const num=x=>Math.max(0,Number(x)||0);
const fmt=x=>new Intl.NumberFormat('en-IN',{maximumFractionDigits:2}).format(x);
const isDispatch=r=>!!r&&(!!r.archived||!!r.dispatchDoneAt||norm(r.dispatchStatus)==='DISPATCHED'||['DISPATCHED','ARCHIVED'].includes(norm(r.status)));
const isOpen=r=>!!r&&!isDispatch(r)&&!r.cutEntryPending&&norm(r.status)==='PENDING'&&num(r.orderQty)>num(r.cutQty);
let root,board,details,original,filter,partySel,productSel,workSel,statusEl,searchEl,selected='',sig='';
function cloud(){try{return typeof cfmPendingCloudRows!=='undefined'&&Array.isArray(cfmPendingCloudRows)?cfmPendingCloudRows:null}catch(_){return null}}
function matchesLocal(r){
 try{
  if(typeof state==='undefined'||!Array.isArray(state.pending))return false;
  if(typeof cfmPendingListSignature==='function'&&cfmPendingListSignature(cloud())!==cfmPendingListSignature(state.pending))return false;
  return state.pending.some(x=>norm(x.workNo)===norm(r.workNo)&&norm(x.party)===norm(r.party)&&norm(x.status)===norm(r.status)&&num(x.orderQty)===num(r.orderQty)&&num(x.cutQty)===num(r.cutQty));
 }catch(_){return false}
}
function getOrder(id){return (cloud()||[]).find(x=>norm(x.workNo)===norm(id))}
function options(select,values,title){
 const key=values.join('|');
 if(select.dataset.key===key)return;
 const old=select.value;
 select.innerHTML='<option value="">'+title+'</option>'+values.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');
 select.dataset.key=key;
 if(values.includes(old))select.value=old;
}
function viewRows(all){
 const status=statusEl?.value||'OPEN',q=(searchEl?.value||'').trim().toLowerCase();
 return all.filter(r=>{
  const st=norm(r.status);
  const ok=status==='ALL'||(status==='OPEN'?isOpen(r):
    status==='CUTENTRY'?!!r.cutEntryPending&&!isDispatch(r):
    status==='COMPLETE'?st==='COMPLETED'||st==='WORK DONE':
    status==='DISPATCHED'?isDispatch(r)&&!r.archived:
    status==='ARCHIVED'?!!r.archived||st==='ARCHIVED':isOpen(r));
  if(!ok)return false;
  if(partySel.value&&String(r.party||'')!==partySel.value)return false;
  if(productSel.value&&String(r.description||'')!==productSel.value)return false;
  return !q||JSON.stringify(r).toLowerCase().includes(q);
 }).sort((a,b)=>String(b.workNo||'').localeCompare(String(a.workNo||''),undefined,{numeric:true}));
}
function stageItems(r){
 const q=num(r.orderQty),c=num(r.cutQty);
 const parts=[
  ['Cutting','✂',q&&c>=q?'done':c>0?'partial':''],
  ['Stitching','▤',r.stitchingDone===true?'done':''],
  ['Thread Cut','≋',r.threadCutDone===true?'done':''],
  ['Gun Finish','✧',r.gunFinishDone===true?'done':''],
  ['Packing','⬡',r.packingDone===true?'done':'']
 ];
 return '<div class="cfm400-stages" title="Green only when recorded as completed; cutting comes from verified cut quantity">'+
 parts.map((p,i)=>(i?'<span class="cfm400-stage-arrow">›</span>':'')+
 '<span class="cfm400-stage '+p[2]+'"><i>'+p[1]+'</i><small>'+p[0]+'</small></span>').join('')+'</div>';
}
function td(col,label,html,cls=''){
 return '<td data-col="'+col+'" data-label="'+esc(label)+'" class="'+cls+'">'+html+'</td>';
}
function tableRow(r,i){
 const qty=num(r.orderQty),cut=num(r.cutQty),balance=Math.max(0,qty-cut);
 return '<tr>'+
 td('no','#',String(i+1),'cfm400-center')+
 td('wo','Work Order','<b class="cfm400-workno">'+esc(r.workNo||'-')+'</b>')+
 td('po','PO No.',esc(r.poNo||'-'))+
 td('party','Party / Company',esc(r.party||'-'))+
 td('item','Item Code',esc(r.itemCode||r.eagleCode||'-'))+
 td('product','Product',esc(r.description||'-'))+
 td('qty','Order Qty','<span class="cfm400-q">'+fmt(qty)+'</span>')+
 td('cut','Cut Qty','<span class="cfm400-q cut">'+fmt(cut)+'</span>')+
 td('balance','Balance','<span class="cfm400-q bal">'+fmt(balance)+'</span>')+
 td('stages','Production Stage',stageItems(r))+
 td('action','Action','<button type="button" class="cfm400-open" data-cfm400-open="'+esc(r.workNo||'')+'">Open ›</button>')+
 '</tr>';
}
function nativeCard(id){
 return [...original.querySelectorAll('.data-card')].find(el=>norm(el.querySelector('.work')?.textContent)===norm(id))||null;
}
function openNative(id){
 selected=id;
 details.open=true;
 if(searchEl){searchEl.value=id||'';searchEl.dispatchEvent(new Event('input',{bubbles:true}))}
 if(typeof renderPending==='function')renderPending();
 sig='';draw();
 requestAnimationFrame(()=>{const c=nativeCard(id);(c||details).scrollIntoView({block:'start',behavior:'smooth'})});
}
function selectOptions(rows){
 const all=rows.filter(isOpen);
 const key=all.map(x=>x.workNo).join('|');
 if(workSel.dataset.key!==key){
  workSel.dataset.key=key;
  workSel.innerHTML='<option value="">Select Work Order</option>'+all.map(r=>'<option value="'+esc(r.workNo||'')+'">'+esc(r.workNo)+' — '+esc(r.party||'')+'</option>').join('');
 }
 if(selected&&all.some(r=>norm(r.workNo)===norm(selected)))workSel.value=selected;
 else{selected='';workSel.value=''}
}
function allocation(){
 const box=board.querySelector('#cfm400Allocation');
 if(!selected){box.innerHTML='<span class="cfm400-chip">Select a Work Order to view cloth allocation</span>';return}
 const r=getOrder(selected),card=nativeCard(selected);
 if(!r||!matchesLocal(r)){box.innerHTML='<span class="cfm400-chip warn">Cloud/local mismatch — allocation details in original ERP controls</span>';return}
 const area=card?.querySelector('.cfm-alloc-v104');
 if(!area){box.innerHTML='<span class="cfm400-chip">Open original work order to see verified allocation details</span>';return}
 const chips=[...area.querySelectorAll('.chip')].map(x=>x.textContent.trim()).filter(Boolean).slice(0,7);
 box.innerHTML=chips.length?chips.map(s=>'<span class="cfm400-chip '+(/Exact Width|Allocated/i.test(s)?'good':/Alternative|SHORT/i.test(s)?'warn':'')+'">'+esc(s)+'</span>').join(''):'<span class="cfm400-chip">Allocation status not available</span>';
}
function draw(){
 if(!board||!board.isConnected||!root.classList.contains('active'))return;
 const all=cloud(),error=(typeof cfmPendingCloudError!=='undefined'&&cfmPendingCloudError)||'';
 if(!all){
  board.querySelector('#cfm400Stats').innerHTML='';
  board.querySelector('#cfm400Rows').innerHTML='<tr><td colspan="11" class="cfm400-empty">'+(error?'Cloud verification unavailable — reconnect and refresh.':'Verifying live Cloud Pending Orders…')+'</td></tr>';
  board.querySelector('#cfm400Status').textContent='Waiting for verified Cloud data. No local orders have been substituted.';
  return;
 }
 const parties=[...new Set(all.map(r=>String(r.party||'').trim()).filter(Boolean))].sort();
 const products=[...new Set(all.map(r=>String(r.description||'').trim()).filter(Boolean))].sort();
 options(partySel,parties,'All Parties');
 options(productSel,products,'All Products');
 const display=viewRows(all);
 const fingerprint=JSON.stringify([all.map(x=>[x.workNo,x.poNo,x.party,x.itemCode,x.eagleCode,x.description,x.orderQty,x.cutQty,x.status,x.dispatchStatus,x.cutEntryPending,x.archived,x.stitchingDone,x.threadCutDone,x.gunFinishDone,x.packingDone]),partySel.value,productSel.value,searchEl?.value,statusEl?.value,selected,error]);
 if(sig===fingerprint)return;
 sig=fingerprint;
 const opened=all.filter(isOpen),count=opened.length,ordered=opened.reduce((s,r)=>s+num(r.orderQty),0),cut=opened.reduce((s,r)=>s+num(r.cutQty),0),balance=opened.reduce((s,r)=>s+Math.max(0,num(r.orderQty)-num(r.cutQty)),0);
 board.querySelector('#cfm400Stats').innerHTML=[
 ['▱','Open Orders',count],['✂','Total Order Qty',ordered],['▥','Total Cut Qty',cut],['▤','Balance Qty',balance]
 ].map(v=>'<div class="cfm400-kpi"><span class="cfm400-kicon">'+v[0]+'</span><span><small>'+v[1]+'</small><strong>'+fmt(v[2])+'</strong></span></div>').join('');
 const visible=display.slice(0,250);
 board.querySelector('#cfm400Rows').innerHTML=visible.length?visible.map(tableRow).join(''):'<tr><td colspan="11" class="cfm400-empty">No verified Work Orders match the selected filters.</td></tr>';
 board.querySelector('#cfm400Status').textContent=(error?'Last verified Cloud snapshot • recheck unavailable':'Verified Cloud Pending • no data changed')+' · '+display.length+' results'+(display.length>250?' · First 250 shown; use Search to narrow':'')+' · Stage ticks only from recorded fields';
 selectOptions(opened);
 allocation();
}
function control(action){
 if(!selected){alert('Please select a Work Order first.');return}
 const r=getOrder(selected);
 if(!r||!isOpen(r)||!matchesLocal(r)){
  alert('This Work Order is not matched with the verified Cloud snapshot. Refresh / sync before using actions.');return;
 }
 const card=nativeCard(selected);
 let target=null;
 if(card){
  const pattern=action==='reserve'?/Reserve SRL/i:action==='best'?/Best SRL/i:action==='sop'?/Work Order SOP/i:/Track Work\s*\/\s*Batch/i;
  target=[...card.querySelectorAll('button')].find(b=>pattern.test(b.textContent||''));
 }
 if(target){target.click();return}
 details.open=true;
 if(typeof renderPending==='function')renderPending();
 const updated=nativeCard(selected);
 if(updated)updated.scrollIntoView({behavior:'smooth',block:'start'});
 alert('Open the original Work Order below to use this control. Its existing validations remain active.');
}
function init(){
 root=document.getElementById('view-pending');
 if(!root||document.getElementById('cfmPendingFinal400'))return;
 const header=root.querySelector(':scope > .section-head'),filters=root.querySelector(':scope > .filters');
 original=root.querySelector('#pendingList');
 if(!header||!filters||!original)return;
 const style=document.createElement('style');style.id='cfmPendingFinal400Css';style.textContent=CSS;document.head.appendChild(style);
 root.classList.add('cfm400-ready');
 board=document.createElement('section');board.id='cfmPendingFinal400';board.className='cfm400';
 board.innerHTML='<div class="cfm400-head"><div class="cfm400-heading"><span class="cfm400-icon">▤</span><div><h2>Pending Orders</h2><p>Open Production Orders (Cutting to Packing)</p></div></div><details class="cfm400-quick"><summary>⚡ Quick Actions ▾</summary><div class="cfm400-quick-panel"></div></details></div>'+
 '<div class="cfm400-kpis" id="cfm400Stats"></div><div class="cfm400-filterhost"></div><div class="cfm400-status" id="cfm400Status">Verifying Cloud Orders…</div>'+
 '<div class="cfm400-tablebox"><table class="cfm400-table"><thead><tr><th>#</th><th>Work Order</th><th>PO No.</th><th>Party / Company</th><th>Item Code</th><th>Product</th><th>Order Qty</th><th>Cut Qty</th><th>Balance</th><th>Production Stage (Cutting → Packing)</th><th>Action</th></tr></thead><tbody id="cfm400Rows"></tbody></table></div>'+
 '<div class="cfm400-bottom"><section class="cfm400-panel"><h3>▥ SRL Controls</h3><div class="cfm400-selected"><label for="cfm400WorkSelect">Work Order:</label><select id="cfm400WorkSelect"><option value="">Select Work Order</option></select></div><div class="cfm400-actions"><button type="button" data-cfm400-control="reserve">📌 Reserve SRL</button><button type="button" data-cfm400-control="best">🎯 Best SRL</button><button type="button" data-cfm400-control="sop">☑ Work Order SOP</button><button type="button" data-cfm400-control="track">📍 Track Work / Batch</button></div></section><section class="cfm400-panel"><h3>▱ Smart Cloth Allocation</h3><div class="cfm400-chiprow" id="cfm400Allocation"><span class="cfm400-chip">Select a Work Order</span></div></section></div>';
 header.before(board);
 // Move, not duplicate, real ERP action buttons into the Quick Actions dropdown.
 const quick=board.querySelector('.cfm400-quick-panel');
 [...header.querySelectorAll('button')].forEach(btn=>quick.appendChild(btn));
 header.style.display='none'; // Original heading is preserved in the DOM.
 filter=filters;filter.classList.add('cfm400-filters');
 board.querySelector('.cfm400-filterhost').appendChild(filter);
 searchEl=document.getElementById('pendingSearch');statusEl=document.getElementById('pendingStatus');
 partySel=document.createElement('select');partySel.id='cfm400Party';partySel.setAttribute('aria-label','Filter by party');
 productSel=document.createElement('select');productSel.id='cfm400Product';productSel.setAttribute('aria-label','Filter by product');
 filter.append(productSel,partySel);
 const refresh=document.createElement('button');refresh.className='cfm400-filter-refresh';refresh.type='button';refresh.textContent='↻';refresh.title='Recheck verified Cloud Pending Orders';refresh.setAttribute('aria-label','Refresh verified Pending Orders');filter.appendChild(refresh);
 details=document.createElement('details');details.className='cfm400-native';details.innerHTML='<summary>⋯ Original Work Order Details / SRL / SOP / Work Done</summary>';
 board.after(details);details.appendChild(original);
 workSel=board.querySelector('#cfm400WorkSelect');
 workSel.addEventListener('change',()=>{selected=workSel.value;sig='';draw()});
 for(const el of [searchEl,statusEl,partySel,productSel]){
  if(el){el.addEventListener('input',()=>{sig='';draw()});el.addEventListener('change',()=>{sig='';draw()})}
 }
 board.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-cfm400-open')){openNative(b.getAttribute('data-cfm400-open'));return}
  const action=b.getAttribute('data-cfm400-control');if(action)control(action);
 });
 refresh.addEventListener('click',()=>{if(typeof window.cfmPendingVerifyCloud==='function')Promise.resolve(window.cfmPendingVerifyCloud()).finally(()=>{sig='';draw()});else{sig='';draw()}});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){sig='';draw()}});
 setInterval(()=>{if(root.classList.contains('active'))draw()},3000);
 draw();
 if(typeof window.cfmPendingVerifyCloud==='function')Promise.resolve(window.cfmPendingVerifyCloud()).finally(()=>{sig='';draw()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();