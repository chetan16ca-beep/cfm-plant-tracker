/* CFM V409 — No Work Order Packing Slip (read-only preview + Cloud-confirmed save).
 * Independent manually registered PO/Item master, with item-wise partial dispatch.
 * Single A4 Landscape Slip + bundle-specific 4-inch labels (V407 renderer).
 * Does not create Work Orders or alter Cutting, Store, Dispatch Done, or physical stock.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const str=x=>String(x??'').trim(),key=x=>str(x).toUpperCase();
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>str(x)!==''&&Number.isSafeInteger(Number(x))&&Number(x)>=0?Number(x):null;
const positive=x=>Number.isSafeInteger(Number(x))&&Number(x)>0?Number(x):null;
const uuid=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'manual-'+Date.now()+'-'+Math.random().toString(36).slice(2);
let snap=null,busy=false,lines=[],lastSaved=null;
const msg=(text,error=false)=>{const el=$('cfm409Message');if(el){el.textContent=text;el.style.color=error?'#a32c30':'#18566e'}};
const rows=()=>Array.isArray(snap?.payload?.packingManualOrders)?snap.payload.packingManualOrders:[];
const slips=()=>Array.isArray(snap?.payload?.packingSlips)?snap.payload.packingSlips:[];
const label=x=>str(x)||'—';
const sendHistory=(id,log=slips())=>log.reduce((total,receipt)=>{
 if(!Array.isArray(receipt.items))return total;
 const item=receipt.items.find(i=>str(i.manualOrderId)===str(id));
 return total+(item?Number(item.qty)||0:0);
},0);
const sameParty=(a,b)=>key(a)===key(b);
const identity=r=>[key(r.party),key(r.poNo),key(r.poLine),key(r.customerItemNo),key(r.efpplCode),key(r.description)].join('|');
function parties(){
 const fromWO=(snap?.payload?.pending||[]).map(x=>str(x.party));
 const all=[...new Set([...fromWO,...rows().map(x=>str(x.party))].filter(Boolean))].sort();
 const list=$('cfm409Parties');if(list)list.innerHTML=all.map(x=>'<option value="'+esc(x)+'"></option>').join('');
}
function existingOptions(){
 const party=str($('cfm409Party')?.value),sel=$('cfm409Existing');if(!sel)return;
 sel.innerHTML='<option value="">Select previously entered PO / Item</option>'+
 rows().filter(x=>sameParty(x.party,party)).map(x=>{
  const already=lines.some(a=>a.order.id===x.id);
  const pending=Number(x.orderQty)-sendHistory(x.id);
  return '<option value="'+esc(x.id)+'" '+(already||pending<=0?'disabled':'')+'>'+esc(x.poNo)+' · '+esc(x.efpplCode||x.customerItemNo||x.description)+' · Pending '+Math.max(0,pending)+'</option>';
 }).join('');
}
function defaultBundles(qty,count){
 if(!positive(qty)||!positive(count)||count>qty)return Array(count).fill('');
 const base=Math.floor(qty/count),rem=qty%count;
 return Array.from({length:count},(_,i)=>String(base+(i<rem?1:0)));
}
function rememberInputs(){
 const parent=$('cfm409Lines');if(!parent)return;
 for(const tr of parent.querySelectorAll('tr[data-manual-id]')){
  const entry=lines.find(x=>x.order.id===tr.dataset.manualId);if(!entry)continue;
  entry.shipQty=tr.querySelector('[data-send]')?.value||'';
  entry.count=tr.querySelector('[data-count]')?.value||'1';
  entry.bundleQtys=[...tr.querySelectorAll('[data-bundle-qty]')].map(x=>x.value);
  entry.verified=!!tr.querySelector('[data-verified]')?.checked;
 }
}
function renderBundles(tr,restore=false){
 const row=lines.find(x=>x.order.id===tr.dataset.manualId);if(!row)return;
 const n=positive(tr.querySelector('[data-count]')?.value),q=positive(tr.querySelector('[data-send]')?.value);
 const place=tr.querySelector('[data-bundles]'),check=tr.querySelector('[data-verified-wrap]');
 if(!n||n>200){place.textContent='Choose 1–200 bundles';check.hidden=true;return}
 const portions=restore&&Array.isArray(row.bundleQtys)&&row.bundleQtys.length===n?
  row.bundleQtys:defaultBundles(q,n);
 place.innerHTML=portions.map((x,i)=>'<label>Bundle '+(i+1)+' Qty (Nos)<input type="number" min="1" step="1" data-bundle-qty value="'+esc(x)+'" '+(n===1?'readonly':'')+'></label>').join('');
 check.hidden=n===1;check.querySelector('input').checked=!!(restore&&row.verified);
}
function itemRow(x){
 const o=x.order,prev=sendHistory(o.id),pending=Math.max(0,Number(o.orderQty)-prev);
 const m=window.CFM_PACKING_WO_FIELDS_V405?.(o)||{};
 return '<tr data-manual-id="'+esc(o.id)+'"><td>'+
 '<b>'+esc(o.poNo)+'</b><small>PO Line: '+esc(label(o.poLine))+'</small>'+
 '<small>'+esc(label(o.efpplCode))+'</small><small>'+esc(label(o.customerItemNo))+'</small>'+
 '<small>'+esc(o.description)+'</small><small>'+esc(o.description2||'')+'</small></td>'+
 '<td>'+esc(o.orderQty)+'</td><td>'+prev+'</td><td class="cfm409-pending">'+pending+'</td>'+
 '<td><input data-send type="number" min="1" step="1" placeholder="Today Qty" aria-label="Today dispatch quantity" value="'+esc(x.shipQty||'')+'"></td>'+
 '<td><input data-count type="number" min="1" max="200" step="1" value="'+esc(x.count||1)+'" aria-label="Bundle Count">'+
 '<div data-bundles class="cfm409-qtys"></div>'+
 '<label data-verified-wrap hidden><input type="checkbox" data-verified> Bundles physically checked</label></td>'+
 '<td><button type="button" data-remove="'+esc(o.id)+'" title="Remove from this draft only">✕</button></td></tr>';
}
function renderLines(){
 const body=$('cfm409Lines');if(!body)return;
 rememberInputs();
 body.innerHTML=lines.map(itemRow).join('')||'<tr><td colspan="7">Add one or more items from the same company. No Work Order is needed.</td></tr>';
 for(const tr of body.querySelectorAll('tr[data-manual-id]'))renderBundles(tr,true);
 existingOptions();summary();
}
function summary(){
 const sum=lines.reduce((acc,l)=>{
  const tr=[...$('cfm409Lines').querySelectorAll('tr[data-manual-id]')].find(x=>x.dataset.manualId===l.order.id);
  if(!tr)return acc;
  acc.qty+=positive(tr.querySelector('[data-send]')?.value)||0;
  acc.bundles+=positive(tr.querySelector('[data-count]')?.value)||0;return acc;
 },{qty:0,bundles:0});
 const e=$('cfm409Summary');if(e)e.textContent=lines.length+' PO item(s) · This Dispatch '+sum.qty+' Nos · '+sum.bundles+' Bundle Labels';
}
function addExisting(){
 const id=$('cfm409Existing')?.value,record=rows().find(x=>x.id===id);
 if(!record){msg('Select a saved manual PO item first.',true);return}
 if(!sameParty(record.party,$('cfm409Party')?.value)){msg('Choose items from the same Company only.',true);return}
 if(lines.some(x=>x.order.id===record.id)){msg('This PO item has already been selected.',true);return}
 if(Number(record.orderQty)-sendHistory(record.id)<=0){msg('This item has no pending quantity.',true);return}
 lines.push({order:record,newOrder:false});renderLines();
 if(!$('cfm409Address').value&&record.partyAddress)$('cfm409Address').value=record.partyAddress;
 msg('Added saved PO item '+record.poNo+'.');
}
function addNew(){
 const get=id=>str($(id)?.value),party=get('cfm409Party');
 const entry={
  id:uuid(),manualNoWO:true,party,partyAddress:get('cfm409Address'),
  poNo:get('cfm409PO'),poLine:get('cfm409POLine'),poDate:get('cfm409PODate'),
  customerItemNo:get('cfm409CustomerItem'),efpplCode:get('cfm409EFPPL'),
  description:get('cfm409Description'),description2:get('cfm409Specs'),
  size:get('cfm409Size'),micron:get('cfm409Micron'),orderQty:num(get('cfm409OrderQty')),
  createdAt:new Date().toISOString(),source:'MANUAL PO ITEM · WITHOUT WORK ORDER'
 };
 if(!entry.party||!entry.poNo||!entry.description||!entry.orderQty||entry.orderQty<1){
  msg('Company, PO Number, Product Description and Order Qty are required.',true);return
 }
 const duplicate=[...rows(),...lines.map(x=>x.order)].some(x=>identity(x)===identity(entry));
 if(duplicate){msg('This Company / PO / item is already registered. Select that saved item to use its pending balance. Use PO Line No. for a genuinely separate line.',true);return}
 if(lines.some(x=>!sameParty(x.order.party,entry.party))){msg('Select only one Company in one Packing Slip.',true);return}
 lines.push({order:entry,newOrder:true});renderLines();
 for(const id of ['cfm409PO','cfm409POLine','cfm409PODate','cfm409CustomerItem','cfm409EFPPL','cfm409Description','cfm409Specs','cfm409Size','cfm409Micron','cfm409OrderQty'])$(id).value='';
 msg('New PO Item added to draft. It will be saved to Cloud only with your confirmed shipment.');
}
function collect(){
 if(!snap||!Array.isArray(snap.payload?.pending))throw Error('Refresh verified Cloud before Packing Slip.');
 const party=str($('cfm409Party').value),address=str($('cfm409Address').value);
 if(!party||!address)throw Error('Company and verified Ship-to / Delivery Address are required.');
 if(!lines.length)throw Error('Add at least one PO / Item before creating the Slip.');
 const knownAddresses=lines.map(x=>str(x.order.partyAddress)).filter(Boolean);
 if(knownAddresses.some(x=>key(x)!==key(address)))throw Error('Different Ship-to Addresses detected. Make separate Slips for separate destinations.');
 const items=[],bundleDetails=[],newOrders=[];
 for(let idx=0;idx<lines.length;idx++){
  const row=lines[idx],order=row.order;
  if(!sameParty(order.party,party))throw Error('The Slip contains items from different Companies.');
  const tr=[...$('cfm409Lines').querySelectorAll('tr[data-manual-id]')].find(x=>x.dataset.manualId===order.id);
  if(!tr)throw Error('PO item '+order.poNo+' is missing from the form.');
  const amount=positive(tr.querySelector('[data-send]').value);
  const count=positive(tr.querySelector('[data-count]').value);
  const ordered=positive(order.orderQty),previous=sendHistory(order.id);
  const pending=(ordered||0)-previous;
  if(!amount||amount>pending)throw Error('PO '+order.poNo+': enter This Dispatch Qty between 1 and Pending '+pending+'.');
  if(!count||count>200||count>amount)throw Error('PO '+order.poNo+': Bundle count must be 1–200, not more than Dispatch Qty.');
  const bundleQtys=[...tr.querySelectorAll('[data-bundle-qty]')].map(input=>positive(input.value));
  if(bundleQtys.length!==count||bundleQtys.some(x=>!x)||bundleQtys.reduce((sum,x)=>sum+x,0)!==amount)
   throw Error('PO '+order.poNo+': physical Bundle quantities must total exactly '+amount+'.');
  if(count>1&&!tr.querySelector('[data-verified]').checked)
   throw Error('PO '+order.poNo+': confirm physically checked Bundle quantities.');
  if(row.newOrder)newOrders.push(order);
  items.push({
   manualOrderId:order.id,manualNoWO:true,workNo:'NOT ISSUED',
   poNo:order.poNo,poLine:order.poLine,poDate:order.poDate,
   customerItemNo:order.customerItemNo,efpplCode:order.efpplCode,
   description:order.description,description2:order.description2,
   size:order.size,micron:order.micron,orderQty:ordered,
   previousDispatched:previous,manualPreviousBaseline:0,
   qty:amount,thisDispatched:amount,totalDispatched:previous+amount,balanceAfter:pending-amount,
   bundleQtys
  });
  for(const qty of bundleQtys)bundleDetails.push({itemIndex:idx,qty});
 }
 if(bundleDetails.length>200)throw Error('Maximum 200 Bundle Labels per Packing Slip.');
 return {party,address,items,bundleDetails,newOrders};
}
function draftRecord(data){
 const sum=k=>data.items.reduce((a,x)=>a+(Number(x[k])||0),0);
 return {
  id:'',draft:true,manualNoWO:true,
  slipNo:'PREVIEW ONLY',workNo:'NO WORK ORDER',
  party:data.party,partyAddress:data.address,
  poNo:data.items.length===1?data.items[0].poNo:'MULTIPLE POs',
  poDate:data.items.length===1?data.items[0].poDate:'',
  customerItemNo:data.items.length===1?data.items[0].customerItemNo:'',
  efpplCode:data.items.length===1?data.items[0].efpplCode:'',
  description:data.items.length===1?data.items[0].description:'',
  description2:data.items.length===1?data.items[0].description2:'',
  size:data.items.length===1?data.items[0].size:'',
  micron:data.items.length===1?data.items[0].micron:'',
  orderQty:sum('orderQty'),previousDispatched:sum('previousDispatched'),
  thisDispatched:sum('qty'),totalDispatched:sum('totalDispatched'),balanceAfter:sum('balanceAfter'),
  items:data.items,bundleDetails:data.bundleDetails,
  bundleCount:data.bundleDetails.length,packages:data.bundleDetails.length,
  bundleQtys:data.bundleDetails.map(x=>x.qty),
  createdAt:new Date().toISOString(),notes:str($('cfm409Remarks')?.value),
  operator:'',source:'NO-WORK-ORDER DRAFT · NOT DISPATCHED'
 };
}
function preview(){
 try{
  const record=draftRecord(collect());
  if(typeof window.CFM_PACK_COMBINED_V407?.open!=='function')throw Error('Combined A4 Packing Slip Print is not ready. Refresh ERP.');
  window.CFM_PACK_COMBINED_V407.open(record,{workOrder:{}});
  msg('Draft preview shown · not saved · bundle and pending values checked.');
 }catch(e){msg(String(e.message||e),true)}
}
function serial(log,deleted){
 return Math.max(0,...[...log,...deleted].map(x=>Number(String(x.slipNo||'').match(/^PK\/NOWO\/(\d+)$/)?.[1]||0)))+1;
}
function downloadBackup(s){
 const data={exportedAt:new Date().toISOString(),source:'CFM no-work-order Packing Master',version:s.version,
  packingManualOrders:s.payload.packingManualOrders||[],packingSlips:s.payload.packingSlips||[]};
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='CFM-Manual-Packing-Backup-'+new Date().toISOString().slice(0,10)+'.json';
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
async function updateCloud(transform,confirmedCheck){
 if(typeof cloudFetch!=='function'||typeof cloudHeaders!=='function'||typeof CLOUD_URL==='undefined'||
    typeof state==='undefined'||!cloudReady||cloudBusy||cloudDirty)
  throw Error('Cloud is not ready / another ERP sync is pending. Sync and refresh before saving.');
 const seq=localMutationSeq,latest=await cloudFetch();
 if(!latest||!Array.isArray(latest.payload?.pending)||!Number.isSafeInteger(Number(latest.version)))
  throw Error('Cannot verify current Cloud snapshot.');
 if(!snap||Number(latest.version)!==Number(snap.version)||Number(latest.version)!==Number(cloudVersion)||
    localMutationSeq!==seq||cloudBusy||cloudDirty)
  throw Error('Cloud changed. Refresh and check all quantities again.');
 if(JSON.stringify(latest.payload.packingSlips||[])!==JSON.stringify(state.packingSlips||[]))
  throw Error('Local and Cloud Packing Slips differ. Sync before saving.');
 const nextPayload=transform(latest);
 cloudBusy=true;
 let accepted=false;
 try{
  const base=Number(latest.version),control=new AbortController(),timer=setTimeout(()=>control.abort(),20000);
  let response;
  try{
   response=await fetch(CLOUD_URL+'/rest/v1/cfm_shared_state?id=eq.main&version=eq.'+base,{
    method:'PATCH',signal:control.signal,
    headers:{...cloudHeaders(),'Prefer':'return=representation','x-cfm-base-version':String(base)},
    body:JSON.stringify({payload:nextPayload,version:base+1,updated_at:new Date().toISOString()})
   });
  }finally{clearTimeout(timer)}
  if(!response.ok)throw Error('Cloud rejected packing update HTTP '+response.status);
  const receipt=await response.json();
  if(!Array.isArray(receipt)||receipt.length!==1||Number(receipt[0].version)!==base+1)
   throw Error('Cloud update was not acknowledged. Refresh before trying again.');
  accepted=true;
  const verified=await cloudFetch();
  if(!confirmedCheck(verified))throw Error('Cloud receipt could not be verified. Do not repeat the shipment blindly.');
  snap=verified;
  // Reconcile ONLY Packing Master and Slip ledgers; preserve Work Orders, Store, Cutting.
  state.packingManualOrders=(verified.payload.packingManualOrders||[]).slice();
  state.packingSlips=(verified.payload.packingSlips||[]).slice();
  state.packingSlipDeletedIds=(verified.payload.packingSlipDeletedIds||[]).slice();
  state.packingSlipDeletedRefs=(verified.payload.packingSlipDeletedRefs||[]).slice();
  cloudVersion=Number(verified.version);cloudUpdatedAt=verified.updated_at||new Date().toISOString();
  if(localMutationSeq===seq)cloudDirty=false;
  try{safeStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
  catch(e){console.warn('Cloud packing confirmed; device storage limited',e)}
  return verified;
 }catch(e){throw Error((accepted?'Cloud may have saved this record. ':'Nothing confirmed. ')+String(e.message||e))}
 finally{cloudBusy=false}
}
async function saveSlip(){
 if(busy)return;
 let data;
 try{data=collect()}catch(e){msg(String(e.message||e),true);return}
 const total=data.items.reduce((a,x)=>a+x.qty,0);
 if(!confirm('Confirm ACTUALLY SENT '+total+' Nos to '+data.party+' without a Work Order?\n'+
    data.items.length+' PO/Item(s) · '+data.bundleDetails.length+' physical Bundle(s).\nThis will create a Cloud Packing Slip, not a production Work Order.'))return;
 busy=true;$('cfm409Save').disabled=true;let receiptId='';
 try{
  let record;
  await updateCloud(latest=>{
   const existing=Array.isArray(latest.payload.packingManualOrders)?latest.payload.packingManualOrders:[];
   const log=Array.isArray(latest.payload.packingSlips)?latest.payload.packingSlips:[];
   const deleted=Array.isArray(latest.payload.packingSlipDeletedRefs)?latest.payload.packingSlipDeletedRefs:[];
   if(data.newOrders.some(o=>existing.some(e=>identity(e)===identity(o))))
    throw Error('This Manual PO/Item already exists on Cloud. Refresh and use saved item.');
   for(const item of data.items){
    const localOrder=data.newOrders.find(x=>x.id===item.manualOrderId);
    const master=localOrder||existing.find(x=>x.id===item.manualOrderId);
    if(!master||!sameParty(master.party,data.party))throw Error('PO item missing or changed on Cloud.');
    if(!localOrder&&JSON.stringify(master)!==JSON.stringify(rows().find(x=>x.id===master.id)))
     throw Error('Saved Manual PO Item changed on another device. Refresh.');
    const prior=sendHistory(item.manualOrderId,log);
    if(prior!==item.previousDispatched||prior+item.qty>Number(master.orderQty))
     throw Error('PO '+item.poNo+': pending Qty changed on Cloud. Refresh.');
   }
   record={...draftRecord(data),id:uuid(),draft:false,source:'MANUAL CONFIRMED NO-WO SHIPMENT',
    slipNo:'PK/NOWO/'+String(serial(log,deleted)).padStart(4,'0'),
    operator:typeof deviceLabel==='function'?deviceLabel():'CFM Operator'};
   receiptId=record.id;
   return {...latest.payload,packingManualOrders:[...existing,...data.newOrders],packingSlips:[...log,record]};
  },row=>!!row?.payload?.packingSlips?.some(x=>x.id===receiptId)&&data.newOrders.every(o=>(row.payload.packingManualOrders||[]).some(x=>x.id===o.id)));
  lastSaved=snap.payload.packingSlips.find(x=>x.id===receiptId);
  lines=[];renderLines();renderHistory();
  msg('✓ CLOUD SAVED: '+lastSaved.slipNo+' · Sent '+total+' Nos · Pending '+lastSaved.balanceAfter+' Nos · '+lastSaved.bundleCount+' Labels.');
 }catch(e){msg('⚠ '+String(e.message||e)+' Check Cloud History before retry.',true)}
 finally{busy=false;$('cfm409Save').disabled=false}
}
async function deleteSlip(id){
 if(busy)return;
 const selected=slips().find(x=>x.id===id&&x.manualNoWO);
 if(!selected){msg('Manual Slip not found. Refresh Cloud.',true);return}
 if(!confirm('Delete ONLY Manual Packing Slip '+selected.slipNo+' from Live Cloud?\nThis does not delete its Manual PO Item Master.'))return;
 if(!confirm('FINAL: permanently remove Slip '+selected.slipNo+'? A backup will be downloaded first.'))return;
 busy=true;
 try{
  await updateCloud(latest=>{
   const log=Array.isArray(latest.payload.packingSlips)?latest.payload.packingSlips:[];
   const hit=log.find(x=>x.id===id&&x.manualNoWO&&x.slipNo===selected.slipNo);
   if(!hit)throw Error('Slip changed on Cloud; cannot delete.');
   downloadBackup(latest);
   return {
    ...latest.payload,
    packingSlips:log.filter(x=>x.id!==id),
    packingSlipDeletedIds:[...(latest.payload.packingSlipDeletedIds||[]),id],
    packingSlipDeletedRefs:[...(latest.payload.packingSlipDeletedRefs||[]),
     {id,slipNo:selected.slipNo,workNo:'NO WORK ORDER',deletedAt:new Date().toISOString()}]
   };
  },row=>!!row?.payload&&!row.payload.packingSlips?.some(x=>x.id===id)&&
    (row.payload.packingSlipDeletedIds||[]).includes(id));
  renderLines();renderHistory();msg('✓ CLOUD VERIFIED: '+selected.slipNo+' deleted; Manual PO master retained.');
 }catch(e){msg('⚠ '+String(e.message||e),true)}
 finally{busy=false}
}
function renderHistory(){
 const party=str($('cfm409Party')?.value);
 const displayed=slips().filter(x=>x.manualNoWO&&(!party||sameParty(x.party,party))).slice(-30).reverse();
 $('cfm409History').innerHTML='<strong>☁ Cloud Manual Packing History</strong>'+
 (displayed.length?displayed.map(x=>'<div class="cfm409-history-row"><div><b>'+esc(x.slipNo)+'</b> · '+
 esc(x.party)+' · Sent '+esc(x.thisDispatched)+' · Balance '+esc(x.balanceAfter)+'<small>'+
 esc((x.createdAt||'').slice(0,10))+'</small></div><div>'+
 '<button type="button" data-reprint="'+esc(x.id)+'">🖨 Reprint Slip + Labels</button>'+
 '<button type="button" data-delete="'+esc(x.id)+'">🗑 Delete</button></div></div>').join(''):
 '<p>No manual No-WO slips in Cloud history for this company.</p>');
}
async function load(){
 if(busy)return;
 msg('Loading verified Cloud PO Items and shipment history…');
 try{
  if(typeof cloudFetch!=='function')throw Error('Cloud is unavailable');
  const fresh=await cloudFetch();
  if(!fresh||!Array.isArray(fresh.payload?.pending))throw Error('Cloud response invalid');
  snap=fresh;parties();
  lines=lines.filter(x=>x.newOrder||rows().some(y=>y.id===x.order.id));
  existingOptions();renderLines();renderHistory();
  msg('✓ Live Cloud verified · '+rows().length+' Manual PO Items · '+slips().filter(x=>x.manualNoWO).length+' No-WO Packing Slips');
 }catch(e){snap=null;msg('Cloud unavailable · no shipment can be saved. '+String(e.message||e),true)}
}
function open(){
 $('packSlipDialog')?.close();
 $('cfm409Dialog').showModal();load();
}
function mount(){
 if(!$('packSlipDialog'))return false;
 if($('cfm409Dialog'))return true;
 const opener=document.createElement('button');opener.type='button';opener.id='cfm409Open';
 opener.textContent='＋ Without Work Order · Manual Packing Slip';
 ($('cfm408Open')||$('packSlipWO').closest('label')||$('packSlipReload')).after(opener);
 opener.onclick=open;
 const d=document.createElement('dialog');d.id='cfm409Dialog';
 d.innerHTML='<div class="cfm409-head"><b>PACKING SLIP · WITHOUT WORK ORDER</b><button id="cfm409Close">✕ Close</button></div>'+
 '<div class="cfm409-content"><p>Create from Customer PO directly. Multiple PO items of ONE Company may share a Slip. Previous Qty and Pending Balance are Cloud-derived for each item; no Work Order or Stock movement is created.</p>'+
 '<div class="cfm409-company"><label>Company / Party *<input id="cfm409Party" list="cfm409Parties" placeholder="Enter exact company name" autocomplete="off"><datalist id="cfm409Parties"></datalist></label>'+
 '<label>Ship-to / Delivery Address *<textarea rows="2" id="cfm409Address" placeholder="Verify address against Customer PO"></textarea></label></div>'+
 '<div class="cfm409-add"><div><strong>Add saved Manual PO Item (Pending Balance)</strong><select id="cfm409Existing"><option>Select Company first</option></select><button id="cfm409AddExisting">＋ Add Saved Item</button></div>'+
 '<div><strong>Or Add NEW PO Item (No Work Order)</strong><div class="cfm409-fields">'+
 '<label>Customer PO No. *<input id="cfm409PO"></label>'+
 '<label>PO Line No.<input id="cfm409POLine"></label>'+
 '<label>PO Date<input id="cfm409PODate" type="date"></label>'+
 '<label>Customer Item Code<input id="cfm409CustomerItem"></label>'+
 '<label>EFPPL Item Code<input id="cfm409EFPPL" placeholder="Exact item code"></label>'+
 '<label>Product Name *<input id="cfm409Description"></label>'+
 '<label>Specification / Product Detail<input id="cfm409Specs"></label>'+
 '<label>Size<input id="cfm409Size"></label>'+
 '<label>Micron<input id="cfm409Micron"></label>'+
 '<label>Order Qty (Nos) *<input id="cfm409OrderQty" type="number" min="1" step="1"></label></div>'+
 '<button id="cfm409AddNew">＋ Add New PO Item</button></div></div>'+
 '<h3>Item-wise Dispatch and Pending Balance</h3><div class="cfm409-tablewrap"><table><thead><tr><th>PO / Item</th><th>Order</th><th>Previous Sent</th><th>Pending Before</th><th>This Dispatch</th><th>Bundles / Qty</th><th>Action</th></tr></thead><tbody id="cfm409Lines"></tbody></table></div>'+
 '<label>Remarks / LR<input id="cfm409Remarks" placeholder="Dispatch / Courier / LR notes (optional)"></label>'+
 '<div id="cfm409Summary" class="cfm409-summary">No items</div><div id="cfm409Message" role="status"></div>'+
 '<section class="cfm409-history" id="cfm409History"></section></div>'+
 '<div class="cfm409-footer"><button id="cfm409Refresh">↻ Refresh Cloud</button>'+
 '<button id="cfm409Preview">👁 Slip + Bundle Labels Preview</button>'+
 '<button id="cfm409Save">✓ Save Confirmed Dispatch</button>'+
 '<button id="cfm409Last">🖨 Reprint Last Saved</button></div>';
 document.body.appendChild(d);
 const css=document.createElement('style');css.id='cfm409Css';
 css.textContent='#cfm409Open{display:block;width:100%;margin:6px 0 12px!important;background:#edf9ef!important;color:#146341!important;border:1px solid #95c7ae!important;font-weight:800!important}'+
 '#cfm409Dialog{width:min(1240px,98vw);max-height:94dvh;overflow:auto;border:1px solid #b2cadc;border-radius:12px;padding:0;background:#fff;color:#17394f;font:12px/1.45 Arial}'+
 '#cfm409Dialog::backdrop{background:#112a4399}#cfm409Dialog *{box-sizing:border-box;font-family:Arial,sans-serif}'+
 '#cfm409Dialog .cfm409-head{position:sticky;top:0;z-index:5;display:flex;justify-content:space-between;align-items:center;padding:12px;background:#123f70;color:#fff}'+
 '#cfm409Dialog button{border:1px solid #aac7d8;border-radius:7px;padding:8px 11px;background:#fff;color:#135079;font:750 12px Arial;cursor:pointer}'+
 '#cfm409Dialog .cfm409-content{padding:13px}#cfm409Dialog p{font-size:12px}'+
 '#cfm409Dialog label{display:block;font-weight:700;font-size:11px;margin:4px 0}'+
 '#cfm409Dialog input:not([type=checkbox]),#cfm409Dialog textarea,#cfm409Dialog select{width:100%;border:1px solid #b9cad7;border-radius:6px;padding:8px;margin:4px 0;background:#fff;color:#143d60;font:12px Arial}'+
 '#cfm409Dialog .cfm409-company{display:grid;grid-template-columns:1fr 1.3fr;gap:12px}'+
 '#cfm409Dialog .cfm409-add{display:grid;grid-template-columns:1fr 2fr;gap:10px;margin:12px 0}'+
 '#cfm409Dialog .cfm409-add>div{border:1px solid #c3daeb;border-radius:10px;padding:10px;background:#f6faff}'+
 '#cfm409Dialog .cfm409-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px 9px}'+
 '#cfm409Dialog .cfm409-add strong{display:block;margin:2px 0 8px;color:#12456e}'+
 '#cfm409Dialog h3{font-size:15px;margin:10px 0}#cfm409Dialog .cfm409-tablewrap{overflow-x:auto}'+
 '#cfm409Dialog table{border-collapse:collapse;width:100%;min-width:1000px}'+
 '#cfm409Dialog th,#cfm409Dialog td{border:1px solid #b9d0df;padding:8px;vertical-align:top;text-align:left}'+
 '#cfm409Dialog th{background:#e7f2fa;font-weight:850}#cfm409Dialog td small{display:block;font-size:10px;margin-top:3px}'+
 '#cfm409Dialog td .cfm409-pending{font-weight:900;color:#b32236}'+
 '#cfm409Dialog .cfm409-qtys{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}'+
 '#cfm409Dialog .cfm409-qtys label{font-size:10px}#cfm409Dialog .cfm409-qtys input{padding:5px!important}'+
 '#cfm409Dialog .cfm409-summary{border:1px solid #b5e2c3;background:#e8f7ed;color:#1b5d3b;border-radius:8px;padding:12px;font-weight:800;margin:10px 0}'+
 '#cfm409Dialog #cfm409Message{font-size:12px;margin:10px 0}#cfm409Dialog .cfm409-history{border-top:1px solid #bcd1dd;padding-top:10px}'+
 '#cfm409Dialog .cfm409-history-row{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;border-bottom:1px solid #dfebf2;padding:8px 0}'+
 '#cfm409Dialog .cfm409-history-row small{display:block;font-size:10px;color:#607d90}'+
 '#cfm409Dialog .cfm409-history-row button[data-delete]{color:#9d1c2c;border-color:#e6b1b5}'+
 '#cfm409Dialog .cfm409-footer{position:sticky;bottom:0;z-index:5;display:flex;gap:7px;flex-wrap:wrap;padding:10px;background:#eaf3f9;border-top:1px solid #b6cddd}'+
 '#cfm409Save{background:#0b693f!important;color:#fff!important;border-color:#0b693f!important}'+
 '@media(max-width:750px){#cfm409Dialog .cfm409-company,#cfm409Dialog .cfm409-add{grid-template-columns:1fr}#cfm409Dialog .cfm409-fields{grid-template-columns:repeat(2,minmax(0,1fr))}}';
 document.head.appendChild(css);
 $('cfm409Close').onclick=()=>d.close();
 $('cfm409Refresh').onclick=load;
 $('cfm409Party').addEventListener('change',()=>{
  const p=str($('cfm409Party').value);
  if(lines.some(x=>!sameParty(x.order.party,p))){lines=[];renderLines()}
  existingOptions();renderHistory();
 });
 $('cfm409AddExisting').onclick=addExisting;$('cfm409AddNew').onclick=addNew;
 $('cfm409Lines').addEventListener('click',e=>{
  const btn=e.target.closest('button[data-remove]');if(!btn)return;
  rememberInputs();lines=lines.filter(x=>x.order.id!==btn.dataset.remove);renderLines();
 });
 $('cfm409Lines').addEventListener('input',e=>{
  if(e.target.matches('[data-count],[data-send]')){
   rememberInputs();
   renderBundles(e.target.closest('tr'));
  }
  if(e.target.matches('[data-bundle-qty]'))e.target.closest('tr').querySelector('[data-verified]').checked=false;
  rememberInputs();summary();
 });
 $('cfm409Preview').onclick=preview;$('cfm409Save').onclick=saveSlip;
 $('cfm409Last').onclick=()=>{if(!lastSaved){msg('Save a Manual Slip first, or choose one from Cloud History.',true);return}window.CFM_PACK_COMBINED_V407?.open(lastSaved,{workOrder:{}})};
 $('cfm409History').addEventListener('click',e=>{
  const re=e.target.closest('button[data-reprint]'),del=e.target.closest('button[data-delete]');
  if(re){
   const slip=slips().find(x=>x.id===re.dataset.reprint&&x.manualNoWO);
   if(!slip){msg('Slip not found in verified Cloud History.',true);return}
   window.CFM_PACK_COMBINED_V407?.open(slip,{workOrder:{}});return;
  }
  if(del)deleteSlip(del.dataset.delete)
 });
 renderLines();return true;
}
window.CFM_PACK_NO_WO_V409=Object.freeze({open,collect,draftRecord,sendHistory,serial,mount});
function init(){let attempts=0;const timer=setInterval(()=>{if(mount()||++attempts>85)clearInterval(timer)},400);mount()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();