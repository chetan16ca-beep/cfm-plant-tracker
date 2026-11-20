/* CFM V411 - Mixed physical bundle (multiple customer POs, one bundle and one label).
 * Standalone UI for V409 manual Packing Slip. Every bundle has item-wise quantities.
 * Computes read-only allocation; ERP's existing Cloud-save and ledger are unchanged.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const st=x=>String(x??'').trim();
const esc=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[ch]));
const values=new Map();
const valKey=(bundle,id)=>String(bundle)+'|'+id;
const enabled=()=>!!$('cfm411Enable')?.checked;
const selected=()=>[...($('cfm409Lines')?.querySelectorAll('tr[data-manual-id]')||[])].map(tr=>{
 const id=st(tr.dataset.manualId),first=tr.querySelector('td');
 const text=first?.innerText||first?.textContent||'';
 return {id,tr,label:st(text).slice(0,155),ship:st(tr.querySelector('[data-send]')?.value)};
});
function remember(){
 const body=$('cfm411Rows');if(!body)return;
 for(const node of body.querySelectorAll('input[data-mix-item]')){
  values.set(valKey(node.dataset.mixBundle,node.dataset.mixItem),st(node.value));
 }
}
function readRow(row){
 const values=[];
 for(const node of row.querySelectorAll('input[data-mix-item]')){
  const raw=st(node.value),n=raw===''?0:Number(raw);
  values.push({id:node.dataset.mixItem,raw,qty:n});
 }
 return values;
}
function status(){
 if(!enabled())return;
 const items=selected(),body=$('cfm411Rows'),box=$('cfm411Status');
 if(!box||!body)return;
 const trs=[...body.querySelectorAll('tr[data-mixed-bundle]')];
 const totals=new Map(items.map(x=>[x.id,0]));
 let grand=0,empty=0,invalid=0;
 for(const tr of trs){
  const values=readRow(tr);
  let sum=0,used=0;
  for(const x of values){
   if(!Number.isSafeInteger(x.qty)||x.qty<0){invalid++;continue}
   if(x.qty>0)used++;
   sum+=x.qty;totals.set(x.id,(totals.get(x.id)||0)+x.qty);
  }
  if(!used)empty++;
  grand+=sum;
  const el=tr.querySelector('[data-mix-total]');
  if(el)el.textContent=sum+' Nos ('+used+' PO Items)';
 }
 const mismatches=items.filter(x=>Number(x.ship||0)!==(totals.get(x.id)||0)).length;
 box.textContent=items.length<2?'Select at least 2 different PO Items for a Mixed Bundle':
 invalid?'⚠ Only whole numbers 0 or more are allowed':
 empty?'⚠ Each physical Bundle must contain at least one PO Item':
 mismatches?'⚠ Some PO-wise Mixed Bundle quantities do not match This Dispatch Qty':
 '✓ '+trs.length+' physical bundle(s), '+grand+' Nos. All PO dispatch quantities match.';
}
function render(){
 const box=$('cfm411Panel'),editor=$('cfm411Editor'),body=$('cfm411Rows'),table=$('cfm411Table'),dlg=$('cfm409Dialog');
 if(!box||!editor||!body||!table)return;
 remember();
 if(dlg)dlg.classList.toggle('cfm411-active',enabled());
 editor.hidden=!enabled();
 if(!enabled())return;
 const items=selected(),count=Number($('cfm411Count')?.value);
 if(!Number.isSafeInteger(count)||count<1||count>200){
  body.innerHTML='<tr><td>Enter 1 to 200 physical Bundles.</td></tr>';
  return;
 }
 table.querySelector('thead').innerHTML='<tr><th>BUNDLE NO.</th>'+items.map(x=>
   '<th>'+esc(x.label)+'</th>').join('')+'<th>TOTAL / BUNDLE</th></tr>';
 body.innerHTML=Array.from({length:count},(_,i)=>'<tr data-mixed-bundle="'+i+'">'+
  '<td><b>Bundle '+(i+1)+' / '+count+'</b></td>'+
  items.map(x=>'<td><input data-mix-item="'+esc(x.id)+'" data-mix-bundle="'+i+
   '" type="number" min="0" step="1" placeholder="0" value="'+esc(values.get(valKey(i,x.id))||'')+'"></td>').join('')+
  '<td><b data-mix-total>0 Nos</b></td></tr>').join('');
 status();
}
function collect(items){
 if(!enabled())return null;
 if(!Array.isArray(items)||items.length<2)throw Error('A Mixed Bundle must include 2 or more PO Items.');
 const count=Number($('cfm411Count')?.value);
 const trs=[...($('cfm411Rows')?.querySelectorAll('tr[data-mixed-bundle]')||[])];
 if(!Number.isSafeInteger(count)||count<1||count>200||trs.length!==count)
  throw Error('Mixed Bundle count must be between 1–200 and rows must be complete.');
 const ids=selected().map(x=>x.id);
 if(ids.length!==items.length)throw Error('Selected PO item count changed. Recheck Mixed Bundle allocations.');
 if(ids.some((id,i)=>st(items[i].manualOrderId)!==id))
  throw Error('PO item order changed. Refresh the Mixed Bundle table.');
 const totals=Array(items.length).fill(0),bundleContents=[];
 for(let i=0;i<count;i++){
  const row=trs[i],inputs=readRow(row);
  if(Number(row.dataset.mixedBundle)!==i||inputs.length!==items.length)
   throw Error('Mixed Bundle '+(i+1)+' is missing a PO item field.');
  const allocations=[];
  for(let j=0;j<items.length;j++){
   const x=inputs[j];
   if(x.id!==ids[j]||!Number.isSafeInteger(x.qty)||x.qty<0)
    throw Error('Bundle '+(i+1)+' has an invalid PO quantity.');
   if(x.qty){allocations.push({itemIndex:j,qty:x.qty});totals[j]+=x.qty}
  }
  if(!allocations.length)throw Error('Physical Bundle '+(i+1)+' cannot be empty.');
  bundleContents.push({qty:allocations.reduce((a,x)=>a+x.qty,0),items:allocations});
 }
 for(let i=0;i<items.length;i++){
  if(totals[i]!==Number(items[i].qty))
   throw Error('PO '+items[i].poNo+': total inside Bundles is '+totals[i]+', This Dispatch Qty is '+items[i].qty+'.');
 }
 if(!$('cfm411Verified')?.checked)
  throw Error('Tick “Mixed Bundle physically checked” after checking all PO and item quantities.');
 return {
  bundleContents,
  // Legacy bundleDetails supports old history/ERP export; detailed allocations
  // come ONLY from bundleContents and must be used for mixed labels.
  bundleDetails:bundleContents.map(x=>({itemIndex:x.items[0].itemIndex,qty:x.qty}))
 };
}
function invalidate(){const v=$('cfm411Verified');if(v)v.checked=false;status()}
function reset(){
 values.clear();
 if($('cfm411Enable'))$('cfm411Enable').checked=false;
 if($('cfm411Count'))$('cfm411Count').value='1';
 if($('cfm411Verified'))$('cfm411Verified').checked=false;
 render();
}
function mount(){
 if(!$('cfm409Dialog'))return false;
 if($('cfm411Panel'))return true;
 const after=$('cfm409Dialog').querySelector('.cfm409-tablewrap');
 if(!after)return false;
 const panel=document.createElement('section');panel.id='cfm411Panel';
 panel.innerHTML='<label class="cfm411-enable"><input id="cfm411Enable" type="checkbox"> MIXED BUNDLE — 2 or more POs in the SAME physical bundle</label>'+
 '<div id="cfm411Editor" hidden><p>Enter qty of each PO inside each physical Bundle. A physical Bundle is counted ONCE and prints ONE mixed label listing all PO materials.</p>'+
 '<div class="cfm411-controls"><label>Physical Bundles<input id="cfm411Count" type="number" min="1" max="200" step="1" value="1"></label>'+
 '<button type="button" id="cfm411Add">+ Add Bundle</button><button type="button" id="cfm411Remove">− Remove Bundle</button></div>'+
 '<div class="cfm411-table-scroll"><table id="cfm411Table"><thead></thead><tbody id="cfm411Rows"></tbody></table></div>'+
 '<div id="cfm411Status" role="status"></div>'+
 '<label class="cfm411-check"><input type="checkbox" id="cfm411Verified"> Mixed Bundle physically checked: correct PO, Material, Qty and Total</label></div>';
 after.after(panel);
 const css=document.createElement('style');css.id='cfm411Css';
 css.textContent='#cfm411Panel{border:1px solid #81b3d4;background:#f0f7fc;border-radius:10px;padding:12px;margin:10px 0}'+
 '#cfm411Panel .cfm411-enable,#cfm411Panel .cfm411-check{display:flex!important;align-items:center;gap:9px;font:800 12px/1.4 Arial!important}'+
 '#cfm411Panel input[type=checkbox]{width:19px!important;height:19px;flex:none}'+
 '#cfm411Panel p{font-size:11px;line-height:1.45}'+
 '#cfm411Panel #cfm411Editor[hidden]{display:none!important}'+
 '#cfm411Panel .cfm411-controls{display:flex;align-items:end;flex-wrap:wrap;gap:8px;margin-bottom:8px}'+
 '#cfm411Panel .cfm411-controls input{max-width:105px}'+
 '#cfm411Panel .cfm411-table-scroll{overflow-x:auto}'+
 '#cfm411Panel #cfm411Table{width:100%;min-width:680px;table-layout:auto;border-collapse:collapse}'+
 '#cfm411Panel #cfm411Table th,#cfm411Panel #cfm411Table td{min-width:115px;padding:7px;vertical-align:middle;border:1px solid #b3d1e6}'+
 '#cfm411Panel #cfm411Table th{max-width:190px;font-size:10px;overflow-wrap:anywhere;background:#dceefa}'+
 '#cfm411Panel #cfm411Table input{font-size:15px;font-weight:800;max-width:120px;min-width:78px}'+
 '#cfm411Panel #cfm411Status{font-weight:850;font-size:11px;margin:9px 0}'+
 '#cfm409Dialog.cfm411-active #cfm409Lines tr td:nth-child(6)>*{display:none!important}'+
 '#cfm409Dialog.cfm411-active #cfm409Lines tr td:nth-child(6):after{content:"Mixed Bundle quantities are entered below";display:block;color:#235d7d;font-weight:800;font-size:11px}';
 document.head.appendChild(css);
 $('cfm411Enable').onchange=()=>{invalidate();render()};
 $('cfm411Count').onchange=()=>{remember();invalidate();render()};
 for(const [id,delta] of [['cfm411Add',1],['cfm411Remove',-1]]){
  $(id).onclick=()=>{
   remember();
   const old=Number($('cfm411Count').value)||1;
   $('cfm411Count').value=String(Math.max(1,Math.min(200,old+delta)));
   invalidate();render()
  };
 }
 $('cfm411Rows').addEventListener('input',e=>{
  if(!e.target.matches('input[data-mix-item]'))return;
  remember();invalidate()
 });
 $('cfm409Lines').addEventListener('input',e=>{if(e.target.matches('input[data-send]'))invalidate()});
 render();return true;
}
window.CFM_PACK_MIX_V411=Object.freeze({mount,render,enabled,collect,reset,invalidate});
function init(){let attempts=0;const t=setInterval(()=>{if(mount()||++attempts>85)clearInterval(t)},400);mount()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();