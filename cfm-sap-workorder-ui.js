/* CFM V212 — SAP-inspired Work Order entry presentation.
 * DOM-only reshaping of existing form controls; NO storage, network,
 * create/update/delete actions, validation changes or save-handler replacements.
 */
(function(){
'use strict';
const id=x=>document.getElementById(x);
const svgNS='http://www.w3.org/2000/svg';
const art={
 order:'<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M9 4V2h6v2M8 10h8M8 14h8M8 18h5"/>',
 product:'<path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10"/>',
 quantity:'<path d="M4 5h16M4 12h16M4 19h16M8 2v20M16 2v20"/>',
 notes:'<path d="M4 3h11l5 5v13H4zM15 3v5h5M8 12h8M8 16h8"/>',
 billing:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5M8 19h8"/>',
 spark:'<path d="m12 3 2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z"/>',
 checklist:'<path d="m4 12 4 4L20 4M11 12h9M11 17h9"/>'
};
function icon(name){
 const s=document.createElementNS(svgNS,'svg');
 s.setAttribute('viewBox','0 0 24 24');s.setAttribute('fill','none');
 s.setAttribute('stroke','currentColor');s.setAttribute('stroke-width','1.8');
 s.setAttribute('stroke-linejoin','round');s.setAttribute('stroke-linecap','round');
 s.setAttribute('aria-hidden','true');s.classList.add('cfm-wo-svg');
 s.innerHTML=art[name]||art.order;return s;
}
const groups=[
 {name:'order',num:'01',title:'Order Information',hint:'Customer, reference, work number and dates',keys:['workNo','party','poNo','orderDate','deliveryDate','priority']},
 {name:'product',num:'02',title:'Product & Material',hint:'Existing product matching, cloth and width',keys:['previousOrderPick','pendingProductPick','eagleCode','itemCode','cloth','width','pendingMeasurementPreview','pendingAutoActions']},
 {name:'quantity',num:'03',title:'Quantity & Production',hint:'Order quantity and automatically linked cutting',keys:['orderQty','cutQty']},
 {name:'notes',num:'04',title:'Technical Descriptions',hint:'Preserve full buyer specification and additional details',keys:['description','description2']},
 {name:'billing',num:'05',title:'Billing & Dispatch',hint:'Invoice, challan and delivery status',keys:['billStatus','challanStatus','billNo','challanNo','dispatchDate','accountsRemark','remark']}
];
function groupCard(name,num,title,hint){
 const el=document.createElement('section');
 el.className='cfm-wo-group cfm-wo-'+name;
 el.dataset.group=name;
 const head=document.createElement('div');head.className='cfm-wo-group-head';
 const iconbox=document.createElement('span');iconbox.className='cfm-wo-icon';iconbox.append(icon(name));
 const info=document.createElement('div');info.className='cfm-wo-group-head-text';
 const heading=document.createElement('h4');heading.textContent=title;
 const desc=document.createElement('p');desc.textContent=hint;
 const step=document.createElement('span');step.className='cfm-wo-step';step.textContent=num;
 info.append(heading,desc);head.append(iconbox,info,step);
 const body=document.createElement('div');body.className='cfm-wo-group-grid';
 el.append(head,body);return {el,body};
}
function decorateLabels(root){
 for(const field of root.querySelectorAll('.field')){
  const input=field.querySelector('input[name],select[name],textarea[name],input[id],select[id],textarea[id]');
  if(!input)continue;
  const name=input.getAttribute('name')||input.id||'';
  if(!name)continue;
  const label=field.querySelector('label');
  if(label&&!label.getAttribute('for')&&!label.querySelector('input,select,textarea')){
   if(!input.id)input.id='cfmWo_'+name.replace(/[^a-zA-Z0-9_]/g,'_');
   label.setAttribute('for',input.id);
  }
  if(['workNo','party','orderQty'].includes(name))field.classList.add('cfm-wo-important');
  if(name==='workNo')field.classList.add('cfm-wo-number');
  if(name==='cutQty')field.classList.add('cfm-wo-locked');
  if(['description','description2','accountsRemark','remark'].includes(name))field.classList.add('cfm-wo-long');
  if(name==='width'&&input.type==='number')input.setAttribute('inputmode','decimal');
  if(name==='orderQty'&&input.type==='number')input.setAttribute('inputmode','decimal');
 }
}
function singleReady(dialog,fields){
 if(!dialog?.open||!fields||dialog.classList.contains('multi-po-dialog'))return false;
 return !!fields.querySelector('[name="workNo"]')&&!!fields.querySelector('[name="poNo"]')&&
  !!fields.querySelector('[name="orderQty"]')&&!!fields.querySelector('#pendingProductPick');
}
function setupSingle(dialog,fields){
 if(fields.dataset.cfmWoStyled==='single')return;
 if(!singleReady(dialog,fields))return;
 const work=fields.querySelector('[name="workNo"]');
 const w=work?.value||'—';
 const title=id('dialogTitle')?.textContent||'Work Order Entry';
 dialog.classList.add('cfm-wo-dialog');
 dialog.classList.remove('cfm-wo-multi-dialog');
 fields.dataset.cfmWoStyled='single';
 const intro=document.createElement('div');intro.className='cfm-wo-intro';
 const left=document.createElement('div');
 const kicker=document.createElement('div');kicker.className='cfm-wo-kicker';kicker.textContent='PRODUCTION MANAGEMENT  /  WORK ORDER';
 const h=document.createElement('h2');h.textContent=title.startsWith('Edit')?'Edit Work Order':'Create Work Order';
 const text=document.createElement('p');text.textContent='Complete each section. Existing master matching and order-save rules remain unchanged.';
 left.append(kicker,h,text);
 const badge=document.createElement('div');badge.className='cfm-wo-current';
 const cap=document.createElement('small');cap.textContent='WORK NO';
 const val=document.createElement('strong');val.textContent=w;
 badge.append(cap,val);intro.append(left,badge);
 const container=document.createElement('div');container.className='cfm-wo-sections';
 const items=new Map();
 const available=Array.from(fields.children);
 available.forEach(el=>{
  if(el.matches?.('.field')){
   const x=el.querySelector('input,select,textarea');
   const key=x?.name||x?.id||'';
   if(key)items.set(key,el);
   if(el.querySelector('#previousOrderPick'))items.set('previousOrderPick',el);
   if(el.querySelector('#pendingProductPick'))items.set('pendingProductPick',el);
   if(el.querySelector('#pendingMeasurementPreview'))items.set('pendingMeasurementPreview',el);
  }
  if(el.matches?.('.field.full')&&el.querySelector('button[onclick*="applyPreviousOrderToForm"]'))items.set('pendingAutoActions',el);
 });
 const moved=new Set();
 for(const group of groups){
  const {el,body}=groupCard(group.name,group.num,group.title,group.hint);
  for(const key of group.keys){
   const field=items.get(key);
   if(field&&!moved.has(field)){body.append(field);moved.add(field)}
  }
  if(body.children.length)container.append(el);
 }
 const unknown=available.filter(el=>!moved.has(el));
 if(unknown.length){
  const {el,body}=groupCard('notes','06','Additional Order Fields','Other existing order details');
  for(const extra of unknown)body.append(extra);
  container.append(el);
 }
 const note=document.createElement('div');note.className='cfm-wo-form-note';
 note.append(icon('checklist'));
 const tx=document.createElement('span');
 tx.textContent='Saving follows the existing ERP workflow. Check PO, quantity and material before Save; cloud sync is confirmed separately.';
 note.append(tx);
 fields.replaceChildren(intro,container,note);
 decorateLabels(fields);
 if(work)work.addEventListener('input',()=>{val.textContent=work.value||'—'});
 const save=id('saveFormBtn');if(save){save.classList.add('cfm-wo-save');save.setAttribute('aria-label','Save Work Order')}
 const actions=dialog.querySelector('.dialog-actions');
 if(actions)actions.classList.add('cfm-wo-footer');
 dialog.querySelector('.dialog-head')?.classList.add('cfm-wo-titlebar');
}
function setupMulti(dialog,fields){
 const shell=fields.querySelector('.multi-po-shell');
 if(!shell||fields.dataset.cfmWoStyled==='multi')return;
 fields.dataset.cfmWoStyled='multi';
 dialog.classList.add('cfm-wo-multi-dialog');dialog.classList.remove('cfm-wo-dialog');
 const intro=document.createElement('div');intro.className='cfm-wo-intro cfm-wo-intro-multi';
 const content=document.createElement('div');
 const kicker=document.createElement('div');kicker.className='cfm-wo-kicker';kicker.textContent='PRODUCTION MANAGEMENT / MULTI-ITEM PURCHASE ORDER';
 const h=document.createElement('h2');h.textContent='Create Multiple Work Orders';
 const p=document.createElement('p');p.textContent='One PO, multiple individual Work Nos. Check every item before saving.';
 content.append(kicker,h,p);intro.append(content);
 shell.prepend(intro);
 const title=(name,num,label)=>{
  const el=document.createElement('div');el.className='cfm-wo-inline-heading';
  const ico=document.createElement('span');ico.className='cfm-wo-icon';ico.append(icon(name));
  const strong=document.createElement('strong');strong.textContent=num+'  '+label;
  el.append(ico,strong);return el;
 };
 const top=shell.querySelector('.multi-po-top');
 if(top)top.before(title('order','01','PO & Customer Details'));
 const section=shell.querySelector('.multi-po-title h3');
 if(section)section.textContent='02  Order Line Items';
 const save=id('saveFormBtn');if(save){save.classList.add('cfm-wo-save');save.setAttribute('aria-label','Save All PO Work Orders')}
 dialog.querySelector('.dialog-actions')?.classList.add('cfm-wo-footer');
 dialog.querySelector('.dialog-head')?.classList.add('cfm-wo-titlebar');
 decorateLabels(shell);
}
function apply(){
 const dialog=id('editDialog'),fields=id('formFields');
 if(!dialog||!fields)return;
 if(!dialog.open){dialog.classList.remove('cfm-wo-dialog','cfm-wo-multi-dialog');return}
 if(dialog.classList.contains('multi-po-dialog'))setupMulti(dialog,fields);
 else setupSingle(dialog,fields);
}
let pending=false;
function schedule(){
 if(pending)return;pending=true;
 Promise.resolve().then(()=>{pending=false;apply()});
}
function init(){
 const dlg=id('editDialog');if(!dlg)return;
 const observer=new MutationObserver(list=>{
  if(list.some(x=>x.type==='childList'||x.type==='attributes'))schedule();
 });
 observer.observe(dlg,{subtree:true,childList:true,attributes:true,attributeFilter:['class','open']});
 dlg.addEventListener('close',()=>{
  dlg.classList.remove('cfm-wo-dialog','cfm-wo-multi-dialog');
  const fields=id('formFields');if(fields)delete fields.dataset.cfmWoStyled;
  id('saveFormBtn')?.classList.remove('cfm-wo-save');
  dlg.querySelector('.dialog-actions')?.classList.remove('cfm-wo-footer');
  dlg.querySelector('.dialog-head')?.classList.remove('cfm-wo-titlebar');
 });
 schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();