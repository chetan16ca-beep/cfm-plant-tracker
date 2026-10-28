(()=>{
'use strict';
const CLOUD_URL="https://soluxixriexliipfnznc.supabase.co", ANON="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvbHV4aXhyaWV4bGlpcGZuem5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NTM3OTgsImV4cCI6MjEwNjEyOTc5OH0.Jnk36EO3AYNBXufFuMr2zotXEIDYIOM2NVwPkuhTDa0", ACCESS="EAGLE-CFM-28";
const el=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const digits=s=>Number(String(s||'').match(/(\d+)$/)?.[1]||0);
const val=n=>Number.isFinite(Number(n))?Number(n):0;
const normal=s=>String(s??'').trim().toUpperCase();
const all=[];const selected=new Set();let loading=false,updated='';
const dateToday=()=>{const d=new Date(),x=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+x(d.getMonth()+1)+'-'+x(d.getDate())};
el('day').value=dateToday();
function status(msg,error=false){el('status').textContent=msg;el('status').classList.toggle('error',error)}
function openOrder(o){return !o.archived&&normal(o.status)!=='ARCHIVED'&&!o.cutEntryPending&&(!Number.isFinite(Number(o.orderQty))||Number(o.orderQty)<=0||val(o.orderQty)>val(o.cutQty));}
function sorted(){return all.slice().sort((a,b)=>digits(a.workNo)-digits(b.workNo))}
function visible(){const q=normal(el('search').value);return sorted().filter(o=>(!el('onlyOpen').checked||openOrder(o))&&(!q||[o.workNo,o.party,o.poNo,o.description,o.cloth,o.itemCode].some(x=>normal(x).includes(q))))}
function fmt(n){return Number.isFinite(Number(n))?Number(n).toLocaleString('en-IN',{maximumFractionDigits:2}):'-'}
function renderChoices(){
 const records=visible();el('count').textContent=records.length+' matching of '+all.length+' cloud orders • '+selected.size+' selected for print';
 el('orders').replaceChildren();
 const fragment=document.createDocumentFragment();
 records.forEach(o=>{
  const label=document.createElement('label');label.className='choice';
  const box=document.createElement('input');box.type='checkbox';box.checked=selected.has(o.workNo);
  box.onchange=()=>{if(box.checked)selected.add(o.workNo);else selected.delete(o.workNo);renderChoices();renderPages()};
  const info=document.createElement('span');
  const b=document.createElement('b');b.textContent=String(o.workNo||'No Work No')+' • '+String(o.party||'');
  const note=document.createElement('small');note.textContent=String(o.description||'')+' | PO '+String(o.poNo||'—')+' | Pending '+fmt(Math.max(0,val(o.orderQty)-val(o.cutQty)));
  info.append(b,note);label.append(box,info);fragment.appendChild(label);
 });
 if(!records.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='No matching Work Orders. Check filter or refresh cloud.';fragment.append(empty);}
 el('orders').append(fragment);
}
function workHtml(o){
 const qty=val(o.orderQty),prior=val(o.cutQty),remaining=Math.max(0,qty-prior);
 return '<article class="work"><div class="worktop"><span>WORK ORDER: '+esc(o.workNo||'—')+'</span><span>DATE: '+esc(el('day').value)+'</span></div>'+
 '<div class="workmeta">PARTY: '+esc(o.party||'—')+' | PO: '+esc(o.poNo||'—')+
 '<br>ITEM: '+esc(o.description||'—')+
 '<br>CLOTH: '+esc(o.cloth||'—')+' | WIDTH: '+esc(o.width??'—')+' inch</div>'+
 '<div class="workqty"><span>ORDER: '+esc(fmt(qty))+'</span><span>PREVIOUS CUT: '+esc(fmt(prior))+'</span><span>TODAY CUT: ______</span><span>PENDING: '+esc(fmt(remaining))+'</span></div>'+
 '<table><thead><tr><th>Serial No.</th><th>Part</th><th>Length (inch)</th><th>Width (inch)</th><th>Cut Qty</th></tr></thead><tbody>'+
 Array.from({length:5},()=>'<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>').join('')+'</tbody></table>'+
 '<div class="worknote">WRITE CUTTING DETAILS IN RED PEN ONLY • Actual size L × W and quantity</div></article>';
}
function renderPages(){
 const orders=sorted().filter(o=>selected.has(o.workNo));const page=el('pages');
 if(!orders.length){page.innerHTML='<p class="empty">Select Work Orders above to preview 4 orders per A4 page.</p>';return}
 page.innerHTML=Array.from({length:Math.ceil(orders.length/4)},(_,i)=>{
  const sub=orders.slice(i*4,i*4+4);
  return '<div class="sheet"><div class="sheetheader"><b>CFM PLANT • DAILY CUTTING REGISTER</b><span>'+esc(el('day').value)+' • Page '+(i+1)+'/'+Math.ceil(orders.length/4)+'</span></div>'+
  sub.map(workHtml).join('')+
  '<div class="sheetfooter">Live cloud Work Order details fetched '+esc(updated)+' • Printed values are a snapshot. Paper writing never updates ERP automatically.</div></div>';
 }).join('');
}
async function load(){
 if(loading)return;loading=true;el('reload').disabled=true;
 status('Reading current Work Orders from cloud…');
 try{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  let response;
  try{response=await fetch(CLOUD_URL+'/rest/v1/cfm_shared_state?id=eq.main&select=version%2Cupdated_at%2Cpending%3Apayload-%3Epending',
   {cache:'no-store',signal:controller.signal,headers:{apikey:ANON,Authorization:'Bearer '+ANON,'x-cfm-key':ACCESS,Accept:'application/json'}})}
  finally{clearTimeout(timer)}
  if(!response.ok)throw Error('Cloud HTTP '+response.status);
  const data=await response.json();const row=data?.[0];if(!Array.isArray(row?.pending))throw Error('Live Work Order list missing');
  all.splice(0,all.length,...row.pending);
  const existing=new Set(all.map(x=>x.workNo));for(const x of Array.from(selected))if(!existing.has(x))selected.delete(x);
  updated=row.updated_at?new Date(row.updated_at).toLocaleString('en-IN'):'unknown';
  const max=Math.max(0,...all.map(x=>digits(x.workNo)));
  status('Cloud connected • '+all.length+' Work Orders • Last CFM-'+max+' • Version '+row.version+' • Updated '+updated);
  renderChoices();renderPages();
 }catch(e){
  status('Cloud refresh failed: '+(e?.message||e)+'. Do not print old orders until connection works.',true);
  all.length=0;selected.clear();renderChoices();renderPages();
 }finally{loading=false;el('reload').disabled=false}
}
el('reload').onclick=load;
el('search').oninput=renderChoices;
el('onlyOpen').onchange=renderChoices;
el('day').onchange=renderPages;
el('all').onclick=()=>{visible().forEach(o=>selected.add(o.workNo));renderChoices();renderPages()};
el('none').onclick=()=>{selected.clear();renderChoices();renderPages()};
el('print').onclick=()=>{if(!selected.size)return alert('Select at least one Work Order before printing.');if(!all.length)return alert('Cloud data must be loaded first.');window.print()};
load();
})();