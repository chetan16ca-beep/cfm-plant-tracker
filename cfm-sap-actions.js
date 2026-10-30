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
