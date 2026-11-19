/* CFM ERP — 4x4-inch Packing Label Preview V404
 * Uses verified saved Packing Slip or read-only Cloud WO draft.
 * Does not auto print or write any production/dispatch data.
 */
(function(){
'use strict';
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=v=>String(v??'').trim();
const pick=(row,keys)=>{for(const k of keys){const v=clean(row?.[k]);if(v)return v}return ''};
const show=v=>clean(v)||'—';
function eagle(){
 const b=window.CFM_EAGLE_BRAND;
 const logo=b?.logoSvg?.(68,56,'#111')||'<b class="fallback">EAGLE</b>';
 const word=b?.wordmarkPath?'<svg class="wordmark" viewBox="0 0 465 80" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="EAGLE"><path fill="#111" d="'+b.wordmarkPath+'" fill-rule="evenodd"/></svg>':'<strong>EAGLE</strong>';
 return '<div class="brand"><div class="brand-logo">'+logo+'</div><div class="brand-text">'+word+
 '<div>FILTRATION PRODUCT PVT. LTD.</div></div></div>';
}
function page(record,work={}){
 const draft=!!record.draft,legacy=!!record.legacy;
 const code=pick(record,['efpplCode'])||pick(work,['efpplCode','itemCode','eagleCode'])||window.CFM_EFPPL?.codeForRow?.(work)?.code||'';
 const order=pick(record,['workNo'])||pick(work,['workNo']);
 const party=pick(record,['party'])||pick(work,['party']);
 const po=pick(record,['poNo'])||pick(work,['poNo']);
 const description=pick(record,['description'])||pick(work,['description']);
 const details=pick(record,['description2'])||pick(work,['description2']);
 const micron=pick(record,['micron'])||pick(work,['micron','micronRating']);
 const size=pick(record,['size'])||pick(work,['size','sizeInch','dimensions']);
 const qty=clean(record.thisDispatched);
 const slip=clean(record.slipNo);
 const date=clean(record.createdAt||record.date).slice(0,10);
 const status=draft?'DRAFT PREVIEW — NOT DISPATCHED':legacy?'LEGACY RECORD — UNVERIFIED':'CONFIRMED PACKING LABEL';
 const field=(label,v)=>'<div class="field"><small>'+E(label)+'</small><strong>'+E(show(v))+'</strong></div>';
 const css=[
 '@page{size:101.6mm 101.6mm;margin:0}',
 '*{box-sizing:border-box}html,body{margin:0;background:#e9edf1;font-family:Arial,Helvetica,sans-serif;color:#111}',
 '.toolbar{position:sticky;top:0;z-index:3;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 13px;background:#073766;color:#fff;font:700 13px Arial}',
 '.toolbar button{padding:8px 12px;background:white;border:0;border-radius:7px;color:#073766;font:800 12px Arial;cursor:pointer}',
 '.sheet{width:101.6mm;height:101.6mm;margin:14px auto;background:#fff;padding:3.5mm;box-shadow:0 6px 22px #0002;overflow:hidden}',
 '.inside{height:100%;border:1.2px solid #111;padding:2.5mm;display:flex;flex-direction:column;overflow:hidden}',
 '.head{display:flex;align-items:center;justify-content:space-between;gap:2mm;border-bottom:1.5px solid #111;padding-bottom:2mm}',
 '.brand{display:flex;align-items:center;gap:1mm;max-width:63mm;min-width:0}',
 '.brand-logo{width:14mm;flex:none}.brand-logo svg{width:100%;height:13mm;display:block}',
 '.brand-text{min-width:0}.brand-text svg{display:block;width:37mm;max-width:100%;height:7mm}',
 '.brand-text strong{font:bold 18px Arial}.brand-text>div{font:bold 7pt/1.15 Arial;white-space:nowrap}',
 '.heading{text-align:right;font:bold 11pt Arial;line-height:1.15;white-space:nowrap}',
 '.status{border-bottom:1px solid #111;padding:2mm 0;font:bold 7pt/1.2 Arial;text-align:center;letter-spacing:.15px}',
 '.party{border-bottom:1px solid #777;padding:3mm 0 2mm}',
 '.party small,.field small,.product small{display:block;font:bold 7pt Arial;margin-bottom:1mm}',
 '.party strong{display:block;font:bold 11pt/1.2 Arial;overflow-wrap:anywhere}',
 '.two{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #777}',
 '.field{padding:2mm 1mm;min-width:0}.two .field+.field{border-left:1px solid #aaa;padding-left:2mm}',
 '.field strong{display:block;font:bold 10pt/1.2 Arial;overflow-wrap:anywhere}',
 '.product{padding:2.5mm 1mm;border-bottom:1px solid #777;min-height:17mm;overflow-wrap:anywhere}',
 '.product strong{display:block;font:bold 10.3pt/1.24 Arial}',
 '.product p{margin:1mm 0 0;font:8.5pt/1.22 Arial;overflow-wrap:anywhere}',
 '.code{padding:2.5mm 1mm;border-bottom:1px solid #777;overflow-wrap:anywhere}',
 '.code small{display:block;font:bold 7pt Arial;margin-bottom:1mm}',
 '.code strong{font:bold 10pt/1.2 Arial;overflow-wrap:anywhere}',
 '.foot{margin-top:auto;border-top:1.3px solid #111;padding-top:2mm;display:grid;grid-template-columns:1.1fr 1fr 1fr;gap:2mm;min-width:0}',
 '.foot>div{min-width:0;overflow-wrap:anywhere}.foot small{display:block;font:bold 7pt Arial}.foot b{display:block;font:bold 10pt/1.2 Arial;margin-top:1mm}',
 '.draft{font:bold 7pt Arial;text-align:center;color:#9b1c1c;padding:1.3mm 0 0}',
 '.inside.tight{padding:1mm}.inside.tight .party{padding:1.5mm 0 1mm}.inside.tight .field{padding:1mm}.inside.tight .product{padding:1mm;min-height:0}.inside.tight .code{padding:1mm}.inside.tight .foot{padding-top:1mm}.inside.tight .party strong{font-size:9.5pt}.inside.tight .product strong,.inside.tight .code strong{font-size:9pt}.inside.tight .product p{font-size:7.5pt}',
 '@media screen and (max-width:600px){.sheet{margin:10px auto;transform:scale(.86);transform-origin:top center;margin-bottom:-14mm}}',
 '@media print{html,body{background:#fff!important}.toolbar{display:none!important}.sheet{margin:0;box-shadow:none}html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}'
 ].join('');
 const safeTitle=E(show(record.slipNo||record.workNo));
 return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Packing Label '+safeTitle+'</title><style>'+css+'</style></head>'+
 '<body><div class="toolbar"><span>EAGLE · 4 × 4 inch Packing Label · Print Preview</span><div><button type="button" onclick="printLabelIfFits()">Print / Save PDF</button> <button type="button" onclick="window.close()">Close</button></div></div>'+
 '<main class="sheet"><div class="inside"><div class="head">'+eagle()+'<div class="heading">PACKING<br>LABEL</div></div>'+
 '<div class="status">'+E(status)+'</div>'+
 '<div class="party"><small>PARTY / COMPANY</small><strong>'+E(show(party))+'</strong></div>'+
 '<div class="two">'+field('CUSTOMER PO NO.',po)+field('WORK ORDER NO.',order)+'</div>'+
 '<div class="product"><small>PRODUCT / DESCRIPTION</small><strong>'+E(show(description))+'</strong>'+(details?'<p>'+E(details)+'</p>':'')+'</div>'+
 '<div class="code"><small>EFPPL ITEM CODE</small><strong>'+E(show(code))+'</strong></div>'+
 '<div class="two">'+field('MICRON',micron)+field('SIZE',size)+'</div>'+
 '<div class="foot"><div><small>PACKING SLIP NO.</small><b>'+E(show(slip))+'</b></div><div><small>PACK QTY (NOS)</small><b>'+E(show(qty))+'</b></div><div><small>SLIP DATE</small><b>'+E(show(date))+'</b></div></div>'+
 (draft?'<div class="draft">DRAFT PREVIEW · NO DISPATCH SAVED</div>':'')+
 '</div></main><script>function printLabelIfFits(){const e=document.querySelector(".inside");if(!e)return;e.classList.remove("tight");if(e.scrollHeight>e.clientHeight+2||e.scrollWidth>e.clientWidth+2)e.classList.add("tight");if(e.scrollHeight>e.clientHeight+2||e.scrollWidth>e.clientWidth+2){alert("Label text exceeds 4 x 4 inch space. Shorten the Work Order description before printing; no text will be cut off.");return;}window.print();}</scr'+'ipt></body></html>';
}
function open(record,work={},providedWindow=null){
 if(!record)return false;
 const popup=providedWindow||window.open('','_blank');
 if(!popup){alert('Allow pop-ups to see the Packing Label preview.');return false}
 try{popup.document.open();popup.document.write(page(record,work));popup.document.close();popup.focus();return true}
 catch(e){popup.document.body.textContent='Packing Label preview error: '+String(e.message||e);return false}
}
async function previewSelected(){
 const wo=clean(document.getElementById('packSlipWO')?.value);
 if(!wo){alert('Choose Work Order first for Packing Label preview.');return}
 const popup=window.open('','_blank');
 if(!popup){alert('Allow pop-ups to see Packing Label preview.');return}
 popup.document.write('<!doctype html><title>Packing Label</title><p>Verifying live Work Order, please wait…</p>');
 try{
  if(typeof cloudFetch!=='function')throw Error('Cloud verification is unavailable');
  const snap=await cloudFetch();
  if(!Array.isArray(snap?.payload?.pending))throw Error('Invalid Cloud Work Orders');
  const work=snap.payload.pending.find(x=>clean(x.workNo)===wo);
  if(!work)throw Error('Work Order is not present in verified Cloud');
  const entered=clean(document.getElementById('packSlipThis')?.value);
  const dispatchQty=entered&&Number.isSafeInteger(Number(entered))&&Number(entered)>0?String(Number(entered)):'';
  const record={draft:true,slipNo:'PREVIEW ONLY',workNo:wo,party:work.party,poNo:work.poNo,
    efpplCode:pick(work,['efpplCode','itemCode','eagleCode'])||window.CFM_EFPPL?.codeForRow?.(work)?.code||'',
    description:work.description,description2:work.description2,
    micron:pick(work,['micron','micronRating']),size:pick(work,['size','sizeInch','dimensions']),
    thisDispatched:dispatchQty};
  open(record,work,popup);
 }catch(e){popup.document.body.textContent='Label preview unavailable: '+String(e.message||e)+'. Please refresh Cloud.'}
}
function mount(){
 const footer=document.querySelector('#packSlipDialog .pfoot');
 if(!footer)return false;
 const preview=document.getElementById('packSlipPreview');
 if(preview&&!document.getElementById('cfmPackingLabelPreviewV404')){
  const b=document.createElement('button');b.type='button';b.id='cfmPackingLabelPreviewV404';
  b.textContent='👁 Packing Label 4×4 Preview (No Save)';
  b.title='Label preview from verified Work Order; it does not save or dispatch goods';
  b.onclick=previewSelected;
  const reload=document.getElementById('packSlipReload');
  if(reload)reload.after(b);else preview.after(b);
 }
 const saved=document.getElementById('packSlipCarton');
 if(saved){saved.textContent='📦 Saved Packing Label 4×4 / Reprint';saved.title='Available after a Packing Slip has been saved and verified'}
 const cssId='cfmPackingLabelStyleV404';
 if(!document.getElementById(cssId)){
  const st=document.createElement('style');st.id=cssId;
  st.textContent='#cfmPackingLabelPreviewV404{display:block!important;width:100%!important;min-height:40px!important;margin:7px 0!important;background:#eaf7ff!important;border:1px solid #87bddf!important;color:#114d7b!important}';
  document.head.appendChild(st)
 }
 return true;
}
window.CFM_PACKING_LABEL_V404=Object.freeze({open,previewSelected});
function init(){
 let tries=0;const t=setInterval(()=>{if(mount()||++tries>75)clearInterval(t)},400);
 mount();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();