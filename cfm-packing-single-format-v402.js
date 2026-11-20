/* CFM Packing Slip Single Approved Format V402.
 * Keeps legacy packing history intact; removes duplicate legacy entry/actions.
 * Legacy reprints route through V401 A4 landscape preview, not old multi-page
 * customer-copy/office-copy/labels print. Does not write ERP/Cloud/localStorage.
 */
(function(){
'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=x=>String(x??'').trim();
const safeNum=x=>Number.isFinite(Number(x))?Number(x):0;
const historyKey='cfm_packing_v167';
function history(){
 try{const r=JSON.parse(localStorage.getItem(historyKey)||'[]');return Array.isArray(r)?r:[]}catch(e){return[]}
}
function legacyToSlip(r){
 const jobs=Array.isArray(r.jobs)?r.jobs:[];
 const workNos=jobs.map(j=>text(j.workNo)).filter(Boolean);
 const total=jobs.reduce((sum,x)=>sum+Math.max(0,safeNum(x.qty)),0);
 return {
  legacy:true,draft:false,
  slipNo:text(r.slipNo),createdAt:text(r.date||r.createdAt),date:text(r.date||r.createdAt),
  workNo:workNos.join(', ')||'—',party:text(r.party),poNo:text(r.po||r.poNo),
  notes:text(r.remark),packedBy:text(r.packedBy),packages:r.packages,
  thisDispatched:total,
  orderQty:'',previousDispatched:'',totalDispatched:'',balanceAfter:'',
  items:jobs.map(x=>({
   workNo:text(x.workNo),description:text(x.description),description2:'',
   customerItemNo:'',efpplCode:'',size:'',micron:'',qty:Math.max(0,safeNum(x.qty))
  }))
 };
}
function previewLegacy(id){
 const rec=history().find(x=>text(x.slipNo)===text(id));
 if(!rec){alert('Old packing record not found on this device.');return}
 if(!window.CFM_PACKING_PREVIEW_V401?.open){
  alert('New A4 packing preview is still loading. Please reopen ERP once.');return
 }
 // Historical local record: use one combined print preview. Missing bundle-wise
 // quantities are flagged as unverified instead of invented.
 const snapshot=legacyToSlip(rec);
 snapshot.bundleCount=Number(rec.packages)||1;
 if(window.CFM_PACK_COMBINED_V407?.open){
  window.CFM_PACK_COMBINED_V407.open(snapshot);return;
 }
 window.CFM_PACKING_PREVIEW_V401.open(snapshot);
}
function installPrintBridge(){
 if(window.cfmPackingPrint?._singleA4V402)return;
 // Preserve original function for compatibility, but prevent duplicate printed
 // customer/office copies and separate package labels from this print action.
 const bridge=function(no){previewLegacy(no)};
 bridge._singleA4V402=true;
 window.cfmPackingPrint=bridge;
}
function ensureHistoryDialog(){
 if(document.getElementById('cfmOldPackingHistoryV402'))return;
 const dialog=document.createElement('dialog');dialog.id='cfmOldPackingHistoryV402';
 dialog.innerHTML='<div class="cfm402-history-head"><strong>OLDER LOCAL Packing Slip History — This Device Only</strong><button type="button" id="cfm402HistoryClose">✕</button></div>'+
 '<p>Old slips are stored on this device. Reprint or delete one selected dummy/test slip at a time; deleted slips are backed up first. This does not modify Cloud Packing Slips, Stock or Work Orders.</p>'+
 '<div id="cfm402HistoryRows"></div>';
 document.body.appendChild(dialog);
 dialog.querySelector('#cfm402HistoryClose').onclick=()=>dialog.close();
 dialog.querySelector('#cfm402HistoryRows').addEventListener('click',e=>{
  const b=e.target.closest('button[data-old-slip]');if(!b)return;
  if(b.dataset.action==='delete')deleteLegacy(b.dataset.oldSlip);
  else previewLegacy(b.dataset.oldSlip);
 });
}
function deleteLegacy(id){
 const records=history(),matches=records.filter(x=>text(x.slipNo)===text(id));
 if(matches.length!==1){alert('Slip missing or duplicate number. No deletion made.');return}
 const found=matches[0];
 if(!confirm('Delete ONLY old dummy/test Packing Slip '+text(found.slipNo)+'?\nThis is a local-device record and cannot be restored automatically.'))return;
 if(!confirm('Final confirmation: remove '+text(found.slipNo)+' from the local Packing Slip History?'))return;
 // Preserve an export of all old records before changing localStorage.
 try{
  const backup=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),source:'CFM old local packing slips',packingSlips:records},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(backup),a=document.createElement('a');
  a.href=url;a.download='CFM-Old-Packing-Slips-Backup-'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  const next=records.filter(x=>text(x.slipNo)!==text(id));
  if(next.length!==records.length-1)throw Error('Unexpected slip count; no changes made');
  localStorage.setItem(historyKey,JSON.stringify(next));
  if(history().length!==next.length)throw Error('Local storage write could not be confirmed');
  showHistory();
 }catch(e){alert('Local slip delete could not be verified: '+String(e.message||e))}
}
function showHistory(){
 ensureHistoryDialog();const dlg=document.getElementById('cfmOldPackingHistoryV402');
 const rows=history();const list=dlg.querySelector('#cfm402HistoryRows');
 list.innerHTML=rows.length?rows.map(r=>
  '<article class="cfm402-row"><div><b>LOCAL · '+esc(r.slipNo||'—')+'</b><small>'+esc(r.party||'')+' · '+esc(r.date||'')+' · '+
  (Array.isArray(r.jobs)?r.jobs.length:0)+' Work Order(s)</small></div>'+
  '<div class="cfm402-row-actions"><button type="button" data-old-slip="'+esc(r.slipNo||'')+'" data-action="reprint">A4 Reprint</button>'+
  '<button type="button" class="cfm402-delete" data-old-slip="'+esc(r.slipNo||'')+'" data-action="delete">🗑 Delete</button></div></article>').join(''):
  '<p>No previous local packing records found on this device.</p>';
 if(typeof dlg.showModal==='function'){if(!dlg.open)dlg.showModal()}else dlg.setAttribute('open','');
}
function mount(){
 const root=document.getElementById('view-dashboard');
 const old=document.getElementById('v167Pack');
 if(old){
  // This legacy container also hosts the NEW Packing Slip button (#packSlipTop).
  // Hide only its original create action and redundant text, never the container.
  for(const child of [...old.children]){
   if(child.id==='packSlipTop'||child.contains?.(document.getElementById('packSlipTop')))continue;
   if(child.matches?.('button')&&(/cfmPackingOpen|Create Packing/.test(child.getAttribute('onclick')||'')||/Create Packing/i.test(child.textContent)))child.style.display='none';
   if(child.matches?.('small')&&/Multiple Job Cards|2 slip copies/i.test(child.textContent||''))child.style.display='none';
  }
  const label=[...old.children].find(c=>c.matches?.('b')&&/Packing Slip/i.test(c.textContent||''));
  if(label)label.textContent='📦 Packing Slip · One A4 Landscape Format';
 }
 // Per-row Delete replaces the two older prompt/bulk-delete buttons.
 for(const id of ['packSlipDeleteOne','packSlipDeleteAll']){
  const b=document.getElementById(id);if(b){b.style.setProperty('display','none','important');b.setAttribute('aria-hidden','true')}
 }
 const dup=document.getElementById('packSlipPrint');
 if(dup){dup.style.setProperty('display','none','important');dup.setAttribute('aria-hidden','true')}
 const a4=document.getElementById('packSlipA4');
 if(a4)a4.textContent='🖨 A4 Landscape Reprint / PDF';
 const draft=document.getElementById('packSlipPreview');
 if(draft)draft.textContent='👁 A4 Landscape Preview (No Save)';
 const newButton=document.getElementById('packSlipOpen');
 if(newButton)newButton.textContent='📦 Packing Slip · A4 Landscape';
 const footer=document.querySelector('#packSlipDialog .pfoot');
 if(footer&&!document.getElementById('cfm402OldHistoryButton')){
  const btn=document.createElement('button');btn.type='button';btn.id='cfm402OldHistoryButton';
  btn.textContent='📚 Older Slip History';btn.onclick=showHistory;
  btn.title='View old local packing slips; does not alter or save dispatch';
  footer.insertBefore(btn,footer.firstChild);
 }
 installPrintBridge();
 window.cfmPackingHistory=showHistory;
}
function init(){
 if(document.getElementById('cfm402Style'))return;
 const style=document.createElement('style');style.id='cfm402Style';
 style.textContent='#v167Pack>button[onclick*="cfmPackingOpen"]{display:none!important}'+
 '#v167Pack>small{display:none!important}'+
 '#packSlipPrint{display:none!important}'+
 '#packSlipDeleteOne,#packSlipDeleteAll{display:none!important}'+
 '#cfmOldPackingHistoryV402{width:min(750px,96vw);max-height:90vh;overflow:auto;border:1px solid #c6d9e8;border-radius:12px;padding:0;background:white;color:#143b57}'+
 '#cfmOldPackingHistoryV402::backdrop{background:#0b263d99}'+
 '#cfmOldPackingHistoryV402 .cfm402-history-head{background:#0b3d6c;color:#fff;padding:12px;display:flex;align-items:center;justify-content:space-between;gap:10px;font:800 15px Arial}'+
 '#cfmOldPackingHistoryV402 .cfm402-history-head button{background:#fff;color:#103957;border:0;border-radius:7px;padding:6px 12px;cursor:pointer}'+
 '#cfmOldPackingHistoryV402>p{font:500 12px/1.5 Arial;padding:12px;margin:0}'+
 '#cfm402HistoryRows{padding:0 12px 14px}'+
 '#cfm402HistoryRows .cfm402-row{display:flex;align-items:center;justify-content:space-between;gap:8px;border-top:1px solid #dce8ef;padding:10px 2px}'+
 '#cfm402HistoryRows .cfm402-row b{display:block;font:800 13px Arial}'+
 '#cfm402HistoryRows .cfm402-row small{display:block;font:500 11px/1.5 Arial;color:#58738c}'+
 '#cfm402HistoryRows .cfm402-row button{background:#1467a6;color:#fff;border:0;border-radius:8px;padding:8px 10px;font:750 11px Arial;cursor:pointer}'+
 '#cfm402HistoryRows .cfm402-row-actions{display:flex;gap:6px;align-items:center;flex-wrap:wrap}'+
 '#cfm402HistoryRows .cfm402-row button.cfm402-delete{background:#fff0f1;color:#a52732;border:1px solid #e7acb4}';
 document.head.appendChild(style);
 mount();
 // Existing legacy module asynchronously recreates the old card. Re-apply
 // presentation only with a lightweight interval, no mutation observers.
 let attempts=0;const timer=setInterval(()=>{mount();if(++attempts>120)clearInterval(timer)},1000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();