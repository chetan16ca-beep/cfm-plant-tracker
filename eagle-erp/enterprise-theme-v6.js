(()=>{
"use strict";
/*
 * View-only layout enhancer for the existing Eagle NEW ERP.
 * Keeps all original pane buttons and their click handlers.
 * No localStorage, cloud calls, mutations of work orders or stock.
 */
const $=id=>document.getElementById(id);
const header=document.querySelector("header.top");
if(header){
 header.innerHTML='<div class="brand-line"><div class="brand-mark" aria-hidden="true"><svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 22V10L12 5V22M12 13L21 8V22M7 12V13M7 17V18M16 15V16M16 19V20M4 22H24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="brand-text"><h1>Eagle Plant ERP <span class="version-label">NEW V6</span></h1><small>CFM Operations · Production & Inventory Management</small></div></div><div class="brand-right"><span class="brand-system">NEW ERP · ISOLATED CLOUD</span></div>';
}
document.title="Eagle Plant ERP | NEW V6";
const nav=$("nav"),app=$("app"),sticky=app?.querySelector(".stickybar");
if(!nav||!sticky)return;
nav.setAttribute("aria-label","Main ERP navigation");
const categories=[
 ["OVERVIEW",["home"]],
 ["WORK ORDERS",["work","po","v5planning","manage"]],
 ["PRODUCTION",["cutting","production","measure","issues","daily","v5people"]],
 ["INVENTORY",["stock","v5stock","products"]],
 ["DISPATCH & DOCUMENTS",["dispatch","labels","v5docs"]],
 ["ANALYTICS & TOOLS",["v5monthly","v5search","print","v5export","backup"]]
];
const iconPaths={
 home:"M3 11 12 4l9 7M5 10v10h14V10M10 20v-6h4v6",
 work:"M8 4h8l3 3v14H5V7l3-3zM8 4v4h8M8 13h8M8 17h6",
 po:"M4 5h16M4 12h16M4 19h16M8 2v6M15 9v6M11 16v6",
 v5planning:"M5 3v4M19 3v4M4 9h16M6 5h12a2 2 0 0 1 2 2v13H4V7a2 2 0 0 1 2-2zM8 14l3 3 5-5",
 manage:"M4 7h16M4 12h16M4 17h16M8 5v4M16 10v4M10 15v4",
 cutting:"M4 5l16 14M4 19 20 5M5 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM5 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
 production:"M3 21V8l7 5V8l7 5V4h4v17H3zM7 18h1M12 18h1M17 18h1",
 measure:"M4 4h16v16H4zM8 4v5M12 4v3M16 4v5M4 14h5M4 10h3",
 issues:"M12 2v12M8 10l4 4 4-4M4 18h16v4H4z",
 daily:"M4 5h16v16H4zM8 3v4M16 3v4M4 10h16M8 15h8M8 18h5",
 v5people:"M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21v-2a8 8 0 0 1 16 0v2",
 stock:"M3 7l9-4 9 4-9 4-9-4zM3 7v11l9 4 9-4V7M12 11v11",
 v5stock:"M3 18h18M5 14h4v4H5zM10 10h4v8h-4zM15 5h4v13h-4z",
 products:"M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z",
 dispatch:"M3 7h12v11H3zM15 10h4l3 4v4h-7zM7 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
 labels:"M3 12l9-9h8v8l-9 9-8-8zM16 7h.01",
 v5docs:"M7 3h10l4 4v14H7zM17 3v5h4M10 12h8M10 16h8M10 20h5",
 v5monthly:"M4 19V11M10 19V4M16 19v-8M22 19V8",
 v5search:"M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM17 17l5 5",
 print:"M6 9V3h12v6M6 18H4V10h16v8h-2M6 15h12v6H6z",
 v5export:"M12 3v12M8 11l4 4 4-4M4 18v3h16v-3",
 backup:"M3 8V3h6M4 4a9 9 0 1 1-1 11M12 7v6l4 2"
};
function iconFor(pane){
 const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
 svg.setAttribute("viewBox","0 0 24 24");
 svg.setAttribute("aria-hidden","true");svg.setAttribute("class","nav-icon");
 const path=document.createElementNS("http://www.w3.org/2000/svg","path");
 path.setAttribute("d",iconPaths[pane]||"M4 4h16v16H4z");
 svg.appendChild(path);return svg;
}
const original=[...nav.querySelectorAll("button[data-pane]")];
const byPane=new Map(original.map(button=>[button.dataset.pane,button]));
const arranged=new Set();
const fragment=document.createDocumentFragment();
for(const [group,keys] of categories){
 const buttons=keys.map(k=>byPane.get(k)).filter(Boolean);
 if(!buttons.length)continue;
 const heading=document.createElement("div");
 heading.className="nav-group-label";heading.textContent=group;
 heading.setAttribute("aria-hidden","true");
 fragment.appendChild(heading);
 for(const button of buttons){
  arranged.add(button);
  button.insertBefore(iconFor(button.dataset.pane),button.firstChild);
  button.setAttribute("title",button.textContent.trim());
  fragment.appendChild(button);
 }
}
for(const button of original){
 if(arranged.has(button))continue;
 button.insertBefore(iconFor(button.dataset.pane),button.firstChild);
 fragment.appendChild(button);
}
nav.replaceChildren(fragment);
function updateCurrent(){
 for(const button of nav.querySelectorAll("button[data-pane]")){
  if(button.classList.contains("active"))button.setAttribute("aria-current","page");
  else button.removeAttribute("aria-current");
 }
}
updateCurrent();
const toggle=document.createElement("button");
toggle.type="button";toggle.id="erpMobileNavToggle";toggle.className="btn alt";
toggle.setAttribute("aria-label","Open navigation menu");
toggle.setAttribute("aria-controls","nav");toggle.setAttribute("aria-expanded","false");
toggle.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg><span>Menu</span>';
sticky.insertBefore(toggle,sticky.firstChild);
const backdrop=document.createElement("button");
backdrop.id="erpNavBackdrop";backdrop.type="button";
backdrop.setAttribute("aria-label","Close navigation menu");
document.body.appendChild(backdrop);
function setMenu(open,restoreFocus=false){
 document.body.classList.toggle("erp-nav-open",open);
 toggle.setAttribute("aria-expanded",String(open));
 toggle.setAttribute("aria-label",open?"Close navigation menu":"Open navigation menu");
 if(open)nav.querySelector('button[data-pane].active')?.focus({preventScroll:true});
 else if(restoreFocus)toggle.focus({preventScroll:true});
}
toggle.addEventListener("click",()=>setMenu(!document.body.classList.contains("erp-nav-open")));
backdrop.addEventListener("click",()=>setMenu(false,true));
nav.addEventListener("click",event=>{
 if(event.target.closest("button[data-pane]")){
  updateCurrent();
  setMenu(false);
  if(window.matchMedia("(max-width:900px)").matches){
   window.scrollTo({top:0,behavior:"instant"});
  }
 }
});
document.addEventListener("keydown",event=>{
 if(event.key==="Escape"&&document.body.classList.contains("erp-nav-open"))setMenu(false,true);
});
window.addEventListener("resize",()=>{
 if(window.innerWidth>900&&document.body.classList.contains("erp-nav-open"))setMenu(false);
});
const home=$("home"),stats=home?.querySelector(".stats");
if(home&&stats){
 const intro=document.createElement("div");intro.className="overview-heading";
 intro.innerHTML='<div><h2>Operations Overview</h2><p>New production system · Work orders and live physical stock</p></div><span class="overview-chip">NEW ERP WORKSPACE</span>';
 home.insertBefore(intro,stats);
}
// Active states are maintained by original ERP event handlers.
// This script intentionally never overrides ERP save/edit/search/print logic.
})();