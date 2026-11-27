/* CFM V425 — Daily Person Work verified append and safe multi-phone recovery.
   Conflicted phone Work Orders are NEVER uploaded by this module.
   Existing Cloud records, Stock, Cutting and Dispatch are untouched. */
(function(){
'use strict';
const pending=new Map();
let busy=false;
const tag='CFM Daily Work';
const copy=x=>JSON.parse(JSON.stringify(x));
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const $=id=>document.getElementById(id);
function notice(message,ok=false){
  let host=$('view-deptwork')||$('view-dashboard');
  if(!host)return;
  let box=$('cfmDailyCloudReceipt424');
  if(!box){
    box=document.createElement('div');box.id='cfmDailyCloudReceipt424';
    box.style.cssText='padding:11px;margin:10px 8px;border:1px solid #cbd5e1;border-radius:10px;font:700 13px/1.45 system-ui;box-sizing:border-box';
    host.prepend(box);
  }
  box.style.background=ok?'#edfdf3':'#fff8e7';
  box.style.color=ok?'#135638':'#684c12';
  box.textContent=message;
  if(!ok){
    const btn=document.createElement('button');btn.type='button';btn.textContent='Retry Daily Work Cloud Only';
    btn.style.cssText='margin:8px 0 0;display:block;padding:8px;border:1px solid #d7ad5b;background:white;color:#684c12;border-radius:7px;font:700 12px system-ui';
    btn.addEventListener('click',()=>window.cfmRetryDailyPersonCloud424());
    box.append(btn);
  }
}
function eligible(r){
  return !!(r && r.reportOnly===true && typeof r.cfmDailyEntryId==='string'
    && /^CFM-DW-[A-Za-z0-9-]{10,100}$/.test(r.cfmDailyEntryId)
    && String(r.person||'').trim() && String(r.description||'').trim());
}
async function appendOnly(record){
  if(typeof cloudFetch!=='function'||typeof cloudHeaders!=='function'||!CLOUD_URL)
    throw Error('Cloud connection is not available');
  if(!eligible(record))throw Error('Entry is missing its safe Daily Work ID');
  if(cloudBusy)throw Error('Another database save is running. Retry shortly.');
  cloudBusy=true;
  try{for(let attempt=0;attempt<3;attempt++){
    const before=await cloudFetch();
    if(!before||!validState(before.payload))throw Error('Cloud read failed; no changes made');
    const original=Array.isArray(before.payload.departmentWork)?before.payload.departmentWork:[];
    const existing=original.find(x=>x?.cfmDailyEntryId===record.cfmDailyEntryId);
    if(existing){
      if(!same(existing,record))
        throw Error('This ID already exists with different details. No overwrite made');
      return Number(before.version);
    }
    const base=Number(before.version);
    if(!Number.isSafeInteger(base)||base<1)throw Error('Cloud version missing');
    const payload=copy(before.payload);
    payload.departmentWork=original.map(copy).concat(copy(record));
    // Allow exactly one departmentWork append; all other payload families are preserved.
    for(const key of Object.keys(before.payload)){
      if(key==='departmentWork')continue;
      if(JSON.stringify(payload[key])!==JSON.stringify(before.payload[key]))
        throw Error('Unsafe Cloud data difference');
    }
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),18000);
    let rows;
    try{
      const response=await fetch(CLOUD_URL+'/rest/v1/cfm_shared_state?id=eq.main&version=eq.'+base,{
        method:'PATCH',signal:controller.signal,
        headers:{...cloudHeaders(),'Prefer':'return=representation','x-cfm-base-version':String(base)},
        body:JSON.stringify({payload,version:base+1,updated_at:new Date().toISOString()})
      });
      if(!response.ok)throw Error('Cloud write refused (HTTP '+response.status+'). Device entry retained');
      rows=await response.json();
    }finally{clearTimeout(timer)}
    if(!Array.isArray(rows)||!rows.length)continue; // CAS race, reread and retry.
    const verified=await cloudFetch();
    const accepted=(verified?.payload?.departmentWork||[])
      .find(x=>x?.cfmDailyEntryId===record.cfmDailyEntryId);
    if(!accepted||!same(accepted,record))
      throw Error('Cloud receipt was not verified. Recheck before retrying');
    // V425: Never advance the shared full-snapshot version unless the phone's
    // entire uploadable state really equals the verified Cloud copy. Otherwise
    // an old phone could overwrite newer orders on its next normal sync.
    try{
      if(typeof cloudStatePayload==='function' && typeof cloudDirty!=='undefined' &&
         !cloudDirty && JSON.stringify(cloudStatePayload())===JSON.stringify(verified.payload)){
        cloudVersion=Number(verified.version)||base+1;
        cloudUpdatedAt=verified.updated_at||'';
      }
    }catch(error){console.warn('Daily Work receipt: full-state alignment deferred',error)}
    return Number(verified.version);
  }
  throw Error('Other device updated Cloud during save. Retry safely');
  }finally{cloudBusy=false}
}
async function flush(){
  if(busy)return;
  busy=true;
  try{
    while(pending.size){
      const [id,rec]=pending.entries().next().value;
      notice('☁️ Saving Daily Person Work only… Work Orders and Stock untouched');
      try{
        const version=await appendOnly(rec);
        pending.delete(id);
        notice('✓ '+tag+' saved and verified in Cloud v'+version+
               ' • Other phone Work Orders still need separate review',true);
        try{toast('✓ Daily Person Work saved in Cloud')}catch(_){}
      }catch(e){
        const why=String(e?.message||e);
        notice('⚠️ Daily Work Cloud save not verified: '+why+
               '. Your phone entry has NOT been deleted. Do not clear browser data.');
        console.warn('CFM Daily Work append-only save',e);
        break; // Never loop on a failed network or CAS operation.
      }
    }
  }finally{busy=false}
}
// Independent Daily Work delivery also runs when normal full-state Sync is ready.
// The normal full-state save may already be in progress; the append path checks
// the current server first and will deduplicate by immutable entry ID.
window.cfmSaveDailyPersonDirect456=async function(entry){
 if(!eligible(entry))throw Error('Missing worker, activity or entry ID');
 if(busy)throw Error('Daily Work save in progress. Retry shortly.');
 busy=true;
 try{
  notice('Saving Daily Work directly to database…');
  const version=await appendOnly(entry);
  pending.delete(entry.cfmDailyEntryId);
  if(!state.departmentWork.some(r=>r.cfmDailyEntryId===entry.cfmDailyEntryId))state.departmentWork.push(copy(entry));
  try{safeStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch(_){}
  notice('✓ DAILY WORK SAVED · Database verified v'+version,true);
  try{toast('Daily Work SAVED · Database verified')}catch(_){}
  try{if(!cloudDirty)setTimeout(()=>cloudPoll(),0)}catch(_){}
  return true;
 }catch(e){notice('Daily Work not confirmed: '+String(e.message||e)+'. Retry the same form.');throw e}
 finally{busy=false}
};
window.CFM_DAILY_V456={same,appendOnly};
window.cfmSafeDailyPersonCloudSave=function(entry){
  if(!eligible(entry)){notice('Daily Work cannot sync: missing worker, activity or entry ID');return}
  pending.set(entry.cfmDailyEntryId,copy(entry));
  notice('✓ Daily Work entered on phone • Checking Cloud receipt…');
  // Allow the normal debounced save a chance to finish, but never depend on it.
  setTimeout(()=>{void flush()},900);
};
async function recoverLocalDailyWork(){
  if(busy||typeof state==='undefined'||!Array.isArray(state.departmentWork))return;
  if(typeof navigator!=='undefined'&&navigator.onLine===false)return;
  try{
    const cloud=await cloudFetch();
    if(!cloud||!validState(cloud.payload))return;
    const byId=new Map((cloud.payload.departmentWork||[])
      .filter(r=>r&&r.cfmDailyEntryId).map(r=>[r.cfmDailyEntryId,r]));
    // Read-only receive: show newly verified Daily Work from another phone
    // without touching its Work Orders, Store, Cutting, or dispatch history.
    let received=0;
    const known=new Set(state.departmentWork.filter(r=>eligible(r)).map(r=>r.cfmDailyEntryId));
    const editing=!!document.getElementById('editDialog')?.open;
    if(!editing && (typeof cloudBusy==='undefined'||!cloudBusy)){
      for(const remoteRecord of cloud.payload.departmentWork||[]){
        if(!eligible(remoteRecord)||known.has(remoteRecord.cfmDailyEntryId))continue;
        state.departmentWork.push(copy(remoteRecord));
        known.add(remoteRecord.cfmDailyEntryId);
        received++;
      }
      if(received){
        try{safeStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
        catch(error){console.warn('Received Daily Work: phone storage unavailable',error)}
        notice('✓ Received '+received+' Daily Work entries from another mobile • Work Orders and Stock untouched',true);
      }
    }
    let changed=0,conflicts=0;
    for(const record of state.departmentWork){
      if(!eligible(record))continue;
      const server=byId.get(record.cfmDailyEntryId);
      if(!server){pending.set(record.cfmDailyEntryId,copy(record));changed++}
      else if(!same(server,record))conflicts++;
    }
    if(conflicts)notice('⚠️ '+conflicts+' Daily Work edits differ between phone and Cloud. Nothing was overwritten; review before editing again.');
    if(changed)void flush();
  }catch(error){console.warn('Daily Work resume check unavailable',error)}
}
window.addEventListener('online',()=>{setTimeout(()=>void recoverLocalDailyWork(),300)});
document.addEventListener('visibilitychange',()=>{
  if(!document.hidden)setTimeout(()=>void recoverLocalDailyWork(),400);
});
setTimeout(()=>void recoverLocalDailyWork(),2800);
window.cfmRetryDailyPersonCloud424=async function(){
  if(busy){notice('Daily Work Cloud save is already running');return}
  let rows=[];
  try{
    const before=await cloudFetch();
    if(!before||!validState(before.payload))throw Error('Cannot read Cloud');
    const remote=new Set((before.payload.departmentWork||[]).map(x=>x?.cfmDailyEntryId).filter(Boolean));
    rows=(state.departmentWork||[]).filter(r=>eligible(r)&&!remote.has(r.cfmDailyEntryId));
    if(!rows.length){notice('✓ No unsynced V424 Daily Work entries found on this device',true);return}
  }catch(e){notice('Cannot review Daily Work Cloud: '+String(e.message||e));return}
  if(!window.confirm('Sync '+rows.length+' Daily Person Work entries ONLY? Work Orders, Store and Cutting will NOT be changed.'))return;
  rows.forEach(rec=>pending.set(rec.cfmDailyEntryId,copy(rec)));
  void flush();
};
window.cfmRetryDailyPersonCloud425=window.cfmRetryDailyPersonCloud424;
})();
