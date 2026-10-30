/* CFM Smart Production Command Center V203. READ ONLY.
   Never writes Cloud/Stock/Cutting/Work Order data. */
(function(){
'use strict';
const ID='cfmCommandCenter203', STAGES=['CUTTING','STITCHING','THREAD CUT','GUN FINISH','PACKING'];
let active=false,cache=null,filter='all',query='',ticker=null;
const byId=x=>document.getElementById(x);
const str=x=>String(x==null?'':x);
const safe=x=>str(x).replace(/[&<>"']/g,function(a){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[a]});
const norm=x=>str(x).trim().toUpperCase();
const num=x=>Number.isFinite(Number(x))?Number(x):0;
const iso=x=>{let s=str(x).trim();if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);let m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);return m?m[3]+'-'+m[2]+'-'+m[1]:''};
function day(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
// Honor the existing dashboard-only exclusion: CFM-579 through CFM-665 are not
// shown in the No-Cutting backlog, but remain in All Work Orders and the database.
function legacyNoCutHidden(w){const m=/^CFM-(\d+)$/i.exec(str(w).trim());return Boolean(m&&Number(m[1])>=579&&Number(m[1])<=665)}
function snapshot(){
 if(typeof state==='undefined')return null;
 const orders=Array.isArray(state.pending)?state.pending:[],cuts=Array.isArray(state.cutting)?state.cutting:[],
  store=Array.isArray(state.store)?state.store:[],departments=Array.isArray(state.departmentWork)?state.departmentWork:[];
 const cutWorks=new Set(cuts.map(x=>norm(x.workNo)).filter(Boolean));
 const unique=new Map();
 for(const r of orders){
  if(!r.workNo||/^(true|1|yes)$/i.test(str(r.archived)))continue;
  if(!unique.has(norm(r.workNo)))unique.set(norm(r.workNo),r);
 }
 const all=[...unique.values()];
 const stockPending=cuts.filter(x=>x._redPenPendingStock===true||x._redPenPendingStock==='true');
 const pendingWorks=new Set(stockPending.map(x=>norm(x.workNo)).filter(Boolean));
 const shortWorks=new Set(stockPending.filter(x=>/INSUFFICIENT|SHORTAGE|SHORT/i.test(str(x._stockCalcMode||x._stockPendingReason))).map(x=>norm(x.workNo)).filter(Boolean));
 const srlSet=new Set(store.map(x=>norm(x.srlNo)).filter(Boolean));
 const missingRolls=new Set(stockPending.map(x=>norm(x.srlNo)).filter(x=>x&&!srlSet.has(x)));
 const rows=all.map(r=>{
  const work=norm(r.workNo),date=iso(r.deliveryDate||r.dueDate||r.dispatchDate),priority=norm(r.priority||'NORMAL');
  return {work,party:str(r.party),item:str(r.description||r.item||r.itemCode),
   qty:str(r.orderQty),cut:str(r.cutQty),priority,date,hasCut:cutWorks.has(work),
   stockPending:pendingWorks.has(work),shortage:shortWorks.has(work),
   urgent:/URGENT|HIGH|CRITICAL/.test(priority)||Boolean(date&&date<=day())};
 });
 const dept=new Map(STAGES.map(x=>[x,{stage:x,entries:0,workNos:new Set()}]));
 for(const r of departments){
  const d=norm(r.process||r.department||r.stage).replace(/[_-]/g,' ');
  const st=/CUT/.test(d)?'CUTTING':/STITCH/.test(d)?'STITCHING':/THREAD/.test(d)?'THREAD CUT':/GUN|FINISH/.test(d)?'GUN FINISH':/PACK/.test(d)?'PACKING':'';
  if(!st)continue;
  const el=dept.get(st);el.entries++;if(r.workNo)el.workNos.add(norm(r.workNo));
 }
 const rollRows=store.map(r=>{
  const known=(r.excelLiveBalanceMtr!=null&&r.excelLiveBalanceMtr!=='')||(r.openingMtr!=null&&r.openingMtr!=='');
  let balance=null;
  if(known){
   try{const m=typeof srlBalance==='function'?srlBalance(r):num(r.excelLiveBalanceMtr??r.openingMtr);if(Number.isFinite(Number(m)))balance=Number(m)}
   catch(err){}
  }
  return {srl:str(r.srlNo),cloth:str(r.quality||r.cloth),width:str(r.width),balance};
 });
 const urgent=rows.filter(r=>r.urgent),noCut=rows.filter(r=>!r.hasCut&&!legacyNoCutHidden(r.work));
 return {orders:rows,all:rows.length,urgent,noCut:noCut.length,
  stockPending:pendingWorks.size,shortage:shortWorks.size,missingRolls:missingRolls.size,
  noDue:rows.filter(r=>!r.date).length,dept:[...dept.values()],rollRows,
  low:rollRows.filter(r=>r.balance!==null&&r.balance>0&&r.balance<10).length,
  empty:rollRows.filter(r=>r.balance!==null&&r.balance<=0).length,
  available:rollRows.filter(r=>r.balance!==null&&r.balance>0).length,
  unknown:rollRows.filter(r=>r.balance===null).length,
  connected:typeof cloudReady!=='undefined'&&cloudReady===true,
  version:typeof cloudVersion!=='undefined'?cloudVersion:'?',
  cloudDate:typeof cloudUpdatedAt!=='undefined'?cloudUpdatedAt:'',
  localSpecial:rows.filter(r=>/^CFM-72[345]$/.test(r.work)),
  timestamp:new Date().toLocaleString('en-IN')};
}
function mount(){
 if(byId(ID))return;
 const style=document.createElement('style');style.id='cfmCommandCenterCSS203';
 style.textContent=
 '#'+ID+'{position:fixed;inset:0;overflow:auto;z-index:200000;background:#eef3f8;color:#19374c;font:14px system-ui,Arial;box-sizing:border-box}'+
 '#'+ID+'[hidden]{display:none!important}#'+ID+' *{box-sizing:border-box}'+
 '#'+ID+' .wrap{max-width:1550px;margin:auto;padding:20px 22px 40px}'+
 '#'+ID+' .top{display:flex;justify-content:space-between;align-items:start;gap:16px;flex-wrap:wrap}'+
 '#'+ID+' h1{font-size:25px;color:#154c73;margin:0 0 6px}'+
 '#'+ID+' h2{font-size:17px;color:#164e77;margin:0 0 11px}'+
 '#'+ID+' p{font-size:12px;color:#657b8a;margin:6px 0 0;line-height:1.5}'+
 '#'+ID+' button{border:1px solid #bad4e4;background:#fff;color:#205778;border-radius:9px;padding:10px 12px;font:bold 13px system-ui;cursor:pointer}'+
 '#'+ID+' button:focus-visible{outline:3px solid #2181bb;outline-offset:2px}'+
 '#'+ID+' button[data-action=close],#'+ID+' button[aria-pressed=true]{background:#166391;color:#fff;border-color:#166391}'+
 '#'+ID+' .actions{display:flex;gap:7px;flex-wrap:wrap}'+
 '#'+ID+' .status{padding:13px;background:#e5f6ef;border:1px solid #b2dacc;border-radius:11px;margin:14px 0}'+
 '#'+ID+' .status.warn{background:#fff2e9;border-color:#e1b28b;color:#804523}'+
 '#'+ID+' .status strong{display:block}#'+ID+' .status small{display:block;font-size:11px;margin-top:5px}'+
 '#'+ID+' .numbers{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:9px;margin:14px 0}'+
 '#'+ID+' .metric{border:1px solid #d7e5ed;background:#fff;border-radius:12px;padding:13px;min-width:0}'+
 '#'+ID+' .metric b{font-size:27px;color:#166397;display:block;line-height:1.15}'+
 '#'+ID+' .metric span{font-size:11px;color:#617b88;display:block;margin-top:5px}'+
 '#'+ID+' .metric.alert b{color:#b85d22}'+
 '#'+ID+' .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:13px 0}'+
 '#'+ID+' .panel{background:#fff;border:1px solid #d3e3ee;border-radius:12px;padding:14px;min-width:0}'+
 '#'+ID+' .stages{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}'+
 '#'+ID+' .stage{background:#eef7fb;border-radius:10px;padding:11px 9px}'+
 '#'+ID+' .stage b{display:block;font-size:12px;margin:3px 0}#'+ID+' .stage small{font-size:11px;color:#607a89}'+
 '#'+ID+' .scroll{overflow:auto;max-height:340px;border:1px solid #e1ebf1;border-radius:8px}'+
 '#'+ID+' table{border-collapse:collapse;min-width:710px;width:100%;font-size:12px}'+
 '#'+ID+' th,#'+ID+' td{border-bottom:1px solid #e6eef3;padding:9px;text-align:left;vertical-align:top}'+
 '#'+ID+' th{position:sticky;top:0;background:#edf5fb;color:#315b78;z-index:1}'+
 '#'+ID+' .filters{display:flex;align-items:center;justify-content:space-between;gap:9px;flex-wrap:wrap;margin:10px 0}'+
 '#'+ID+' input{border:1px solid #bad3e2;border-radius:9px;padding:11px;min-width:260px}'+
 '#'+ID+' .tags{display:flex;gap:6px;flex-wrap:wrap}'+
 '#'+ID+' .red{color:#a83b24;font-weight:bold}#'+ID+' .hint{color:#536f81;font-size:12px}'+
 '@media(max-width:1150px){#'+ID+' .numbers{grid-template-columns:repeat(3,minmax(0,1fr))}}'+
 '@media(max-width:740px){#'+ID+' .wrap{padding:12px}#'+ID+' h1{font-size:20px}#'+ID+' .numbers{grid-template-columns:repeat(2,minmax(0,1fr))}#'+ID+' .grid{grid-template-columns:1fr}#'+ID+' .stages{grid-template-columns:repeat(2,minmax(0,1fr))}#'+ID+' input{width:100%}}'+
 '@media print{#'+ID+'{position:static;overflow:visible}#'+ID+' .actions,#'+ID+' .filters{display:none}#'+ID+' .scroll{max-height:unset;overflow:visible}}';
 document.head.appendChild(style);
 const box=document.createElement('section');box.id=ID;box.hidden=true;box.setAttribute('aria-label','CFM Smart Production Command Center');
 box.innerHTML='<div class="wrap"><div class="top"><div><h1>🏭 CFM Smart Production Command Center</h1>'+
  '<p>All Work Orders • Department Activity • Cloth Shortage • Urgent Delivery • Live SRL Stock</p></div>'+
  '<div class="actions"><button data-action="backup">⬇ Save PC Data</button><button data-action="refresh">↻ Refresh</button><button data-action="print">🖨 Print</button><button data-action="close">✕ Close</button></div></div>'+
  '<div id="cfmCCStatus203" class="status"></div><div id="cfmCCNumbers203" class="numbers"></div>'+
  '<div class="grid"><div class="panel"><h2>👷 Department Load / Activity</h2><div class="stages" id="cfmCCStages203"></div>'+
  '<p>Only recorded department activity is counted. Unrecorded Stitching / Packing is not assumed completed. CFM-579 to 665 are excluded from the No-Cutting backlog by request.</p></div>'+
  '<div class="panel"><h2>⚠️ Cloth Shortage & Stock Attention</h2><div id="cfmCCShortage203"></div></div>'+
  '<div class="panel"><h2>🚚 Urgent Deliveries</h2><div id="cfmCCUrgent203"></div></div>'+
  '<div class="panel"><h2>📦 SRL Stock (read-only)</h2><div class="scroll" id="cfmCCStock203"></div>'+
  '<p>Uses current ERP roll-balance calculation; actual physical MTR may differ.</p></div></div>'+
  '<div class="panel"><h2>📋 All Work Orders</h2><div class="filters"><input type="search" id="cfmCCSearch203" placeholder="Find Work No. / party / item" />'+
  '<div class="tags"><button data-filter="all" aria-pressed="true">All</button><button data-filter="urgent">Urgent</button>'+
  '<button data-filter="stock">Stock Pending</button><button data-filter="uncut">No Cutting Entry</button></div></div>'+
  '<div class="scroll"><table><thead><tr><th>Work No.</th><th>Party / Item</th><th>Order Qty</th><th>Cut Qty</th><th>Priority / Due</th><th>Cutting / Stock</th></tr></thead>'+
  '<tbody id="cfmCCWorkRows203"></tbody></table></div><p id="cfmCCFoot203"></p></div></div>';
 document.body.appendChild(box);
 box.addEventListener('click',function(ev){
  const b=ev.target.closest('button');if(!b)return;
  if(b.dataset.filter){filter=b.dataset.filter;drawRows();return}
  switch(b.dataset.action){
   case 'close':close();break;
   case 'refresh':refresh();break;
   case 'print':window.print();break;
   case 'backup':{
    const f=window.parent&&window.parent.cfmDownloadBackup;
    if(typeof f==='function')f();else alert('Backup export unavailable. Use ERP Save PC Data.');
    break;
   }
  }
 });
 byId('cfmCCSearch203').addEventListener('input',function(ev){query=ev.target.value;drawRows()});
 addLauncher();
}
function addLauncher(){
 const d=byId('view-dashboard');
 if(!d||byId('cfmCommandLaunch203'))return;
 const btn=document.createElement('button');btn.id='cfmCommandLaunch203';btn.type='button';
 btn.textContent='🏭 Open Smart Production Command Center';
 btn.style.cssText='display:block;width:100%;padding:15px;margin:5px 0 14px;border:2px solid #8cbedc;border-radius:12px;background:#e9f7ff;color:#134f7e;text-align:center;cursor:pointer;font:bold 15px system-ui';
 btn.addEventListener('click',open);
 const h=d.querySelector('.section-head');if(h)h.after(btn);else d.prepend(btn);
}
function open(){mount();active=true;byId(ID).hidden=false;refresh();byId(ID).scrollTop=0}
function close(){active=false;if(byId(ID))byId(ID).hidden=true}
function metric(count,title,alert){return '<div class="metric'+(alert?' alert':'')+'"><b>'+safe(count)+'</b><span>'+safe(title)+'</span></div>'}
function drawRows(){
 if(!cache)return;
 const q=query.trim().toLowerCase();let list=cache.orders.filter(r=>{
  if(filter==='urgent'&&!r.urgent)return false;
  if(filter==='stock'&&!r.stockPending)return false;
  if(filter==='uncut'&&(r.hasCut||legacyNoCutHidden(r.work)))return false;
  return (r.work+' '+r.party+' '+r.item).toLowerCase().includes(q);
 });
 list.sort((a,b)=>Number(b.urgent)-Number(a.urgent)||Number(b.stockPending)-Number(a.stockPending)||
  a.work.localeCompare(b.work,undefined,{numeric:true}));
 byId(ID).querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));
 byId('cfmCCWorkRows203').innerHTML=list.length?list.map(r=>
  '<tr><td><b>'+safe(r.work)+'</b></td><td><b>'+safe(r.party)+'</b><br>'+safe(r.item)+'</td>'+
  '<td>'+safe(r.qty||'—')+'</td><td>'+safe(r.cut||'0')+'</td>'+
  '<td>'+safe(r.priority)+(r.urgent?' <span class="red">URGENT</span>':'')+'<br>'+safe(r.date||'No date')+'</td>'+
  '<td>'+(r.hasCut?'Cutting entry saved':'No Cutting Entry')+
  (r.stockPending?'<br><span class="red">'+(r.shortage?'Stock insufficient':'Stock verification pending')+'</span>':'')+'</td></tr>'
 ).join(''):'<tr><td colspan="6">No matching Work Orders.</td></tr>';
 byId('cfmCCFoot203').textContent='Showing '+list.length+' of '+cache.all+' • Device ERP data • '+cache.timestamp+
  ' • Cloud updates appear only when existing ERP Cloud Sync is connected.';
}
function refresh(){
 mount();const d=snapshot();if(!d)return;cache=d;
 const st=byId('cfmCCStatus203');st.className='status'+(d.connected?'':' warn');
 let cloudAt='Not confirmed';if(d.cloudDate){const ts=new Date(d.cloudDate);if(!Number.isNaN(ts.getTime()))cloudAt=ts.toLocaleString('en-IN')}
 st.innerHTML='<strong>'+(d.connected?'☁️ Cloud Connected — ERP sync active':'⚠️ Local Data — Cloud Sync Paused')+
  '</strong><small>Cloud snapshot v'+safe(d.version)+' · Last Cloud Update: '+safe(cloudAt)+
  (d.localSpecial.length?' · PC orders: '+safe(d.localSpecial.map(x=>x.work).join(', ')):'')+
  (d.connected?'':' · Do not clear PC browser data until backup is saved.')+
  '</small><small>Read-only • '+safe(d.timestamp)+'</small>';
 byId('cfmCCNumbers203').innerHTML=metric(d.all,'Work Orders')+metric(d.noCut,'No Cutting Entry (filtered)')+
  metric(d.stockPending,'Stock Reconciliation Pending',d.stockPending>0)+
  metric(d.shortage,'Work Orders with Insufficient Stock',d.shortage>0)+
  metric(d.urgent.length,'Urgent / Overdue Deliveries',d.urgent.length>0)+
  metric(d.available,'SRL Rolls with Positive Balance');
 const emoji=['✂️','🧵','🪡','🔧','📦'];
 byId('cfmCCStages203').innerHTML=d.dept.map((x,i)=>
  '<div class="stage"><span>'+emoji[i]+'</span><b>'+safe(x.stage)+'</b><small>'+
  (x.entries?x.entries+' entries / '+x.workNos.size+' Work Nos':'No stage records')+
  '</small></div>').join('')+
  '<div class="stage"><b>📋 Cutting Register backlog</b><small>'+d.noCut+' Work Orders without Cutting Entry</small></div>';
 byId('cfmCCShortage203').innerHTML='<p><b>'+d.shortage+'</b> work orders flagged as stock insufficient</p>'+
  '<p><b>'+d.stockPending+'</b> work orders with stock reconciliation pending</p>'+
  '<p><b>'+d.missingRolls+'</b> SRLs referenced in pending cutting but missing in Store</p>'+
  '<p><b>'+d.low+'</b> SRL rolls with recorded balance under 10 MTR</p>'+
  '<p><b>'+d.empty+'</b> SRL rolls with recorded zero balance</p>'+
  '<p>Missing meter is not treated as zero stock.</p>';
 byId('cfmCCUrgent203').innerHTML=d.urgent.length?
  '<ul>'+d.urgent.slice(0,16).map(r=>'<li><b>'+safe(r.work)+'</b> — '+safe(r.party)+' • '+safe(r.priority)+
  ' • '+safe(r.date||'No due date')+'</li>').join('')+'</ul>':
  '<p>No currently marked urgent or dated overdue Work Orders.</p>';
 byId('cfmCCUrgent203').innerHTML+='<p>'+d.noDue+' Work Orders have no delivery date; overdue status cannot be calculated for those.</p>';
 const stocks=d.rollRows.slice().sort((a,b)=>(a.balance===null?1:0)-(b.balance===null?1:0)||
  (a.balance===null?0:a.balance)-(b.balance===null?0:b.balance)).slice(0,50);
 byId('cfmCCStock203').innerHTML='<table><thead><tr><th>SRL</th><th>Cloth</th><th>Width</th><th>MTR</th></tr></thead><tbody>'+
  stocks.map(r=>'<tr><td>'+safe(r.srl)+'</td><td>'+safe(r.cloth)+'</td><td>'+safe(r.width)+'″</td><td>'+
  safe(r.balance===null?'MTR missing':r.balance.toFixed(3))+'</td></tr>').join('')+'</tbody></table>';
 drawRows();
}
function start(){
 mount();
 if(!ticker)ticker=setInterval(function(){try{addLauncher();if(active)refresh()}catch(err){console.warn('CFM Command Center',err)}},12000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.cfmOpenProductionCommandCenter=open;
})();