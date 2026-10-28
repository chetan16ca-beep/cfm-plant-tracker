(()=>{
"use strict";
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num=v=>Number(v)||0,fmt=v=>num(v).toLocaleString("en-IN",{maximumFractionDigits:3});
const today=()=>new Date().toLocaleDateString("en-CA");
const arrays=["orders","stock","cutting","stageEntries","measurements","materialIssues","dailyReports","dispatches","labels","stockAdjustments"];
const safeState=()=>{const a=window.eagleV3?.getState?.()||{};for(const k of arrays)if(!Array.isArray(a[k]))a[k]=[];return a};
const statuses=["CUTTING","STITCHING","THREAD CUT","GUN FINISH","PACKING"];
function options(el,items,preferred){if(!el)return;const v=preferred??el.value;el.innerHTML='<option value="">Select…</option>'+items.map(x=>'<option value="'+esc(x.value)+'">'+esc(x.label)+'</option>').join("");if(items.some(x=>String(x.value)===String(v)))el.value=v;}
function msg(s,error=false){const el=$("operationsMsg");if(el){el.textContent=s;el.className="status "+(error?"bad":"ok")}}
function workName(n,st){const o=st.orders.find(x=>num(x.no)===num(n));return "CFM-"+n+(o?" • "+o.party:"")}
function stageTotals(st,work,stage){return st.stageEntries.filter(x=>num(x.work)===num(work)&&x.stage===stage).reduce((x,r)=>x+num(r.qty),0)}
function printSheet(title,headers,rows,subtitle=""){
 const win=window.open("","_blank");if(!win){alert("Please allow popups for A4 print.");return}
 const table='<table><thead><tr>'+headers.map(x=>'<th>'+esc(x)+'</th>').join("")+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(x=>'<td>'+esc(x)+'</td>').join("")+'</tr>').join("")+'</tbody></table>';
 const html='<!doctype html><html><head><meta charset="utf-8"><title>'+esc(title)+'</title><style>@page{size:A4;margin:12mm}body{font:12px Arial,sans-serif;color:#172b3c}h1{font-size:17px;margin:0 0 6px}p{color:#53697c}table{width:100%;border-collapse:collapse}th,td{border:1px solid #9aafbc;padding:6px;text-align:left;vertical-align:top;overflow-wrap:anywhere}thead{display:table-header-group}th{background:#eaf2f7}tr{break-inside:avoid}.noprint{margin-bottom:12px;padding:8px;border:0;background:#155c8e;color:white}@media print{.noprint{display:none}}</style></head><body><button class="noprint" onclick="window.print()">Print / Save PDF</button><h1>CFM PLANT ERP • '+esc(title)+'</h1><p>'+esc(subtitle||("Printed "+new Date().toLocaleString("en-IN")))+'</p>'+table+'</body></html>';
 win.document.open();win.document.write(html);win.document.close();win.focus();
}
function printLabels(st){
 const no=Number($("tagWork")?.value),o=st.orders.find(x=>num(x.no)===no);
 if(!o){alert("Select a Work Order");return}
 const qty=Math.min(100,Math.max(1,Number($("tagCount").value)||5));
 const win=window.open("","_blank");if(!win){alert("Please allow popups to print");return}
 const box='<div class="label"><small>CFM PLANT • WORK ORDER TAG</small><h2>CFM-'+esc(o.no)+'</h2><strong>'+esc(o.party)+'</strong><p>'+esc(o.product)+'</p><div>CODE: '+esc(o.code||"-")+' | QTY: '+esc(o.qty)+'</div><div>CLOTH: '+esc(o.cloth||"-")+' | WIDTH: '+esc(o.width||"-")+'″</div><div>PO: '+esc(o.po||"-")+' • '+esc(o.priority||"NORMAL")+'</div></div>';
 win.document.write('<!doctype html><html><head><meta charset="utf-8"><title>CFM Tags</title><style>@page{size:A4;margin:9mm}body{font:12px Arial;color:#17283c}.labels{display:grid;grid-template-columns:1fr;grid-auto-rows:51mm;gap:2mm}.label{box-sizing:border-box;border:1px solid #182e42;padding:9px;break-inside:avoid}.label h2{font-size:19px;margin:4px 0}.label p{margin:5px 0}.label div{margin:3px 0}button{margin:5px 0 14px;padding:9px}@media print{button{display:none}}</style></head><body><button onclick="window.print()">Print Tags A4 • 5 per page</button><div class="labels">'+Array(qty).fill(box).join("")+'</div></body></html>');win.document.close();
}
function render(){
 const st=safeState();
 const works=st.orders.slice().sort((a,b)=>num(b.no)-num(a.no));
 const wopts=works.map(o=>({value:o.no,label:workName(o.no,st)}));
 for(const el of document.querySelectorAll("[data-new-work]"))options(el,wopts);
 const rollOpts=st.stock.map(s=>({value:s.srl,label:s.srl+" • "+(s.cloth||"-")+" • "+fmt(num(s.meter)-num(s.used))+" MTR"}));
 options($("issueSrl"),rollOpts);
 const prod=works.filter(o=>!o.archived);
 $("opsOrders").textContent=String(prod.length);
 $("opsPending").textContent=String(prod.filter(o=>!["DISPATCHED"].includes(o.status)).length);
 $("opsReady").textContent=String(prod.filter(o=>o.status==="READY TO DISPATCH").length);
 $("opsTotalStock").textContent=fmt(st.stock.reduce((a,s)=>a+Math.max(0,num(s.meter)-num(s.used)),0))+" MTR";
 const wk=num($("batchWork").value);
 const selected=wk?works.filter(o=>o.no===wk):works;
 $("batchSummary").innerHTML=selected.slice(0,75).map(o=>'<div class="item"><strong>CFM-'+esc(o.no)+'</strong> — '+esc(o.party)+' • Qty '+esc(o.qty)+'<div class="muted">'+statuses.map(stage=>stage+": "+fmt(stageTotals(st,o.no,stage))+" / "+fmt(o.qty)).join(" • ")+'</div></div>').join("")||'<div class="empty">No production entries yet</div>';
 $("productionList").innerHTML=st.stageEntries.slice().reverse().slice(0,60).map(x=>'<div class="item"><strong>'+esc(workName(x.work,st))+'</strong> | '+esc(x.stage)+' • '+fmt(x.qty)+' NOS<div class="muted">'+esc(x.worker||"-")+' • '+esc(x.date)+' • '+esc(x.size||"")+' • '+esc(x.remarks||"")+'</div></div>').join("")||'<div class="empty">No production entries</div>';
 $("measurementList").innerHTML=st.measurements.slice().reverse().slice(0,40).map(x=>'<div class="item"><strong>'+esc(workName(x.work,st))+'</strong> | '+esc(x.size||"-")+'<div>'+esc(x.description||"")+'</div><div class="muted">L '+esc(x.length)+' × W '+esc(x.width)+' | Mouth '+esc(x.mouth)+' | Allowance '+esc(x.allowance)+'</div></div>').join("")||'<div class="empty">No measurements</div>';
 $("issueList").innerHTML=st.materialIssues.slice().reverse().slice(0,50).map(x=>'<div class="item"><strong>'+esc(workName(x.work,st))+'</strong> • '+esc(x.srl)+' • '+fmt(x.meter)+' MTR<div class="muted">'+esc(x.date)+' • '+esc(x.issuedTo)+' • '+esc(x.remark||"")+'</div></div>').join("")||'<div class="empty">Cutting entries are also included in the auto issue report</div>';
 const allReports=[...st.stageEntries.map(x=>({...x,source:"Production"})),...st.dailyReports.map(x=>({...x,source:"Manual Daily"}))].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
 const date=$("reportDate")?.value||"";
 $("reportList").innerHTML=allReports.filter(x=>!date||x.date===date).slice(0,80).map(x=>'<div class="item"><strong>'+esc(x.date)+' • '+esc(x.stage)+'</strong> • '+fmt(x.qty)+' NOS<div class="muted">'+(x.work?esc(workName(x.work,st)):"General")+' • '+esc(x.worker)+' • '+esc(x.remarks||"")+' • '+esc(x.source)+'</div></div>').join("")||'<div class="empty">No reports for this date</div>';
 $("dispatchList").innerHTML=st.dispatches.slice().reverse().slice(0,50).map(x=>'<div class="item"><strong>'+esc(workName(x.work,st))+'</strong> • '+fmt(x.qty)+' NOS<div class="muted">'+esc(x.date)+' • Challan '+esc(x.challan||"-")+' • '+esc(x.transporter||"-")+'</div></div>').join("")||'<div class="empty">No dispatch entries</div>';
 $("labelsList").innerHTML=st.labels.slice().reverse().slice(0,40).map(x=>'<div class="item"><strong>'+esc(workName(x.work,st))+'</strong> • '+fmt(x.qty)+' labels<div class="muted">'+esc(x.issuedTo)+' • '+esc(x.date)+'</div></div>').join("")||'<div class="empty">No label issues</div>';
 const selectedEdit=st.orders.find(x=>num(x.no)===num($("editWork")?.value));
 if(selectedEdit)$("editStatus").textContent="Existing: "+selectedEdit.party+" | Qty "+selectedEdit.qty+" | "+selectedEdit.status;
}
async function submit(form,action){const btn=form.querySelector('button[type="submit"]'),data=Object.fromEntries(new FormData(form));
 if(!window.eagleV3){msg("Open ERP using your private link first",true);return}
 try{await window.eagleV3.save(action,data,btn,form);render()}catch(e){msg(e.message,true)}
}
function wireForm(id,action){const f=$(id);f?.addEventListener("submit",async e=>{e.preventDefault();await submit(f,action)})}
function bindPrint(id,fn){$(id)?.addEventListener("click",()=>{try{fn(safeState())}catch(e){alert(e.message)}})}
function allRows(st){return st.orders.filter(o=>!o.archived).sort((a,b)=>num(a.no)-num(b.no))}
function printableOrder(st){return allRows(st).map(o=>["CFM-"+o.no,o.party,o.po||"",o.product,o.qty,o.priority,o.status])}
for(const form of [["stageForm","addStageEntry"],["measureForm","addMeasurement"],["issueForm","addMaterialIssue"],["dailyForm","addDailyReport"],["dispatchForm","addDispatch"],["labelForm","addLabelIssue"],["adjustForm","adjustStock"]])wireForm(...form);
document.addEventListener("eagle:state",render);
document.addEventListener("eagle:ready",render);
$("batchWork")?.addEventListener("change",render);
$("reportDate")?.addEventListener("change",render);
$("editWork")?.addEventListener("change",render);
$("editLoad")?.addEventListener("click",()=>{
 const st=safeState(),o=st.orders.find(x=>num(x.no)===num($("editWork").value));if(!o)return alert("Select work order");
 const f=$("editForm");for(const key of ["party","po","product","code","cloth","width","qty","priority"])f.elements[key].value=o[key]??"";f.elements.work.value=o.no;
});
$("editForm")?.addEventListener("submit",e=>{e.preventDefault();if(!confirm("Save verified changes to this NEW Work Order?"))return;submit(e.target,"editOrder")});
$("archiveBtn")?.addEventListener("click",()=>{
 const o=Number($("editWork").value);if(!o)return alert("Select work order");
 const st=safeState(),r=st.orders.find(x=>num(x.no)===o);if(!r)return;
 if(!confirm((r.archived?"Restore":"Archive")+" CFM-"+o+"? No data will be deleted."))return;
 window.eagleV3.save("setArchived",{work:o,archived:!r.archived,confirm:true},$("archiveBtn")).then(render);
});
$("poAdd")?.addEventListener("click",()=>addPOLine());
function addPOLine(description="",qty=""){const div=document.createElement("div");div.className="po-line";div.innerHTML='<input placeholder="Product / Specification" name="product" required><input placeholder="Qty" type="number" min="1" step="any" name="qty" required><button type="button" class="btn alt">×</button>';div.querySelector('[name="product"]').value=description;div.querySelector('[name="qty"]').value=qty;div.querySelector('button').addEventListener("click",()=>div.remove());$("poLines").appendChild(div)}
addPOLine();
$("poForm")?.addEventListener("submit",async e=>{
 e.preventDefault();
 const f=e.target,items=[...document.querySelectorAll(".po-line")].map(x=>({product:x.querySelector('[name="product"]').value.trim(),qty:Number(x.querySelector('[name="qty"]').value)}));
 if(!items.length||items.some(x=>!x.product||!(x.qty>0))){msg("Enter valid PO product and quantity",true);return}
 if(!f.elements.verified.checked)return msg("Verify all PO lines with original document first",true);
 if(!confirm("Create "+items.length+" NEW Work Orders from verified PO?"))return;
 const btn=$("poSave");
 await window.eagleV3.save("bulkAddOrders",{party:f.elements.party.value,po:f.elements.po.value,items,verified:true},btn);
 if(btn&&!btn.disabled){$("poLines").innerHTML="";addPOLine();f.reset()}
 render();
});
$("poFile")?.addEventListener("change",e=>{
 const file=e.target.files[0];if(!file)return;
 if(file.size>15*1024*1024)return alert("Choose a PO file smaller than 15 MB");
 const preview=$("poPreview");preview.innerHTML="";
 const url=URL.createObjectURL(file);
 if(file.type.startsWith("image/")){const img=document.createElement("img");img.src=url;img.alt="Company PO preview";img.className="po-preview";preview.appendChild(img)}
 else if(file.type==="application/pdf"){const embed=document.createElement("iframe");embed.title="PO PDF";embed.src=url;embed.className="po-preview";preview.appendChild(embed)}
 else {URL.revokeObjectURL(url);return alert("Choose a photo or PDF")}
 const old=preview.dataset.url;if(old)URL.revokeObjectURL(old);preview.dataset.url=url;
 msg("PO opened for review. Enter product lines and verify against the original before saving.");
});
bindPrint("printPending",st=>printSheet("PENDING WORK ORDERS",["Work No","Party","PO","Product","Order Qty","Priority","Status"],printableOrder(st).filter(r=>r[6]!=="DISPATCHED")));
bindPrint("printOrders",st=>printSheet("ALL NEW WORK ORDERS",["Work No","Party","PO","Product","Order Qty","Priority","Status"],printableOrder(st)));
bindPrint("printBatch",st=>{
 const rows=allRows(st).map(o=>["CFM-"+o.no,o.party,o.qty,...statuses.map(k=>stageTotals(st,o.no,k))]);
 printSheet("BATCH & PRODUCTION REPORT",["Work No","Party","Order",...statuses],rows);
});
bindPrint("printCutting",st=>printSheet("CUTTING REGISTER",["Date","Work No","SRL","Part","L × W","Qty","Layer","Used MTR"],st.cutting.map(x=>[(x.createdAt||"").slice(0,10),"CFM-"+x.work,x.srl,x.part||"",fmt(x.length)+" × "+fmt(x.width),x.qty,x.layer,fmt(x.meters)])));
bindPrint("printStock",st=>printSheet("PHYSICAL STOCK / OPEN SRL",["SRL","Cloth","Width","Physical MTR","Used MTR","Balance MTR"],st.stock.map(x=>[x.srl,x.cloth,x.width,fmt(x.meter),fmt(x.used),fmt(num(x.meter)-num(x.used))])));
bindPrint("printDaily",st=>{
 const d=$("reportDate").value;const entries=[...st.stageEntries.map(x=>({...x,source:"Batch"})),...st.dailyReports.map(x=>({...x,source:"Daily"}))].filter(x=>!d||x.date===d);
 printSheet("DAILY DEPARTMENT REPORT",["Date","Work","Stage","Done Qty","Worker","Size/Remarks","Entry"],entries.map(x=>[x.date,x.work?"CFM-"+x.work:"-",x.stage,x.qty,x.worker,(x.size||"")+" "+(x.remarks||""),x.source]),d||"All dates");
});
bindPrint("printIssues",st=>{
 const manual=st.materialIssues.map(x=>[x.date,"CFM-"+x.work,x.srl,fmt(x.meter),x.issuedTo,"Allocation - not deducted"]);
 const automatic=st.cutting.map(x=>[(x.createdAt||"").slice(0,10),"CFM-"+x.work,x.srl,fmt(x.meters),x.part||"Cutting","Deducted by Cutting"]);
 printSheet("AUTO ISSUE REGISTER",["Date","Work No","SRL","Meter","Issued To / Part","Type"],[...automatic,...manual]);
});
bindPrint("printMeasurements",st=>printSheet("MEASUREMENT SHEET",["Work No","Size","Description","Length","Width","Mouth","Allowance"],st.measurements.map(x=>["CFM-"+x.work,x.size,x.description,x.length,x.width,x.mouth,x.allowance])));
bindPrint("printDispatch",st=>printSheet("READY & DISPATCH",["Work No","Party","Order Qty","Dispatched","Pending","Status"],allRows(st).map(o=>["CFM-"+o.no,o.party,o.qty,fmt(st.dispatches.filter(x=>x.work===o.no).reduce((a,x)=>a+num(x.qty),0)),fmt(num(o.qty)-st.dispatches.filter(x=>x.work===o.no).reduce((a,x)=>a+num(x.qty),0)),o.status])));
bindPrint("printTags",printLabels);
bindPrint("printLabelIssue",st=>printSheet("LABEL ISSUE REGISTER",["Date","Work No","Labels","Issued To","Remarks"],st.labels.map(x=>[x.date,"CFM-"+x.work,x.qty,x.issuedTo,x.remarks])));
bindPrint("printDept",st=>printSheet("DEPARTMENT WORK REPORT",["Work No","Party","Qty","Cutting","Stitching","Thread Cut","Gun Finish","Packing"],allRows(st).map(o=>["CFM-"+o.no,o.party,o.qty,...statuses.map(k=>fmt(stageTotals(st,o.no,k)))])));
$("reportDate")?.setAttribute("max","2099-12-31");
for(const e of document.querySelectorAll('[type="date"]'))if(!e.value)e.value=today();
if(window.eagleV3)render();
})();
