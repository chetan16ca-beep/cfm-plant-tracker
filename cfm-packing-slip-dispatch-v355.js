/* CFM V381 — Unified single landscape white packing print for Cloud and historical reprints.
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
// Source fields only: no guessed postal address or manufactured PO item numbers.
const field=(row,names)=>{
 for(const name of names){const v=row?.[name];if(typeof v==='string'&&v.trim())return v.trim()}
 return '';
};
const customerItem=row=>field(row,['buyerItemCode','customerItemCode','customerItemNo','buyerItemNo','poItemNo','itemNo']);
// V405: one field mapping shared by Packing Slip, print preview and Packing Label.
// Extract only explicit values from Work Order; never invent PO date, party address or micron.
function packingWOFields(row){
 if(!row)return {};
 const product=field(row,['description','productName','product'])||'';
 const specification=field(row,['description2','specification','productDetails'])||'';
 const code=field(row,['itemCode','efpplCode','eagleCode'])||window.CFM_EFPPL?.codeForRow?.(row)?.code||'';
 const rawSize=field(row,['size','sizeInch','dimensions','productSize']);
 const sizeMatch=String(product+' '+specification).match(/\b(?:CF(?:\s+BAG)?|CENTRIFUGE)\s*[-/_ ]\s*(24|36|48|60)\b/i)||
  String(code).match(/\bCF[-/_ ](24|36|48|60)(?:[-/_ ]|$)/i)||
  String(product+' '+specification).match(/\bSIZE\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*(?:INCH(?:ES)?|IN|["″])/i);
 const rawMicron=field(row,['micron','micronRating']);
 const micronMatch=String(product+' '+specification).match(/\b(\d+(?:\.\d+)?)\s*(?:MICRON(?:S)?|µM|UM)\b/i);
 return {
  workNo:field(row,['workNo']),
  party:field(row,['party','companyName']),
  poNo:field(row,['poNo','customerPoNo']),
  poDate:field(row,['poDate','purchaseOrderDate']),
  partyAddress:field(row,['shipToAddress','deliveryAddress','dispatchAddress','partyAddress','customerAddress','consigneeAddress','address']),
  customerItemNo:customerItem(row),
  efpplCode:code,
  description:product,
  description2:specification,
  size:rawSize||(sizeMatch?sizeMatch[1]+'"':''),
  micron:rawMicron||(micronMatch?micronMatch[1]:''),
  orderQty:row.orderQty??'',
  cutQty:row.cutQty??''
 };
}
window.CFM_PACKING_WO_FIELDS_V405=packingWOFields;
const partyShipAddress=row=>{
 const direct=field(row,['shipToAddress','deliveryAddress','dispatchAddress','partyAddress','customerAddress','shipTo','consigneeAddress','address']);
 if(direct)return direct;
 const matches=slips().filter(x=>up(x.party)===up(row?.party)&&up(x.poNo)===up(row?.poNo)&&String(x.partyAddress||'').trim());
 const distinct=[...new Set(matches.map(x=>String(x.partyAddress).trim()))];
 return distinct.length===1?distinct[0]:'';
};
function setOrderAddress(){
 const row=current(),el=$('packSlipPartyAddress');
 if(el)el.value=row?partyShipAddress(row):'';
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
  '<p><strong>'+esc(row.party||'—')+'</strong> · '+esc(row.workNo)+' · Customer PO '+esc(row.poNo||'—')+'</p>'+
  '<p><small>SHIP-TO ADDRESS:</small> '+esc($('packSlipPartyAddress')?.value||'Not in Work Order — enter and verify')+'</p>'+
  '<p><small>CUSTOMER ITEM NO.:</small> '+esc(customerItem(row)||'—')+' · <small>EFPPL CODE:</small> '+esc(row.itemCode||row.efpplCode||'—')+'</p>'+
  '<p class="packdesc">'+esc(row.description||'')+' · '+esc(row.description2||'')+'</p>'+
  '<div class="pack-wo-fields"><b>WORK ORDER AUTO DATA</b>'+
  '<div>PO: '+esc(packingWOFields(row).poNo||'—')+' · Item: '+esc(packingWOFields(row).customerItemNo||'—')+'</div>'+
  '<div>EFPPL: '+esc(packingWOFields(row).efpplCode||'—')+'</div>'+
  '<div>Size: '+esc(packingWOFields(row).size||'Not recorded')+' · Micron: '+esc(packingWOFields(row).micron||'Not recorded')+'</div>'+
  '<div>Order Qty: '+esc(packingWOFields(row).orderQty)+' · Cut Qty: '+esc(packingWOFields(row).cutQty)+'</div></div>'+
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
   '<button type="button" data-pack-id="'+esc(x.id)+'" data-kind="carton">📦 Packing Label</button> '+
   '<button type="button" data-pack-id="'+esc(x.id)+'" data-kind="delete" class="pack-delete-row" title="Delete only this dummy/test Packing Slip">🗑 Delete</button></div>').join(''):
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
  setOrderAddress();
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
 const address=String($('packSlipPartyAddress')?.value||'').trim();
 if(!address){say('Ship-to / Party Address missing. Enter and verify it against the customer PO before saving.',true);return}
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
   workNo:wo,party:liveRow.party||'',partyAddress:address,poNo:liveRow.poNo||'',
   poDate:field(liveRow,['poDate','purchaseOrderDate']),orderDate:liveRow.orderDate||'',
   customerItemNo:packingWOFields(liveRow).customerItemNo,size:packingWOFields(liveRow).size,
   micron:packingWOFields(liveRow).micron,
   description:packingWOFields(liveRow).description,description2:packingWOFields(liveRow).description2,
   efpplCode:packingWOFields(liveRow).efpplCode,
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
function originalWordmarkHtml(){
 const brand=window.CFM_EAGLE_BRAND;
 return brand?.wordmarkPath?
 '<svg class="eagle-wordmark" viewBox="0 0 465 80" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="EAGLE" preserveAspectRatio="xMinYMid meet"><path d="'+brand.wordmarkPath+'" fill="#111" fill-rule="evenodd"/></svg>':
 '<span>EAGLE</span>';
}
// Print from the saved dispatch snapshot; drafts are explicitly marked and
// never save to Cloud or change order/cutting/stock data.
// V381: one print layout for Cloud dispatch, its reprints, and legacy packing
// records. Pure rendering: it never records a dispatch or mutates the ERP.
function printSlip(a4=false,record=null){
 const r=record||verifiedSlip;
 if(!r){say('Choose a Work Order, saved slip or legacy packing record.',true);return}
 // V401 uses the exact Cloud-confirmed snapshot, or a clearly marked read-only draft.
 // This only opens a print preview; it NEVER records dispatch or alters stock.
 if(window.CFM_PACKING_PREVIEW_V401?.open){
  const wo=remote?.payload?.pending?.find(x=>up(x.workNo)===up(r.workNo)&&up(x.party)===up(r.party)&&up(x.poNo)===up(r.poNo));
  window.CFM_PACKING_PREVIEW_V401.open(r,{a4:true,workOrder:wo||null});
  return;
 }
 const w=window.open('','_blank');if(!w){say('Enable pop-ups for Packing Slip print.',true);return}
 const wo=remote?.payload?.pending?.find(x=>up(x.workNo)===up(r.workNo)&&up(x.party)===up(r.party)&&up(x.poNo)===up(r.poNo));
 const pick=(stored,work)=>String(stored??'').trim()||String(work??'').trim();
 const address=pick(r.partyAddress,wo?partyShipAddress(wo):'');
 const item=pick(r.customerItemNo,wo?customerItem(wo):'');
 const code=pick(r.efpplCode,wo?.itemCode||wo?.efpplCode||'');
 const size=pick(r.size,packingWOFields(wo).size);
 const micron=pick(r.micron,packingWOFields(wo).micron);
 const poDate=pick(r.poDate,field(wo,['poDate','purchaseOrderDate']));
 const draft=!!r.draft,legacy=!!r.legacy;
 const fmt=x=>x===null||x===undefined||String(x).trim()===''?'—':String(x);
 const items=Array.isArray(r.items)&&r.items.length?r.items:[{
  workNo:r.workNo,customerItemNo:item,efpplCode:code,
  description:pick(r.description,wo?.description||''),
  description2:pick(r.description2,wo?.description2||''),size,micron,
  qty:r.thisDispatched
 }];
 const cell=(name,v)=>'<div class="meta-cell"><small>'+esc(name)+'</small><strong>'+printSafe(fmt(v))+'</strong></div>';
 const page=a4?'@page{size:A4 landscape;margin:10mm}':'@page{size:A5 landscape;margin:7mm}';
 const title=draft?'DRAFT / NOT DISPATCHED':legacy?'LEGACY PACKING RECORD':'PACKING SLIP';
 const head='<div class="header"><div class="brand">'+
 '<div class="logo">'+logoHtml('#000',78,65)+'</div><div class="brand-text">'+
 '<div class="brandname">'+originalWordmarkHtml()+'</div>'+
 '<div class="company">FILTRATION PRODUCT PVT. LTD.</div>'+
 '<div class="iso">An ISO 9001:2015 Certified Company</div></div></div>'+
 '<div class="header-right"><div class="doc-title">PACKING SLIP</div>'+
 '<div class="doc-sub">EAGLE · ORIGINAL WORK ORDER REFERENCE</div>'+
 '<div class="doc-status">'+(draft?'DRAFT / NOT DISPATCHED':legacy?'LEGACY PACKING RECORD':'')+'</div>'+
 '<div class="doc-ref">'+printSafe(r.slipNo)+'</div></div></div>'+
 '<div class="tagline">Mfg. of All Types of Industrial Filters, Bag Filters, & Automobile Filters.</div>';
 const refs='<div class="refs">'+cell('PACKING SLIP NO.',r.slipNo)+
 cell('SLIP DATE',String(r.createdAt||r.date||'').slice(0,10))+
 cell('CUSTOMER PO NO.',r.poNo)+cell('CUSTOMER PO DATE',poDate)+'</div>';
 const party='<div class="party-grid"><section><div class="section-title">CUSTOMER / PARTY</div>'+
 '<div class="party-name">'+printSafe(r.party)+'</div>'+
 '<div class="address-title">SHIP TO / DELIVERY ADDRESS</div>'+
 '<div class="address">'+(address?esc(address):'<i>Not available in the Work Order — verify against customer PO.</i>')+'</div></section>'+
 '<section><div class="section-title">ORDER REFERENCE</div>'+
 '<div class="ref-line"><span>WORK ORDER</span><b>'+printSafe(r.workNo||items.map(x=>x.workNo).join(', '))+'</b></div>'+
 '<div class="ref-line"><span>PO NO.</span><b>'+printSafe(r.poNo)+'</b></div>'+
 '<div class="ref-line"><span>CUSTOMER ITEM</span><b>'+printSafe(item||items[0]?.customerItemNo)+'</b></div>'+
 '<div class="ref-line"><span>EFPPL CODE</span><b>'+printSafe(code||items[0]?.efpplCode)+'</b></div>'+
 '</section></div>';
 const row=(x,i)=>'<tr><td class="center">'+(i+1)+'</td>'+
 '<td>'+printSafe(x.workNo)+'</td><td>'+printSafe(x.customerItemNo)+'</td>'+
 '<td>'+printSafe(x.efpplCode)+'</td><td class="desc">'+printSafe(x.description)+'</td>'+
 '<td class="desc">'+printSafe(x.description2)+'</td>'+
 '<td class="center">'+printSafe(x.size)+'</td><td class="center">'+printSafe(x.micron)+'</td>'+
 '<td class="center strong">'+printSafe(fmt(x.qty))+'</td></tr>';
 const tab='<div class="section-heading">PRODUCT DETAILS · AS PER WORK ORDER / CUSTOMER PO</div>'+
 '<table><colgroup><col style="width:4%"><col style="width:10%"><col style="width:10%">'+
 '<col style="width:15%"><col style="width:20%"><col style="width:20%">'+
 '<col style="width:7%"><col style="width:8%"><col style="width:6%"></colgroup>'+
 '<thead><tr><th>SR.</th><th>WORK ORDER</th><th>CUSTOMER ITEM</th><th>EFPPL CODE</th>'+
 '<th>PRODUCT DESCRIPTION</th><th>TECHNICAL SPECIFICATION</th><th>SIZE</th><th>MICRON</th>'+
 '<th>'+(legacy?'PACKED':'DISPATCH')+' QTY</th></tr></thead>'+
 '<tbody>'+items.map(row).join('')+'</tbody></table>';
 const metrics=legacy?
  '<div class="metrics legacy-metrics">'+cell('TOTAL PACKED QTY',r.thisDispatched)+
   cell('TOTAL PACKAGES',r.packages)+
   cell('PREVIOUS DISPATCH','Not verified')+
   cell('DISPATCH STATUS','Historical packing record')+'</div>':
  '<div class="metrics">'+cell('ORDER QTY',r.orderQty)+
  cell('PREVIOUS SENT',r.previousDispatched)+cell('THIS DISPATCH',r.thisDispatched)+
  cell('TOTAL SENT',r.totalDispatched)+cell('BALANCE',r.balanceAfter)+'</div>';
 const tail='<div class="footer">'+
 '<div class="remarks"><span>DISPATCH / LR / COURIER REMARKS</span><b>'+printSafe(r.notes)+'</b></div>'+
 '<div class="signatures"><div>PREPARED BY<strong>'+printSafe(r.operator)+'</strong></div>'+
 '<div>PACKED BY<strong>'+printSafe(r.packedBy||'____________')+'</strong></div>'+
 '<div>CHECKED BY<strong>____________</strong></div>'+
 '<div>RECEIVED BY<strong>____________</strong></div></div>'+
 '<div class="disclaimer">'+(draft?'DRAFT — NO GOODS DISPATCHED BY THIS PREVIEW':
  legacy?'HISTORICAL PACKING RECORD — previous dispatch quantities have not been verified':
  'CONFIRMED DISPATCH · REPRINT DOES NOT SAVE ANOTHER SHIPMENT')+
 '</div></div>';
 const css=page+[
 '*{box-sizing:border-box}html,body{margin:0;color:#111;background:#fff;font:11px/1.3 Arial,Helvetica,sans-serif}',
 '.sheet{width:100%;margin:0 auto;max-width:100%;background:#fff}',
 '.header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #111;padding-bottom:6px;gap:18px}',
 '.brand{display:flex;gap:10px;align-items:center;width:60%;min-width:0}.brand .logo{width:70px;flex:none}.brand .logo svg{max-width:100%;height:auto}',
 '.brand-text{min-width:0}.brandname{height:36px;max-width:270px}.brandname .eagle-wordmark{height:34px;width:100%;display:block}',
 '.company{font-size:13px;font-weight:800;letter-spacing:.1px}.iso{font-size:9px;font-weight:700}',
 '.header-right{text-align:right;min-width:0}.doc-title{font:800 25px Arial;letter-spacing:1px}.doc-sub{font:700 9px Arial;letter-spacing:.5px}',
 '.doc-ref{font:bold 13px Arial;padding-top:5px}.doc-status{font:bold 10px Arial;letter-spacing:.4px;margin-top:3px}.tagline{font:bold 10px Arial;padding:5px 1px;border-bottom:1px solid #111}',
 '.refs,.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid #111;border-right:0;margin-top:9px}',
 '.meta-cell{border-right:1px solid #111;padding:6px 8px;min-width:0;overflow-wrap:anywhere}',
 '.meta-cell small{font-size:8.5px;font-weight:800;display:block;letter-spacing:.3px;margin-bottom:4px}',
 '.meta-cell strong{font-size:12px;font-weight:800;display:block;white-space:pre-wrap}',
 '.party-grid{display:grid;grid-template-columns:1.12fr 1fr;border:1px solid #111;margin-top:9px}',
 '.party-grid section{padding:9px 11px;min-width:0;overflow-wrap:anywhere}.party-grid section+section{border-left:1px solid #111}',
 '.section-title{font:bold 10px Arial;border-bottom:1px solid #aaa;padding-bottom:4px;margin-bottom:7px;letter-spacing:.4px}',
 '.party-name{font:800 15px Arial;margin-bottom:7px}.address-title{font:bold 9px Arial;color:#333;margin-bottom:2px}',
 '.address{font:bold 11px/1.4 Arial;white-space:pre-wrap;min-height:24px}.address i{font-weight:400;color:#555}',
 '.ref-line{display:grid;grid-template-columns:92px 1fr;gap:7px;padding:3px 0;border-bottom:1px solid #ddd;overflow-wrap:anywhere}',
 '.ref-line span{font:800 9px Arial}.ref-line b{font:800 11px Arial}',
 '.section-heading{font:bold 10px Arial;letter-spacing:.4px;margin:11px 0 5px}',
 'table{width:100%;border-collapse:collapse;table-layout:fixed;font:10px/1.25 Arial}',
 'td,th{border:1px solid #111;padding:8px 5px;vertical-align:top;overflow-wrap:anywhere;white-space:pre-wrap}',
 'th{font:800 8px Arial;text-align:center;background:#fff}.desc{font-weight:700}.center{text-align:center}.strong{font-weight:800}',
 '.metrics{grid-template-columns:repeat(5,minmax(0,1fr));margin-top:10px}.metrics .meta-cell{text-align:center}',
 '.metrics .meta-cell strong{font:bold 17px Arial}.legacy-metrics{grid-template-columns:repeat(4,1fr)}',
 '.footer{margin-top:8px}.remarks{border:1px solid #111;padding:7px 9px;min-height:32px}',
 '.remarks span{display:block;font-size:8px;font-weight:800;margin-bottom:4px}.remarks b{display:block;white-space:pre-wrap}',
 '.signatures{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:24px}',
 '.signatures>div{border-top:1px solid #111;padding-top:5px;font:800 9px Arial}.signatures strong{display:block;font-size:10px;margin-top:4px}',
 '.disclaimer{border-top:1px solid #ccc;margin-top:12px;padding:5px 0;font:bold 8px Arial;letter-spacing:.2px}',
 '@media print{.sheet{break-inside:avoid}html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}'
 ].join('');
 const html='<!doctype html><html><head><meta charset="utf-8"><title>'+printSafe(r.slipNo)+'</title>'+
 '<style>'+css+'</style></head><body><main class="sheet">'+head+refs+party+tab+metrics+tail+
 '</main><script>addEventListener("load",function(){focus();print()})<\/script></body></html>';
 w.document.open();w.document.write(html);w.document.close();
}
function previewFromWorkOrder(){
 const row=current();
 if(!row){say('Choose a Work Order to preview the Packing Slip.',true);return}
 const history=forWork(row.workNo);
 const prev=shipped(history)+(legacy(row)&&!history.length?(Number($('packSlipPrior')?.value)||0):0);
 const n=Number($('packSlipThis')?.value)||0;
 const ordered=Number(row.orderQty)||0;
 printSlip(true,{
  draft:true,slipNo:'PREVIEW ONLY',workNo:row.workNo,party:row.party,
  partyAddress:String($('packSlipPartyAddress')?.value||'').trim(),
  poNo:row.poNo,poDate:field(row,['poDate','purchaseOrderDate']),
  customerItemNo:packingWOFields(row).customerItemNo,
  efpplCode:packingWOFields(row).efpplCode,
  size:packingWOFields(row).size,micron:packingWOFields(row).micron,
  description:packingWOFields(row).description,description2:packingWOFields(row).description2,
  orderQty:ordered,previousDispatched:prev,thisDispatched:n,
  totalDispatched:prev+n,balanceAfter:ordered-prev-n,createdAt:new Date().toISOString(),
  notes:$('packSlipRemarks')?.value||'',operator:'',source:'DRAFT — READ ONLY'
 });
}
function printCartonLabel(record=null){
 const r=record||verifiedSlip;if(!r){say('Select a saved Packing Slip or confirm dispatch first.',true);return}
 // V404: Use one clear 4×4 label preview for confirmed/reprint records.
 // Label preview NEVER records another shipment or changes production data.
 if(window.CFM_PACKING_LABEL_V404?.open){
  const wo=remote?.payload?.pending?.find(x=>up(x.workNo)===up(r.workNo)&&up(x.party)===up(r.party)&&up(x.poNo)===up(r.poNo));
  window.CFM_PACKING_LABEL_V404.open(r,wo||{});return;
 }
 const w=window.open('','_blank');if(!w){say('Enable pop-ups for Packing Label print.',true);return}
 const header='<header><div class="mark">'+logoHtml('#000',70,55)+'</div><div>'+originalWordmarkHtml()+'<small>FILTRATION PRODUCT PVT. LTD.</small></div>'+
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
 '@page{size:101.6mm 101.6mm;margin:0}*{box-sizing:border-box}html,body{width:101.6mm;height:101.6mm;margin:0;font-family:Arial,sans-serif;color:#111;background:#fff}',
 '.label{width:101.6mm;height:101.6mm;padding:4mm;overflow:hidden}.sheet{border:1px solid #111;padding:2mm;height:100%}',
 'header{display:flex;align-items:center;gap:2mm;border-bottom:2px solid #111;padding-bottom:1mm;margin-bottom:2mm}',
 '.mark svg{width:15mm;height:11mm}header .eagle-wordmark{display:block;width:78px;height:17px}header small{display:block;font:bold 7px Arial}',
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
 '#packSlipDialog .pack-wo-fields{border:1px solid #bfd6e8;background:#eef7fd;border-radius:8px;padding:10px;margin-top:8px;font:600 11px/1.6 Arial;color:#1b4565}'+
 '#packSlipDialog .packdesc,#packSlipDialog .warning{font-size:12px;line-height:1.5}#packSlipDialog .warning{color:#a12626;font-weight:700}'+
 '#packSlipDialog .entry{border-bottom:1px solid #d6e2ed;padding:8px 0;font-size:12px}#packSlipDialog .entry small{display:block;color:#527083;margin-top:3px}'+
 '#packSlipDialog .pfoot{position:sticky;bottom:0;background:#fff;border-top:1px solid #d3e2ee;padding:10px;display:flex;gap:7px;flex-wrap:wrap}'+
 '#packSlipMsg{font-size:12px;line-height:1.5;padding:8px 12px}'+
 '#packSlipHistory .pack-delete-row{background:#fff1f1!important;border-color:#e7a3a3!important;color:#a52b32!important;margin-left:4px}'+
 '@media(max-width:680px){#packSlipDialog .pbody{grid-template-columns:1fr;padding:9px}}';
 document.head.append(style);
 const d=document.createElement('dialog');d.id='packSlipDialog';
 d.innerHTML='<div class="phead"><div><strong>PACKING SLIP · DISPATCH BALANCE</strong><div style="font-size:11px">Cloud verified · Qty history · Work Order-wise</div></div><button id="packSlipClose">✕ Close</button></div>'+
 '<div class="pbody"><div><label>Work Order<select id="packSlipWO"><option value="">Select Work Order</option></select></label><button id="packSlipReload">↻ Refresh Cloud</button>'+
 '<label>Ship-to / Party Address *<textarea id="packSlipPartyAddress" rows="3" placeholder="Auto from Work Order; otherwise exact customer PO shipping address" spellcheck="false"></textarea></label>'+
 '<label>THIS Dispatch Qty (actual nos)<input id="packSlipThis" type="number" min="1" step="1" placeholder="Qty sent today"></label>'+
 '<div id="packSlipBaselineWrap" hidden><label>Earlier Dispatched Qty (verify old dispatch)<input id="packSlipPrior" type="number" min="0" step="1" placeholder="Enter from old challan; 0 only if none"></label></div>'+
 '<label>Dispatch Remark / LR (optional)<input id="packSlipRemarks" placeholder="Courier / LR / dispatch notes"></label>'+
 '<p style="font-size:11px">Save only after goods are actually sent. Printing an old slip does not create another dispatch record. Order, cutting and stock remain unchanged.</p>'+
 '</div><div><div id="packSlipSummary">Select Work Order.</div><div id="packSlipHistory" style="margin-top:10px;max-height:220px;overflow:auto"></div></div></div>'+
 '<div id="packSlipMsg" role="status">Load live Cloud to begin.</div>'+
 '<div class="pfoot"><button id="packSlipDeleteOne" type="button">🗑 Delete Single</button><button id="packSlipDeleteAll" type="button">🗑 Delete All Demo Slips</button><button id="packSlipPreview">👁 A4 Preview (No Save)</button><button id="packSlipSave" class="action">✓ Save Actual Dispatch Qty</button><button id="packSlipPrint" disabled>👁 Saved Slip Preview</button><button id="packSlipA4" disabled>🖨 A4 Landscape Preview & Print</button><button id="packSlipCarton" disabled>📦 Print Packing Label 4×4</button></div>';
 document.body.append(d);
 $('packSlipClose').onclick=()=>d.close();
 $('packSlipDeleteOne').onclick=()=>deletePackingSlips(false);
 $('packSlipDeleteAll').onclick=()=>deletePackingSlips(true);
 // Reprint saved history without creating a second shipment or touching stock.
 $('packSlipHistory').onclick=e=>{
  const b=e.target?.closest?.('button[data-pack-id]');
  if(!b)return;
  const item=slips().find(x=>String(x.id)===String(b.dataset.packId));
  if(!item){say('Slip not present in live Cloud history. Refresh first.',true);return}
  if(b.dataset.kind==='delete'){deletePackingSlips(false,String(item.id));return}
  if(b.dataset.kind==='carton')printCartonLabel(item);
  else printSlip(true,item);
 };
 $('packSlipWO').onchange=()=>{$('packSlipThis').value='';$('packSlipPrior').value='';setOrderAddress();summary()};
 $('packSlipPartyAddress').oninput=summary;
 $('packSlipPreview').onclick=previewFromWorkOrder;
 $('packSlipReload').onclick=load;
 $('packSlipThis').oninput=summary;$('packSlipPrior').oninput=summary;
 $('packSlipSave').onclick=saveSlip;$('packSlipPrint').onclick=()=>printSlip(false);$('packSlipA4').onclick=()=>printSlip(true);$('packSlipCarton').onclick=()=>printCartonLabel();
}

// V405: Cloud-first item deletion. Never pre-save a local snapshot and then
// try to sync it: this caused a deleted slip to reappear when Cloud push failed.
// Atomic version check preserves every other Cloud field byte-for-byte.
async function deletePackingSlips(all,specificId=null){
 if(busy)return;
 if(!remote){say('Refresh Cloud before deleting.',true);return}
 const existing=slips();
 if(!existing.length){say('No saved Packing Slips found in verified Cloud.');return}
 let selected=[];
 if(all){selected=existing.slice()}
 else if(specificId!==null){
  const one=existing.find(x=>String(x.id)===String(specificId));
  if(!one){say('Selected slip no longer exists in Cloud history. Refresh.',true);return}
  selected=[one];
 }else{
  const wo=$('packSlipWO')?.value||'';
  const choices=existing.filter(x=>!wo||up(x.workNo)===up(wo));
  const input=prompt('Enter exact Cloud Packing Slip No.:\n'+choices.map(x=>x.slipNo||x.id).join('\n'));
  if(input===null)return;
  selected=choices.filter(x=>String(x.slipNo||'')===input.trim()||String(x.id)===input.trim());
  if(selected.length!==1){say('Slip number missing or ambiguous. Nothing deleted.',true);return}
 }
 const ids=selected.map(x=>String(x.id)),labels=selected.map(x=>String(x.slipNo||x.id));
 if(new Set(ids).size!==ids.length||ids.some(x=>!x)){say('Missing/duplicate Slip IDs. No deletion.',true);return}
 if(!confirm('DELETE '+ids.length+' Packing Slip(s) from LIVE Cloud?\n'+labels.join('\n')+
   '\nOnly selected slip ledger entries will be removed. Work Orders, Cutting, Stock and Dispatch status stay unchanged.'))return;
 if(!confirm('Final confirmation: delete exactly '+ids.length+' dummy/test Slip(s)?\n'+labels.join(', ')))return;
 if(typeof cloudFetch!=='function'||typeof cloudHeaders!=='function'||
    typeof CLOUD_URL==='undefined'||typeof safeStorage==='undefined'||
    typeof state==='undefined'||!cloudReady||cloudBusy||cloudDirty){
  say('Cloud/phone sync is not ready. Refresh Cloud and resolve pending sync before deleting. Nothing deleted.',true);return;
 }
 const mutationAtStart=localMutationSeq;
 busy=true;$('packSlipReload').disabled=true;
 let patched=false;
 try{
  const latest=await cloudFetch();
  if(!latest||!Number.isSafeInteger(Number(latest.version))||!Array.isArray(latest.payload?.pending))
   throw Error('Cloud snapshot could not be verified');
  if(Number(latest.version)!==Number(remote.version)||Number(latest.version)!==Number(cloudVersion))
   throw Error('Cloud has changed on another device. Press Refresh Cloud and try again');
  if(localMutationSeq!==mutationAtStart||cloudBusy||cloudDirty)
   throw Error('Another ERP save is in progress. Wait for Cloud Sync first');
  const live=Array.isArray(latest.payload.packingSlips)?latest.payload.packingSlips:[];
  const remaining=live.filter(x=>!ids.includes(String(x.id)));
  if(live.length-remaining.length!==ids.length)
   throw Error('Selected slip already changed/removed on Cloud. Refresh before retrying');
  const deletedIds=[...new Set([...(Array.isArray(latest.payload.packingSlipDeletedIds)?latest.payload.packingSlipDeletedIds:[]).map(String),...ids])];
  // Download a complete pre-delete Cloud history backup.
  const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),cloudVersion:latest.version,packingSlips:live},null,2)],{type:'application/json'});
  const backupUrl=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=backupUrl;a.download='CFM-Packing-Slips-Before-Delete-'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(backupUrl),30000);
  const nextVersion=Number(latest.version)+1;
  const nextPayload={...latest.payload,packingSlips:remaining,packingSlipDeletedIds:deletedIds};
  cloudBusy=true;
  let response;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  try{
   response=await fetch(CLOUD_URL+'/rest/v1/cfm_shared_state?id=eq.main&version=eq.'+latest.version,{
    method:'PATCH',signal:controller.signal,
    headers:{...cloudHeaders(),'Prefer':'return=representation','x-cfm-base-version':String(latest.version)},
    body:JSON.stringify({payload:nextPayload,version:nextVersion,updated_at:new Date().toISOString()})
   });
  }finally{clearTimeout(timer)}
  if(!response.ok)throw Error('Cloud rejected Slip deletion (HTTP '+response.status+'). No local history has been changed');
  const acknowledgment=await response.json();
  if(!Array.isArray(acknowledgment)||acknowledgment.length!==1||
     Number(acknowledgment[0].version)!==nextVersion)
   throw Error('No atomic Cloud acknowledgment. Refresh to check whether deletion completed');
  patched=true;
  const confirmed=await cloudFetch();
  if(!confirmed||!Array.isArray(confirmed.payload?.packingSlips)||
     ids.some(id=>confirmed.payload.packingSlips.some(x=>String(x.id)===id))||
     ids.some(id=>!(confirmed.payload.packingSlipDeletedIds||[]).map(String).includes(id)))
   throw Error('Cloud receipt failed recheck. Refresh Cloud; do NOT repeat delete blindly');
  remote=confirmed;
  // Update local cache AFTER the committed Cloud snapshot is independently checked.
  // Never call save() here: save() queues a second upload of stale local data.
  state.packingSlips=confirmed.payload.packingSlips.slice();
  state.packingSlipDeletedIds=(confirmed.payload.packingSlipDeletedIds||[]).slice();
  cloudVersion=Number(confirmed.version);
  cloudUpdatedAt=confirmed.updated_at||new Date().toISOString();
  if(localMutationSeq===mutationAtStart)cloudDirty=false;
  try{safeStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
  catch(e){console.warn('Cloud delete confirmed but device storage full',e)}
  verifiedSlip=null;
  summary();
  setCloudBadge('☁️ Slip deletion verified · Cloud LIVE','green');
  say('✓ CLOUD VERIFIED: '+labels.join(', ')+' permanently removed from Packing Slip History. Backup downloaded.');
 }catch(e){
  say((patched?'Cloud received the delete request. ':'Delete NOT confirmed. ')+String(e.message||e)+
    ' · Press Refresh Cloud to verify; never assume deletion succeeded.',true);
 }finally{
  cloudBusy=false;busy=false;$('packSlipReload').disabled=false;
 }
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