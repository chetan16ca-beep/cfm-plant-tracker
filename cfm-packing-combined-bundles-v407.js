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
 panel.innerHTML='<div class="cfm407-title">PACKING BUNDLES & LABEL PRINT COUNT</div>'+
 '<label class="cfm407-count">Total Packing Bundles'+
 '<input id="'+elCount+'" type="number" value="1" min="1" max="200" step="1"></label>'+
 '<div class="cfm407-hint">1 label per Bundle. Bundle Qty must equal the actual packing (not estimated).</div>'+
 '<div class="cfm407-quantities" id="'+elList+'"></div>'+
 '<div class="cfm407-status" id="'+elStatus+'"></div>'+
 '<label class="cfm407-check"><input type="checkbox" id="'+elCheck+'"> Bundle quantities checked against actual packed goods</label>';
 (qty.closest('label')||qty).after(panel);
 const cnt=$(elCount);cnt.addEventListener('change',drawInputs);cnt.addEventListener('input',drawInputs);
 qty.addEventListener('input',drawInputs);
 $('packSlipWO')?.addEventListener('change',audit);
 panel.addEventListener('input',e=>{if(e.target.matches('input[data-cfm-bundle-qty]')){$(elCheck).checked=false;note()}});
 const css=document.createElement('style');css.id='cfm407Style';
 css.textContent='#cfm407BundlesPanel{border:1px solid #b9d5e9;border-radius:10px;background:#eff8ff;padding:11px;margin:10px 0;color:#173d61;font:600 12px Arial}'+
 '#cfm407BundlesPanel .cfm407-title{font:800 13px Arial;color:#0b4576;margin-bottom:9px}'+
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
 const btn=$('packSlipPreview');if(btn)btn.textContent='👁 Preview Slip + Bundle Labels';
 const saved=$('packSlipA4');if(saved)saved.textContent='🖨 Reprint Slip + Bundle Labels';
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
  workNo:choose(x.workNo,record.workNo),name:choose(x.description,choose(record.description,mapped.description)),
  spec:choose(x.description2,choose(record.description2,mapped.description2)),
  code:choose(x.efpplCode,choose(record.efpplCode,mapped.efpplCode)),
  micron:choose(x.micron,choose(record.micron,mapped.micron)),
  size:choose(x.size,choose(record.size,mapped.size)),qty:x.qty??record.thisDispatched
 })):[{
  workNo:choose(record.workNo,mapped.workNo),
  name:choose(record.description,mapped.description),
  spec:choose(record.description2,mapped.description2),
  code:choose(record.efpplCode,mapped.efpplCode),
  micron:choose(record.micron,mapped.micron),size:choose(record.size,mapped.size),qty:record.thisDispatched
 }];
 return {
  bundle,items,
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
  operator:record.operator,
  draft:!!record.draft,legacy:!!record.legacy
 };
}
function label(p,i){
 const count=p.bundle.count,q=p.bundle.quantities[i];
 return '<section class="cfm407-label" aria-label="Bundle '+(i+1)+' of '+count+'">'+
 '<div class="cfm407-label-head">'+eagle()+'<div class="cfm407-label-title">PACKING<br>LABEL</div></div>'+
 '<div class="cfm407-label-state">'+(p.draft?'DRAFT / NOT DISPATCHED':p.legacy?'HISTORICAL':'PACKED GOODS')+'</div>'+
 '<div class="cfm407-line"><small>PARTY / COMPANY</small><strong>'+esc(show(p.party))+'</strong></div>'+
 '<div class="cfm407-label-two"><div><small>CUSTOMER PO NO.</small><b>'+esc(show(p.po))+'</b></div><div><small>WORK ORDER NO.</small><b>'+esc(show(p.wo))+'</b></div></div>'+
 '<div class="cfm407-line"><small>EFPPL ITEM CODE</small><strong>'+esc(show(p.code||p.items[0]?.code))+'</strong></div>'+
 '<div class="cfm407-product"><small>PRODUCT / SPECIFICATION</small><strong>'+esc(show(p.name||p.items[0]?.name))+'</strong>'+
 (p.spec?'<p>'+esc(p.spec)+'</p>':'')+'</div>'+
 '<div class="cfm407-label-two"><div><small>MICRON</small><b>'+esc(show(p.micron||p.items[0]?.micron))+'</b></div><div><small>SIZE</small><b>'+esc(show(p.size||p.items[0]?.size))+'</b></div></div>'+
 '<div class="cfm407-label-totals"><div><small>BUNDLE NO.</small><strong>'+(i+1)+' / '+count+'</strong></div>'+
 '<div><small>QTY IN BUNDLE (NOS)</small><strong>'+esc(itemNumber(q))+'</strong></div></div>'+
 '<div class="cfm407-label-bottom"><span>'+esc(show(p.slip))+'</span><span>'+esc(show(p.date))+'</span></div></section>';
}
function slip(p){
 const ref=(label,v)=>'<div class="cfm407-info-cell"><small>'+esc(label)+'</small><b>'+esc(show(v))+'</b></div>';
 const td=(txt,cls='')=>'<td class="'+cls+'">'+esc(show(txt))+'</td>';
 const table=p.items.map((x,i)=>'<tr>'+td(String(i+1),'num')+td(x.workNo)+td(x.code)+
 td(x.name)+td(x.spec)+td(x.micron)+td(x.size)+td(itemNumber(x.qty),'num')+'</tr>').join('');
 const qty=(text,val)=>'<div><small>'+esc(text)+'</small><strong>'+esc(itemNumber(val))+'</strong></div>';
 const legacy=p.legacy;
 return '<section class="cfm407-slip" aria-label="Packing Slip">'+
 '<div class="cfm407-slip-head">'+eagle()+'<div class="cfm407-slip-name"><b>PACKING SLIP</b><small>'+
 (p.draft?'DRAFT — NOT DISPATCHED':legacy?'LEGACY / UNVERIFIED':'CONFIRMED DISPATCH')+'</small></div></div>'+
 '<div class="cfm407-refs">'+ref('SLIP NO.',p.slip)+ref('DATE',p.date)+ref('WORK ORDER NO.',p.wo)+ref('CUSTOMER PO NO.',p.po)+'</div>'+
 '<div class="cfm407-dest"><div><small>PARTY / COMPANY</small><b>'+esc(show(p.party))+'</b>'+
 '<small>SHIP-TO / DELIVERY ADDRESS</small><p>'+esc(p.address||'Not recorded in Work Order — verify with customer')+'</p></div>'+
 '<div><small>PO DATE</small><b>'+esc(show(p.poDate))+'</b><small>CUSTOMER ITEM CODE</small><b>'+esc(show(p.item))+'</b></div></div>'+
 '<h3>PRODUCT DETAILS · AS PER WORK ORDER</h3>'+
 '<table class="cfm407-products"><colgroup><col style="width:5%"><col style="width:13%"><col style="width:17%"><col style="width:24%"><col style="width:20%"><col style="width:7%"><col style="width:7%"><col style="width:7%"></colgroup>'+
 '<thead><tr><th>#</th><th>WORK NO.</th><th>EFPPL CODE</th><th>PRODUCT</th><th>SPECIFICATION</th><th>MICRON</th><th>SIZE</th><th>QTY</th></tr></thead><tbody>'+table+'</tbody></table>'+
 '<div class="cfm407-qty">'+qty('ORDER QTY',p.orderQty)+qty('PREVIOUS SENT',legacy?'UNVERIFIED':p.prevQty)+
 qty('THIS DISPATCH',p.shippedQty)+qty('BALANCE',legacy?'UNVERIFIED':p.balance)+'</div>'+
 '<div class="cfm407-bundle-title">PACKING BUNDLES: '+p.bundle.count+' &nbsp; | &nbsp; ONE LABEL PER BUNDLE</div>'+
 '<div class="cfm407-bundle-rows">'+p.bundle.quantities.slice(0,12).map((q,i)=>'<span>Bundle '+(i+1)+' / '+p.bundle.count+': <b>'+
 esc(itemNumber(q))+' Nos</b></span>').join('')+
 (p.bundle.count>12?'<span>Remaining '+(p.bundle.count-12)+' Bundle quantities are printed on their own labels</span>':'')+'</div>'+
 (!p.bundle.verified?'<div class="cfm407-unverified">Bundle Qty not verified — check actual packing before printing.</div>':'')+
 '<div class="cfm407-remark"><b>PACKING / LR / DISPATCH REMARKS</b><p>'+esc(show(p.note))+'</p></div>'+
 '<div class="cfm407-sign"><span>PREPARED BY <b>'+esc(show(p.operator))+'</b></span><span>PACKED / CHECKED BY <b>____________</b></span><span>RECEIVED BY <b>____________</b></span></div>'+
 '<div class="cfm407-foot">A4 LANDSCAPE · SLIP PRINTED ONCE · TOTAL '+p.bundle.count+' LABEL(S) IN THIS JOB'+(p.draft?' · DRAFT / NO DISPATCH SAVED':'')+'</div>'+
 '</section>';
}
function extraPhotos(photos){
 return '<div class="cfm407-photos">'+[1,2].map(i=>{
  const src=str(photos?.[i]);const valid=/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i.test(src);
  return '<section><b>PHOTO '+i+' — '+(i===1?'PRODUCT':'PACKED GOODS')+'</b>'+
   (valid?'<img alt="Photo '+i+'" src="'+src+'">':'<span>NO PHOTO ATTACHED</span>')+'</section>';
 }).join('')+'</div>';
}
function documentHtml(record,work,photos){
 const p=prep(record,work),n=p.bundle.count;
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
 '.cfm407-dest{display:grid;grid-template-columns:1.5fr 1fr;border:1px solid #111}',
 '.cfm407-dest>div{padding:1.5mm 2mm;min-width:0;overflow-wrap:anywhere}.cfm407-dest>div+div{border-left:1px solid #111}',
 '.cfm407-dest b{display:block;font:bold 9pt Arial;margin:1mm 0 2mm}',
 '.cfm407-dest p{margin:1mm 0;font:8.4pt/1.2 Arial;white-space:pre-wrap}',
 '.cfm407-slip h3{font:bold 8.5pt Arial;margin:1.4mm 0 .5mm}',
 '.cfm407-products{width:100%;table-layout:fixed;border-collapse:collapse}',
 '.cfm407-products th,.cfm407-products td{border:1px solid #111;padding:1.6mm 1mm;overflow-wrap:anywhere;vertical-align:top}',
 '.cfm407-products th{font:bold 7pt Arial;text-align:center}.cfm407-products td{font:7.8pt/1.25 Arial}.cfm407-products .num{text-align:center;font-weight:800}',
 '.cfm407-qty{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #111;border-right:0}',
 '.cfm407-qty>div{padding:2mm 1mm;text-align:center;border-right:1px solid #111}',
 '.cfm407-qty small{display:block;font:bold 7pt Arial}.cfm407-qty strong{display:block;font:bold 14pt Arial}',
 '.cfm407-bundle-title{border:1px solid #111;padding:1.8mm;font:bold 9pt Arial;background:#f7f7f7}',
 '.cfm407-bundle-rows{display:flex;flex-wrap:wrap;gap:1.2mm}',
 '.cfm407-bundle-rows span{border:1px solid #aaa;border-radius:2px;padding:1mm 1.7mm;font:7.6pt Arial;min-width:25mm}',
 '.cfm407-unverified{font:bold 8pt Arial;color:#a82323}',
 '.cfm407-remark{border:1px solid #111;padding:1.8mm;overflow-wrap:anywhere;min-height:12mm}',
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
 '<title>EAGLE · Slip + '+n+' Bundle Labels · '+esc(show(p.slip))+'</title>'+
 '<style>'+css+'</style></head><body>';
 const first='<section class="cfm407-sheet cfm407-first">'+slip(p)+
 '<div class="cfm407-right">'+label(p,0)+extraPhotos(photos)+'</div></section>';
 const script='<script>function printVerified(){var sheets=document.querySelectorAll(".cfm407-sheet");'+
 'for(var i=0;i<sheets.length;i++){var sheet=sheets[i];'+
 'if(sheet.scrollHeight>sheet.clientHeight+4||sheet.scrollWidth>sheet.clientWidth+4){'+
 'alert("A4 page "+(i+1)+" content overflows. Please shorten the description or reduce bundle details before printing.");return}}'+
 'var labels=document.querySelectorAll(".cfm407-label");if(labels.length!=='+n+'){alert("Bundle label count mismatch; do not print");return}'+
 'if('+(!p.bundle.verified)+'){alert("Bundle Qty is not verified. Complete physical Bundle quantities before printing.");return}'+
 'for(var j=0;j<labels.length;j++){if(labels[j].scrollHeight>labels[j].clientHeight+3){alert("Bundle "+(j+1)+" label exceeds 4x4 inch; check product details.");return}}'+
 'window.print()}</scr'+'ipt>';
 return head+'<div class="cfm407-toolbar"><span>ONE PRINT JOB · 1 Packing Slip + '+n+' Bundle Label'+(n===1?'':'s')+
 ' · A4 Landscape · 100% scale</span><div><button onclick="printVerified()" type="button">🖨 Print / Save PDF</button> '+
 '<button onclick="window.close()" type="button">Close</button></div></div>'+
 '<div class="cfm407-scroll">'+first+extraPages.join('')+'</div>'+script+'</body></html>';
}
function open(record,options={}){
 if(!record)return false;
 const popup=options.windowRef||window.open('','_blank');
 if(!popup){alert('Allow pop-ups to view Packing Slip and Bundle Labels.');return false}
 try{
  const html=documentHtml(record,options.workOrder||{},
   options.photos||window.CFM_PACKING_PREVIEW_V401?.photosFor?.(record.workNo)||{});
  popup.document.open();popup.document.write(html);popup.document.close();popup.focus();return true;
 }catch(e){popup.document.open();popup.document.write('<!doctype html><title>Print blocked</title><p>Print Preview could not be prepared: '+esc(String(e.message||e))+'</p>');popup.document.close();return false}
}
window.CFM_PACK_COMBINED_V407=Object.freeze({open,collect,mount,html:documentHtml});
function init(){let n=0;const timer=setInterval(()=>{if(mount()||++n>80)clearInterval(timer)},400);mount()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();