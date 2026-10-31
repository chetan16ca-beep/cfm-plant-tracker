/* CFM V233 - Safe, operator-approved PC/Cloud Work Order recovery.
   Targets the two locally saved YASHO INDS lines shown in the operator's
   screenshot, without reusing 724 (Cloud BBELL). Preserves ALL stock, cutting
   and production data; refuses unsafe changes instead of overwriting records.
*/
(function(){
'use strict';
const key=x=>String(x??'').trim().replace(/\s+/g,' ').toUpperCase();
const json=x=>JSON.parse(JSON.stringify(x));
const el=(tag,txt,klass)=>{const x=document.createElement(tag);if(txt!=null)x.textContent=txt;if(klass)x.className=klass;return x};
const srcWorks=['CFM-723','CFM-724','CFM-725'], expectedParty='YASHO INDS',expectedPO='4100008668';
let dialog=null,current=null,bpc=false,bcloud=false,busy=false;
const ident=r=>[key(r.party),key(r.poNo),Number(r.orderQty)||0,key(r.description)].join('|');
function isYasho(r){return key(r?.party)===expectedParty&&key(r?.poNo)===expectedPO}
function named(arr,no){return (arr||[]).find(x=>key(x.workNo)===no)}
function uniqueWorkNos(arr){const vals=(arr||[]).map(r=>key(r?.workNo)).filter(Boolean);return new Set(vals).size===vals.length}
function forbiddenLinks(local){
 const findings=[];
 const pattern=/(?:^|[^A-Z0-9])CFM-(?:723|724|725)(?!\d)/i;
 for(const [section,records] of Object.entries(local)){
  if(section==='pending'||!Array.isArray(records))continue;
  const hits=records.filter(r=>r&&typeof r==='object'&&pattern.test(JSON.stringify(r)));
  if(hits.length)findings.push(section+' ('+hits.length+' linked rows)');
 }
 return findings;
}
function plan(local,cloud){
 if(!local||!cloud||!Array.isArray(local.pending)||!Array.isArray(cloud.pending))throw Error('Invalid PC / Cloud Pending Orders');
 if(!uniqueWorkNos(local.pending)||!uniqueWorkNos(cloud.pending))throw Error('Duplicate Work Nos detected within PC or Cloud. Manual data review needed.');
 const oldRows=srcWorks.map(no=>named(local.pending,no));
 if(oldRows.some(r=>!r||!isYasho(r)||!(Number(r.orderQty)>0)))
  throw Error('Expected YASHO INDS CFM-723/724/725 with PO 4100008668 and positive quantities not found on this PC. No records changed.');
 const linked=forbiddenLinks(local);
 if(linked.length)throw Error('Linked Cutting / Store / production data found: '+linked.join(', ')+'. Do not renumber automatically; first reconcile linked records using both backups.');
 const cloud723=named(cloud.pending,'CFM-723');
 const cloud724=named(cloud.pending,'CFM-724');
 if(!cloud723||key(cloud723.party)!=='BBELL'||key(cloud723.poNo)!=='BIL262700365'||
    !cloud724||key(cloud724.party)!=='BBELL'||key(cloud724.poNo)!=='BIL262700362')
  throw Error('Expected BBELL Cloud CFM-723/724 changed. No Work Nos altered.');
 const allUsed=new Set([...local.pending,...cloud.pending].map(x=>key(x.workNo)));
 const recovery=new Map();
 for(const old of oldRows){
  const same=(cloud.pending||[]).filter(r=>isYasho(r)&&ident(r)===ident(old));
  if(same.length>1)throw Error('Cloud has multiple matching YASHO orders: '+old.workNo+'. Manual review required.');
  if(same.length===1){
    const target=key(same[0].workNo);
    if(srcWorks.includes(target)||named(local.pending,target))
      throw Error('Existing Cloud YASHO number '+target+' is not safe to reuse.');
    recovery.set(key(old.workNo),target);
  }
 }
 const start=Math.max(725,...[...allUsed].map(s=>Number(s.match(/^CFM-(\d+)$/)?.[1]||0)))+1;
 let next=start;
 const proposals=oldRows.map(old=>{
  const oldNo=key(old.workNo);let fresh=recovery.get(oldNo);
  if(!fresh){while(allUsed.has('CFM-'+next))next++;fresh='CFM-'+next++;allUsed.add(fresh)}
  return {old:oldNo,next:fresh,original:old,alreadyCloud:recovery.has(oldNo)};
 });
 if(new Set(proposals.map(x=>x.next)).size!==proposals.length)throw Error('YASHO lines share a proposed new Work No.');
 const usedCloud=new Set(cloud.pending.map(r=>key(r.workNo)));
 for(const row of proposals){
  const cl= named(cloud.pending,row.next);
  if(cl&&ident(cl)!==ident(row.original))throw Error('Cloud Work No '+row.next+' already has a different Work Order');
  if(!cl&&usedCloud.has(row.next))throw Error('Work No '+row.next+' is occupied in Cloud');
 }
 return proposals;
}
function download(filename,data){
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob);
 try{
  const a=document.createElement('a');a.href=url;a.download=filename;
  document.body.append(a);a.click();a.remove();
 }finally{setTimeout(()=>URL.revokeObjectURL(url),2000)}
}
function setStatus(message,kind='info'){
 const p=document.getElementById('cfmWoFixStatus');
 if(p){p.textContent=message;p.dataset.kind=kind}
}
function setBusy(v){busy=v;for(const btn of dialog?.querySelectorAll('button')||[])btn.disabled=v}
function line(label,content){
 const wrap=el('div',null,'cfm-wo-fix-row');
 wrap.append(el('strong',label),el('span',content));return wrap;
}
function close(){if(dialog?.open)dialog.close();dialog?.remove();dialog=null;current=null;bpc=false;bcloud=false}
function buildUI(cloudRow,proposal){
 dialog?.remove();bpc=false;bcloud=false;
 dialog=el('dialog',null,'cfm-wo-fix-dialog');dialog.id='cfmWoFixDialog';
 const style=el('style');
 style.textContent=`
 #cfmWoFixDialog{box-sizing:border-box;width:min(96vw,720px);max-height:90dvh;overflow:auto;padding:20px;border:1px solid #a1cfd4;border-radius:18px;background:#fff;color:#183e50;box-shadow:0 20px 65px #001a2b80;font:13px/1.55 system-ui}
 #cfmWoFixDialog::backdrop{background:#001a2b99}
 #cfmWoFixDialog h2{font-size:21px;line-height:1.25;color:#075b75;margin:0 0 10px}
 #cfmWoFixDialog p{margin:7px 0 12px}
 #cfmWoFixDialog .cfm-wo-fix-row{display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap;background:#f1f9fc;border:1px solid #d2e7ec;padding:11px 12px;border-radius:9px;margin:8px 0}
 #cfmWoFixDialog .cfm-wo-fix-row strong{min-width:140px;color:#126d7f}
 #cfmWoFixDialog .cfm-wo-fix-row span{flex:1 1 260px}
 #cfmWoFixDialog .cfm-wo-fix-alert{background:#fff5db;color:#865519;border:1px solid #e6ca8e;padding:12px;border-radius:9px;font-weight:800}
 #cfmWoFixDialog .cfm-wo-fix-actions{display:flex;gap:9px;flex-wrap:wrap;margin:12px 0}
 #cfmWoFixDialog button{font:800 12px system-ui;border-radius:8px;padding:11px 14px;border:1px solid #77aec2;background:#eff9ff;color:#125977;cursor:pointer}
 #cfmWoFixDialog .cfm-wo-fix-apply{background:#0a8275;color:#fff;border-color:#076e61}
 #cfmWoFixDialog button:disabled{opacity:.6;cursor:wait}
 #cfmWoFixDialog .cfm-wo-fix-ack{display:flex;align-items:center;gap:9px;margin:12px 0;font-weight:800;background:#edf8f5;padding:12px;border-radius:9px}
 #cfmWoFixDialog .cfm-wo-fix-ack input{width:20px;height:20px;accent-color:#0d8b7c}
 #cfmWoFixDialog .cfm-wo-fix-status{border:1px solid #bfdbe1;border-radius:9px;background:#f0f9fb;padding:12px;font-weight:800;white-space:pre-wrap}
 #cfmWoFixDialog .cfm-wo-fix-status[data-kind="error"]{background:#fff1ee;border-color:#e4a79c;color:#932f21}
 #cfmWoFixDialog .cfm-wo-fix-status[data-kind="success"]{background:#e9f8ed;border-color:#a4d8b1;color:#21613a}
 @media(max-width:540px){#cfmWoFixDialog{padding:14px}#cfmWoFixDialog .cfm-wo-fix-row strong{min-width:100%}}
 `;
 dialog.append(style);
 const title=el('h2','Fix Work Order Numbers — PC + Cloud');
 dialog.append(title,el('p','YASHO ke PC orders aur BBELL ka Cloud order dono bachenge. Kisi Stock, Cutting ya doosre order ko touch nahi kiya jayega.'));
 const badge=el('p','READ BEFORE APPLY: Full PC and Cloud backups compulsory. The proposal is not saved until you explicitly approve.','cfm-wo-fix-alert');dialog.append(badge);
 dialog.append(line('Cloud protected','CFM-723/724 → BBELL • Both Cloud orders unchanged'));
 for(const p of proposal)dialog.append(line('PC • '+p.old,p.original.party+' • '+p.original.poNo+' • Qty '+p.original.orderQty+' → '+p.next+(p.alreadyCloud?' (already in Cloud; recover PC number)':'')));
 const p=el('p','Cloud version '+cloudRow.version+'. Target numbers are rechecked immediately before Save. If someone else updated the Cloud, this operation stops and asks you to review again.');dialog.append(p);
 const actions=el('div',null,'cfm-wo-fix-actions');
 const pc=el('button','1. Download PC Backup');pc.type='button';pc.addEventListener('click',()=>{
  try{download('CFM-PC-before-WO-fix-'+Date.now()+'.json',{source:'PC before WO reconcile',savedAt:new Date().toISOString(),payload:state});bpc=true;setStatus('PC backup download requested. Check Downloads and then download Cloud backup.');}
  catch(e){setStatus('PC backup failed: '+e.message,'error')}
 });
 const online=el('button','2. Download Cloud Backup');online.type='button';online.addEventListener('click',()=>{
  try{download('CFM-Cloud-before-WO-fix-v'+cloudRow.version+'.json',cloudRow);bcloud=true;setStatus('Cloud backup download requested. Check both files in Downloads.');}
  catch(e){setStatus('Cloud backup failed: '+e.message,'error')}
 });
 const apply=el('button','3. Confirm and Fix Work Nos','cfm-wo-fix-apply');apply.type='button';
 const ack=el('label','');ack.className='cfm-wo-fix-ack';
 const checkbox=el('input');checkbox.type='checkbox';
 ack.append(checkbox,el('span','I have checked BOTH JSON backup files in Downloads. I approve renumbering only these two YASHO orders.'));
 apply.addEventListener('click',()=>execute(checkbox.checked));
 const cancel=el('button','Cancel / Keep Everything');cancel.type='button';cancel.addEventListener('click',close);
 actions.append(pc,online,apply,cancel);dialog.append(ack,actions);
 const status=el('p','No changes made. Download BOTH backups before fixing.','cfm-wo-fix-status');status.id='cfmWoFixStatus';status.setAttribute('role','status');dialog.append(status);
 document.body.append(dialog);dialog.showModal();
}
async function show(){
 if(busy)return;
 try{
  if(typeof cloudFetch!=='function')throw Error('Cloud read unavailable. Open ERP and retry.');
  if(typeof state==='undefined'||!Array.isArray(state.pending))throw Error('Local ERP has not loaded yet.');
  if(typeof cloudBusy!=='undefined'&&cloudBusy)throw Error('Cloud sync is busy. Retry after it finishes.');
  if(typeof cloudDirty!=='undefined'&&cloudDirty)throw Error('Unsynced PC edits detected. Export backup and review before changing Work Nos.');
  const remote=await cloudFetch();
  if(!remote||!Array.isArray(remote.payload?.pending))throw Error('Cloud snapshot invalid. No changes made.');
  const proposal=plan(state,remote.payload);current={remote,proposal};
  buildUI(remote,proposal);
 }catch(e){alert('CFM Work No protection: '+(e.message||e)+'. Nothing has changed.')}
}
async function execute(ack,approvedLink=false){
 if(busy)return;
 if(!bpc||!bcloud||!ack){setStatus('Verified PC and Cloud backups are REQUIRED before any Work No can change.','error');return}
 // A separate explicit ?fixwo=approved URL is itself the operator's approval.
 // Ordinary actions continue to require an in-app confirmation.
 const ok=approvedLink||confirm('FINAL CONFIRMATION: Save only YASHO INDS Work Nos '+current.proposal.map(p=>p.old+' → '+p.next).join(', ')+'. Keep BBELL CFM-723/724 unchanged, and do not touch stock/cutting?');
 if(!ok)return;
 setBusy(true);
 let wroteCloud=false;
 try{
  if(typeof cloudBusy!=='undefined'&&cloudBusy)throw Error('Cloud operation busy');
  if(typeof cloudDirty!=='undefined'&&cloudDirty)throw Error('New unsynced local edits detected');
  const mutationAtStart=typeof localMutationSeq!=='undefined'?localMutationSeq:0;
  const originalState=json(state),remote=await cloudFetch();
  if(!remote||Number(remote.version)!==Number(current.remote.version))
   throw Error('Cloud version changed since preview. Nothing written. Close and review again.');
  const currentPlan=plan(state,remote.payload);
  if(JSON.stringify(currentPlan.map(p=>[p.old,p.next,p.alreadyCloud]))!==JSON.stringify(current.proposal.map(p=>[p.old,p.next,p.alreadyCloud])))
   throw Error('Work Nos changed since preview; no data modified.');
  const merged=json(remote.payload);
  for(const item of currentPlan){
   if(!named(merged.pending,item.next)){
    const addition=json(item.original);addition.workNo=item.next;
    addition.updatedAt=new Date().toISOString();
    merged.pending.push(addition);
   }
  }
  if(!uniqueWorkNos(merged.pending))throw Error('New Cloud Work No collision detected.');
  const pendingBefore=remote.payload.pending.length;
  const appended=merged.pending.length-pendingBefore;
  if(appended){
   setStatus('Writing ONLY the two verified Work Orders to Cloud, preserving all other Cloud data…');
   const version=Number(remote.version);
   const url=CLOUD_URL+'/rest/v1/cfm_shared_state?id=eq.main&version=eq.'+version;
   const result=await fetch(url,{method:'PATCH',
     headers:{...cloudHeaders(),'Prefer':'return=representation','x-cfm-base-version':String(version)},
     body:JSON.stringify({payload:merged,version:version+1,updated_at:new Date().toISOString()})});
   if(!result.ok)throw Error('Cloud refused update (HTTP '+result.status+'). No local Work No changed.');
   const rows=await result.json();
   if(!Array.isArray(rows)||rows.length!==1)throw Error('Cloud version conflict. PC is unchanged. Retry Preview after reloading.');
   wroteCloud=true;
  }
  const check=await cloudFetch();
  if(!check||!Array.isArray(check.payload?.pending))throw Error('Cloud verification failed. PC unchanged. Reopen Fix Work Nos to resume.');
  for(const no of ['CFM-723','CFM-724']){
   const originalBBELL=named(remote.payload.pending,no);
   if(ident(named(check.payload.pending,no)||{})!==ident(originalBBELL))
    throw Error('BBELL '+no+' verification failed; PC unchanged.');
  }
  for(const item of currentPlan){
   const saved=named(check.payload.pending,item.next);
   if(!saved||ident(saved)!==ident(item.original))
    throw Error('YASHO order Cloud verification failed for '+item.next+'. PC unchanged. Reopen recovery.');
  }
  // Cloud is verified. Apply PC-only rename, preserving all operational arrays.
  if(typeof localMutationSeq!=='undefined'&&localMutationSeq!==mutationAtStart)
    throw Error('PC records changed during Cloud update; Cloud is verified but PC remains unchanged. Reopen Fix Work Nos to resume.');
  const replacement=json(originalState);
  for(const item of currentPlan){
   const old=named(replacement.pending,item.old);
   if(!old||ident(old)!==ident(item.original))throw Error('PC order changed while syncing. Stop without altering local data.');
   old.workNo=item.next;
  }
  // Recover the two BBELL numbers vacated by the renumbered YASHO rows.
  // Never bulk-import other Cloud orders into the PC: unrelated device
  // conflicts must be handled separately and must not block this fix.
  for(const no of ['CFM-723','CFM-724']){
   const saved=named(check.payload.pending,no);
   if(!saved)throw Error('Cloud BBELL '+no+' unavailable during recovery');
   const exists=named(replacement.pending,no);
   if(!exists)replacement.pending.push(json(saved));
   else if(ident(exists)!==ident(saved))throw Error('Local '+no+' is still occupied by a different order; PC untouched.');
  }
  if(!uniqueWorkNos(replacement.pending))throw Error('Merged PC Work Nos are not unique. No local data changed.');
  const localJson=JSON.stringify(replacement),prev=safeStorage.getItem(STORAGE_KEY);
  safeStorage.setItem(STORAGE_KEY,localJson);
  if(safeStorage.getItem(STORAGE_KEY)!==localJson){safeStorage.setItem(STORAGE_KEY,prev);throw Error('PC browser storage verification failed. Cloud update may be complete; reopen Fix to recover.')}
  state=replacement;
  if(typeof localMutationSeq!=='undefined')localMutationSeq++;
  cloudVersion=Number(check.version)||cloudVersion;
  cloudDirty=false;
  cloudReady=false; // Other PC Stock/Cutting differences may still need review.
  try{syncDerivedState()}catch(e){console.warn(e)}
  try{renderAll()}catch(e){console.error('ERP render after reconciliation',e)}
  try{setCloudBadge('⚠️ Work Nos reconciled • Stock/Cutting sync paused for review','amber')}catch(_){}
  const receipt='YASHO Work Orders safely renumbered on PC and Cloud: '+currentPlan.map(p=>p.old+' → '+p.next).join(', ')+
    '. BBELL CFM-723/724 unchanged. Stock and Cutting were NOT modified. Full PC/Cloud sync remains paused until other data differences are verified.';
  setStatus(receipt,'success');
  for(const btn of dialog.querySelectorAll('button'))btn.disabled=true;
  const done=el('button','Close & View Pending Orders');done.type='button';done.addEventListener('click',()=>{
    close();try{showView('pending')}catch(_){}
  });dialog.querySelector('.cfm-wo-fix-actions').append(done);
 }catch(e){
  setStatus('STOPPED: '+(e?.message||String(e))+
   (wroteCloud?' Cloud may contain the YASHO orders; PC was not overwritten. Open Fix Work Nos again for verified recovery.':' No local Work Nos changed.'),'error');
 }finally{busy=false;if(dialog&&dialog.querySelector('.cfm-wo-fix-status')?.dataset.kind!=='success')setBusy(false)}
}
// V233: link-authorized PC repair. The user's click on an explicitly labeled
// recovery URL is approval, but there is NO write unless BOTH original full
// snapshots are durably backed up and read back from CacheStorage.
// Never touch Cloud using the server alone: exact local PC objects are required.
const AUTO_FLAG='fixwo',AUTO_VALUE='approved',BACKUP_CACHE='cfm-workno-recovery-backups-v233';
async function storeRecoveryBackups(pc,remote){
 if(!window.caches||typeof window.caches.open!=='function')
  throw Error('This browser cannot save protected recovery backups. No Work Nos changed.');
 const cache=await window.caches.open(BACKUP_CACHE);
 const stamp=String(Date.now()),pcUrl=new URL('./cfm-pc-recovery-'+stamp+'.json',window.parent.location.href).href,
  cloudUrl=new URL('./cfm-cloud-recovery-'+stamp+'.json',window.parent.location.href).href;
 const originalPC=JSON.stringify({savedAt:new Date().toISOString(),source:'PC',payload:pc});
 const originalCloud=JSON.stringify({savedAt:new Date().toISOString(),source:'Cloud',snapshot:remote});
 try{
  await cache.put(pcUrl,new Response(originalPC,{headers:{'content-type':'application/json'}}));
  await cache.put(cloudUrl,new Response(originalCloud,{headers:{'content-type':'application/json'}}));
  const pcRead=await cache.match(pcUrl),cloudRead=await cache.match(cloudUrl);
  if(!pcRead||!cloudRead||await pcRead.text()!==originalPC||await cloudRead.text()!==originalCloud)
   throw Error('Recovery backup read-back failed');
 }catch(e){throw Error('Unable to preserve both full snapshots: '+(e.message||e)+'. No Work Nos changed.')}
 return {pcUrl,cloudUrl,stamp};
}
async function downloadRecoveryBackup(url,filename){
 const cache=await window.caches.open(BACKUP_CACHE);
 const response=await cache.match(url);
 if(!response)throw Error('Backup copy no longer available');
 const data=await response.text();
 download(filename,JSON.parse(data));
}
let autoAttempted=false;
async function autoRepairApproved(){
 if(autoAttempted)return;
 autoAttempted=true;
 try{
  if(typeof state==='undefined'||!Array.isArray(state.pending))
   throw Error('ERP has not loaded PC Work Orders');
  if(typeof cloudBusy!=='undefined'&&cloudBusy)
   throw Error('Sync is busy. Close and reopen the approved link after ERP loads.');
  if(typeof cloudDirty!=='undefined'&&cloudDirty)
   throw Error('There are unsynced PC changes. Save the PC backup, then review.');
  const remote=await cloudFetch();
  if(!remote||!Array.isArray(remote.payload?.pending))
   throw Error('Cloud response is invalid');
  const proposed=plan(state,remote.payload);
  // Backup the EXACT snapshots that are about to be checked again by execute.
  const saved=await storeRecoveryBackups(json(state),json(remote));
  current={remote,proposal:proposed};
  buildUI(remote,proposed);
  bpc=bcloud=true;
  setStatus('Both full PC and Cloud snapshots saved and verified in recovery cache. Executing your approved Work No correction…');
  await execute(true,true);
  const status=dialog?.querySelector('.cfm-wo-fix-status');
  if(status?.dataset.kind==='success'){
   const row=dialog.querySelector('.cfm-wo-fix-actions');
   const a=el('button','⬇ Download Original PC Backup');a.type='button';
   a.addEventListener('click',async()=>{try{await downloadRecoveryBackup(saved.pcUrl,'CFM-PC-original-before-fix-'+saved.stamp+'.json')}catch(e){alert(e.message)}});
   const b=el('button','⬇ Download Original Cloud Backup');b.type='button';
   b.addEventListener('click',async()=>{try{await downloadRecoveryBackup(saved.cloudUrl,'CFM-Cloud-original-before-fix-'+saved.stamp+'.json')}catch(e){alert(e.message)}});
   row.append(a,b);
  }
 }catch(e){
  console.warn('Approved Work No recovery safely blocked',e);
  // Keep the error visible without silently changing a single record.
  if(!dialog){
   dialog=el('dialog',null,'cfm-wo-fix-dialog');dialog.id='cfmWoFixDialog';
   dialog.style.cssText='box-sizing:border-box;width:min(96vw,700px);border:2px solid #c69c6e;border-radius:14px;padding:20px;background:#fff;color:#45321b';
   dialog.append(el('h3','Work No correction safely paused'));
   dialog.append(el('p',String(e.message||e)));
   const closeBtn=el('button','Close — Keep All Orders');closeBtn.addEventListener('click',close);
   dialog.append(closeBtn);document.body.append(dialog);dialog.showModal();
  }else setStatus('Correction stopped: '+String(e.message||e)+'. No local Work Nos were changed.','error');
 }
}
function isApprovedLink(){
 try{return new URL(window.parent.location.href).searchParams.get(AUTO_FLAG)===AUTO_VALUE}
 catch(_){return false}
}
if(isApprovedLink()){
 // Run once the ERP's inline script finished loading local state and startup
 // Cloud-read had a chance to finish; do not run during active cloud writes.
 setTimeout(()=>{
  if(typeof cloudBusy!=='undefined'&&cloudBusy){
   setTimeout(()=>autoRepairApproved(),1100);
  }else autoRepairApproved();
 },1900);
}

window.cfmResolveWorkNos=show;
window.cfmWorkNoMergeCheck=Object.freeze({plan,ident,forbiddenLinks});
})();
