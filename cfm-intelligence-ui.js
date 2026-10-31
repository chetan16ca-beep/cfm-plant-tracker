/* CFM Intelligence Suite UI V215: four independent tools, explicit data safety boundaries. */
(function(){
'use strict';
const C=()=>window.CFMIntelCore;
const $=id=>document.getElementById(id);
const e=v=>C().esc(v);
const n=v=>C().norm(v);
const nn=v=>C().num(v);
let tab='simulation',cloud=null,openCount=0;
const names={
 simulation:['Simulation Lab','Run what-if calculations without touching live ERP'],
 search:['Smart Search','Find Work Orders, Cutting, SRL and department records'],
 revision:['PO Revision Check','Compare incoming revised PO text against a saved Work Order'],
 remnants:['Cloth Remnant Planner','Log only measured leftover pieces outside main SRL Stock']
};
const btn=(name,title,hint,icon)=>'<button type="button" class="cfm-intel-tool" data-intel-tab="'+name+'"><span class="cfm-intel-tool-icon" aria-hidden="true">'+icon+'</span><span class="cfm-intel-tool-copy"><b>'+e(title)+'</b><small>'+e(hint)+'</small></span><span class="cfm-intel-arrow" aria-hidden="true">›</span></button>';
function buildLauncher(){
 const workspace=$('cfmSapWorkspace');
 if(!workspace||$('cfmIntelLauncher'))return;
 const sec=document.createElement('section');sec.id='cfmIntelLauncher';sec.className='cfm-intel-launcher';
 sec.innerHTML='<div class="cfm-intel-heading"><div><span>CFM FORGE / ADVANCED INTELLIGENCE</span><h3>Manufacturing Intelligence Tools</h3><p>Four practical tools • controlled, read-only ERP access</p></div><span class="cfm-intel-safety"><span aria-hidden="true">●</span> LIVE ERP PROTECTED</span></div>'+
  '<div class="cfm-intel-tools">'+
   btn('simulation','Simulation Lab','Test Qty, Cutting & SRL usage','◈')+
   btn('search','Manufacturing Search','Search orders, SRL and cutting','⌕')+
   btn('revision','PO Revision Check','Detect changed specifications','≠')+
   btn('remnants','Cloth Remnant Planner','Manage measured leftover pieces','▤')+
  '</div>';
 const after=workspace.querySelector('.sap-metrics');
 if(after)after.after(sec);else workspace.append(sec);
 sec.addEventListener('click',ev=>{const b=ev.target.closest('[data-intel-tab]');if(b)window.cfmOpenIntelligence(b.dataset.intelTab)});
}
function createDialog(){
 if($('cfmIntelligenceDialog'))return $('cfmIntelligenceDialog');
 const dlg=document.createElement('dialog');dlg.id='cfmIntelligenceDialog';
 dlg.className='cfm-intel-dialog';dlg.setAttribute('aria-label','CFM Manufacturing Intelligence Suite');
 dlg.innerHTML='<div class="cfm-intel-head"><div><small>CFM FORGE / INTELLIGENCE</small><h2 id="cfmIntelTitle">Manufacturing Tools</h2><p id="cfmIntelSubtitle"></p></div><button type="button" id="cfmIntelClose" aria-label="Close intelligence tools">×</button></div>'+
  '<nav class="cfm-intel-tabs" aria-label="Intelligence modules">'+
   '<button type="button" data-tab="simulation">◈ Simulation</button><button type="button" data-tab="search">⌕ Smart Search</button><button type="button" data-tab="revision">≠ PO Revision</button><button type="button" data-tab="remnants">▤ Remnants</button>'+
  '</nav><main class="cfm-intel-body" id="cfmIntelBody"></main>'+
  '<footer class="cfm-intel-foot"><span id="cfmIntelSafety">No ERP data is edited by this tool</span><button type="button" id="cfmIntelDone">Close</button></footer>';
 document.body.append(dlg);
 dlg.querySelector('#cfmIntelClose').addEventListener('click',()=>dlg.close());
 dlg.querySelector('#cfmIntelDone').addEventListener('click',()=>dlg.close());
 dlg.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.tab)));
 dlg.addEventListener('close',()=>{ // Simulated test state intentionally expires on close.
  const tmp=$('cfmIntelSimulationResult');if(tmp)tmp.replaceChildren();
 });
 return dlg;
}
function show(which){
 const dl=createDialog();tab=names[which]?which:'simulation';
 $('cfmIntelTitle').textContent=names[tab][0];
 $('cfmIntelSubtitle').textContent=names[tab][1];
 dl.querySelectorAll('[data-tab]').forEach(b=>{
  const active=b.dataset.tab===tab;b.classList.toggle('active',active);
  b.setAttribute('aria-current',active?'page':'false');
 });
 const s=C().snapshot();
 const body=$('cfmIntelBody');
 if(!s){body.innerHTML='<div class="cfm-intel-message warn">ERP data is not loaded. Open CFM ERP, check Cloud Sync, then reopen this tool. No change made.</div>';return}
 if(tab==='simulation')simulation(s);
 else if(tab==='search')smartSearch(s);
 else if(tab==='revision')revision(s);
 else remnants(s);
}
function optionsWorks(s,any=false){
 const a=(s.pending||[]).filter(x=>C().workNumber(x)).slice().sort((x,y)=>n(x.workNo).localeCompare(n(y.workNo),undefined,{numeric:true}));
 return (any?'<option value="TRIAL">TRIAL — new hypothetical Work Order</option>':'')+
 a.map(x=>'<option value="'+e(x.workNo)+'">'+e(x.workNo)+' · '+e(x.party||'')+'</option>').join('');
}
function note(msg,kind){
 return '<div class="cfm-intel-message '+(kind||'')+'">'+msg+'</div>';
}
function field(label,control,hint){
 return '<label class="cfm-intel-field"><span>'+e(label)+'</span>'+control+(hint?'<small>'+e(hint)+'</small>':'')+'</label>';
}
function textInput(id,value,placeholder,type){
 return '<input id="'+id+'" type="'+(type||'text')+'" value="'+e(value==null?'':value)+'" placeholder="'+e(placeholder||'')+'" autocomplete="off">';
}
function summary(box,msg,kind){
 const target=$(box);if(target){target.innerHTML=note(msg,kind);target.setAttribute('role','status')}
}
function simulation(s){
 const b=$('cfmIntelBody');
 const rolls=s.store.filter(r=>r.srlNo).map(r=>'<option value="'+e(r.srlNo)+'"></option>').join('');
 b.innerHTML=note('<b>Sandbox only:</b> order/cutting records are copied into temporary memory. Changes are never saved, synced, posted or used to deduct SRL stock.','ok')+
 '<div class="cfm-intel-card"><h3>01 / Test a Production Scenario</h3><p>Choose a real Work No for comparison, or use TRIAL for a hypothetical order.</p>'+
 '<div class="cfm-intel-grid">'+
 field('Existing Work Order or TRIAL','<select id="cfmSimWork">'+optionsWorks(s,true)+'</select>')+
 field('Trial Total Order Qty',textInput('cfmSimQty','25','Quantity','number'))+
 field('Additional Trial Cut Qty',textInput('cfmSimCut','0','New cut Qty','number'))+
 field('Physical SRL (optional)',textInput('cfmSimSrl','','Search existing SRL').replace('id="cfmSimSrl"','id="cfmSimSrl" list="cfmSimRolls"')+'<datalist id="cfmSimRolls">'+rolls+'</datalist>','Optional — for projected MTR check only')+
 field('Hypothetical Used MTR',textInput('cfmSimMtr','0','Meter','number'), 'Manual assumption; not deducted from actual Stock')+
 '</div><div class="cfm-intel-actions"><button type="button" class="primary" id="cfmSimRun">Run Simulation</button><button type="button" id="cfmSimReset">Reset Trial</button></div>'+
 '<div id="cfmIntelSimulationResult" aria-live="polite"></div></div>';
 const sel=$('cfmSimWork');
 const data={store:s.store,pending:s.pending,cutting:s.cutting};
 const reset=()=>{const r=s.pending.find(x=>n(x.workNo)===n(sel.value));$('cfmSimQty').value=r?nn(r.orderQty):25;$('cfmSimCut').value='0';$('cfmSimMtr').value='0';$('cfmSimSrl').value='';$('cfmIntelSimulationResult').replaceChildren()};
 sel.addEventListener('change',reset);
 $('cfmSimReset').addEventListener('click',()=>{sel.value='TRIAL';reset()});
 $('cfmSimRun').addEventListener('click',()=>{
  const result=C().trial({workNo:sel.value,orderQty:$('cfmSimQty').value,extraCutQty:$('cfmSimCut').value,usedMtr:$('cfmSimMtr').value,srlNo:$('cfmSimSrl').value},data);
  if(result.error)return summary('cfmIntelSimulationResult',e(result.error),'warn');
  const metrics=[
   ['Original Order Qty',result.currentQty],['Trial Order Qty',result.qty],
   ['Original Cut Qty',result.currentCut],['Trial Additional Cuts',result.cut],
   ['Pending Before',result.beforePending],['Pending After Trial',result.afterPending]
  ];
  let html='<div class="cfm-intel-results"><h3>Simulation Result · '+e(result.workNo)+'</h3><div class="cfm-intel-mini-grid">'+
   metrics.map(x=>'<div><small>'+e(x[0])+'</small><strong>'+e(x[1])+'</strong></div>').join('')+'</div>'+
   note('Temporary scenario calculated. No real Work Order or Cutting Entry was added; no Stock was changed.','ok');
  if(result.stock){
   const a=result.stock;
   html+='<h4>SRL Projection (hypothetical)</h4>';
   if(a.found){
    html+='<p>SRL '+e(a.roll.srlNo)+' · Actual roll width in Store: <b>'+e(a.actualWidth||'not recorded')+' in</b></p>'+
    '<p>Stored/reference MTR: <b>'+e(a.balance===null?'Unverified':a.balance)+'</b> · Trial used: <b>'+e(result.meters)+'</b> · Projected: <b>'+e(a.after===null?'Unknown':a.after)+'</b></p>'+
    note(e(a.warning||'Projection uses the stored meter field, which may not be the verified live balance. Physical roll width must match cutting requirements. No deduction is posted.'),a.warning?'warn':'');
   }else html+=note(e(a.warning),'warn');
  }
  html+='</div>';
  $('cfmIntelSimulationResult').innerHTML=html;
 });
}
function smartSearch(s){
 const b=$('cfmIntelBody');
 const cloudStatus=cloud?'Cloud snapshot loaded for this session · Version '+e(cloud.version||'?'):'Current device records (Cloud may have additional Work Orders)';
 b.innerHTML=note('<b>Smart Search:</b> deterministic search of existing records. It does not generate AI answers or change ERP data. For full Cloud records, select “Read Cloud”.','')+
 '<div class="cfm-intel-card"><h3>02 / Find Any Manufacturing Record</h3>'+
 '<div class="cfm-intel-search-line"><input id="cfmIntelQuery" type="search" maxlength="180" placeholder="e.g. CFM-677, 333 ANT, EFPPL03/0351, RUSAN"><button type="button" class="primary" id="cfmIntelFind">Search</button></div>'+
 '<div class="cfm-intel-actions"><button type="button" id="cfmIntelCloud">Read Cloud (no changes)</button><small id="cfmIntelSource">'+cloudStatus+'</small></div>'+
 '<div id="cfmIntelSearchResults" aria-live="polite"></div></div>';
 const run=()=>{
  const q=$('cfmIntelQuery').value.trim();
  const x=cloud?.payload||s;
  if(q.length<2)return summary('cfmIntelSearchResults','Enter Work No, SRL, Party, cloth or description (at least 2 letters).','warn');
  const rows=C().search(q,x);
  if(!rows.length)return summary('cfmIntelSearchResults','No matching records in '+(cloud?'Cloud':'this device')+'. Try another Work No or “Read Cloud”.','warn');
  let html='<div class="cfm-intel-results"><h4>'+rows.length+' matching record(s) · '+(cloud?'Cloud':'Device')+'</h4>'+
   '<div class="cfm-intel-table-wrap"><table><thead><tr><th>Register</th><th>Work No</th><th>SRL / PO / Stage</th><th>Details</th></tr></thead><tbody>';
  html+=rows.map(r=>'<tr><td>'+e(r.type)+'</td><td><b>'+e(r.workNo||'—')+'</b></td><td>'+e(r.ref||'—')+'</td><td>'+e(r.summary)+'</td></tr>').join('');
  html+='</tbody></table></div><p class="cfm-intel-quiet">Showing maximum 100 results. Read-only. Cloud and Device may contain different snapshots.</p></div>';
  $('cfmIntelSearchResults').innerHTML=html;
 };
 $('cfmIntelFind').addEventListener('click',run);
 $('cfmIntelQuery').addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();run()}});
 $('cfmIntelCloud').addEventListener('click',async()=>{
  const t=$('cfmIntelCloud');t.disabled=true;t.textContent='Reading Cloud…';
  try{
   if(typeof cloudFetch!=='function')throw Error('Cloud connection not ready');
   const r=await cloudFetch();
   if(!r||!C().valid(r.payload))throw Error('Cloud snapshot is unavailable');
   cloud={payload:r.payload,version:r.version,updatedAt:r.updated_at};
   $('cfmIntelSource').textContent='Cloud version '+String(r.version||'?')+' · Updated '+String(r.updated_at||'unknown')+' · read-only';
   t.textContent='Refresh Cloud Read';if($('cfmIntelQuery').value.trim().length>=2)run();
  }catch(err){t.textContent='Try Cloud Again';summary('cfmIntelSearchResults',e(err.message||'Cloud read failed')+'. Your local data remains unchanged.','warn')}
  finally{t.disabled=false}
 });
}
function revision(s){
 const b=$('cfmIntelBody');
 b.innerHTML=note('<b>Review only:</b> works best with copied/pasted PO text that includes labelled Qty, PO No, Delivery Date, Micron etc. Unreadable fields are marked “Not detected”, never assumed unchanged. Nothing is saved to Work Orders.','')+
 '<div class="cfm-intel-card"><h3>03 / Compare Revised Purchase Order</h3><div class="cfm-intel-grid">'+
 field('Existing Work Order','<select id="cfmRevWork"><option value="">Choose Work Order</option>'+optionsWorks(s)+'</select>')+
 field('PO Text File (optional)','<input id="cfmRevFile" type="file" accept=".txt,.csv,text/plain,text/csv">','For scanned/PDF PO, paste its extracted text here; automatic PDF/OCR not part of this tool')+'</div>'+
 field('Revised PO Text','<textarea id="cfmRevText" rows="8" maxlength="18000" placeholder="PO No: 378\nQuantity: 10\nDelivery Date: 10/11/2026\nDescription: CF Bag 48 Top LT 1 micron antistatic"></textarea>')+
 '<div class="cfm-intel-actions"><button type="button" class="primary" id="cfmRevCompare">Compare — Read Only</button><button type="button" id="cfmRevClear">Clear Text</button></div>'+
 '<div id="cfmRevResults" aria-live="polite"></div></div>';
 $('cfmRevClear').addEventListener('click',()=>{$('cfmRevText').value='';$('cfmRevResults').replaceChildren()});
 $('cfmRevFile').addEventListener('change',async ev=>{
  const f=ev.target.files?.[0];if(!f)return;
  if(f.size>1048576)return summary('cfmRevResults','Text file larger than 1 MB. Paste relevant PO text instead.','warn');
  try{$('cfmRevText').value=(await f.text()).slice(0,18000)}
  catch(_){summary('cfmRevResults','Could not read text file. Paste its content instead.','warn')}
 });
 $('cfmRevCompare').addEventListener('click',()=>{
  const order=s.pending.find(x=>n(x.workNo)===n($('cfmRevWork').value));
  const c=C().compare(order,$('cfmRevText').value);
  if(c.error)return summary('cfmRevResults',e(c.error),'warn');
  let html='<div class="cfm-intel-results"><h3>Revision Review · '+e(order.workNo)+'</h3>'+
   note('<b>'+c.changes+'</b> potential change(s); <b>'+c.unchecked+'</b> field(s) not detected. Confirm every highlighted value against the actual PO before updating ERP.',c.changes?'warn':'')+
   '<div class="cfm-intel-table-wrap"><table><thead><tr><th>Field</th><th>Saved Work Order</th><th>Revised PO</th><th>Review</th></tr></thead><tbody>'+
   c.rows.map(r=>'<tr class="cfm-intel-'+e(r.status)+'"><td>'+e(r.label)+'</td><td>'+e(r.old===''?'—':r.old)+'</td><td>'+e(r.fresh)+'</td><td><b>'+e(r.status.toUpperCase())+'</b></td></tr>').join('')+'</tbody></table></div>'+
   '<p class="cfm-intel-quiet">The comparator is heuristic. Quantity in table-only PDFs, ambiguous units, multiple PO line items, and unclear dates need manual review. No change is applied automatically.</p></div>';
  $('cfmRevResults').innerHTML=html;
 });
}
function remnants(s){
 const b=$('cfmIntelBody');
 const choices=s.store.filter(x=>x.srlNo).map(x=>'<option value="'+e(x.srlNo)+'"></option>').join('');
 const qualities=[...new Set(s.store.map(x=>String(x.quality||x.cloth||x.description||'').trim()).filter(Boolean))];
 const qualityOptions=qualities.map(x=>'<option value="'+e(x)+'"></option>').join('');
 b.innerHTML=note('<b>Separate local remnant register.</b> A remnant must be physically measured and checked against the actual SRL width. This DOES NOT increase usable SRL stock, deduct cutting meters or sync to Cloud. Export it for safekeeping.','warn')+
 '<div class="cfm-intel-card"><h3>04 / Physically Verified Leftover Cloth</h3><p>Enter only real, measured offcuts. Units: inches for piece dimensions.</p>'+
 '<div class="cfm-intel-grid">'+
 field('Source Physical SRL',textInput('cfmRemSrl','','Search SRL').replace('id="cfmRemSrl"','id="cfmRemSrl" list="cfmRemRolls"')+'<datalist id="cfmRemRolls">'+choices+'</datalist>')+
 field('Cloth / Quality',textInput('cfmRemCloth','','Exact SRL cloth quality').replace('id="cfmRemCloth"','id="cfmRemCloth" list="cfmRemCloths"')+'<datalist id="cfmRemCloths">'+qualityOptions+'</datalist>')+
 field('Remnant Width (inch)',textInput('cfmRemWidth','','Measured width','number'))+
 field('Remnant Length (inch)',textInput('cfmRemLength','','Measured length','number'))+
 field('Pieces available',textInput('cfmRemQty','1','Quantity','number'))+
 field('Origin Work No (optional)',textInput('cfmRemWork','','CFM-...'))+
 '</div>'+field('Notes (optional)',textInput('cfmRemNotes','','Location / rack / label'))+
 '<label class="cfm-intel-confirm"><input id="cfmRemConfirmed" type="checkbox"> I physically measured the leftover piece(s) and verified the original SRL roll width and cloth quality.</label>'+
 '<div id="cfmRemRollHint"></div><div class="cfm-intel-actions"><button type="button" class="primary" id="cfmRemSave">Add Verified Remnant (Local Only)</button><button type="button" id="cfmRemExport">Export Register JSON</button></div>'+
 '<div id="cfmRemSaveStatus" aria-live="polite"></div></div>'+
 '<div class="cfm-intel-card"><h3>05 / Find Reusable Offcuts</h3><div class="cfm-intel-grid">'+
 field('Required Cloth Quality',textInput('cfmNeedCloth','','Enter exact cloth quality').replace('id="cfmNeedCloth"','id="cfmNeedCloth" list="cfmNeedCloths"')+'<datalist id="cfmNeedCloths">'+qualityOptions+'</datalist>')+
 field('Piece Width (inch)',textInput('cfmNeedWidth','','Required piece width','number'))+
 field('Piece Length (inch)',textInput('cfmNeedLength','','Required piece length','number'))+
 field('Cut Pieces Required',textInput('cfmNeedQty','1','Required Qty','number'))+
 '</div><div class="cfm-intel-actions"><button type="button" class="primary" id="cfmRemMatch">Find Possible Matches</button></div>'+
 '<div id="cfmRemMatchResults" aria-live="polite"></div></div>'+
 '<div class="cfm-intel-card"><h3>Verified Remnant Register (This Device Only)</h3><div id="cfmRemRegister"></div></div>';
 const stockInfo=()=>{
  const sr=n($('cfmRemSrl').value);
  const roll=s.store.find(x=>C().rollNumber(x)===sr);
  if(roll){
   $('cfmRemCloth').value=String(roll.quality||roll.cloth||roll.description||'');
   $('cfmRemRollHint').innerHTML=note('Source SRL: <b>'+e(roll.srlNo)+'</b> · Physical roll width: <b>'+e(roll.width||'unknown')+' in</b>. Enter the actual measured remnant width; do not use cutting L×W as roll width.','');
  }else $('cfmRemRollHint').innerHTML=note('Choose a Physical Store SRL. Unknown SRL cannot be logged.','warn');
 };
 $('cfmRemSrl').addEventListener('change',stockInfo);
 $('cfmRemSrl').addEventListener('blur',stockInfo);
 const renderRegister=()=>{
  const all=C().remRead();
  const reg=$('cfmRemRegister');if(!reg)return;
  if(!all.length){reg.innerHTML=note('No verified remnant entries saved on this device.','');return}
  reg.innerHTML='<p class="cfm-intel-quiet">'+all.length+' measured remnant group(s). None added to ERP Physical Stock.</p>'+
   '<div class="cfm-intel-table-wrap"><table><thead><tr><th>Cloth / SRL</th><th>Piece Size</th><th>Qty</th><th>Recorded</th><th>Action</th></tr></thead><tbody>'+
   all.map(x=>'<tr><td>'+e(x.cloth)+'<small>'+e(x.srlNo)+'</small></td><td>'+e(x.width)+' × '+e(x.length)+' in</td><td>'+e(x.qty)+'</td><td>'+e((x.createdAt||'').slice(0,10))+'</td><td><button class="cfm-intel-small-del" type="button" data-rem-delete="'+e(x.id)+'">Remove</button></td></tr>').join('')+
   '</tbody></table></div>';
  reg.querySelectorAll('[data-rem-delete]').forEach(bt=>bt.addEventListener('click',()=>{
   const entry=C().remRead().find(x=>x.id===bt.dataset.remDelete);
   if(!entry)return;
   if(!confirm('Remove this separate local remnant record? No ERP Stock or Cutting will be changed.'))return;
   try{C().remWrite(C().remRead().filter(x=>x.id!==entry.id));renderRegister();summary('cfmRemSaveStatus','Local remnant record removed. Main ERP data unchanged.','ok')}
   catch(err){summary('cfmRemSaveStatus',e(err.message),'warn')}
  }));
 };
 $('cfmRemSave').addEventListener('click',()=>{
  const result=C().registerRemnant({srlNo:$('cfmRemSrl').value,cloth:$('cfmRemCloth').value,
   width:$('cfmRemWidth').value,length:$('cfmRemLength').value,qty:$('cfmRemQty').value,
   workNo:$('cfmRemWork').value,note:$('cfmRemNotes').value,confirmed:$('cfmRemConfirmed').checked},s);
  if(result.error)return summary('cfmRemSaveStatus',e(result.error),'warn');
  $('cfmRemConfirmed').checked=false;summary('cfmRemSaveStatus','Physically verified piece logged on this device ONLY. Export JSON backup. Main ERP Stock unchanged.','ok');renderRegister();
 });
 $('cfmRemExport').addEventListener('click',()=>{
  const a=C().remRead();
  if(!a.length)return summary('cfmRemSaveStatus','No remnant records to export.','warn');
  const file=new Blob([JSON.stringify({module:'CFM VERIFIED REMNANTS',exportedAt:new Date().toISOString(),localOnly:true,records:a},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(file),link=document.createElement('a');
  link.href=url;link.download='CFM-Remnants-'+new Date().toISOString().slice(0,10)+'.json';
  document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  summary('cfmRemSaveStatus','Remnant backup download requested. Check your Downloads.','ok');
 });
 $('cfmRemMatch').addEventListener('click',()=>{
  const r=C().remSuggest(s,{cloth:$('cfmNeedCloth').value,width:$('cfmNeedWidth').value,
    length:$('cfmNeedLength').value,qty:$('cfmNeedQty').value});
  if(r.error)return summary('cfmRemMatchResults',e(r.error),'warn');
  if(!r.length)return summary('cfmRemMatchResults','No exact cloth-quality remnant can fit the requested rectangle. Check physical pieces; no ERP stock was adjusted.','warn');
  const html='<div class="cfm-intel-results"><h4>'+r.length+' potential remnant group(s)</h4>'+
   '<div class="cfm-intel-table-wrap"><table><thead><tr><th>Source SRL</th><th>Piece Size</th><th>Available Pieces</th><th>Theoretical Cuts</th><th>Fit</th></tr></thead><tbody>'+
   r.map(x=>'<tr><td>'+e(x.srlNo)+'</td><td>'+e(x.width)+' × '+e(x.length)+' in</td><td>'+e(x.qty)+'</td><td>'+e(x.total)+' ('+e(x.layout)+')</td><td>'+e(x.canCover?'May cover request':'Partial')+'</td></tr>').join('')+
   '</tbody></table></div>'+
   note('Rectangle-only rough layout with 0 seam/cutting allowance; does not reserve pieces or confirm fit on your machine. Check orientation, defects and stitching allowance physically.','warn')+'</div>';
  $('cfmRemMatchResults').innerHTML=html;
 });
 renderRegister();
}
window.cfmOpenIntelligence=function(which){
 if(!C()){alert('CFM Intelligence tools are loading. Open ERP Dashboard and try again.');return}
 const dlg=createDialog();
 show(which||'simulation');
 if(!dlg.open)dlg.showModal();
 openCount++;
};
function init(){
 buildLauncher();
 if(!$('cfmIntelLauncher')){
  const dash=$('view-dashboard');
  if(dash){
   const observer=new MutationObserver(()=>{if($('cfmSapWorkspace')){buildLauncher();if($('cfmIntelLauncher'))observer.disconnect()}});
   observer.observe(dash,{childList:true});
  }
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
