/* CFM V259 - Non-CF Measurement Master XLSX workflow.
 * Reads the existing Master; download is safe. Edited file import uses immutable source row
 * signatures, explicit user approval and local-only overrides. No Work Orders or stock writes.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const SKEY='cfm-noncf-excel-overrides-v259';
const BKEY='cfm-noncf-excel-before-import-v259';
const N=v=>String(v==null?'':v).normalize('NFKC').trim().replace(/\s+/g,' ').toUpperCase();
const T=v=>String(v==null?'':v);
const fields=['eagleCode','description','party','category','size','type','micron','standardCloth','stdWidth','previousMeasurement','measurement1','measurement2','measurement3','finalMeasurement','workNo','source','status'];
const columnMap=[
 ['Eagle Code','eagleCode'],['Product / Description','description'],['Party','party'],
 ['Category','category'],['Size','size'],['Type','type'],['Micron','micron'],
 ['Std Cloth','standardCloth'],['Cloth Width','stdWidth'],
 ['Previous Measurement','previousMeasurement'],['Measurement 1','measurement1'],
 ['Measurement 2','measurement2'],['Measurement 3','measurement3'],
 ['Final Measurement','finalMeasurement'],['Work No.','workNo'],
 ['Source / History','source'],['Status','status']
];
const editable={
 'Product / Description':'description','Size':'size','Type':'type','Micron':'micron',
 'Std Cloth':'standardCloth','Cloth Width':'stdWidth',
 'Previous Measurement':'previousMeasurement','Measurement 1':'measurement1',
 'Measurement 2':'measurement2','Measurement 3':'measurement3',
 'Final Measurement':'finalMeasurement','Remark / Changes':'_excelReviewRemark'
};
function msg(t){const el=$('cfmNonCFExcelStatus');if(el)el.textContent=t;try{typeof toast==='function'&&toast(t)}catch(_){}}
function base(){try{return Array.isArray(window.CFM_EXCEL_MASTER?.measurements)?window.CFM_EXCEL_MASTER.measurements:[]}catch(_){return []}}
function live(){try{return typeof state!=='undefined'&&Array.isArray(state.measurements)?state.measurements:[]}catch(_){return []}}
function isNonCF(r){const d=N(r?.description);return N(r?.category)!=='CFB'&&!/\bCF\s*(?:BAG|BG|48|36|60|24)\b|CENTRIFUGAL/.test(d)}
function stripCF(value){return T(value).split(/\s+\|\s+/).filter(v=>!/\bCF\s*(?:BAG|BG|48|36|60|24)\b/i.test(v)).join(' | ')}
function restoredCF(value,old){const extra=T(old).split(/\s+\|\s+/).filter(v=>/\bCF\s*(?:BAG|BG|48|36|60|24)\b/i.test(v));return [value,...extra].filter(Boolean).join(' | ')}
function sign(r){const payload=JSON.stringify(fields.map(f=>N(r?.[f])));let h=2166136261>>>0;
 for(let i=0;i<payload.length;i++){h^=payload.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return h.toString(16).padStart(8,'0')}
function key(r){return JSON.stringify([
 'eagleCode','description','party','category','size','type','micron','standardCloth',
 'stdWidth','previousMeasurement','measurement1','measurement2','measurement3','finalMeasurement'
 ].map(f=>N(r?.[f])))}
function readStore(k){try{return JSON.parse(safeStorage.getItem(k)||'null')}catch(_){return null}}
function putStore(k,data){try{const value=JSON.stringify(data);safeStorage.setItem(k,value);return safeStorage.getItem(k)===value}catch(_){return false}}
function groupRows(){
 const initial=base(),now=live(),map=new Map();
 initial.forEach((record,index)=>{
   if(!isNonCF(record))return;
   const k=key(record);
   if(!map.has(k))map.set(k,{ids:[],row:now[index]||record,baseline:record,works:new Set(),sources:new Set()});
   const g=map.get(k);g.ids.push(index);
   if(record.workNo)g.works.add(T(record.workNo));
   if(record.source)g.sources.add(T(record.source));
 });
 return [...map.values()];
}
function rowArray(g,i){
 const r=g.row,b=g.baseline,map=g.ids.map(index=>index+':'+sign(base()[index])).join('|');
 const vals=columnMap.map(([title,field])=>
   ['previousMeasurement','measurement1','measurement2','measurement3','finalMeasurement'].includes(field)?
   stripCF(r[field]):T(r[field]));
 vals[14]=[...g.works].join(', ');
 vals[15]=[...g.sources].join(' | ');
 return [i+1,...vals,g.ids.length,T(r._excelReviewRemark||''),map];
}
function download(){
 if(!window.XLSX?.utils){msg('Excel engine not loaded. Connect to internet and refresh the ERP before downloading XLSX.');return false}
 const groups=groupRows();if(!groups.length){msg('Measurement Master is loading. Open again after ERP Cloud Load.');return false}
 const heads=['Sr.',...columnMap.map(v=>v[0]),'Grouped Rows','Remark / Changes','ERP Row Map (DO NOT EDIT)'];
 const book=XLSX.utils.book_new(),edit=XLSX.utils.aoa_to_sheet([heads,...groups.map(rowArray)]);
 edit['!cols']=[{wch:6},{wch:16},{wch:40},{wch:20},{wch:10},{wch:11},{wch:12},{wch:10},
  {wch:15},{wch:12},{wch:39},{wch:45},{wch:35},{wch:35},{wch:45},{wch:18},
  {wch:34},{wch:12},{wch:12},{wch:32},{wch:65}];
 XLSX.utils.book_append_sheet(book,edit,'EDIT NON-CF');
 const originals=base().map((r,index)=>({index,r})).filter(x=>isNonCF(x.r));
 const sourceHead=['Original ERP Index',...fields];
 const backup=XLSX.utils.aoa_to_sheet([sourceHead,...originals.map(({index,r})=>[index,...fields.map(f=>T(r[f]))])]);
 XLSX.utils.book_append_sheet(book,backup,'SOURCE 499');
 const guide=XLSX.utils.aoa_to_sheet([
 ['CFM NON-CF MEASUREMENT MASTER — ERP EXCEL'],
 ['EDIT NON-CF sheet contains all unique non-CF measurement sets. Original CFB rows excluded.'],
 ['Blue/green intent: edit cutting details, cloth, widths and remarks in EDIT NON-CF.'],
 ['Do NOT change the ERP Row Map (DO NOT EDIT) column or remove it.'],
 ['Download fresh file from ERP before each import; only matching original source rows are accepted.'],
 ['Import requires operator confirmation; changes apply ONLY to this device, not other mobiles/cloud.'],
 ['CF Bag details are removed from download only, not deleted from ERP master.'],
 ['Stock, Cutting, Pending Orders and Dispatch are never changed by this import.'],
 ['SOURCE 499 is a historical reference and is not imported.']]);
 XLSX.utils.book_append_sheet(book,guide,'START HERE');
 const today=new Date().toISOString().slice(0,10);
 XLSX.writeFile(book,'CFM-NonCF-Measurements-Editable-'+today+'.xlsx');
 msg('Non-CF Excel downloaded: '+groups.length+' unique measurement rows.');return true;
}
function applyOverrides(){
 const data=readStore(SKEY);if(!data||typeof data!=='object')return 0;
 const initial=base(),now=live();let applied=0;
 for(const [idx,item] of Object.entries(data)){
   const index=Number(idx),original=initial[index],current=now[index];
   if(!Number.isSafeInteger(index)||!original||!current||!isNonCF(original)||
      item?.signature!==sign(original)||!item.changes)continue;
   for(const [field,value] of Object.entries(item.changes)){
     if(!Object.values(editable).includes(field))continue;
     if(T(current[field])!==T(value)){current[field]=T(value);applied++;}
   }
 }
 return applied;
}
async function importExcel(file){
 if(!file)return false;
 if(!window.XLSX?.utils){msg('Excel engine unavailable. Reconnect to internet and refresh.');return false}
 if(!/\.xlsx$/i.test(file.name)||file.size>8*1024*1024){msg('Choose an .xlsx under 8 MB, downloaded from this ERP.');return false}
 let book,rows;
 try{const buffer=await file.arrayBuffer();book=XLSX.read(buffer,{type:'array',cellDates:false});
 const sheet=book.Sheets['EDIT NON-CF']||book.Sheets['EDIT_NON_CF'];
 if(!sheet)throw Error('EDIT NON-CF sheet missing. Download new Excel from ERP.');
 rows=XLSX.utils.sheet_to_json(sheet,{defval:'',raw:false});}
 catch(e){msg('Excel reading failed: '+(e?.message||e));return false}
 if(!rows.length||rows.length>900){msg('No valid editable rows found or too many rows.');return false}
 const initial=base(),now=live(),pending={},rejected=[];
 let touched=0;
 for(let ri=0;ri<rows.length;ri++){
   const row=rows[ri],rowMap=T(row['ERP Row Map (DO NOT EDIT)']).trim();
   if(!rowMap){rejected.push('Row '+(ri+2)+': missing ERP Row Map');continue}
   const ids=rowMap.split('|'),sourceIds=[];
   for(const val of ids){
     const matched=val.match(/^(\d+):([0-9a-f]{8})$/i),idx=matched?Number(matched[1]):NaN;
     if(!matched||!Number.isSafeInteger(idx)||!initial[idx]||!now[idx]||
        !isNonCF(initial[idx])||sign(initial[idx])!==matched[2].toLowerCase()){
       rejected.push('Row '+(ri+2)+': source ID not matching current ERP master');break;
     }
     sourceIds.push(idx);
   }
   if(sourceIds.length!==ids.length)continue;
   // Work / Eagle code / Party / Category are identifiers and must not change.
   const baseRec=initial[sourceIds[0]];
   for(const [col,field] of [['Eagle Code','eagleCode'],['Party','party'],['Category','category']]){
      if(N(row[col])!==N(baseRec[field])){rejected.push('Row '+(ri+2)+': '+col+' changed; use original identifier');break}
   }
   if(rejected.some(s=>s.startsWith('Row '+(ri+2)+':')))continue;
   const updates={};
   for(const [col,field] of Object.entries(editable)){
     if(!(col in row))continue;
     let next=T(row[col]);
     if(next.length>2000){rejected.push('Row '+(ri+2)+': '+col+' exceeds safe length');break}
     if(['previousMeasurement','measurement1','measurement2','measurement3','finalMeasurement'].includes(field))
       next=restoredCF(next,now[sourceIds[0]][field]);
     updates[field]=next;
   }
   if(rejected.some(s=>s.startsWith('Row '+(ri+2)+':')))continue;
   for(const id of sourceIds){
     const changes={};
     for(const [k,v] of Object.entries(updates))
       if(T(now[id][k])!==v)changes[k]=v;
     if(Object.keys(changes).length){pending[id]={signature:sign(initial[id]),changes};touched++;}
   }
 }
 if(rejected.length){msg('Import stopped: '+rejected.length+' invalid row(s). '+rejected.slice(0,3).join(' | ')+'. Download a fresh Excel from ERP.');return false}
 if(!touched){msg('No measurement changes found. Existing ERP master remains unchanged.');return false}
 if(!window.confirm('Import '+touched+' verified NON-CF source row updates to this DEVICE ONLY?\\n\\nNo Cutting, Stock or Work Orders will change.\\nCloud / other mobiles will NOT sync these edits.'))return false;
 const snapshot=now.map(r=>({...r})),prior=readStore(SKEY)||{};
 const backup={savedAt:new Date().toISOString(),measurements:snapshot,previousOverrides:prior};
 if(!putStore(BKEY,backup)){msg('Backup storage unavailable. No changes applied.');return false}
 const next={...prior};
 for(const [id,record] of Object.entries(pending))next[id]={signature:record.signature,changes:{...(prior[id]?.changes||{}),...record.changes}};
 if(!putStore(SKEY,next)){msg('Could not store Excel changes. Original master untouched.');return false}
 const applied=applyOverrides();
 // This is a separate local-only master cache. No ERP save() or Supabase write.
 try{safeStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch(e){console.warn('CFM local measurement cache',e)}
 try{if(typeof renderMeasurements==='function')renderMeasurements()}catch(_){}
 msg('Imported '+touched+' Non-CF measurement row changes on this device; '+applied+' fields updated. No stock changes.');
 return true;
}
function setup(){
 if(!$('view-measurements')||$('cfmNonCFExcelPanel'))return;
 const panel=document.createElement('section');
 panel.id='cfmNonCFExcelPanel';
 panel.style.cssText='margin:10px 0;padding:13px;border:1px solid #9bd2bb;border-radius:12px;background:#f1fcf6;color:#124d36;font:13px/1.45 system-ui';
 const heading=document.createElement('strong');heading.textContent='📗 Non-CF Measurements — Editable Excel';
 heading.style.cssText='display:block;font-size:15px;margin-bottom:5px';
 const note=document.createElement('p');note.textContent=
   'Download editable Excel, make corrections and upload the ERP-exported file here. CF Bags excluded. Imported edits are local to this device only — not Cloud synced.';
 note.style.cssText='margin:3px 0 10px';panel.append(heading,note);
 const row=document.createElement('div');row.style.cssText='display:flex;gap:7px;flex-wrap:wrap';
 const btn=document.createElement('button');btn.type='button';btn.className='btn btn-green';
 btn.textContent='⬇ Download Non-CF Excel';btn.onclick=download;row.append(btn);
 const pick=document.createElement('input');pick.type='file';pick.accept='.xlsx';pick.hidden=true;pick.id='cfmNonCFExcelInput';
 pick.onchange=()=>{const file=pick.files?.[0];pick.value='';if(file)importExcel(file)};panel.append(pick);
 const upload=document.createElement('button');upload.type='button';upload.className='btn';
 upload.textContent='⬆ Import Edited Excel (this device)';upload.onclick=()=>pick.click();row.append(upload);
 panel.append(row);
 const status=document.createElement('div');status.id='cfmNonCFExcelStatus';
 status.style.cssText='margin-top:9px;color:#315b48';status.textContent='Excel import changes only measurements, not Cutting, Stock or Cloud.';panel.append(status);
 const anchor=$('view-measurements').querySelector('#cfmUniqueMeasurementTools')||
  $('view-measurements').querySelector('.filters');
 if(anchor)anchor.insertAdjacentElement('afterend',panel);else $('view-measurements').prepend(panel);
 const excel=$('view-excel');if(excel&&!$('cfmNonCFExcelQuick')){
   const quick=document.createElement('button');quick.type='button';quick.id='cfmNonCFExcelQuick';
   quick.className='btn btn-green';quick.textContent='📗 Non-CF Measurements Excel';
   quick.style.cssText='margin:9px 0';quick.onclick=()=>{if(typeof showView==='function')showView('measurements');setTimeout(()=>panel.scrollIntoView({behavior:'smooth',block:'center'}),160)};
   excel.prepend(quick);
 }
}
function init(){setup();applyOverrides();}
window.CFM_NONCF_EXCEL={download,importExcel,applyOverrides,groupRows,isNonCF};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
setTimeout(init,900);
setInterval(()=>{try{applyOverrides()}catch(e){console.warn('CFM Excel overlay',e)}},6500);
})();