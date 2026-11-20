/* CFM V416 — searchable Eagle Code dropdown in Single and Multi Work Order forms.
 * Read only Measurement Master. Selecting the Eagle code changes only the form
 * value; existing Work Order data, Cutting, Store and Cloud remain untouched.
 */
(function(){
'use strict';
const N=x=>String(x??'').normalize('NFKC').trim().replace(/\s+/g,' ').toUpperCase();
const T=x=>String(x??'').trim();
const LIMIT=70;
let indexCache={ref:null,size:-1,list:[]},scheduled=false;
function master(){
 let rows=[];
 try{if(typeof state!=='undefined'&&Array.isArray(state.measurements)&&state.measurements.length)rows=state.measurements}catch(_){}
 if(!rows.length)rows=window.CFM_EXCEL_MASTER?.measurements||[];
 return Array.isArray(rows)?rows:[];
}
function getList(){
 const rows=master();
 if(indexCache.ref===rows&&indexCache.size===rows.length)return indexCache.list;
 const map=new Map();
 for(const r of rows){
  const code=N(r?.eagleCode);
  if(!/^EFP-P[0-9]{2,8}$/.test(code))continue;
  if(!map.has(code))map.set(code,{code,product:T(r.description||r.oldProductName),party:T(r.party),values:new Set()});
  const item=map.get(code);
  if(!item.product&&r.description)item.product=T(r.description);
  if(!item.party&&r.party)item.party=T(r.party);
  const measured=[r.finalMeasurement,r.measurement3,r.measurement2,r.measurement1,r.previousMeasurement]
   .map(T).find(x=>x&&!/NEW PRODUCT\s*[-–]\s*NO PREVIOUS|MEASUREMENT REQUIRED|NO PREVIOUS MEASUREMENT|NO MATCHING/i.test(x));
  if(measured)item.values.add(N(measured));
 }
 const list=[...map.values()].map(x=>{
  const {values,...other}=x;
  return {...other,status:values.size>1?'VERIFY':values.size===1?'READY':'MISSING'};
 }).sort((a,b)=>a.code.localeCompare(b.code,undefined,{numeric:true}));
 indexCache={ref:rows,size:rows.length,list};
 return list;
}
function statusMessage(target){
 const box=target.parentElement?.querySelector('.cfm416-code-result');
 if(!box)return;
 const code=N(target.value);
 if(!code){box.textContent='Choose an Eagle Code from dropdown to get measurement.';box.dataset.status='required';return}
 const m=window.eagleMeasurementResult?.({eagleCode:code});
 box.textContent=m?m.text+' · '+m.source:'Measurement Master not ready — reload ERP';
 box.dataset.status=m?.status==='READY'?'ready':m?.status==='VERIFY'?'verify':'required';
}
function setup(target){
 if(!target||!target.isConnected||target.dataset.cfm416Dropdown==='ready')return;
 if(!target.closest('#editForm,#multiPoItems'))return;
 target.dataset.cfm416Dropdown='ready';
 target.placeholder='EFP-P… · Choose from dropdown';
 const wrap=document.createElement('div');
 wrap.className='cfm416-picker';
 wrap.innerHTML='<label class="cfm416-title">SELECT EAGLE CODE · MEASUREMENT MASTER'+
  '<input type="search" class="cfm416-search" placeholder="Search Code / Company / Product"></label>'+
  '<select class="cfm416-select" aria-label="Select exact Eagle Code for auto measurement">'+
  '<option value="">Choose Eagle Code ▼</option></select>'+
  '<div class="cfm416-count" role="status"></div>'+
  '<div class="cfm416-code-result" role="status"></div>';
 target.insertAdjacentElement('afterend',wrap);
 const search=wrap.querySelector('.cfm416-search'),select=wrap.querySelector('.cfm416-select');
 const counter=wrap.querySelector('.cfm416-count');
 function fill(){
  const q=N(search.value),all=getList();
  const exact=all.find(x=>x.code===N(target.value));
  let results=q?all.filter(x=>[x.code,x.product,x.party].some(s=>N(s).includes(q))):all;
  const subset=results.slice(0,LIMIT);
  if(exact&&!subset.some(x=>x.code===exact.code)){
   subset.unshift(exact);
  }
  select.replaceChildren();
  const blank=document.createElement('option');blank.value='';blank.textContent='▼ Select Eagle Code';select.appendChild(blank);
  for(const record of subset){
   const opt=document.createElement('option');opt.value=record.code;
   opt.textContent=record.code+' | '+(record.product||'Product not specified').slice(0,60)+
     (record.party?' | '+record.party.slice(0,25):'')+
     (record.status==='VERIFY'?' [VERIFY MEASUREMENT]':record.status==='MISSING'?' [MEASUREMENT REQUIRED]':'');
   if(exact?.code===record.code)opt.selected=true;
   select.appendChild(opt);
  }
  const found=results.length;
  counter.textContent=all.length?('Measurement Master: '+all.length+' Eagle Codes · Showing '+Math.min(found,LIMIT)+
   (found>LIMIT?' of '+found+' (type to filter)':'')):'Measurement Master loading — reopen this form after ERP refresh';
  statusMessage(target);
 }
 search.addEventListener('input',fill);
 search.addEventListener('focus',fill);
 select.addEventListener('focus',fill);
 select.addEventListener('change',()=>{
  if(!select.value)return;
  target.value=select.value;
  target.dispatchEvent(new Event('input',{bubbles:true}));
  target.dispatchEvent(new Event('change',{bubbles:true}));
  statusMessage(target);
 });
 target.addEventListener('input',()=>{statusMessage(target)});
 target.addEventListener('change',()=>{statusMessage(target);if(!search.value)fill()});
 fill();
}
function scan(){
 scheduled=false;
 document.querySelectorAll('#editForm input[name="eagleCode"],#multiPoItems .multi-item-row input.multi-eagle,#multiPoItems .multi-po-item-row input.multi-eagle').forEach(setup);
}
function schedule(){
 if(scheduled)return;
 scheduled=true;
 if(typeof requestAnimationFrame==='function')requestAnimationFrame(scan);else setTimeout(scan,0);
}
function mount(){
 if(!document.getElementById('cfm416Style')){
  const css=document.createElement('style');css.id='cfm416Style';
  css.textContent='.cfm416-picker{display:flex;flex-direction:column;gap:5px;max-width:100%;padding:7px 8px;border:1px solid #a9cce3;border-radius:8px;background:#f4faff;color:#163e60;margin:5px 0 2px}'+
   '.cfm416-title{font:800 10.5px/1.4 Arial!important;color:#164968}'+
   '.cfm416-search,.cfm416-select{display:block!important;width:100%!important;min-height:35px!important;font:12px Arial!important;color:#173952!important;background:#fff!important;border:1px solid #b4cfe0!important;border-radius:6px!important;padding:6px 8px!important;margin:4px 0!important}'+
   '.cfm416-count{font:600 10px/1.4 Arial;color:#53748e}'+
   '.cfm416-code-result{font:750 11px/1.5 Arial;padding:5px 7px;background:#fff4e1;border:1px solid #ead3a1;border-radius:5px;overflow-wrap:anywhere}'+
   '.cfm416-code-result[data-status="ready"]{color:#13623f;background:#edf9f0;border-color:#b0dac1}'+
   '.cfm416-code-result[data-status="verify"]{color:#a4520c;background:#fff4e1}';
  document.head.appendChild(css);
 }
 schedule();
}
document.addEventListener('focusin',e=>{
 if(e.target?.matches?.('#editForm input[name="eagleCode"],#multiPoItems .multi-eagle'))schedule();
},true);
document.addEventListener('click',e=>{
 if(e.target?.closest?.('[onclick*="openPendingForm"],[onclick*="addMultiPoItem"],[onclick*="openMulti"]'))schedule();
},true);
function init(){
 mount();
 const root=document.body; // also observe Multiple PO panel, not just single Work Order dialog
 if(root&&typeof MutationObserver==='function'){
  const observer=new MutationObserver(records=>{
   if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&
    (n.matches?.('#editForm,#multiPoItems,.multi-po-item-row,input[name="eagleCode"],.multi-eagle')||
      n.querySelector?.('#editForm,#multiPoItems,.multi-po-item-row,input[name="eagleCode"],.multi-eagle')))))schedule();
  });
  observer.observe(root,{childList:true,subtree:true});
 }
}
window.CFM_EAGLE_DROPDOWN_V416=Object.freeze({mount,scan,getList});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();