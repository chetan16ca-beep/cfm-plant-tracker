/* CFM SOP Register V320 | 2026-11-16
 * Additive checklists only. NO stock/cutting/order/dispatch mutations.
 * Records ride in the existing state + cloud payload and save() pipeline.
 * Historical records are never silently marked PASS or overwritten.
 */
(function(){
'use strict';
const CATALOG=[
['MR','Material Receiving / QC',['MR-01|PO / Challan / Supplier & roll count verified','MR-02|Receipt area segregated and supplier label captured','MR-03|Sample cut; holes, stains, damage and contamination checked','MR-04|Cloth code, weave, GSM, antistatic and actual width checked to specification','MR-05|Measured actual meter entered; no assumed physical stock','MR-06|QC disposition, defect, remarks and checker recorded']],
['SRL','Roll SRL / Tag / Store',['SRL-01|Unique full SRL assigned after QC','SRL-02|Tag has SRL, cloth, width, actual meter, date and location','SRL-03|Secure tag attached to physical roll/bundle','SRL-04|Excel inward master line created','SRL-05|ERP Store matches Excel/physical roll measurements','SRL-06|HOLD/REJECT physically separated from ready stock']],
['MCL','Machine Cleaning',['MCL-01|Machine stopped','MCL-02|Approved safe shutdown/isolation followed','MCL-03|Lint/thread/dust and scrap removed safely','MCL-04|Contact surfaces and guards inspected','MCL-05|Tools removed and supervisor checked']],
['PCL','Plant / Floor Cleaning',['PCL-01|Floor, worktables and walkways cleaned','PCL-02|Waste segregated and passages clear','PCL-03|Spills/leaks/contamination addressed or held','PCL-04|Cleaning materials put away; shift approved']],
['ECL','Electrical Machine Cleaning (authorized only)',['ECL-01|Authorized electrician assigned','ECL-02|LOTO/isolation and zero-energy check confirmed','ECL-03|No water or unauthorized compressed air on electrical parts','ECL-04|Approved dry cleaning and cable/guard inspection done','ECL-05|Safe restoration and electrician sign-off']],
['RCL','Packing Room Cleaning',['RCL-01|Previous job labels and materials cleared','RCL-02|Packing surfaces/area cleaned','RCL-03|Bags, boxes and packaging clean and dry','RCL-04|Area released for the intended product']],
['CUT','Cutting',['CUT-01|Work No, product, quantity and measurements verified','CUT-02|Full Store SRL, actual roll width and cloth code verified','CUT-03|L x W, layers, pieces and planned usage checked','CUT-04|Machine/area cleaning release checked','CUT-05|Pieces counted; wastage W and defects documented','CUT-06|Actual SRL/meter use, cutting by and date recorded','CUT-07|Missing/ambiguous meter or mismatch placed on HOLD']],
['STI','Stitching',['STI-01|Incoming cut pieces, sizes and SRL linked','STI-02|Thread, needle, seam type and pattern verified','STI-03|Stitch alignment and open seams inspected','STI-04|Done/rework/reject quantity recorded','STI-05|Accepted pieces handed to Thread Cutting']],
['THR','Thread Cutting',['THR-01|Work and incoming pieces verified','THR-02|Excess thread trimmed without fabric damage','THR-03|Seams and cuts inspected','THR-04|Accepted/rework/reject counts recorded']],
['GUN','Gun Finishing',['GUN-01|Incoming Work No and pieces counted','GUN-02|Approved tool/finishing method checked','GUN-03|Fibre/thread/dust removed without damage','GUN-04|Finish and accepted/rework quantity recorded']],
['FQC','Final QC',['FQC-01|Size, micron/mesh, layers, antistatic spec verified','FQC-02|Joint, seam, hole, contamination and workmanship checked','FQC-03|Accepted/HOLD/reject quantities separated','FQC-04|Nonconformance and QC person recorded','FQC-05|Only released quantity handed to Packing']],
['PKG','Packing & Labeling',['PKG-01|Packing room cleaning release verified','PKG-02|Work, party, accepted qty and product matched','PKG-03|Clean suitable protective packing used','PKG-04|Work, product, pack no, qty, date, traceability label checked','PKG-05|Packed qty and supervisor handover recorded']],
['DSP','Dispatch',['DSP-01|Packing vs dispatch qty reconciled','DSP-02|Challan/invoice, transporter, address verified','DSP-03|Dispatch details and approval recorded','DSP-04|Dispatched job retained in history, not active pending']],
['RPT','Batch Report / SOP Review',['RPT-01|Work, party, product, qty and SRL linked','RPT-02|Material and production SOP IDs attached; separate area-cleaning logs reviewed','RPT-03|Results, operator, verifier and timestamp displayed','RPT-04|Missing checks marked NOT RECORDED, never PASS','RPT-05|Product ticket and Batch Annexure can print','RPT-06|Checklist record/version traceable']]
].map(([code,name,items])=>({code,name,items:items.map(s=>{const i=s.indexOf('|');return {id:s.slice(0,i),text:s.slice(i+1)}})}));
const $=id=>document.getElementById(id);
const norm=s=>String(s==null?'':s).trim().toUpperCase();
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const arr=s=>Array.isArray(s)?s:[];
const getState=()=>{try{return typeof state!=='undefined'?state:null}catch(_){return null}};
const isClean=code=>['MCL','PCL','ECL','RCL'].includes(code);
const isMaterial=code=>['MR','SRL'].includes(code);
// Each form shows only its own required traceability fields.
// Cleaning records are independent of Work Orders and cloth inward/stock.
const FIELDS_BY_SOP={
 MR:['srl','inward'], SRL:['srl'],
 MCL:['area','shift'], PCL:['area','shift'], ECL:['area','shift'], RCL:['area','shift'],
 CUT:['work','srl','shift'], STI:['work','srl','shift'],
 THR:['work','shift'], GUN:['work','shift'], FQC:['work','shift'],
 PKG:['work','shift'], DSP:['work','shift'], RPT:['work','shift']
};
const FIELD_CONTROLS={
 work:'cfmSopWork318', srl:'cfmSopSrl318', inward:'cfmSopInward318',
 area:'cfmSopArea318', shift:'cfmSopShift318'
};
const usesField=(code,key)=>(FIELDS_BY_SOP[code]||[]).includes(key);
const KEY='cfm-sop-register-fallback-v318';
const schemaId='CFM-SOP-v1';
function safeRead(){try{return arr(JSON.parse(localStorage.getItem(KEY)||'[]'))}catch(_){return []}}
function backup(a){try{localStorage.setItem(KEY,JSON.stringify(a.slice(-2500)))}catch(_){}}
function records(){
 const st=getState();if(!st)return [];
 const byId=new Map();
 for(const r of [...arr(st.sopRecords),...safeRead()]){
  if(!r||!r.id)continue;const old=byId.get(r.id);
  if(!old||String(r.timestamp||'')>=String(old.timestamp||''))byId.set(r.id,r);
 }
 return [...byId.values()].sort((a,b)=>String(a.timestamp||'').localeCompare(String(b.timestamp||'')));
}
function ensure(){
 const st=getState();if(!st)return false;
 const list=records();
 if(JSON.stringify(arr(st.sopRecords))!==JSON.stringify(list)){
   st.sopRecords=list;
   backup(list);
   // Recovery from old-device cloud payload; do not call save automatically
   // on startup without the operator initiating a write.
 }return true;
}
function latest(code,workNo,srl){
 const matches=records().filter(r=>norm(r.code)===norm(code)).filter(r=>{
  if(isMaterial(code))return srl&&norm(r.srlNo)===norm(srl);
  return workNo&&norm(r.workNo)===norm(workNo);
 });
 return matches[matches.length-1]||null;
}
function srlsFor(work){
 const st=getState(), all=new Set();
 arr(st?.cutting).filter(x=>norm(x.workNo)===norm(work)&&!x.wastage)
   .forEach(x=>{const v=String(x.srlNo||'').trim();if(v&&norm(v)!=='W')all.add(v)});
 const wo=arr(st?.pending).find(x=>norm(x.workNo)===norm(work));
 for(const k of ['srlNo','clothSrl','clothSrlNo'])if(wo?.[k])all.add(String(wo[k]).trim());
 return [...all];
}
function recordFor(code,work){
 if(isMaterial(code)){
   const a=srlsFor(work).map(srl=>latest(code,work,srl)).filter(Boolean);
   return a;
 }
 const r=latest(code,work,'');return r?[r]:[];
}
function aggregate(r,cat){
 if(!r)return 'NOT RECORDED';
 const stats=cat.items.map(it=>r.results?.[it.id]||'NOT RECORDED');
 if(stats.some(x=>x==='FAIL'))return 'FAIL';
 if(stats.some(x=>x==='HOLD'))return 'HOLD';
 if(stats.some(x=>x==='NOT RECORDED'))return 'NOT RECORDED';
 return 'PASS / N/A';
}
function annex(work,compact=false){
 const allSrl=srlsFor(work), st=getState();
 const wo=arr(st?.pending).find(x=>norm(x.workNo)===norm(work));
 const lineStyle='border:1px solid #b9cbd9;padding:5px 6px;font:10px Arial,sans-serif;vertical-align:top';
 const cands=CATALOG.filter(cat=>!isClean(cat.code)).map(cat=>({cat,entries:recordFor(cat.code,work)}));
 let html='<section class="cfm-sop-print" style="page-break-before:always;color:#173548;font:11px Arial,sans-serif"><h2 style="font-size:17px;margin:0 0 7px">CFM SOP Checklist Annexure</h2>'+
 '<p style="font-size:10px">Work: <b>'+esc(work)+'</b> | Party: '+esc(wo?.party||'-')+' | Product: '+esc(wo?.description||'-')+' | Qty: '+esc(wo?.orderQty||'-')+
 ' | SRL: '+esc(allSrl.join(', ')||'NOT RECORDED')+'</p>'+
 '<p style="font-size:10px">Saved checklists only. Production Done Qty is NOT proof of checklist PASS. Missing results are NOT RECORDED. Work-related checks linked by Work No or Cutting SRL; area cleaning is logged separately.</p>';
 html+='<table style="border-collapse:collapse;width:100%"><thead><tr><th style="'+lineStyle+'">SOP / Code</th><th style="'+lineStyle+'">Result</th><th style="'+lineStyle+'">Operator / Supervisor</th><th style="'+lineStyle+'">Saved At</th></tr></thead><tbody>';
 for(const {cat,entries} of cands){
  let result=entries.length?entries.map(r=>aggregate(r,cat)).join('; '):'NOT RECORDED';
  html+='<tr><td style="'+lineStyle+'">'+esc(cat.code+' – '+cat.name)+'</td><td style="'+lineStyle+'">'+esc(result)+'</td><td style="'+lineStyle+'">'+esc(entries.map(r=>[r.operator,r.supervisor].filter(Boolean).join(' / ')).join('; ')||'-')+'</td><td style="'+lineStyle+'">'+esc(entries.map(r=>r.timestamp||'').join('; ')||'-')+'</td></tr>';
 }
 html+='</tbody></table>';
 if(compact)return html+'</section>';
 for(const {cat,entries} of cands){
  html+='<h3 style="font-size:12px;margin:13px 0 4px">'+esc(cat.code+' • '+cat.name)+'</h3>';
  if(!entries.length){html+='<p style="margin:3px 0;font-size:10px;color:#a13a31">NOT RECORDED: '+esc(cat.items.map(it=>it.id).join(', '))+'</p>';continue}
  for(const rec of entries){
   html+='<p style="font-size:10px;margin:4px 0">SRL: '+esc(rec.srlNo||'-')+' | Ref: '+esc(rec.inwardNo||rec.area||'-')+' | Shift: '+esc(rec.shift||'-')+' | '+esc(rec.timestamp||'-')+'</p>';
   html+='<table style="border-collapse:collapse;width:100%"><tbody>';
   for(const it of cat.items)html+='<tr><td style="'+lineStyle+';width:52px">'+esc(it.id)+'</td><td style="'+lineStyle+'">'+esc(it.text)+'</td><td style="'+lineStyle+';width:86px">'+esc(rec.results?.[it.id]||'NOT RECORDED')+'</td></tr>';
   html+='</tbody></table>';
   if(rec.remark)html+='<p style="font-size:10px">Remark: '+esc(rec.remark)+'</p>';
  }
 }
 return html+'<p style="margin-top:12px">Checklist record status is based on signed manual entries, not automatic assumption.</p></section>';
}
function printDoc(work,full){
 if(!/^CFM-\d+$/i.test(work)){alert('Select correct CFM Work No.');return}
 const st=getState(), wo=arr(st?.pending).find(x=>norm(x.workNo)===norm(work));
 if(!wo){alert('Work Order not found. Refresh cloud safely.');return}
 let html='<div style="font:13px Arial"><h2>CFM Product-wise SOP Ticket</h2><b>Work No:</b> '+esc(work)+
 ' &nbsp; <b>Party:</b> '+esc(wo.party||'-')+'<p><b>Product:</b> '+esc(wo.description||'-')+
 ' | <b>Order Qty:</b> '+esc(wo.orderQty||'-')+' | <b>SRL:</b> '+esc(srlsFor(work).join(', ')||'NOT RECORDED')+'</p></div>';
 html+=annex(work,!full);
 if(typeof window.openPrintWindow==='function')window.openPrintWindow('SOP Product Ticket '+work,html,false);
 else alert('Printer engine not ready');
}
function wrapPrint(){
 const old=window.openPrintWindow;
 if(typeof old!=='function'||old.__cfmSopV318)return;
 function wrapped(title,body,landscape){
   const isBatch=/Batch Report/i.test(String(title||'')) && !/SOP/i.test(String(title||''));
   const work=(String(title||'').match(/CFM-\d+/i)||[])[0];
   return old.call(this,title,isBatch&&work?String(body||'')+annex(work,false):body,landscape);
 }
 wrapped.__cfmSopV318=true;window.openPrintWindow=wrapped;
}
function openPanel(preset){
 if(!ensure()){alert('ERP not ready');return}
 $('cfmSopModalV318')?.remove();
 const overlay=document.createElement('div');overlay.id='cfmSopModalV318';
 overlay.style.cssText='position:fixed;inset:0;z-index:2147483600;background:#082338b3;padding:9px;display:flex;align-items:center;justify-content:center';
 const panel=document.createElement('div');panel.style.cssText='width:min(800px,100%);max-height:96vh;overflow:auto;background:#fff;color:#17334b;border-radius:15px;padding:16px;box-sizing:border-box;font:13px/1.5 system-ui;box-shadow:0 12px 40px #0006';
 const options=CATALOG.map(c=>'<option value="'+esc(c.code)+'">'+esc(c.code+' – '+c.name)+'</option>').join('');
 panel.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0;font-size:19px">CFM • SOP Register</h2><button id="cfmSopClose318" type="button" style="font-size:20px;border:0;background:#eef5fb;border-radius:8px;padding:5px 12px">×</button></div>'+
 '<p style="margin:5px 0;color:#567">Numbered operator checklist • Cloud save via existing ERP. No automatic stock or cutting edit.</p>'+
 '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(185px,1fr));gap:9px">'+
 '<label>SOP<select id="cfmSopCode318" style="width:100%;padding:8px">'+options+'</select></label>'+
 '<label>Work No.<input id="cfmSopWork318" placeholder="CFM-753" style="width:100%;padding:8px;box-sizing:border-box"></label>'+
 '<label>Full SRL<input id="cfmSopSrl318" placeholder="EFPPL03/0234" style="width:100%;padding:8px;box-sizing:border-box"></label>'+
 '<label>Inward No.<input id="cfmSopInward318" placeholder="INW-..." style="width:100%;padding:8px;box-sizing:border-box"></label>'+
 '<label>Machine / Area<input id="cfmSopArea318" placeholder="Cutting 1 / Packing Room" style="width:100%;padding:8px;box-sizing:border-box"></label>'+
 '<label>Shift<select id="cfmSopShift318" style="width:100%;padding:8px"><option>Day</option><option>Night</option><option>General</option></select></label>'+
 '<label>Operator *<input id="cfmSopOperator318" style="width:100%;padding:8px;box-sizing:border-box"></label>'+
 '<label>Supervisor *<input id="cfmSopSupervisor318" style="width:100%;padding:8px;box-sizing:border-box"></label></div>'+
 '<div id="cfmSopChecks318" style="margin:12px 0"></div>'+
 '<label>Remark / deviation<input id="cfmSopRemark318" style="display:block;width:100%;padding:8px;box-sizing:border-box"></label>'+
 '<label style="display:flex;gap:8px;margin:10px 0;font-weight:bold"><input id="cfmSopApproved318" type="checkbox"> Actual work checked; results entered truthfully</label>'+
 '<div id="cfmSopMsg318" role="status" style="min-height:22px;color:#9a3328;font-weight:700"></div>'+
 '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">'+
 '<button type="button" id="cfmSopSave318" style="padding:11px 14px;border:0;background:#087f6d;color:#fff;font-weight:700;border-radius:9px">Save Checklist</button>'+
 '<button type="button" id="cfmSopTicket318" style="padding:11px 14px;border:0;background:#1472bb;color:#fff;font-weight:700;border-radius:9px">Print Product Ticket + SOP</button>'+
 '<button type="button" id="cfmSopAnnex318" style="padding:11px 14px;border:1px solid #ccd6df;background:#fff;border-radius:9px">Print Full Annexure</button></div>';
 overlay.append(panel);document.body.append(overlay);
 const field=id=>$(id)?.value?.trim()||'';
 const setMsg=s=>{$('cfmSopMsg318').textContent=s};
 const render=()=>{
  const cat=CATALOG.find(x=>x.code===field('cfmSopCode318'));if(!cat)return;
  for(const [key,id] of Object.entries(FIELD_CONTROLS)){
   const control=$(id),label=control?.closest('label'),visible=usesField(cat.code,key);
   if(label)label.style.display=visible?'':'none';
   if(control)control.disabled=!visible;
  }
  const area=$('cfmSopArea318'),areaLabel=area?.closest('label');
  if(areaLabel){
   const areaTitle={MCL:'Machine *',PCL:'Plant / Floor Area *',ECL:'Electrical Machine / Panel *',RCL:'Packing Room / Area *'}[cat.code]||'Machine / Area *';
   if(areaLabel.firstChild?.nodeType===3)areaLabel.firstChild.nodeValue=areaTitle;
   if(area)area.placeholder={MCL:'Stitching Machine 01',PCL:'Plant Floor / Walkway',ECL:'Electrical Machine / Panel 01',RCL:'Packing Room'}[cat.code]||'Machine / Area';
  }
  // Product ticket and batch annexure need a Work Order: hide for area / receipt logs.
  const hasWork=usesField(cat.code,'work');
  for(const id of ['cfmSopTicket318','cfmSopAnnex318']){
   const button=$(id);if(button)button.style.display=hasWork?'':'none';
  }
  $('cfmSopChecks318').innerHTML='<b>'+esc(cat.name)+' • '+cat.items.length+' numbered checks</b>'+
   cat.items.map((item,i)=>'<div style="display:grid;grid-template-columns:1fr 118px;gap:7px;padding:7px 0;border-bottom:1px solid #e0edf5"><label>'+esc(item.id+' • '+item.text)+'</label>'+
   '<select data-sop-id="'+esc(item.id)+'" style="padding:5px"><option value="">NOT RECORDED</option><option>PASS</option><option>HOLD</option><option>FAIL</option><option>N/A</option></select></div>').join('');
  setMsg('');
 };
 $('cfmSopWork318').value=preset||'';
 if(preset&&srlsFor(preset).length===1)$('cfmSopSrl318').value=srlsFor(preset)[0];
 $('cfmSopCode318').addEventListener('change',render);render();
 $('cfmSopClose318').addEventListener('click',()=>overlay.remove());
 overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});
 $('cfmSopSave318').addEventListener('click',()=>{
  const cat=CATALOG.find(x=>x.code===field('cfmSopCode318'));if(!cat)return;
  // Never persist hidden references (e.g. preset Work No from a pending card)
  // into a cleaning checklist. Historical saved checklists are left untouched.
  const workNo=usesField(cat.code,'work')?field('cfmSopWork318'):'',
    srlNo=usesField(cat.code,'srl')?field('cfmSopSrl318'):'',
    inwardNo=usesField(cat.code,'inward')?field('cfmSopInward318'):'',
    area=usesField(cat.code,'area')?field('cfmSopArea318'):'',
    shift=usesField(cat.code,'shift')?field('cfmSopShift318'):'',
    operator=field('cfmSopOperator318'),supervisor=field('cfmSopSupervisor318'),
    remark=field('cfmSopRemark318');
  const st=getState();
  if(!st||typeof save!=='function'){setMsg('ERP Save not ready');return}
  if(!operator||!supervisor||!$('cfmSopApproved318').checked){setMsg('Operator, supervisor and verification tick are mandatory.');return}
  if(isMaterial(cat.code)&&!srlNo&&!(cat.code==='MR'&&inwardNo)){setMsg('Full SRL required (or Inward No for receipt before SRL allotment).');return}
  if(isClean(cat.code)&&!area){setMsg('Machine / Area is required for cleaning log.');return}
  if(!isMaterial(cat.code)&&!isClean(cat.code)&&(!/^CFM-\d+$/i.test(workNo)||!arr(st.pending).some(r=>norm(r.workNo)===norm(workNo)))){setMsg('Select an existing Work No. for production checklist.');return}
  const results={};let hasBad=false;
  panel.querySelectorAll('[data-sop-id]').forEach(x=>{results[x.dataset.sopId]=x.value;if(['HOLD','FAIL'].includes(x.value))hasBad=true});
  if(Object.values(results).some(v=>!v)){setMsg('Complete every numbered item with PASS, HOLD, FAIL or N/A.');return}
  if(hasBad&&!remark){setMsg('HOLD or FAIL needs a reason / corrective action in Remark.');return}
  const rec={id:'SOP-'+Date.now()+'-'+Math.random().toString(36).slice(2,9),schema:schemaId,code:cat.code,workNo,srlNo,inwardNo,area,shift,operator,supervisor,results,remark,timestamp:new Date().toISOString(),device:typeof deviceLabel==='function'?deviceLabel():'ERP'};
  const before=arr(st.sopRecords).slice();
  st.sopRecords=records().concat(rec);backup(st.sopRecords);
  try{
   save(false);
   setMsg('Checklist saved locally. Confirm Cloud Sync before relying on the record.');
   render();
  }
  catch(e){st.sopRecords=before;backup(before);setMsg('Save failed: '+String(e.message||e))}
 });
 $('cfmSopTicket318').addEventListener('click',()=>printDoc(field('cfmSopWork318'),false));
 $('cfmSopAnnex318').addEventListener('click',()=>{
   const w=field('cfmSopWork318');if(!/^CFM-\d+$/i.test(w))return setMsg('Work No required to print annexure');
   if(typeof window.openPrintWindow==='function')window.openPrintWindow('SOP Full Annexure '+w,annex(w,false),false);
 });
}
function mount(){
 try{wrapPrint();ensure();}catch(e){console.warn('CFM SOP mount:',e)}
 const dashboard=$('view-dashboard');if(dashboard&&!$('cfmSopOpen318')){
  const b=document.createElement('button');b.id='cfmSopOpen318';b.type='button';b.textContent='☑ SOP / Cleaning / Material Checklist';b.style.cssText='display:block;margin:10px 0;padding:12px 15px;border:1px solid #8dcce5;border-radius:11px;background:#f0f9ff;color:#145376;font:700 13px system-ui;cursor:pointer';
  b.addEventListener('click',()=>openPanel(''));dashboard.insertBefore(b,dashboard.firstChild);
 }
 document.querySelectorAll('#pendingList .data-card').forEach(card=>{
  if(card.querySelector('[data-cfm-sop]'))return;
  const work=(card.querySelector('.work')?.textContent||'').trim();
  if(!/^CFM-\d+$/i.test(work))return;
  const b=document.createElement('button');b.type='button';b.dataset.cfmSop='1';
  b.className='btn btn-sm';b.textContent='☑ SOP';
  b.addEventListener('click',()=>openPanel(work));
  (card.querySelector('.card-actions')||card).appendChild(b);
 });
}
let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;setTimeout(()=>{queued=false;mount()},350)}).observe(document.documentElement,{childList:true,subtree:true});
setTimeout(mount,500);setTimeout(mount,1600);
window.cfmSopOpen=work=>openPanel(work||'');
window.cfmSopPrintAnnexure=work=>printDoc(work,true);
})();
