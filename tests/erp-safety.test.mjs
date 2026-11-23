/* Read-only CI regression preflight for CFM. Does NOT create a Work Order. */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { Script } from 'node:vm';
const file=p=>new URL('../'+p,import.meta.url),read=p=>readFileSync(file(p),'utf8');
let checks=0;
function ok(v,m){assert.ok(v,m);checks++;console.log('✓ '+m)}
function has(p,x){ok(read(p).includes(x),p+' includes '+x)}
const index=read('index.html');
const chunks=[...new Set([...index.matchAll(/chunks\/s\d-\d+\.txt/g)].map(x=>x[0]))];
ok(chunks.length>=27,'All source code chunks are referenced by the loader');
for(const p of chunks)ok(existsSync(file(p)),'Source chunk present: '+p);
const scripts=[
 'backup-safe.js','backup-guardian.js','cfm-sap-workorder-ui.js',
 'cfm-workno-reconcile.js','cfm-efppl-master-v330.js',
 'cfm-sop-register.js','cfm-department-sop-v319.js','cfm-plant-production-sop.js',
 'cfm-dashboard-compact-v343.js','cfm-theme-a-v344.js',
 'cfm-dashboard-bottom-v345.js','cfm-operator-safety-v347.js','cfm-cutting-reconciliation.js',
 'cfm-intelligence-core.js'
];
for(const p of scripts){
 ok(existsSync(file(p)),'ERP support script present: '+p);
 try{new Script(read(p),{filename:p})}catch(e){throw new Error('Syntax error in '+p+': '+e.message)}
 checks++;
}
for(const p of ['cfm-submodules-compact-v346.css','cfm-standalone-compact-v346.css','fast-work-order.html','po-workorder.html','cutting-print-live.html'])
 ok(existsSync(file(p)),'Critical workspace available: '+p);
has('fast-work-order.html','cfm_fast_po_reference');
has('fast-work-order.html','cfm_append_pending_orders');
has('chunks/s2-008.txt','function physicalStockSummary()');
has('chunks/s2-008.txt','function srlBalance(');
has('chunks/s2-008.txt','function renderPending()');
has('chunks/s2-008.txt',"selectedStatus==='DISPATCHED'");
has('chunks/s2-008.txt','async function cloudInit()');
has('backup-safe.js','indexedDB');
has('backup-guardian.js','indexedDB');
has('cfm-theme-a-v344.js','physicalStockSummary');
has('cfm-dashboard-bottom-v345.js','cfmV195DashboardAudit');
has('cfm-operator-safety-v347.js','cfmOperatorSafetyCheck');
has('index.html','cfm-operator-safety-v347.js?v=347');
for(const p of ['cfm-theme-a-v344.js','cfm-dashboard-bottom-v345.js','cfm-dashboard-compact-v343.js'])
 has('index.html',p);
const sop=read('cfm-plant-production-sop.js'), worker=read('chunks/s3-000.txt');
ok(sop.includes("if (kind === 'department') return; // Person work reports always save"), 'Daily Person Work save bypasses SOP hold');
ok(sop.includes("kind === 'order' || kind === 'department'"), 'Daily Work form does not require production SOP approval');
ok(worker.includes('rec.reportOnly=true;'), 'Daily Worker entries are logged as report-only');
ok(sop.includes('r.reportOnly !== true'), 'SOP production handover excludes report-only worker logs');
ok(worker.includes('x.reportOnly!==true'), 'Stage availability previews exclude unverified worker logs');
ok(sop.includes('supervisor:supervisor.trim(),reportOnly:false'), 'Verified Batch stage entries remain handover eligible');
has('index.html','cfm-plant-production-sop.js?v=423');
ok(!index.includes('cfm-jessi-voice.js'),'Removed Jessi is not loaded again');
console.log('CFM read-only deployment safety checks passed: '+checks);
