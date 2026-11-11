/* CFM V257 - Complete and compact Product-wise Measurement Master Print
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
 function selectedRows(filtered){
  const rows=getRecords();
  if(!filtered)return rows;
  const search=clean($('measurementSearch')?.value).toLowerCase();
  return search?rows.filter(r=>JSON.stringify(r).toLowerCase().includes(search)):rows;
 }
 function doPrint(filtered,format='compact'){
  const summary=fullSummary(selectedRows(filtered));
  if(!summary.products){alert('No Measurement Master product found. Clear search or load master data.');return false;}
  const viewer=window.open('','_blank');
  if(!viewer){alert('Print preview blocked. Allow ERP pop-ups and retry.');return false;}
  viewer.document.open();viewer.document.write(format==='detailed'?reportHTML(summary):compactReportHTML(summary));viewer.document.close();viewer.focus();
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
  info.textContent='Compact A4 Landscape: kam pages, clear table. Har product ki Previous, Measurement 1, 2, 3, Final aur alag cutting patterns poore rahenge.';
  info.style.cssText='margin:4px 0 8px';pane.append(info);
  const count=document.createElement('div');count.id='cfmFullMeasurementStats';
  count.style.cssText='font-weight:800;margin:7px 0;color:#16638d';count.setAttribute('role','status');
  pane.append(count);
  const actions=document.createElement('div');actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap';
  [['🖨 Print All — Compact A4',false,'compact'],['🖨 Search Results — Compact A4',true,'compact'],['Print Detailed (All)',false,'detailed']].forEach(([name,filtered,format])=>{
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
 window.CFM_FULL_MEASUREMENTS={fullSummary,reportHTML,compactReportHTML,doPrint,updateSummary};
 function init(){try{mount()}catch(e){console.warn('CFM full measurements',e)}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 setTimeout(init,1200);
})();