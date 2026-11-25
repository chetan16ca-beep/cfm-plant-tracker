/* CFM V418 — Read-only, all-company Cloud Packing Slip History.
 * Uses live shared Cloud payload. Does not create, modify or delete dispatches.
 */
(function(){
'use strict';
const ID='cfm418AllPackingHistory';
const byId=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const str=v=>String(v??'').trim();
let rows=[],pending=[],loading=false;
function localDate(raw){
 if(!raw)return '';
 const d=new Date(raw);
 return Number.isNaN(d.valueOf())?'':new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
}
function localTime(raw){
 const d=new Date(raw||'');
 return Number.isNaN(d.valueOf())?'—':new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:true}).format(d);
}
function qty(x){return Number.isFinite(Number(x))?Number(x):0}
function label(x){return str(x)||'—'}
function countText(n){return n+' saved '+(n===1?'slip':'slips')}
function makeDialog(){
 if(byId(ID))return byId(ID);
 const dlg=document.createElement('dialog');
 dlg.id=ID;
 dlg.setAttribute('aria-label','All Packing Slip History');
 dlg.innerHTML='<div class="cfm418-head"><div><strong>📚 All Packing Slip History</strong><small>☁ Live Cloud · All Companies · Read-only register</small></div><button type="button" id="cfm418Close" aria-label="Close">✕</button></div>'+
 '<div class="cfm418-filter"><label>Search Company / Slip / Work Order / PO<input id="cfm418Search" type="search" placeholder="e.g. SUN, 775, EFPPL/PS..."></label>'+
 '<label>From<input id="cfm418From" type="date"></label><label>To<input id="cfm418To" type="date"></label>'+
 '<button type="button" id="cfm418Refresh">↻ Refresh Cloud</button><button type="button" id="cfm418Clear">Clear filters</button></div>'+
 '<div id="cfm418Status" role="status">Open to load Cloud history.</div><div style="padding:10px"><button type="button" id="cfmBillPendingToggle">Billed / Partial Dispatch Balance</button><div id="cfmBillPendingRows" hidden></div></div><div id="cfm418Rows" class="cfm418-rows"></div>'+
 '<div class="cfm418-foot">Reprint opens the already-saved Packing Slip + Bundle Label preview. No new dispatch is created.</div>';
 document.body.append(dlg);
 const style=document.createElement('style');
 style.id='cfm418Style';
 style.textContent='#'+ID+'{width:min(990px,96vw);max-height:90dvh;overflow:auto;box-sizing:border-box;border:1px solid #bdd2e6;border-radius:13px;padding:0;background:#fff;color:#153651;box-shadow:0 15px 65px #082c4d52;font:12px Arial,sans-serif}'+
 '#'+ID+'::backdrop{background:#0a243eab}'+
 '#'+ID+' .cfm418-head{display:flex;justify-content:space-between;gap:10px;align-items:center;background:#104d7c;color:white;padding:13px}'+
 '#'+ID+' .cfm418-head strong{display:block;font:bold 17px Arial}'+
 '#'+ID+' .cfm418-head small{display:block;margin-top:5px;color:#d5ebfc}'+
 '#'+ID+' button{border-radius:8px;border:1px solid #bad4e6;background:#eef7ff;color:#12527f;padding:9px 10px;font:bold 12px Arial;cursor:pointer}'+
 '#'+ID+' .cfm418-head button{background:white;color:#104d7c;min-width:38px}'+
 '#'+ID+' .cfm418-filter{display:grid;grid-template-columns:minmax(140px,2fr) minmax(115px,1fr) minmax(115px,1fr) auto auto;align-items:end;gap:8px;padding:12px;background:#f7fbff}'+
 '#'+ID+' .cfm418-filter label{display:block;font-weight:bold;color:#365470}'+
 '#'+ID+' input{display:block;box-sizing:border-box;margin-top:5px;width:100%;min-height:38px;border-radius:7px;border:1px solid #b8d1e1;background:white;color:#18344b;padding:7px;font:12px Arial}'+
 '#'+ID+' #cfm418Status{padding:9px 12px;background:#edf6fe;color:#194768;font-weight:bold}'+
 '#'+ID+' .cfm418-rows{padding:5px 12px 12px;max-height:55dvh;overflow:auto}'+
 '#'+ID+' .cfm418-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px 4px;border-bottom:1px solid #dce8f0}'+
 '#'+ID+' .cfm418-row b{display:block;font:bold 13px Arial;color:#153b5c;overflow-wrap:anywhere}'+
 '#'+ID+' .cfm418-row .cfm418-party{font-weight:bold;margin:5px 0}'+
 '#'+ID+' .cfm418-row small{display:block;line-height:1.7;color:#597289;overflow-wrap:anywhere}'+
 '#'+ID+' .cfm418-row button{white-space:nowrap;background:#1262a2;color:#fff}'+
 '#'+ID+' .cfm418-foot{padding:11px 13px;border-top:1px solid #dce6f0;color:#587085}'+
 '#cfm418DashboardOpen{display:block!important;width:100%;margin-top:7px;padding:10px 12px;border:1px solid #85b3d4;border-radius:9px;background:#e9f5ff;color:#114c7c;font:bold 12px Arial;cursor:pointer}'+
 '#cfm418DialogOpen{width:100%;margin:9px 0;background:#e9f5ff!important;color:#114c7c!important}'+
 '@media(max-width:700px){#'+ID+' .cfm418-filter{grid-template-columns:repeat(2,minmax(0,1fr))}#'+ID+' .cfm418-filter label:first-child{grid-column:1/-1}#'+ID+' .cfm418-rows{max-height:50dvh}#'+ID+' .cfm418-row{grid-template-columns:minmax(0,1fr)}#'+ID+' .cfm418-row button{justify-self:start}}';
 document.head.append(style);
 byId('cfm418Close').onclick=()=>dlg.close();
 for(const n of ['cfm418Search','cfm418From','cfm418To'])byId(n).addEventListener('input',render);
 byId('cfm418Clear').onclick=()=>{for(const n of ['cfm418Search','cfm418From','cfm418To'])byId(n).value='';render()};
 byId('cfm418Refresh').onclick=refresh;
 byId('cfmBillPendingToggle').onclick=()=>{const panel=byId('cfmBillPendingRows');panel.hidden=!panel.hidden;if(!panel.hidden)renderBillPending()};
 byId('cfm418Rows').addEventListener('click',event=>{
  const b=event.target.closest('button[data-cfm418-id]');if(!b)return;
  const slip=rows.find(x=>str(x.id)===b.dataset.cfm418Id);
  if(!slip){byId('cfm418Status').textContent='Slip not found; press Refresh Cloud.';return}
  const printer=window.CFM_PACK_COMBINED_V407?.open;
  if(typeof printer!=='function'){byId('cfm418Status').textContent='Packing print module unavailable. Reopen ERP online.';return}
  const order=pending.find(x=>str(x.workNo)===str(slip.workNo))||{};
  if(b.dataset.billAttachment==='yes'){
   const no=prompt('Enter verified invoice number for this shipment (print reference only):','');
   if(!no||!no.trim())return;
   const date=prompt('Enter invoice date (YYYY-MM-DD), or leave blank:','');
   if(date===null)return;
   if(date.trim()&&!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())){alert('Use YYYY-MM-DD for Bill Date');return}
   printer(slip,{workOrder:order,billAttachment:{billNo:no.trim(),billDate:date.trim()}});
  }else printer(slip,{workOrder:order});
 });
 return dlg;
}
function renderBillPending(){
 const panel=byId('cfmBillPendingRows');if(!panel||panel.hidden)return;
 const calc=window.CFM_BILL_DISPATCH_LEDGER?.summarize;
 if(!calc){panel.textContent='Balance module unavailable. Reopen online.';return}
 const relevant=pending.filter(o=>str(o.billNo)||['DONE','BILLED','COMPLETED'].includes(str(o.billStatus).toUpperCase())||rows.some(s=>str(s.workNo)===str(o.workNo)||(s.items||[]).some(i=>str(i.workNo)===str(o.workNo))));
 const output=[];
 for(const o of relevant){
  try{
   const a=calc(o,rows);
   if(a.balanceQty===0&&!a.needsLegacyReview)continue;
   const review=a.needsLegacyReview||str(o.status).toUpperCase()==='DISPATCHED'||!!o.dispatchDoneAt;
   output.push('<div style="padding:7px;border-bottom:1px solid #ddd"><b>'+esc(o.workNo)+' · '+esc(o.party)+'</b><br>Bill: '+esc(o.billNo||o.billStatus||'Not recorded')+' · Order: '+a.orderQty+' · Recorded sent: '+a.confirmedDispatchQty+' · '+(review?'Balance requires verification':'Order balance: '+a.balanceQty)+'</div>');
  }catch(e){output.push('<div style="padding:7px">'+esc(o.workNo)+' · Verify dispatch ledger: '+esc(e.message)+'</div>')}
 }
 panel.innerHTML='<p>Read-only order balance from saved Cloud packing slips. Bill quantity is not inferred. Older or closed orders may need physical reconciliation.</p>'+(output.join('')||'No matching pending records.');
}
function render(){
 renderBillPending();
 const q=str(byId('cfm418Search')?.value).toLowerCase();
 const from=str(byId('cfm418From')?.value),to=str(byId('cfm418To')?.value);
 const visible=rows.filter(x=>{
  const date=localDate(x.createdAt);
  if(from&&(!date||date<from))return false;
  if(to&&(!date||date>to))return false;
  if(!q)return true;
  const works=Array.isArray(x.items)?x.items.map(y=>[y.workNo,y.poNo,y.description].join(' ')).join(' '):'';
  return [x.slipNo,x.party,x.workNo,x.poNo,x.efpplCode,x.description,works].join(' ').toLowerCase().includes(q);
 });
 byId('cfm418Status').textContent=(loading?'Refreshing... · ':'')+visible.length+' shown / '+countText(rows.length)+' in Live Cloud';
 byId('cfm418Rows').innerHTML=visible.length?visible.map(x=>{
  const works=(Array.isArray(x.items)?x.items.map(i=>str(i.workNo)).filter(Boolean).join(', '):str(x.workNo))||'—';
  const po=(Array.isArray(x.items)?[...new Set(x.items.map(i=>str(i.poNo)).filter(Boolean))].join(', '):str(x.poNo))||'—';
  const bundles=qty(x.bundleCount||x.packages||1);
  return '<article class="cfm418-row"><div><b>'+esc(label(x.slipNo))+'</b>'+
   '<div class="cfm418-party">'+esc(label(x.party))+'</div>'+
   '<small>Saved: '+esc(localTime(x.createdAt))+' · Work Order: '+esc(works)+'</small>'+
   '<small>PO: '+esc(po)+' · Dispatch Qty: '+esc(qty(x.thisDispatched))+' · Bundles: '+esc(bundles)+'</small></div>'+
   '<button type="button" data-cfm418-id="'+esc(x.id)+'">🖨 Reprint Slip + Labels</button><button type="button" data-cfm418-id="'+esc(x.id)+'" data-bill-attachment="yes">Bill Attachment</button></article>';
 }).join(''):'<p style="padding:18px 0">No Packing Slips match these filters.</p>';
}
async function refresh(){
 if(loading)return;
 loading=true;
 const dlg=makeDialog();
 byId('cfm418Status').textContent='Checking Live Cloud saved Packing Slips…';
 try{
  if(typeof cloudFetch!=='function')throw Error('Cloud connection not available');
  const snap=await cloudFetch();
  if(!snap||!Array.isArray(snap.payload?.packingSlips))throw Error('Invalid Cloud history response');
  rows=[...snap.payload.packingSlips].sort((a,b)=>str(b.createdAt).localeCompare(str(a.createdAt)));
  pending=Array.isArray(snap.payload.pending)?snap.payload.pending:[];
 }catch(e){rows=[];pending=[];byId('cfmBillPendingRows').hidden=true;byId('cfm418Status').textContent='Cloud not available: '+String(e.message||e);byId('cfm418Rows').textContent='No changes were made to ERP data.';loading=false;return}
 loading=false;
 render();
}
function open(){
 const dlg=makeDialog();
 if(!dlg.open)dlg.showModal();
 refresh();
}
function mount(){
 const normal=byId('packSlipOpen');
 if(normal&&!byId('cfm418DashboardOpen')){
  const b=document.createElement('button');b.type='button';b.id='cfm418DashboardOpen';b.textContent='📚 All Packing Slip History';b.onclick=open;
  (byId('packSlipTop')||normal.parentElement).append(b);
 }
 const dialog=byId('packSlipDialog');
 if(dialog&&!byId('cfm418DialogOpen')){
  const b=document.createElement('button');b.type='button';b.id='cfm418DialogOpen';b.textContent='📚 View All Saved Packing Slips';b.onclick=open;
  (byId('packSlipReload')?.parentElement||dialog.querySelector('.pbody')||dialog).append(b);
 }
}
function init(){
 mount();
 let attempts=0;
 const timer=setInterval(()=>{mount();if(++attempts>120)clearInterval(timer)},500);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.CFM_PACK_ALL_HISTORY_V418=Object.freeze({open,refresh});
})();