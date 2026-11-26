/* CFM V407 — One A4 Landscape print job: Packing Slip + N physical Bundle Labels.
 * First A4: one Slip at left, actual 4x4-inch Bundle #1 label at right, two
 * optional photos below label. Further A4 pages: 2 labels per page.
 * Total bundles and per-bundle Qty are operator-confirmed; sum must equal This
 * Dispatch Qty. Read-only printing; never changes ERP stock or dispatch.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const str=x=>String(x??'').trim();
const show=x=>str(x)||'—';
const itemNumber=x=>x===undefined||x===null||str(x)===''?'—':String(x);
const integer=x=>Number.isSafeInteger(Number(x))&&Number(x)>0?Number(x):null;
const icon='<span class="cfm407-paper-symbol">◈</span>';
const elCount='cfm407BundlesCount',elList='cfm407BundleQtyList',elCheck='cfm407BundleVerified',elStatus='cfm407BundleStatus';
let currentWO='';
const audit=()=>{const wo=$('packSlipWO');if(wo&&str(wo.value)!==currentWO){currentWO=str(wo.value);reset()}};
function split(qty,count){
 if(!integer(qty)||qty<count)return Array(count).fill('');
 const base=Math.floor(qty/count),remainder=qty%count;
 return Array.from({length:count},(_,i)=>String(base+(i<remainder?1:0)));
}
function note(){
 const list=Array.from(document.querySelectorAll('#'+elList+' input[data-cfm-bundle-qty]'));
 const vals=list.map(x=>Number(x.value));
 const total=Number($('packSlipThis')?.value)||0;
 const valid=vals.length&&vals.every(n=>Number.isSafeInteger(n)&&n>0);
 const sum=valid?vals.reduce((a,b)=>a+b,0):0;
 const st=$(elStatus);
 if(st)st.textContent=total>0?
 (valid&&sum===total?'✓ Bundle total '+sum+' = This Dispatch Qty '+total:
 'Bundle Qty total '+(valid?sum:'incomplete')+' · Must match This Dispatch Qty '+total):
 'Enter This Dispatch Qty to calculate Bundle quantities';
}
function drawInputs(){
 const wrap=$(elList),c=$(elCount);if(!wrap||!c)return;
 const count=integer(c.value);
 if(!count||count>200){wrap.textContent='Enter 1 to 200 Bundles.';note();return}
 const qty=integer($('packSlipThis')?.value);
 const defaults=split(qty,count);
 wrap.innerHTML=defaults.map((v,i)=>'<label class="cfm407-qty-label">Bundle '+(i+1)+' Qty (Nos)'+
 '<input type="number" min="1" step="1" data-cfm-bundle-qty="'+(i+1)+'" value="'+esc(v)+'" '+(count===1&&qty?'readonly':'')+'></label>').join('');
 const verified=$(elCheck);
 if(verified){verified.checked=false;verified.closest('label').hidden=count===1}
 note();
}
function reset(){
 if($(elCount))$(elCount).value='1';
 drawInputs();
}
function collect(amount,strict=true){
 const qty=Number(amount)||0;
 const count=integer($(elCount)?.value);
 if(!count||count>200)throw Error('Total Packing Bundles must be between 1 and 200.');
 if(!Number.isSafeInteger(qty)||qty<0)throw Error('This Dispatch Qty must be a whole number.');
 if(qty===0){
  if(strict)throw Error('Enter This Dispatch Qty before confirming actual dispatch.');
  return {bundleCount:count,bundleQtys:Array(count).fill(null),packages:count};
 }
 if(count>qty)throw Error('Packing Bundles cannot exceed Dispatch Qty ('+qty+').');
 const inputs=[...document.querySelectorAll('#'+elList+' input[data-cfm-bundle-qty]')];
 const values=inputs.map(el=>Number(el.value));
 if(inputs.length!==count||!values.every(x=>Number.isSafeInteger(x)&&x>0))
  throw Error('Fill actual Qty for every one of the '+count+' Bundles.');
 const sum=values.reduce((a,b)=>a+b,0);
 if(sum!==qty)throw Error('Bundle Qty total '+sum+' does not match This Dispatch Qty '+qty+'.');
 if(count>1&&!$(elCheck)?.checked)
  throw Error('Tick “Bundle quantities checked” after checking the actual physical packing.');
 return {bundleCount:count,bundleQtys:values,packages:count};
}
function mount(){
 const dlg=$('packSlipDialog'),qty=$('packSlipThis');
 if(!dlg||!qty)return false;
 if($('cfm407BundlesPanel'))return true;
 const panel=document.createElement('section');panel.id='cfm407BundlesPanel';
 panel.innerHTML='<div class="cfm407-title">PACKING BUNDLES & SLIP PRINT COUNT</div>'+
 '<div class="cfm412-help">For 1 Work Order + 1 Bundle: <b>1 Packing Slip</b>. For two or more POs / WOs of the SAME company packed in ONE physical Bundle, use the option below.</div>'+
 '<button type="button" id="cfm412SameCompanyOneBundle">＋ Add Same Company PO / WO in ONE Bundle</button>'+
 '<label class="cfm407-count">Total Packing Bundles'+
 '<input id="'+elCount+'" type="number" value="1" min="1" max="200" step="1"></label>'+
 '<div class="cfm407-hint">1 full A4 Packing Slip per Bundle. Bundle Qty must equal the actual packing (not estimated).</div>'+
 '<div class="cfm407-quantities" id="'+elList+'"></div>'+
 '<div class="cfm407-status" id="'+elStatus+'"></div>'+
 '<label class="cfm407-check"><input type="checkbox" id="'+elCheck+'"> Bundle quantities checked against actual packed goods</label>';
 (qty.closest('label')||qty).after(panel);
 $('cfm412SameCompanyOneBundle').onclick=()=>{
  const wo=str($('packSlipWO')?.value);
  const party=str($('packSlipPartyAddress')?.value);
  if(!wo){alert('Select the first Work Order before adding another PO / Work Order to this Bundle.');return}
  if(typeof window.CFM_PACK_MULTI_V408?.openFor!=='function'){
   alert('Same Company Multi PO / WO module is not loaded. Reopen ERP V412.');return
  }
  // Direct handoff from the standard Bundle panel; no dispatch save here.
  const selected=$('packSlipWO')?.selectedOptions?.[0]?.textContent||'';
  const name=selected.split(' · ').slice(1).join(' · ').trim();
  const existing=window.CFM_PACKING_SELECTED_WO?.()||{};
  window.CFM_PACK_MULTI_V408.openFor({
    workNo:wo,party:str(existing.party)||name,
    qty:str($('packSlipThis')?.value),address:party
  });
 };
 const cnt=$(elCount);cnt.addEventListener('change',drawInputs);cnt.addEventListener('input',drawInputs);
 qty.addEventListener('input',drawInputs);
 $('packSlipWO')?.addEventListener('change',audit);
 panel.addEventListener('input',e=>{if(e.target.matches('input[data-cfm-bundle-qty]')){$(elCheck).checked=false;note()}});
 const css=document.createElement('style');css.id='cfm407Style';
 css.textContent='#cfm407BundlesPanel{border:1px solid #b9d5e9;border-radius:10px;background:#eff8ff;padding:11px;margin:10px 0;color:#173d61;font:600 12px Arial}'+
 '#cfm407BundlesPanel .cfm407-title{font:800 13px Arial;color:#0b4576;margin-bottom:9px}'+
 '#cfm407BundlesPanel .cfm412-help{font:600 11px/1.6 Arial;color:#205679;margin:7px 0}'+
 '#cfm412SameCompanyOneBundle{display:block;width:100%;padding:10px 12px;margin:8px 0 12px;background:#114c79;color:#fff;border:1px solid #124c7b;border-radius:7px;font:800 12px Arial;cursor:pointer}'+
 '#cfm407BundlesPanel .cfm407-count{max-width:245px;font-size:12px}'+
 '#cfm407BundlesPanel .cfm407-count input{min-height:38px;font-size:15px;font-weight:800}'+
 '#cfm407BundlesPanel .cfm407-hint{font:500 11px/1.4 Arial;color:#56718a;margin:5px 0 9px}'+
 '#cfm407BundlesPanel .cfm407-quantities{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}'+
 '#cfm407BundlesPanel .cfm407-quantities label{margin:1px 0!important;font-size:11px}'+
 '#cfm407BundlesPanel .cfm407-quantities input{margin:4px 0!important;padding:7px!important;min-height:34px}'+
 '#cfm407BundlesPanel .cfm407-status{font:750 11px/1.5 Arial;margin:7px 0}'+
 '#cfm407BundlesPanel .cfm407-check{display:flex!important;align-items:center;gap:8px;font:700 11px/1.5 Arial!important;margin:7px 0!important}'+
 '#cfm407BundlesPanel .cfm407-check input{width:auto!important;flex:none}'+
 '#cfm407BundlesPanel .cfm407-check[hidden]{display:none!important}'+
 '#packSlipCarton,#cfmPackingLabelPreviewV404{display:none!important}'+
 '#packSlipA4{background:#dff3e5!important;color:#0c5732!important;border:1px solid #97cfae!important}';
 document.head.appendChild(css);
 const btn=$('packSlipPreview');if(btn)btn.textContent='👁 Preview Bundle Packing Slips';
 const saved=$('packSlipA4');if(saved)saved.textContent='🖨 Reprint Bundle Packing Slips';
 const direct=$('packSlipCarton');if(direct){direct.setAttribute('aria-hidden','true');direct.tabIndex=-1}
 // Only visual changes: core shipping and validation logic stays in its module.
 drawInputs();
 return true;
}
function verifySavedBundles(record){
 const count=integer(record.bundleCount??record.packages)||1;
 if(count>200)throw Error('More than 200 bundle labels; check saved record.');
 const arr=Array.isArray(record.bundleQtys)?record.bundleQtys.map(Number):[];
 const shipped=integer(record.thisDispatched);
 if(arr.length===count&&arr.every(x=>Number.isSafeInteger(x)&&x>0)&&(!shipped||arr.reduce((a,b)=>a+b,0)===shipped)){
  return{count,quantities:arr,verified:true};
 }
 if(count===1)return{count,quantities:[shipped],verified:!!shipped};
 // Historical records may lack per-bundle quantities. Do NOT distribute
 // dispatch Qty automatically, which would mislabel physical packages.
 return{count,quantities:Array(count).fill(null),verified:false};
}
function eagle(){
 const b=window.CFM_EAGLE_BRAND;
 const bird=b?.logoSvg?.(72,55,'#111')||'<b>EAGLE</b>';
 const word=b?.wordmarkPath?'<svg viewBox="0 0 465 80" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMid meet" aria-label="EAGLE" role="img"><path fill="#111" fill-rule="evenodd" d="'+b.wordmarkPath+'"/></svg>':'<strong>EAGLE</strong>';
 return '<div class="cfm407-brand"><div class="cfm407-bird">'+bird+'</div><div class="cfm407-words">'+word+
 '<span>FILTRATION PRODUCT PVT. LTD.</span></div></div>';
}
function prep(record,work){
 const mapped=window.CFM_PACKING_WO_FIELDS_V405?.(work)||{};
 const choose=(v,f)=>str(v)||str(f);
 const bundle=verifySavedBundles(record);
 const items=Array.isArray(record.items)&&record.items.length?record.items.map(x=>({
  workNo:choose(x.workNo,record.workNo),poNo:choose(x.poNo,record.poNo),poDate:choose(x.poDate,record.items.length===1?record.poDate:''),customerItemNo:choose(x.customerItemNo,record.items.length===1?record.customerItemNo:''),
  name:choose(x.description,choose(record.description,mapped.description)),
  spec:choose(x.description2,choose(record.description2,mapped.description2)),
  code:choose(x.efpplCode,choose(record.efpplCode,mapped.efpplCode)),
  micron:choose(x.micron,choose(record.micron,mapped.micron)),
  size:choose(x.size,choose(record.size,mapped.size)),qty:x.qty??record.thisDispatched,
  orderQty:x.orderQty??record.orderQty,previousDispatched:x.previousDispatched??record.previousDispatched,
  balanceAfter:x.balanceAfter??record.balanceAfter
 })):[{
  workNo:choose(record.workNo,mapped.workNo),poNo:choose(record.poNo,mapped.poNo),customerItemNo:choose(record.customerItemNo,mapped.customerItemNo),
  name:choose(record.description,mapped.description),spec:choose(record.description2,mapped.description2),
  code:choose(record.efpplCode,mapped.efpplCode),micron:choose(record.micron,mapped.micron),
  size:choose(record.size,mapped.size),qty:record.thisDispatched,orderQty:record.orderQty,
  previousDispatched:record.previousDispatched,balanceAfter:record.balanceAfter
 }];
 const bundleDetails=Array.isArray(record.bundleDetails)?record.bundleDetails.map(x=>({
  itemIndex:Number(x.itemIndex),qty:Number(x.qty)})):[];
 const hasMixed=Array.isArray(record.bundleContents)&&record.bundleContents.length>0;
 const bundleContents=hasMixed?record.bundleContents.map(bundle=>({
  qty:Number(bundle.qty),
  items:Array.isArray(bundle.items)?bundle.items.map(x=>({itemIndex:Number(x.itemIndex),qty:Number(x.qty)})):[]
 })):[];
 if(hasMixed){
  if(bundleContents.length!==bundle.count)throw Error('Mixed Bundle count mismatch. Recheck saved Packing Slips.');
  const itemSums=Array(items.length).fill(0);
  for(let i=0;i<bundleContents.length;i++){
   const b=bundleContents[i],used=new Set();
   if(!b.items.length)throw Error('Mixed physical Bundle '+(i+1)+' is empty.');
   let sum=0;
   for(const entry of b.items){
    if(!Number.isSafeInteger(entry.itemIndex)||entry.itemIndex<0||entry.itemIndex>=items.length||
       !Number.isSafeInteger(entry.qty)||entry.qty<=0||used.has(entry.itemIndex))
     throw Error('Invalid mixed PO/Item Qty in Bundle '+(i+1));
    used.add(entry.itemIndex);sum+=entry.qty;itemSums[entry.itemIndex]+=entry.qty;
   }
   if(sum!==b.qty||sum!==bundle.quantities[i])
    throw Error('Mixed physical Bundle '+(i+1)+' total does not match its label Qty.');
  }
  for(let i=0;i<items.length;i++)if(itemSums[i]!==Number(items[i].qty))
    throw Error('PO '+items[i].poNo+' has mismatched dispatch Qty and mixed-bundle Qty.');
 }else if((items.length>1||record.manualNoWO===true)&&(bundleDetails.length!==bundle.count||bundleDetails.some((x,i)=>
   !Number.isSafeInteger(x.itemIndex)||x.itemIndex<0||x.itemIndex>=items.length||x.qty!==bundle.quantities[i])))
  throw Error('Combined Packing Slip bundle assignments are missing or invalid.');
 return {
  bundle,items,bundleDetails,bundleContents,
  slip:choose(record.slipNo,record.draft?'PREVIEW ONLY':''),
  date:str(record.createdAt||record.date).slice(0,10),
  party:choose(record.party,mapped.party),
  address:choose(record.partyAddress,mapped.partyAddress),
  po:choose(record.poNo,mapped.poNo),
  poDate:choose(record.poDate,mapped.poDate),
  item:choose(record.customerItemNo,mapped.customerItemNo),
  code:choose(record.efpplCode,mapped.efpplCode),
  wo:choose(record.workNo,mapped.workNo),
  name:choose(record.description,mapped.description),
  spec:choose(record.description2,mapped.description2),
  size:choose(record.size,mapped.size),
  micron:choose(record.micron,mapped.micron),
  orderQty:record.orderQty,
  prevQty:record.previousDispatched,
  shippedQty:record.thisDispatched,
  balance:record.balanceAfter,
  totalQty:record.totalDispatched,
  note:record.notes,
  dispatchMeta:record.dispatchMeta||{},
  operator:record.operator,
  draft:!!record.draft,legacy:!!record.legacy,manualNoWO:!!record.manualNoWO
 };
}
function mixedLabel(p,i){
 const b=p.bundleContents[i],count=p.bundle.count;
 const contents=b.items.map(x=>{
  const item=p.items[x.itemIndex];
  return '<div class="cfm411-label-item">'+
   '<div class="cfm411-label-top"><strong>PO: '+esc(show(item.poNo))+'</strong><b>'+x.qty+' Nos</b></div>'+
   '<div class="cfm411-label-code">'+(p.manualNoWO?'':'WO: '+esc(show(item.workNo))+' · ')+'ITEM: '+esc(show(item.code))+
    (item.customerItemNo?' · CUSTOMER: '+esc(item.customerItemNo):'')+'</div>'+
   '<div class="cfm411-label-product">'+esc(show(item.name))+'</div>'+
   (item.spec?'<div class="cfm411-label-spec">'+esc(item.spec)+'</div>':'')+
   (item.size||item.micron?'<div class="cfm411-label-spec">'+
    (item.size?'Size '+esc(item.size)+' ':'')+(item.micron?'Micron '+esc(item.micron):'')+'</div>':'')+
   '</div>';
 }).join('');
 return '<section class="cfm407-label cfm411-mixed-label" aria-label="Mixed Bundle '+(i+1)+' of '+count+'">'+
 '<div class="cfm407-label-head">'+eagle()+'<div class="cfm407-label-title">MIXED<br>BUNDLE LABEL</div></div>'+
 '<div class="cfm407-label-state">'+(p.draft?'DRAFT · NOT DISPATCHED':'PHYSICAL BUNDLE · MULTIPLE PO ITEMS')+'</div>'+
 '<div class="cfm407-line"><small>PARTY / COMPANY</small><strong>'+esc(show(p.party))+'</strong></div>'+
 '<div class="cfm411-label-columns">PO NUMBER · ITEM CODE · MATERIAL DETAILS · QTY</div>'+
 '<div class="cfm411-label-list">'+contents+'</div>'+
 '<div class="cfm407-label-totals"><div><small>ONE PHYSICAL BUNDLE</small><strong>'+(i+1)+' / '+count+'</strong></div>'+
 '<div><small>TOTAL QTY IN BUNDLE</small><strong>'+b.qty+' NOS</strong></div></div>'+
 '<div class="cfm407-label-bottom"><span>'+esc(show(p.slip))+'</span><span>'+esc(show(p.date))+'</span></div></section>';
}
function label(p,i){
 if(p.bundleContents?.length)return mixedLabel(p,i);
 const count=p.bundle.count,q=p.bundle.quantities[i];
 const assigned=p.bundleDetails?.[i],item=assigned?p.items[assigned.itemIndex]:p.items[0];
 const labelPO=p.items.length>1?item?.poNo:p.po,labelWO=p.manualNoWO?'NOT ISSUED':p.items.length>1?item?.workNo:p.wo;
 const labelCode=p.items.length>1?item?.code:(p.code||item?.code);
 const labelName=p.items.length>1?item?.name:(p.name||item?.name);
 const labelSpec=p.items.length>1?item?.spec:p.spec;
 const labelMicron=p.items.length>1?item?.micron:(p.micron||item?.micron);
 const labelSize=p.items.length>1?item?.size:(p.size||item?.size);
 return '<section class="cfm407-label" aria-label="Bundle '+(i+1)+' of '+count+'">'+
 '<div class="cfm407-label-head">'+eagle()+'<div class="cfm407-label-title">PACKING<br>LABEL</div></div>'+
 '<div class="cfm407-label-state">'+(p.draft?'DRAFT / NOT DISPATCHED':p.legacy?'HISTORICAL':'PACKED GOODS')+'</div>'+
 '<div class="cfm407-line"><small>PARTY / COMPANY</small><strong>'+esc(show(p.party))+'</strong></div>'+
 '<div class="cfm407-label-two"><div><small>CUSTOMER PO NO.</small><b>'+esc(show(labelPO))+'</b></div><div><small>WORK ORDER NO.</small><b>'+esc(show(labelWO))+'</b></div></div>'+
 '<div class="cfm407-line"><small>EFPPL ITEM CODE</small><strong>'+esc(show(labelCode))+'</strong></div>'+
 '<div class="cfm407-product"><small>PRODUCT / SPECIFICATION</small><strong>'+esc(show(labelName))+'</strong>'+
 (labelSpec?'<p>'+esc(labelSpec)+'</p>':'')+'</div>'+
 '<div class="cfm407-label-two"><div><small>MICRON</small><b>'+esc(show(labelMicron))+'</b></div><div><small>SIZE</small><b>'+esc(show(labelSize))+'</b></div></div>'+
 '<div class="cfm407-label-totals"><div><small>BUNDLE NO.</small><strong>'+(i+1)+' / '+count+'</strong></div>'+
 '<div><small>QTY IN BUNDLE (NOS)</small><strong>'+esc(itemNumber(q))+'</strong></div></div>'+
 '<div class="cfm407-label-bottom"><span>'+esc(show(p.slip))+'</span><span>'+esc(show(p.date))+'</span></div></section>';
}
function slip(p,attachment=null,bundleIndex=null){
 const isBundle=bundleIndex!==null;
 const originalItems=p.items;
 if(isBundle){
  const entries=p.bundleContents.length?p.bundleContents[bundleIndex].items:p.bundleDetails.length?[p.bundleDetails[bundleIndex]]:[{itemIndex:0,qty:p.bundle.quantities[bundleIndex]}];
  p={...p,items:entries.map(e=>({...originalItems[e.itemIndex],qty:e.qty})),wo:entries.length===1?originalItems[entries[0].itemIndex].workNo:p.wo,po:entries.length===1?originalItems[entries[0].itemIndex].poNo:p.po,item:entries.length===1?originalItems[entries[0].itemIndex].customerItemNo:p.item};
 }
 const ref=(label,v)=>'<div class="cfm407-info-cell"><small>'+esc(label)+'</small><b>'+esc(show(v))+'</b></div>';
 const td=(txt,cls='')=>'<td class="'+cls+'">'+esc(show(txt))+'</td>';
 const multi=originalItems.length>1||p.manualNoWO===true;
 const table=p.items.map((x,i)=>multi?
  '<tr>'+td(String(i+1),'num')+td(p.manualNoWO?'—':x.workNo)+td([x.poNo,x.poDate?'Date '+x.poDate:''].filter(Boolean).join(' · '))+td(x.customerItemNo)+td(x.code)+
   td([x.name,x.spec,x.size?'Size '+x.size:'',x.micron?'Micron '+x.micron:''].filter(Boolean).join(' · '))+
   td(itemNumber(x.orderQty),'num')+td(itemNumber(x.previousDispatched),'num')+
   td(itemNumber(x.qty),'num')+td(itemNumber(x.balanceAfter),'num')+'</tr>':
  '<tr>'+td(String(i+1),'num')+td(x.workNo)+td(x.code)+td(x.name)+td(x.spec)+td(x.micron)+td(x.size)+
   td(itemNumber(x.qty),'num')+'</tr>').join('');
 const qty=(text,val)=>'<div><small>'+esc(text)+'</small><strong>'+esc(itemNumber(val))+'</strong></div>';
 const legacy=p.legacy;
 const meta=p.dispatchMeta||{},fields=[['invoiceNo','INVOICE / BILL'],['challanNo','CHALLAN'],['transporter','TRANSPORTER'],['lrNo','LR / AWB'],['vehicleNo','VEHICLE'],['packageType','PACKING TYPE'],['grossWeightKg','SHIPMENT GROSS (kg)'],['netWeightKg','SHIPMENT NET (kg)']];
 const populated=fields.filter(([k])=>str(meta[k]));
 const shipping=populated.length?'<div class="cfm441-shipping">'+populated.map(([k,l])=>ref(l,meta[k])).join('')+'</div>':'';
 const bundleRef=isBundle?(p.draft?'DRAFT':show(p.slip))+'/B'+String(bundleIndex+1).padStart(2,'0'):'';
 return '<section class="cfm407-slip" aria-label="Packing Slip">'+
 '<div class="cfm407-slip-head">'+eagle()+'<div class="cfm407-slip-name"><b>PACKING SLIP</b><small>'+
 (p.draft?'DRAFT — NOT DISPATCHED':legacy?'LEGACY / UNVERIFIED':'CONFIRMED DISPATCH')+'</small></div></div>'+
 '<div class="cfm407-refs">'+ref('SLIP NO.',p.slip)+ref('DATE',p.date)+ref('WORK ORDER NO.',p.manualNoWO?'NOT ISSUED':multi?'Multiple ('+p.items.length+')':p.wo)+ref('CUSTOMER PO NO.',multi?'See PO column':p.po)+'</div>'+
 (attachment?'<div class="cfm407-remark" style="min-height:0"><b>BILL REFERENCE (ENTERED FOR THIS PRINT)</b><p>'+esc(attachment.billNo)+' · '+esc(attachment.billDate||'Date not entered')+'</p></div>':'')+
 '<div class="cfm407-dest"><div class="cfm434-shipto"><small>SHIP TO / DELIVERY ADDRESS</small><b>'+esc(show(p.party))+'</b>'+
 '<p class="cfm434-address">'+esc(p.address||'Not recorded — verify customer PO')+'</p></div>'+
 '<div><small>PO DATE</small><b>'+esc(multi?'See item table':show(p.poDate))+'</b><small>CUSTOMER ITEM CODE</small><b>'+esc(multi?'See item table':show(p.item))+'</b></div></div>'+
 '<h3>PRODUCT DETAILS · '+(p.manualNoWO?'AS PER CUSTOMER PO (NO WORK ORDER)':'AS PER WORK ORDER')+'</h3>'+
 (multi?'<table class="cfm407-products cfm407-multi"><colgroup><col style="width:3%"><col style="width:9%"><col style="width:13%"><col style="width:11%"><col style="width:13%"><col style="width:23%"><col style="width:7%"><col style="width:7%"><col style="width:7%"><col style="width:7%"></colgroup>'+
  '<thead><tr><th>#</th><th>WO</th><th>PO NO. / DATE</th><th>CUSTOMER ITEM</th><th>EFPPL CODE</th><th>PRODUCT / SPEC</th><th>ORDER</th><th>PREV</th><th>'+ (isBundle?'BUNDLE QTY':'NOW') +'</th><th>PENDING</th></tr></thead><tbody>'+table+'</tbody></table>':
  '<table class="cfm407-products"><colgroup><col style="width:5%"><col style="width:13%"><col style="width:17%"><col style="width:24%"><col style="width:20%"><col style="width:7%"><col style="width:7%"><col style="width:7%"></colgroup>'+
  '<thead><tr><th>#</th><th>WORK NO.</th><th>EFPPL CODE</th><th>PRODUCT</th><th>SPECIFICATION</th><th>MICRON</th><th>SIZE</th><th>'+ (isBundle?'BUNDLE QTY':'QTY') +'</th></tr></thead><tbody>'+table+'</tbody></table>')+
 '<div class="cfm407-qty">'+qty('ORDER QTY',p.orderQty)+qty('PREVIOUS SENT',legacy?'UNVERIFIED':p.prevQty)+
 qty(isBundle?'TOTAL THIS DISPATCH':'THIS DISPATCH',p.shippedQty)+qty('TOTAL SENT',legacy?'UNVERIFIED':p.totalQty)+qty('BALANCE',legacy?'UNVERIFIED':p.balance)+'</div>'+
 (isBundle?'<div class="cfm407-bundle-title" style="font-size:16pt;display:flex;justify-content:space-between">BUNDLE NO. '+(bundleIndex+1)+' / '+p.bundle.count+' <span>QTY IN BUNDLE: '+esc(itemNumber(p.bundle.quantities[bundleIndex]))+' NOS</span></div>':'<div class="cfm407-bundle-title">PACKING BUNDLES: '+p.bundle.count+'</div>')+
 (isBundle?'':'<div class="cfm407-bundle-rows">'+p.bundle.quantities.slice(0,12).map((q,i)=>'<span>Bundle '+(i+1)+' / '+p.bundle.count+': <b>'+
 esc(itemNumber(q))+' Nos</b>'+
 (p.bundleContents?.[i]?.items?.length?'<small>'+p.bundleContents[i].items.map(x=>
   esc(show(p.items[x.itemIndex]?.poNo))+' '+x.qty+' Nos').join(' + ')+'</small>':'')+
 '</span>').join('')+
 (p.bundle.count>12?'<span>Remaining '+(p.bundle.count-12)+' Bundle quantities are printed on their own packing slips</span>':'')+'</div>')+
 (!p.bundle.verified?'<div class="cfm407-unverified">Bundle Qty not verified — check actual packing before printing.</div>':'')+
 (isBundle?'<div class="cfm441-trace">BUNDLE TRACE ID: '+esc(bundleRef)+' · SHIPMENT QUANTITY IN NOS</div>':'')+shipping+
 '<div class="cfm407-remark"><b>PACKING / LR / DISPATCH REMARKS</b><p>'+esc(show(p.note))+'</p></div>'+
 '<div class="cfm407-sign"><span>PREPARED BY <b>'+esc(show(p.operator))+'</b></span><span>PACKED / CHECKED BY <b>____________</b></span><span>RECEIVED BY <b>____________</b></span></div>'+
 '<div class="cfm407-foot">A4 LANDSCAPE · '+(attachment?'BILL ATTACHMENT · '+p.bundle.count+' BUNDLE(S)':'ONE PACKING SLIP PER BUNDLE · TOTAL '+p.bundle.count+' SLIP(S) IN THIS JOB')+''+(p.draft?' · DRAFT / NO DISPATCH SAVED':'')+'</div>'+
 '</section>';
}
// V414: Photos removed by request; Packing Slip and 4x4 labels only.
function extraPhotos(photos){
 return '<div class="cfm407-photos">'+[1,2].map(i=>{
  const src=str(photos?.[i]);const valid=/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i.test(src);
  return '<section><b>PHOTO '+i+' — '+(i===1?'PRODUCT':'PACKED GOODS')+'</b>'+
   (valid?'<img alt="Photo '+i+'" src="'+src+'">':'<span>NO PHOTO ATTACHED</span>')+'</section>';
 }).join('')+'</div>';
}
function documentHtml(record,work,photos,attachment=null){
 const p=prep(record,work),n=p.bundle.count;
 if(attachment&&(!str(attachment.billNo)||p.draft||p.legacy||!p.bundle.verified||n>12))throw Error('Bill attachment requires a verified saved slip, Bill No. and at most 12 bundles. Use individual Bundle Packing Slips for larger shipments.');
 if(n>200)throw Error('Bundle count exceeds 200; cannot prepare print.');
 const extraPages=[];
 for(let start=1;start<n;start+=2){
  extraPages.push('<div class="cfm407-sheet cfm407-extra"><div class="cfm407-extra-header">PACKING LABELS · '+
  esc(show(p.party))+' · '+esc(show(p.slip))+' · '+n+' Bundles</div>'+
  '<div class="cfm407-extra-labels">'+label(p,start)+(start+1<n?label(p,start+1):'')+'</div></div>');
 }
 const css=[
 '@page{size:A4 landscape;margin:8mm}',
 '*{box-sizing:border-box}',
 'html,body{margin:0;padding:0;color:#111;background:#e9eef3;font:11px/1.3 Arial,Helvetica,sans-serif}',
 '.cfm407-toolbar{position:sticky;top:0;z-index:999;display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;background:#093e73;color:white;padding:11px 15px;font:bold 12px Arial}',
 '.cfm407-toolbar button{background:#fff;color:#063867;border:0;border-radius:7px;padding:9px 14px;font:bold 12px Arial;cursor:pointer}',
 '.cfm407-sheet{width:281mm;height:194mm;background:#fff;margin:12px auto;box-shadow:0 4px 25px #0002;box-sizing:border-box;break-after:page;position:relative;overflow:hidden}',
 '.cfm407-sheet:last-child{break-after:auto}',
 '.cfm407-first{display:grid;grid-template-columns:176mm 101.6mm;gap:3.4mm}',
 '.cfm407-slip{height:194mm;border:1px solid #111;padding:2.2mm;display:flex;flex-direction:column;gap:1.6mm;overflow:hidden}',
 '.cfm407-brand{display:flex;gap:1.4mm;align-items:center;min-width:0}',
 '.cfm407-bird{width:16mm;flex:none}.cfm407-bird svg{display:block;width:100%;height:13mm}',
 '.cfm407-words{display:block;min-width:0}.cfm407-words svg{display:block;width:37mm;height:7mm}.cfm407-words>span{display:block;font:800 8pt Arial;white-space:nowrap}',
 '.cfm407-slip-head{display:flex;align-items:center;justify-content:space-between;gap:2mm;border-bottom:2px solid #111;padding:1.4mm 0}',
 '.cfm407-slip-name{text-align:right}.cfm407-slip-name b{font:bold 15pt Arial;letter-spacing:.2px}.cfm407-slip-name small{display:block;font:bold 7pt Arial}',
 '.cfm407-refs{display:grid;grid-template-columns:1.05fr .8fr 1fr 1fr;border:1px solid #111;border-right:none}',
 '.cfm407-info-cell{border-right:1px solid #111;padding:1.6mm;min-width:0;overflow-wrap:anywhere}',
 '.cfm407-info-cell small,.cfm407-dest small{display:block;font:bold 7pt Arial;color:#222}',
 '.cfm407-info-cell b{display:block;font:bold 8.8pt Arial;margin-top:.5mm}',
 '.cfm407-dest{display:grid;grid-template-columns:minmax(0,4fr) minmax(0,1fr);border:1.5px solid #111;flex-shrink:0}',
 '.cfm407-dest>div{padding:1.5mm 2mm;min-width:0;overflow-wrap:anywhere}.cfm407-dest>div+div{border-left:1px solid #111}',
 '.cfm407-dest b{display:block;font:bold 9pt Arial;margin:1mm 0 2mm}',
 '.cfm407-dest p{margin:1mm 0;font:8.4pt/1.2 Arial;white-space:pre-wrap}.cfm407-dest .cfm434-shipto{padding:2.5mm 3mm}.cfm407-dest .cfm434-shipto small{font:bold 10pt Arial;letter-spacing:.5px}.cfm407-dest .cfm434-shipto b{font:bold 20pt/1.12 Arial;margin:1.3mm 0}.cfm407-dest .cfm434-address{font:600 16pt/1.23 Arial;color:#000;white-space:pre-wrap;overflow-wrap:anywhere;margin:1mm 0 0}',
 '.cfm407-slip h3{font:bold 8.5pt Arial;margin:1.4mm 0 .5mm}',
 '.cfm407-products{width:100%;table-layout:fixed;border-collapse:collapse}',
 '.cfm407-products th,.cfm407-products td{border:1px solid #111;padding:1.6mm 1mm;overflow-wrap:anywhere;vertical-align:top}',
 '.cfm407-products th{font:bold 8.5pt Arial;text-align:center;background:#ededed}.cfm407-products td{font:9pt/1.25 Arial}.cfm407-products .num{text-align:center;font-weight:800}',
 '.cfm407-products.cfm407-multi th{font-size:8pt}.cfm407-products.cfm407-multi td{font-size:8.5pt;padding:1.3mm 1mm}',
 '.cfm407-qty{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));border:1px solid #111;border-right:0}',
 '.cfm407-qty>div{padding:2mm 1mm;text-align:center;border-right:1px solid #111}',
 '.cfm407-qty small{display:block;font:bold 7pt Arial}.cfm407-qty strong{display:block;font:bold 14pt Arial}',
 '.cfm407-bundle-title{border:1px solid #111;padding:1.8mm;font:bold 9pt Arial;background:#f7f7f7}',
 '.cfm407-bundle-rows{display:flex;flex-wrap:wrap;gap:1.2mm}',
 '.cfm407-bundle-rows span{border:1px solid #aaa;border-radius:2px;padding:1mm 1.7mm;font:7.6pt Arial;min-width:25mm}',
 '.cfm407-unverified{font:bold 8pt Arial;color:#a82323}',
 '.cfm441-trace{font:bold 8pt Arial;overflow-wrap:anywhere}.cfm441-shipping{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid #111;border-right:0;flex-shrink:0}.cfm441-shipping .cfm407-info-cell{padding:1mm;min-width:0;overflow-wrap:anywhere}.cfm441-shipping .cfm407-info-cell b{font-size:8pt}.cfm441-shipping .cfm407-info-cell:nth-child(n+5){border-top:1px solid #111}.cfm407-dest>div+div small:nth-of-type(2){border-top:1px solid #999;padding-top:2mm}',
 '.cfm407-remark{border:1px solid #111;padding:1.2mm;overflow-wrap:anywhere;min-height:8mm}',
 '.cfm407-remark b{display:block;font:bold 7pt Arial}.cfm407-remark p{margin:1mm 0;font:8pt Arial;white-space:pre-wrap}',
 '.cfm407-sign{display:grid;grid-template-columns:repeat(3,1fr);gap:2mm;align-items:end;margin-top:auto}',
 '.cfm407-sign span{border-top:1px solid #111;text-align:center;font:bold 7pt Arial;padding-top:1mm}.cfm407-sign b{display:block;font:7pt Arial;margin-top:1mm}',
 '.cfm407-foot{border-top:1px solid #aaa;padding:1mm 0;font:bold 6.8pt Arial}',
 '.cfm407-right{display:flex;flex-direction:column;gap:3mm}',
 '.cfm407-label{width:101.6mm;height:101.6mm;min-width:101.6mm;max-height:101.6mm;border:1.3px solid #111;padding:2.5mm;overflow:hidden;display:flex;flex-direction:column;gap:1.2mm;background:#fff}',
 '.cfm407-label-head{display:flex;justify-content:space-between;gap:1mm;align-items:center;border-bottom:1.5px solid #111;padding-bottom:1.4mm}',
 '.cfm407-label .cfm407-bird{width:13mm}.cfm407-label .cfm407-bird svg{height:11mm}',
 '.cfm407-label .cfm407-words svg{width:30mm;height:6mm}.cfm407-label .cfm407-words>span{font-size:7pt}',
 '.cfm407-label-title{font:bold 10pt/1.1 Arial;text-align:right}',
 '.cfm407-label-state{text-align:center;font:bold 6.5pt Arial;padding:1mm;border-bottom:1px solid #aaa}',
 '.cfm407-line{padding:1.2mm 0;border-bottom:1px solid #aaa;min-width:0;overflow-wrap:anywhere}',
 '.cfm407-line small,.cfm407-label-two small,.cfm407-product small,.cfm407-label-totals small{display:block;font:bold 6.8pt Arial;margin-bottom:.5mm}',
 '.cfm407-line strong{display:block;font:bold 9.2pt/1.2 Arial;overflow-wrap:anywhere}',
 '.cfm407-label-two{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #aaa}',
 '.cfm407-label-two>div{min-width:0;padding:1.4mm 0;overflow-wrap:anywhere}',
 '.cfm407-label-two>div+div{border-left:1px solid #aaa;padding-left:1.5mm}',
 '.cfm407-label-two b{display:block;font:bold 8.7pt Arial}',
 '.cfm407-product{padding:1.2mm 0;border-bottom:1px solid #aaa;min-height:14mm;overflow-wrap:anywhere}',
 '.cfm407-product strong{display:block;font:bold 8.8pt/1.2 Arial}.cfm407-product p{margin:1mm 0;font:7.5pt/1.15 Arial}',
 '.cfm407-label-totals{display:grid;grid-template-columns:1fr 1fr;border:1.5px solid #111;margin-top:auto}',
 '.cfm407-label-totals>div{padding:1.8mm;text-align:center}.cfm407-label-totals>div+div{border-left:1px solid #111}',
 '.cfm407-label-totals strong{display:block;font:bold 15pt Arial}',
 '.cfm407-label-bottom{display:flex;justify-content:space-between;gap:2mm;font:bold 7pt Arial}',
 '.cfm411-mixed-label .cfm407-label-title{font:bold 9pt/1.07 Arial}',
 '.cfm411-label-columns{font:bold 7pt Arial;text-align:center;padding:1mm;background:#eee;border-bottom:1px solid #999}',
 '.cfm411-label-list{display:flex;flex-direction:column;overflow:visible;gap:.4mm;flex:1}',
 '.cfm411-label-item{border-bottom:1px solid #aaa;padding:1mm 0;overflow-wrap:anywhere}',
 '.cfm411-label-top{display:flex;align-items:baseline;justify-content:space-between;gap:2mm;font:800 8.5pt Arial}',
 '.cfm411-label-top b{white-space:nowrap;font:bold 11pt Arial}',
 '.cfm411-label-code{font:800 7pt Arial;overflow-wrap:anywhere}',
 '.cfm411-label-product{font:750 7.5pt/1.15 Arial;overflow-wrap:anywhere}',
 '.cfm411-label-spec{font:7pt/1.15 Arial;overflow-wrap:anywhere}',
 '.cfm411-mixed-label .cfm407-label-totals{margin-top:auto}',
 '.cfm407-photos{height:79mm;display:grid;grid-template-rows:1fr 1fr;gap:2mm}',
 '.cfm407-photos section{border:1px solid #111;display:flex;flex-direction:column;align-items:center;overflow:hidden}',
 '.cfm407-photos section>b{align-self:stretch;padding:1mm 2mm;border-bottom:1px solid #aaa;font:bold 7.2pt Arial}',
 '.cfm407-photos img{max-width:100%;max-height:32mm;object-fit:contain}',
 '.cfm407-photos span{margin:auto;color:#777;font:bold 8pt Arial}',
 '.cfm407-extra{padding:2mm 0}',
 '.cfm407-extra-header{font:bold 10pt Arial;padding:0 0 3mm}',
 '.cfm407-extra-labels{display:flex;gap:4mm;align-items:flex-start}',
 '@media screen and (max-width:1150px){.cfm407-sheet{margin:12px 0}.cfm407-scroll{overflow-x:auto}}',
 '@media print{html,body{background:#fff!important}.cfm407-toolbar{display:none!important}.cfm407-scroll{overflow:visible!important}.cfm407-sheet{margin:0!important;box-shadow:none!important}.cfm407-sheet:not(:last-child){break-after:page!important}}'
 ].join('');
 const head='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>EAGLE · '+n+' Bundle Packing Slips · '+esc(show(p.slip))+'</title>'+
 '<style>'+css+'</style></head><body>';
 if(attachment)return head+'<style>.cfm407-slip{width:281mm}.cfm407-sheet{overflow:visible}.cfm407-slip{overflow:visible}</style><div class="cfm407-toolbar"><span>Bill attachment · saved shipment · no new dispatch</span><button onclick="var x=document.querySelector(\'.cfm407-slip\');if(x.scrollHeight>x.clientHeight+4||x.scrollWidth>x.clientWidth+4){alert(\'Content exceeds A4; use normal packing slip.\');return}window.print()">Print / Save PDF</button></div><div class="cfm407-scroll"><section class="cfm407-sheet">'+slip(p,attachment)+'</section></div></body></html>';
 if(!p.bundle.verified)throw Error('Bundle Qty is not verified. Check the actual physical packing before printing.');
 const pages=Array.from({length:n},(_,i)=>'<section class="cfm407-sheet">'+slip(p,null,i)+'</section>').join('');
 const script='<script>function printVerified(){var sheets=document.querySelectorAll(".cfm407-sheet"),slips=document.querySelectorAll(".cfm407-slip");'+
 'if(sheets.length!=='+n+'||slips.length!=='+n+'){alert("Bundle packing slip count mismatch; do not print");return}'+
 'if('+(!p.bundle.verified)+'){alert("Bundle Qty is not verified. Complete physical Bundle quantities before printing.");return}'+
 'for(var i=0;i<sheets.length;i++){var sheet=sheets[i],x=slips[i];if(sheet.scrollHeight>sheet.clientHeight+4||sheet.scrollWidth>sheet.clientWidth+4||x.scrollHeight>x.clientHeight+4||x.scrollWidth>x.clientWidth+4){alert("A4 page "+(i+1)+" content overflows. Please shorten the description before printing.");return}}window.print()}</scr'+'ipt>';
 return head+'<div class="cfm407-toolbar"><span>'+n+' BUNDLE PACKING SLIP(S) · ONE PER A4 LANDSCAPE PAGE · 100% scale</span><div><button onclick="printVerified()" type="button">Print / Save PDF</button> <button onclick="window.close()" type="button">Close</button></div></div>'+
 '<div class="cfm407-scroll">'+pages+'</div>'+script+'</body></html>';
}
function open(record,options={}){
 if(!record)return false;
 const popup=options.windowRef||window.open('','_blank');
 if(!popup){alert('Allow pop-ups to view Bundle Packing Slips.');return false}
 try{
  const html=documentHtml(record,options.workOrder||{},
   options.photos||window.CFM_PACKING_PREVIEW_V401?.photosFor?.(record.workNo)||{},options.billAttachment||null);
  popup.document.open();popup.document.write(html);popup.document.close();popup.focus();return true;
 }catch(e){popup.document.open();popup.document.write('<!doctype html><title>Print blocked</title><p>Print Preview could not be prepared: '+esc(String(e.message||e))+'</p>');popup.document.close();return false}
}
window.CFM_PACK_COMBINED_V407=Object.freeze({open,collect,mount,html:documentHtml});
function init(){let n=0;const timer=setInterval(()=>{if(mount()||++n>80)clearInterval(timer)},400);mount()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();