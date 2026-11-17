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
 const section=document.createElement('section');
 section.id='cfmSapWorkspace';section.className='sap-workspace';
 section.innerHTML='<details class="cfm-cloud-compact" style="background:#f5fbff;border:1px solid #cee3ed;border-radius:12px;padding:8px 12px;margin:0 0 6px">'+
  '<summary style="cursor:pointer;font:700 12px system-ui;color:#16546a;list-style:none">☁ Cloud · <strong id="cfmSapCloudOrders">—</strong> Orders · <strong id="cfmSapCloudKnown">—</strong> Known Work Nos ▾</summary>'+
  '<div style="padding-top:8px"><button class="sap-cloud-verify" type="button" id="cfmSapVerifyCloud">↻ Verify Cloud Counts</button><div class="sap-cloud-status" id="cfmSapCloudStatus" role="status" aria-live="polite">Reading Cloud Work Orders…</div></div>'+
  '</details><div class="sap-metrics" style="display:none!important" aria-hidden="true"></div>';
 dashboard.prepend(section);
 function update(){
  try{
   if(typeof state==='undefined'||!state)return;
   const orders=Array.isArray(state.pending)?state.pending:[];
   const key=x=>String(x?.workNo||x?.workOrder||x?.wo||'').trim().toUpperCase();
   const store=Array.isArray(state.store)?state.store:[];
   const cuts=Array.isArray(state.cutting)?state.cutting:[];
   const issues=Array.isArray(state.issueRegister)?state.issueRegister:[];
   const known=new Set([...orders,...cuts,...issues].map(key).filter(Boolean));
   const k=document.getElementById('cfmSapKnownCount');
   const s=document.getElementById('cfmSapStoreCount');
   const c=document.getElementById('cfmSapCutCount');
   if(k)k.textContent=String(known.size);
   if(s)s.textContent=String(store.length);
   if(c)c.textContent=String(cuts.length);
  }catch(e){console.warn('CFM SAP overview counters unavailable',e)}
 }
 // Read-only Cloud verification; never imports, merges, pushes, restores or saves state.
 // cloudFetch() is the ERP's existing authenticated public-client read method.
 let latestCloud=null,cloudBusyView=false,verifiedOnce=false;
 const verifyBtn=document.getElementById('cfmSapVerifyCloud');
 const cloudStatus=document.getElementById('cfmSapCloudStatus');
 const uniq=items=>new Set((Array.isArray(items)?items:[]).map(x=>String(x?.workNo||x?.workOrder||x?.wo||'').trim().toUpperCase()).filter(Boolean));
 async function verifyCloud(){
   if(cloudBusyView)return;
   cloudBusyView=true;
   if(verifyBtn)verifyBtn.disabled=true;
   if(cloudStatus){cloudStatus.textContent='Reading latest shared Cloud snapshot (read only)…';cloudStatus.dataset.mode='pending'}
   try{
     if(typeof cloudFetch!=='function')throw Error('ERP Cloud reader not initialized');
     const row=await cloudFetch();
     const data=row&&row.payload;
     if(!data||!Array.isArray(data.pending)||!Array.isArray(data.cutting))throw Error('Cloud response is missing the Pending or Cutting register');
     const pending=uniq(data.pending);
     const history=uniq([...data.pending,...data.cutting]);
     latestCloud={version:row.version,updatedAt:row.updated_at,pending:pending.size,known:history.size};
     const a=document.getElementById('cfmSapCloudOrders'),b=document.getElementById('cfmSapCloudKnown');
     if(a)a.textContent=String(pending.size);
     if(b)b.textContent=String(history.size);
     if(cloudStatus){
       const updated=row.updated_at?new Date(row.updated_at):null;
       const time=updated&&!Number.isNaN(updated.getTime())?updated.toLocaleString('en-IN'):'time unavailable';
       cloudStatus.textContent='Cloud read verified · Version '+String(row.version||'?')+' · Last saved '+time+' · No changes made';
       cloudStatus.dataset.mode='ok';
     }
     verifiedOnce=true;
     update();
   }catch(e){
     console.warn('Cloud count verification failed (read only)',e);
     if(cloudStatus){
       cloudStatus.textContent=(latestCloud?'Last verified Cloud snapshot retained; new check failed: ':'Cloud totals unavailable; local-only numbers are NOT Cloud totals. ')+String(e?.message||e);
       cloudStatus.dataset.mode='error';
     }
   }finally{
     cloudBusyView=false;
     if(verifyBtn)verifyBtn.disabled=false;
   }
 }
 if(verifyBtn)verifyBtn.addEventListener('click',verifyCloud);
 update();
 // First load and every explicit Verify click are read only. No background write.
 verifyCloud();
 setInterval(()=>{if(document.getElementById('view-dashboard')?.classList.contains('active'))update()},15000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
