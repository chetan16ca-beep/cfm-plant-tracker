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
test('V420 shell deploy uses new cache namespace',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
  assert.match(html,/20261123-v420/);
  assert.match(sw,/20261123-v420/);
});
