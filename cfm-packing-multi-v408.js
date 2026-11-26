/* CFM V408 — One company's multiple POs + work orders on one packing slip.
 * Every item has an independent dispatch ledger and verified physical bundle allocation.
 * A print preview never saves. Cloud save never updates Stock or Work Order status.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const str=x=>String(x??'').trim(),key=x=>str(x).toUpperCase();
const pos=x=>Number.isSafeInteger(Number(x))&&Number(x)>0?Number(x):0;
const whole=x=>str(x)!==''&&Number.isSafeInteger(Number(x))&&Number(x)>=0?Number(x):null;
const field=(r,keys)=>{for(const k of keys){const v=r?.[k];if(v!==undefined&&v!==null&&str(v))return str(v)}return ''};
let snap=null,busy=false,lastSaved=null,transfer=null;
const mixed=()=>!!$('cfm408OneMixed')?.checked;
function msg(s,error=false){const e=$('cfm408Message');if(e){e.textContent=s;e.style.color=error?'#a42323':'#174c68'}}
function history(){return Array.isArray(snap?.payload?.packingSlips)?snap.payload.packingSlips:[]}
function linesFor(wo,slips=history()){
 return slips.filter(s=>key(s.workNo)===key(wo)||(Array.isArray(s.items)&&s.items.some(i=>key(i.workNo)===key(wo))));
}
function sent(wo,slips=history()){
 return linesFor(wo,slips).reduce((sum,s)=>{
  const line=Array.isArray(s.items)?s.items.find(i=>key(i.workNo)===key(wo)):null;
  if(line)return sum+(Number(line.qty)||0)+(Number(line.manualPreviousBaseline)||0);
  return sum+(Number(s.thisDispatched)||0)+(Number(s.manualPreviousBaseline)||0);
 },0);
}
function legacy(r){return !!r&&(key(r.status)==='DISPATCHED'||!!r.dispatchDoneAt||key(r.dispatchStatus)==='DISPATCHED'||!!r.dispatchDate||(r.dispatchQty!==''&&r.dispatchQty!=null&&Number(r.dispatchQty)>0))}
function mapped(row){return window.CFM_PACKING_WO_FIELDS_V405?.(row)||{}}
function allOrders(){return Array.isArray(snap?.payload?.pending)?snap.payload.pending:[]}
function company(){return key($('cfm408Company')?.value)}
function companyOrders(){return allOrders().filter(r=>key(r.party)===company())}
function addresses(rows){
 return [...new Set(rows.map(r=>field(r,['shipToAddress','deliveryAddress','dispatchAddress','partyAddress','customerAddress','consigneeAddress','address'])).filter(Boolean).map(str))];
}
function trOf(wo){return [...document.querySelectorAll('#cfm408Orders tr[data-work-no]')].find(x=>x.dataset.workNo===wo)}
function bundleInput(tr){
 const c=whole(tr.querySelector('[data-count]')?.value),n=pos(tr.querySelector('[data-send]')?.value);
 const target=tr.querySelector('[data-bundles]'),verify=tr.querySelector('[data-verify-wrap]');
 if(!c||c>200){target.textContent='Set 1–200 bundles';return}
 const parts=(c===1)?[n||'']:Array.from({length:c},(_,i)=>n>=c?Math.floor(n/c)+(i<(n%c)?1:0):'');
 target.innerHTML=parts.map((q,i)=>'<label>Bundle '+(i+1)+'<input data-bundle-qty type="number" min="1" step="1" value="'+esc(q)+'" '+(c===1?'readonly':'')+'></label>').join('');
 verify.hidden=c===1;
 tr.querySelector('[data-verified]').checked=false;
}
function render(){
 if(!snap)return;
 const firms=[...new Set(allOrders().map(r=>str(r.party)).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
 const e=$('cfm408Company'),old=e.value;
 e.innerHTML='<option value="">Select one company</option>'+firms.map(p=>'<option value="'+esc(p)+'">'+esc(p)+'</option>').join('');
 if(firms.some(p=>p===old))e.value=old;
 renderOrders();
}
function renderOrders(){
 const rows=companyOrders();
 const addrs=addresses(rows);
 const addressBox=$('cfm408Address'),addressScope=company();
 if(addressBox.dataset.addressScope!==addressScope||addressBox.dataset.addressEdited!=='1'){
  addressBox.dataset.addressScope=addressScope;addressBox.dataset.addressEdited='0';
  addressBox.value=addrs.length===1?addrs[0]:'';
 }
 $('cfm408Orders').innerHTML=rows.map(r=>{
  const m=mapped(r),ordered=pos(r.orderQty),previous=sent(r.workNo),baseline=legacy(r)&&!linesFor(r.workNo).length;
  const rest=Math.max(0,ordered-previous);
  return '<tr data-work-no="'+esc(r.workNo)+'"><td><input type="checkbox" data-select '+(!rest&&!baseline?'disabled':'')+'></td>'+
  '<td><b>'+esc(r.workNo)+'</b><small>PO '+esc(r.poNo||'—')+'</small><small>'+esc(m.efpplCode||'—')+'</small>'+
  '<small>'+esc(m.description||'')+'</small></td>'+
  '<td>'+ordered+'</td><td>'+previous+'</td><td><b data-pending>'+rest+'</b>'+
  (baseline?'<label>Earlier sent (verify)<input data-baseline type="number" min="0" step="1" placeholder="Required"></label>':'')+'</td>'+
  '<td><input data-send type="number" min="1" step="1" placeholder="Today qty" aria-label="Dispatch Qty '+esc(r.workNo)+'"></td>'+
  '<td><input data-count type="number" min="1" max="200" step="1" value="1" aria-label="Bundle count '+esc(r.workNo)+'">'+
  '<div class="cfm408-bundles" data-bundles></div><label data-verify-wrap hidden><input type="checkbox" data-verified> Checked physically</label></td></tr>';
 }).join('')||'<tr><td colspan="7">Choose a company to see its Work Orders.</td></tr>';
 [...$('cfm408Orders').querySelectorAll('tr[data-work-no]')].forEach(bundleInput);
 refreshTotals();
}
function refreshTotals(){
 let selected=0,qty=0,bundles=0,invalid=[];
 for(const tr of $('cfm408Orders').querySelectorAll('tr[data-work-no]')){
  const r=allOrders().find(x=>str(x.workNo)===tr.dataset.workNo);
  const previous=sent(tr.dataset.workNo),baselineElement=tr.querySelector('[data-baseline]');
  const baseline=baselineElement?whole(baselineElement.value):0;
  const rest=pos(r?.orderQty)-previous-(baseline??0);
  tr.querySelector('[data-pending]').textContent=baselineElement&&baseline===null?'VERIFY':String(Math.max(0,rest));
  if(!tr.querySelector('[data-select]').checked)continue;
  selected++;
  const amount=pos(tr.querySelector('[data-send]').value),n=pos(tr.querySelector('[data-count]').value);
  qty+=amount;bundles+=mixed()?0:n;
  if(!amount||amount>rest||baseline===null||(!mixed()&&(n<1||n>amount)))invalid.push(tr.dataset.workNo);
 }
 $('cfm408Totals').textContent=selected+' Work Orders selected · '+qty+' Nos this dispatch · '+(mixed()?(selected?'1 MIXED BUNDLE + 1 LABEL':'Select 2+ Work Orders for 1 mixed bundle'):bundles+' bundle labels')+(invalid.length?' · CHECK: '+invalid.join(', '):'');
}
function collect(){
 if(!snap)throw Error('Load live Cloud first.');
 const all=allOrders(),selected=[...$('cfm408Orders').querySelectorAll('tr[data-work-no]')].filter(tr=>tr.querySelector('[data-select]').checked);
 if(selected.length<2)throw Error('Select 2 or more Work Orders of the same company. For one Work Order use the normal Packing Slip.');
 const party=companyOrders()[0]?.party||'';
 const address=str($('cfm408Address').value);
 if(!address)throw Error('Verify Ship-to Address before saving or printing.');
 const chosen=selected.map(tr=>all.find(r=>str(r.workNo)===tr.dataset.workNo));
 if(chosen.some(r=>!r||key(r.party)!==company()))throw Error('Selected Work Orders are not from the same company.');
 if(chosen.some(r=>all.filter(x=>key(x.workNo)===key(r.workNo)).length!==1))throw Error('Duplicate Work Order number found in Cloud. Correct duplicate records before combined dispatch.');
 const known=addresses(chosen);
 if(known.length>1)throw Error('These Work Orders have different delivery addresses. Create separate slips per destination.');
 if(known.length===1&&key(known[0])!==key(address))throw Error('Ship-to differs from Work Orders. Verify the delivery address before combining.');
 let bundleDetails=[],items=[];
 for(let idx=0;idx<selected.length;idx++){
  const tr=selected[idx],r=chosen[idx],wo=str(r.workNo),prev=sent(wo),ordered=pos(r.orderQty),n=pos(tr.querySelector('[data-send]').value);
  const baselineInput=tr.querySelector('[data-baseline]');
  const baseline=baselineInput?whole(baselineInput.value):0;
  if(baseline===null)throw Error('Verify earlier dispatched quantity for '+wo+' (zero only if none was dispatched).');
  if(!n||!ordered||prev+baseline+n>ordered)throw Error(wo+': dispatch Qty is invalid or exceeds pending balance.');
  const count=mixed()?1:pos(tr.querySelector('[data-count]').value);
  const q=mixed()?[]:[...tr.querySelectorAll('[data-bundle-qty]')].map(e=>Number(e.value));
  if(!mixed()&&(!count||count>200||q.length!==count||q.some(x=>!Number.isSafeInteger(x)||x<=0)||q.reduce((a,b)=>a+b,0)!==n))
   throw Error(wo+': bundle quantities must add up exactly to this dispatch Qty '+n+'.');
  if(!mixed()&&count>1&&!tr.querySelector('[data-verified]').checked)throw Error(wo+': tick physically checked bundle quantities.');
  const m=mapped(r);
  items.push({workNo:wo,poNo:str(r.poNo),poDate:m.poDate||'',customerItemNo:m.customerItemNo||'',
   efpplCode:m.efpplCode||'',description:m.description||'',description2:m.description2||'',micron:m.micron||'',size:m.size||'',
   orderQty:ordered,previousDispatched:prev+baseline,manualPreviousBaseline:baseline,qty:n,thisDispatched:n,
   totalDispatched:prev+baseline+n,balanceAfter:ordered-prev-baseline-n,bundleQtys:q});
  if(!mixed())for(const amount of q)bundleDetails.push({itemIndex:idx,qty:amount});
 }
 let bundleContents=[];
 if(mixed()){
  if(!$('cfm408OneMixedVerified')?.checked)throw Error('Confirm all selected PO/WO materials are physically packed in the SAME bundle.');
  const allocations=items.map((item,itemIndex)=>({itemIndex,qty:item.qty}));
  const total=allocations.reduce((n,x)=>n+x.qty,0);
  if(!Number.isSafeInteger(total)||total<=0)throw Error('Mixed bundle quantity is invalid.');
  bundleContents=[{qty:total,items:allocations}];
  bundleDetails=[{itemIndex:0,qty:total}];
 }
 if(bundleDetails.length>200)throw Error('No more than 200 physical bundles in one print job.');
 return {party,address,items,bundleDetails,bundleContents};
}
function draftRecord(data){
 const dispatchMeta=window.CFM_PACK_META_V441?.read('cfm408Dialog')||{};
 const items=data.items,add=name=>items.reduce((a,i)=>a+(Number(i[name])||0),0);
 return {id:'',draft:true,slipNo:'PREVIEW ONLY',workNo:'MULTI',party:data.party,partyAddress:data.address,
  poNo:'MULTIPLE POs',orderQty:add('orderQty'),previousDispatched:add('previousDispatched'),
  thisDispatched:add('qty'),totalDispatched:add('totalDispatched'),balanceAfter:add('balanceAfter'),
  items,bundleDetails:data.bundleDetails,bundleContents:data.bundleContents||[],bundleCount:data.bundleDetails.length,packages:data.bundleDetails.length,
  bundleQtys:data.bundleDetails.map(x=>x.qty),createdAt:new Date().toISOString(),
  dispatchMeta,notes:str($('cfm408Remarks').value),source:'COMBINED DRAFT · NOT DISPATCHED',operator:''};
}
function preview(){
 try{
  const rec=draftRecord(collect());
  if(!window.CFM_PACK_COMBINED_V407?.open)throw Error('Bundle print module not available. Reload ERP.');
  window.CFM_PACK_COMBINED_V407.open(rec,{workOrder:{}});
 }catch(e){msg(String(e.message||e),true)}
}
function equivalent(a,b){
 return !!a&&!!b&&key(a.workNo)===key(b.workNo)&&key(a.party)===key(b.party)&&
 key(a.poNo)===key(b.poNo)&&String(a.orderQty)===String(b.orderQty)&&key(a.description)===key(b.description);
}
async function saveCombined(){
 if(busy)return;
 let data;
 try{data=collect()}catch(e){msg(String(e.message||e),true);return}
 if(!confirm('Confirm ACTUAL dispatch of '+data.items.reduce((a,x)=>a+x.qty,0)+' Nos from '+data.items.length+
  ' Work Orders of '+data.party+'?\nEach PO/WO quantity and physical bundle label will be recorded separately.'))return;
 if(typeof cloudFetch!=='function'||typeof window.CFM_DIRECT_PACK_APPEND_V436!=='function'||cloudBusy){
  msg('Database save unavailable or another save is running. Retry shortly.',true);return;
 }
 busy=true;$('cfm408Save').disabled=true;let record;
 try{
  const latest=await cloudFetch();
  if(!latest||!Array.isArray(latest.payload?.pending)||!Number.isSafeInteger(Number(latest.version)))
   throw Error('Live Cloud changed. Refresh and recheck all Work Order quantities.');
  const log=Array.isArray(latest.payload.packingSlips)?latest.payload.packingSlips:[];
  for(const item of data.items){
   const cloudRow=latest.payload.pending.find(r=>key(r.workNo)===key(item.workNo));
   const original=allOrders().find(r=>key(r.workNo)===key(item.workNo));
   if(!equivalent(original,cloudRow)||!!cloudRow.archived||JSON.stringify([original.status,original.dispatchDoneAt,original.dispatchQty])!==JSON.stringify([cloudRow.status,cloudRow.dispatchDoneAt,cloudRow.dispatchQty]))throw Error(item.workNo+': Work Order changed; refresh first.');
   const sentNow=sent(item.workNo,log);
   if(sentNow!==item.previousDispatched-item.manualPreviousBaseline||sentNow+item.manualPreviousBaseline+item.qty>pos(cloudRow.orderQty))
    throw Error(item.workNo+': pending Qty changed. Nothing saved.');
  }
  if(typeof window.CFM_PACK_UNIQUE_V414?.next!=='function')throw Error('Unique Slip number service missing. Refresh ERP V414.');
  const docNo=window.CFM_PACK_UNIQUE_V414.next(latest.payload);
  record={...draftRecord(data),id:typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'combined-'+Date.now()+'-'+Math.random().toString(36).slice(2),
   draft:false,slipNo:docNo.slipNo,packingSlipSerial:docNo.serial,source:'MANUAL CONFIRMED COMBINED SHIPMENT',
   operator:typeof deviceLabel==='function'?deviceLabel():''};
  const confirmed=await window.CFM_DIRECT_PACK_APPEND_V436(latest,record,docNo);
  snap=confirmed;lastSaved=record;window.CFM_PACK_META_V441?.clear('cfm408Dialog');render();
  msg('✓ CLOUD VERIFIED: '+record.slipNo+' · '+record.items.length+' Work Orders · This dispatch '+record.thisDispatched+
   ' Nos · Pending '+record.balanceAfter+' Nos · '+record.bundleCount+' Bundle Labels.');
 }catch(e){lastSaved=null;msg('⚠ '+String(e.message||e)+'. Do not duplicate dispatch until Cloud History is checked.',true)}
 finally{busy=false;$('cfm408Save').disabled=false}
}
async function load(){
 if(busy)return;
 msg('Loading current Cloud orders and packing history…');
 try{
  const s=await cloudFetch();
  if(!s||!Array.isArray(s.payload?.pending))throw Error('Cloud response invalid.');
  snap=s;render();
  if(transfer){
   const incoming=transfer;transfer=null;
   const matches=allOrders().filter(x=>key(x.workNo)===key(incoming.workNo));
   const selectedWO=matches.length===1?matches[0]:null; // full verified Cloud company name; never rely on truncated option text
   if(selectedWO){
    const companyInput=$('cfm408Company');
    const actual=[...companyInput.options].find(o=>key(o.value)===key(selectedWO.party));
    if(actual){companyInput.value=actual.value;renderOrders()}
    const tr=trOf(str(selectedWO.workNo));
    if(tr){
     tr.querySelector('[data-select]').checked=true;
     const amount=pos(incoming.qty);
     if(amount)tr.querySelector('[data-send]').value=String(amount);
     if(str(incoming.address)&&!$('cfm408Address').value)$('cfm408Address').value=str(incoming.address);
     bundleInput(tr);
    }
    $('cfm408OneMixed').checked=true;
    $('cfm408OneMixedVerified').checked=false;
    $('cfm408Dialog').classList.add('cfm408-one-mixed');
    refreshTotals();
    msg('Company and first Work Order loaded from Packing Slip. Tick another PO/WO of the SAME company, enter Dispatch Qty for each, verify one physical bundle, then Preview.');
   }else msg('Original Work Order was not found in current Cloud. Select company and verify before packing.',true);
  }else msg('Live Cloud verified · Select company, then 2 or more Work Orders.');
 }catch(e){snap=null;msg('Cloud unavailable: '+String(e.message||e),true)}
}
function openFor(params={}){
 const wo=st=>str(st);
 transfer=params?.workNo?{workNo:wo(params.workNo),party:wo(params.party),qty:params.qty,address:wo(params.address)}:null;
 $('packSlipDialog')?.close();
 $('cfm408Dialog').showModal();load();
}
function open(){openFor({})}
function mount(){
 if(!$('packSlipDialog'))return false;
 if($('cfm408Dialog'))return true;
 const btn=document.createElement('button');btn.type='button';btn.id='cfm408Open';btn.textContent='＋ Same Company · Multi PO / WO Slip';
 ($('packSlipWO')?.closest('label')||$('packSlipReload')).after(btn);
 btn.addEventListener('click',open);
 const d=document.createElement('dialog');d.id='cfm408Dialog';
 d.innerHTML='<div class="cfm408-head"><b>COMBINED PACKING SLIP · SAME COMPANY</b><button id="cfm408Close" type="button">✕ Close</button></div>'+
 '<div class="cfm408-body"><p>Multiple PO numbers & Work Orders, each with separate previous dispatch, today dispatch, pending balance and physical bundle labels. No mixing different companies.</p>'+
 '<label>Company <select id="cfm408Company"><option value="">Select company</option></select></label>'+
 '<label>Ship-to / Delivery Address *<textarea id="cfm408Address" rows="2" placeholder="Verified destination from Work Order / PO"></textarea></label>'+
 '<section id="cfm408MixedPanel" class="cfm408-mixed-panel"><label><input type="checkbox" id="cfm408OneMixed"> ONE PHYSICAL BUNDLE — same company, multiple PO / Work Orders, ONE packing slip + ONE label</label>'+
 '<p>Enter This Dispatch Qty separately against each WO. Bundle Qty = sum of those PO/WO quantities; no second bundle or label will be created.</p>'+
 '<label id="cfm408MixedVerifiedRow"><input type="checkbox" id="cfm408OneMixedVerified"> Physically checked: all selected PO/WO materials are together in this ONE bundle</label></section>'+
 '<div class="cfm408-tablewrap"><table><thead><tr><th>Select</th><th>WO / PO / Product</th><th>Order</th><th>Prev Sent</th><th>Pending</th><th>Send Now</th><th>Bundles & quantities</th></tr></thead><tbody id="cfm408Orders"></tbody></table></div>'+
 '<label>Remarks / LR<input id="cfm408Remarks" placeholder="Optional dispatch reference"></label>'+
 '<p class="cfm408-totals" id="cfm408Totals">No Work Order selected</p><p id="cfm408Message" role="status"></p></div>'+
 '<div class="cfm408-foot"><button id="cfm408Refresh">↻ Refresh Cloud</button><button id="cfm408Preview">👁 Preview (No Save)</button>'+
 '<button id="cfm408Save">✓ Save Actual Multi-WO Dispatch</button><button id="cfm408Last">🖨 Reprint Last Saved</button></div>';
 document.body.append(d);
 window.CFM_ADDRESS_PASTE_V440?.('cfm408Address',()=>company());
 window.CFM_PACK_META_V441?.install('cfm408Dialog','cfm408Remarks');
 const style=document.createElement('style');style.id='cfm408Style';
 style.textContent='#cfm408Open{display:block;width:100%;margin:6px 0 12px!important;background:#e8f5ff!important;color:#0b467a!important;border:1px solid #83b4d5!important;font-weight:800!important}'+
 '#cfm408Dialog{width:min(1200px,98vw);max-height:95dvh;padding:0;border:1px solid #a1b7cc;border-radius:12px;color:#173b57;background:#fff;font:12px Arial;overflow:auto}'+
 '#cfm408Dialog::backdrop{background:#10243b99}#cfm408Dialog *{box-sizing:border-box;font-family:Arial,sans-serif}'+
 '#cfm408Dialog button{border:1px solid #98b9d0;padding:9px;border-radius:7px;background:#fff;color:#13416b;font-weight:700}'+
 '#cfm408Dialog .cfm408-head{position:sticky;top:0;background:#123e6b;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:11px;z-index:2}'+
 '#cfm408Dialog .cfm408-body{padding:12px}#cfm408Dialog label{font-weight:700;display:block;margin:7px 0}'+
 '#cfm408Dialog select,#cfm408Dialog textarea,#cfm408Dialog input:not([type=checkbox]){width:100%;padding:8px;font:12px Arial;border-radius:5px;border:1px solid #b6cedd;margin-top:4px}'+
 '#cfm408Dialog .cfm408-tablewrap{max-width:100%;overflow-x:auto}#cfm408Dialog table{width:100%;border-collapse:collapse;min-width:920px}'+
 '#cfm408Dialog th,#cfm408Dialog td{border:1px solid #bed1de;padding:6px;text-align:left;vertical-align:top}#cfm408Dialog th{background:#e5f2fb}'+
 '#cfm408Dialog td small{display:block;font-size:10px;margin-top:3px;max-width:230px}#cfm408Dialog td input[type=checkbox]{width:18px;height:18px}'+
 '#cfm408Dialog .cfm408-bundles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px}#cfm408Dialog .cfm408-bundles input{padding:4px!important}'+
 '#cfm408Dialog .cfm408-bundles label{font-size:10px;margin:1px}#cfm408Dialog [hidden]{display:none!important}'+
 '#cfm408Dialog .cfm408-mixed-panel{border:1px solid #8cb5d4;background:#edf8ff;padding:10px;margin:10px 0;border-radius:9px}'+
 '#cfm408Dialog .cfm408-mixed-panel label{display:flex!important;align-items:center;gap:8px;font-size:12px!important;font-weight:800!important}'+
 '#cfm408Dialog .cfm408-mixed-panel input[type=checkbox]{width:19px!important;min-width:19px;height:19px}'+
 '#cfm408Dialog .cfm408-mixed-panel p{font-size:11px;line-height:1.5;margin:6px 0}'+
 '#cfm408Dialog #cfm408MixedVerifiedRow{display:none!important}'+
 '#cfm408Dialog.cfm408-one-mixed #cfm408MixedVerifiedRow{display:flex!important}'+
 '#cfm408Dialog.cfm408-one-mixed #cfm408Orders tr td:last-child>*{display:none!important}'+
 '#cfm408Dialog.cfm408-one-mixed #cfm408Orders tr td:last-child:after{content:"This WO material will be inside ONE combined physical bundle";display:block;color:#0e557c;font-weight:750;font-size:11px}'+
 '#cfm408Dialog .cfm408-totals{background:#e8f5ed;padding:12px;font-weight:800}'+
 '#cfm408Dialog .cfm408-foot{position:sticky;bottom:0;background:#edf5fa;display:flex;gap:6px;flex-wrap:wrap;padding:10px;border-top:1px solid #a8c4d8}'+
 '#cfm408Save{background:#0d6040!important;color:#fff!important}#cfm408Dialog .cfm408-head button{color:#173b57}';
 document.head.append(style);
 $('cfm408Close').onclick=()=>d.close();
 $('cfm408Company').onchange=()=>{window.CFM_PACK_META_V441?.clear('cfm408Dialog');renderOrders();$('cfm408OneMixedVerified').checked=false};
 $('cfm408OneMixed').onchange=()=>{$('cfm408Dialog').classList.toggle('cfm408-one-mixed',mixed());$('cfm408OneMixedVerified').checked=false;refreshTotals()};
 $('cfm408Orders').addEventListener('input',e=>{
  const tr=e.target.closest('tr[data-work-no]');if(!tr)return;
  if(e.target.matches('[data-count],[data-send]'))bundleInput(tr);
  if(mixed())$('cfm408OneMixedVerified').checked=false;
  refreshTotals();
 });
 $('cfm408Orders').addEventListener('change',e=>{if(mixed()&&e.target.matches('[data-select],[data-baseline]'))$('cfm408OneMixedVerified').checked=false;refreshTotals()});
 $('cfm408Refresh').onclick=load;$('cfm408Preview').onclick=preview;$('cfm408Save').onclick=saveCombined;
 $('cfm408Last').onclick=()=>{
  if(!lastSaved){msg('Save a combined Packing Slip first, or use normal Packing Slip history for older slips.',true);return}
  window.CFM_PACK_COMBINED_V407?.open(lastSaved,{workOrder:{}});
 };
 return true;
}
let attempts=0;const wait=setInterval(()=>{if(mount()||++attempts>90)clearInterval(wait)},400);
if(document.readyState!=='loading')mount();else document.addEventListener('DOMContentLoaded',mount,{once:true});
window.CFM_PACK_MULTI_V408=Object.freeze({open,openFor,mount});
})();