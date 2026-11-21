/* CFM V419 — Work Order Save Cloud receipt + verified measurement guidance.
 * Read-only verifier: never submits a second Work Order or writes to stock,
 * cutting, pending orders, slips or any Cloud table.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const N=v=>String(v??'').trim().replace(/\s+/g,' ').toUpperCase();
const T=v=>String(v??'').trim();
let receipt=null, verifying=false, checked=null;
function initial(){
 if($('cfm419Style'))return;
 const s=document.createElement('style');s.id='cfm419Style';
 s.textContent='.cfm419-save-panel{display:none;margin:10px 0;padding:10px 12px;border-radius:9px;border:1px solid #bad5e6;background:#f4faff;color:#17476c;font:700 12px/1.5 Arial}'+
 '.cfm419-save-panel[data-state="success"]{background:#effaf3;border-color:#a5d7b8;color:#14653c}'+
 '.cfm419-save-panel[data-state="warn"]{background:#fff8e9;border-color:#ebc795;color:#855100}'+
 '.cfm419-save-panel button{margin:6px 0 0 9px;padding:6px 10px;border:1px solid #a5bdd2;border-radius:6px;background:#fff;color:#154d77;font:700 11px Arial;cursor:pointer}'+
 '#cfm419MeasurementHint{margin:7px 0 0;font:600 11px/1.5 Arial;color:#4e6274}'+
 '#cfm419MeasurementHint[data-status="ready"]{color:#136343}'+
 '#cfm419MeasurementHint[data-status="verify"]{color:#925612}';
 document.head.appendChild(s);
}
function mountPanels(){
 initial();
 for(const id of ['view-dashboard','view-pending']){
  const view=$(id),panelId=id==='view-dashboard'?'cfm419DashStatus':'cfm419PendingStatus';
  if(!view||$(panelId))continue;
  const panel=document.createElement('section');panel.className='cfm419-save-panel';panel.id=panelId;
  panel.setAttribute('role','status');
  panel.innerHTML='<span class="cfm419-text"></span><button type="button">↻ Verify Work Order in Cloud</button>';
  panel.querySelector('button').onclick=()=>{if(checked)verifyCloud(checked);};
  view.prepend(panel);
 }
}
function show(message,state='warn',allowCheck=true){
 mountPanels();
 for(const id of ['cfm419DashStatus','cfm419PendingStatus']){
  const panel=$(id);if(!panel)continue;
  panel.style.display='block';panel.dataset.state=state;
  panel.querySelector('.cfm419-text').textContent=message;
  panel.querySelector('button').hidden=!allowCheck;
 }
}
function input(form,name){return T(form?.elements?.namedItem(name)?.value)}
function localPending(wo){
 try{return Array.isArray(state?.pending)?state.pending.filter(r=>N(r.workNo)===N(wo)):[]}
 catch(_){return []}
}
function getDraft(){
 const form=$('editForm');
 if(!$('editDialog')?.open||!form||!$('pendingMeasurementPreview'))return null;
 const wo=input(form,'workNo');if(!/^CFM-\d+$/.test(N(wo)))return null;
 const rows=localPending(wo);
 return {workNo:wo,party:input(form,'party'),poNo:input(form,'poNo'),
   description:input(form,'description'),itemCode:input(form,'itemCode'),
   qty:input(form,'orderQty'),hadRow:rows.length===1,priorUpdatedAt:rows.length===1?T(rows[0].updatedAt):''};
}
function matchExpected(row,entry){
 return !!row&&N(row.workNo)===N(entry.workNo)&&
  N(row.party)===N(entry.party)&&String(Number(row.orderQty))===String(Number(entry.qty))&&
  N(row.poNo)===N(entry.poNo)&&N(row.description)===N(entry.description)&&
  (!entry.itemCode||N(row.itemCode)===N(entry.itemCode));
}
function setMeasurementHint(){
 const box=$('pendingMeasurementPreview'),form=$('editForm');
 if(!box||!form)return;
 let hint=$('cfm419MeasurementHint');
 if(!hint){
  hint=document.createElement('div');hint.id='cfm419MeasurementHint';hint.setAttribute('role','status');
  box.insertAdjacentElement('afterend',hint);
 }
 let m;
 try{m=typeof eagleMeasurementResult==='function'?
  eagleMeasurementResult({eagleCode:input(form,'eagleCode')}):null}catch(_){m=null}
 if(m?.status==='READY'){
  hint.dataset.status='ready';
  hint.textContent='✓ Exact Eagle Code match — verified Master measurement will be saved with the Work Order.';
 }else{
  hint.dataset.status=m?.status==='VERIFY'?'verify':'required';
  hint.textContent=(m?.status==='VERIFY'?'⚠ Multiple measurements exist. Verify in Master.':
    '⚠ Verified measurement unavailable until an exact Eagle Code is selected.')+
    ' EFPPL Product Code identifies the product family, not a unique size.';
 }
}
async function verifyCloud(entry){
 if(!entry||verifying)return;
 verifying=true;
 show('☁ Verifying '+entry.workNo+' in Live Cloud (read-only)…','warn',false);
 try{
  if(typeof cloudFetch!=='function')throw Error('Cloud connection unavailable');
  const cloud=await cloudFetch();
  const rows=Array.isArray(cloud?.payload?.pending)?
   cloud.payload.pending.filter(r=>N(r.workNo)===N(entry.workNo)):[];
  if(rows.length!==1)throw Error('Work Order not uniquely present in Cloud');
  if(!matchExpected(rows[0],entry))throw Error('Cloud Work Order details differ from the saved draft');
  checked=entry;receipt=null;
  show('✓ CLOUD VERIFIED: '+entry.workNo+' · '+T(rows[0].party)+' · Qty '+Number(rows[0].orderQty)+
   ' · Saved and readable in Live Cloud.','success',true);
  try{if(typeof toast==='function')toast('✓ Work Order '+entry.workNo+' saved in Live Cloud')}catch(_){}
 }catch(e){
  show('⚠ '+entry.workNo+' Cloud confirmation pending: '+String(e?.message||e)+
   '. Press Verify Cloud. Do NOT create the same Work Order again.','warn',true);
 }finally{verifying=false}
}
function onSaveClick(){
 const entry=getDraft();if(!entry)return;
 // The native save handler validates and persists first. This module ONLY
 // observes its result — it never calls native save, cloudPush or RPC.
 setTimeout(()=>{
  const local=localPending(entry.workNo);
  const row=local.length===1?local[0]:null;
  if(!row||!matchExpected(row,entry))return; // rejected save
  if(entry.hadRow&&T(row.updatedAt)===entry.priorUpdatedAt)return;
  receipt=entry;checked=entry;
  show('☁ '+entry.workNo+' saved on device. Waiting for Live Cloud verification…','warn',true);
  setTimeout(()=>{if(receipt===entry)verifyCloud(entry)},1650);
 },180);
}
function init(){
 mountPanels();
 // Capture before the native handler closes the editor.
 document.addEventListener('click',e=>{
  if(e.target?.closest?.('#saveFormBtn'))onSaveClick();
  else if(e.target?.closest?.('#editDialog'))setTimeout(setMeasurementHint,0);
 },true);
 document.addEventListener('input',e=>{
  if(e.target?.closest?.('#editForm')&&
    (e.target?.name==='eagleCode'||e.target?.name==='itemCode'))setMeasurementHint();
 },true);
 document.addEventListener('change',e=>{
  if(e.target?.closest?.('#editForm'))setMeasurementHint();
 },true);
 document.addEventListener('cfm:po-cloud-result',e=>{
  if(receipt&&e?.detail?.ok)verifyCloud(receipt);
  else if(receipt&&e?.detail?.ok===false)
   show('⚠ '+receipt.workNo+' not yet Cloud verified. Check Cloud before retrying.','warn',true);
 });
}
window.CFM_WO_SAVE_VERIFY_V419=Object.freeze({verifyLast:()=>checked&&verifyCloud(checked),mount:mountPanels});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();