/* CFM V355 — Packing Slip / Dispatch Quantity Ledger.
 * Opt-in manual shipment confirmation. Never assumes dispatched status equals quantity.
 * Uses the existing CFM versioned Cloud save. Does not change stock, cutting, or status.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id),up=x=>String(x||'').trim().toUpperCase();
const qty=x=>Number(x), fmt=x=>String(Number(x)),esc=x=>String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let remote=null,selected=null,verifiedSlip=null,busy=false;
function say(s,err=false){const el=$('packSlipMsg');if(el){el.textContent=s;el.style.color=err?'#a12626':'#24567a'}}
function slips(){return Array.isArray(remote?.payload?.packingSlips)?remote.payload.packingSlips:[]}
function forWork(wo){return slips().filter(x=>up(x.workNo)===up(wo))}
function shipped(rows){return rows.reduce((a,x)=>a+(Number(x.thisDispatched)||0)+(Number(x.manualPreviousBaseline)||0),0)}
function current(){
 const no=$('packSlipWO')?.value;
 return remote?.payload?.pending?.find(x=>String(x.workNo||'')===no)||null;
}
function legacy(row){return !!row&&(
 up(row.status)==='DISPATCHED'||!!row.dispatchDoneAt||
 up(row.dispatchStatus)==='DISPATCHED'||!!row.dispatchDate||
 (row.dispatchQty!==''&&row.dispatchQty!=null&&Number(row.dispatchQty)>0)
)}
function summary(){
 const row=current(),panel=$('packSlipSummary');
 verifiedSlip=null;$('packSlipPrint').disabled=true;$('packSlipA4').disabled=true;
 if(!row){panel.textContent='Choose a Work Order.';return}
 selected=row;
 const history=forWork(row.workNo),previous=shipped(history),ordered=Number(row.orderQty),baselineNeeded=legacy(row)&&history.length===0;
 $('packSlipBaselineWrap').hidden=!baselineNeeded;
 if(!baselineNeeded)$('packSlipPrior').value='';
 const extra=baselineNeeded?(Number($('packSlipPrior').value)||0):0;
 const currentQty=Number($('packSlipThis').value)||0;
 const remain=ordered-previous-extra-currentQty;
 panel.innerHTML='<div class="packgrid">'+
  '<div><small>ORDER QTY</small><b>'+esc(row.orderQty)+'</b></div>'+
  '<div><small>PREVIOUS DISPATCHED</small><b>'+esc(fmt(previous+extra))+'</b></div>'+
  '<div><small>THIS DISPATCH</small><b>'+esc(currentQty?fmt(currentQty):'—')+'</b></div>'+
  '<div><small>BALANCE AFTER SLIP</small><b>'+esc(fmt(remain))+'</b></div></div>'+
  '<p><strong>'+esc(row.party||'—')+'</strong> · '+esc(row.workNo)+' · PO '+esc(row.poNo||'—')+'</p>'+
  '<p class="packdesc">'+esc(row.description||'')+'</p>'+
  (history.length?'<p>Verified recorded slips: '+history.length+' · Last '+esc(history.at(-1).createdAt?.slice(0,10)||'')+'</p>':
    '<p>Previous shipped quantity is only confirmed from slips saved through this ledger.</p>')+
  (baselineNeeded?'<p class="warning">This order has an earlier DISPATCHED status or dispatch document but no item-wise dispatch history. Enter the VERIFIED previously shipped quantity (0 only if none was sent). Do not assume full Order Qty was shipped.</p>':'')+
  (remain<0?'<p class="warning">Over-dispatch: Qty exceeds the remaining order quantity.</p>':'');
 const historyPanel=$('packSlipHistory');
 const company=slips().filter(x=>up(x.party)===up(row.party)).slice(-10).reverse();
 historyPanel.innerHTML=company.length?
  '<strong>Same Company · Recent Packing Slips (Work Order-wise)</strong>'+
  company.map(x=>'<div class="entry"><b>'+esc(x.slipNo)+' • '+esc(x.workNo)+'</b> · Sent '+esc(x.thisDispatched)+' · Previous '+esc(x.previousDispatched)+' · Balance '+esc(x.balanceAfter)+'<small>'+esc((x.createdAt||'').slice(0,19).replace('T',' '))+'</small></div>').join(''):
  '<small>No new-system packing slip history yet for this company.</small>';
}
async function load(){
 if(busy)return;
 say('Checking live Cloud Work Orders and saved packing slips…');
 try{
  if(typeof cloudFetch!=='function')throw Error('Cloud connection unavailable');
  const snap=await cloudFetch();
  if(!snap||!Array.isArray(snap.payload?.pending)||!Number.isFinite(Number(snap.version)))throw Error('Invalid Cloud response');
  remote=snap;
  const sel=$('packSlipWO'),old=sel.value;sel.replaceChildren(new Option('Select Work Order',''));
  const list=[...snap.payload.pending].sort((a,b)=>Number(String(b.workNo||'').match(/\d+$/)?.[0]||0)-Number(String(a.workNo||'').match(/\d+$/)?.[0]||0));
  const seen=new Set();
  for(const r of list){
   const no=String(r.workNo||'').trim();if(!no||seen.has(no))continue;seen.add(no);
   sel.add(new Option(no+' · '+String(r.party||'').slice(0,30),no));
  }
  if(seen.has(old))sel.value=old;
  say('Live Cloud verified · '+seen.size+' Work Orders · '+slips().length+' packing slips tracked');
  summary();
 }catch(e){remote=null;selected=null;verifiedSlip=null;summary();say('Cloud unavailable: '+String(e.message||e)+'. No shipment save possible.',true)}
}
function uuid(){return typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'pack-'+Date.now()+'-'+Math.random().toString(36).slice(2)}
function compareOrder(a,b){
 return !!a&&!!b&&up(a.workNo)===up(b.workNo)&&up(a.party)===up(b.party)&&
 up(a.poNo)===up(b.poNo)&&String(a.orderQty)===String(b.orderQty)&&
 up(a.description)===up(b.description);
}
async function saveSlip(){
 if(busy)return;
 const wo=$('packSlipWO').value;const original=current(),amount=qty($('packSlipThis').value);
 if(!original||!remote){say('Select live Work Order first.',true);return}
 if(!Number.isSafeInteger(amount)||amount<=0){say('This Dispatch Qty must be a positive whole number.',true);return}
 const history=forWork(wo),requiresBaseline=legacy(original)&&history.length===0;
 const baselineValue=$('packSlipPrior').value.trim(),baseline=requiresBaseline?Number(baselineValue):0;
 if(requiresBaseline&&baselineValue===''){say('Previous dispatched qty must be verified for this older dispatch order.',true);return}
 if(!Number.isSafeInteger(baseline)||baseline<0){say('Earlier dispatched qty must be a whole number (0 or more).',true);return}
 const ordered=Number(original.orderQty);
 if(!Number.isSafeInteger(ordered)||ordered<=0||shipped(history)+baseline+amount>ordered){say('Dispatch exceeds Work Order Qty, or order quantity is invalid.',true);return}
 if(typeof cloudFetch!=='function'||typeof cloudPush!=='function'||typeof save!=='function'||typeof state==='undefined'){say('CFM Cloud Save not available.',true);return}
 if(!cloudReady||cloudBusy||cloudDirty){say('CFM Cloud is syncing or not ready. Complete Cloud Sync and refresh before saving.',true);return}
 if(!confirm('Confirm ACTUALLY DISPATCHED '+amount+' nos for '+wo+'? This will record an auditable packing slip, not change stock.'))return;
 busy=true;$('packSlipSave').disabled=true;
 let record=null;
 try{
  const latest=await cloudFetch();
  if(!latest||!Array.isArray(latest.payload?.pending))throw Error('Live Cloud cannot be verified');
  if(Number(latest.version)!==Number(remote.version)||Number(latest.version)!==Number(cloudVersion))throw Error('Cloud data changed on another device. Refresh and check quantity again');
  const liveRow=latest.payload.pending.find(r=>r.workNo===wo),localRow=(state.pending||[]).find(r=>r.workNo===wo);
  if(!compareOrder(original,liveRow)||!compareOrder(original,localRow))throw Error('Work Order details changed. No dispatch recorded');
  const liveLog=Array.isArray(latest.payload.packingSlips)?latest.payload.packingSlips:[];
  const localLog=Array.isArray(state.packingSlips)?state.packingSlips:[];
  if(JSON.stringify(liveLog)!==JSON.stringify(localLog))throw Error('Unverified local packing slips differ from Cloud. Sync before saving');
  const rows=liveLog.filter(x=>up(x.workNo)===up(wo));
  const prev=shipped(rows)+baseline,balance=ordered-prev-amount;
  if(balance<0)throw Error('New shipment exceeds remaining Work Order Qty');
  record={
   id:uuid(),slipNo:'PK/'+wo+'/'+String(rows.length+1).padStart(3,'0'),
   workNo:wo,party:liveRow.party||'',poNo:liveRow.poNo||'',
   description:liveRow.description||'',description2:liveRow.description2||'',
   efpplCode:liveRow.itemCode||window.CFM_EFPPL?.codeForRow?.(liveRow)?.code||'',
   orderQty:ordered,previousDispatched:prev,manualPreviousBaseline:baseline,
   thisDispatched:amount,totalDispatched:prev+amount,balanceAfter:balance,
   createdAt:new Date().toISOString(),notes:String($('packSlipRemarks').value||'').trim(),
   source:'MANUAL CONFIRMED SHIPMENT',operator:typeof deviceLabel==='function'?deviceLabel():''
  };
  // Atomic Cloud CAS is performed by the ERP's own versioned cloudPush.
  // No direct database write, stock movement, or Work Order status modification.
  state.packingSlips=[...liveLog,record];
  clearTimeout(cloudPushTimer);
  save(false,{poQuick:true});
  clearTimeout(cloudPushTimer);
  const committed=await cloudPush(true);
  if(!committed)throw Error('Cloud save could not be confirmed. Do not save the same shipment again; check Cloud Sync');
  const confirmed=await cloudFetch();
  if(!confirmed?.payload?.packingSlips?.some(x=>x.id===record.id))throw Error('Cloud acknowledgment received but receipt not verified. Refresh before retrying');
  remote=confirmed;verifiedSlip=record;
  say('✓ SAVED TO LIVE CLOUD: '+record.slipNo+' · This dispatch '+amount+' · Total sent '+record.totalDispatched+' · Balance '+record.balanceAfter);
  $('packSlipPrint').disabled=false;$('packSlipA4').disabled=false;
  summary();
  verifiedSlip=record;$('packSlipPrint').disabled=false;$('packSlipA4').disabled=false;
 }catch(e){
  verifiedSlip=null;
  say('⚠ '+String(e.message||e)+'. If save may have reached Cloud, press Refresh and inspect history. Do not duplicate dispatch.',true);
 }finally{busy=false;$('packSlipSave').disabled=false}
}
function printSlip(a4=false){
 const r=verifiedSlip;if(!r){say('First save the actual dispatch to Live Cloud, then print.',true);return}
 const w=window.open('','_blank');if(!w){say('Enable pop-ups for print.',true);return}
 const paper=a4?'@page{size:A4 portrait;margin:12mm}':'@page{size:A5 landscape;margin:8mm}';
 const html='<!doctype html><html><head><meta charset="utf-8"><title>'+esc(r.slipNo)+'</title><style>'+paper+
  '*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111;margin:0}.slip{border:2px solid #111;padding:12px 14px;max-width:100%;break-inside:avoid}'+
  'h2{font-size:17px;text-align:center;margin:0 0 10px;letter-spacing:.06em}p{font-size:12px;margin:6px 0}.details{border-top:1px solid #111;border-bottom:1px solid #111;padding:7px 0;margin:9px 0}'+
  '.numbers{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}.numbers div{border:1px solid #111;padding:7px}.numbers small{font-size:11px;display:block}.numbers b{font-size:21px}.notes{font-size:11px}.footer{margin-top:8px;font-size:10px}'+
  '</style></head><body><div class="slip"><h2>PACKING SLIP</h2>'+
  '<p><b>SLIP:</b> '+esc(r.slipNo)+' · <b>DATE:</b> '+esc(r.createdAt?.slice(0,10)||'')+'</p>'+
  '<p><b>PARTY:</b> '+esc(r.party)+' · <b>WORK ORDER:</b> '+esc(r.workNo)+'</p>'+
  '<p><b>PO:</b> '+esc(r.poNo||'—')+' · <b>EFPPL:</b> '+esc(r.efpplCode||'—')+'</p>'+
  '<div class="details"><b>ITEM:</b> '+esc(r.description||'')+(r.description2?'<p>'+esc(r.description2)+'</p>':'')+'</div>'+
  '<div class="numbers"><div><small>ORDER QTY</small><b>'+esc(r.orderQty)+'</b></div><div><small>PREVIOUS DISPATCHED</small><b>'+esc(r.previousDispatched)+'</b></div>'+
  '<div><small>THIS DISPATCH QTY</small><b>'+esc(r.thisDispatched)+'</b></div><div><small>BALANCE PENDING</small><b>'+esc(r.balanceAfter)+'</b></div></div>'+
  (r.notes?'<p class="notes"><b>REMARKS:</b> '+esc(r.notes)+'</p>':'')+
  '<div class="footer">TOTAL DISPATCHED TO DATE: '+esc(r.totalDispatched)+' · WORK ORDER-WISE TRACKING</div></div>'+
  '<script>window.addEventListener("load",function(){window.print()})<\/script></body></html>';
 w.document.open();w.document.write(html);w.document.close();
}
function build(){
 const style=document.createElement('style');style.textContent=
 '#packSlipTop{display:flex!important;align-items:center;gap:8px;margin:9px 0;padding:8px;border:1px solid #171717;border-radius:9px;background:#fff}'+
 '#packSlipOpen{background:#171717;color:#fff;border:0;border-radius:7px;padding:11px 14px;font:bold 13px Arial;cursor:pointer}'+
 '#packSlipDialog{width:min(850px,96vw);max-height:94dvh;overflow:auto;border:1px solid #9eb3c8;border-radius:12px;padding:0;background:#f9fcff;color:#153b58}'+
 '#packSlipDialog::backdrop{background:#102638aa}#packSlipDialog *{box-sizing:border-box;font-family:Arial,sans-serif}'+
 '#packSlipDialog .phead{background:#123e6b;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px}'+
 '#packSlipDialog .pbody{padding:12px;display:grid;grid-template-columns:1fr 1fr;gap:14px}'+
 '#packSlipDialog label{display:block;margin:9px 0;font-size:12px;font-weight:700}'+
 '#packSlipDialog input,#packSlipDialog select,#packSlipDialog textarea{display:block;width:100%;padding:9px;border-radius:7px;border:1px solid #b2cbdf;background:white;color:#153952;margin:5px 0;font-size:13px}'+
 '#packSlipDialog button{border:1px solid #9fbed8;border-radius:8px;padding:9px 11px;background:#fff;color:#194b73;font:bold 12px Arial;cursor:pointer}'+
 '#packSlipDialog button.action{background:#105c96;color:#fff}#packSlipDialog button:disabled{opacity:.5;cursor:not-allowed}'+
 '#packSlipDialog .packgrid{display:grid;grid-template-columns:1fr 1fr;gap:7px}#packSlipDialog .packgrid div{padding:10px;border:1px solid #b5c6d9;background:#fff;border-radius:8px}'+
 '#packSlipDialog .packgrid small{font-size:10px;display:block;color:#4a6780}#packSlipDialog .packgrid b{font-size:20px}'+
 '#packSlipDialog .packdesc,#packSlipDialog .warning{font-size:12px;line-height:1.5}#packSlipDialog .warning{color:#a12626;font-weight:700}'+
 '#packSlipDialog .entry{border-bottom:1px solid #d6e2ed;padding:8px 0;font-size:12px}#packSlipDialog .entry small{display:block;color:#527083;margin-top:3px}'+
 '#packSlipDialog .pfoot{position:sticky;bottom:0;background:#fff;border-top:1px solid #d3e2ee;padding:10px;display:flex;gap:7px;flex-wrap:wrap}'+
 '#packSlipMsg{font-size:12px;line-height:1.5;padding:8px 12px}'+
 '@media(max-width:680px){#packSlipDialog .pbody{grid-template-columns:1fr;padding:9px}}';
 document.head.append(style);
 const d=document.createElement('dialog');d.id='packSlipDialog';
 d.innerHTML='<div class="phead"><div><strong>PACKING SLIP · DISPATCH BALANCE</strong><div style="font-size:11px">Cloud verified · Qty history · Work Order-wise</div></div><button id="packSlipClose">✕ Close</button></div>'+
 '<div class="pbody"><div><label>Work Order<select id="packSlipWO"><option value="">Select Work Order</option></select></label><button id="packSlipReload">↻ Refresh Cloud</button>'+
 '<label>THIS Dispatch Qty (actual nos)<input id="packSlipThis" type="number" min="1" step="1" placeholder="Qty sent today"></label>'+
 '<div id="packSlipBaselineWrap" hidden><label>Earlier Dispatched Qty (verify old dispatch)<input id="packSlipPrior" type="number" min="0" step="1" placeholder="Enter from old challan; 0 only if none"></label></div>'+
 '<label>Dispatch Remark / LR (optional)<input id="packSlipRemarks" placeholder="Courier / LR / dispatch notes"></label>'+
 '<p style="font-size:11px">Save only after goods are actually sent. Printing an old slip does not create another dispatch record. Order, cutting and stock remain unchanged.</p>'+
 '</div><div><div id="packSlipSummary">Select Work Order.</div><div id="packSlipHistory" style="margin-top:10px;max-height:220px;overflow:auto"></div></div></div>'+
 '<div id="packSlipMsg" role="status">Load live Cloud to begin.</div>'+
 '<div class="pfoot"><button id="packSlipSave" class="action">✓ Save Actual Dispatch Qty</button><button id="packSlipPrint" disabled>🖨 Print Packing Slip</button><button id="packSlipA4" disabled>🖨 A4 Print</button></div>';
 document.body.append(d);
 $('packSlipClose').onclick=()=>d.close();
 $('packSlipWO').onchange=()=>{$('packSlipThis').value='';$('packSlipPrior').value='';summary()};
 $('packSlipReload').onclick=load;
 $('packSlipThis').oninput=summary;$('packSlipPrior').oninput=summary;
 $('packSlipSave').onclick=saveSlip;$('packSlipPrint').onclick=()=>printSlip(false);$('packSlipA4').onclick=()=>printSlip(true);
}
function mount(){
 const dash=$('view-dashboard');if(!dash)return;
 if(!$('packSlipDialog'))build();
 if($('packSlipTop'))return;
 const wrap=document.createElement('section');wrap.id='packSlipTop';
 const btn=document.createElement('button');btn.id='packSlipOpen';btn.type='button';btn.textContent='📦 Packing Slip · Dispatch Balance';
 btn.onclick=()=>{$('packSlipDialog').showModal();load()};
 wrap.append(btn);
 const heading=dash.querySelector(':scope > .section-head'),bw=$('cfmBWTaffetaEntry');
 if(bw)bw.after(wrap);else if(heading)heading.after(wrap);else dash.prepend(wrap);
}
function init(){
 const dash=$('view-dashboard');if(dash){
  mount();
  new MutationObserver(()=>{if(!$('packSlipTop'))mount()}).observe(dash,{childList:true,subtree:false});
 }else{
  let tries=0;const poll=setInterval(()=>{if($('view-dashboard')){clearInterval(poll);init()}else if(++tries>60)clearInterval(poll)},500);
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();