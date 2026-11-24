/* Original CFM Android Cloud storage safety regression tests.
   Read-only: never creates/updates work orders or stock. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../chunks/s2-008.txt',import.meta.url),'utf8');
const original=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const disabled=readFileSync(new URL('../next/index.html',import.meta.url),'utf8');

test('CFM Cloud headers never require localStorage capacity',()=>{
 const start=source.indexOf("const CLOUD_CODE_STORAGE='cfm-cloud-code-v1'");
 const end=source.indexOf('window.changeCloudCode',start);
 assert.ok(start>0&&end>start);
 const code=source.slice(start,end);
 assert.doesNotThrow(()=>new Function(code));
 assert.match(code,/safeStorage\.getItem\(CLOUD_CODE_STORAGE\)!==CLOUD_KEY/);
 assert.match(code,/catch\(e\)\{console\.warn\('Keeping Cloud code in memory/);
 assert.match(code,/return true;/);
});

test('CFM Cloud poll handles full phone storage without dropping fetched Cloud state',()=>{
 const start=source.indexOf('async function cloudPoll()');
 const end=source.indexOf('const $=id=>document.getElementById',start);
 assert.ok(start>0&&end>start);
 const code=source.slice(start,end);
 assert.doesNotThrow(()=>new Function(code));
 assert.match(code,/if\(cloudBusy\|\|cloudDirty\|\|document\.hidden/);
 assert.match(code,/let phoneCacheOkay=true/);
 assert.match(code,/catch\(e\)\{phoneCacheOkay=false/);
 assert.match(code,/try\{renderAll\(\)\}/);
 assert.match(code,/phone cache limited/);
});

test('Original ERP does not erase local recovery history when quota is exceeded',()=>{
 const start=source.indexOf('function save(doRender=true,options=null)');
 const end=source.indexOf('function toast(',start);
 assert.ok(start>0&&end>start);
 const code=source.slice(start,end);
 assert.match(code,/cloudDirty=true;queueCloudPush\(\)/);
 assert.match(code,/Keep ERP open until Cloud verified/);
 assert.doesNotMatch(code,/removeItem\(HISTORY_KEY\)/);
 assert.match(source,/version=eq\./);
});

test('NEXT is disabled without deleting old CFM operations',()=>{
 assert.match(disabled,/CFM NEXT बंद/);
 assert.match(disabled,/href="\.\.\/index\.html"/);
 assert.match(original,/app\.srcdoc=src/);
 assert.match(original,/cfm-workorder-save-verification-v419\.js/);
});
