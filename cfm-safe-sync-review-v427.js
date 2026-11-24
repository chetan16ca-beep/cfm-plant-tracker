/* CFM V427 — SAFE CLOUD SYNC REVIEW.
 * Read-only comparison. Every write hand-off delegates to existing verified,
 * user-confirmed Work Order or Daily Person Work recovery. No full state upload.
 */
(function(){
'use strict';
const ID='cfmSafeSync427';
const key=x=>String(x??'').trim().toUpperCase().replace(/\s+/g,' ');
let checking=false,mounted=false,latest=null;
const find=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
function rows(x,prop){return Array.isArray(x?.[prop])?x[prop]:[]}
function summary(local,remote){
 const a=rows(local,'pending'),b=rows(remote,'pending'),s=rows(local,'store'),t=rows(remote,'store');
 const c=rows(local,'cutting'),d=rows(remote,'cutting'),w=rows(local,'departmentWork'),z=rows(remote,'departmentWork');
 const present=(items,field)=>new Map(items.filter(x=>key(x?.[field])).map(x=>[key(x[field]),x]));
 const localWO=present(a,'workNo'),remoteWO=present(b,'workNo');
 const localSRL=present(s,'srlNo'),remoteSRL=present(t,'srlNo');
 const missingWork=[...localWO.keys()].filter(x=>!remoteWO.has(x));
 const missingRemoteWork=[...remoteWO.keys()].filter(x=>!localWO.has(x));
 const missingSRL=[...localSRL.keys()].filter(x=>!remoteSRL.has(x));
 const newRemoteSRL=[...remoteSRL.keys()].filter(x=>!localSRL.has(x));
 const diff=[];
 const identity=r=>[key(r?.party),key(r?.poNo),key(r?.description),String(Number(r?.orderQty)||0)].join('|');
 for(const [workNo,row] of localWO){
   if(remoteWO.has(workNo)&&identity(row)!==identity(remoteWO.get(workNo)))diff.push(workNo);
 }
 const ids=r=>new Set(r.filter(x=>x?.cfmDailyEntryId).map(x=>String(x.cfmDailyEntryId)));
 const localIDs=ids(w),remoteIDs=ids(z),missingDaily=[...localIDs].filter(x=>!remoteIDs.has(x));
 return {
  orders:[a.length,b.length],store:[s.length,t.length],cutting:[c.length,d.length],daily:[w.length,z.length],
  missingWork,missingRemoteWork,missingSRL,newRemoteSRL,diff,missingDaily,
  needsReview:!!(missingWork.length||missingRemoteWork.length||missingSRL.length||newRemoteSRL.length||
   diff.length||c.length!==d.length||w.length!==z.length)
 };
}

/* V431: explicit, device-only recovery. Archive BOTH snapshots in a separate
 * IndexedDB database and verify the stored record before any replacement.
 * No Cloud PATCH, no deletion, and no automatic merge of production data. */
async function archiveRecovery(record){
 const raw=JSON.stringify(record);
 const db=await new Promise((resolve,reject)=>{
   const req=indexedDB.open('CFM_SYNC_RECOVERY_ARCHIVES',1);
   req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('archives'))req.result.createObjectStore('archives',{keyPath:'id'})};
   req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
   req.onblocked=()=>reject(Error('Recovery archive database blocked'));
 });
 try{
   await new Promise((resolve,reject)=>{
     const tx=db.transaction('archives','readwrite');tx.objectStore('archives').add({id:record.id,raw});
     tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Archive aborted'));
   });
   const stored=await new Promise((resolve,reject)=>{
     const tx=db.transaction('archives','readonly'),q=tx.objectStore('archives').get(record.id);
     q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);
   });
   if(stored?.raw!==raw)throw Error('Archive verification failed');
   return raw;
 }finally{db.close()}
}
function downloadRecovery(raw,id){
 const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download='CFM-Sync-Recovery-'+id+'.json';
 document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
let resuming=false;
async function resumeFromCloud(){
 if(resuming||cloudBusy){notice('Another sync is running. Retry after it finishes.',true);return}
 if(!confirm('Use Cloud as the active data on THIS device? First review and send your unsynced Work Orders / Daily Work. Local-only Stock, Cutting and other edits will be archived, NOT merged into Cloud. Do not proceed until you have reviewed them.'))return;
 resuming=true;cloudBusy=true;
 const mutation=localMutationSeq;
 const before=JSON.stringify(state);
 const previous={ready:cloudReady,dirty:cloudDirty,version:cloudVersion,updated:cloudUpdatedAt};
 let switched=false;
 try{
   notice('Preparing verified device and Cloud recovery archive…');
   const remote=await cloudFetch();
   if(!remote||!validState(remote.payload)||!validState(state))throw Error('Invalid device or Cloud state');
   const id=new Date().toISOString().replace(/[:.]/g,'-')+'-'+Math.random().toString(36).slice(2,9);
   const record={id,createdAt:new Date().toISOString(),deviceVersion:previous.version,device:JSON.parse(before),cloud:remote};
   const raw=await archiveRecovery(record);
   downloadRecovery(raw,id);
   if(!confirm('Recovery archive verified and download requested. Cloud version '+remote.version+' will become active on this device. Unsynced local entries are preserved in the archive only. Continue ONLY if reviewed?')){notice('Archive saved; active device data unchanged.');return}
   const fresh=await cloudFetchMeta();
   if(Number(fresh?.version)!==Number(remote.version))throw Error('Cloud changed while reviewing. Run recovery again.');
   if(localMutationSeq!==mutation||JSON.stringify(state)!==before)throw Error('Device data changed during review. Run recovery again.');
   const next=clone(remote.payload);
   // First persist and read back the authoritative data; if storage is full,
   // keep the original in-memory records and the verified archive.
   const nextRaw=JSON.stringify(next);
   safeStorage.setItem(STORAGE_KEY,nextRaw);
   if(safeStorage.getItem(STORAGE_KEY)!==nextRaw)throw Error('Device storage could not verify the new cache');
   state=next;switched=true;
   cloudVersion=Number(remote.version);cloudUpdatedAt=remote.updated_at||'';
   cloudDirty=false;cloudReady=true;
   ensureExcelMasterData();syncDerivedState();
   document.getElementById('cfmCloudConflictNotice')?.remove();
   try{renderAll()}catch(e){console.warn('Recovered Cloud; render failed',e)}
   notice('Cloud version '+cloudVersion+' active on this device. Recovery archive retained.');
 }catch(e){
   if(!switched){
     cloudReady=previous.ready;cloudDirty=previous.dirty;cloudVersion=previous.version;cloudUpdatedAt=previous.updated;
   }else{
     // A derived-state failure must not allow an unverified snapshot upload.
     cloudReady=false;cloudDirty=false;
   }
   notice('Recovery paused: '+String(e?.message||e)+'. Cloud records not changed.',true);
 }finally{
   cloudBusy=false;resuming=false;
   if(switched&&cloudReady)setCloudBadge('☁️ Cloud active • recovery archive saved','green');
 }
}

function build(){
 if(find(ID))return;
 const box=document.createElement('dialog');box.id=ID;box.setAttribute('aria-labelledby','cfmSync427Title');
 box.style.cssText='border:1px solid #cbdbe8;border-radius:16px;background:#fff;color:#15324c;width:min(94vw,780px);max-height:89dvh;overflow:auto;padding:0;box-shadow:0 17px 65px #062d5360;font:13px/1.55 system-ui';
 const style=document.createElement('style');style.id='cfmSync427CSS';
 style.textContent='#'+ID+' .hdr{padding:16px 18px;background:#103c62;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:12px}'+
 '#'+ID+' h2{font-size:18px;margin:0}#'+ID+' .inside{padding:17px}#'+ID+' .hint{font-size:12px;color:#61728a;margin:7px 0 12px}'+
 '#'+ID+' .statgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin:12px 0}'+
 '#'+ID+' .stat{border:1px solid #dbe6ef;background:#f7fafc;border-radius:9px;padding:9px}'+
 '#'+ID+' .stat b{font-size:17px;display:block;margin:4px 0;color:#113d5e}'+
 '#'+ID+' button{padding:9px 12px;border-radius:9px;background:white;border:1px solid #b7cadb;color:#174868;font:bold 12px system-ui;cursor:pointer}'+
 '#'+ID+' .close{background:#19496d;border:1px solid #6286a3;color:white}'+
 '#'+ID+' .actions{display:flex;flex-wrap:wrap;gap:8px;margin:15px 0}'+
 '#'+ID+' .report{background:#fff8ea;border:1px solid #e8d09a;border-radius:10px;padding:12px;white-space:pre-line;overflow-wrap:anywhere}'+
 '#'+ID+' .report.good{background:#edfff4;border-color:#a4d8b9;color:#21613f}'+
 '#'+ID+' .report.error{background:#fff0ee;border-color:#e3afa9;color:#9b2929}';
 document.head.append(style);
 const bar=document.createElement('div');bar.className='hdr';
 const title=document.createElement('h2');title.id='cfmSync427Title';title.textContent='☁️ Safe Sync • Cloud vs This Phone';
 const close=document.createElement('button');close.className='close';close.type='button';close.textContent='Close';close.onclick=()=>box.close();
 bar.append(title,close);
 const inside=document.createElement('div');inside.className='inside';
 const hint=document.createElement('p');hint.className='hint';hint.textContent='Read-only check. Never overwrite newer Work Orders, Physical Stock, Cutting or Dispatch. Cloud and this phone can disagree; review before any retry.';
 const status=document.createElement('div');status.id='cfmSync427Status';status.setAttribute('role','status');status.textContent='Tap Check Cloud to compare records.';
 const stats=document.createElement('div');stats.className='statgrid';stats.id='cfmSync427Stats';
 const actions=document.createElement('div');actions.className='actions';
 const report=document.createElement('div');report.id='cfmSync427Report';report.className='report';
 const actionsList=[
  ['☁ Check Cloud',async()=>await check()],
  ['🔒 Archive & Resume Cloud Sync',async()=>await resumeFromCloud()],
  ['📋 Review & Send Work Orders',()=>typeof window.cfmReviewUnsyncedWorkOrders==='function'?window.cfmReviewUnsyncedWorkOrders():notice('Work Order recovery unavailable in this version',true)],
  ['👷 Retry Daily Work ONLY',()=>typeof window.cfmRetryDailyPersonCloud425==='function'?window.cfmRetryDailyPersonCloud425():notice('Daily Work retry unavailable in this version',true)],
  ['💾 Download Phone Backup',()=>{if(typeof window.parent.cfmDownloadBackup==='function')window.parent.cfmDownloadBackup();else notice('Backup button unavailable; open original ERP Backup option',true)}]
 ];
 for(const [caption,func] of actionsList){
   const button=document.createElement('button');button.type='button';button.textContent=caption;
   button.onclick=()=>{try{void func()}catch(e){notice('Action failed: '+String(e?.message||e),true)}};
   actions.append(button);
 }
 inside.append(hint,status,stats,actions,report);box.append(bar,inside);document.body.append(box);
}
function notice(s,isError=false){
 const e=find('cfmSync427Status');if(e){e.textContent=s;e.style.color=isError?'#b1262f':'#285a75'}
}
function sample(values){return values.length?values.slice(0,5).join(', ')+(values.length>5?' …':''):'None'}
async function check(){
 if(checking)return;checking=true;notice('☁ Reading Cloud only — no updates or deletes…');
 try{
   if(typeof cloudFetch!=='function'||typeof validState!=='function'||typeof state==='undefined')
     throw Error('CFM Cloud is not initialized. Wait until Dashboard loads.');
   const response=await cloudFetch();
   if(!response||!validState(response.payload))throw Error('Cloud returned no valid data');
   if(!validState(state))throw Error('Phone has no valid ERP state. Do not clear phone data.');
   const result=summary(state,response.payload);latest=result;
   const status='Cloud version '+Number(response.version||0)+' • '+String(response.updated_at||'')+' • This phone compared';
   notice(status);
   const container=find('cfmSync427Stats');container.replaceChildren();
   for(const [label,values] of [['Work Orders',result.orders],['Store SRL',result.store],['Cutting',result.cutting],['Daily Work',result.daily]]){
      const div=document.createElement('div');div.className='stat';
      const name=document.createElement('small');name.textContent=label;
      const count=document.createElement('b');count.textContent=values[0]+' / '+values[1];
      const sub=document.createElement('small');sub.textContent='Phone / Cloud';
      div.append(name,count,sub);container.append(div);
   }
   const notes=[
    'Phone-only Work Orders ('+result.missingWork.length+'): '+sample(result.missingWork),
    'Cloud-only Work Orders ('+result.missingRemoteWork.length+'): '+sample(result.missingRemoteWork),
    'Same Work No but DIFFERENT Party/PO/Qty ('+result.diff.length+'): '+sample(result.diff),
    'Phone-only SRL ('+result.missingSRL.length+'): '+sample(result.missingSRL),
    'Cloud-only SRL ('+result.newRemoteSRL.length+'): '+sample(result.newRemoteSRL),
    'Daily Work entry IDs on phone only ('+result.missingDaily.length+')',
    'Cutting entries: phone '+result.cutting[0]+' / Cloud '+result.cutting[1],
    'No automatic Store or Cutting merge is permitted; use the original material records to reconcile.'
   ];
   const box=find('cfmSync427Report');
   box.textContent=(result.needsReview?'⚠ Review required before full Sync.\n':'✓ No Work Order/SRL count or identity conflicts found.\n')+notes.join('\n');
   box.className='report'+(result.needsReview?'':' good');
 }catch(e){
  notice('Cloud comparison failed: '+String(e?.message||e),true);
  const box=find('cfmSync427Report');box.textContent='No records were edited. Keep phone data, do not repeat Work Order creation, and retry Cloud Check when connected.';box.className='report error';
 }finally{checking=false}
}
function mount(){
 if(mounted)return;
 const dash=find('view-dashboard');if(!dash)return;
 build();
 const target=dash.querySelector('#cfmDashboardCloudSync')?.parentElement||dash;
 // V430: keep daily production moving without letting a conflicted phone
 // upload its whole stale Work Order/Stock/Cutting snapshot.
 const work=document.createElement('section');work.id='cfmWorkNow430';
 work.style.cssText='box-sizing:border-box;margin:11px 8px;padding:13px;border:1px solid #8cc8be;border-radius:13px;background:#effcf7;box-shadow:0 3px 12px #0a4b3f12;color:#173d36;font:12px/1.55 system-ui';
 const heading=document.createElement('strong');
 heading.textContent='✅ Work Now • Direct Cloud — No Full Sync Needed';
 heading.style.cssText='display:block;font-size:14px;margin-bottom:5px';
 const info=document.createElement('div');
 info.textContent='New Work Orders save directly in LIVE CFM Cloud. A Save is complete only when Cloud confirmed appears. Existing unsynced phone records remain protected.';
 const actions=document.createElement('div');
 actions.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin-top:10px';
 const link=(text,url,primary)=>{
  const el=document.createElement('a');el.textContent=text;el.href=url;
  el.target='_blank';el.rel='noopener';
  el.style.cssText='display:inline-flex;align-items:center;justify-content:center;min-height:43px;box-sizing:border-box;flex:1 1 175px;padding:10px;border-radius:10px;text-decoration:none;font:bold 13px system-ui;border:1px solid '+(primary?'#0a7867':'#bbd4de')+';background:'+(primary?'#0a7867':'#fff')+';color:'+(primary?'#fff':'#1c5a68');
  return el;
 };
 actions.append(
  link('➕ Create Work Order • Cloud Save','./fast-work-order.html?v=430',true),
  link('☁️ View Live Cloud Orders','./cloud-workorders.html?v=430',false)
 );
 const warning=document.createElement('div');
 warning.textContent='Store/Cutting changes are NOT covered by this route. Keep those entries on the designated main device until Safe Sync review is resolved.';
 warning.style.cssText='font-size:11px;color:#6e4b21;margin-top:9px';
 work.append(heading,info,actions,warning);
 const btn=document.createElement('button');btn.id='cfmSync427Open';btn.type='button';
 btn.textContent='☁️ Safe Sync Check • Fix Pending';
 btn.style.cssText='margin:7px 8px;padding:10px 13px;border:1px solid #9fc0d6;border-radius:11px;background:#eaf7ff;color:#123e5e;font:bold 13px system-ui';
 btn.onclick=()=>{build();find(ID).showModal();void check()};
 target.prepend(work,btn);
 mounted=true;
}
function init(){mount();if(!mounted){let n=0;const poll=setInterval(()=>{mount();if(mounted||++n>50)clearInterval(poll)},250)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.CFM_SYNC_REVIEW_V427=Object.freeze({open:()=>{build();find(ID).showModal();void check()},summary});
})();