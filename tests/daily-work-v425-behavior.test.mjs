import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// The live Cloud endpoint is NEVER contacted by this test.
const moduleSource=readFileSync(new URL('../cfm-daily-person-safe-cloud-v424.js',import.meta.url),'utf8');
const clone=value=>JSON.parse(JSON.stringify(value));
const base=()=>({pending:[{workNo:'CFM-764',party:'Rainchem',orderQty:2}],
  store:[{srlNo:'0275',quality:'222 ANT DFR'}],
  cutting:[{workNo:'CFM-764',cutQty:2}],departmentWork:[]});
const entry={cfmDailyEntryId:'CFM-DW-11111111-2222-4333-8444-555555555555',
  reportOnly:true,person:'Sumit',description:'Cutting support',doneQty:1,
  date:'2026-11-23',process:'CUTTING',workNo:'CFM-764'};
const delay=ms=>new Promise(done=>setTimeout(done,ms));
function buildPhone(db,state){
  const win={events:{},addEventListener(name,callback){this.events[name]=callback},confirm(){return true}};
  const doc={hidden:false,events:{},getElementById(){return null},addEventListener(name,callback){this.events[name]=callback}};
  const context={
    window:win,document:doc,navigator:{onLine:true},console,
    state,cloudVersion:db.version,cloudUpdatedAt:'',cloudDirty:false,cloudReady:true,cloudBusy:false,
    CLOUD_URL:'https://mock.invalid',STORAGE_KEY:'mock-state',
    safeStorage:{setItem(){}},cloudHeaders:()=>({'x-test':'local'}),
    validState:payload=>!!payload&&Array.isArray(payload.departmentWork),
    cloudStatePayload:()=>clone(state),toast(){},AbortController,
    cloudFetch:async()=>clone({payload:db.payload,version:db.version,updated_at:'now'}),
    fetch:async(url,options)=>{
      assert.match(url,/mock\.invalid\/rest\/v1\/cfm_shared_state/);
      assert.equal(options.method,'PATCH');
      const expected=Number(url.match(/version=eq\.(\d+)/)?.[1]);
      if(expected!==db.version)return {ok:true,json:async()=>[]};
      const body=JSON.parse(options.body);
      db.payload=clone(body.payload);
      db.version=body.version;
      return {ok:true,json:async()=>[{version:db.version,updated_at:'now'}]};
    },
    setTimeout:(fn,ms)=>setTimeout(fn,[900,2800,400,300].includes(ms)?10:ms),
    clearTimeout:(timer)=>clearTimeout(timer)
  };
  vm.runInNewContext(moduleSource,context,{timeout:1000});
  return {window:win,document:doc,context,state};
}
test('V425 saves Daily Work with Cloud receipt even when normal sync reports ready',async()=>{
  const db={version:1417,payload:base()};
  const local=base();local.departmentWork.push(clone(entry));
  const phone=buildPhone(db,local);
  phone.window.cfmSafeDailyPersonCloudSave(entry);
  await delay(130);
  assert.equal(db.version,1418,'Cloud version advanced exactly once');
  assert.equal(db.payload.departmentWork.length,1);
  assert.equal(db.payload.departmentWork[0].cfmDailyEntryId,entry.cfmDailyEntryId);
  assert.deepEqual(db.payload.pending,base().pending);
  assert.deepEqual(db.payload.store,base().store);
  assert.deepEqual(db.payload.cutting,base().cutting);
  phone.window.cfmSafeDailyPersonCloudSave(entry);
  await delay(130);
  assert.equal(db.payload.departmentWork.length,1,'Retry is idempotent');
});
test('V425 receives another phone Daily Work without replacing conflicting Work Orders',async()=>{
  const db={version:1418,payload:base()};
  db.payload.departmentWork.push(clone(entry));
  const local=base();local.pending[0].party='Locally-edited-party';
  const phone=buildPhone(db,local);
  await delay(130);
  assert.equal(local.pending[0].party,'Locally-edited-party','Unsafe order replacement blocked');
  assert.equal(local.departmentWork.length,1,'Verified new daily entry received');
  assert.equal(local.departmentWork[0].cfmDailyEntryId,entry.cfmDailyEntryId);
  assert.equal(db.payload.pending[0].party,'Rainchem','Cloud order also unchanged');
});