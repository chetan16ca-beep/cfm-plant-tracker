/* CFM ERP V208 – SAP-inspired function icon system.
 * Presentation only. DOM event handlers, Cloud, Store, SRL, Cutting, Orders untouched.
 * Self-contained outline SVG icons; no CDN or font dependency.
 */
(function(){
'use strict';
const NS='http://www.w3.org/2000/svg';
const paths={
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
 dashboard:'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
 orders:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8 10h8M8 14h8M8 18h5"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h3M8 18h3"/>',
 package:'<path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10M7.5 4.5l9 5"/>',
 scissors:'<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="m8 8 12 12M14 10l6-6M8 16l4-4"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
 sheet:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 3v18M4 9h16M4 15h16M12 9v12"/>',
 file:'<path d="M5 2h9l5 5v14H5zM14 2v5h5M8 12h8M8 16h8"/>',
 printer:'<path d="M6 9V3h12v6M6 18H4V9h16v9h-2M6 15h12v6H6zM17 12h1"/>',
 backup:'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v7c0 2 4 3 9 3s9-1 9-3V5M3 12v7c0 2 4 3 9 3s9-1 9-3v-7"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="m19 13 2-1-2-1-1-3 1-2-3-2-2 2h-4L8 4 5 6l1 2-1 3-2 1 2 1 1 3-1 2 3 2 2-2h4l2 2 3-2-1-2z"/>',
 refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.5-3"/>',
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 factory:'<path d="M3 21V9l7 4V9l7 4V4h4v17zM7 17h1M12 17h1M17 17h1"/>',
 users:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5v1"/>',
 truck:'<path d="M3 6h12v11H3zM15 10h4l3 4v3h-7"/><circle cx="7.5" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
 ruler:'<path d="m3 16 13-13 5 5-13 13zM9 11l3 3M12 8l3 3M6 14l3 3"/>',
 archive:'<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v12h14V9M10 14h4"/>',
 chart:'<path d="M3 21h18M5 17v-7h4v7zM11 17V5h4v12zM17 17v-9h4v9z"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
 alert:'<path d="m12 3 10 18H2zM12 9v5M12 18h.01"/>',
 save:'<path d="M4 3h14l3 3v15H3V3zM7 3v7h10V3M7 21v-8h10v8"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 edit:'<path d="m4 20 4-.7L20 7l-3-3L5 16zM14 7l3 3M4 20h16"/>',
 trash:'<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
 upload:'<path d="M12 17V4M7 9l5-5 5 5M4 17v4h16v-4"/>',
 check:'<path d="M4 12l5 5L20 6"/>',
 close:'<path d="M5 5l14 14M19 5 5 19"/>',
 filter:'<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
 cloud:'<path d="M8 18H6a4 4 0 0 1-1-8 7 7 0 0 1 14-1 5 5 0 0 1-1 9h-3"/>',
 tag:'<path d="M3 3h8l10 10-8 8L3 11z"/><circle cx="7.5" cy="7.5" r="1"/>',
 list:'<path d="M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1"/>',
 copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>',
 link:'<path d="M10 13a5 5 0 0 0 7 .5l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7-.5l-3 3a5 5 0 0 0 7 7l2-2"/>',
 send:'<path d="m22 2-7 20-4-9-9-4zM22 2 11 13"/>',
 eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>'
};
const navMap={dashboard:'dashboard',pending:'orders',planning:'calendar',store:'package',cutting:'scissors',search:'search',excel:'sheet',docs:'file',print:'printer',backup:'backup',settings:'settings',more:'menu',deptwork:'users',readydispatch:'truck',measurements:'ruler',srltracker:'tag',issues:'orders',products:'package',widthreport:'ruler',stocksummary:'chart',monthly:'calendar',openclose:'archive',legacyfull:'sheet',excelmirror:'sheet'};
const words=[
 [/\b(delete|remove|discard|erase)\b/i,'trash'],
 [/\b(cancel|close|dismiss)\b/i,'close'],
 [/\b(download|export|backup|save pc data)\b/i,'download'],
 [/\b(print|label|tag print)\b/i,'printer'],
 [/\b(sync|refresh|reload|retry|load work)\b/i,'refresh'],
 [/\b(photo|scan|attach|upload|import)\b/i,'upload'],
 [/\b(search|find|lookup)\b/i,'search'],
 [/\b(filter|sort)\b/i,'filter'],
 [/\b(save|submit|confirm|apply)\b/i,'save'],
 [/\b(edit|change|modify|update)\b/i,'edit'],
 [/\b(add|new|create|manual|entry)\b/i,'plus'],
 [/\b(view|preview|open|show|details|history)\b/i,'eye'],
 [/\b(copy|duplicate)\b/i,'copy'],
 [/\b(send|share|whatsapp)\b/i,'send'],
 [/\b(report|summary|analytics|chart)\b/i,'chart']
];
function icon(name,extra){
 const svg=document.createElementNS(NS,'svg');
 svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');
 svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.9');
 svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');
 svg.classList.add('cfm-v208-svg');
 svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
 if(extra)svg.classList.add(extra);
 svg.innerHTML=paths[name]||paths.list;return svg;
}
function use(node,name,mode='replace'){
 if(!node||node.dataset.cfmV208Icon)return;
 node.dataset.cfmV208Icon='1';
 node.classList.add('cfm-v208-icon-host');
 if(mode==='replace')node.replaceChildren(icon(name));
 else node.prepend(icon(name,'cfm-v208-button-icon'));
}
function identifyButton(el){
 let title=(el.textContent||'').replace(/[\u{1F300}-\u{1FAFF}]/gu,'').trim().slice(0,110);
 let action=el.getAttribute('onclick')||'';
 const value=(title+' '+action).toLowerCase();
 if(!value.trim())return null;
 for(const [re,name] of words)if(re.test(value))return name;
 return el.classList.contains('btn-primary')?'check':el.classList.contains('btn-danger')?'alert':null;
}
function nearestView(el){return el.closest('section.view')?.id?.replace(/^view-/,'')||'dashboard'}
function decorate(root){
 if(!root||!root.querySelectorAll)return;
 // Navigation icons are present in native HTML; only their artwork is replaced.
 root.querySelectorAll('#nav button[data-view] .ico').forEach(el=>use(el,navMap[el.closest('button').dataset.view]||'list'));
 root.querySelectorAll('#nav button.mobile-more .ico').forEach(el=>{
  const label=el.parentElement.textContent.toLowerCase();
  use(el,label.includes('refresh')?'refresh':label.includes('setting')?'settings':'menu');
 });
 // Existing built-in function cards: keep all click handlers.
 root.querySelectorAll('.module-command-card .m-ico').forEach(el=>{
  const button=el.closest('button'),on=button?.getAttribute('onclick')||'';
  const m=on.match(/showView\(['"]([\w]+)['"]\)/);
  const n=m?navMap[m[1]]:identifyButton(button)||'list';
  use(el,n);
 });
 root.querySelectorAll('.sap-tile').forEach(el=>{
  const p=el.querySelector('.sap-tile-icon');
  const t=el.textContent.toLowerCase();
  const name=/work order/.test(t)?'orders':/cutting/.test(t)?'scissors':/store|stock/.test(t)?'package':/production/.test(t)?'factory':/department/.test(t)?'users':/dispatch/.test(t)?'truck':/search/.test(t)?'search':/print/.test(t)?'printer':'dashboard';
  if(p)use(p,name);
 });
 root.querySelectorAll('.cfm-sap-item>span:first-child').forEach(el=>{
  const t=el.parentElement.textContent.toLowerCase();
  const name=/work order|pending/.test(t)?'orders':/cutting/.test(t)?'scissors':/store|roll/.test(t)?'package':/production|command/.test(t)?'factory':/department/.test(t)?'users':/dispatch/.test(t)?'truck':/search/.test(t)?'search':/print/.test(t)?'printer':/excel/.test(t)?'sheet':/backup|save pc/.test(t)?'download':/setting/.test(t)?'settings':'dashboard';
  use(el,name);
 });
 // Add vector section symbols but keep the original heading contents.
 root.querySelectorAll('.view>.section-head h2').forEach(h=>{
  const i=h.querySelector('.ico');
  if(i){use(i,navMap[nearestView(h)]||'dashboard');return}
  if(h.dataset.cfmV208Icon)return;
  h.dataset.cfmV208Icon='1';h.classList.add('cfm-v208-heading');
  h.prepend(icon(navMap[nearestView(h)]||'dashboard','cfm-v208-heading-icon'));
 });
 // Print Center & function-grid buttons look like real app tiles, not text-only buttons.
 root.querySelectorAll('button.action-card').forEach(b=>{
  if(b.dataset.cfmV208Icon)return;
  let ic=identifyButton(b)||(/daily|register/i.test(b.textContent)?'printer':'file');
  use(b,ic,'prepend');
 });
 // Form actions: style clickable buttons while retaining their exact event listeners.
 root.querySelectorAll('.view button.btn, .view button.btn-primary, .view button.btn-green, .view button.btn-danger, .view button[data-action], .cfm-sap-dialog button[data-close]').forEach(b=>{
  if(b.dataset.cfmV208Icon||b.querySelector('.cfm-v208-svg')||b.closest('.sap-tile-grid,.module-command-grid,.action-grid,#nav'))return;
  const name=identifyButton(b);if(!name)return;
  use(b,name,'prepend');
  if(name==='trash'||name==='alert')b.classList.add('cfm-v208-destructive');
 });
}
let scheduled=false;
function schedule(){
 if(scheduled)return;scheduled=true;
 requestAnimationFrame(()=>{scheduled=false;decorate(document)});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
const observer=new MutationObserver(changes=>{
 for(const c of changes){
  if(c.addedNodes.length){schedule();break}
 }
});
observer.observe(document.documentElement,{subtree:true,childList:true});
})();