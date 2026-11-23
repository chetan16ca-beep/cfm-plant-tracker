/* CFM Next interface: new navigation, full legacy production functions retained. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const views=['dashboard','pending','planning','store','cutting','search','excel','docs','print','measurements','srltracker','issues','products','widthreport','openclose','stocksummary','monthly','readydispatch','legacyfull','excelmirror','deptwork','more','backup','settings'];
test('CFM NEXT is a distinct modern interface, not a copy of the old ERP',()=>{
 const next=read('next/index.html'),original=read('index.html');
 assert.notEqual(next,original);
 assert.match(next,/CFM NEXT \| Plant ERP/);
 assert.match(next,/class="shell"/);
 assert.match(next,/id="quickGrid"/);
 assert.match(next,/id="moduleNav"/);
 const inline=next.match(/<script>([\s\S]*?)<\/script>/);
 assert.ok(inline,'new navigation logic exists');
 assert.doesNotThrow(()=>new Function(inline[1]),'new UI script parses');
});
test('Every original primary operational module is reachable from NEXT',()=>{
 const next=read('next/index.html'),original=read('chunks/s2-000.txt');
 const engine=read('chunks/s2-008.txt');
 assert.match(next,/src="\.\.\/index\.html\?cfm-next-shell=1"/,'Production operational engine is reused without data migration');
 assert.match(engine,/window\.showView=function\(name\)/,'Original runtime offers navigation');
 for(const view of views){
  assert.match(next,new RegExp("id:'"+view+"'"),'NEXT links '+view);
  assert.ok(original.includes('id="view-'+view+'"'),'Original operational view is available: '+view);
 }
 assert.doesNotMatch(next,/cfm_next_records|\.from\('cfm_live_snapshot'\)/,'Navigation does not independently write production Cloud');
});
test('Original records, SOP, packing and historic NEXT staging remain in place',()=>{
 assert.ok(existsSync(new URL('../next/staging.html',import.meta.url)));
 assert.ok(existsSync(new URL('../next/entry-center.mjs',import.meta.url)));
 for(const asset of ['cfm-plant-production-sop.js','cfm-packing-slip-dispatch-v355.js','cfm-packing-history-all-v418.js','cfm-eagle-measurement-dropdown-v416.js','cfm-workorder-save-verification-v419.js'])assert.ok(existsSync(new URL('../'+asset,import.meta.url)),asset);
 assert.match(read('index.html'),/app\.srcdoc=src/,'Original engine and data logic preserved');
});

test('CFM NEXT has safe independent Cloud and department shortcuts',()=>{
 const next=read('next/index.html');
 assert.match(next,/id="stagingFrame"/);
 assert.match(next,/src='\.\/staging\.html\?v=next-secure-2'/);
 assert.match(next,/id="cloudHealth"/);
 assert.match(next,/function updateCloudHealth\(\)/);
 assert.match(next,/id="moduleSafety"/);
 assert.match(next,/w\.showView\(modules\[id\]\?\.view\|\|id\)/);
 for(const mod of ['securecloud','stitching','threadcut','gunfinish','packingdept','qcdept','sopdept','maintdept','dispatchhistory']){
   assert.ok(next.includes("id:'"+mod+"'"),'CFM NEXT module present '+mod);
 }
 assert.match(next,/STAGING ONLY/);
 assert.match(read('next/staging.html'),/auth\.signInWithPassword/);
 assert.match(read('next/staging.html'),/cfm_next_members/);
 assert.match(read('next/entry-center.mjs'),/STAGING_REVIEW/);
});
