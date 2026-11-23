/* V420 Cloud sync hotfix guard: read-only source checks. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const chunk=readFileSync(new URL('../chunks/s2-008.txt',import.meta.url),'utf8');
const i=chunk.indexOf('async function cloudPush(force=false)');
const j=chunk.indexOf('async function cloudPoll()',i);
test('Cloud write reconciles protected SRL and Work No before snapshot',()=>{
  assert.ok(i>=0&&j>i,'Cloud push code must exist');
  const src=chunk.slice(i,j);
  assert.doesNotThrow(()=>new Function(src),'Cloud sync Javascript syntax must compile');
  assert.ok(src.indexOf('const remote=await cloudFetch()')<src.indexOf('const snapshot=clone(state)'),'Cloud state must be checked before constructing write payload');
  assert.match(src,/num\(remote\.version\)!==baseVersion/,'Cloud version guard must reject stale devices');
  assert.match(src,/\[\['pending','workNo'\],\['store','srlNo'\]\]/,'Both protected record families must be preserved');
  assert.match(src,/localRows\.push\(clone\(item\)\)/,'Only missing Cloud rows may be restored');
  assert.match(src,/Historical Cutting\/Customer data differs/,'Cutting history must not be discarded');
  assert.match(src,/version=eq\./,'Cloud CAS must remain enabled');
});
test('Live shell and service worker use the same cache namespace',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
  const match=html.match(/const urls=groups\.flat\(\), ver='([^']+)'/);
  assert.ok(match,'Shell declares a chunk-cache version');
  assert.ok(sw.includes("const CACHE='cfm-plant-ui-"+match[1]+"-cached-chunks'"),'Service Worker cache version matches shell');
  assert.match(html,/V423 LIVE/,'Shell identifies latest deployed release');
});

test('V421 manual recovery shows device Work Orders and safeguards Cloud sections',()=>{
 const begin=chunk.indexOf('// V421: device-only Work Order recovery.');
 const end=chunk.indexOf('async function cloudPoll()',begin);
 assert.ok(begin>0 && end>begin, 'recovery module must be loaded inside shared sync code');
 const recovery=chunk.slice(begin,end);
 assert.doesNotThrow(()=>new Function(recovery), 'manual recovery module syntax must compile');
 assert.match(recovery,/cfmReviewUnsyncedWorkOrders/, 'safe review action exists');
 assert.match(recovery,/selected\.size/, 'selected orders required');
 assert.match(recovery,/const revised=clone\(fresh\.payload\)/, 'Cloud must be the base rather than stale device data');
 assert.match(recovery,/revised\.pending\[index\]=clone\(x\.local\)/, 'Only selected Work Order row is substituted');
 assert.match(recovery,/num\(fresh\.version\)!==num\(cloud\.version\)/, 'recheck Cloud version');
 assert.match(recovery,/version=eq\./, 'compare and swap before Cloud save');
 assert.match(recovery,/const confirmed=await cloudFetch\(\)/, 'verify Cloud after write');
 assert.match(recovery,/cloudReady=false;cloudDirty=false/, 'do not silently resume unsafe full state upload');
 assert.match(recovery,/if\(!cloudReady\)\{await cloudInit\(\);if\(!cloudReady\)\{await window\.cfmReviewUnsyncedWorkOrders\(\)/, 'manual Sync must surface recovery UI');
 assert.doesNotMatch(recovery,/state=clone\(fresh\.payload\)/, 'must preserve unsynced device data');
});

test('Batch / Person Reports panel script parses and button exists',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const start='<script id="cfm-v275-reconstructed-reports">';
 const a=html.indexOf(start), b=html.indexOf('</script>',a+start.length);
 assert.ok(a>=0&&b>a,'Report panel module must be present in index');
 const js=html.slice(a+start.length,b);
 assert.doesNotThrow(()=>new Function(js),'Report panel JavaScript should parse without syntax errors');
 assert.match(js,/open\.id='cfmResultOpen'/,'Batch report entrypoint exists');
 assert.match(html,/Batch \/ Person Reports/,'Dashboard button exists');
 assert.match(html,/const outer=document\.getElementById\('cfmResultOpen'\)/,'Dashboard button targets report panel');
});
