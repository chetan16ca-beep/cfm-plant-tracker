/* CFM V373 — Black and white Packing Slip / parcel label, original Eagle vector wordmark.
 * DISPLAY ONLY, preserves legacy packing-slip records, job cards, quantities,
 * package labels and print count; no save, stock, or dispatch-state writes.
 */
(function(){
'use strict';
function enhance(){
 const root=document.getElementById('v167Print');if(!root)return;
 const brand=window.CFM_EAGLE_BRAND;
 const logo=brand?.logoSvg?.(76,67,'#000')||'<span style="font:22px Arial">E</span>';
 const eagleWordmark=brand?.wordmarkPath?
   '<svg class="eagle-wordmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 465 80" role="img" aria-label="EAGLE" preserveAspectRatio="xMinYMid meet"><path d="'+brand.wordmarkPath+'" fill="#111" fill-rule="evenodd"/></svg>':
   '<b class="eagle-wordmark">EAGLE</b>';
 for(const slip of root.querySelectorAll('.v168-slip,.v167-slip')){
  if(slip.dataset.eagleLetterhead==='1')continue;
  const old=slip.querySelector('h2');
  if(!old)continue;
  const head=document.createElement('header');head.className='cfm-eagle-print-head';
  head.innerHTML='<span class="eagle-symbol">'+logo+'</span><div class="eagle-company">'+
   eagleWordmark+'<strong>FILTRATION PRODUCT PVT. LTD.</strong>'+
   '<small>An ISO 9001:2015 Certified Company</small></div>'+
   '<div class="eagle-contact"><span>SINCE : 1992</span><div>info@eaglefiltrations.com</div>'+
   '<div>www.eaglefiltrations.com</div><b>+91 70416 70091</b></div>';
  old.replaceWith(head);
  const slogan=document.createElement('div');slogan.className='cfm-eagle-manufacturing';
  slogan.textContent='Mfg. of All Types of Industrial Filters, Bag Filters, & Automobile Filters.';
  head.after(slogan);
  slip.dataset.eagleLetterhead='1';
 }
 for(const label of root.querySelectorAll('.v168-label,.v167-label')){
  if(label.dataset.eagleLetterhead==='1')continue;
  const h=label.querySelector('h3,h2');
  if(!h)continue;
  const brandline=document.createElement('div');brandline.className='cfm-eagle-carton-logo';
  brandline.innerHTML=logo+'<div>'+eagleWordmark+'<small>FILTRATION PRODUCT PVT. LTD.</small>'+
    '<strong>PACKING LABEL</strong></div>';
  h.replaceWith(brandline);
  label.dataset.eagleLetterhead='1';
 }
}
function setup(){
 if(document.getElementById('cfmLegacyLetterhead366'))return;
 const st=document.createElement('style');st.id='cfmLegacyLetterhead366';
 st.textContent=[
 '@media print{#v167Print .cfm-eagle-print-head{display:grid!important;grid-template-columns:14% 49% 37%!important;align-items:center!important;gap:2px!important;border-bottom:1.5px solid #111!important;padding:0 2px 2px!important;height:16mm!important}',
 '#v167Print .cfm-eagle-print-head .eagle-symbol svg{width:100%!important;height:15mm!important;max-width:25mm!important}',
 '#v167Print .eagle-company{line-height:1.1!important;min-width:0!important}',
 '#v167Print .eagle-company .eagle-wordmark{display:block!important;width:100%!important;max-width:59mm!important;height:10mm!important;max-height:10mm!important;color:#111!important}',
 '#v167Print .eagle-company strong{display:block!important;color:#111!important;font:bold 9px Arial!important}',
 '#v167Print .eagle-company small{display:block!important;color:#111!important;font:bold 7px Arial!important}',
 '#v167Print .eagle-contact{color:#151515!important;font:bold 8px/1.45 Arial!important;overflow-wrap:anywhere!important;padding-left:4px!important}',
 '#v167Print .eagle-contact span{background:#fff!important;color:#111!important;border:1px solid #111!important;border-radius:2px!important;padding:1px 6px!important}',
 '#v167Print .eagle-contact b{font-size:10px!important}',
 '#v167Print .cfm-eagle-manufacturing{background:#fff!important;color:#111!important;border-top:1px solid #111!important;border-bottom:1px solid #111!important;padding:2px 5px!important;text-align:right!important;font:bold 8px Arial!important;margin-bottom:2mm!important}',
 '#v167Print .v168-slip h3{font:bold 10px Arial!important;text-align:center!important;letter-spacing:.5px!important}',
 '#v167Print .cfm-eagle-carton-logo{display:flex!important;align-items:center!important;gap:4px!important;border-bottom:1px solid #111!important;margin-bottom:3px!important}',
 '#v167Print .cfm-eagle-carton-logo svg{width:16mm!important;height:12mm!important}',
 '#v167Print .cfm-eagle-carton-logo .eagle-wordmark{display:block!important;width:24mm!important;height:5mm!important}',
 '#v167Print .cfm-eagle-carton-logo small{display:block!important;font:bold 6px Arial!important}',
 '#v167Print .cfm-eagle-carton-logo strong{display:block!important;font:bold 8px Arial!important}',
 '#v167Print .v168-slip,#v167Print .v168-label{color:#111!important}',
 '#v167Print .v168-slip,#v167Print .v167-slip,#v167Print .v168-label,#v167Print .v167-label{background:#fff!important;background-image:none!important;color:#111!important}',
 '#v167Print .v168-slip *,#v167Print .v167-slip *,#v167Print .v168-label *,#v167Print .v167-label *{color:#111!important;background-image:none!important;box-shadow:none!important;text-shadow:none!important}',
 '#v167Print .v168-slip svg path,#v167Print .v167-slip svg path,#v167Print .v168-label svg path,#v167Print .v167-label svg path{fill:#111!important}',
 '#v167Print .v168-slip th,#v167Print .v167-slip th,#v167Print .v168-label th,#v167Print .v167-label th{background:#fff!important;color:#111!important}',
 '#v167Print .cfm-eagle-manufacturing{font-weight:600!important}',
 'html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}'
 ].join('');
 document.head.append(st);
 const install=()=>{
  if(typeof window.cfmPackingPrint!=='function'||window.cfmPackingPrint._eagleLetterhead366)return false;
  const legacy=window.cfmPackingPrint;
  const wrapped=function(no){
   legacy.call(this,no);enhance();
  };
  wrapped._eagleLetterhead366=true;
  window.cfmPackingPrint=wrapped;
  return true;
 };
 install();
 let tries=0;
 const timer=setInterval(()=>{if(install()||++tries>=30)clearInterval(timer)},500);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();