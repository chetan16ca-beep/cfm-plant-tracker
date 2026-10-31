/* CFM Forge V217 — no-login smart factory chat.
 * Deterministic, read-only analysis of existing visible ERP records.
 * Real hosted LLM remains disabled until an authorized backend is configured.
 */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const norm=v=>String(v??"").trim().toUpperCase().replace(/\s+/g," ");
const str=v=>String(v??"").trim();
const n=v=>{const x=Number(v);return Number.isFinite(x)?x:null};
const whole=v=>n(v)==null?"Not recorded":String(v);
const unique=a=>[...new Set(a.filter(Boolean))];
const fmt=v=>v==null?"Not verified":String(Math.round(v*100)/100);
const max=16;
let source="device",cloud=null,lastWork="",lastSrl="",chat=[],busy=false,hiddenParents=[];
function core(){return window.CFMIntelCore||null}
function liveState(){
 try{
  const snap=core()?.snapshot();
  return snap&&core().valid(snap)?snap:null;
 }catch(_){return null}
}
function data(){
 if(source==="cloud"&&cloud&&core()?.valid(cloud.payload))return cloud.payload;
 return liveState();
}
function dataLabel(){return source==="cloud"?"Cloud (read-only, v"+(cloud?.version||"?")+")":"This device (saved records)"}
function sourceChanged(){const badge=$("cfmAiSource");if(badge)badge.textContent=dataLabel()}
function el(tag,text,cls){
 const item=document.createElement(tag);if(text!==undefined)item.textContent=text;
 if(cls)item.className=cls;return item;
}
function showAlert(msg,mode=""){const box=$("cfmAiFeedback");if(box){box.hidden=!msg;box.textContent=msg;box.dataset.mode=mode}}
function newLauncher(){
 const home=$("cfmSapWorkspace");if(!home||$("cfmAiLauncher"))return;
 const wrap=el("section",undefined,"cfm-ai-launcher");wrap.id="cfmAiLauncher";
 const mark=el("span","✦","cfm-ai-mark"),content=el("div",undefined,"cfm-ai-launcher-text");
 content.append(el("small","CFM FORGE / NO-LOGIN ASSISTANT"),el("h3","Ask CFM"),el("p","Ask about Work Orders, Cutting and SRL Stock · No login"));
 const btn=el("button","Open Factory Assistant");btn.type="button";btn.addEventListener("click",open);
 wrap.append(mark,content,btn);
 const tools=$("cfmIntelLauncher");if(tools)tools.after(wrap);else home.append(wrap);
}
function hideOuterShell(){
 try{
  const doc=window.parent.document;
  hiddenParents=[];
  for(const id of ["cfmMeterPendingBtn","cfmEmergencyExport","cfmUpdateVersion"]){
   const x=doc.getElementById(id);
   if(x){hiddenParents.push([x,x.style.display]);x.style.setProperty("display","none","important")}
  }
 }catch(_){}
}
function restoreOuterShell(){
 for(const [x,old] of hiddenParents)try{x.style.removeProperty("display");if(old)x.style.display=old}catch(_){}
 hiddenParents=[];
}
function dialog(){
 if($("cfmAiDialog"))return $("cfmAiDialog");
 const d=el("dialog",undefined,"cfm-ai-dialog");d.id="cfmAiDialog";
 d.setAttribute("aria-label","CFM no-login factory assistant");
 d.innerHTML=[
 '<header class="cfm-ai-header"><span class="cfm-ai-headmark">✦</span><div class="cfm-ai-titles"><small>CFM FORGE / FACTORY ASSISTANT</small><h2>Ask CFM</h2><p>Work Orders · Cutting · Stock</p></div><span id="cfmAiBadge" class="cfm-ai-badge" data-mode="online">NO LOGIN</span><button type="button" id="cfmAiExit" aria-label="Close">×</button></header>',
 '<div id="cfmAiFeedback" class="cfm-ai-feedback" role="status" aria-live="polite" hidden></div>',
 '<div class="cfm-ai-main" id="cfmAiMain"><div class="cfm-ai-chat">',
 '<div class="cfm-ai-prompts"><button type="button" data-prompt="CFM-722 ka work status batao">Work Status</button>',
 '<button type="button" data-prompt="333 ANT cloth ke SRL stock details">Cloth Stock</button>',
 '<button type="button" data-prompt="Abhi kitne pending Work Orders hain?">Pending Orders</button>',
 '<button type="button" data-prompt="Plant summary batao">Plant Summary</button></div>',
 '<div class="cfm-ai-source-row"><span id="cfmAiSource">This device (saved records)</span><button type="button" id="cfmAiReadCloud">Read Cloud</button><button type="button" id="cfmAiUseDevice" hidden>Use Device</button></div>',
 '<div id="cfmAiMessages" class="cfm-ai-messages" aria-live="polite"></div>',
 '<form class="cfm-ai-compose" id="cfmAiQuestionForm"><textarea id="cfmAiQuestion" maxlength="800" rows="2" placeholder="Example: CFM-677 mein kaunsa SRL use hua?"></textarea><button id="cfmAiSend" type="submit">Ask</button></form>',
 '<p class="cfm-ai-note">No login · This is a rule-based ERP record assistant, not connected to OpenAI. No data changes. Stock meters require verification.</p>',
 '</div></div>',
 '<footer class="cfm-ai-footer"><span>Read-only. No Work Order, Cutting or Stock edits.</span><button type="button" id="cfmAiReset">Clear Chat</button></footer>'
 ].join("");
 document.body.append(d);
 $("cfmAiExit").addEventListener("click",()=>d.close());
 d.addEventListener("close",restoreOuterShell);
 $("cfmAiReset").addEventListener("click",()=>{chat=[];lastWork="";lastSrl="";render();showAlert("Chat cleared. ERP records unchanged.","ok")});
 $("cfmAiQuestionForm").addEventListener("submit",event=>{event.preventDefault();send()});
 $("cfmAiQuestion").addEventListener("keydown",event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();send()}});
 for(const b of d.querySelectorAll("[data-prompt]"))b.addEventListener("click",()=>{$("cfmAiQuestion").value=b.dataset.prompt;send()});
 $("cfmAiReadCloud").addEventListener("click",readCloud);
 $("cfmAiUseDevice").addEventListener("click",()=>{source="device";sourceChanged();$("cfmAiUseDevice").hidden=true;showAlert("Reading device records only. No sync or overwrite.","ok")});
 render();
 return d;
}
function open(){
 const d=dialog();sourceChanged();showAlert("");
 if(!d.open){hideOuterShell();d.showModal()}
 $("cfmAiQuestion")?.focus();
}
function render(){
 const box=$("cfmAiMessages");if(!box)return;
 box.replaceChildren();
 if(!chat.length)box.append(el("div","Ask me: CFM-722 status, stock by SRL, cutting history or pending orders.","cfm-ai-empty"));
 for(const x of chat){
  const row=el("div",undefined,"cfm-ai-message "+x.role);
  row.append(el("b",x.role==="assistant"?"CFM Factory Assistant":"You"),
   el("div",x.text,"cfm-ai-answer"));
  if(x.source)row.append(el("small",x.source));
  box.append(row);
 }
 box.scrollTop=box.scrollHeight;
}
function includesAny(text,words){return words.some(w=>text.includes(w))}
function workId(question){
 const m=norm(question).match(/\bCFM[\s-]*(\d+)\b/);
 return m?"CFM-"+m[1]:null;
}
function srlId(question,s){
 const q=norm(question);
 const found=(s.store||[]).find(r=>r.srlNo&&q.includes(norm(r.srlNo)));
 if(found)return norm(found.srlNo);
 const m=q.match(/\bEFPPL[A-Z0-9]*\/\d+\b/);
 if(m)return m[0];
 return null;
}
function mainWorkDetails(work,s){
 const order=(s.pending||[]).find(x=>norm(x.workNo)===work);
 const cuts=(s.cutting||[]).filter(x=>norm(x.workNo)===work);
 const dept=(s.departmentWork||[]).filter(x=>norm(x.workNo)===work);
 if(!order&&!cuts.length&&!dept.length)return "Work No "+work+" is not found in "+dataLabel()+". This does not prove it never existed; check another device or Cloud.";
 const lines=[work+" · "+dataLabel()];
 if(order){
  const qty=n(order.orderQty),cut=n(order.cutQty);
  lines.push("Party: "+(order.party||"Not recorded"));
  lines.push("Description: "+(order.description2||order.description||"Not recorded"));
  lines.push("Order Qty: "+whole(order.orderQty)+" | Cutting Qty in Order: "+whole(order.cutQty));
  if(qty!=null&&cut!=null)lines.push("Order minus Cutting Qty: "+Math.max(0,qty-cut)+" (not necessarily finished/pending dispatch)");
  lines.push("Cloth: "+(order.cloth||"Not recorded")+" | Planned Width: "+whole(order.width)+" in");
  lines.push("PO: "+(order.poNo||"—")+" | Delivery: "+(order.deliveryDate||"—"));
  lines.push("Priority: "+(order.priority||"—")+" | Status: "+(order.status||"—"));
 }
 if(cuts.length){
  const ids=unique(cuts.map(x=>str(x.srlNo)));
  lines.push("Cutting entries: "+cuts.length+" | Linked SRL: "+(ids.join(", ")||"Not recorded"));
  lines.push("Cutting log Qty total: "+cuts.reduce((a,x)=>a+(n(x.cutQty)||0),0)+" (may contain piece parts; don't double count with Order Cut Qty)");
  const pendingMeters=cuts.filter(x=>x._redPenPendingStock===true).length;
  if(pendingMeters)lines.push("Cutting meter verification pending: "+pendingMeters+" row(s)");
 }
 if(dept.length){
  const names=unique(dept.map(x=>str(x.department||x.process)));
  lines.push("Department records: "+dept.length+" | Stages: "+(names.join(", ")||"Unspecified"));
 }
 return lines.join("\n");
}
function rollDetails(x){
 const lines=["SRL: "+(x.srlNo||"—"),"Quality: "+(x.quality||x.cloth||x.description||"Unknown"),
  "Actual roll width (Store): "+(x.width||"Not recorded")+" in","Status: "+(x.status||"Unknown")];
 if(x.physicalMtr!==undefined&&x.physicalMtr!==null&&x.physicalMtr!=="")lines.push("Stored physical MTR reading: "+fmt(n(x.physicalMtr))+" — may be historical, not verified live balance");
 if(x.excelLiveBalanceMtr!==undefined&&x.excelLiveBalanceMtr!==null&&x.excelLiveBalanceMtr!=="")lines.push("Stored spreadsheet MTR field: "+fmt(n(x.excelLiveBalanceMtr))+" — verify live deductions before use");
 lines.push("Actual available balance: NOT VERIFIED by this assistant. Check Physical Store and SRL Cutting usage.");
 return lines.join("\n");
}
function stockQuery(question,s){
 const q=norm(question),match=srlId(question,s);
 if(match){
  lastSrl=match;
  const roll=(s.store||[]).find(x=>norm(x.srlNo)===match);
  return roll?rollDetails(roll):"SRL "+match+" not found in "+dataLabel()+". No stock figure assumed.";
 }
 const work=workId(q)||((q.match(/USKA|ISKA|SAME WORK|WOH/)||[]).length?lastWork:null);
 if(work){
  const order=(s.pending||[]).find(x=>norm(x.workNo)===work);
  if(order?.cloth)question=order.cloth;
 }
 const all=(s.store||[]);
 const query=norm(question);
 const keywords=unique([...(query.match(/\b\d{3}\s*(?:ANT|AS|A)\b/g)||[]),...(query.match(/\b(?:PP|PVDF|POLYESTER|PTFE)\b/g)||[])]);
 const matches=all.filter(x=>{
  const cloth=norm(x.quality||x.cloth||x.description);
  return keywords.some(k=>cloth.includes(k))||(query.length>=3&&cloth&&query.includes(cloth));
 });
 if(!matches.length)return "No matching cloth SRL found in "+dataLabel()+". Specify a cloth like '333 ANT' or the full SRL number.";
 const total=matches.length;
 const preview=matches.slice(0,16).map(x=>"• "+(x.srlNo||"—")+" · "+(x.quality||x.cloth||"—")+" · Roll Width "+(x.width||"unknown")+" in · "+(x.status||"Status unknown"));
 return "Matching Store SRL records: "+total+" ("+dataLabel()+")\n"+preview.join("\n")+(total>16?"\n…plus "+(total-16)+" more":"")+
  "\n\nLive MTR balance not verified in this view; no automatic stock deduction.";
}
function cuttingQuery(question,s){
 const work=workId(question)||lastWork;
 if(work){
  const rows=s.cutting.filter(x=>norm(x.workNo)===work);
  if(!rows.length)return "No Cutting entries for "+work+" in "+dataLabel()+".";
  const preview=rows.slice(-12).map(x=>"• "+(x.date||"No date")+" · SRL "+(x.srlNo||"—")+" · Qty "+whole(x.cutQty)+" · Size "+(x.sizeLine||(whole(x.length)+" × "+whole(x.height)))+(x._redPenPendingStock?" · MTR CHECK PENDING":""));
  return "Cutting for "+work+": "+rows.length+" saved entries\n"+preview.join("\n")+(rows.length>12?"\n…older "+(rows.length-12)+" entries not shown":"")+"\nQty may include parts, not finished bags.";
 }
 return "Cutting register: "+s.cutting.length+" saved entries ("+dataLabel()+"). Ask with a Work No to see SRL and cutting lines.";
}
function overview(s,pendingOnly=false){
 const rows=s.pending||[],cuts=s.cutting||[],store=s.store||[],depts=s.departmentWork||[];
 const active=rows.filter(x=>!x.archived&&norm(x.status)!=="ARCHIVED");
 const incomplete=active.filter(x=>n(x.orderQty)!=null&&n(x.cutQty)!=null&&n(x.orderQty)>n(x.cutQty));
 const urgent=active.filter(x=>norm(x.priority)==="URGENT"||norm(x.priority)==="HIGH");
 if(pendingOnly){
  const recent=incomplete.slice(-12).reverse().map(x=>"• "+str(x.workNo)+" · "+(x.party||"—")+" · Qty "+whole(x.orderQty)+" · Cut "+whole(x.cutQty)+" · "+(x.priority||"NORMAL"));
  return "Pending by Order Qty − Cut Qty: "+incomplete.length+" Work Orders ("+dataLabel()+")\n"+
   (recent.join("\n")||"No positive difference found")+
   "\nThis is a quantity comparison, NOT verified department or dispatch pending. High/Urgent priority: "+urgent.length+".";
 }
 const known=unique([...rows.map(x=>norm(x.workNo)),...cuts.map(x=>norm(x.workNo))]);
 return "CFM Plant Overview — "+dataLabel()+"\n"+
 "Work Orders in Pending register: "+unique(rows.map(x=>norm(x.workNo))).length+"\n"+
 "Known Work Nos (Pending + Cutting history): "+known.length+"\n"+
 "Cutting entries: "+cuts.length+"\n"+
 "SRL Store records: "+store.length+"\n"+
 "Department report records: "+depts.length+"\n"+
 "Orders with positive Order−Cut difference: "+incomplete.length+"\n"+
 "High/Urgent priority entries: "+urgent.length+"\n\n"+
 "These counts describe this selected snapshot; they are not proof of all active orders. Cloud and device counts may differ.";
}
function answer(q,s){
 const Q=norm(q),work=workId(q),srl=srlId(q,s);
 if(work)lastWork=work;if(srl)lastSrl=srl;
 const wantsStock=includesAny(Q,["SRL","STOCK","CLOTH","ROLL","KAPDA","कपड़ा","मटेरियल","MATERIAL","MTR","METER"]);
 const wantsCut=includesAny(Q,["CUTTING","CUT ","CUTT ","KAT ","कटिंग","KATI","कट"]);
 const wantsPending=includesAny(Q,["PENDING","BAKI","BAQI","REMAINING","बकाया","पेंडिंग","KITNE WORK"]);
 const wantsSummary=includesAny(Q,["OVERVIEW","SUMMARY","DASHBOARD","TOTAL","SABHI","SAB","PLANT","FACTORY","REPORT","REPORTS","सारांश"]);
 if(srl)return stockQuery(q,s);
 if(work){
  if(wantsStock&&!wantsCut)return stockQuery(q,s);
  if(wantsCut)return cuttingQuery(q,s);
  return mainWorkDetails(work,s);
 }
 if((/USKA|ISKA|WOH|उस्का|इसका/.test(Q))&&lastWork){
  if(wantsCut)return cuttingQuery(lastWork,s);
  if(wantsStock)return stockQuery(lastWork,s);
  return mainWorkDetails(lastWork,s);
 }
 if(wantsStock)return stockQuery(q,s);
 if(wantsCut&&!wantsPending)return cuttingQuery(q,s);
 if(wantsPending)return overview(s,true);
 if(wantsSummary)return overview(s,false);
 const found=core()?.search(q,s)||[];
 if(!found.length)return "Is question ka verified answer selected ERP records se nahi mila.\nTry: CFM-722 status, 333 ANT stock, SRL EFPPL03/0351, pending orders or plant summary.\n\nThis is a record-search assistant, not an OpenAI language model.";
 const output=found.slice(0,12).map(x=>"• "+x.type+" | "+(x.workNo||x.ref||"—")+" | "+x.summary);
 return found.length+" matching record(s) in "+dataLabel()+":\n"+output.join("\n")+(found.length>12?"\n…more results available in Smart Search":"");
}
async function readCloud(){
 if(busy)return;
 const button=$("cfmAiReadCloud");button.disabled=true;button.textContent="Reading…";showAlert("Reading Cloud snapshot. Local data will not be replaced.");
 try{
  if(typeof cloudFetch!=="function")throw Error("Cloud read is unavailable on this device");
  const r=await cloudFetch();
  if(!r||!core()?.valid(r.payload))throw Error("Cloud snapshot could not be verified");
  cloud={payload:r.payload,version:r.version,updatedAt:r.updated_at};
  source="cloud";sourceChanged();$("cfmAiUseDevice").hidden=false;
  showAlert("Cloud snapshot loaded read-only (version "+(r.version||"?")+"). Device records unchanged.","ok");
 }catch(err){showAlert("Cloud read unavailable: "+(err?.message||"unknown")+". Device data unchanged.","warning")}
 finally{button.disabled=false;button.textContent="Refresh Cloud"}
}
function send(){
 if(busy)return;
 const q=$("cfmAiQuestion")?.value.trim()||"";
 if(q.length<2)return showAlert("Enter at least two letters, Work No or SRL.","warning");
 const s=data();
 if(!s||!core()?.valid(s))return showAlert("ERP records are still loading. Open Dashboard once and retry.","warning");
 const message=answer(q,s);
 chat.push({role:"user",text:q},{role:"assistant",text:message,source:dataLabel()});
 chat=chat.slice(-max);
 $("cfmAiQuestion").value="";showAlert("");render();
}
function init(){
 newLauncher();
 if(!$("cfmAiLauncher")){
  const root=$("view-dashboard");
  if(root){const observer=new MutationObserver(()=>{newLauncher();if($("cfmAiLauncher"))observer.disconnect()});observer.observe(root,{childList:true,subtree:true})}
 }
 window.cfmOpenAskAi=open;
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();