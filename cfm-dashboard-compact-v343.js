/* CFM dashboard compact V343.
   Presentation only. Never reads/writes Cloud, ERP state, cutting or local storage.
   All original buttons and records remain in DOM, usable when a section is expanded. */
(function(){
'use strict';
const css=String.raw`
body #view-dashboard .command-hero{display:none!important}
body #view-dashboard .section-head>div>p{font-size:11px!important;margin:2px 0!important}
body #view-dashboard .photo-quick-actions{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:5px!important;margin:5px 0!important}
body #view-dashboard .photo-quick-actions button{min-height:42px!important;padding:4px!important;border-radius:8px!important;gap:3px!important}
body #view-dashboard .photo-quick-actions button span{font-size:17px!important}
body #view-dashboard .photo-quick-actions button b{font-size:10px!important}
body #view-dashboard .cfm-mobile-sync-actions{min-height:0!important;margin:2px 0 7px!important}
body #view-dashboard .cfm-mobile-sync-widget{min-height:36px!important;padding:3px 8px!important}
body #view-dashboard .cfm-main-actions{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important;margin:8px 0!important}
body #view-dashboard .cfm-main-action{min-height:52px!important;padding:7px 8px!important;gap:7px!important;border-radius:10px!important}
body #view-dashboard .cfm-main-action .cfm-ma-icon{font-size:19px!important}
body #view-dashboard .cfm-main-action .cfm-ma-copy strong{font-size:12px!important;line-height:1.2!important}
body #view-dashboard .cfm-main-action .cfm-ma-copy small,
body #view-dashboard .cfm-main-action .cfm-ma-arrow{display:none!important}
body #view-dashboard .cfm-cutting-print-primary{grid-column:1/-1!important;min-height:52px!important}
body #view-dashboard #kpis{gap:6px!important;margin:8px 0!important}
body #view-dashboard #kpis .kpi{min-height:64px!important;padding:8px!important;border-radius:10px!important}
body #view-dashboard #kpis .kpi .num{font-size:20px!important}
body #view-dashboard #kpis .kpi .label{font-size:11px!important}
body #view-dashboard .cfm-mini-section{margin:7px 0!important;border:1px solid #c9dbe5!important;border-radius:11px!important;background:#fff!important;overflow:visible!important;box-shadow:0 2px 8px #17354b10!important}
body #view-dashboard .cfm-mini-section>summary{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;cursor:pointer!important;min-height:40px!important;padding:8px 12px!important;list-style:none!important;color:#134761!important;font:750 13px system-ui,sans-serif!important}
body #view-dashboard .cfm-mini-section>summary::-webkit-details-marker{display:none!important}
body #view-dashboard .cfm-mini-section>summary .cfm-mini-toggle{font-size:11px!important;color:#517489!important;white-space:nowrap!important}
body #view-dashboard .cfm-mini-section[open]>summary{border-bottom:1px solid #dce8ef!important}
body #view-dashboard .cfm-mini-body{padding:7px!important}
body #view-dashboard .cfm-mini-body>.exec-group,
body #view-dashboard .cfm-mini-body>.panel,
body #view-dashboard .cfm-mini-body>#v164Mnc,
body #view-dashboard .cfm-mini-body>#v166Control{margin:0!important;padding:4px!important;box-shadow:none!important;border:0!important;border-radius:8px!important}
body #view-dashboard .cfm-mini-body .dashboard-section-title{display:none!important}
body #view-dashboard .module-command-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important}
body #view-dashboard .module-command-grid>.module-command-card{display:flex!important;align-items:center!important;flex-wrap:nowrap!important;gap:7px!important;min-height:50px!important;padding:7px!important;border:1px solid #d5e3eb!important;border-radius:9px!important;box-shadow:none!important;text-align:left!important}
body #view-dashboard .module-command-card>.m-ico{display:inline-flex!important;align-items:center!important;justify-content:center!important;flex:0 0 26px!important;width:26px!important;height:26px!important;padding:0!important;font-size:17px!important}
body #view-dashboard .module-command-card>b{font-size:12px!important;line-height:1.25!important;flex:1!important}
body #view-dashboard .module-command-card>.go,
body #view-dashboard .module-command-card>b~span{display:none!important}
body #view-dashboard .cfm-mini-body .section-head{margin:0 0 6px!important;gap:6px!important}
body #view-dashboard .cfm-mini-body .section-head h3{font-size:15px!important}
body #view-dashboard .cfm-mini-body .section-head p{display:none!important}
body #view-dashboard .cfm-mini-body .btn{padding:6px 9px!important;font-size:11px!important;min-height:34px!important}
body #view-dashboard .cfm-mini-body .worker-dash-grid{gap:6px!important}
body #view-dashboard .cfm-mini-body .data-card{margin:5px 0!important;padding:9px!important}
body #view-dashboard .cfm-mini-body .data-card .remark{line-height:1.4!important}
body #view-dashboard #v164Mnc .v164-grid{display:grid!important;grid-template-columns:1fr!important;gap:5px!important}
body #view-dashboard #v164Mnc .v164-card{padding:7px!important;display:flex!important;align-items:center!important;flex-wrap:wrap!important;gap:7px!important;min-height:36px!important}
body #view-dashboard #v164Mnc .v164-card small,
body #view-dashboard #v164Mnc .v164-card br{display:none!important}
body #view-dashboard #v164Mnc .v164-card>b{flex:1!important;font-size:12px!important}
body #view-dashboard #v164Mnc .v164-card button{margin:0!important;padding:5px 8px!important;font-size:11px!important}
body #view-dashboard #v166Control .v166-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:5px!important}
body #view-dashboard #v166Control .v166-card{min-height:53px!important;padding:7px!important;box-shadow:none!important;border-radius:8px!important}
body #view-dashboard #v166Control .v166-card>b{font-size:11px!important}
body #view-dashboard #v166Control .v166-card .v166-num{font-size:17px!important;margin:2px 0!important}
body #view-dashboard #v166Control .v166-card small{display:none!important}
body #view-dashboard #v167Pack{display:flex!important;align-items:center!important;flex-wrap:wrap!important;gap:6px!important;min-height:48px!important;padding:8px 10px!important;margin:7px 0!important;border-radius:11px!important}
body #view-dashboard #v167Pack>b{flex:1!important;font-size:13px!important}
body #view-dashboard #v167Pack small,
body #view-dashboard #v167Pack br{display:none!important}
body #view-dashboard #v167Pack button{margin:0!important;padding:7px 10px!important;min-height:34px!important;font-size:11px!important}
body #view-dashboard #cfmPhotoStockPanel{padding:9px!important;margin:8px 0!important}
body #view-dashboard #cfmPhotoStockPanel h3{font-size:13px!important}
body #view-dashboard #cfmPhotoStockPanel p{font-size:10px!important}
body #view-dashboard #cfmPhotoStockSummary{font-size:11px!important;margin-top:5px!important}
@media (max-width:360px){body #view-dashboard .photo-quick-actions button b{font-size:9px!important}body #view-dashboard .cfm-main-action .cfm-ma-copy strong{font-size:11px!important}}
@media(max-width:760px){
  body.cfm-forge #nav,body #nav{
    display:flex!important;flex-flow:row nowrap!important;justify-content:flex-start!important;
    align-items:center!important;overflow-x:auto!important;overflow-y:hidden!important;
    height:65px!important;min-height:65px!important;max-height:65px!important;
    gap:3px!important;padding:3px 5px!important;scrollbar-width:none!important;
    -webkit-overflow-scrolling:touch!important
  }
  body #nav::-webkit-scrollbar{display:none!important}
  body.cfm-forge #nav button,body #nav button{
    display:flex!important;flex-direction:column!important;align-items:center!important;
    justify-content:center!important;flex:0 0 65px!important;width:65px!important;
    min-width:65px!important;min-height:56px!important;max-height:56px!important;
    margin:0!important;padding:3px!important;gap:2px!important;
    line-height:1.1!important;font-size:10px!important;border-radius:8px!important
  }
  body #nav button .ico{font-size:18px!important;margin:0!important}
  body #nav button.mobile-more{flex-basis:58px!important;width:58px!important;min-width:58px!important}
}

`;
function addStyle(){
 if(document.getElementById('cfm-dashboard-compact-style'))return;
 const st=document.createElement('style');st.id='cfm-dashboard-compact-style';st.textContent=css;
 document.head.appendChild(st);
}
function fold(host,label){
 if(!host||host.closest('.cfm-mini-body'))return;
 const container=document.createElement('details');
 container.className='cfm-mini-section';
 const summary=document.createElement('summary');
 const main=document.createElement('span');main.textContent=label;
 const toggle=document.createElement('span');toggle.className='cfm-mini-toggle';toggle.textContent='Open ▾';
 summary.append(main,toggle);
 const body=document.createElement('div');body.className='cfm-mini-body';
 host.before(container);
 container.append(summary,body);
 body.append(host);
 container.addEventListener('toggle',()=>{toggle.textContent=container.open?'Close ▴':'Open ▾'});
}
function compact(){
 const root=document.getElementById('view-dashboard');
 if(!root)return;
 const groups=[...root.children].filter(el=>el.classList?.contains('exec-group'));
 for(const el of groups){
  const name=el.querySelector('.dashboard-section-title h3')?.textContent?.trim()||'ERP Modules';
  fold(el,name);
 }
 const panels=[...root.children].filter(el=>el.classList?.contains('panel')&&el.id!=='cfmPhotoStockPanel');
 for(const p of panels){
  const name=p.querySelector('.section-head h3')?.textContent?.trim()||'';
  let label='';
  if(/purana excel/i.test(name))label='📚 Old Excel / 78 Sheets';
  else if(/daily worker report/i.test(name))label='👷 Daily Worker Report';
  else if(/pending work snapshot/i.test(name))label='📋 Pending Work Snapshot';
  else if(/tomorrow planning/i.test(name))label='🗓 Tomorrow Planning';
  else if(/recent cutting/i.test(name))label='✂ Recent Cutting';
  if(label)fold(p,label);
 }
 fold(document.getElementById('v164Mnc'),'🧭 Work Timeline · Approvals · Audit');
 fold(document.getElementById('v166Control'),'📊 Plant Controls · MRP · Costing · Wastage');
}
function init(){
 addStyle();
 const root=document.getElementById('view-dashboard');
 if(!root)return;
 compact();
 let queued=false;
 const queue=()=>{
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{queued=false;compact()});
 };
 new MutationObserver(queue).observe(root,{childList:true,subtree:false});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();