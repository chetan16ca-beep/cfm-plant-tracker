(()=>{
"use strict";
const $=id=>document.getElementById(id),num=v=>Number(v)||0,txt=v=>String(v??"");
const esc=v=>txt(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=v=>num(v).toLocaleString("en-IN",{maximumFractionDigits:3});
const date=d=>new Date(d).toLocaleDateString("en-CA");
const today=()=>date(new Date()),tmr=()=>date(new Date(Date.now()+86400000));
const state=()=>window.eagleV3?.getState?.()||{};
const orders=s=>(s.orders||[]).filter(x=>!x.archived).sort((a,b)=>num(b.no)-num(a.no));
const stockBalance=r=>Math.max(0,num(r.meter)-num(r.used));
const cutPending=(s,o)=>Math.max(0,num(o.qty)-(s.stageEntries||[]).filter(x=>x.work===o.no&&x.stage==="CUTTING").reduce((a,x)=>a+num(x.qty),0));
const workList=s=>'<option value="">Select Work Order</option>'+orders(s).map(o=>'<option value="'+esc(o.no)+'">CFM-'+esc(o.no)+' • '+esc(o.party)+'</option>').join("");
function addPane(id,label,html){
 const b=document.createElement("button");b.type="button";b.dataset.pane=id;b.textContent=label;
 b.addEventListener("click",()=>{window.eagleV3?.activate?.(id);render()});
 $("nav").appendChild(b);
 $("app").insertAdjacentHTML("beforeend","<section id='"+id+"' class='pane'><article class='panel'><h2>"+label+"</h2>"+html+"</article></section>");
}
function field(label,control){return "<div class='field'><label>"+label+"</label>"+control+"</div>"}
function btn(id,text){return "<button type='button' class='btn alt' id='"+id+"'>"+text+"</button>"}
function card(title,details){return "<div class='item'><strong>"+esc(title)+"</strong><div class='muted'>"+esc(details)+"</div></div>"}
function previewList(id,rows){$(id).innerHTML=rows.join("")||"<div class='empty'>No matching NEW ERP records</div>"}
function csv(name,cols,rows){
 const cell=v=>{let t=txt(v);if(/^[=+\-@\t\r]/.test(t))t="'"+t;return '"'+t.replace(/"/g,'""')+'"'};
 const data="\ufeff"+[cols,...rows].map(row=>row.map(cell).join(",")).join("\r\n"),u=URL.createObjectURL(new Blob([data],{type:"text/csv;charset=utf-8"})),a=document.createElement("a");
 a.href=u;a.download="CFM-"+name+"-"+today()+".csv";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),10000);
}
function print(name,cols,rows){
 const w=window.open("","_blank");if(!w){alert("Allow popups for A4 print");return}
 const v="<!doctype html><html><head><meta charset='utf-8'><title>"+esc(name)+"</title><style>@page{size:A4;margin:11mm}body{font:11px Arial;color:#203248}table{width:100%;border-collapse:collapse}td,th{border:1px solid #aebdcb;padding:6px;overflow-wrap:anywhere;text-align:left}thead{display:table-header-group}tr{break-inside:avoid}button{margin:10px;padding:10px}@media print{button{display:none}}</style></head><body><button onclick='print()'>Print / Save PDF</button><h2>CFM PLANT ERP • "+esc(name)+"</h2><p>"+esc(new Date().toLocaleString("en-IN"))+"</p><table><thead><tr>"+cols.map(x=>"<th>"+esc(x)+"</th>").join("")+"</tr></thead><tbody>"+rows.map(x=>"<tr>"+x.map(y=>"<td>"+esc(y)+"</td>").join("")+"</tr>").join("")+"</tbody></table></body></html>";
 w.document.write(v);w.document.close();
}
addPane("v5planning","Daily Planning",
 "<p class='hint'>Select tomorrow's work, save in cloud, print/share. Pending Cut = Order Qty minus CUTTING department done. This is not a finished-bag count.</p>"+
 "<div class='grid'>"+field("Planning Date","<input id='v5Date' type='date'>")+field("Show","<select id='v5PlanFilter'><option value='open'>Open Orders</option><option value='planned'>Selected for Date</option><option value='due'>Delivery Due</option></select>")+"</div>"+
 "<p id='v5PlanSummary' class='status'></p>"+
 "<div class='v5actions'>"+btn("v5All","Select All")+btn("v5Due","Select Due")+btn("v5None","Clear Ticks")+"</div>"+
 "<div class='v5actions'>"+btn("v5SavePlan","Save Planned")+btn("v5Unplan","Remove Planned")+btn("v5PrintPlan","Print A4")+btn("v5SharePlan","WhatsApp Plan")+"</div><div id='v5PlanRows' class='list v5scroll'></div>");
addPane("v5stock","SRL / Width Reports",
 "<p class='hint'>NEW ERP physical stock only. Zero balance = Closed by balance; closing date is not recorded. SRL movement reflects saved Cutting.</p>"+
 "<div class='grid'>"+field("Report","<select id='v5StockType'><option value='srl'>Physical SRL Tracker</option><option value='width'>Cloth + Width Report</option><option value='open'>SRL Open / Close</option><option value='cloth'>Cloth Stock Summary</option></select>")+field("Search","<input id='v5StockQuery' placeholder='SRL / cloth / width'>")+"</div>"+
 "<p class='status' id='v5StockSummary'></p><div class='v5actions'>"+btn("v5PrintStock","Print A4")+btn("v5CsvStock","Export CSV")+"</div><div id='v5StockRows' class='list v5scroll'></div>");
addPane("v5monthly","Monthly Analysis",
 "<p class='hint'>NEW ERP orders, cutting meters, packing and dispatched qty. Cutting Qty counts pieces, not necessarily completed bags. Wastage is not tracked separately.</p>"+
 field("Month","<input id='v5Month' type='month'>")+"<p class='status' id='v5MonthSummary'></p><div class='v5actions'>"+btn("v5PrintMonth","Print A4")+btn("v5CsvMonth","Export CSV")+"</div><div id='v5MonthRows' class='list v5scroll'></div>");
addPane("v5people","Person Work Register",
 "<p class='hint'>Separate Given / Done / Pending records. General work without Work No. allowed. Does not deduct stock.</p>"+
 "<form id='v5PeopleForm' class='grid'>"+
 field("Date","<input name='date' type='date' required>")+field("Person","<input name='person' list='v5PersonNames' required><datalist id='v5PersonNames'></datalist>")+
 field("Department","<select name='process'><option>CUTTING</option><option>STITCHING</option><option>THREAD CUT</option><option>GUN FINISH</option><option>PACKING</option><option>GENERAL</option></select>")+
 field("Work Order","<select id='v5PersonWO' name='work'></select>")+
 field("Given Qty","<input name='givenQty' type='number' min='0' step='any' required>")+
 field("Done Qty","<input name='doneQty' type='number' min='0' step='any' required>")+
 field("Shift","<select name='shift'><option>GENERAL</option><option>SHIFT 1</option><option>SHIFT 2</option><option>NIGHT</option></select>")+
 field("Supervisor","<input name='supervisor'>")+
 "<div class='field wide'><label>Work Description</label><textarea name='description' rows='2'></textarea></div>"+
 "<div class='field wide'><label>Remarks</label><textarea name='remark' rows='2'></textarea></div>"+
 "<div class='wide'><button type='submit' class='btn'>Save Person Work</button></div></form>"+
 "<p id='v5PersonSummary' class='status'></p><div class='v5actions'>"+btn("v5PrintPeople","Print A4")+btn("v5CsvPeople","Export CSV")+"</div><div id='v5PeopleRows' class='list v5scroll'></div>");
addPane("v5docs","Bill / Challan Tracker",
 "<p class='hint'>Bill/Challan status and dispatch metadata only. This screen does not generate GST invoices.</p>"+
 "<form id='v5DocForm' class='grid'>"+
 "<div class='field wide'><label>Work Order *</label><select name='work' id='v5DocsWO' required></select></div>"+
 field("Bill Status","<select name='billStatus'><option>PENDING</option><option>REQUESTED</option><option>READY</option><option>DONE</option><option>NA</option></select>")+
 field("Challan Status","<select name='challanStatus'><option>PENDING</option><option>REQUESTED</option><option>READY</option><option>DONE</option><option>NA</option></select>")+
 field("Bill No.","<input name='billNo'>")+field("Challan No.","<input name='challanNo'>")+
 field("Transporter","<input name='transporter'>")+field("Vehicle No.","<input name='vehicleNo'>")+
 field("LR No.","<input name='lrNo'>")+field("E-Way Bill No.","<input name='ewayBillNo'>")+
 "<div class='field wide'><label>Remarks</label><textarea name='dispatchRemark' rows='2'></textarea></div>"+
 "<div class='wide'><button type='submit' class='btn'>Save Document Status</button></div></form>"+
 "<p id='v5DocSummary' class='status'></p><div class='v5actions'>"+btn("v5PrintDocs","Print A4")+btn("v5CsvDocs","Export CSV")+"</div><div id='v5DocsRows' class='list v5scroll'></div>");
addPane("v5search","Global Search",
 "<p class='hint'>Search all NEW registers by Work No., Party, SRL, Product, Person. Complete old 78-sheet search remains in OLD ERP.</p>"+
 "<div class='grid'>"+field("Search","<input id='v5SearchText' placeholder='CFM-685 / 333 ANT / Party'>")+
 field("Register","<select id='v5SearchKind'><option value='all'>All</option><option>orders</option><option>stock</option><option>cutting</option><option>stageEntries</option><option>measurements</option><option>dailyReports</option><option>personWork</option><option>dispatches</option><option>labels</option></select>")+"</div>"+
 "<p id='v5SearchSummary' class='status'></p><div id='v5SearchRows' class='list v5scroll'></div>");
addPane("v5export","Excel / CSV",
 "<p class='hint'>Export NEW ERP registers as .CSV for Excel. This is not the old 78-sheet .xlsx mirror or an Excel importer.</p>"+
 field("Register","<select id='v5ExportKind'><option>orders</option><option>stock</option><option>cutting</option><option>stageEntries</option><option>personWork</option><option>dailyReports</option><option>measurements</option><option>dispatches</option><option>materialIssues</option><option>labels</option></select>")+
 "<button type='button' id='v5ExportCSV' class='btn'>Download Selected CSV</button><p><a class='legacy-link' href='../index.html?v=180' target='_blank' rel='noopener'>Open OLD ERP / Excel 78-Sheet Mirror</a></p>");
const style=document.createElement("style");style.textContent=".v5scroll{max-height:660px;overflow:auto}.v5actions{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}.v5actions .btn{flex:1 1 130px;font-size:12px}.v5-plan-card{background:white;border:1px solid #dbe4ed;border-radius:10px;padding:10px;margin:6px 0}.v5-plan-card label{display:flex;gap:8px}.v5-plan-card input{width:18px;height:18px;flex-shrink:0}";document.head.append(style);
$("v5Date").value=tmr();$("v5Month").value=today().slice(0,7);$("v5PeopleForm").elements.date.value=today();
function groupedStock(s){
 const k=$("v5StockType").value,query=$("v5StockQuery").value.toLowerCase(),rolls=s.stock||[];
 let cols,rows;
 if(k==="srl"||k==="open"){
  cols=k==="srl"?["SRL","Cloth","Width","Opening","Used","Balance","Status"]:["SRL","Cloth","Width","Open Date","Close Date","Balance","Status"];
  rows=rolls.map(r=>k==="srl"?[r.srl,r.cloth,r.width,fmt(r.meter),fmt(r.used),fmt(stockBalance(r)),stockBalance(r)>0?"OPEN":"CLOSED BY BALANCE"]:
    [r.srl,r.cloth,r.width,txt(r.createdAt).slice(0,10),"NOT RECORDED",fmt(stockBalance(r)),stockBalance(r)>0?"OPEN":"CLOSED BY BALANCE"]);
 }else{
  const groups=new Map();
  for(const r of rolls){const cloth=txt(r.cloth||"UNKNOWN"),key=k==="width"?cloth.toUpperCase()+"|"+r.width:cloth.toUpperCase();
   if(!groups.has(key))groups.set(key,{cloth,width:k==="width"?r.width:"ALL",rolls:0,open:0,meter:0,used:0,balance:0,srl:[]});
   const x=groups.get(key);x.rolls++;if(stockBalance(r)>0)x.open++;x.meter+=num(r.meter);x.used+=num(r.used);x.balance+=stockBalance(r);x.srl.push(r.srl)}
  cols=["Cloth","Width","Rolls","Open Rolls","Opening","Used","Balance","SRLs"];
  rows=[...groups.values()].map(x=>[x.cloth,x.width,x.rolls,x.open,fmt(x.meter),fmt(x.used),fmt(x.balance),x.srl.join(", ")]);
 }
 return {cols,rows:rows.filter(x=>!query||x.join(" ").toLowerCase().includes(query))};
}
function monthly(s){
 const month=$("v5Month").value,os=orders(s).filter(x=>txt(x.createdAt).slice(0,7)===month),cut=(s.cutting||[]).filter(x=>txt(x.createdAt).slice(0,7)===month);
 const pack=(s.stageEntries||[]).filter(x=>x.stage==="PACKING"&&txt(x.date||x.createdAt).slice(0,7)===month),dispatch=(s.dispatches||[]).filter(x=>txt(x.date||x.createdAt).slice(0,7)===month);
 const sum=["Orders "+os.length,"Order Qty "+fmt(os.reduce((a,x)=>a+num(x.qty),0)),"Cut Pieces "+fmt(cut.reduce((a,x)=>a+num(x.qty),0)),"Used "+fmt(cut.reduce((a,x)=>a+num(x.meters),0))+" MTR","Packing Qty "+fmt(pack.reduce((a,x)=>a+num(x.qty),0)),"Dispatch Qty "+fmt(dispatch.reduce((a,x)=>a+num(x.qty),0))].join(" • ");
 const groups=new Map();for(const x of cut){const r=(s.stock||[]).find(r=>r.srl===x.srl),cloth=r?.cloth||"UNKNOWN";if(!groups.has(cloth))groups.set(cloth,{cloth,qty:0,mtr:0});const g=groups.get(cloth);g.qty+=num(x.qty);g.mtr+=num(x.meters)}
 return {sum,cols:["Cloth","Cut Pieces","Used MTR"],rows:[...groups.values()].map(x=>[x.cloth,fmt(x.qty),fmt(x.mtr)])}
}
function personTable(s){return {cols:["Date","Person","Department","Work","Given","Done","Pending","Shift","Supervisor","Description","Remarks"],rows:(s.personWork||[]).map(x=>[x.date,x.person,x.process,x.work||"",x.givenQty,x.doneQty,x.pendingQty,x.shift||"",x.supervisor||"",x.description||"",x.remark||""])}}
function docTable(s){return {cols:["Work No","Party","Bill Status","Bill No","Challan Status","Challan No","Transporter","Vehicle","LR","E-Way"],rows:orders(s).map(x=>["CFM-"+x.no,x.party,x.billStatus||"PENDING",x.billNo||"",x.challanStatus||"PENDING",x.challanNo||"",x.transporter||"",x.vehicleNo||"",x.lrNo||"",x.ewayBillNo||""])}}
function plannedTable(s){const d=$("v5Date").value;return {cols:["Work No","Party","Product","Order Qty","Pending Cut","Cloth","Due"],rows:orders(s).filter(x=>x.planDate===d).map(x=>["CFM-"+x.no,x.party,x.product,x.qty,fmt(cutPending(s,x)),x.cloth||"",x.deliveryDate||""])}}
function render(){
 const s=state();if(!s.orders)return;
 const planDate=$("v5Date").value,filter=$("v5PlanFilter").value,all=orders(s).filter(x=>x.status!=="DISPATCHED");
 const filtered=all.filter(x=>filter==="planned"?x.planDate===planDate:filter==="due"?Boolean(x.deliveryDate&&x.deliveryDate<=planDate):cutPending(s,x)>0||x.planDate===planDate);
 const checked=new Set([...document.querySelectorAll("#v5PlanRows input:checked")].map(x=>num(x.value)));
 $("v5PlanSummary").textContent="Open "+all.length+" • Planned "+all.filter(x=>x.planDate===planDate).length+" • Showing "+filtered.length;
 $("v5PlanRows").innerHTML=filtered.map(o=>"<div class='v5-plan-card'><label><input type='checkbox' value='"+esc(o.no)+"' "+(checked.has(o.no)?"checked":"")+"><span><b>CFM-"+esc(o.no)+" • "+esc(o.party)+"</b><div>"+esc(o.product)+"</div><small>Qty "+fmt(o.qty)+" • Pending Cut "+fmt(cutPending(s,o))+" • "+esc(o.cloth||"-")+" • Delivery "+esc(o.deliveryDate||"-")+" • "+(o.planDate===planDate?"PLANNED":"OPEN")+"</small></span></label></div>").join("")||"<div class='empty'>No pending work</div>";
 const stock=groupedStock(s);$("v5StockSummary").textContent=stock.rows.length+" rows • Total NEW balance "+fmt((s.stock||[]).reduce((a,x)=>a+stockBalance(x),0))+" MTR";previewList("v5StockRows",stock.rows.map(x=>card(x[0],x.slice(1).join(" • "))));
 const month=monthly(s);$("v5MonthSummary").textContent=month.sum;previewList("v5MonthRows",month.rows.map(x=>card(x[0],x.slice(1).join(" • "))));
 const people=s.personWork||[];$("v5PersonSummary").textContent=people.length+" entries • Given "+fmt(people.reduce((a,x)=>a+num(x.givenQty),0))+" • Done "+fmt(people.reduce((a,x)=>a+num(x.doneQty),0));
 previewList("v5PeopleRows",people.slice().reverse().slice(0,100).map(x=>card(x.date+" • "+x.person+" • "+x.process,"CFM-"+(x.work||"-")+" Given "+fmt(x.givenQty)+" Done "+fmt(x.doneQty)+" Pending "+fmt(x.pendingQty)+" • "+(x.description||""))));
 const oldPerson=$("v5PersonWO").value,oldDocs=$("v5DocsWO").value;
 $("v5PersonWO").innerHTML="<option value=''>General Work</option>"+workList(s);$("v5PersonWO").value=oldPerson;
 $("v5DocsWO").innerHTML=workList(s);$("v5DocsWO").value=oldDocs;
 $("v5PersonNames").innerHTML=[...new Set(["Sumit","Sangita",...people.map(x=>x.person)])].map(x=>"<option value='"+esc(x)+"'></option>").join("");
 const docs=docTable(s);const pending=docs.rows.filter(x=>!["DONE","READY","NA"].includes(x[2])||!["DONE","READY","NA"].includes(x[4]));
 $("v5DocSummary").textContent=docs.rows.length+" work orders • "+pending.length+" Bill/Challan pending";previewList("v5DocsRows",pending.slice(0,120).map(x=>card(x[0]+" • "+x[1],"Bill "+x[2]+" • Challan "+x[4])));
 const q=$("v5SearchText").value.trim().toLowerCase(),kind=$("v5SearchKind").value,keys=kind==="all"?["orders","stock","cutting","stageEntries","measurements","dailyReports","personWork","dispatches","labels"]: [kind];
 const results=[];for(const key of keys)for(const x of s[key]||[])if(!q||JSON.stringify(x).toLowerCase().includes(q))results.push([key,x]);
 $("v5SearchSummary").textContent=results.length+" NEW ERP matches (first 120 shown)";
 previewList("v5SearchRows",results.slice(0,120).map(x=>card(x[0]+" • "+(x[1].work?"CFM-"+x[1].work:x[1].no?"CFM-"+x[1].no:x[1].srl||""),JSON.stringify(x[1]).slice(0,400))));
}
function onClick(id,handler){$(id).addEventListener("click",async()=>{try{await handler()}catch(e){alert("ERP: "+e.message)}})}
for(const id of ["v5Date","v5PlanFilter","v5StockType","v5StockQuery","v5Month","v5SearchText","v5SearchKind"])$(id).addEventListener("input",render);
const ticks=()=>[...document.querySelectorAll("#v5PlanRows input:checked")].map(x=>Number(x.value));
onClick("v5All",()=>document.querySelectorAll("#v5PlanRows input").forEach(x=>x.checked=true));
onClick("v5None",()=>document.querySelectorAll("#v5PlanRows input").forEach(x=>x.checked=false));
onClick("v5Due",()=>{const s=state(),d=$("v5Date").value;document.querySelectorAll("#v5PlanRows input").forEach(x=>{const o=s.orders.find(y=>y.no===num(x.value));x.checked=Boolean(o?.deliveryDate&&o.deliveryDate<=d)})});
async function setPlan(selected){const a=ticks();if(!a.length)return alert("Choose Work Orders first");const done=await window.eagleV3.save("setPlanning",{works:a,date:$("v5Date").value,selected},$(selected?"v5SavePlan":"v5Unplan"));if(done)render()}
onClick("v5SavePlan",()=>setPlan(true));onClick("v5Unplan",()=>setPlan(false));
onClick("v5PrintPlan",()=>{const d=plannedTable(state());print("DAILY PENDING PLAN",d.cols,d.rows)});
onClick("v5SharePlan",()=>{const d=plannedTable(state());if(!d.rows.length)return alert("Save a plan first");window.open("https://wa.me/?text="+encodeURIComponent("CFM PLAN "+$("v5Date").value+"\n"+d.rows.map(x=>x[0]+" • "+x[1]+" • Pending "+x[4]).join("\n")),"_blank","noopener")});
onClick("v5PrintStock",()=>{const d=groupedStock(state());print("PHYSICAL STOCK / SRL",d.cols,d.rows)});
onClick("v5CsvStock",()=>{const d=groupedStock(state());csv("STOCK",d.cols,d.rows)});
onClick("v5PrintMonth",()=>{const d=monthly(state());print("MONTHLY "+$("v5Month").value,d.cols,d.rows)});
onClick("v5CsvMonth",()=>{const d=monthly(state());csv("MONTHLY",d.cols,d.rows)});
$("v5PeopleForm").addEventListener("submit",async e=>{e.preventDefault();const f=e.currentTarget;const d=Object.fromEntries(new FormData(f));const ok=await window.eagleV3.save("addPersonWork",d,f.querySelector("button[type=submit]"));if(ok){f.reset();f.elements.date.value=today();render()}});
onClick("v5PrintPeople",()=>{const d=personTable(state());print("DAILY PERSON WORK",d.cols,d.rows)});
onClick("v5CsvPeople",()=>{const d=personTable(state());csv("PERSON",d.cols,d.rows)});
$("v5DocsWO").addEventListener("change",()=>{const f=$("v5DocForm"),o=(state().orders||[]).find(x=>x.no===num(f.elements.work.value));for(const key of ["billStatus","challanStatus","billNo","challanNo","transporter","vehicleNo","lrNo","ewayBillNo","dispatchRemark"])f.elements[key].value=o?.[key]||(key.endsWith("Status")?"PENDING":"")});
$("v5DocForm").addEventListener("submit",async e=>{e.preventDefault();const f=e.currentTarget;if(!f.elements.work.value)return alert("Select Work Order");const ok=await window.eagleV3.save("updateDocuments",Object.fromEntries(new FormData(f)),f.querySelector("button[type=submit]"));if(ok)render()});
onClick("v5PrintDocs",()=>{const d=docTable(state());print("BILL/CHALLAN",d.cols,d.rows)});
onClick("v5CsvDocs",()=>{const d=docTable(state());csv("DOCS",d.cols,d.rows)});
onClick("v5ExportCSV",()=>{const key=$("v5ExportKind").value,rows=state()[key]||[];if(!rows.length)return alert("No "+key+" records");const cols=[...new Set(rows.flatMap(x=>Object.keys(x)))];csv(key.toUpperCase(),cols,rows.map(x=>cols.map(k=>typeof x[k]==="object"?JSON.stringify(x[k]):x[k])))});
document.addEventListener("eagle:state",render);document.addEventListener("eagle:ready",render);
if(window.eagleV3?.getState)render();
})();