/* CFM V345: Keep diagnostics after normal plant dashboard.
 * UI-only DOM reordering; no deletion, no Cloud writes and no stock calculation changes.
 */
(function(){
'use strict';
const targets=[
 ['#cfmV195DashboardAudit','Stock MTR & Cutting Entries'],
 ['#cfmCutAudit','Cutting Photo Reconciliation'],
 ['#cfmCommandLaunch203','Smart Production Command Center'],
 ['#cfmV148Ops','Today Production & Smart Alerts'],
 ['.photo-quick-actions','Extra Shortcuts'],
 ['.cfm-mobile-sync-actions','Mobile Cloud Sync']
];
function moveToBottom(){
 const dashboard=document.getElementById('view-dashboard');
 if(!dashboard)return;
 let container=document.getElementById('cfmDashboardBottomV345');
 if(!container){
  container=document.createElement('section');
  container.id='cfmDashboardBottomV345';
  container.setAttribute('aria-label','Detailed audits and additional tools');
  container.style.cssText='margin:15px 0 8px;padding:0;border-top:2px solid #bad5e5';
  const title=document.createElement('h3');
  title.textContent='📋 Detailed Audits & Extra Tools';
  title.style.cssText='font:800 14px system-ui;color:#174a68;margin:12px 0 8px';
  container.append(title);
  dashboard.append(container);
 }
 // Reparent the same live nodes, preserving their event handlers and warning content.
 for(const [selector] of targets){
  const section=dashboard.querySelector(selector);
  if(section&&section!==container&&!container.contains(section)){
    container.append(section);
  }
 }
 // Other widgets may mount asynchronously; the audit collection stays the last section.
 if(dashboard.lastElementChild!==container)dashboard.append(container);
}
let queued=false;
function queue(){
 if(queued)return;
 queued=true;
 requestAnimationFrame(()=>{queued=false;moveToBottom()});
}
function init(){
 const dashboard=document.getElementById('view-dashboard');
 if(!dashboard)return;
 moveToBottom();
 const observer=new MutationObserver(queue);
 observer.observe(dashboard,{childList:true,subtree:false});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();