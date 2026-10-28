(()=>{
"use strict";
const $=id=>document.getElementById(id),num=v=>Number(v)||0,fmt=v=>num(v).toLocaleString("en-IN",{maximumFractionDigits:4});
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const src=()=>window.eagleV3?.getState?.()||{},API="https://soluxixriexliipfnznc.supabase.co/functions/v1/eagle-v2-private";
const token=()=>new URLSearchParams(location.hash.slice(1)).get("access")||localStorage.getItem("eagle_v2_private_access")||"";
const today=()=>new Date().toLocaleDateString("en-CA");
const optionWorks=empty=>'<option value="">'+esc(empty)+'</option>'+(src().orders||[]).filter(x=>!x.archived).sort((a,b)=>b.no-a.no).map(x=>'<option value="'+esc(x.no)+'">CFM-'+esc(x.no)+' • '+esc(x.party)+'</option>').join("");
const nav=$("nav");if(!nav||!window.eagleV3)return;
const tag=document.querySelector(".version-label");if(tag)tag.textContent="NEW V7";
document.title="Eagle Plant ERP | Control Tower V7";
const headerSub=document.querySelector(".brand-text small");if(headerSub)headerSub.textContent="CFM CONTROL TOWER  •  PRODUCTION & INVENTORY";
const groups=[["v7legacy","Historical Orders","M3 4h18v16H3zM7 8h10M7 12h10M7 16h6"],
 ["v7waste","Wastage / W","M12 3v13M7 11l5 5 5-5M4 21h16"],
 ["v7files","Photos / PDF","M6 3h9l4 4v14H6zM15 3v5h4M9 14h8M9 18h6"],
 ["v7person","Person Work Edit","M7 3h10v18H7zM10 9h4M10 13h4M10 17h3"],
 ["v7recovery","Recovery Center","M3 10a9 9 0 1 1 2 9M3 3v7h7M12 7v6l4 2"]];
const heading=document.createElement("div");heading.className="nav-group-label";heading.textContent="ADVANCED OPERATIONS";heading.setAttribute("aria-hidden","true");nav.append(heading);
for(const [id,title,path] of groups){
 const b=document.createElement("button");b.type="button";b.dataset.pane=id;b.title=title;
 const icon=document.createElementNS("http://www.w3.org/2000/svg","svg");
 icon.setAttribute("viewBox","0 0 24 24");icon.setAttribute("class","nav-icon");icon.setAttribute("aria-hidden","true");
 const p=document.createElementNS("http://www.w3.org/2000/svg","path");p.setAttribute("d",path);icon.append(p);
 b.append(icon,document.createTextNode(title));b.addEventListener("click",()=>window.eagleV3.activate(id));nav.append(b);
}
const home=$("home");if(home){
 const banner=document.createElement("div");banner.className="control-hero";
 banner.innerHTML='<div><div class="eyebrow">CFM • Plant Control Tower</div><h2>Production, in command.</h2><p>One focused workspace for NEW Work Orders, SRL, Cutting and Department Reports. The OLD ERP remains separate.</p><div class="hero-actions"><button type="button" data-open="work">+ New Work Order</button><button type="button" data-open="v5planning">Daily Planning</button><button type="button" data-open="v7legacy">Previous Orders</button></div></div><div class="hero-art" aria-hidden="true"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="21"/><circle cx="32" cy="32" r="10"/><path d="M32 3v14M32 47v14M3 32h14M47 32h14"/></svg></div>';
 home.insertBefore(banner,home.firstChild);
 banner.addEventListener("click",e=>{const a=e.target.closest("[data-open]");if(!a)return;[...nav.querySelectorAll("button[data-pane]")].find(b=>b.dataset.pane===a.dataset.open)?.click()});
}
function cloudUrl(query){return API+"?"+query}
async function getCloud(query){
 if(!token())throw Error("Open the private NEW ERP link");
 const resp=await fetch(cloudUrl(query),{headers:{"x-eagle-access":token()},cache:"no-store"});
 const j=await resp.json().catch(()=>({error:"Invalid Cloud response"}));
 if(!resp.ok||!j.ok)throw Error(j.error||"Cloud "+resp.status);return j;
}
let old={parties:[],orders:[]},filesFetched=false,recoveryFetched=false;
function oldList(){
 const q=$("v7LegacySearch").value.toLowerCase(),party=$("v7LegacyParty").value,kind=$("v7LegacyKind").value;
 const arr=(old.orders||[]).filter(o=>(!party||o.party===party)&&(kind!=="sizes"||(o.measurements||[]).length)&&( [o.workNo,o.party,o.description,o.cloth,o.code].join(" ").toLowerCase().includes(q)));
 $("v7LegacyStatus").textContent=arr.length+" results of "+(old.orders||[]).length+" OLD Work Orders • Read-only";
 $("v7LegacyList").innerHTML=arr.slice(0,160).map(o=>{
  const dimensions=(o.measurements||[]).map(m=>fmt(m.length)+" × "+fmt(m.width)+" inch"+(m.part?" • "+m.part:"")).join(" | ");
  return '<div class="v7-record"><div class="v7-heading"><b>'+esc(o.workNo)+' • '+esc(o.party)+'</b><span class="v7-pill '+(dimensions?"":"warn")+'">'+(dimensions?"Cutting sizes "+o.measurements.length:"Specs only")+'</span></div><p>'+esc(o.description||"Product not recorded")+'</p><div class="v7-sub">Cloth '+esc(o.cloth||"-")+' • Width '+esc(o.width||"-")+'″ • Code '+esc(o.code||"-")+'</div>'+(dimensions?'<p class="v7-sub">Old Cutting L × W: '+esc(dimensions)+'</p>':'')+'<div class="v7-actions"><button type="button" class="btn alt" data-previous="'+esc(o.workNo)+'">Use as NEW Order Template</button></div></div>';
 }).join("")||'<div class="empty">No matching historical Work Orders.</div>';
}
async function readOld(){
 $("v7LegacyStatus").textContent="Reading OLD ERP safely…";
 try{old=await window.eagleV3.loadLegacy();
  const choices=[...new Set(old.orders.map(o=>o.party))].sort((a,b)=>a.localeCompare(b));
  const filter=$("v7LegacyParty").value;
  $("v7LegacyParty").innerHTML='<option value="">All historical Parties</option>'+choices.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join("");
  $("v7LegacyParty").value=filter;oldList();
 }catch(e){$("v7LegacyStatus").textContent=e.message}
}
for(const id of ["v7LegacySearch","v7LegacyParty","v7LegacyKind"])$(id).addEventListener("input",oldList);
$("v7LegacyRefresh").addEventListener("click",readOld);
$("v7LegacyList").addEventListener("click",e=>{
 const b=e.target.closest("[data-previous]");if(!b)return;
 const order=old.orders.find(x=>x.workNo===b.dataset.previous);if(!order)return;
 nav.querySelector('[data-pane="work"]')?.click();
 const party=$("woParty");party.value=order.party;party.dispatchEvent(new Event("input",{bubbles:true}));
 const select=$("legacyWorkSelect");select.value=order.workNo;select.dispatchEvent(new Event("change",{bubbles:true}));
 window.scrollTo({top:0,behavior:"smooth"});
});
function selectedOptions(){
 const s=src();
 for(const id of ["v7WasteWork","v7FileWork","v7PersonWO"]){
  const el=$(id),was=el.value;
  el.innerHTML=optionWorks("General / no Work Order");if([...el.options].some(x=>x.value===was))el.value=was;
 }
 const roll=$("v7WasteSrl"),saved=roll.value;
 roll.innerHTML='<option value="">Select Physical SRL</option>'+(s.stock||[]).filter(x=>num(x.meter)>num(x.used)).map(x=>'<option value="'+esc(x.srl)+'">'+esc(x.srl)+' • '+esc(x.cloth)+' • '+fmt(num(x.meter)-num(x.used))+' MTR</option>').join("");
 if([...roll.options].some(x=>x.value===saved))roll.value=saved;
}
function wastePreview(){
 const f=$("v7WasteForm"),roll=(src().stock||[]).find(x=>x.srl===f.elements.srl.value);
 const l=num(f.elements.length.value),w=num(f.elements.width.value),qty=num(f.elements.qty.value),layers=num(f.elements.layer.value)||1;
 const place=$("v7WastePreview");
 if(!roll||!(l>0&&w>0&&qty>0)){place.textContent="Enter SRL and L × W × Qty to calculate meters";return}
 const used=l*w*qty*layers/(num(roll.width)*39.37),available=num(roll.meter)-num(roll.used);
 place.textContent="Wastage "+fmt(used)+" MTR • Available "+fmt(available)+" MTR • After "+fmt(available-used)+" MTR";
 place.classList.toggle("bad",used>available);
}
function renderWaste(){
 const arr=(src().cutting||[]).filter(x=>x.wastage===true).slice().reverse();
 $("v7WasteHistory").innerHTML=arr.map(x=>'<div class="v7-record"><b>W • '+esc(x.srl)+' • '+fmt(x.meters)+' MTR</b><p>'+esc(x.part)+' • '+fmt(x.length)+' × '+fmt(x.width)+' × '+fmt(x.qty)+' • Layer '+fmt(x.layer)+'</p><small>'+esc(x.work?"CFM-"+x.work:"General")+' • '+esc(x.createdAt||"")+'</small></div>').join("")||'<div class="empty">No Wastage entries in NEW ERP</div>';wastePreview();
}
$("v7WasteForm").addEventListener("input",wastePreview);
$("v7WasteForm").addEventListener("submit",async e=>{
 e.preventDefault();const f=e.currentTarget,values=Object.fromEntries(new FormData(f));
 if(!confirm("Save verified Wastage and deduct calculated meter from NEW SRL "+values.srl+"?"))return;
 const ok=await window.eagleV3.save("addWastage",values,f.querySelector('[type="submit"]'));
 if(ok){f.reset();render()}
});
$("v7WastePrint").addEventListener("click",()=>{
 const rows=(src().cutting||[]).filter(x=>x.wastage).map(x=>[x.work?"CFM-"+x.work:"General",x.srl,x.length,x.width,x.qty,x.layer,fmt(x.meters),x.part]);
 const win=window.open("","_blank");if(!win)return alert("Please allow popups");
 win.document.write('<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:12mm}body{font:12px Arial}table{border-collapse:collapse;width:100%}td,th{border:1px solid #aaa;padding:6px}thead{display:table-header-group}@media print{button{display:none}}</style></head><body><button onclick="print()">Print Wastage A4</button><h2>CFM NEW ERP • WASTAGE REGISTER</h2><table><thead><tr>'+["Work","SRL","L","W","Qty","Layer","Meter","Reason"].map(x=>'<th>'+esc(x)+'</th>').join("")+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(x=>'<td>'+esc(x)+'</td>').join("")+'</tr>').join("")+'</tbody></table></body></html>');win.document.close();
});
async function readFiles(){
 $("v7FilesStatus").textContent="Loading private documents…";
 try{const j=await getCloud("attachments=1");filesFetched=true;
  $("v7FilesList").innerHTML=j.files.map(x=>'<div class="v7-record"><b>'+esc(x.name)+'</b><p>'+esc(new Date(x.createdAt).toLocaleString("en-IN"))+' • '+fmt(num(x.size)/1024)+' KB</p><div class="v7-actions"><button class="btn alt" data-cloud-file="'+esc(x.name)+'" type="button">Open Secure File</button></div></div>').join("")||'<div class="empty">No private NEW ERP uploads</div>';
  $("v7FilesStatus").textContent=j.files.length+" files in private NEW ERP storage";
 }catch(e){$("v7FilesStatus").textContent="File listing failed: "+e.message}
}
$("v7FilesRefresh").addEventListener("click",readFiles);
$("v7FilesList").addEventListener("click",async e=>{
 const btn=e.target.closest("[data-cloud-file]");if(!btn)return;
 try{btn.disabled=true;const j=await getCloud("file="+encodeURIComponent(btn.dataset.cloudFile));window.open(j.url,"_blank","noopener,noreferrer")}
 catch(e){alert("Cannot open file: "+e.message)}finally{btn.disabled=false}
});
$("v7FileForm").addEventListener("submit",async e=>{
 e.preventDefault();const form=e.currentTarget,button=form.querySelector('[type="submit"]'),file=form.elements.file.files[0];
 if(!file||file.size>6000000||file.size<1)return alert("Photo/PDF must be below 6 MB");
 button.disabled=true;$("v7FilesStatus").textContent="Uploading private file…";
 try{const response=await fetch(API+"?upload=1",{method:"POST",headers:{"x-eagle-access":token()},body:new FormData(form)});
  const j=await response.json().catch(()=>({error:"Invalid upload response"}));
  if(!response.ok||!j.ok)throw Error(j.error||"Upload failed");
  form.reset();await readFiles();$("v7FilesStatus").textContent="Saved "+j.file.name;
 }catch(e){$("v7FilesStatus").textContent="Upload failed: "+e.message}finally{button.disabled=false}
});
function resetPerson(){
 const f=$("v7PersonForm");f.reset();f.elements.id.value="";f.elements.date.value=today();$("v7PersonSave").textContent="Save Person Work";
}
function renderPeople(){
 const q=$("v7PersonSearch").value.toLowerCase(),records=(src().personWork||[]).slice().reverse().filter(x=>!q||JSON.stringify(x).toLowerCase().includes(q));
 $("v7PersonStatus").textContent=records.length+" Person Work entries (archived preserved)";
 $("v7PeopleList").innerHTML=records.map(x=>'<div class="v7-record"><div class="v7-heading"><b>'+esc(x.person)+' • '+esc(x.process)+'</b><span class="v7-pill '+(x.archived?"warn":"")+'">'+(x.archived?"ARCHIVED":"ACTIVE")+'</span></div><p>'+esc(x.date)+' • '+(x.work?"CFM-"+esc(x.work):"General")+' • '+esc(x.description||"")+'</p><div class="v7-sub">Given '+fmt(x.givenQty)+' • Done '+fmt(x.doneQty)+' • Pending '+fmt(num(x.givenQty)-num(x.doneQty))+' • '+esc(x.remark||"")+'</div><div class="v7-actions"><button class="btn alt" type="button" data-person-edit="'+esc(x.id)+'" '+(x.archived?"disabled":"")+'>Edit</button><button class="btn alt '+(x.archived?"":"v7-danger")+'" type="button" data-person-archive="'+esc(x.id)+'">'+(x.archived?"Restore":"Archive")+'</button></div></div>').join("")||'<div class="empty">No Person Work records</div>';
}
$("v7PersonSearch").addEventListener("input",renderPeople);
$("v7PersonReset").addEventListener("click",resetPerson);
$("v7PeopleList").addEventListener("click",async e=>{
 const b=e.target.closest("button");if(!b)return;
 const id=b.dataset.personEdit||b.dataset.personArchive,entry=(src().personWork||[]).find(x=>x.id===id);if(!entry)return;
 if(b.dataset.personEdit){
  const f=$("v7PersonForm");for(const key of ["id","date","person","process","work","givenQty","doneQty","shift","supervisor","description","remark"]){if(f.elements[key])f.elements[key].value=entry[key]??""}
  $("v7PersonSave").textContent="Save Person Work Changes";f.scrollIntoView({behavior:"smooth",block:"start"});return;
 }
 if(!confirm((entry.archived?"Restore":"Archive")+" this Person Work entry?"))return;
 const ok=await window.eagleV3.save("archivePersonWork",{id,archived:!entry.archived,confirm:true},b);if(ok)renderPeople();
});
$("v7PersonForm").addEventListener("submit",async e=>{
 e.preventDefault();const f=e.currentTarget,update=Boolean(f.elements.id.value);
 if(update&&!confirm("Save Person Work changes with history?"))return;
 const ok=await window.eagleV3.save(update?"editPersonWork":"addPersonWork",Object.fromEntries(new FormData(f)),$("v7PersonSave"));
 if(ok){resetPerson();renderPeople()}
});
async function listRecovery(){
 $("v7RecoveryStatus").textContent="Checking recovery snapshots…";
 try{const j=await getCloud("recovery=1"),items=j.backups||[];recoveryFetched=true;
  $("v7RestoreId").innerHTML='<option value="">Select a NEW backup</option>'+items.map(x=>'<option value="'+esc(x.id)+'">#'+esc(x.id)+' • V'+esc(x.previous_version)+' • '+esc(x.captured_at)+'</option>').join("");
  $("v7RecoveryList").innerHTML=items.map(x=>'<div class="v7-record"><b>NEW Cloud Backup #'+esc(x.id)+'</b><p>Previous version '+esc(x.previous_version)+' • '+esc(new Date(x.captured_at).toLocaleString("en-IN"))+'</p><span class="v7-pill">RECOVERABLE</span></div>').join("")||'<div class="empty">Backups appear after the next NEW Cloud save.</div>';
  $("v7RecoveryStatus").textContent=items.length+" recent snapshots available";
 }catch(e){$("v7RecoveryStatus").textContent="Backups unavailable: "+e.message}
}
$("v7RecoveryRefresh").addEventListener("click",listRecovery);
$("v7RecoveryExport").addEventListener("click",()=>$("downloadBackup").click());
$("v7RestoreForm").addEventListener("submit",async e=>{
 e.preventDefault();const f=e.currentTarget,data=Object.fromEntries(new FormData(f));
 if(data.confirm!=="RESTORE NEW ERP")return alert("Type exactly RESTORE NEW ERP");
 if(!confirm("Restore NEW ERP Cloud backup #"+data.id+"? Current NEW data is replaced, with a safety snapshot first."))return;
 if(!confirm("Final confirmation: overwrite CURRENT NEW ERP Work Orders and stock with this backup? OLD ERP is unaffected."))return;
 const ok=await window.eagleV3.save("restoreSnapshot",{id:Number(data.id),confirm:data.confirm},f.querySelector('[type="submit"]'));
 if(ok){f.reset();$("v7RecoveryStatus").textContent="NEW ERP snapshot restored and cloud verified";await listRecovery()}
});
function render(){
 if(!window.eagleV3)return;selectedOptions();renderWaste();renderPeople();
}
document.addEventListener("eagle:state",render);
nav.addEventListener("click",e=>{
 const b=e.target.closest("button[data-pane]");if(!b)return;
 if(b.dataset.pane==="v7files"&&!filesFetched)readFiles();
 if(b.dataset.pane==="v7recovery"&&!recoveryFetched)listRecovery();
});
resetPerson();render();readOld();
})();