import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const full=readFileSync(new URL('../cfm-safe-sync-review-v427.js',import.meta.url),'utf8');
const source=full.slice(full.indexOf('let resuming=false;'),full.indexOf('\nfunction build(){'));
const harness=new Function('scenario',`return (async()=>{
let state={pending:[{workNo:'LOCAL'}],store:[],cutting:[]},cloudBusy=false,cloudReady=false,cloudDirty=true,cloudVersion=10,cloudUpdatedAt='',localMutationSeq=1,stored='',archived=false,downloaded=false;
const remote={version:11,payload:{pending:[{workNo:'CLOUD'}],store:[],cutting:[]}};
const clone=x=>JSON.parse(JSON.stringify(x)),validState=x=>Array.isArray(x?.pending),notice=()=>{},confirm=()=>true;
const cloudFetch=async()=>remote,cloudFetchMeta=async()=>({version:scenario==='changed'?12:11});
const archiveRecovery=async r=>{if(scenario==='archiveFail')throw Error('quota');archived=!!r.device&&!!r.cloud;return JSON.stringify(r)};
const downloadRecovery=()=>{downloaded=true};
const safeStorage={setItem:(k,v)=>{if(scenario==='cacheFail')throw Error('quota');stored=v},getItem:()=>stored};
const STORAGE_KEY='test',ensureExcelMasterData=()=>{},syncDerivedState=()=>{},renderAll=()=>{},setCloudBadge=()=>{},document={getElementById:()=>null};
${source}
await resumeFromCloud();
return {work:state.pending[0].workNo,cloudReady,cloudDirty,cloudVersion,cloudBusy,archived,downloaded};
})()`);
test('V431 recovery archives both states and resumes only verified Cloud cache',async()=>{
 const r=await harness('success');
 assert.deepEqual(r,{work:'CLOUD',cloudReady:true,cloudDirty:false,cloudVersion:11,cloudBusy:false,archived:true,downloaded:true});
});
for(const scenario of ['changed','archiveFail','cacheFail']){
 test('V431 recovery keeps phone active on '+scenario,async()=>{
  const r=await harness(scenario);
  assert.equal(r.work,'LOCAL');assert.equal(r.cloudReady,false);assert.equal(r.cloudDirty,true);
  assert.equal(r.cloudVersion,10);assert.equal(r.cloudBusy,false);
 });
}
test('V431 recovery does not write Cloud',()=>{assert.doesNotMatch(source,/method:\s*['"]PATCH|cloudPush\s*\(/);});
