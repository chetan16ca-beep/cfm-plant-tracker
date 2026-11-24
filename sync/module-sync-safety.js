/* CFM module sync safety utilities — isolated, opt-in, no live writes.
 * Never auto-merge divergent stock, dispatch or work-order records.
 */
(function(root){
  'use strict';
  const modules=new Set(['work_orders','store_srl','cutting','daily_work','batch_reports','packing_slips','dispatch','measurements','product_master','issue_register','sop']);
  function stable(value){
    if(Array.isArray(value))return value.map(stable);
    if(value&&typeof value==='object')return Object.keys(value).sort().reduce((o,k)=>(o[k]=stable(value[k]),o),{});
    return value;
  }
  function compare(local,remote){
    if(remote==null)return {action:'create',reason:'missing-cloud'};
    if(local==null)return {action:'keep-cloud',reason:'missing-device'};
    if(JSON.stringify(stable(local))===JSON.stringify(stable(remote)))return {action:'unchanged'};
    return {action:'manual-review',reason:'divergent-records',local,remote};
  }
  function plan(module,localRows,remoteRows,keyOf){
    if(!modules.has(module))throw Error('Unsupported module: '+module);
    if(typeof keyOf!=='function')throw Error('keyOf function required');
    const local=new Map(),remote=new Map();
    for(const row of localRows){const key=String(keyOf(row)||'');if(!key||local.has(key))throw Error('Missing/duplicate local key: '+key);local.set(key,row)}
    for(const row of remoteRows){const key=String(keyOf(row)||'');if(!key||remote.has(key))throw Error('Missing/duplicate cloud key: '+key);remote.set(key,row)}
    return [...new Set([...local.keys(),...remote.keys()])].sort().map(key=>({module,key,...compare(local.get(key),remote.get(key))}));
  }
  root.CFMModuleSyncSafety=Object.freeze({compare,plan});
})(typeof window!=='undefined'?window:globalThis);
