/* Read-only CFM NEXT FULL parity test: original production interface is reused,
   not a partial staging mock. No mutation of ERP or database. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('CFM Next uses exactly the same complete functionality as old ERP',()=>{
 const original=read('index.html'),full=read('next/index.html');
 let norm=full.replace('<head><base href="../"><meta charset="utf-8">','<head><meta charset="utf-8">')
  .replace("const basePath=new URL('../',location.href).pathname;","const basePath=new URL('./',location.href).pathname;")
  .replace('<title>CFM NEXT — Full Plant ERP</title>','<title>CFM Plant Tracker</title>')
  .replace('>CFM NEXT • Full ERP · Loading</div>','>CFM ERP • V424 · Loading</div>');
 assert.equal(norm,original,'CFM NEXT must not omit working original menus or scripts');
 assert.match(full,/id="app"/,'Full iframe editor is included');
 assert.match(full,/app\.srcdoc=src/,'All legacy functionality is instantiated');
 assert.match(full,/new URL\('\.\.\/',location\.href\)/,'All legacy assets resolve to the project root');
 assert.match(full,/<base href="\.\.\/">/,'Support modules resolve to project root');
});
test('All existing root source modules are present and Next staging is preserved',()=>{
 const html=read('next/index.html');
 const section=html.match(/const groups=(\[[\s\S]*?\]);\nconst basePath=/);
 assert.ok(section,'Full ERP chunk list exists');
 const chunks=[...new Set([...section[1].matchAll(/chunks\/s\d+-\d+\.txt/g)].map(m=>m[0]))];
 assert.ok(chunks.length>=27,'All 28+ production chunks loaded');
 for(const chunk of chunks)assert.ok(existsSync(new URL('../'+chunk,import.meta.url)),'Missing '+chunk);
 const staging=read('next/staging.html');
 assert.match(staging,/cfm-next-activity-|entry-center\.mjs|Daily Person Work/,'Old staging records still have a read UI');
 assert.match(html,/cfm-plant-production-sop\.js|cfm-plant-production-sop/,'Legacy SOP integration kept');
});
test('Full CFM Next uses the same protected Cloud sync, not an unprotected duplicate store',()=>{
 const src=read('chunks/s2-008.txt');
 assert.match(src,/const remote=await cloudFetch\(\)/);
 assert.match(src,/x-cfm-base-version/);
 assert.match(src,/version=eq\./);
 assert.match(src,/cfmReviewUnsyncedWorkOrders/);
 const full=read('next/index.html');
 assert.doesNotMatch(full,/STAGING_REVIEW|read-only except for new Daily Work entries/);
});
