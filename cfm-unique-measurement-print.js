/* CFM V260 - Compact Non-CF button uses optimized 20–25 page A4 register
   All available fields and measurement versions are preserved.
   Deduplicate only identical rows belonging to the SAME product and SAME full measurement set.
   Read-only: no master, pending-order, stock or cloud writes.
*/
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const norm=v=>String(v==null?'':v).normalize('NFKC').replace(/\s+/g,' ').trim().toUpperCase();
 const text=v=>String(v==null?'':v);
 const esc=v=>text(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const measurementFields=[
  ['previousMeasurement','Previous Measurement'],
  ['measurement1','Measurement 1'],
  ['measurement2','Measurement 2'],
  ['measurement3','Measurement 3'],
  ['finalMeasurement','Final Measurement']
 ];
 const getRecords=()=>{
  try{return typeof state!=='undefined'&&Array.isArray(state.measurements)?state.measurements:[];}
  catch(_){return [];}
 };
 const clean=v=>text(v).trim();
 function productIdentity(r,position){
  // Code alone is unsafe: historic ERP codes sometimes cover multiple product descriptions.
  // Names alone are unsafe: different parties and sizes may use the same wording.
  const fields=['eagleCode','description','oldProductName','party','category','size','type','micron'];
  const values=fields.map(k=>norm(r?.[k]));
  return values.some(Boolean)?JSON.stringify(values):JSON.stringify(['UNIDENTIFIED',position]);
 }
 function variantIdentity(r){
  // The entire pattern matters, not only its final dimensions.
  // A different layer, part list, cloth or roll width must remain a distinct variant.
  return JSON.stringify([
   ...measurementFields.map(([field])=>norm(r?.[field])),
   norm(r?.standardCloth),norm(r?.stdWidth)
  ]);
 }
 function listAdd(set,value){
  const v=clean(value);
  if(v)set.add(v);
 }
 function fullSummary(input){
  const records=Array.isArray(input)?input:[];
  const byProduct=new Map();
  let blanks=0;
  records.forEach((r,index)=>{
   if(!r||typeof r!=='object')return;
   const id=productIdentity(r,index);
   if(!byProduct.has(id)){
    byProduct.set(id,{
     codes:new Set(),names:new Set(),oldNames:new Set(),parties:new Set(),
     categories:new Set(),sizes:new Set(),types:new Set(),microns:new Set(),
     works:new Set(),sources:new Set(),sourceIds:new Set(),variants:new Map(),masterRows:0
    });
   }
   const p=byProduct.get(id);p.masterRows++;
   [['eagleCode','codes'],['description','names'],['oldProductName','oldNames'],
    ['party','parties'],['category','categories'],['size','sizes'],['type','types'],
    ['micron','microns'],['workNo','works'],['source','sources'],['mappingKey','sourceIds']]
    .forEach(([key,which])=>listAdd(p[which],r[key]));
   const vKey=variantIdentity(r);
   if(!p.variants.has(vKey)){
    p.variants.set(vKey,{
     measurements:Object.fromEntries(measurementFields.map(([name])=>[name,clean(r[name])])),
     cloths:new Set(),widths:new Set(),statuses:new Set(),references:new Set(),
     works:new Set(),sources:new Set(),notes:new Set(),count:0
    });
   }
   const variant=p.variants.get(vKey);
   variant.count++;
   listAdd(variant.cloths,r.standardCloth);
   listAdd(variant.widths,r.stdWidth);
   listAdd(variant.statuses,r.status);
   listAdd(variant.references,r.duplicate);
   listAdd(variant.works,r.workNo);
   listAdd(variant.sources,r.source);
   const hasValid=measurementFields.some(([key])=>{
    const v=norm(r[key]);return v&&!v.includes('MEASUREMENT REQUIRED')&&!v.includes('NO PREVIOUS MEASUREMENT');
   });
   if(!hasValid)blanks++;
  });
  const products=[...byProduct.values()].sort((a,b)=>{
   const label=p=>[...p.names][0]||[...p.oldNames][0]||[...p.codes][0]||'';
   return label(a).localeCompare(label(b),undefined,{numeric:true,sensitivity:'base'});
  });
  const uniqueVariants=products.reduce((sum,p)=>sum+p.variants.size,0);
  const validRecords=products.reduce((sum,p)=>sum+p.masterRows,0);
  return {
   rows:records.length,products:products.length,uniqueVariants,
   duplicates:Math.max(0,validRecords-uniqueVariants),incomplete:blanks,
   list:products
  };
 }
 function joined(set){
  const all=[...(set||[])].map(esc);
  return all.length?all.join(' • '):'—';
 }
 function filled(value){
  return clean(value)?esc(value):'<span class="empty">Not recorded</span>';
 }
 function reportHTML(summary){
  const now=new Date().toLocaleDateString('en-IN');
  const cards=summary.list.map((p,index)=>{
   const variants=[...p.variants.values()].map((v,vi)=>{
    const dimensions=measurementFields.map(([key])=>
      '<td><div class="meas-text">'+filled(v.measurements[key])+'</div></td>'
    ).join('');
    const refs=[
      ['Cloth',joined(v.cloths)],['Width (inch)',joined(v.widths)],
      ['Status',joined(v.statuses)],['Work Nos',joined(v.works)],
      ['Source Records',joined(v.sources)],
      ['Old Master Remark',joined(v.references)]
    ].map(([k,value])=>'<span><b>'+esc(k)+':</b> '+value+'</span>').join('');
    return '<section class="variant"><div class="variant-heading">Measurement Set '+(vi+1)+
      (p.variants.size>1?' of '+p.variants.size:'')+
      (v.count>1?' · '+v.count+' identical master entries grouped':'')+'</div>'+
      '<table class="measurements"><thead><tr>'+
      measurementFields.map(([,label])=>'<th>'+esc(label)+'</th>').join('')+
      '</tr></thead><tbody><tr>'+dimensions+'</tr></tbody></table>'+
      '<div class="variant-details">'+refs+'</div></section>';
   }).join('');
   const details=[
    ['Eagle Code',joined(p.codes)],['Party',joined(p.parties)],
    ['Category',joined(p.categories)],['Size',joined(p.sizes)],
    ['Type',joined(p.types)],['Micron',joined(p.microns)],
    ['Original Product Name',joined(p.oldNames)],
    ['All Work Nos',joined(p.works)],
    ['All Source Sheets',joined(p.sources)],
    ['Mapping Key',joined(p.sourceIds)]
   ].map(([k,value])=>'<span><b>'+esc(k)+':</b> '+value+'</span>').join('');
   return '<article class="product"><div class="product-heading">'+
     '<span class="sr">'+(index+1)+'.</span><div class="name">'+joined(p.names)+
     '</div><span class="counts">'+p.variants.size+' measurement set(s) · '+p.masterRows+' master row(s)</span></div>'+
     '<div class="product-details">'+details+'</div>'+variants+'</article>';
  }).join('');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">'+
   '<meta name="viewport" content="width=device-width,initial-scale=1">'+
   '<title>CFM Complete Measurements - Every Product</title>'+
   '<style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{margin:0;color:#202b34;font:10.5px/1.4 Arial,Helvetica,sans-serif}'+
   'h1{font-size:17px;margin:0 0 4px}.sub{color:#526473;margin:0 0 8px}.counts,.meta{font-size:10px;color:#385367}'+
   '.toolbar{padding:12px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;background:#f1f8fc;border:1px solid #c5dce9}'+
   '.toolbar button{background:#176a9e;color:white;border:0;border-radius:7px;padding:9px 13px;font-weight:800;cursor:pointer}'+
   '.stats{border-top:1px solid #b7cddc;border-bottom:1px solid #b7cddc;padding:8px 0;margin:7px 0 13px;font-size:10.5px}'+
   '.product{margin:0 0 13px;border:1px solid #aec9d6;border-radius:6px;break-inside:auto;page-break-inside:auto}'+
   '.product-heading{display:flex;gap:10px;align-items:flex-start;padding:7px 9px;background:#e8f2f7;break-after:avoid;page-break-after:avoid}'+
   '.product-heading .sr{font-weight:800}.product-heading .name{font-weight:800;font-size:12px;flex:1;white-space:pre-wrap;overflow-wrap:anywhere}'+
   '.product-heading .counts{white-space:nowrap}'+
   '.product-details{padding:7px 9px;display:grid;grid-template-columns:1fr 1fr;gap:3px 12px;overflow-wrap:anywhere}'+
   '.product-details span,.variant-details span{white-space:pre-wrap;overflow-wrap:anywhere}'+
   '.variant{padding:5px 9px 9px;border-top:1px solid #bed3dd;break-inside:auto;page-break-inside:auto}'+
   '.variant-heading{font-weight:800;color:#185b7d;margin-bottom:5px}'+
   'table.measurements{width:100%;border-collapse:collapse;table-layout:fixed}'+
   'table.measurements th,table.measurements td{border:1px solid #bdd0da;vertical-align:top;padding:5px;overflow-wrap:anywhere;width:20%}'+
   'table.measurements th{background:#f5fafc;font-size:10px;text-align:left}'+
   '.meas-text{white-space:pre-wrap;overflow-wrap:anywhere;font-size:10.5px;font-weight:600}'+
   '.empty{font-weight:400;color:#9a6471;font-style:italic}'+
   '.variant-details{display:grid;grid-template-columns:1fr 1fr;gap:2px 10px;margin-top:6px;font-size:9.5px;color:#415565}'+
   '.foot{font-size:9.5px;color:#536d7e;margin:12px 0}'+
   '@media print{.toolbar{display:none!important}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}'+
   '.product-heading,.variant-heading{break-inside:avoid}}'+
   '</style></head><body>'+
   '<div class="toolbar"><b>Complete Measurement Master: '+summary.products+' products</b>'+
   '<button onclick="window.print()">Print / Save as PDF</button></div>'+
   '<h1>EAGLE FILTRATION — Complete Product Measurement Master</h1>'+
   '<p class="sub">Every product · All 5 measurement fields · No cutting pattern omitted · '+esc(now)+'</p>'+
   '<div class="stats"><b>Master rows:</b> '+summary.rows+
   ' &nbsp; | &nbsp; <b>Products:</b> '+summary.products+
   ' &nbsp; | &nbsp; <b>Different measurement sets:</b> '+summary.uniqueVariants+
   ' &nbsp; | &nbsp; <b>Exact duplicate rows grouped:</b> '+summary.duplicates+
   ' &nbsp; | &nbsp; <b>Rows without actual measurements (included):</b> '+summary.incomplete+'</div>'+
   (cards||'<p>No measurement master records found. Check ERP master import.</p>')+
   '<p class="foot">All available measurement fields, product codes, cloth, width and source references printed in full. '+
   'Only identical product + identical complete measurement sets are grouped; different measurements remain separate. '+
   'Missing details are shown as Not recorded, not invented. Source master data is unchanged. '+
   'Verify physical pattern before cutting.</p></body></html>';
 }

 // Paper saver: single continuous table, no large product cards or blank spacers.
 // It prints EVERY distinct measurement variant and keeps all five original fields.
 function compactReportHTML(summary){
  const date=new Date().toLocaleDateString('en-IN');
  const refs=(pairs)=>pairs.map(([label,content])=>
    '<span class="ref"><b>'+esc(label)+':</b> '+content+'</span>'
  ).join('<span class="sep"> | </span>');
  const rows=summary.list.map((p,idx)=>{
   const headline='<tr class="product-title"><td colspan="7"><strong>'+(idx+1)+'. '+joined(p.names)+'</strong>'+
    '<span class="tag">Eagle '+joined(p.codes)+'</span>'+
    '<span class="tag">Party '+joined(p.parties)+'</span>'+
    '<span class="tag">'+p.variants.size+' cutting set(s)</span>'+
    '<div class="more">'+refs([
      ['Category',joined(p.categories)],['Size',joined(p.sizes)],
      ['Type',joined(p.types)],['Micron',joined(p.microns)],
      ['Original Name',joined(p.oldNames)],
      ['Work Nos',joined(p.works)],['Source Sheets',joined(p.sources)],
      ['Mapping Key',joined(p.sourceIds)]
    ])+'</div></td></tr>';
   const entries=[...p.variants.values()].map((v,i)=>{
    const cells=measurementFields.map(([k])=>'<td class="measure">'+filled(v.measurements[k])+'</td>').join('');
    const details=refs([
      ['Cloth',joined(v.cloths)],['Width',joined(v.widths)],
      ['Status',joined(v.statuses)],['Work Nos',joined(v.works)],
      ['Source',joined(v.sources)],['Master Note',joined(v.references)]
    ]);
    return '<tr class="cutting-row"><td class="set">'+(i+1)+
      (v.count>1?'<small>×'+v.count+'</small>':'')+'</td>'+
      cells+'<td class="spec">'+details+'</td></tr>';
   }).join('');
   return headline+entries;
  }).join('');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">'+
   '<meta name="viewport" content="width=device-width,initial-scale=1">'+
   '<title>CFM Complete Measurements — Compact A4 Print</title>'+
   '<style>'+
   '@page{size:A4 landscape;margin:6mm 7mm}*{box-sizing:border-box}'+
   'body{margin:0;color:#18262f;font:10px/1.25 Arial,Helvetica,sans-serif}'+
   '.toolbar{padding:10px 12px;margin-bottom:9px;background:#eff7fb;display:flex;justify-content:space-between;align-items:center;gap:12px}'+
   '.toolbar button{padding:9px 14px;border:0;border-radius:6px;background:#176a9e;color:#fff;font-weight:800;cursor:pointer}'+
   'h1{font-size:15px;margin:0 0 3px}.summary{margin:0 0 7px;font-size:10px;color:#40596a}'+
   'table{table-layout:fixed;border-collapse:collapse;width:100%;font:10px/1.27 Arial,Helvetica,sans-serif}'+
   'thead{display:table-header-group}th,td{border:1px solid #b6c5ce;padding:3px 4px;text-align:left;vertical-align:top;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word}'+
   'th{background:#e7eff4;font-weight:800;font-size:10px}'+
   'th:nth-child(1){width:4%}th:nth-child(2){width:16%}th:nth-child(3){width:14%}th:nth-child(4){width:14%}'+
   'th:nth-child(5){width:14%}th:nth-child(6){width:17%}th:nth-child(7){width:21%}'+
   '.product-title td{background:#f3f7f9;padding:4px 5px;border-top:1.4px solid #839cad;page-break-after:avoid;break-after:avoid}'+
   '.product-title strong{font-size:10.7px;margin-right:9px}.tag{margin-right:9px;font-weight:600}'+
   '.more{margin-top:2px;font-size:9px;color:#465b66}'+
   '.ref{display:inline;white-space:pre-wrap}.ref b{font-weight:700}.sep{color:#a3abb0;padding:0 3px}'+
   '.set{text-align:center;font-weight:800;white-space:normal}.set small{display:block;font-weight:400;color:#687783}'+
   '.measure{font-size:10px;font-weight:600}.spec{font-size:9px;color:#2f4757}'+
   '.cutting-row{break-inside:avoid;page-break-inside:avoid}'+
   '.empty{color:#826e73;font-weight:400;font-style:italic}'+
   '.foot{font-size:9px;color:#536471;margin-top:7px}'+
   '@media print{.toolbar{display:none!important}'+
   'body{-webkit-print-color-adjust:exact;print-color-adjust:exact}'+
   'thead{display:table-header-group}'+
   '.product-title{break-after:avoid;page-break-after:avoid}'+
   '}'+
   '</style></head><body>'+
   '<div class="toolbar"><b>CFM Complete Measurements — Compact, Less Paper</b>'+
   '<button type="button" onclick="window.print()">Print / Save as PDF</button></div>'+
   '<h1>EAGLE FILTRATION — Cutting Measurement Master</h1>'+
   '<p class="summary"><b>Compact A4 landscape</b> · '+esc(date)+
   ' · '+summary.products+' products · '+summary.uniqueVariants+' complete cutting sets · '+
   summary.duplicates+' exact duplicates grouped · '+summary.incomplete+' incomplete source rows included</p>'+
   '<table><thead><tr><th>Set</th><th>Previous Measurement</th><th>Measurement 1</th>'+
   '<th>Measurement 2</th><th>Measurement 3</th><th>Final Measurement</th>'+
   '<th>Cloth / Width / References</th></tr></thead><tbody>'+
   (rows||'<tr><td colspan="7">No measurement master records.</td></tr>')+
   '</tbody></table><p class="foot">Full values printed without truncation. Every distinct set per product is retained. '+
   'Only exact duplicate product + complete measurement records are grouped. '+
   'Blank fields are marked Not recorded. The original ERP master is unchanged.</p>'+
   '</body></html>';
 }

 // V258: exclude CF/CFB family ONLY from print, not from the ERP master.
 function nonCFRecord(r){
  const c=norm(r?.category),d=norm(r?.description);
  return c!=='CFB' && !/\bCF\s*(?:BAG|BG|48|36|60|24)\b|CENTRIFUGAL/.test(d);
 }
 function removeEmbeddedCFParts(value){
  const parts=text(value).split(/\s+\|\s+/);
  return parts.filter(v=>!/\bCF\s*(?:BAG|BG|48|36|60|24)\b/i.test(v)).join(' | ');
 }
 function copyWithoutCFParts(r){
  const cleanCopy={...r};
  for(const [k] of measurementFields)cleanCopy[k]=removeEmbeddedCFParts(r?.[k]);
  return cleanCopy;
 }
 // Print 499-ish non-CF source records as a 2-column, if needed 3-column,
 // paginated job. Nothing gets truncated; overflow produces extra pages,
 // rather than omitting measurements or clipping a dimension.
 function paperSaverReportHTML(summary){
  const records=[];
  summary.list.forEach((p,productIndex)=>{
   const title=joined(p.names),code=joined(p.codes),party=joined(p.parties);
   [...p.variants.values()].forEach((v,vi)=>{
    const mm=v.measurements||{},prev=clean(mm.previousMeasurement),
      m1=clean(mm.measurement1),m2=clean(mm.measurement2),
      m3=clean(mm.measurement3),final=clean(mm.finalMeasurement);
    const placeholder=s=>norm(s)==='NEW PRODUCT - NO PREVIOUS MEASUREMENT';
    const same=m1&&final&&norm(m1)===norm(final);
    const part=[];
    if(prev&&!placeholder(prev))part.push('<b>Previous:</b> '+esc(prev));
    if(same)part.push('<b>Cutting (M1 = Final):</b> '+esc(final));
    else {
      if(m1)part.push('<b>M1:</b> '+esc(m1));
      if(final)part.push('<b>Final:</b> '+esc(final));
    }
    if(m2)part.push('<b>M2:</b> '+esc(m2));
    if(m3)part.push('<b>M3:</b> '+esc(m3));
    if(!part.length)part.push('<span class="empty">Measurement not recorded</span>');
    const refs=[
      ['Cloth',joined(v.cloths)],['Width',joined(v.widths)],
      ['Category',joined(p.categories)],['Size',joined(p.sizes)],
      ['Micron',joined(p.microns)],['Work',joined(v.works)]
    ].filter(([,val])=>val!=='—').map(([name,val])=>
      '<span><b>'+name+':</b> '+val+'</span>').join(' · ');
    const row='<article class="entry"><div class="e-head"><b>'+title+'</b>'+
      '<span class="e-code">'+code+
      (p.variants.size>1?' · Set '+(vi+1)+'/'+p.variants.size:'')+
      '</span></div>'+
      (party!=='—'?'<div class="party">'+party+'</div>':'')+
      '<div class="dimensions">'+part.join(' <span class="part-sep">|</span> ')+'</div>'+
      (refs?'<div class="refs">'+refs+'</div>':'')+
      '</article>';
    records.push(row);
   });
  });
  const report='<div id="unpaginated" hidden>'+records.join('')+'</div>'+
    '<div id="print-pages"></div><div id="measure" aria-hidden="true"></div>';
  const date=new Date().toLocaleDateString('en-IN');
  const html='<!doctype html><html><head><meta charset="utf-8">'+
   '<meta name="viewport" content="width=device-width,initial-scale=1">'+
   '<title>CFM Non-CF Measurement Master • 20–25 Page Target</title>'+
   '<style>@page{size:A4 landscape;margin:5mm 7mm}'+
   ':root{--print-font:10.8px}*{box-sizing:border-box}body{margin:0;color:#1c303a;font:11px Arial,sans-serif}'+
   '.controls{position:sticky;top:0;background:#e9f4fa;padding:10px 14px;border-bottom:1px solid #adc9d8;z-index:8;display:flex;align-items:center;gap:14px;flex-wrap:wrap}'+
   '.controls button{background:#166c9d;color:white;border:0;border-radius:6px;padding:9px 14px;font-weight:800;cursor:pointer}'+
   '.controls .warn{color:#9b3b19;font-weight:800}'+
   '.sheet{width:283mm;height:190mm;break-after:page;page-break-after:always;margin:0 auto 7mm;overflow:visible}'+
   '.sheet-head{height:5mm;font-size:10px;line-height:5mm;font-weight:800;border-bottom:1px solid #9db7c6;display:flex;justify-content:space-between}'+
   '.columns{height:185mm;display:grid;column-gap:3mm;align-items:start}'+
   '.columns.two{grid-template-columns:repeat(2,minmax(0,1fr))}'+
   '.columns.three{grid-template-columns:repeat(3,minmax(0,1fr))}'+
   '.column{height:185mm;overflow:visible;min-width:0}'+
   '.entry{font-size:var(--print-font);line-height:1.18;padding:2px 3px 3px;margin:0 0 2px;border-bottom:1px solid #cad5db;overflow-wrap:anywhere;word-break:normal;break-inside:avoid;page-break-inside:avoid}'+
   '.e-head{display:flex;flex-wrap:wrap;gap:3px 6px;align-items:baseline}.e-head b{font-size:1.03em;line-height:1.12;white-space:normal}'+
   '.e-code{font-size:.91em;color:#34596c;white-space:normal}.party{font-size:.9em;color:#445a68;line-height:1.12}'+
   '.dimensions{white-space:pre-wrap;font-weight:600;margin:2px 0 1px;line-height:1.22}'+
   '.dimensions b{font-weight:800}.part-sep{color:#9baab2;padding:0 2px}'+
   '.refs{font-size:.87em;color:#425766;line-height:1.16;white-space:pre-wrap}'+
   '.empty{color:#806673;font-style:italic}.status{font-size:12px}'+
   '#measure{position:absolute;visibility:hidden;top:-100000px;left:-100000px;pointer-events:none}'+
   '@media print{.controls{display:none!important}.sheet{margin:0;break-after:page;page-break-after:always}'+
   '.sheet:last-child{break-after:auto;page-break-after:auto}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}'+
   '</style></head><body>'+
   '<div class="controls"><b>CFM Non-CF Measurement Master</b><span class="status" id="layout-status">Preparing complete print…</span>'+
   '<button id="print-now" onclick="window.print()" disabled>Print / Save PDF</button></div>'+
   '<div id="dataset" data-items="'+records.length+'" hidden></div>'+
   report+
   '<script>(function(){'+
   'const source=Array.from(document.querySelectorAll("#unpaginated .entry"));'+
   'const host=document.getElementById("print-pages"),probe=document.getElementById("measure");'+
   'const status=document.getElementById("layout-status"),printer=document.getElementById("print-now");'+
   'const layouts=[{cols:2,font:10.8},{cols:3,font:10.8},{cols:3,font:10.3},{cols:3,font:9.9}];'+
   'function lay(opt){document.documentElement.style.setProperty("--print-font",opt.font+"px");'+
   'host.replaceChildren();probe.style.width=((283-(opt.cols-1)*3)/opt.cols)+"mm";'+
   'let count=0,sheet=null,columns=[],ix=0,used=0,cap=0;'+
   'function nextPage(){sheet=document.createElement("section");sheet.className="sheet";'+
   'const head=document.createElement("div");head.className="sheet-head";'+
   'head.innerHTML="<span>EAGLE FILTRATION — Non-CF Measurement Master</span><span>'+esc(date)+' · Page "+(count+1)+"</span>";'+
   'const grid=document.createElement("div");grid.className="columns "+(opt.cols===2?"two":"three");'+
   'columns=[];for(let i=0;i<opt.cols;i++){const col=document.createElement("div");col.className="column";grid.append(col);columns.push(col)}'+
   'sheet.append(head,grid);host.append(sheet);count++;ix=0;used=0;cap=columns[0].clientHeight;}'+
   'nextPage();for(const item of source){probe.replaceChildren(item.cloneNode(true));const h=probe.firstElementChild.getBoundingClientRect().height;'+
   'if(used+h+1>cap&&used>0){ix++;used=0;if(ix>=columns.length)nextPage();}'+
   'columns[ix].append(item.cloneNode(true));used+=h;}return count;}'+
   'let pages=0;let which=layouts[layouts.length-1];'+
   'for(const cfg of layouts){pages=lay(cfg);which=cfg;if(pages<=25)break;}'+
   'status.textContent=source.length+" complete non-CF measurement sets · "+pages+" A4 pages · "+which.cols+" columns · "+which.font+"px";'+
   'if(pages>25){status.className="status warn";status.textContent+=" · More than 25 pages needed to avoid cutting data";}'+
   'printer.disabled=false;window.__CFM_PRINT_INFO={rows:source.length,pages,columns:which.cols,font:which.font};'+
   '})();<\/script></body></html>';
  return html;
 }
 function selectedRows(filtered){
  // Category CFB covers CF BAG 24/36/48/60 and related centrifugal filter bags.
  // Do not alter, remove or hide the source master in the normal ERP screens.
  const rows=getRecords().filter(nonCFRecord);
  const search=filtered?clean($('measurementSearch')?.value).toLowerCase():'';
  return (search?rows.filter(r=>JSON.stringify(r).toLowerCase().includes(search)):rows)
    .map(copyWithoutCFParts);
 }
 function doPrint(filtered,format='paper'){
  const summary=fullSummary(selectedRows(filtered));
  if(!summary.products){alert('No Measurement Master product found. Clear search or load master data.');return false;}
  const viewer=window.open('','_blank');
  if(!viewer){alert('Print preview blocked. Allow ERP pop-ups and retry.');return false;}
  viewer.document.open();viewer.document.write(format==='detailed'?reportHTML(summary):paperSaverReportHTML(summary));viewer.document.close();viewer.focus();
  return true;
 }
 function updateSummary(){
  const stat=$('cfmFullMeasurementStats');
  if(!stat)return;
  const s=fullSummary(selectedRows(true));
  stat.textContent=s.rows+' source rows · '+s.products+' products · '+
    s.uniqueVariants+' complete measurement sets · '+s.duplicates+
    ' exact duplicates grouped · '+s.incomplete+' incomplete entries included'+
    (clean($('measurementSearch')?.value)?' · Search active':'');
 }
 function mount(){
  const page=$('view-measurements');
  if(!page || $('cfmUniqueMeasurementTools'))return;
  const pane=document.createElement('section');
  pane.id='cfmUniqueMeasurementTools';
  pane.style.cssText='margin:12px 2px;padding:13px;border:1px solid #b4d5e6;border-radius:11px;background:#f0f9ff;color:#17445f;font:13px/1.5 system-ui';
  const heading=document.createElement('strong');
  heading.textContent='🖨 Complete Measurements Master — Every Product';
  heading.style.cssText='display:block;font-size:15px;margin-bottom:6px';pane.append(heading);
  const info=document.createElement('p');
  info.textContent='Compact Non-CF: 20–25 page target in easy-to-read A4 layout. CF Bags excluded from print. All other cutting sizes are included, with duplicate M1 / Final values shown once.';
  info.style.cssText='margin:4px 0 8px';pane.append(info);
  const count=document.createElement('div');count.id='cfmFullMeasurementStats';
  count.style.cssText='font-weight:800;margin:7px 0;color:#16638d';count.setAttribute('role','status');
  pane.append(count);
  const actions=document.createElement('div');actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap';
  [['🖨 Compact Non-CF — 20–25 Pages',false,'paper'],['🖨 Search Non-CF — Compact',true,'paper'],['Detailed Non-CF (All)',false,'detailed']].forEach(([name,filtered,format])=>{
    const b=document.createElement('button');b.type='button';b.className='btn btn-primary';
    b.textContent=name;b.style.cssText='min-height:40px;font-size:12px';
    b.addEventListener('click',()=>doPrint(filtered,format));actions.append(b);
  });
  pane.append(actions);
  const marker=page.querySelector('.filters')||page.querySelector('.section-head');
  if(marker)marker.insertAdjacentElement('afterend',pane);else page.prepend(pane);
  $('measurementSearch')?.addEventListener('input',updateSummary);
  updateSummary();
 }
 window.CFM_FULL_MEASUREMENTS={fullSummary,reportHTML,compactReportHTML,paperSaverReportHTML,nonCFRecord,removeEmbeddedCFParts,selectedRows,doPrint,updateSummary};
 function init(){try{mount()}catch(e){console.warn('CFM full measurements',e)}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 setTimeout(init,1200);
})();