/* CFM SAP-style Action Search, opt-in interface only.
   No silent creates, edits, deletes, stock deductions, or cloud writes. */
(function(){
'use strict';
const items=[
 ['🏠','Dashboard','Plant overview','dashboard'],
 ['📋','Work Orders / Pending','Open all pending work orders','pending'],
 ['🗓️','Production Planning','Daily work and priorities','planning'],
 ['📦','Store / Physical Rolls','SRL-wise cloth stock','store'],
 ['✂️','Cutting Register','Cutting entries and actual roll selection','cutting'],
 ['🔎','Search Orders / SRL','Find old and new work orders','search'],
 ['👷','Department Work Report','Cutting to packing activity','deptwork'],
 ['🚚','Ready for Dispatch','Packing and delivery preparation','readydispatch'],
 ['📏','Measurement Sheet','Product measurements','measurements'],
 ['🧶','SRL Tracker','Roll serial tracking','srltracker'],
 ['🧾','Issue Register','Open and close material issues','issues'],
 ['📐','Width-wise Stock','Cloth width report','widthreport'],
 ['📊','Stock Summary','Balance reporting','stocksummary'],
 ['📅','Monthly Reports','Monthly plant summaries','monthly'],
 ['🖨️','Print Center','Print daily forms and tags','print'],
 ['📑','Excel Records','Legacy register sheets','excel'],
 ['📄','Documents','Document generation','docs'],
 ['⚙️','Settings','ERP tools and configuration','settings'],
 ['🏭','Smart Production Command Center','Read-only live overview','__command'],
 ['⬇️','Save PC Data','Download an emergency backup','__backup']
];
function ready(){
 if(document.getElementById('cfmSapOpen'))return;
 const host=document.querySelector('.topbar');
 if(!host)return;
 const launcher=document.createElement('button');
 launcher.id='cfmSapOpen';launcher.className='cfm-sap-open';launcher.type='button';
 launcher.textContent='⌕ Quick Actions';launcher.setAttribute('aria-haspopup','dialog');
 launcher.title='Search ERP modules (Ctrl + K)';
 const target=host.lastElementChild||host;
 target.appendChild(launcher);
 const overlay=document.createElement('div');overlay.className='cfm-sap-overlay';overlay.hidden=true;
 overlay.innerHTML='<div class="cfm-sap-dialog" role="dialog" aria-modal="true" aria-label="ERP Quick Actions"><div class="cfm-sap-dialog-header"><span>CFM ERP · Quick Actions</span><button type="button" data-close aria-label="Close search">✕</button></div><div class="cfm-sap-dialog-search"><input type="search" aria-label="Search ERP modules" placeholder="Search work orders, stock, reports…"></div><div class="cfm-sap-items"></div><div class="cfm-sap-foot">Ctrl + K to open · Esc to close · Existing ERP modules and data remain unchanged</div></div>';
 document.body.appendChild(overlay);
 const field=overlay.querySelector('input');
 const results=overlay.querySelector('.cfm-sap-items');
 function run(v){
  hide();
  if(v==='__command'){
   if(typeof window.cfmOpenProductionCommandCenter==='function')window.cfmOpenProductionCommandCenter();
   else alert('Command Center is still loading. Try again.');
  }else if(v==='__backup'){
   if(window.parent&&typeof window.parent.cfmDownloadBackup==='function')window.parent.cfmDownloadBackup();
   else alert('Save PC Data is unavailable. Open ERP Settings.');
  }else if(document.getElementById('view-'+v)&&typeof window.showView==='function'){
   window.showView(v);
  }else alert('This module is not ready in the current ERP version.');
 }
 function draw(){
  const q=field.value.trim().toLowerCase();results.replaceChildren();let count=0;
  for(const [emoji,title,desc,v] of items){
   if(q&&!(title+' '+desc+' '+v).toLowerCase().includes(q))continue;
   if(!v.startsWith('__')&&!document.getElementById('view-'+v))continue;
   const b=document.createElement('button');b.type='button';b.className='cfm-sap-item';
   const ico=document.createElement('span');ico.textContent=emoji;
   const copy=document.createElement('div');
   const strong=document.createElement('strong');strong.textContent=title;
   const small=document.createElement('small');small.textContent=desc;
   copy.append(strong,small);b.append(ico,copy);b.addEventListener('click',()=>run(v));
   results.append(b);count++;
  }
  if(!count){const no=document.createElement('p');no.textContent='No matching ERP modules.';no.style.padding='14px';results.append(no)}
 }
 function show(){overlay.hidden=false;field.value='';draw();field.focus()}
 function hide(){overlay.hidden=true;launcher.focus()}
 launcher.addEventListener('click',show);
 overlay.querySelector('[data-close]').addEventListener('click',hide);
 overlay.addEventListener('click',e=>{if(e.target===overlay)hide()});
 document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();overlay.hidden?show():hide()}
  if(e.key==='Escape'&&!overlay.hidden){e.preventDefault();hide()}
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();


/* V207: visually distinct, read-only SAP-style plant launchpad.
   All module shortcuts call existing ERP navigation. No data writes. */
(function(){
'use strict';
const tiles=[
 ['📋','Work Orders','Create or review pending orders','pending'],
 ['✂️','Cutting Register','Cutting entries, SRL and meter records','cutting'],
 ['📦','Store & Stock','Physical rolls and cloth balances','store'],
 ['🏭','Production Center','Read-only orders and department load','__command'],
 ['👷','Department Activity','Stitching, thread cut, gun finish, packing','deptwork'],
 ['🚚','Ready to Dispatch','Review finished order status','readydispatch'],
 ['🔎','Search & History','Find old and new work numbers','search'],
 ['🖨️','Reports & Print','Daily printing and work tags','print']
];
function nav(action){
 if(action==='__command'){
  if(typeof window.cfmOpenProductionCommandCenter==='function')window.cfmOpenProductionCommandCenter();
  else alert('Production Center is loading. Try again.');
 }else if(document.getElementById('view-'+action)&&typeof window.showView==='function'){
  window.showView(action);
 }else alert('Module not ready. Open it from ERP navigation.');
}
function setup(){
 const dashboard=document.getElementById('view-dashboard');
 if(!dashboard||document.getElementById('cfmSapWorkspace'))return;
 const header=document.querySelector('header.topbar');
 const actions=header&&header.lastElementChild;
 if(actions&&!document.getElementById('cfmSapClassic')){
  const b=document.createElement('button');b.type='button';b.id='cfmSapClassic';b.className='cfm-sap-classic';
  b.textContent='Original Theme';b.title='Switch to original ERP appearance without changing records';
  b.addEventListener('click',()=>{
   const url=new URL(window.parent.location.href);
   url.searchParams.set('theme','classic');
   window.parent.location.assign(url.href);
  });
  actions.appendChild(b);
 }
 const section=document.createElement('section');
 section.id='cfmSapWorkspace';section.className='sap-workspace';
 section.innerHTML='<div class="sap-intro"><div><div class="sap-kicker">CFM • ENTERPRISE OPERATIONS</div>'+
  '<h1>Plant Operations Workspace</h1><p>Orders · Stock · Cutting · Production · Dispatch</p></div>'+
  '<button type="button" data-action="__command">Open Production Center</button></div>'+
  '<div class="sap-section-title">Plant Overview · Device Records</div>'+
  '<div class="sap-metrics"><div class="sap-metric"><span>Active Orders</span><strong id="cfmSapOrderCount">—</strong><small>Current Pending list on this device</small></div><div class="sap-metric"><span>Known Work Nos</span><strong id="cfmSapKnownCount">—</strong><small>Pending + Cutting + Issue history (device)</small></div>'+
  '<div class="sap-metric"><span>SRL Stock Rolls</span><strong id="cfmSapStoreCount">—</strong><small>Store register entries</small></div>'+
  '<div class="sap-metric"><span>Cutting Entries</span><strong id="cfmSapCutCount">—</strong><small>Cutting register entries</small></div></div>'+
  '<div class="sap-section-title">ERP Modules</div><div class="sap-tile-grid"></div>'+
  '<p class="sap-workspace-note">Active Orders counts distinct non-archived Work Nos currently loaded in Pending. Known Work Nos combines Pending + Cutting + Issue history on this device, including archived orders; it is NOT a verified Cloud total. Missing Cloud orders are not included. No work orders or stock are changed by this screen.</p>';
 const grid=section.querySelector('.sap-tile-grid');
 tiles.forEach(([emoji,title,desc,action])=>{
  const b=document.createElement('button');b.type='button';b.className='sap-tile';
  b.innerHTML='<span class="sap-tile-icon"></span><span><strong></strong><small></small></span>';
  b.querySelector('.sap-tile-icon').textContent=emoji;
  b.querySelector('strong').textContent=title;b.querySelector('small').textContent=desc;
  b.addEventListener('click',()=>nav(action));grid.appendChild(b);
 });
 section.querySelector('[data-action]').addEventListener('click',()=>nav('__command'));
 dashboard.prepend(section);
 function update(){
  try{
   if(typeof state==='undefined'||!state)return;
   const orders=Array.isArray(state.pending)?state.pending:[];
   const key=x=>String(x?.workNo||x?.workOrder||x?.wo||'').trim().toUpperCase();
   const map=new Set(orders.filter(x=>x&&!/^(true|1|yes)$/i.test(String(x.archived||''))).map(key).filter(Boolean));
   const store=Array.isArray(state.store)?state.store:[];
   const cuts=Array.isArray(state.cutting)?state.cutting:[];
   const issues=Array.isArray(state.issueRegister)?state.issueRegister:[];
   const known=new Set([...orders,...cuts,...issues].map(key).filter(Boolean));
   const o=document.getElementById('cfmSapOrderCount');
   const k=document.getElementById('cfmSapKnownCount');
   const s=document.getElementById('cfmSapStoreCount');
   const c=document.getElementById('cfmSapCutCount');
   if(o)o.textContent=String(map.size);
   if(k)k.textContent=String(known.size);
   if(s)s.textContent=String(store.length);
   if(c)c.textContent=String(cuts.length);
  }catch(e){console.warn('CFM SAP overview counters unavailable',e)}
 }
 update();setInterval(()=>{if(document.getElementById('view-dashboard')?.classList.contains('active'))update()},15000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
