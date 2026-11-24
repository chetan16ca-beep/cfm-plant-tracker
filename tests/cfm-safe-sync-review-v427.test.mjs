/* V427 old CFM ERP: read-only cross-phone sync review regression. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext,Script} from 'node:vm';
const src=readFileSync(new URL('../cfm-safe-sync-review-v427.js',import.meta.url),'utf8');
const old=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function api(){
 const w={};
 const document={readyState:'loading',addEventListener(){}};
 runInNewContext(src,{window:w,document,console},{timeout:1000});
 return w.CFM_SYNC_REVIEW_V427;
}
test('Safe Sync script is loaded only in the original CFM ERP and parses',()=>{
 assert.doesNotThrow(()=>new Script(src));
 assert.match(old,/cfm-safe-sync-review-v427\.js\?v=430/);
 assert.match(src,/☁️ Safe Sync Check/);
 assert.match(src,/const response=await cloudFetch\(\)/);
 const a=api();assert.equal(typeof a.summary,'function');
});
test('Safe Sync review never runs a full-snapshot write or modifies local stock',()=>{
 assert.doesNotMatch(src,/cloudPush\s*\(|queueCloudPush\s*\(|setItem\s*\(|\.from\s*\(|method:\s*['"]PATCH|fetch\s*\(\s*CLOUD_URL/i);
 assert.match(src,/window\.cfmReviewUnsyncedWorkOrders/);
 assert.match(src,/window\.cfmRetryDailyPersonCloud425/);
 assert.match(src,/window\.parent\.cfmDownloadBackup/);
});
test('Safe Sync reports phone-only Work Orders, SRL and same-number collisions',()=>{
 const review=api();
 const local={
   pending:[{workNo:'CFM-700',party:'ACME',poNo:'A1',orderQty:3,description:'CF BAG'},
    {workNo:'CFM-701',party:'BETA',poNo:'B1',orderQty:4,description:'ANFD'}],
   store:[{srlNo:'EFPPL03/0300'}],
   cutting:[{workNo:'CFM-700'}],
   departmentWork:[{cfmDailyEntryId:'CFM-DW-abc123456789'}]
 };
 const remote={
   pending:[{workNo:'CFM-700',party:'OTHER COMPANY',poNo:'A1',orderQty:3,description:'CF BAG'},
    {workNo:'CFM-702',party:'GAMMA',poNo:'C1',orderQty:4,description:'ANFD'}],
   store:[{srlNo:'EFPPL03/0400'}],
   cutting:[],departmentWork:[]
 };
 const r=review.summary(local,remote);
 assert.equal(r.needsReview,true);
 assert.equal(r.missingWork.join(','),'CFM-701');
 assert.equal(r.missingRemoteWork.join(','),'CFM-702');
 assert.equal(r.diff.join(','),'CFM-700');
 assert.equal(r.missingSRL.join(','),'EFPPL03/0300');
 assert.equal(r.newRemoteSRL.join(','),'EFPPL03/0400');
 assert.equal(r.missingDaily.length,1);
 assert.equal(r.cutting[0],1);assert.equal(r.cutting[1],0);
});

test('V430 Work Now offers safe existing Direct Cloud operations, not full phone sync',()=>{
 assert.match(src,/id='cfmWorkNow430'/);
 assert.match(src,/fast-work-order\.html\?v=430/);
 assert.match(src,/cloud-workorders\.html\?v=430/);
 assert.match(src,/Save is complete only when Cloud confirmed appears/);
 assert.match(src,/Store\/Cutting changes are NOT covered/);
});
