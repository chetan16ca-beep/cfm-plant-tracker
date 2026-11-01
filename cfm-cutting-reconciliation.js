/* CFM V241 — read-only cutting photo reconciliation.
   Zero mutations to orders, cutting, stock, localStorage or Supabase. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const upper=v=>String(v==null?"":v).trim().toUpperCase();
const text=v=>String(v==null?"":v);
const numeric=v=>Number.isFinite(Number(v))?Number(v):0;
const photo=r=>upper(r.entryType).startsWith("PHOTO CUTTING");
function records(){
 try {
  if(typeof state==="undefined")return null;
  const src=Array.isArray(state.cutting)?state.cutting:[];
  const rolls=Array.isArray(state.store)?state.store:[];
  const known=new Map(rolls.map(x=>[upper(x.srlNo),x]));
  const photos=src.filter(photo);
  const results=photos.map(r=>{
   const srl=upper(r.srlNo),store=known.get(srl)||null;
   const pending=r._redPenPendingStock===true||r._redPenPendingStock==="true";
   const meter=text(r._redPenUsedMtr).trim();
   const posted=!pending && (r._redPenVerified===true||r._redPenVerified==="true") &&
       (r._trackSrl===true||r._trackSrl==="true") && meter!=="" &&
       Number.isFinite(Number(meter)) && Number(meter)>0 && !!store;
   const status=pending?"STOCK METER PENDING":posted?"MTR POSTED / ESTIMATED":"OLD PHOTO ENTRY / REVIEW";
   const widthMismatch=!!store && Number(r.plannedWidth)>0 && Number(store.width)>0 &&
      Math.abs(Number(r.plannedWidth)-Number(store.width))>.1;
   return {workNo:text(r.workNo),srl:srl||"NOT RECORDED",status,missingStore:!store,photoVerified:r._redPenVerified===true,
    widthMismatch,qty:numeric(r.cutQty),storeWidth:store?.width,workWidth:r.plannedWidth,usedMtr:meter};
  });
  const countOf=type=>results.filter(x=>x.status===type).length;
  const counters={photo:photos.length,posted:countOf("MTR POSTED / ESTIMATED"),
    pending:countOf("STOCK METER PENDING"),old:countOf("OLD PHOTO ENTRY / REVIEW"),
    missing:results.filter(x=>x.missingStore).length,misWidth:results.filter(x=>x.widthMismatch).length};
  return {counters,rows:results};
 }catch(err){console.warn("CFM reconciliation read only",err);return null;}
}
function elem(t,value){
 const x=document.createElement(t);if(value!=null)x.textContent=value;return x;
}
function render(){
 const node=$("cfmCutAudit");
 if(!node)return;
 const action=node.querySelector("#cfmCutAuditRefresh");const data=records();node.replaceChildren();if(action)node.append(action);
 if(!data){node.append(elem("p","Cutting data not ready on this device. Load ERP and try Refresh Audit."));return;}
 const c=data.counters;
 const heading=elem("h3","Cutting Photo Reconciliation");heading.style.cssText="font-size:16px;margin:0 0 4px";
 const summary=elem("p",c.photo+" Photo Cutting records | "+c.posted+" recorded MTR (some estimated) | "+c.pending+" stock-meter pending | "+c.old+" old records for review | "+c.missing+" missing Store SRL");
 summary.style.cssText="font-size:12px;line-height:1.5;margin:5px 0";
 const notice=elem("p","READ ONLY: Cutting saved ≠ Stock verified. Missing SRL / width mismatch / insufficient balance must be resolved before any meter deduction. These numbers reflect the currently loaded ERP device state; confirm Cloud Sync before relying on them.");
 notice.style.cssText="font-size:11px;color:#6a4a22;background:#fff7e5;padding:8px;border-radius:8px;margin:6px 0";
 node.append(heading,summary,notice);
 const categories=[
  {key:"STOCK METER PENDING",title:"Stock Meter Pending — do NOT deduct again",open:true},
  {key:"OLD PHOTO ENTRY / REVIEW",title:"Old Photo Entries — check earlier stock consumption",open:false},
  {key:"MTR POSTED / ESTIMATED",title:"MTR Posted / Estimated — verify actual meter and stock",open:false}
 ];
 categories.forEach(cat=>{
  const subset=data.rows.filter(r=>r.status===cat.key);if(!subset.length)return;
  const details=elem("details");details.open=cat.open;
  details.style.cssText="margin:7px 0;border:1px solid #dae5ec;border-radius:9px;padding:8px";
  const title=elem("summary",cat.title+" ("+subset.length+" lines)");title.style.cssText="cursor:pointer;font-size:12px;font-weight:800";
  details.append(title);
  const table=elem("table");table.style.cssText="margin-top:7px;width:100%;border-collapse:collapse;font-size:11px";
  const head=elem("thead");const top=elem("tr");
  ["Work No","SRL","Cut Qty","Stock Check"].forEach(s=>{const th=elem("th",s);th.style.cssText="text-align:left;padding:5px;border-bottom:1px solid #aac1ce";top.append(th)});head.append(top);table.append(head);
  const body=elem("tbody");let shown=0;
  subset.forEach(x=>{
   const tr=elem("tr");let reason=x.missingStore?"MISSING SRL in Store":(x.widthMismatch?"WIDTH MISMATCH "+x.workWidth+" / "+x.storeWidth:"");
   if(!reason&&cat.key==="STOCK METER PENDING")reason="Meter not cleared";
   if(!reason&&cat.key==="MTR POSTED / ESTIMATED")reason=x.usedMtr+" MTR recorded";
   if(!reason)reason="Old photo; check source";
   for(const value of [x.workNo,x.srl,String(x.qty),reason]){
    const td=elem("td",value);td.style.cssText="padding:6px 4px;border-bottom:1px solid #edf2f4;vertical-align:top";
    tr.append(td);
   }
   body.append(tr);shown++;
  });
  table.append(body);const wrap=elem("div");wrap.style.cssText="max-height:300px;overflow:auto";wrap.append(table);
  details.append(wrap);node.append(details);
 });
 const footer=elem("p","Review SRL and real roll width first. Do not change Work Order Cut Qty based on COLL/BOTTOM/HT part pieces.");
 footer.style.cssText="font-size:11px;margin:7px 0 2px;color:#31566b";node.append(footer);
}
function mount(){
 const dash=$("view-dashboard");if(!dash)return;
 let section=$("cfmCutAudit");
 if(!section){
   section=elem("section");section.id="cfmCutAudit";
   section.style.cssText="border:1px solid #c7dce5;background:#f9fcff;color:#17354a;padding:12px;border-radius:12px;margin:12px 4px";
   const existing=dash.querySelector(".section-head")||dash.firstElementChild;
   if(existing)existing.insertAdjacentElement("afterend",section);else dash.prepend(section);
 }
 render();
}
function button(){
 const dash=$("view-dashboard");if(!dash||$("cfmCutAuditRefresh"))return;
 const btn=elem("button","↻ Refresh Cutting Audit");
 btn.id="cfmCutAuditRefresh";btn.type="button";
 btn.style.cssText="margin:6px;padding:8px 12px;background:#146fb3;border:0;color:white;font-size:12px;font-weight:800;border-radius:8px";
 btn.addEventListener("click",()=>{mount();render()});
 const panel=$("cfmCutAudit");if(panel)panel.prepend(btn);
}
function init(){try{mount();button()}catch(e){console.warn("CFM audit panel",e)}}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
document.addEventListener("click",e=>{if(e.target.closest?.('[data-view="dashboard"],[onclick*="dashboard"]'))setTimeout(init,150)},true);
window.cfmRefreshCuttingAuditV241=init;
})();