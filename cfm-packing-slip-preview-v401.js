/* CFM Packing Slip A4 Landscape Preview V401
 * Presentation only: renders existing verified slip record and matching WO.
 * Never saves shipment, edits stock, prints automatically or changes Cloud.
 * Two optional photographs are session-only, not stored in Cloud.
 */
(function(){
'use strict';
const ID='cfmPackPreviewV401';
const E=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const str=x=>String(x??'').trim();
const show=x=>str(x)||'—';
const n=x=>Number.isFinite(Number(x))?Number(x):0;
const format=x=>str(x)===''?'—':String(x);
const files=new Map();let activeWork='';
const inputId=i=>'cfmPackPhoto'+i+'V401';
function addInputs(){
 const dlg=document.getElementById('packSlipDialog');
 if(!dlg||document.getElementById('cfmPackPhotosV401'))return;
 const remark=document.getElementById('packSlipRemarks');
 if(!remark)return;
 const parent=remark.closest('label')||remark.parentElement;
 const panel=document.createElement('section');panel.id='cfmPackPhotosV401';
 panel.innerHTML='<div class="cfm-pack-photos-title">PRODUCT / PACKAGE PHOTOS (OPTIONAL)</div>'+
 '<p>2 photos for this print preview only. Photos are not uploaded to Cloud and will not appear automatically on another device.</p>'+
 '<div class="cfm-pack-photo-inputs">'+
 '<label>Photo 1 (Product)<input id="'+inputId(1)+'" type="file" accept="image/png,image/jpeg,image/webp"></label>'+
 '<label>Photo 2 (Packed Goods)<input id="'+inputId(2)+'" type="file" accept="image/png,image/jpeg,image/webp"></label>'+
 '</div><div class="cfm-pack-photo-state" id="cfmPackPhotoStateV401">No photos selected</div>';
 const css=document.createElement('style');css.id='cfmPackPhotosCssV401';
 css.textContent='#cfmPackPhotosV401{margin:11px 0;padding:11px;border:1px solid #c8daeb;border-radius:10px;background:#f2f8fd}'+
 '#cfmPackPhotosV401 .cfm-pack-photos-title{font:800 12px Arial;color:#164c7b}'+
 '#cfmPackPhotosV401 p{font:500 10px/1.45 Arial;color:#53728c;margin:5px 0}'+
 '#cfmPackPhotosV401 .cfm-pack-photo-inputs{display:grid;grid-template-columns:1fr 1fr;gap:9px}'+
 '#cfmPackPhotosV401 .cfm-pack-photo-inputs label{font-size:11px}'+
 '#cfmPackPhotosV401 input{font-size:10px;padding:6px!important}'+
 '#cfmPackPhotosV401 .cfm-pack-photo-state{font:650 10px/1.4 Arial;color:#287058}'+
 '@media(max-width:700px){#cfmPackPhotosV401 .cfm-pack-photo-inputs{grid-template-columns:1fr}}';
 document.head.appendChild(css);parent.after(panel);
 const work=document.getElementById('packSlipWO');
 const update=()=>{
  const id=str(work?.value);
  if(id!==activeWork){activeWork=id;for(let i=1;i<=2;i++){const el=document.getElementById(inputId(i));if(el)el.value=''}}
  const has=files.get(id)||{};
  document.getElementById('cfmPackPhotoStateV401').textContent=
   (has[1]?'Photo 1 ready':'Photo 1 not attached')+' · '+(has[2]?'Photo 2 ready':'Photo 2 not attached');
 };
 work?.addEventListener('change',update);
 for(let i=1;i<=2;i++){
  const input=document.getElementById(inputId(i));
  input.addEventListener('change',()=>{
   const file=input.files?.[0],workId=str(work?.value);
   if(!file||!workId){update();return}
   if(!/^image\/(?:png|jpeg|webp)$/.test(file.type)||file.size>6*1024*1024){
    input.value='';alert('Select a JPG/PNG/WebP photo under 6 MB.');return;
   }
   const reader=new FileReader();
   reader.onload=()=>{
    if(!str(reader.result).startsWith('data:image/'))return;
    const row=files.get(workId)||{};
    row[i]=String(reader.result);files.set(workId,row);update();
   };
   reader.readAsDataURL(file);
  });
 }
 update();
}
function pick(row,fields){
 for(const key of fields){const value=str(row?.[key]);if(value)return value}
 return '';
}
function originalLogo(){
 const brand=window.CFM_EAGLE_BRAND;
 const icon=brand?.logoSvg?.(88,74,'#111')||'<span style="font-size:34px;font-weight:900">E</span>';
 const mark=brand?.wordmarkPath?
 '<svg viewBox="0 0 465 80" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="EAGLE" preserveAspectRatio="xMinYMid meet"><path d="'+brand.wordmarkPath+'" fill="#111" fill-rule="evenodd"/></svg>':
 '<b style="font-size:25px">EAGLE</b>';
 return '<div class="logo-mark">'+icon+'</div><div class="logo-copy">'+mark+
 '<div>FILTRATION PRODUCT PVT. LTD.</div><small>SINCE 1992 · INDUSTRIAL FILTRATION SOLUTIONS</small></div>';
}
function urlSafe(x){
 const s=str(x);
 return s.startsWith('data:image/png;base64,')||s.startsWith('data:image/jpeg;base64,')||s.startsWith('data:image/webp;base64,')?s:'';
}
function documentHtml(r,work,photos){
 const mapped=window.CFM_PACKING_WO_FIELDS_V405?.(work)||{};
 const from=(a,b)=>str(a)||str(b);
 const party=from(r.party,work?.party),address=from(r.partyAddress,pick(work,['shipToAddress','deliveryAddress','dispatchAddress','partyAddress','customerAddress','consigneeAddress','address']));
 const po=from(r.poNo,work?.poNo),poDate=from(r.poDate,pick(work,['poDate','purchaseOrderDate']));
 const slipNo=str(r.slipNo)||(r.draft?'PREVIEW ONLY':'—');
 const slipDate=str(r.createdAt||r.date).slice(0,10)||new Date().toISOString().slice(0,10);
 const code=from(r.efpplCode,mapped.efpplCode||pick(work,['itemCode','efpplCode','eagleCode']));
 const description=from(r.description,work?.description);
 const detail=from(r.description2,work?.description2);
 const customerItem=from(r.customerItemNo,pick(work,['buyerItemCode','customerItemCode','customerItemNo','poItemNo','itemNo']));
 const size=from(r.size,mapped.size||pick(work,['size','sizeInch','dimensions']));
 const micron=from(r.micron,mapped.micron||pick(work,['micron','micronRating']));
 const draft=!!r.draft,legacy=!!r.legacy;
 const items=Array.isArray(r.items)&&r.items.length?r.items:[{
    workNo:r.workNo,customerItemNo:customerItem,efpplCode:code,description,description2:detail,size,micron,qty:r.thisDispatched
 }];
 const th=(label)=>'<th>'+E(label)+'</th>';
 const cell=(label,val)=>'<div class="cell"><span>'+E(label)+'</span><strong>'+E(show(val))+'</strong></div>';
 const qtycell=(label,val)=>'<div class="qtycell"><span>'+E(label)+'</span><strong>'+E(format(val))+'</strong></div>';
 const row=(x,i)=>'<tr><td class="num">'+(i+1)+'</td>'+
  '<td>'+E(show(x.workNo||r.workNo))+'</td>'+
  '<td>'+E(show(x.efpplCode||code))+'</td>'+
  '<td>'+E(show(x.customerItemNo||customerItem))+'</td>'+
  '<td class="product">'+E(show(x.description||description))+'</td>'+
  '<td class="product">'+E(show(x.description2||detail))+'</td>'+
  '<td>'+E(show(x.micron||micron))+'</td>'+
  '<td>'+E(show(x.size||size))+'</td>'+
  '<td class="num">'+E(format(x.qty??r.thisDispatched))+'</td></tr>';
 const photo=i=>'<div class="photo"><div class="photo-label">PHOTO '+i+' — '+(i===1?'PRODUCT':'PACKED GOODS')+'</div>'+
  (urlSafe(photos[i])?'<img alt="Photo '+i+'" src="'+photos[i]+'">':
   '<div class="no-photo">PHOTO NOT ATTACHED</div>')+'</div>';
 const status=draft?'DRAFT PREVIEW — NOT DISPATCHED':legacy?'HISTORICAL RECORD — DISPATCH UNVERIFIED':'VERIFIED PACKING SLIP';
 const css=[
 '@page{size:A4 landscape;margin:8mm}',
 '*{box-sizing:border-box}',
 'html,body{margin:0;padding:0;background:#eef2f6;color:#111;font-family:Arial,Helvetica,sans-serif}',
 '.toolbar{position:sticky;top:0;z-index:4;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;background:#092e57;color:white;padding:11px 16px;font:700 13px Arial}',
 '.toolbar button{border:1px solid #fff8;padding:9px 15px;border-radius:7px;background:#fff;color:#073d75;font-weight:800;cursor:pointer}',
 '.paper{width:281mm;min-height:194mm;margin:15px auto;padding:0;background:#fff;border:1px solid #bbb;box-shadow:0 6px 28px #0002}',
 '.page{width:100%;padding:0;background:#fff;color:#111}',
 '.header{display:flex;align-items:center;justify-content:space-between;gap:8mm;border-bottom:2px solid #111;padding:4mm 2mm 3mm}',
 '.brand{display:flex;align-items:center;gap:4mm;flex:1}.logo-mark{width:23mm}.logo-mark svg{width:100%;height:20mm}',
 '.logo-copy{max-width:68mm}.logo-copy svg{display:block;width:56mm;height:10mm}',
 '.logo-copy div{font-size:12px;font-weight:800;letter-spacing:.1px}.logo-copy small{display:block;margin-top:2px;font-size:8px;font-weight:750}',
 '.dochead{text-align:right;max-width:110mm}.dochead h1{font-size:24px;letter-spacing:.7px;margin:0;font-weight:900}',
 '.dochead small{display:block;font-size:10px;margin-top:2px}.dochead .status{font:bold 9px Arial;padding:4px 7px;border:1px solid #111;display:inline-block;margin-top:5px}',
 '.info{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));border:1px solid #111;border-right:0;margin:4mm 0 0}',
 '.cell{border-right:1px solid #111;min-width:0;padding:2mm}.cell span,.qtycell span{font:bold 9px Arial;display:block;margin-bottom:2mm}',
 '.cell strong{font:bold 11px/1.25 Arial;display:block;overflow-wrap:anywhere;white-space:pre-wrap}',
 '.party-grid{display:grid;grid-template-columns:1.35fr 1fr;gap:0;border:1px solid #111;margin-top:3mm}',
 '.party-grid section{padding:2.4mm 3mm;min-width:0}.party-grid section+section{border-left:1px solid #111}',
 '.sect{font:bold 10px Arial;border-bottom:1px solid #aaa;padding-bottom:1mm;margin-bottom:2mm;letter-spacing:.2px}',
 '.party{font:bold 13px Arial;margin-bottom:2mm;overflow-wrap:anywhere}',
 '.address{font:10.5px/1.35 Arial;white-space:pre-wrap;min-height:13mm;overflow-wrap:anywhere}',
 '.ref{display:grid;grid-template-columns:30mm 1fr;gap:2mm;font:10px/1.4 Arial;padding:1.5mm 0;border-bottom:1px solid #ddd}',
 '.ref b{overflow-wrap:anywhere}',
 '.tabletitle{font:bold 10px Arial;margin:3mm 0 1.5mm}',
 'table{width:100%;border-collapse:collapse;table-layout:fixed}',
 'th,td{border:1px solid #111;padding:2mm 1.5mm;vertical-align:top;overflow-wrap:anywhere;white-space:pre-wrap}',
 'th{font:bold 8.5px/1.2 Arial}td{font:10px/1.3 Arial}.num{text-align:center;font-weight:800}.product{font-weight:700}',
 '.quantities{display:grid;grid-template-columns:repeat(5,1fr);gap:0;border:1px solid #111;border-right:0;margin-top:3mm}',
 '.qtycell{padding:2.5mm 2mm;text-align:center;border-right:1px solid #111}',
 '.qtycell strong{font:bold 17px Arial;display:block}',
 '.photos{display:grid;grid-template-columns:1fr 1fr;gap:3mm;margin-top:3mm}',
 '.photo{height:39mm;border:1px solid #111;display:flex;flex-direction:column;align-items:center;overflow:hidden}',
 '.photo-label{width:100%;padding:1.5mm 2mm;border-bottom:1px solid #111;text-align:left;font:bold 8.5px Arial}',
 '.photo img{height:calc(39mm - 7mm);max-width:100%;object-fit:contain}',
 '.no-photo{display:grid;place-items:center;flex:1;color:#888;font:700 10px Arial}',
 '.bottom{display:grid;grid-template-columns:1.4fr 1fr;gap:3mm;margin-top:3mm}',
 '.remark{border:1px solid #111;padding:2mm;font:10px Arial;min-height:14mm;overflow-wrap:anywhere}',
 '.remark b{display:block;font:800 9px Arial;margin-bottom:2mm}',
 '.signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;align-items:end}',
 '.signatures>div{border-top:1px solid #111;padding-top:1.5mm;text-align:center;font:800 9px Arial}.signatures span{display:block;font:700 10px Arial;margin-top:1mm}',
 '.footline{font:bold 8px Arial;border-top:1px solid #aaa;margin-top:3mm;padding:1.5mm 1mm}',
 '.draftnote{color:#9b1c1c;font-weight:800}',
 '@media print{html,body{background:#fff!important;margin:0!important}.toolbar{display:none!important}.paper{width:auto;min-height:0;margin:0;border:0;box-shadow:none}.page{break-inside:avoid}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}',
 '@media screen and (max-width:1050px){.paper{transform:scale(.75);transform-origin:top left;margin:12px 0 -40mm;width:281mm}}',
 '@media screen and (max-width:720px){.paper{transform:scale(.37);transform-origin:top left;margin:12px 0 -115mm}}'
 ].join('');
 const html='<main class="page"><div class="header"><div class="brand">'+originalLogo()+'</div>'+
 '<div class="dochead"><h1>PACKING SLIP</h1><small>EAGLE FILTRATION PRODUCT PVT. LTD.</small>'+
 '<div class="status">'+E(status)+'</div></div></div>'+
 '<div class="info">'+cell('PACKING SLIP NO.',slipNo)+cell('SLIP DATE',slipDate)+
 cell('WORK ORDER NO.',r.workNo)+cell('CUSTOMER PO NO.',po)+cell('PO DATE',poDate)+'</div>'+
 '<div class="party-grid"><section><div class="sect">CUSTOMER / SHIP-TO</div>'+
 '<div class="party">'+E(show(party))+'</div>'+
 '<div class="address">'+(address?E(address):'ADDRESS NOT IN WORK ORDER — VERIFY WITH CUSTOMER PO')+'</div>'+
 '</section><section><div class="sect">ORDER & ITEM REFERENCES</div>'+
 '<div class="ref"><span>EFPPL ITEM CODE</span><b>'+E(show(code))+'</b></div>'+
 '<div class="ref"><span>CUSTOMER ITEM CODE</span><b>'+E(show(customerItem))+'</b></div>'+
 '<div class="ref"><span>PRODUCT</span><b>'+E(show(description))+'</b></div>'+
 '</section></div>'+
 '<div class="tabletitle">PRODUCT DETAILS · AS PER WORK ORDER & CUSTOMER PO</div>'+
 '<table><colgroup><col style="width:4%"><col style="width:11%"><col style="width:14%">'+
 '<col style="width:12%"><col style="width:20%"><col style="width:21%"><col style="width:6%">'+
 '<col style="width:6%"><col style="width:6%"></colgroup>'+
 '<thead><tr>'+['SR.','WORK ORDER','EFPPL ITEM CODE','CUSTOMER ITEM','PRODUCT DESCRIPTION','TECHNICAL / SIZE / SPECIFICATION','MICRON','SIZE','DISPATCH QTY'].map(th).join('')+'</tr></thead>'+
 '<tbody>'+items.map(row).join('')+'</tbody></table>'+
 '<div class="quantities">'+qtycell('ORDER QTY',r.orderQty)+qtycell('PREVIOUS DISPATCH',legacy?'UNVERIFIED':r.previousDispatched)+
 qtycell('THIS DISPATCH QTY',r.thisDispatched)+qtycell('TOTAL DISPATCHED',legacy?'UNVERIFIED':r.totalDispatched)+
 qtycell('BALANCE QTY',legacy?'UNVERIFIED':r.balanceAfter)+'</div>'+
 '<div class="photos">'+photo(1)+photo(2)+'</div>'+
 '<div class="bottom"><div class="remark"><b>LR / COURIER / DISPATCH / PACKING REMARKS</b>'+E(show(r.notes))+'</div>'+
 '<div class="signatures"><div>PREPARED BY<br><span>'+E(str(r.operator)||'________')+'</span></div><div>PACKED / CHECKED BY<br><span>'+E(str(r.packedBy||r.checkedBy)||'________')+'</span></div><div>RECEIVED BY<br><span>________</span></div></div></div>'+
 '<div class="footline">'+
 (draft?'<span class="draftnote">DRAFT — PRINT PREVIEW ONLY · NO GOODS DISPATCHED OR SAVED</span>':
 legacy?'HISTORICAL PACKING RECORD · QUANTITY HISTORY NOT VERIFIED':
 'CONFIRMED SHIPMENT · REPRINT DOES NOT CREATE ANOTHER DISPATCH')+
 ' · Photos in this print are not saved in Cloud.</div></main>';
 const title=E(show(slipNo))+' · EAGLE Packing Slip';
 return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>'+title+'</title><style>'+css+'</style></head><body>'+
 '<div class="toolbar"><span>PACKING SLIP · A4 Landscape Preview · '+E(status)+'</span>'+
 '<span><button type="button" onclick="window.print()">🖨 Print / Save PDF</button> '+
 '<button type="button" onclick="window.close()">Close</button></span></div>'+
 '<div class="paper">'+html+'</div></body></html>';
}
function open(record,opts={}){
 if(!record)return false;
 const win=window.open('','_blank');if(!win){alert('Please allow pop-ups for Packing Slip preview.');return false}
 const w=opts.workOrder||{},photos=files.get(str(record.workNo))||{};
 try{
  const output=documentHtml(record,w,photos);
  win.document.open();win.document.write(output);win.document.close();win.focus();
  return true;
 }catch(e){
  win.document.body.textContent='Packing Slip preview could not be prepared: '+String(e.message||e);
  return false;
 }
}
function init(){
 if(document.getElementById(ID))return;
 const sentinel=document.createElement('span');sentinel.id=ID;sentinel.hidden=true;document.body.appendChild(sentinel);
 let attempts=0;const timer=setInterval(()=>{addInputs();if(document.getElementById('cfmPackPhotosV401')||++attempts>80)clearInterval(timer)},450);
 addInputs();
}
window.CFM_PACKING_PREVIEW_V401=Object.freeze({open,html:documentHtml,photosFor:workNo=>({...files.get(str(workNo))})});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();