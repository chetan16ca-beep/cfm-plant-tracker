/* CFM ERP V413 — verified Work Order correction.
 * Correct a mistaken saved Work Order without changing its Work No.,
 * Cutting, Store, dispatch, QC or any production rows.
 * Cloud version-CAS + explicit user confirmation + audit + pre-change backup.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const str=x=>String(x??'').trim();
const norm=x=>str(x).toUpperCase();
const esc=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const simple=['party','poNo','orderDate','deliveryDate','actualProductType','itemCode','eagleCode',
 'description','description2','cloth','width','orderQty','priority','remark','accountsRemark'];
const sensitive=new Set(['party','poNo','orderDate','actualProductType','itemCode','eagleCode',
 'description','description2','cloth','width','orderQty']);
const labels={
 party:'Company / Party',poNo:'Customer PO Number',orderDate:'Order Date',
 deliveryDate:'Delivery Date',actualProductType:'Actual Product Type',
 itemCode:'EFPPL Item Code',eagleCode:'Eagle Code',
 description:'Product / Work Description',description2:'Additional Product Details',
 cloth:'Cloth / Quality',width:'Cloth Width',orderQty:'Order Qty (Nos)',
 priority:'Priority',remark:'Work Order Remark',accountsRemark:'Accounts / Document Remark'
};
const types=['','CF BAG','FBD','RNF','SNF','MICRONIZER JET MILL','SPARKLER FILTER CLOTH','ANF / ANFD','OTHER'];
let snapshot=null,original=null,selectedNo='',busy=false;
const status=(text,isError=false)=>{
 const e=$('cfm413Status');if(e){e.textContent=text;e.style.color=isError?'#ad2837':'#1b597a'}
};
const normalizeWO=x=>norm(x?.workNo);
function matchingOrder(rows,workNo){
 const matches=(Array.isArray(rows)?rows:[]).filter(r=>normalizeWO(r)===norm(workNo));
 return matches.length===1?matches[0]:null;
}
function slipSent(payload,wo){
 return (Array.isArray(payload?.packingSlips)?payload.packingSlips:[]).reduce((sum,slip)=>{
  if(Array.isArray(slip.items)){
   return sum+slip.items.filter(item=>norm(item.workNo)===norm(wo)).reduce((n,item)=>n+(Number(item.qty)||0),0);
  }
  return sum+(norm(slip.workNo)===norm(wo)?Number(slip.thisDispatched)||0:0)
 },0);
}
function downstream(payload,row){
 const wo=norm(row?.workNo);
 const cuts=(Array.isArray(payload?.cutting)?payload.cutting:[]).filter(x=>norm(x.workNo)===wo);
 const reportedCut=Number(row?.cutQty)||0;
 const shipped=slipSent(payload,wo);
 const shippedStatus=/COMPLETE|DISPATCH|ARCHIV/i.test(str(row?.status||''))||
  !!row?.archived||!!row?.dispatchDoneAt||!!row?.dispatchDate||
  Number(row?.dispatchQty)>0;
 const linked=!!cuts.length||reportedCut>0||shipped>0||shippedStatus;
 return {linked,cuts:cuts.length,cutQty:reportedCut,shipped,shippedStatus};
}
function editable(row,payload){
 const d=downstream(payload,row);
 return simple.map(k=>({key:k,label:labels[k],locked:d.linked&&sensitive.has(k)}));
}
function toValue(r,k){return r?.[k]==null?'':String(r[k])}
function same(a,b,k){
 if(k==='orderQty'||k==='width')return (a===''&&b==='')||Number(a)===Number(b);
 return str(a)===str(b)
}
function formValues(){
 const values={};
 for(const k of simple){
  const el=$('cfm413Field_'+k);
  if(el)values[k]=str(el.value);
 }
 return values;
}
function changesFor(old,values){
 const list=[];
 for(const key of simple){
  const before=toValue(old,key),after=str(values[key]??before);
  if(!same(before,after,key))list.push({key,from:before,to:after});
 }
 return list;
}
function validate(old,values,payload){
 const change=changesFor(old,values);
 if(!change.length)throw Error('No changes entered. Nothing to save.');
 if(change.length>14)throw Error('Too many edits at once. Review original Work Order.');
 if(!str(values.party)||!str(values.description))
  throw Error('Company and Product / Work Description cannot be blank.');
 if(str(values.party).length>180||str(values.description).length>550||
  str(values.description2).length>550||str(values.remark).length>900)
  throw Error('Text is too long. Shorten the entry.');
 if(str(values.poNo).length>120||str(values.itemCode).length>180||
  str(values.eagleCode).length>180||str(values.cloth).length>150)
  throw Error('PO, Item or Cloth value is too long.');
 for(const k of ['orderDate','deliveryDate']){
  if(str(values[k])&&!/^\d{4}-\d{2}-\d{2}$/.test(str(values[k])))throw Error(labels[k]+' must be YYYY-MM-DD.');
 }
 if(str(values.priority)&&!['LOW','NORMAL','HIGH','URGENT'].includes(norm(values.priority)))
  throw Error('Choose a listed Priority.');
 if(str(values.actualProductType)&&!types.includes(str(values.actualProductType))&&
    str(values.actualProductType)!==str(old.actualProductType))
  throw Error('Choose an Actual Product Type from the list.');
 if((str(values.width)||change.some(x=>x.key==='width'))&&(!str(values.width)||!Number.isFinite(Number(values.width))||Number(values.width)<=0||Number(values.width)>500))
  throw Error('Cloth Width must be a positive number (up to 500).');
 const ordered=str(values.orderQty);
 if(ordered!==''&&(!Number.isSafeInteger(Number(ordered))||Number(ordered)<=0))
  throw Error('Order Qty must be a positive whole number.');
 if(!ordered&&change.some(x=>x.key==='orderQty'))throw Error('Order Qty cannot be cleared.');
 const d=downstream(payload,old);
 const locked=change.filter(x=>d.linked&&sensitive.has(x.key));
 if(locked.length)throw Error('Cutting / Packing / Dispatch / archived history exists. Cannot safely change: '+
   locked.map(x=>labels[x.key]).join(', ')+'. Only non-production details can be corrected here.');
 const cut=Number(old.cutQty)||0,shipped=d.shipped;
 if(ordered&&Number(ordered)<Math.max(cut,shipped))
  throw Error('New Order Qty cannot be less than existing Cut Qty or dispatched quantity.');
 if(change.some(x=>x.key==='party'||x.key==='poNo')){
  const duplicate=payload.pending.filter(x=>normalizeWO(x)===normalizeWO(old));
  if(duplicate.length!==1)throw Error('Duplicate Work Order number detected in Cloud. Resolve it before editing.');
 }
 return {change,downstream:d};
}
function backup(row,version){
 const content=JSON.stringify({exportedAt:new Date().toISOString(),source:'CFM Work Order Correction V413',
  cloudVersion:version,originalWorkOrder:row},null,2);
 const blob=new Blob([content],{type:'application/json'}),url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download='CFM-WO-Before-Edit-'+
  str(row.workNo).replace(/[^a-zA-Z0-9_-]/g,'_')+'-'+new Date().toISOString().slice(0,10)+'.json';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function render(){
 if(!original||!snapshot)return;
 const body=$('cfm413Fields'),d=downstream(snapshot.payload,original);
 $('cfm413WorkNo').textContent=str(original.workNo);
 $('cfm413Safety').textContent=d.linked?
  '⚠ Cutting '+d.cuts+' entry(s), Cut Qty '+d.cutQty+', previously shipped '+d.shipped+
  '. Core order/product/quantity fields are LOCKED. Remarks, delivery date, accounts remark and priority can still be corrected.':
  '✓ No dependent Cutting / Dispatch records detected. Work Order data can be corrected safely. Work No. remains unchanged.';
 body.innerHTML=editable(original,snapshot.payload).map(({key,label,locked})=>{
  const value=toValue(original,key),readonly=locked?'disabled':'';
  let field='';
  if(key==='actualProductType'||key==='priority'){
   const options=key==='priority'?['LOW','NORMAL','HIGH','URGENT']:types;
   const all=[...new Set(['',...options,value])];
   field='<select id="cfm413Field_'+key+'" data-correct-key="'+key+'" '+readonly+'>'+
    all.map(x=>'<option value="'+esc(x)+'" '+(x===value?'selected':'')+'>'+esc(x||'Not specified')+'</option>').join('')+'</select>';
  }else if(key==='description'||key==='description2'||key==='remark'||key==='accountsRemark'){
   field='<textarea id="cfm413Field_'+key+'" data-correct-key="'+key+'" rows="'+(key==='description'?3:2)+'" '+readonly+'>'+esc(value)+'</textarea>';
  }else{
   const typ=key==='orderDate'||key==='deliveryDate'?'date':key==='orderQty'||key==='width'?'number':'text';
   field='<input id="cfm413Field_'+key+'" data-correct-key="'+key+'" type="'+typ+'" value="'+esc(value)+'" '+
     (typ==='number'?'min="0" step="'+(key==='orderQty'?'1':'any')+'" ':'')+readonly+'>';
  }
  return '<label class="cfm413-field '+(locked?'cfm413-locked':'')+'"><span>'+esc(label)+
   (locked?' <small>Locked: production started</small>':'')+'</span>'+field+'</label>';
 }).join('');
 $('cfm413Preview').textContent='No changes entered.';
 $('cfm413Save').disabled=false;
 status('Cloud Work Order '+original.workNo+' loaded. Correct wrong details and review Changes before saving.');
}
async function loadWO(wo){
 if(busy)return;
 const key=norm(wo);if(!key){status('Select a Work Order number.',true);return}
 busy=true;$('cfm413Save').disabled=true;
 try{
  if(typeof cloudFetch!=='function')throw Error('Cloud API is unavailable');
  const latest=await cloudFetch();
  if(!latest||!Array.isArray(latest.payload?.pending))throw Error('Live Cloud Work Orders could not be verified.');
  snapshot=latest;
  const row=matchingOrder(latest.payload.pending,key);
  if(!row)throw Error('Work Order missing or duplicate on Cloud: '+key);
  selectedNo=str(row.workNo);original=JSON.parse(JSON.stringify(row));render();
 }catch(e){original=null;status('Unable to edit: '+String(e.message||e),true)}
 finally{busy=false}
}
async function refresh(){
 if(busy)return;
 status('Loading live Work Order numbers…');
 try{
  const latest=await cloudFetch();
  if(!latest||!Array.isArray(latest.payload?.pending))throw Error('Cloud Work Orders unavailable.');
  snapshot=latest;
  const rows=latest.payload.pending.slice().sort((a,b)=>str(b.workNo).localeCompare(str(a.workNo),undefined,{numeric:true}));
  $('cfm413Numbers').innerHTML=rows.map(r=>'<option value="'+esc(r.workNo)+'">'+esc(r.party||'')+' · '+esc(r.poNo||'')+'</option>').join('');
  status('✓ Live Cloud loaded · '+rows.length+' Work Orders. Choose one to correct.');
  if(selectedNo){$('cfm413Search').value=selectedNo;await loadWO(selectedNo)}
 }catch(e){status('Cloud Work Order list error: '+String(e.message||e),true)}
}
function previewChanges(){
 if(!original||!snapshot)return;
 const values=formValues(),dif=changesFor(original,values),p=$('cfm413Preview');
 if(!dif.length){p.textContent='No corrections entered.';return}
 let warning='';try{validate(original,values,snapshot.payload)}catch(e){warning='⚠ '+String(e.message||e)+'\n'}
 p.textContent=warning+dif.map(x=>labels[x.key]+': '+(x.from||'(blank)')+'  →  '+(x.to||'(blank)')).join('\n');
}
async function saveCorrection(){
 if(busy||!original||!snapshot)return;
 let values,checked;
 try{values=formValues();checked=validate(original,values,snapshot.payload)}
 catch(e){status(String(e.message||e),true);previewChanges();return}
 const workNo=str(original.workNo);
 if(!confirm('Correct saved Work Order '+workNo+' in LIVE Cloud?\n'+
  checked.change.map(x=>labels[x.key]+': '+(x.from||'(blank)')+' → '+(x.to||'(blank)')).join('\n')+
  '\nWork Order No., Cut Qty, Stock, Cutting and Dispatch records will NOT change.'))return;
 if(!confirm('Final confirmation: save '+checked.change.length+' correction(s) to '+workNo+'?'))return;
 if(typeof cloudFetch!=='function'||typeof cloudHeaders!=='function'||typeof CLOUD_URL==='undefined'||
    typeof state==='undefined'||!cloudReady||cloudBusy||cloudDirty){
  status('Cloud/local sync not ready. Resolve pending sync and refresh before editing. Nothing saved.',true);return
 }
 busy=true;$('cfm413Save').disabled=true;
 const seq=localMutationSeq;
 let acknowledged=false;
 try{
  const latest=await cloudFetch();
  if(!latest||!Array.isArray(latest.payload?.pending)||!Number.isSafeInteger(Number(latest.version)))
   throw Error('Could not verify latest Cloud version.');
  if(Number(latest.version)!==Number(snapshot.version)||Number(latest.version)!==Number(cloudVersion)||
     cloudBusy||cloudDirty||localMutationSeq!==seq)
   throw Error('Another device changed Cloud data. Refresh Work Order before retrying.');
  const live=matchingOrder(latest.payload.pending,workNo);
  const local=(Array.isArray(state.pending)?state.pending:[]).filter(x=>normalizeWO(x)===norm(workNo));
  if(!live||local.length!==1)throw Error('Work Order number missing/duplicate locally or on Cloud.');
  if(JSON.stringify(live)!==JSON.stringify(original)||JSON.stringify(local[0])!==JSON.stringify(original))
   throw Error('Local/Cloud Work Order values changed. Refresh/sync before correcting.');
  checked=validate(live,values,latest.payload);
  backup(live,latest.version);
  const time=new Date().toISOString();
  const changes=checked.change.map(({key,from,to})=>({key,before:from,after:to}));
  const corrected={...live};
  for(const {key,to} of checked.change)corrected[key]=
   key==='orderQty'||key==='width'?Number(to):to;
  corrected.updatedAt=time;corrected.lastCorrectedAt=time;
  const history=Array.isArray(live._correctionHistory)?live._correctionHistory:[];
  const audit={workNo,date:time,changes,baseVersion:Number(latest.version),method:'USER CONFIRMED V413'};
  corrected._correctionHistory=[...history,audit].slice(-30);
  const idx=latest.payload.pending.findIndex(x=>normalizeWO(x)===norm(workNo));
  const nextRows=latest.payload.pending.slice();nextRows[idx]=corrected;
  const auditLog=Array.isArray(latest.payload.workOrderCorrectionAudit)?latest.payload.workOrderCorrectionAudit:[];
  const nextPayload={...latest.payload,pending:nextRows,workOrderCorrectionAudit:[...auditLog,audit].slice(-1500)};
  const base=Number(latest.version);
  cloudBusy=true;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  let response;
  try{
   response=await fetch(CLOUD_URL+'/rest/v1/cfm_shared_state?id=eq.main&version=eq.'+base,{
    method:'PATCH',signal:controller.signal,
    headers:{...cloudHeaders(),'Prefer':'return=representation','x-cfm-base-version':String(base)},
    body:JSON.stringify({payload:nextPayload,version:base+1,updated_at:time})
   });
  }finally{clearTimeout(timer)}
  if(!response.ok)throw Error('Cloud rejected Work Order correction (HTTP '+response.status+').');
  const receipt=await response.json();
  if(!Array.isArray(receipt)||receipt.length!==1||Number(receipt[0].version)!==base+1)
   throw Error('Cloud confirmation missing; refresh to verify before retrying.');
  acknowledged=true;
  const confirmed=await cloudFetch();
  const verified=matchingOrder(confirmed?.payload?.pending,workNo);
  if(!verified||JSON.stringify(verified)!==JSON.stringify(corrected)||
     Number(confirmed.version)!==base+1)
   throw Error('Cloud readback failed. Refresh and verify; DO NOT save again blindly.');
  const localIdx=state.pending.findIndex(x=>normalizeWO(x)===norm(workNo));
  state.pending[localIdx]=JSON.parse(JSON.stringify(verified));
  state.workOrderCorrectionAudit=(confirmed.payload.workOrderCorrectionAudit||[]).slice();
  cloudVersion=Number(confirmed.version);
  cloudUpdatedAt=confirmed.updated_at||time;
  if(localMutationSeq===seq)cloudDirty=false;
  try{safeStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
  catch(e){console.warn('Cloud WO edit committed but local storage is full',e)}
  original=JSON.parse(JSON.stringify(verified));snapshot=confirmed;
  render();$('cfm413Preview').textContent='✓ Cloud correction saved and independently verified.';
  status('✓ CLOUD VERIFIED: Work Order '+workNo+' corrected. Number unchanged. Audit and pre-edit backup preserved.');
  try{typeof renderPending==='function'&&renderPending()}catch(e){}
  try{typeof window.cfmPendingVerifyCloud==='function'&&window.cfmPendingVerifyCloud()}catch(e){}
 }catch(e){
  status((acknowledged?'Cloud received edit; verify before retrying. ':'Edit not confirmed. ')+String(e.message||e),true);
 }finally{cloudBusy=false;busy=false;$('cfm413Save').disabled=false}
}
function open(defaultWO=''){
 if(!$('cfm413Dialog'))mount();
 const dlg=$('cfm413Dialog');if(!dlg)return;
 if(dlg.open)dlg.close();
 dlg.showModal();
 selectedNo=str(defaultWO);
 if(defaultWO)$('cfm413Search').value=selectedNo;
 refresh();
}
function mount(){
 if($('cfm413Dialog'))return true;
 const pending=$('view-pending'),search=$('pendingSearch');
 if(!pending||!search)return false;
 const btn=document.createElement('button');btn.id='cfm413Open';btn.type='button';
 btn.textContent='✎ Correct Work Order (Cloud)';
 btn.title='Edit incorrect Work Order information with Cloud verification and audit trail';
 const target=search.closest('label')||search;
 target.after(btn);btn.onclick=()=>open();
 const dialog=document.createElement('dialog');dialog.id='cfm413Dialog';
 dialog.innerHTML='<div class="cfm413-head"><b>✎ CORRECT SAVED WORK ORDER · CLOUD VERIFIED</b><button id="cfm413Close" type="button">✕ Close</button></div>'+
 '<div class="cfm413-content"><p>Fix mistaken Work Order details. Work Order number <b>cannot be changed</b>. Cutting, Stock and Dispatch are never edited here. All corrections require confirmation and Cloud verification.</p>'+
 '<div class="cfm413-search"><label>Search / Select Work Order<input id="cfm413Search" list="cfm413Numbers" placeholder="CFM-775" autocomplete="off"><datalist id="cfm413Numbers"></datalist></label>'+
 '<button id="cfm413Load">↻ Load From Cloud</button></div>'+
 '<div class="cfm413-identity"><span>WORK ORDER NUMBER — LOCKED</span><b id="cfm413WorkNo">Select a Work Order</b></div>'+
 '<div id="cfm413Safety" class="cfm413-safety">Choose a Work Order to see which fields can safely be corrected.</div>'+
 '<div class="cfm413-fields" id="cfm413Fields"></div>'+
 '<div class="cfm413-changes"><b>Before → After (Review)</b><pre id="cfm413Preview">No corrections entered.</pre></div>'+
 '<div id="cfm413Status" role="status"></div></div>'+
 '<div class="cfm413-foot"><button id="cfm413Refresh">↻ Refresh Cloud</button>'+
 '<button id="cfm413Review">Review Changes</button><button id="cfm413Save">✓ Save Verified Correction</button></div>';
 document.body.append(dialog);
 const css=document.createElement('style');css.id='cfm413Style';
 css.textContent='#cfm413Open{display:inline-flex!important;margin:8px 5px!important;padding:9px 12px!important;border:1px solid #69a8c9!important;border-radius:8px!important;background:#e6f5ff!important;color:#12537a!important;font:800 12px Arial!important;cursor:pointer}'+
 '#cfm413Dialog{width:min(900px,98vw);max-height:94dvh;overflow:auto;border:1px solid #a3c5dd;border-radius:12px;background:#fff;color:#193e59;padding:0;font:12px/1.5 Arial}'+
 '#cfm413Dialog::backdrop{background:#10263caa}#cfm413Dialog *{box-sizing:border-box;font-family:Arial,sans-serif}'+
 '#cfm413Dialog .cfm413-head{position:sticky;top:0;z-index:5;background:#114471;color:white;padding:12px;display:flex;align-items:center;justify-content:space-between;gap:12px}'+
 '#cfm413Dialog .cfm413-head button{background:white;color:#154e70;border:0;border-radius:7px;padding:8px}'+
 '#cfm413Dialog .cfm413-content{padding:12px}#cfm413Dialog .cfm413-content>p{font-size:12px}'+
 '#cfm413Dialog .cfm413-search{display:flex;align-items:end;flex-wrap:wrap;gap:10px;margin:10px 0}'+
 '#cfm413Dialog .cfm413-search label{flex:1;min-width:180px}'+
 '#cfm413Dialog label{display:block;font:800 11px/1.4 Arial}'+
 '#cfm413Dialog input,#cfm413Dialog textarea,#cfm413Dialog select{width:100%;border:1px solid #b2ccdf;border-radius:7px;padding:9px;margin:5px 0;font:12px Arial;background:#fff;color:#173f5d}'+
 '#cfm413Dialog .cfm413-identity{border:1px solid #98bacd;border-radius:8px;background:#f1f8fc;padding:9px 12px;display:flex;align-items:center;justify-content:space-between;gap:8px}'+
 '#cfm413Dialog .cfm413-identity span{font:800 10px Arial}#cfm413Dialog .cfm413-identity b{font:900 17px Arial;color:#06496d}'+
 '#cfm413Dialog .cfm413-safety{margin:8px 0;padding:9px;background:#fff7e9;border:1px solid #f0d29a;border-radius:8px;font:700 11px/1.5 Arial}'+
 '#cfm413Dialog .cfm413-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}'+
 '#cfm413Dialog .cfm413-field{min-width:0}#cfm413Dialog .cfm413-field textarea{min-height:65px}'+
 '#cfm413Dialog .cfm413-locked{opacity:.6}#cfm413Dialog .cfm413-locked input,#cfm413Dialog .cfm413-locked textarea{background:#e9eef2!important}'+
 '#cfm413Dialog .cfm413-field small{color:#a24135;font-weight:650;font-size:10px}'+
 '#cfm413Dialog .cfm413-changes{border:1px solid #b6d7eb;background:#f4fbff;border-radius:8px;padding:10px;margin:10px 0}'+
 '#cfm413Dialog .cfm413-changes pre{white-space:pre-wrap;overflow-wrap:anywhere;font:11px/1.5 monospace}'+
 '#cfm413Dialog .cfm413-foot{position:sticky;bottom:0;background:#edf5fa;border-top:1px solid #a9c5d7;padding:10px;display:flex;gap:7px;flex-wrap:wrap}'+
 '#cfm413Dialog button{padding:9px 12px;border:1px solid #accbdf;background:#fff;color:#185274;border-radius:7px;font:800 12px Arial;cursor:pointer}'+
 '#cfm413Dialog #cfm413Save{background:#0d6844;color:#fff;border-color:#0d6844}'+
 '@media(max-width:660px){#cfm413Dialog .cfm413-fields{grid-template-columns:1fr}}';
 document.head.append(css);
 $('cfm413Close').onclick=()=>dialog.close();
 $('cfm413Load').onclick=()=>loadWO($('cfm413Search').value);
 $('cfm413Refresh').onclick=refresh;
 $('cfm413Review').onclick=previewChanges;
 $('cfm413Save').onclick=saveCorrection;
 $('cfm413Fields').addEventListener('input',previewChanges);
 $('cfm413Search').addEventListener('change',()=>{if($('cfm413Search').value)loadWO($('cfm413Search').value)});
 return true;
}
window.CFM_WO_CORRECT_V413=Object.freeze({open,mount,downstream,validate,changesFor});
function init(){let tries=0;const timer=setInterval(()=>{if(mount()||++tries>80)clearInterval(timer)},400);mount()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();