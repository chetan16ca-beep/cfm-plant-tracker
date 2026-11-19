/* CFM V362 — MNC Eagle Slip and Packing Label with historical reprint and dashboard placement.
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
 verifiedSlip=null;$('packSlipPrint').disabled=true;$('packSlipA4').disabled=true;$('packSlipCarton').disabled=true;
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
  '<strong>Same Company · Saved Packing Slips (Work Order-wise)</strong>'+
  company.map(x=>'<div class="entry"><b>'+esc(x.slipNo)+' • '+esc(x.workNo)+'</b> · Sent '+esc(x.thisDispatched)+
   ' · Previous '+esc(x.previousDispatched)+' · Balance '+esc(x.balanceAfter)+
   '<small>'+esc((x.createdAt||'').slice(0,19).replace('T',' '))+'</small>'+
   '<button type="button" data-pack-id="'+esc(x.id)+'" data-kind="slip">🖨 Reprint Slip</button> '+
   '<button type="button" data-pack-id="'+esc(x.id)+'" data-kind="carton">📦 Packing Label</button></div>').join(''):
  '<small>No confirmed packing slips in Cloud history for this company yet.</small>';
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
  $('packSlipThis').value='';$('packSlipPrior').value='';
  summary();
  say('✓ SAVED TO LIVE CLOUD: '+record.slipNo+' · This dispatch '+amount+' · Total sent '+record.totalDispatched+' · Balance '+record.balanceAfter);
  verifiedSlip=record;$('packSlipPrint').disabled=false;$('packSlipA4').disabled=false;$('packSlipCarton').disabled=false;
 }catch(e){
  verifiedSlip=null;
  say('⚠ '+String(e.message||e)+'. If save may have reached Cloud, press Refresh and inspect history. Do not duplicate dispatch.',true);
 }finally{busy=false;$('packSlipSave').disabled=false}
}

function printSafe(v){return esc(v===null||v===undefined||v===''?'—':v)}
function logoHtml(color='#153968',width=92,height=72){
 const brand=window.CFM_EAGLE_BRAND;
 return brand?.logoSvg?.(width,height,color)||'<strong style="font-size:38px;color:'+color+'">E</strong>';
}
function printSlip(a4=false,record=null){
 const r=record||verifiedSlip;
 if(!r){say('Select a saved Packing Slip from history or confirm actual dispatch.',true);return}
 const w=window.open('','_blank');if(!w){say('Enable pop-ups for Packing Slip print.',true);return}
 const page=a4?'@page{size:A4 landscape;margin:10mm}':'@page{size:A5 landscape;margin:7mm}';
 const day=String(r.createdAt||'').slice(0,10);
 const head='<header class="letterhead"><div class="logo">'+logoHtml('#163568',92,72)+'</div>'+
 '<div class="identity"><div class="brandname">EAGLE</div><div class="company">FILTRATION PRODUCT PVT. LTD.</div><div class="iso">An ISO 9001:2015 Certified Company</div></div>'+
 '<div class="contact"><div class="since">SINCE : 1992</div><div>info@eaglefiltrations.com</div><div>www.eaglefiltrations.com</div><strong>+91 70416 70091</strong></div></header>'+
 '<div class="mfg">Mfg. of All Types of Industrial Filters, Bag Filters, & Automobile Filters.</div>';
 const info='<h2>PACKING SLIP</h2><div class="meta">'+
 '<div><small>PACKING SLIP NO.</small><b>'+printSafe(r.slipNo)+'</b></div>'+
 '<div><small>DATE</small><b>'+printSafe(day)+'</b></div>'+
 '<div><small>WORK ORDER NO.</small><b>'+printSafe(r.workNo)+'</b></div>'+
 '<div><small>PARTY / SHIP TO</small><b>'+printSafe(r.party)+'</b></div>'+
 '<div><small>CUSTOMER PO NO.</small><b>'+printSafe(r.poNo)+'</b></div>'+
 '<div><small>DISPATCH STATUS</small><b>CONFIRMED</b></div></div>';
 const tab='<table><thead><tr><th>SR.</th><th>ITEM / DESCRIPTION</th><th>DESCRIPTION 2 / SPECIFICATION</th><th>EFPPL PRODUCT CODE</th>'+
 '<th>ORDER QTY</th><th>PREVIOUS SENT</th><th>THIS DISPATCH</th><th>TOTAL SENT</th><th>BALANCE</th></tr></thead><tbody><tr>'+
 '<td>1</td><td>'+printSafe(r.description)+'</td><td>'+printSafe(r.description2)+'</td><td>'+printSafe(r.efpplCode)+'</td>'+
 '<td class="num">'+printSafe(r.orderQty)+'</td><td class="num">'+printSafe(r.previousDispatched)+'</td><td class="num big">'+printSafe(r.thisDispatched)+'</td>'+
 '<td class="num">'+printSafe(r.totalDispatched)+'</td><td class="num big">'+printSafe(r.balanceAfter)+'</td></tr></tbody></table>';
 const footer='<div class="remarks"><b>DISPATCH / LR / COURIER REMARKS:</b> '+printSafe(r.notes)+'</div>'+
 '<div class="sign"><div>PREPARED BY<br><b>'+printSafe(r.operator)+'</b></div><div>PACKED BY<br>_________________</div>'+
 '<div>CHECKED BY<br>_________________</div><div>RECEIVED BY<br>_________________</div></div>'+
 '<div class="audit">Work Order-wise confirmed dispatch · Slip '+printSafe(r.slipNo)+' · Reprinting this slip does not create a new dispatch.</div>';
 const css=page+[
 '*{box-sizing:border-box}html,body{margin:0;color:#14171d;background:#fff;font-family:Arial,sans-serif}',
 '.sheet{width:100%;margin:0}.letterhead{display:grid;grid-template-columns:14% 47% 39%;align-items:center;gap:5px;padding:2px 5px 7px}',
 '.logo{display:flex;justify-content:center;align-items:center}.logo svg{max-width:100%;height:auto}',
 '.identity{border-right:2px solid #193a78;padding:4px 8px}.brandname{font:italic 900 42px/1 Arial;color:#153968;letter-spacing:2px}',
 '.company{font:bold 16px Arial;color:#276236}.iso{font:bold 10px Arial;margin-top:3px}',
 '.contact{font:bold 11px/1.55 Arial;padding-left:9px}.contact strong{font-size:15px}',
 '.since{display:table;background:#163968;color:#fff;border-radius:15px;padding:1px 12px;font:bold 12px Arial;margin:0 0 4px}',
 '.mfg{text-align:right;padding:7px 11px;background:#1c3e80;color:#fff;font:bold 11px Arial}',
 'h2{text-align:center;font:bold 20px Arial;margin:9px 0 11px;letter-spacing:1px}',
 '.meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid #111;border-left:1px solid #111;margin-bottom:12px}',
 '.meta>div{border-right:1px solid #111;border-bottom:1px solid #111;padding:7px 8px;min-height:43px;overflow-wrap:anywhere}',
 '.meta small{font-size:9px;display:block;color:#555;margin-bottom:4px}.meta b{font-size:12px}',
 'table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:10px}th,td{border:1px solid #111;padding:8px 5px;text-align:left;vertical-align:top;overflow-wrap:anywhere}',
 'th{background:#f0f2f4;text-align:center;font-size:9px}th:first-child{width:4%}th:nth-child(2){width:17%}th:nth-child(3){width:17%}',
 'th:nth-child(4){width:18%}th:nth-child(5){width:8%}th:nth-child(6){width:9%}th:nth-child(7){width:9%}th:nth-child(8){width:9%}th:nth-child(9){width:9%}',
 '.num{text-align:center;font-weight:bold;font-size:14px}.big{font-size:16px}',
 '.remarks{margin-top:12px;border:1px solid #111;padding:9px;font-size:11px;min-height:34px}',
 '.sign{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:17px 0 5px}.sign>div{border-top:1px solid #777;padding-top:6px;font:bold 10px Arial}',
 '.audit{border-top:1px solid #c4c4c4;font:9px Arial;padding-top:6px;margin-top:9px;color:#555}',
 '@media print{.sheet{break-inside:avoid}html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}'
 ].join('');
 const html='<!doctype html><html><head><meta charset="utf-8"><title>'+printSafe(r.slipNo)+'</title><style>'+css+
 '</style></head><body><div class="sheet">'+head+info+tab+footer+'</div>'+
 '<script>window.addEventListener("load",function(){window.focus();window.print()})<\/script></body></html>';
 w.document.open();w.document.write(html);w.document.close();
}
function printCartonLabel(record=null){
 const r=record||verifiedSlip;if(!r){say('Select a saved Packing Slip or confirm dispatch first.',true);return}
 const w=window.open('','_blank');if(!w){say('Enable pop-ups for Packing Label print.',true);return}
 const header='<header><div class="mark">'+logoHtml('#000',70,55)+'</div><div><b>EAGLE</b><small>FILTRATION PRODUCT PVT. LTD.</small></div>'+
 '<div class="kind">PACKING LABEL</div></header>';
 const main='<div class="cell party"><small>SHIP TO / PARTY</small><strong>'+printSafe(r.party)+'</strong></div>'+
 '<div class="twocol"><div class="cell"><small>PACKING SLIP NO.</small><b>'+printSafe(r.slipNo)+'</b></div>'+
 '<div class="cell"><small>WORK ORDER NO.</small><b>'+printSafe(r.workNo)+'</b></div></div>'+
 '<div class="twocol"><div class="cell"><small>PO NO.</small><b>'+printSafe(r.poNo)+'</b></div>'+
 '<div class="cell"><small>DATE</small><b>'+printSafe(String(r.createdAt||'').slice(0,10))+'</b></div></div>'+
 '<div class="cell"><small>ITEM / DESCRIPTION</small><b>'+printSafe(r.description)+'</b></div>'+
 '<div class="cell"><small>SPECIFICATION / DESCRIPTION 2</small><b>'+printSafe(r.description2)+'</b></div>'+
 '<div class="cell"><small>EFPPL PRODUCT CODE</small><b>'+printSafe(r.efpplCode)+'</b></div>'+
 '<div class="qty"><div><small>THIS DISPATCH QTY</small><b>'+printSafe(r.thisDispatched)+'</b></div>'+
 '<div><small>ORDER QTY</small><b>'+printSafe(r.orderQty)+'</b></div>'+
 '<div><small>BALANCE</small><b>'+printSafe(r.balanceAfter)+'</b></div></div>';
 const css=[
 '@page{size:100mm 75mm;margin:0}*{box-sizing:border-box}html,body{width:100mm;height:75mm;margin:0;font-family:Arial,sans-serif;color:#111;background:#fff}',
 '.label{width:100mm;height:75mm;padding:3mm;overflow:hidden}.sheet{border:1px solid #111;padding:2mm;height:100%}',
 'header{display:flex;align-items:center;gap:2mm;border-bottom:2px solid #111;padding-bottom:1mm;margin-bottom:2mm}',
 '.mark svg{width:15mm;height:11mm}header b{display:block;font:bold italic 20px Arial}header small{display:block;font:bold 7px Arial}',
 '.kind{margin-left:auto;font:bold 10px Arial;border:1px solid #111;padding:2px;white-space:nowrap}',
 '.cell{padding:1mm;border-bottom:1px solid #aaa;overflow-wrap:anywhere;min-height:7mm}',
 '.cell small,.qty small{display:block;font-size:7px;color:#555;margin-bottom:1mm}.cell b,.cell strong{font-size:10px;line-height:1.15}.party strong{font-size:12px}',
 '.twocol{display:grid;grid-template-columns:1fr 1fr}.twocol .cell:first-child{border-right:1px solid #aaa}',
 '.qty{display:grid;grid-template-columns:1.2fr 1fr 1fr;border:1px solid #111;margin-top:2mm}',
 '.qty>div{padding:1mm;text-align:center}.qty>div+div{border-left:1px solid #111}.qty b{font:bold 17px Arial;display:block}',
 '@media print{html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}'
 ].join('');
 const html='<!doctype html><html><head><meta charset="utf-8"><title>Carton Label '+printSafe(r.slipNo)+'</title><style>'+
 css+'</style></head><body><div class="label"><div class="sheet">'+header+main+'</div></div>'+
 '<script>window.addEventListener("load",function(){window.focus();window.print()})<\/script></body></html>';
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
 '<div class="pfoot"><button id="packSlipSave" class="action">✓ Save Actual Dispatch Qty</button><button id="packSlipPrint" disabled>🖨 Print Packing Slip</button><button id="packSlipA4" disabled>🖨 A4 Print</button><button id="packSlipCarton" disabled>📦 Print Packing Label 100×75</button></div>';
 document.body.append(d);
 $('packSlipClose').onclick=()=>d.close();
 // Reprint saved history without creating a second shipment or touching stock.
 $('packSlipHistory').onclick=e=>{
  const b=e.target?.closest?.('button[data-pack-id]');
  if(!b)return;
  const item=slips().find(x=>String(x.id)===String(b.dataset.packId));
  if(!item){say('Slip not present in live Cloud history. Refresh first.',true);return}
  if(b.dataset.kind==='carton')printCartonLabel(item);
  else printSlip(true,item);
 };
 $('packSlipWO').onchange=()=>{$('packSlipThis').value='';$('packSlipPrior').value='';summary()};
 $('packSlipReload').onclick=load;
 $('packSlipThis').oninput=summary;$('packSlipPrior').oninput=summary;
 $('packSlipSave').onclick=saveSlip;$('packSlipPrint').onclick=()=>printSlip(false);$('packSlipA4').onclick=()=>printSlip(true);$('packSlipCarton').onclick=()=>printCartonLabel();
}
function mount(){
 const dash=$('view-dashboard');if(!dash)return;
 if(!$('packSlipDialog'))build();
 let wrap=$('packSlipTop');
 if(!wrap){
  wrap=document.createElement('section');wrap.id='packSlipTop';
  const btn=document.createElement('button');btn.id='packSlipOpen';btn.type='button';
  btn.textContent='📦 Packing Slip · Dispatch Balance';
  btn.onclick=()=>{$('packSlipDialog').showModal();load()};
  wrap.append(btn);
 }
 const target=dash.querySelector('#v167Pack')||
  [...dash.querySelectorAll('details.cfm-mini-section')].find(x=>/packing\s*slip\s*(?:&|and)\s*label/i.test(x.querySelector('summary')?.textContent||''))?.querySelector('.cfm-mini-body');
 if(target&&wrap.parentElement!==target)target.append(wrap);
}
function init(){
 let attempts=0;const poll=setInterval(()=>{
  if($('view-dashboard')){mount();if($('v167Pack')?.contains($('packSlipTop')))clearInterval(poll)}
  if(++attempts>45)clearInterval(poll);
 },500);
 if($('view-dashboard'))mount();
 // Watch Dashboard-only structural changes, not every input edit.
 const dash=$('view-dashboard');
 if(dash){let queued=false;new MutationObserver(()=>{
   if(queued)return;queued=true;
   requestAnimationFrame(()=>{queued=false;const target=$('v167Pack');
    if(target&&$('packSlipTop')?.parentElement!==target)mount()
   })
 }).observe(dash,{childList:true,subtree:false})}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();