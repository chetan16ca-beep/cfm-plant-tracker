/* V445 Morning Control: read-only live database dashboard. No production writes. */
(function(){
'use strict';
const $=id=>document.getElementById(id),T=x=>String(x??'').trim(),N=x=>T(x).toUpperCase(),A=x=>Array.isArray(x)?x:[],E=x=>T(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function productDetails(r){
 const description=T(r.description),spec=T(r.description2||r.specification);
 const source=[description,spec].filter(Boolean).join(' ');
 // Extract only explicitly labelled micron / pore size, not an arbitrary number in a code.
 const micron=T(r.micron)||source.match(/(?:pore\s*size|micron)\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*(?:microns?|[µμ]m?)?/i)?.[1]||source.match(/(\d+(?:\.\d+)?)\s*(?:microns?\b|[µμ]m?)/i)?.[1]||'';
 const size=T(r.size||r.productSize)||source.match(/(?:\bCF\s*BAG\b|\bCF[-\s]*)(?:\s*[-/]\s*|\s*)(\d+(?:\.\d+)?)\s*(?:"|″|”|inch\b)/i)?.[1]||source.match(/(\d+(?:\.\d+)?)\s*(?:"|″|”|inch\b)\s*CF\s*BAG\b/i)?.[1]||'';
 const code=T(r.itemCode||r.efpplCode);
 return {description,spec,micron,size: T(r.size||r.productSize)|| (size?size+' inch':''),cloth:T(r.cloth),width:T(r.width),code:/^EFPPL[- ]/i.test(code)?code:T(r.efpplCode)||T(window.CFM_EFPPL?.codeForRow?.(r)?.code)||'',buyerCode:T(r.buyerItemCode||r.partyProductCode),measurement:T(r.measurementAuto)};
}
function productCell(r){
 const d=productDetails(r),field=(label,v)=>'<div class="cfm446Field"><span>'+label+'</span> '+E(v||'Not recorded')+'</div>';
 return '<div class="cfm446Product">'+E(d.description||'Not recorded')+'</div>'+field('EFPPL Code',d.code)+field('Specification',d.spec)+field('Size',d.size)+field('Micron',d.micron)+field('Cloth quality',d.cloth)+field('Roll width (inch)',d.width)+(d.buyerCode?field('Buyer item code',d.buyerCode):'')+(d.measurement?'<details><summary>Recorded measurements</summary><div style="white-space:pre-wrap">'+E(d.measurement)+'</div></details>':'');
}
function calculate(p){
 const rows=[],seen=new Set();
 for(const r of A(p.pending)){
  if(r.archived||['ARCHIVED','CANCELLED','CANCELED'].includes(N(r.status)))continue;
  const id=N(r.workNo),order=Number(r.orderQty),cut=Number(r.cutQty||0);
  if(!id||seen.has(id)||!Number.isSafeInteger(order)||order<1||!Number.isFinite(cut)||cut<0||cut>order){rows.push({r,review:'Invalid or duplicate WO / quantity',cutPending:null,dispatchPending:null,bill:null,challan:null});continue}seen.add(id);
  const closed=N(r.status)==='DISPATCHED'||!!r.dispatchDoneAt;
  const cutPending=closed?0:r.cutEntryPending?null:Math.max(0,order-cut);
  let dispatchPending=null,actual=null,bill=null,challan=null,review=[];
  if(cutPending===null)review.push('Cutting quantity needs review');
  try{
   const d=window.CFM_BILL_DISPATCH_LEDGER.summarize(r,A(p.packingSlips));
   const ambiguous=d.needsLegacyReview||(!d.confirmedDispatchQty&&(r.deliveredMaterial||r.dispatchDate||Number(r.dispatchQty)>0));
   if(ambiguous||closed&&d.balanceQty>0)review.push('Legacy dispatch needs verification');
   else{dispatchPending=d.balanceQty;actual=d.confirmedDispatchQty}
  }catch(e){review.push(e.message)}
  for(const type of ['BILL','CHALLAN']){
   const status=N(r[type==='BILL'?'billStatus':'challanStatus']);
   if(status==='NOT REQUIRED'||status==='DONE'){if(type==='BILL')bill=0;else challan=0;continue}
   // Do not assume both documents are required, or present all historic work as new requests.
   if(closed||dispatchPending===0)continue;
   try{
    const s=window.CFM_ADV_BILL_V444.summary(p,r,type);
    if(s.legacy)review.push(type+' request history needs verification');
    else if(type==='BILL')bill=s.remaining;else challan=s.remaining;
   }catch(e){review.push(type+' request review')}
  }
  rows.push({r,order,cutPending,actual,dispatchPending,bill,challan,review:[...new Set(review)].join('; ')});
 }
 const totals={cutWO:0,cutQty:0,dispatchWO:0,dispatchQty:0,billWO:0,billQty:0,challanWO:0,challanQty:0,review:0};
 for(const x of rows){for(const [k,f] of [['cut','cutPending'],['dispatch','dispatchPending'],['bill','bill'],['challan','challan']])if(x[f]>0){totals[k+'WO']++;totals[k+'Qty']+=x[f]}if(x.review)totals.review++}
 return {rows,totals};
}
let data=null,busy=false,lastRead=null,filter='DISPATCH',showAll=false;
function render(){
 const root=$('cfm445Morning');if(!root||!data)return;
 const {rows,totals:t}=data;
 const metrics=[['CUTTING PENDING',t.cutWO,t.cutQty,'CUT'],['DISPATCH PENDING',t.dispatchWO,t.dispatchQty,'DISPATCH'],['BILL REQUEST BAL.',t.billWO,t.billQty,'BILL'],['CHALLAN REQUEST BAL.',t.challanWO,t.challanQty,'CHALLAN']];
 $('cfm445Metrics').innerHTML=metrics.map(([label,wo,qty,k])=>'<button type="button" data-filter="'+k+'" aria-pressed="'+(filter===k)+'"><small>'+label+'</small><strong>'+qty+' <small>Nos.</small></strong><span>'+wo+' Work Orders</span></button>').join('');
 $('cfm445Review').textContent=t.review+' WO require verification';$('cfm445Review').hidden=!t.review;
 const q=N($('cfm445Search').value),match=x=>filter==='CUT'?x.cutPending>0:filter==='DISPATCH'?x.dispatchPending>0:filter==='BILL'?x.bill>0:filter==='CHALLAN'?x.challan>0:filter==='REVIEW'?!!x.review:x.cutPending>0||x.dispatchPending>0||x.bill>0||x.challan>0||!!x.review;
 const filtered=rows.filter(match).filter(x=>!q||N([x.r.workNo,x.r.party,x.r.poNo,x.r.description,x.r.description2,x.r.cloth,x.r.itemCode,x.r.efpplCode].join(' ')).includes(q)).sort((a,b)=>T(a.r.deliveryDate||'9999').localeCompare(T(b.r.deliveryDate||'9999'))||T(a.r.workNo).localeCompare(T(b.r.workNo),undefined,{numeric:true}));
 const visible=showAll?filtered:filtered.slice(0,10),val=x=>x===null||x===undefined?'VERIFY':E(x);
 $('cfm445Rows').innerHTML=visible.map(x=>'<tr><td><b>'+E(x.r.workNo)+'</b><br>'+E(x.r.party)+'<br><small>PO: '+E(x.r.poNo||'Awaited')+'</small></td><td>'+productCell(x.r)+'</td><td>'+val(x.order)+'</td><td>'+val(x.cutPending)+'</td><td>'+val(x.actual)+'</td><td><b>'+val(x.dispatchPending)+'</b></td><td>'+val(x.bill)+'</td><td>'+val(x.challan)+'</td><td>'+E(x.r.deliveryDate||'—')+(x.review?'<br><small>'+E(x.review)+'</small>':'')+'</td></tr>').join('')||'<tr><td colspan="9">No matching pending work.</td></tr>';
 $('cfm445Count').textContent=visible.length+' / '+filtered.length+' Work Orders';
 $('cfm445All').hidden=filtered.length<=10;$('cfm445All').textContent=showAll?'Show first 10':'Show all '+filtered.length;
 $('cfm445Filter').value=filter;
}
async function refresh(){
 if(busy||document.hidden)return;busy=true;const status=$('cfm445Status');if(!status){busy=false;return}
 status.textContent=lastRead?'Refreshing · previous result '+lastRead:'Reading live database…';
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),18000);
 try{const s=await cloudFetch(ctrl.signal);if(!s||!validState(s.payload))throw Error('Invalid Cloud snapshot');data=calculate(s.payload);lastRead=new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'});render();status.textContent='LIVE • '+lastRead+' IST · V'+s.version}catch(e){status.textContent='Cloud read failed'+(lastRead?' · STALE: '+lastRead:'')+' · Refresh to retry';if(!lastRead)$('cfm445Rows').innerHTML='<tr><td colspan="9">Live figures unavailable.</td></tr>'}finally{clearTimeout(timer);busy=false}
}
function mount(){
 const host=$('view-dashboard');if(!host||$('cfm445Morning'))return;
 const root=document.createElement('section');root.id='cfm445Morning';
 root.innerHTML='<style>#cfm445Morning{border:1px solid #b8cedd;border-radius:10px;padding:9px;margin:8px 0;background:#fff;color:#183b53;font:13px system-ui}#cfm445Morning *{box-sizing:border-box}#cfm445Morning button,#cfm445Morning select,#cfm445Morning input{border:1px solid #a9bdcc;border-radius:6px;padding:7px;background:white;color:#183b53;font:inherit}#cfm445Metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;margin:8px 0}#cfm445Metrics button{text-align:left;padding:8px}#cfm445Metrics button[aria-pressed=true]{border:2px solid #17618a;background:#eef7fc}#cfm445Metrics strong,#cfm445Metrics span{display:block}#cfm445Metrics strong{font-size:22px;color:#174b75}#cfm445Metrics small{font-size:10px}#cfm445Morning table{width:100%;border-collapse:collapse;font-size:12px;min-width:840px}#cfm445Morning th,#cfm445Morning td{border:1px solid #ccdbe5;padding:6px;text-align:left;vertical-align:top}#cfm445Morning th{background:#eaf2f7;position:sticky;top:0}#cfm445Morning .cfm446Product{font-weight:750;min-width:225px;overflow-wrap:anywhere;margin-bottom:4px}#cfm445Morning .cfm446Field{font-size:11px;border-top:1px solid #e0e8ee;padding:2px 0;overflow-wrap:anywhere}#cfm445Morning .cfm446Field span{font-weight:700;color:#486779}#cfm445Morning small{color:#486779}#cfm445Morning .cfm445Controls{display:flex;flex-wrap:wrap;gap:5px;align-items:center}</style><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:16px">DAILY PENDING CONTROL</b><button type="button" id="cfm445Refresh">Refresh</button></div><small id="cfm445Status">Reading live database…</small><div id="cfm445Metrics"></div><button type="button" id="cfm445Review" hidden></button><div class="cfm445Controls"><select id="cfm445Filter"><option value="DISPATCH">Dispatch Pending</option><option value="CUT">Cutting Pending</option><option value="BILL">Bill Request Balance</option><option value="CHALLAN">Challan Request Balance</option><option value="REVIEW">Review</option><option value="ALL">All Pending / Review</option></select><input type="search" id="cfm445Search" placeholder="Company / WO / PO" style="min-width:120px;flex:1"><span id="cfm445Count"></span></div><div style="overflow:auto;max-height:330px;margin-top:6px"><table><thead><tr><th>WO / Company / PO</th><th>Product / Full Specification</th><th>Order Qty</th><th>Cut Bal.</th><th>Actual Sent</th><th>Dispatch Bal.</th><th>Bill Req. Bal.</th><th>Challan Req. Bal.</th><th>Due / Review</th></tr></thead><tbody id="cfm445Rows"><tr><td colspan="9">Loading…</td></tr></tbody></table></div><button type="button" id="cfm445All" hidden>Show all</button><p style="font-size:11px;margin:5px 0 0">Dispatch = recorded packing slips, not bill requests. Bill/Challan balances are separate possible request quantities, not confirmed invoices or mandatory document counts. Uncertain history excluded from totals and listed in Review.</p>';
 host.prepend(root);
 $('cfm445Refresh').onclick=refresh;$('cfm445Search').oninput=()=>{showAll=false;render()};$('cfm445Filter').onchange=e=>{filter=e.target.value;showAll=false;render()};$('cfm445All').onclick=()=>{showAll=!showAll;render()};$('cfm445Review').onclick=()=>{filter='REVIEW';showAll=false;render()};$('cfm445Metrics').onclick=e=>{const b=e.target.closest('[data-filter]');if(b){filter=b.dataset.filter;showAll=false;render()}};
 refresh();setInterval(()=>{if(root.getClientRects().length)refresh()},60000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&root.getClientRects().length)refresh()});
}
window.CFM_MORNING_V445={calculate,refresh,mount,productDetails,productCell};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
let n=0;const timer=setInterval(()=>{mount();if($('cfm445Morning')||++n>120)clearInterval(timer)},500);
})();