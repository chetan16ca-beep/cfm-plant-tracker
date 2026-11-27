/* CFM Sync Recovery Guard: diagnostic only; never overwrites live data. */
(function(){
'use strict';
const KEY='cfm-sync-recovery-diagnostics-v1';
function inspect(){
 const frame=document.getElementById('app');
 const w=frame&&frame.contentWindow;
 if(!w)return {ready:false,reason:'ERP frame unavailable'};
 try {
  const state=w.eval('({ready:typeof cloudReady!=="undefined"&&cloudReady,busy:typeof cloudBusy!=="undefined"&&cloudBusy,dirty:typeof cloudDirty!=="undefined"&&cloudDirty})');
  return {ready:!!state.ready,busy:!!state.busy,dirty:!!state.dirty,checkedAt:new Date().toISOString()};
 }catch(e){return {ready:false,reason:'Sync status inaccessible',checkedAt:new Date().toISOString()};}
}
window.cfmSyncRecovery={inspect,exportDiagnostics(){
 const data={version:1,diagnostics:inspect(),page:location.pathname};
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='CFM-SYNC-DIAGNOSTICS.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
 return data;
}};
window.addEventListener('online',()=>{try{sessionStorage.setItem(KEY,JSON.stringify(inspect()))}catch(_){}});
})();