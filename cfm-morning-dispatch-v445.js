/* V445 Morning dispatch control: database read-only, no inferred legacy shipment quantities. */
(function(){
'use strict';
const $=id=>document.getElementById(id),T=x=>String(x??'').trim(),N=x=>T(x).toUpperCase(),A=x=>Array.isArray(x)?x:[],E=x=>T(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function build(p){
 const rows=[],review=[],closed=[];
 for(const r of A(p.pending)){
  if(r.archived||['ARCHIVED','CANCELLED','CANCELED'].includes(N(r.status)))continue;
  const done=N(r.status)==='DISPATCHED'||!!r.dispatchDoneAt,base={workNo:r.workNo,party:r.party,poNo:r.poNo,code:r.eagleCode||r.efpplCode||r.itemCode,description:r.description,order:Number(r.orderQty),cut:Number(r.cutQty),due:r.deliveryDate||'',priority:r.priority,status:r.status};
  try{
   const d=window.CFM_BILL_DISPATCH_LEDGER.summarize(r,A(p.packingSlips));
   const ambiguous=d.needsLegacyReview||(!d.confirmedDispatchQty&&(!!r.deliveredMaterial||!!r.dispatchDate||Number(r.dispatchQty)>0))||(done&&d.balanceQty>0);
   if(ambiguous){review.push({...base,reason:done?'Legacy dispatch marked done — actual quantity needs verification':'Older delivery record — quantity needs verification'});continue}
   if(d.balanceQty===0){closed.push(base);continue}
   let bill=null,challan=null;
   try{const b=window.CFM_ADV_BILL_V444.summary(p,r,'BILL'),c=window.CFM_ADV_BILL_V444.summary(p,r,'CHALLAN');bill=b.legacy?null:b.remaining;challan=c.legacy?null:c.remaining}catch(_){}
   rows.push({...base,sent:d.confirmedDispatchQty,balance:d.balanceQty,bill,challan});
  }catch(e){review.push({...base,reason:e.message})}
 }
 rows.sort((a,b)=>Number(N(b.priority)==='URGENT')-Number(N(a.priority)==='URGENT')||(a.due||'9999').localeCompare(b.due||'9999')||T(a.workNo).localeCompare(T(b.workNo),undefined,{numeric:true}));
 const open=A(p.pending).filter(r=>!r.archived&&N(r.status)==='PENDING').length;
 return {rows,review,closed,open,balance:rows.reduce((s,r)=>s+r.balance,0)};
}
let result=null,loading=false,last=0;
function draw(){
 if(!result)return;const q=N($('mdSearch').value),match=r=>!q||N([r.workNo,r.party,r.poNo,r.description,r.code].join(' ')).includes(q);
 $('mdKpis').innerHTML=[['Production pending WO',result.open],['Dispatch pending WO',result.rows.length],['Dispatch pending Nos.',result.balance],['Legacy / verify WO',result.review.length]].map(([k,v])=>'<div><small>'+k+'</small><b>'+v+'</b></div>').join('');
 const rows=result.rows.filter(match);
 $('mdRows').innerHTML=rows.map((r,i)=>'<tr><td>'+String(i+1)+'</td><td><b>'+E(r.workNo)+'</b><br>'+E(r.party)+'<br><small>PO: '+E(r.poNo||'—')+'</small></td><td>'+E(r.description)+'<br><small>'+E(r.code||'—')+'</small></td><td>'+r.order+'</td><td>'+r.sent+'</td><td><b>'+r.balance+'</b></td><td>'+E(r.bill??'VERIFY')+'</td><td>'+E(r.challan??'VERIFY')+'</td><td>'+E(r.due||'—')+(N(r.priority)==='URGENT'?'<br><b>URGENT</b>':'')+'</td></tr>').join('')||'<tr><td colspan="9">No matching confirmed pending dispatch orders.</td></tr>';
 $('mdReview').textContent=result.review.filter(match).map(r=>r.workNo+' | '+r.party+' | '+r.description+' | '+r.reason).join('\n')||'No review rows';
}
async function refresh(){
 if(loading)return;loading=true;$('mdStatus').textContent='Reading live database…';
 try{const s=await cloudFetch();if(!s||!validState(s.payload))throw Error('Cloud data unavailable');result=build(s.payload);last=Date.now();draw();$('mdStatus').textContent='Live cloud V'+s.version+' · '+new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})+' IST · quantities based on saved packing records; review rows excluded from confirmed totals.'}
 catch(e){result=null;$('mdKpis').textContent='—';$('mdRows').textContent='';$('mdReview').textContent='';$('mdStatus').textContent='Live data not available: '+e.message}
 finally{loading=false}
}
function mount(){
 if($('mdPanel'))return;const host=$('view-dashboard');if(!host)return;
 const panel=document.createElement('section');panel.id='mdPanel';panel.style.cssText='margin:8px 0;padding:10px;background:white;color:#17374d;border:1px solid #b5c9d7;border-radius:10px;font:13px Arial';
 panel.innerHTML='<style>#mdPanel *{box-sizing:border-box}#mdKpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;margin:7px 0}#mdKpis div{padding:7px;border:1px solid #cbdbe6;border-radius:6px}#mdKpis b{display:block;font-size:22px}#mdPanel button,#mdPanel input{border:1px solid #b2c6d4;border-radius:6px;padding:8px;font:14px Arial;color:#174b75;background:#fff}#mdPanel table{width:100%;border-collapse:collapse;font-size:12px}#mdPanel td,#mdPanel th{border:1px solid #cad9e3;padding:6px;text-align:left;vertical-align:top}#mdPanel th{background:#e9f1f7}#mdPanel small{color:#496579}#mdPanel pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12px Arial}</style><div style="display:flex;justify-content:space-between;align-items:center;gap:6px"><b style="font-size:15px">DAILY ORDER & DISPATCH CONTROL</b><button id="mdRefresh">Refresh</button></div><div id="mdKpis"></div><small id="mdStatus" role="status"></small><details open><summary><b>Pending Dispatch List</b></summary><input id="mdSearch" style="width:100%;margin:6px 0" placeholder="Search WO / Company / PO / Product"><div style="overflow:auto;max-height:45dvh"><table><thead><tr><th>Sr.</th><th>WO / Company / PO</th><th>Product / EFPPL</th><th>Order</th><th>Sent</th><th>Balance</th><th>Bill request balance</th><th>Challan request balance</th><th>Due date</th></tr></thead><tbody id="mdRows"></tbody></table></div><button id="mdCopy" style="margin-top:6px">Copy Pending List</button></details><details><summary>Legacy dispatch / verification list</summary><pre id="mdReview"></pre></details>';
 host.prepend(panel);$('mdRefresh').onclick=refresh;$('mdSearch').oninput=draw;
 $('mdCopy').onclick=async()=>{if(!result)return;const t='CFM DAILY DISPATCH PENDING · '+new Date().toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata'})+'\nProduction pending WO: '+result.open+'\nDispatch pending WO: '+result.rows.length+'\nConfirmed pending Qty: '+result.balance+' Nos.\n'+result.rows.map(r=>r.workNo+' | '+r.party+' | PO '+(r.poNo||'—')+' | '+r.description+' | Order '+r.order+' | Sent '+r.sent+' | Pending '+r.balance).join('\n')+'\nLegacy review: '+result.review.length+' WO (not included in confirmed qty)';try{await navigator.clipboard.writeText(t)}catch(_){prompt('Copy pending list:',t)}};
 refresh();setInterval(()=>{if(!document.hidden&&panel.offsetParent!==null&&Date.now()-last>60000)refresh()},30000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-last>60000)refresh()});
}
window.CFM_MORNING_DISPATCH_V445={build,mount};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();let n=0;const timer=setInterval(()=>{mount();if($('mdPanel')||++n>120)clearInterval(timer)},500);
})();