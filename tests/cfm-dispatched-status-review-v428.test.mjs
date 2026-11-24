import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../chunks/s2-008.txt',import.meta.url),'utf8');
const recovery=src.slice(src.indexOf('// V421: device-only Work Order recovery.'),src.indexOf('async function cloudPoll()'));
test('CFM V428 recovery parses and keeps Cloud version guards',()=>{
 assert.doesNotThrow(()=>new Function(recovery));
 assert.match(recovery,/num\(fresh\.version\)!==num\(cloud\.version\)/);
 assert.match(recovery,/const revised=clone\(fresh\.payload\)/);
 assert.match(recovery,/version=eq\./);
});
test('Already-dispatched status-only phone differences are not unsaved Work Orders',()=>{
 const start=recovery.indexOf('const cfmDispatchedStatusOnly=');
 const end=recovery.indexOf('const cloudDispatchedOnly=',start);
 assert.ok(start>=0&&end>start);
 const fn=new Function('normalize','return (function(){'+recovery.slice(start,end)+'return cfmDispatchedStatusOnly})()')(x=>String(x??'').toUpperCase());
 assert.equal(fn({server:{status:'DISPATCHED'},changed:['status']}),true);
 assert.equal(fn({server:{status:'DISPATCHED'},changed:['status','orderQty']}),false);
 assert.equal(fn({server:{status:'PENDING'},changed:['status']}),false);
 assert.equal(fn({server:null,changed:['NEW WORK ORDER']}),false);
 assert.match(recovery,/const diffs=allDiffs\.filter\(x=>!cfmDispatchedStatusOnly\(x\)\)/);
 assert.match(recovery,/not unsaved, excluded from recovery/);
});
test('Dispatched Cloud Work Orders cannot be selected or overwritten',()=>{
 assert.match(recovery,/const unsafeDispatch=!!item\.server&&normalize\(item\.server\.status\)==='DISPATCHED'/);
 assert.match(recovery,/check\.disabled=unsafeCut\|\|unsafeDispatch/);
 assert.match(recovery,/normalize\(x\.server\.status\)==='DISPATCHED'/);
 assert.match(recovery,/save\.disabled=true/);
});
