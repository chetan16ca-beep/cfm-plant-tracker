import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MODULES,isValidEntry,verifyActivityReceipt} from '../next/entry-center.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const owner='ef7fc560-59c6-4389-a198-9b5344db0fba';
const id='7a7dab66-5235-4d85-8ea5-1b6a96974112';
const mk=(module='production_stage')=>({
  id,module,entered_by:owner,work_no:'CFM-764',happened_on:'2026-11-23',
  details:{mode:'STAGING_REVIEW',person:'SUMIT',description:'Verified test specimen',
    fields:{stage:'Cutting',quantity:1}}
});
test('all 10 plant modules are available without enabling live stock writes',()=>{
 const expected=[
  'work_order_draft','store_inward','cutting_review','production_stage',
  'quality_check','packing_review','dispatch_review','sop_check',
  'maintenance','follow_up'
 ];
 assert.deepEqual(MODULES.map(m=>m.id),expected);
 const js=read('next/entry-center.mjs');
 assert.match(js,/cfm_next_activity_log/);
 assert.doesNotMatch(js,/from\('cfm_shared_state'\)|\.update\(\{\s*cutQty|from\('cfm_next_records'\)/);
 assert.match(js,/STAGING_REVIEW/);
 assert.match(js,/createActivityOutbox/);
});
test('client rejects unauthorized or malformed records',()=>{
 assert.equal(isValidEntry(mk(),owner),true);
 assert.equal(isValidEntry(mk(),'different-user'),false);
 assert.equal(isValidEntry({...mk(),module:'stock_debit'},owner),false);
 assert.equal(isValidEntry({...mk(),details:{...mk().details,mode:'ACTUAL_STOCK_POST'}},owner),false);
 assert.equal(isValidEntry({...mk(),work_no:'X'.repeat(91)},owner),false);
});
test('Cloud receipt must match every immutable field',()=>{
 const row=mk();const original=JSON.parse(JSON.stringify(row));
 assert.equal(verifyActivityReceipt({...row,details:{...row.details,fields:{quantity:1,stage:'Cutting'}}},row),true);
 assert.equal(verifyActivityReceipt({...row,details:{...row.details,fields:{quantity:2}}},row),false);
 assert.equal(verifyActivityReceipt({...row,entered_by:'other'},row),false);
 assert.deepEqual(row,original);
});
test('Archived Entry Center and earlier Daily Work entries remain accessible',()=>{
 const html=read('next/staging.html');
 assert.match(html,/id="workflowPanel"/);
 assert.match(html,/id="workflowForm"/);
 assert.match(html,/entry-center\.mjs\?v=1/);
 assert.match(html,/getUser:\(\)=>user/);
 assert.match(html,/entryCenter\.show\(\)/);
 assert.match(html,/entryCenter\.hide\(\)/);
 assert.match(html,/cloud up to date|Cloud up to date/);
});
