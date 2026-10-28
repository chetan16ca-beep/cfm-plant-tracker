(()=>{
"use strict";
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const normalize=v=>String(v??"").trim().replace(/\s+/g," ").toUpperCase();
const party=$("woParty"),sel=$("legacyWorkSelect"),preview=$("legacyMeasurePreview"),status=$("legacyStatus"),copy=$("copyLegacyMeasurement"),list=$("legacyPartyList");
if(!party||!sel||!preview||!copy||!list)return;
let catalogue={parties:[],orders:[]},loaded=false,lastParty="";
function tell(value,isError=false){status.textContent=value;status.style.color=isError?"#a72e32":"#4b657b"}
function showMeasurements(){
 const order=catalogue.orders.find(o=>o.workNo===sel.value);
 if(!order){preview.textContent=loaded?"Choose an old Work Order to view its previous cutting measurements.":"Old ERP measurements loading…";copy.disabled=true;copy.checked=false;return}
 const a=Array.isArray(order.measurements)?order.measurements:[];
 preview.innerHTML='<div><strong>OLD '+esc(order.workNo)+'</strong> • '+esc(order.party)+'</div><p>'+esc(order.description||"Product description not recorded")+'</p>'+
  '<div><b>Old quality:</b> '+esc(order.cloth||"-")+' • <b>Old width:</b> '+esc(order.width||"-")+'″ • <b>Previous sizes:</b> '+a.length+'</div>'+
  (a.length?'<div class="legacy-measure-grid">'+a.map((m,i)=>'<div><b>'+(i+1)+'. L '+esc(m.length)+'″ × W '+esc(m.width)+'″</b>'+(m.part?'<small>'+esc(m.part)+'</small>':'')+'</div>').join("")+'</div>':'<p>Is work order ke liye old cutting L × W records available nahi hain. Product specification phir bhi use kar sakte hain.</p>')+
  '<p class="hint">Source: Historical Cutting Register — reference only, verify dimensions and allowances with current requirement.</p>';
 copy.disabled=!a.length;copy.checked=Boolean(a.length);
}
function setOldWorkOrders(){
 const value=normalize(party.value);
 const current=sel.value;
 const matched=catalogue.orders.filter(x=>normalize(x.party)===value);
 sel.innerHTML='<option value="">'+(matched.length?"Select matching old Work Order / product":"No previous work orders for this party")+'</option>'+
  matched.map(o=>'<option value="'+esc(o.workNo)+'">'+esc(o.workNo)+' • '+esc(o.description||"No description")+' • '+(o.measurements?.length||0)+' old sizes</option>').join("");
 if(matched.some(x=>x.workNo===current)&&value===lastParty)sel.value=current;
 lastParty=value;
 showMeasurements();
 tell(loaded?(matched.length?matched.length+" previous Work Orders found for "+party.value:"Party available. No previous Work Orders found."):"Loading old references…");
}
function applyReference(){
 const o=catalogue.orders.find(x=>x.workNo===sel.value);
 if(!o){showMeasurements();return}
 if(normalize(party.value)!==normalize(o.party)){
  sel.value="";
  showMeasurements();
  tell("Party and old Work Order must match.",true);
  return;
 }
 if(o.description)$("productName").value=o.description;
 if(o.code)$("productCode").value=o.code;
 if(o.cloth)$("orderCloth").value=o.cloth;
 if(o.width)$("orderWidth").value=o.width;
 // Do not copy old quantity or old PO: the next production order can differ.
 showMeasurements();
 tell("OLD "+o.workNo+" reference selected. Product and cloth filled; verify measurement before Save.");
}
function fillPartyList(){
 const values=new Map();
 const add=x=>{const k=normalize(x);if(k&&!values.has(k))values.set(k,String(x).trim())};
 for(const p of catalogue.parties)add(p);
 for(const p of catalogue.orders)add(p.party);
 try{for(const o of(window.eagleV3?.getState?.().orders||[]))add(o.party)}catch(_){}
 list.replaceChildren(...[...values.values()].sort((a,b)=>a.localeCompare(b)).map(x=>{const option=document.createElement("option");option.value=x;return option}));
 const poInput=document.querySelector('#poForm [name="party"]');
 if(poInput)poInput.setAttribute("list","legacyPartyList");
}
async function reload(){
 const app=window.eagleV3;
 if(!app?.loadLegacy){tell("Open NEW ERP with your private link.",true);return}
 const btn=$("refreshLegacyRefs");
 if(btn)btn.disabled=true;
 tell("Reading OLD CFM party and cutting measurements (read-only)…");
 try{
  const raw=await app.loadLegacy();
  catalogue=raw;loaded=true;
  fillPartyList();setOldWorkOrders();
  tell("OLD ERP connected: "+catalogue.parties.length+" parties • "+catalogue.orders.length+" reference Work Orders. Select a party.");
 }catch(e){tell("Old ERP references unavailable: "+(e.message||e)+". You can still make a new Work Order manually.",true)}
 finally{if(btn)btn.disabled=false}
}
party.addEventListener("input",setOldWorkOrders);
party.addEventListener("change",setOldWorkOrders);
sel.addEventListener("change",applyReference);
$("refreshLegacyRefs")?.addEventListener("click",reload);
$("orderForm")?.addEventListener("reset",()=>queueMicrotask(()=>{sel.value="";setOldWorkOrders()}));
document.addEventListener("eagle:state",()=>{if(loaded)fillPartyList()});
if(window.eagleV3?.loadLegacy)reload();else document.addEventListener("eagle:ready",reload,{once:true});
})();
