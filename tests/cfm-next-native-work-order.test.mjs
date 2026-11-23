import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const form=read('next/work-orders.html');
const shell=read('next/index.html');

test('Native CFM NEXT Work Orders have a standalone authenticated form',()=>{
 assert.match(form,/<title>CFM NEXT • Native Work Orders<\/title>/);
 assert.match(form,/id="orderForm"/);
 assert.match(form,/auth\.signInWithPassword/);
 assert.match(form,/cfm_next_members/);
 assert.match(shell,/href="\.\/work-orders\.html"/);
 const js=form.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(js);
 const stripped=js.replace(/^import [^\n]+\n/gm,'');
 assert.doesNotThrow(()=>new Function(stripped));
});

test('Cloud writes target NEXT-only rows, generate secure unique IDs, require a receipt',()=>{
 assert.match(form,/\.from\('cfm_next_work_orders'\)\.insert\(payload\)/);
 assert.match(form,/crypto\.randomUUID\(\)/);
 assert.match(form,/pendingCreateId/);
 assert.match(form,/await confirmCloud\(id,v,1\)/);
 assert.match(form,/\.eq\('revision',before\.revision\)/);
 assert.match(form,/await confirmCloud\(before\.id,v,before\.revision\+1\)/);
 assert.doesNotMatch(form,/\.from\('cfm_shared_state'\)/);
 assert.doesNotMatch(form,/\.from\('eagle_physical_stock'\)/);
 assert.doesNotMatch(form,/\.from\('cfm_next_records'\)\.(insert|update|delete|upsert)/);
});

test('Legacy Work Orders are reference-only, with no duplicate CFM numbering',()=>{
 assert.match(form,/\.from\('cfm_next_records'\)\.select\('data'\)\.eq\('family','pending'\)/);
 assert.match(form,/id="archiveTab"/);
 assert.match(form,/id="nativeTab"/);
 assert.match(form,/New ERP Work Orders receive/);
 assert.match(form,/NEXT-00001/);
 assert.doesNotMatch(form,/function deleteOrder|\.delete\(\)/);
 assert.match(form,/Offline: Work Order was NOT saved/);
 assert.match(form,/Edit conflict: another phone updated this order/);
});
