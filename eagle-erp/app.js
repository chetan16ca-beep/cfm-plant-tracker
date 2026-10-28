(()=>{
"use strict";
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const plain=v=>String(v??"").trim(),num=v=>Number(v)||0,fmt=v=>Number(num(v).toFixed(3)).toLocaleString("en-IN",{maximumFractionDigits:3});
const api="https://soluxixriexliipfnznc.supabase.co/functions/v1/eagle-v2-private";
const fragment=new URLSearchParams(location.hash.slice(1)).get("access");
if(fragment&&/^[A-Za-z0-9_-]{36,150}$/.test(fragment))localStorage.setItem("eagle_v2_private_access",fragment);
const token=fragment||localStorage.getItem("eagle_v2_private_access");
let data={orders:[],stock:[],cutting:[],products:[]},version=0,master=[],busy=false;
function message(s,bad=false){const e=$("message");e.textContent=s;e.className="status "+(bad?"bad":"ok")}
function normalized(s){const x=plain(s).toUpperCase().replace(/\s+/g,"");return /^E\d{1,4}$/.test(x)?"EFPPL03/"+x.slice(1).padStart(4,"0"):x}
function balance(r){return Math.max(0,Number((num(r.meter)-num(r.used)).toFixed(4)))}
function nextNo(){return Math.max(684,...data.orders.map(x=>num(x.no)||684))+1}
function optionList(arr){return '<option value="">Select…</option>'+arr.map(r=>'<option value="'+esc(r.value)+'">'+esc(r.label)+'</option>').join("")}
function activate(p){document.querySelectorAll(".pane").forEach(e=>e.classList.toggle("active",e.id===p));document.querySelectorAll("[data-pane]").forEach(e=>e.classList.toggle("active",e.dataset.pane===p));}
document.querySelectorAll("[data-pane]").forEach(e=>e.addEventListener("click",()=>activate(e.dataset.pane)));
if(!token){message("Private link required. No email/password needed. Use the private link given in ChatGPT.",true);$("locked").classList.remove("hidden");return;}
$("app").classList.remove("hidden");
async function call(method="GET",body=null){
 const r=await fetch(api,{method,headers:{"Content-Type":"application/json","x-eagle-access":token},body:body?JSON.stringify(body):undefined,cache:"no-store"});
 const d=await r.json().catch(()=>({error:"Invalid Cloud response"}));
 if(!r.ok||!d.ok)throw Error(d.error||"Cloud error "+r.status);
 return d;
}
async function refresh(notify=true){
 const result=await call();
 if(!result.payload||!Array.isArray(result.payload.orders)||!Array.isArray(result.payload.stock)||!Array.isArray(result.payload.cutting))throw Error("Cloud returned invalid state");
 data=result.payload;version=num(result.version);
 render();
 $("cloud").textContent="☁️ Cloud Verified • V"+version;
 $("version").textContent=result.updated_at?new Date(result.updated_at).toLocaleString("en-IN"):"";
 if(notify)message("✅ Live NEW ERP: "+data.orders.length+" Orders • "+data.stock.length+" Physical SRLs");
 return result;
}
async function save(action,entry,btn,form){
 if(busy)return;
 busy=true;if(btn)btn.disabled=true;
 try{
  message("☁️ Saving to isolated NEW Cloud…");
  await refresh(false);
  const result=await call("POST",{action,version,data:entry});
  const checked=await call();
  if(num(checked.version)!==num(result.version))throw Error("Cloud changed during verification. Refresh before trying again.");
  if(!Array.isArray(checked.payload.orders))throw Error("Unverified server data");
  data=checked.payload;version=num(checked.version);render();
  if(form)form.reset();
  message("✅ Saved and verified in NEW Cloud"+(result.created?.no?" • CFM-"+result.created.no:"")+" • V"+version);
 }catch(e){message("⚠️ "+e.message+" — check Cloud before retrying",true)}
 finally{busy=false;if(btn)btn.disabled=false}
}
function orderCard(r){return '<div class="item"><strong>CFM-'+esc(r.no)+'</strong> — '+esc(r.party)+' <span class="tag">'+esc(r.status)+'</span><div>'+esc(r.product)+'</div><div class="muted">PO '+esc(r.po||"-")+' • '+esc(r.code||"-")+' • Qty '+esc(r.qty)+' • '+esc(r.cloth||"-")+' • '+esc(r.width||"-")+'″</div></div>'}
function render(){
 const orders=data.orders.slice().sort((a,b)=>num(b.no)-num(a.no));
 $("numOrders").textContent=orders.length;$("nextWork").textContent=nextNo();
 $("numRolls").textContent=data.stock.length;$("numCuts").textContent=data.cutting.length;
 $("recent").innerHTML=orders.slice(0,5).map(orderCard).join("")||'<div class="empty">No NEW Work Orders. First is CFM-685.</div>';
 const oq=plain($("workSearch").value).toLowerCase();
 $("orderList").innerHTML=orders.filter(x=>JSON.stringify(x).toLowerCase().includes(oq)).map(r=>'<div class="item"><strong>CFM-'+esc(r.no)+'</strong> — '+esc(r.party)+' <span class="tag">'+esc(r.priority)+'</span><div>'+esc(r.product)+'</div><div class="muted">PO '+esc(r.po||"-")+' • '+esc(r.code||"-")+' • Qty '+esc(r.qty)+' • '+esc(r.cloth||"-")+' • '+esc(r.width||"-")+'″</div><div class="actions"><select data-stage-for="'+esc(r.no)+'">'+["PENDING","CUTTING","STITCHING","THREAD CUT","GUN FINISH","PACKING","READY TO DISPATCH","DISPATCHED"].map(s=>'<option '+(r.status===s?"selected":"")+'>'+s+'</option>').join("")+'</select><button class="btn alt" type="button" data-save-stage="'+esc(r.no)+'">Save Stage</button></div></div>').join("")||'<div class="empty">No matching Work Orders</div>';
 $("workSelect").innerHTML=optionList(orders.map(r=>({value:r.no,label:"CFM-"+r.no+" • "+r.party})));
 const sq=plain($("stockSearch").value).toLowerCase();
 $("stockList").innerHTML=data.stock.filter(s=>JSON.stringify(s).toLowerCase().includes(sq)).sort((a,b)=>String(a.srl).localeCompare(String(b.srl))).map(s=>'<div class="item"><strong>'+esc(s.srl)+'</strong> • '+esc(s.cloth||"-")+'<div class="muted">Width '+esc(s.width)+'″ • '+(s.meter===null?'Meter not recorded':('Physical '+fmt(s.meter)+' MTR • Used '+fmt(s.used)+' MTR'))+'</div><div><span class="tag">'+(s.meter===null?'Meter verification pending':('Balance '+fmt(balance(s))+' MTR'))+'</span></div><div class="muted">'+esc(s.source||"Physical Stock")+'</div></div>').join("")||'<div class="empty">No matching Physical Stock</div>';
 $("srlSelect").innerHTML=optionList(data.stock.filter(s=>balance(s)>0).map(s=>({value:s.srl,label:s.srl+" • "+s.cloth+" • "+fmt(balance(s))+" MTR"})));
 $("cutList").innerHTML=data.cutting.slice().reverse().slice(0,60).map(r=>'<div class="item"><strong>CFM-'+esc(r.work)+'</strong> • '+esc(r.srl)+'<div>'+esc(r.part||"CUTTING")+' • '+esc(r.length)+' × '+esc(r.width)+' × '+esc(r.qty)+' • Layer '+esc(r.layer)+'</div><div class="muted">Used '+fmt(r.meters)+' MTR • '+esc(r.createdAt||"")+'</div></div>').join("")||'<div class="empty">No Cutting Entries</div>';
 preview();
}
function preview(){
 const d=Object.fromEntries(new FormData($("cutForm")));
 const roll=data.stock.find(x=>x.srl===d.srl);
 if(!roll||!num(d.length)||!num(d.width)||!num(d.qty)){$("meterPreview").textContent="Choose SRL and enter Length × Width × Qty.";return;}
 const m=Number((num(d.length)*num(d.width)*num(d.qty)*(num(d.layer)||1)/(num(roll.width)*39.37)).toFixed(4));
 $("meterPreview").textContent="Used "+fmt(m)+" MTR • Available "+fmt(balance(roll))+" MTR • After "+fmt(balance(roll)-m)+" MTR";
}
async function products(){
 try{
  const r=await fetch("./products.json?v=2",{cache:"no-store"});if(!r.ok)throw Error("Product master unavailable");
  const a=await r.json();master=Array.isArray(a)?a:[];
  $("productCount").textContent=master.length+" preserved Product Codes";
  $("codeList").innerHTML=master.map(x=>'<option value="'+esc(x.code)+'">'+esc(x.description)+'</option>').join("");
  $("productList").innerHTML=master.map(x=>'<option value="'+esc(x.description)+'">'+esc(x.code)+'</option>').join("");
  renderProducts();
 }catch(e){$("productCount").textContent=e.message}
}
function renderProducts(){
 const q=plain($("productSearch").value).toLowerCase();
 $("productResults").innerHTML=master.filter(x=>[x.code,x.description,x.category,x.cloth,x.micron].join(" ").toLowerCase().includes(q)).slice(0,70).map(r=>'<div class="item"><strong>'+esc(r.code)+'</strong> — '+esc(r.description)+'<div class="muted">'+esc(r.category||"-")+' • '+esc(r.cloth||"-")+' • '+esc(r.width||"-")+'″</div></div>').join("")||'<div class="empty">No matching codes</div>';
}
$("productCode").addEventListener("change",()=>{const r=master.find(x=>x.code===plain($("productCode").value));if(r){$("productName").value=r.description;$("orderCloth").value=r.cloth||"";$("orderWidth").value=r.width||""}});
$("productName").addEventListener("change",()=>{const r=master.find(x=>x.description.toUpperCase()===plain($("productName").value).toUpperCase());if(r){$("productCode").value=r.code;$("orderCloth").value=r.cloth||"";$("orderWidth").value=r.width||""}});
$("orderForm").addEventListener("submit",e=>{e.preventDefault();save("addOrder",Object.fromEntries(new FormData(e.target)),$("orderSave"),e.target)});
$("stockForm").addEventListener("submit",e=>{e.preventDefault();save("addStock",Object.fromEntries(new FormData(e.target)),$("stockSave"),e.target)});
$("cutForm").addEventListener("submit",e=>{e.preventDefault();save("addCutting",Object.fromEntries(new FormData(e.target)),$("cutSave"),e.target)});
$("cutForm").addEventListener("input",preview);
$("orderList").addEventListener("click",e=>{const b=e.target.closest("[data-save-stage]");if(!b)return;const no=Number(b.dataset.saveStage),stage=$('orderList').querySelector('[data-stage-for="'+no+'"]')?.value;if(stage)save("updateStage",{work:no,stage},b)});
$("refresh").addEventListener("click",()=>refresh().catch(e=>message("Cloud refresh failed: "+e.message,true)));
$("workSearch").addEventListener("input",render);
$("stockSearch").addEventListener("input",render);
$("productSearch").addEventListener("input",renderProducts);
$("downloadBackup").addEventListener("click",async()=>{
 try{await refresh(false);const blob=new Blob([JSON.stringify({newERP:true,version,data},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="EAGLE-NEW-ERP-BACKUP-"+new Date().toISOString().slice(0,10)+".json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),15000);message("✅ New ERP backup downloaded")}catch(e){message(e.message,true)}
});
Promise.all([refresh(),products()]).catch(e=>message("⚠️ "+e.message,true));
})();