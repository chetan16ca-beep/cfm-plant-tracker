/* CFM V347: read-only operator health center and device-only appearance preferences. */
(function(){
'use strict';
const KEY='cfm-operator-ui-preferences-v1';
const $=id=>document.getElementById(id);
const E=(tag,txt)=>{const node=document.createElement(tag);if(txt!==undefined)node.textContent=txt;return node};
const errors=[];
window.addEventListener('error',e=>{errors.push(String(e.message||'Runtime error').slice(0,100));if(errors.length>8)errors.shift()});
window.addEventListener('unhandledrejection',e=>{errors.push(String(e.reason||'Operation failed').slice(0,100));if(errors.length>8)errors.shift()});
function getPref(){
 try{const p=JSON.parse(localStorage.getItem(KEY)||'{}');return {comfortable:p.comfortable===true,reduceMotion:p.reduceMotion===true}}catch(e){return {comfortable:false,reduceMotion:false}}
}
function apply(p){
 document.body.classList.toggle('cfm-operator-comfortable',p.comfortable);
 document.body.classList.toggle('cfm-operator-reduced-motion',p.reduceMotion);
}
function check(){
 try{
  if(typeof state==='undefined'||!state)return 'ERP data not loaded. Reopen Cloud Work Orders and retry.';
  const orders=Array.isArray(state.pending)?state.pending:[];
  const store=Array.isArray(state.store)?state.store:[];
  const cutting=Array.isArray(state.cutting)?state.cutting:[];
  const numbers=orders.map(x=>Number(String(x.workNo||'').match(/[0-9]+$/)?.[0]||0)).filter(Number.isFinite);
  const max=numbers.length?Math.max(...numbers):0;
  const noMeter=store.filter(x=>['METER_PENDING','METER_NOT_CONFIRMED'].includes(String(x._physicalReconStatus||''))).length;
  const estimated=store.filter(x=>x._physicalReconStatus==='ESTIMATED').length;
  const cloud=(typeof cloudReady!=='undefined'&&cloudReady)?'Connected':'Not verified';
  const v=(typeof cloudVersion!=='undefined'&&cloudVersion)?String(cloudVersion):'—';
  return 'Cloud: '+cloud+' · Version '+v+'\nWork Order rows: '+orders.length+' · Highest: CFM-'+max+
  '\nStore SRL: '+store.length+' · Cutting rows: '+cutting.length+
  '\nPhysical meter pending: '+noMeter+' · Estimated rolls: '+estimated+
  '\nErrors captured since load: '+errors.length+(errors.length?'\nLatest: '+errors.at(-1):'')+
  '\nRead-only: No ERP data was edited.';
 }catch(e){return 'Check unavailable: '+String(e.message||e)}
}
function showModule(name){try{if(typeof showView==='function')return showView(name)}catch(e){}alert('Open '+name+' in ERP menu')}
function mount(){
 const root=$('view-settings');if(!root||$('cfmOperatorSafety347'))return;
 const css=E('style');
 css.textContent="body.cfm-operator-reduced-motion *,body.cfm-operator-reduced-motion *::before,body.cfm-operator-reduced-motion *::after{animation-duration:.001ms!important;transition-duration:.001ms!important}"+
 "body.cfm-operator-comfortable .view:not(#view-dashboard) .panel{padding:16px!important}body.cfm-operator-comfortable .view:not(#view-dashboard) .data-card{padding:14px!important}"+
 "#cfmOperatorSafety347{border:1px solid #b7d9e9;border-radius:10px;background:#f6fbff;margin:0 0 10px}"+
 "#cfmOperatorSafety347>summary{padding:11px 12px;cursor:pointer;color:#164766;font:800 13px system-ui}"+
 "#cfmOperatorSafety347 .inner{padding:10px;border-top:1px solid #d7e7f0}"+
 "#cfmOperatorSafety347 .actions{display:flex;flex-wrap:wrap;gap:7px;margin:9px 0}"+
 "#cfmOperatorSafety347 pre{white-space:pre-wrap;font:12px/1.5 system-ui;background:white;border:1px solid #cadfe9;border-radius:8px;padding:10px;color:#183a55}"+
 "#cfmOperatorSafety347 .hint{font:11px/1.4 system-ui;color:#526b7e}";
 document.head.append(css);
 const section=E('details');section.id='cfmOperatorSafety347';
 section.append(E('summary','🛡 ERP Safety & Operator Settings ▾'));
 const content=E('div');content.className='inner';
 const description=E('p','Display preferences only (this device). Product, GST, work order, stock and SOP data are unchanged.');description.className='hint';content.append(description);
 const options=E('div');options.className='actions';
 const pref=getPref();
 for(const [label,prop,inverted] of [['Compact layout','comfortable',true],['Reduce motion','reduceMotion',false]]){
  const input=E('input');input.type='checkbox';input.checked=inverted?!pref[prop]:pref[prop];
  const tag=E('label');tag.style.cssText='display:flex;align-items:center;gap:5px;font:700 12px system-ui';
  tag.append(input,E('span',label));
  input.addEventListener('change',()=>{
   pref[prop]=inverted?!input.checked:input.checked;apply(pref);
   try{localStorage.setItem(KEY,JSON.stringify(pref));notice.textContent='Preference saved on this device'}catch(e){notice.textContent='Local storage unavailable. Setting is temporary.'}
  });options.append(tag);
 }
 const notice=E('small');notice.className='hint';content.append(options,notice);
 const actions=E('div');actions.className='actions';
 const output=E('pre','Select Check System to view current status.');output.setAttribute('role','status');
 for(const [label,fn] of [
  ['Check System',()=>{output.textContent=check()}],
  ['Backup / Export',()=>showModule('backup')],
  ['Product Master',()=>showModule('products')],
  ['Measurement Master',()=>showModule('measurements')]
 ]){
  const button=E('button',label);button.type='button';button.className='btn btn-sm';button.addEventListener('click',fn);actions.append(button);
 }
 content.append(actions,output);section.append(content);
 const head=root.querySelector('.section-head');if(head)head.after(section);else root.prepend(section);
 apply(pref);
}
window.cfmOperatorSafetyCheck=check;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();