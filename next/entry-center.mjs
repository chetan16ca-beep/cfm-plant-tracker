/* CFM NEXT — Department Entry Center (staging-only, multi-phone).
   All entries are immutable Cloud rows; this module never edits existing
   Work Orders, Store balances, Cutting history, Packing status or Dispatch.
*/
export const MODULES=[
 {id:'work_order_draft',title:'Work Order Request',hint:'Draft request only. Live CFM Work No is not allocated here.',fields:[['party','Company / Party','text',true],['poNo','Customer PO No','text',false],['product','Product / Description','text',true],['quantity','Order Qty','number',true],['eagleCode','EFPPL Product Code','text',false]]},
 {id:'store_inward',title:'Store / Material Inward',hint:'Inward review only. Physical stock and live SRL balance do not change.',fields:[['srl','SRL No','text',true],['cloth','Cloth / Material','text',true],['width','Width (inch)','number',true],['meters','Received Meter','number',true],['supplier','Supplier','text',false]]},
 {id:'cutting_review',title:'Cutting Entry Review',hint:'Cutting review only. No SRL meters deducted or cutting balance posted.',fields:[['srl','Cloth SRL','text',true],['part','Cutting Part / Size','text',true],['quantity','Cut Qty (pieces)','number',true],['meters','Used Meters (if known)','number',false]]},
 {id:'production_stage',title:'Department Work Progress',hint:'Production-stage note. For actual Daily Person Work use Daily Worker Report. This does not perform SOP handover.',fields:[['stage','Department Stage','choice',true,['Cutting','Stitching','Thread Cutting','Gun Finishing','Packing']],['operation','Operation / Sub-work','text',true],['quantity','Done Qty','number',true]]},
 {id:'quality_check',title:'QC Inspection',hint:'QC evidence only. Does not mark final QC passed in original ERP.',fields:[['result','Inspection Result','choice',true,['PASS','HOLD','REWORK','REJECT']],['quantity','Inspected Qty','number',true],['rejectedQty','Rejected Qty','number',false],['checklist','Checklist / Inspection Notes','text',true]]},
 {id:'packing_review',title:'Packing / Label Check',hint:'Packing check only. Does not dispatch stock or create a final packing slip.',fields:[['bundle','Bundle / Packing Ref','text',true],['quantity','Packed Qty','number',true],['labelStatus','Stitch / Packing Label','choice',true,['Verified','Pending','Reprint Required']],['poNo','PO Number','text',false]]},
 {id:'dispatch_review',title:'Dispatch Verification',hint:'Dispatch review only. Does not set Work Order status to DISPATCHED.',fields:[['quantity','Dispatch Qty','number',true],['dispatchTo','Destination / Party','text',true],['vehicle','Vehicle No','text',false],['documentNo','Challan / LR Number','text',false]]},
 {id:'sop_check',title:'Department SOP Checklist',hint:'SOP checklist evidence. Does not unlock production handover or bypass real SOP.',fields:[['stage','Department / SOP','choice',true,['Cutting','Stitching','Thread Cutting','Gun Finishing','Packing','Final QC','Store','Material Receiving','Plant Cleaning','Machine Cleaning','Electrical Cleaning','Dispatch']],['result','Checklist Status','choice',true,['Checked','Needs Correction','Pending Supervisor']],['checklist','SOP No / Checklist Items','text',true]]},
 {id:'maintenance',title:'Machine / Cleaning Log',hint:'Plant maintenance log for review.',fields:[['equipment','Machine / Area','text',true],['action','Cleaning / Repair Work','text',true],['result','Result','choice',true,['Completed','Pending','Needs Follow-up']]]},
 {id:'follow_up',title:'Follow-up / Customer Note',hint:'Follow-up history only. Does not edit customer ledger or pending order.',fields:[['party','Company / Party','text',true],['nextDate','Next Follow-up Date','date',false],['subject','Follow-up Subject','text',true]]}
];
const allowed=new Set(MODULES.map(x=>x.id));
export function isValidEntry(entry,owner){
 if(!entry||!owner||!allowed.has(entry.module)||entry.entered_by!==owner)return false;
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/.test(String(entry.id||'')))return false;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(entry.happened_on||'')))return false;
 if(typeof entry.work_no!=='string'||entry.work_no.length>90)return false;
 const d=entry.details;
 if(!d||typeof d!=='object'||Array.isArray(d)||d.mode!=='STAGING_REVIEW'||!d.fields||typeof d.fields!=='object')return false;
 if(!String(d.person||'').trim()||!String(d.description||'').trim())return false;
 return true;
}
export function verifyActivityReceipt(remote,local){
 if(!remote||!local)return false;
 if(remote.id!==local.id||remote.module!==local.module||remote.entered_by!==local.entered_by||
   remote.work_no!==local.work_no||remote.happened_on!==local.happened_on)return false;
 return JSON.stringify(sortValue(remote.details))===JSON.stringify(sortValue(local.details));
}
function sortValue(x){
 if(Array.isArray(x))return x.map(sortValue);
 if(x&&typeof x==='object')
  return Object.fromEntries(Object.keys(x).sort().map(key=>[key,sortValue(x[key])]));
 return x;
}
export function createActivityOutbox(idb){
 let dbPromise=null;
 const open=()=>{
  if(dbPromise)return dbPromise;
  if(!idb)return Promise.reject(Error('IndexedDB unavailable; cannot guarantee phone save'));
  dbPromise=new Promise((resolve,reject)=>{
   const req=idb.open('cfm-next-activity-outbox',1);
   req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('events'))
     req.result.createObjectStore('events',{keyPath:'id'})};
   req.onsuccess=()=>resolve(req.result);
   req.onerror=()=>reject(req.error||Error('Cannot open secure phone outbox'));
   req.onblocked=()=>reject(Error('Storage busy in another tab'));
  }).catch(e=>{dbPromise=null;throw e});
  return dbPromise;
 };
 const transact=async(mode,call)=>{
  const db=await open();
  return new Promise((resolve,reject)=>{
   let result;
   const tx=db.transaction('events',mode),store=tx.objectStore('events');
   tx.oncomplete=()=>resolve(result);
   tx.onabort=()=>reject(tx.error||Error('Phone transaction aborted'));
   try{call(store,(x)=>{result=x})}catch(e){try{tx.abort()}catch(_){}reject(e)}
  });
 };
 return {
  async put(owner,entry){
   if(!isValidEntry(entry,owner))throw Error('Invalid activity entry');
   await transact('readwrite',s=>s.put({id:entry.id,owner,entry}));
  },
  async list(owner){
   return transact('readonly',(s,set)=>{
    const req=s.getAll();
    req.onsuccess=()=>set((req.result||[]).filter(x=>x.owner===owner).map(x=>x.entry));
   });
  },
  async remove(owner,id){
   await transact('readwrite',s=>{
    const req=s.get(id);
    req.onsuccess=()=>{if(req.result?.owner===owner)s.delete(id)};
   });
  }
 };
}
export function setupCFMNextEntryCenter({db,getUser,getRole,getWorkOrders,getWorkers}){
 const panel=document.getElementById('workflowPanel');
 const notice=document.getElementById('workflowNotice');
 const controls=document.getElementById('workflowTabs');
 const form=document.getElementById('workflowForm');
 const log=document.getElementById('workflowLog');
 const receipt=document.getElementById('workflowReceipt');
 const sync=document.getElementById('workflowSync');
 const outbox=createActivityOutbox(window.indexedDB);
 let selected=MODULES[0],current=[],busy=false,refreshing=false,visible=false;
 const $=id=>document.getElementById(id);
 const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
 const newNode=(tag,attrs={})=>{
  const n=document.createElement(tag);
  for(const [k,v] of Object.entries(attrs)){if(k==='text')n.textContent=v;else n.setAttribute(k,v)}
  return n;
 };
 function hint(s,bad=false){receipt.textContent=s;receipt.style.color=bad?'#a12626':'#24614b'}
 function optionChoice(select,value,text){select.add(new Option(text,value))}
 function formField(field){
  const [name,label,type,required,opts]=field;
  const wrap=newNode('div'),lab=newNode('label',{text:label+(required?' *':'')});
  const input=type==='choice'?newNode('select',{name}):newNode('input',{name,type:type||'text'});
  if(type==='choice'){optionChoice(input,'','Select '+label);for(const x of opts)optionChoice(input,x,x)}
  if(required)input.required=true;
  if(type==='number'){input.min=0;input.step='any';input.max=1000000}
  if(type==='text')input.maxLength=220;
  wrap.append(lab,input);return wrap;
 }
 function renderForm(){
  controls.replaceChildren();
  MODULES.forEach(mod=>{
   const b=newNode('button',{type:'button',text:mod.title});
   if(mod.id===selected.id)b.className='active';
   b.addEventListener('click',()=>{selected=mod;renderForm();void refresh()});
   controls.append(b);
  });
  form.replaceChildren();
  const h=newNode('div',{class:'notice',text:selected.hint+
   ' • Entries are STAGING REVIEW records until every live workflow is independently tested.'});
  form.append(h);
  const grid=newNode('div',{class:'form'});
  grid.append(formField(['happened_on','Work Date','date',true]));
  const searchWrap=newNode('div');
  searchWrap.append(newNode('label',{text:'Work Order (optional)'}));
  const search=newNode('input',{type:'search',placeholder:'Search Work No / Party / Product',id:'workflowWoSearch'});
  search.style.marginBottom='5px';
  const select=newNode('select',{name:'work_no',id:'workflowWo'});
  const manual=newNode('input',{type:'text',id:'workflowWoManual',placeholder:'Type CFM-764 or 764'});
  manual.maxLength=90;manual.className='hide';manual.style.marginTop='6px';
  const refreshOrders=()=>{
   const q=search.value.trim().toLowerCase(),prior=select.value;
   select.replaceChildren();optionChoice(select,'','Manual / No Work No');
   const list=getWorkOrders().slice().sort((a,b)=>Number(String(b.workNo||'').match(/\d+$/)?.[0]||0)-Number(String(a.workNo||'').match(/\d+$/)?.[0]||0));
   list.filter(x=>[x.workNo,x.party,x.description].join(' ').toLowerCase().includes(q))
       .forEach(x=>optionChoice(select,String(x.workNo||''),[x.workNo,x.party,String(x.description||'').slice(0,50)].filter(Boolean).join(' • ')));
   optionChoice(select,'__MANUAL__','＋ Type Work No manually');
   if([...select.options].some(x=>x.value===prior))select.value=prior;
   manual.classList.toggle('hide',select.value!=='__MANUAL__');
  };
  search.addEventListener('input',refreshOrders);
  select.addEventListener('change',()=>manual.classList.toggle('hide',select.value!=='__MANUAL__'));
  searchWrap.append(search,select,manual);grid.append(searchWrap);refreshOrders();
  const workerWrap=newNode('div');
  workerWrap.append(newNode('label',{text:'Person / Supervisor *'}));
  const worker=newNode('select',{name:'person',id:'workflowPerson'});
  optionChoice(worker,'','Select Person');
  const known=[...new Set(getWorkers().map(x=>String(x||'').trim()).filter(Boolean))];
  known.forEach(x=>optionChoice(worker,x,x));
  optionChoice(worker,'__MANUAL__','＋ Add Person');
  worker.required=true;
  const workerOther=newNode('input',{type:'text',id:'workflowPersonManual',placeholder:'Person name'});
  workerOther.className='hide';workerOther.maxLength=80;workerOther.style.marginTop='6px';
  worker.addEventListener('change',()=>{workerOther.classList.toggle('hide',worker.value!=='__MANUAL__');workerOther.required=worker.value==='__MANUAL__'});
  workerWrap.append(worker,workerOther);grid.append(workerWrap);
  const note=formField(['description','Work details / Remark','text',true]);
  for(const f of selected.fields)grid.append(formField(f));
  grid.append(note);
  form.append(grid);
  const save=newNode('button',{type:'submit',id:'workflowSave',text:'Save Staging Entry • Verify Cloud'});
  save.className='primary';
  form.append(save);
  form.querySelector('[name="happened_on"]').value=
   new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
  notice.textContent='Staging-only: Live Work Order numbers, Physical Stock, Cutting balance and Dispatch status are NOT changed.';
 }
 function activitySignature(entry){
  const d=entry.details||{},f=d.fields||{};
  return JSON.stringify([entry.module,entry.work_no,entry.happened_on,
   String(d.person||'').toUpperCase(),String(d.description||'').toUpperCase(),f]);
 }
 async function flush(){
  const user=getUser();if(!user||busy)return;
  busy=true;
  try{
   for(let i=0;i<100;i++){
    const queue=await outbox.list(user.id);
    sync.textContent=queue.length?'Pending Cloud verification: '+queue.length:'Cloud entries verified';
    if(!queue.length)break;
    if(navigator.onLine===false)break;
    const item=queue[0];
    const {error}=await db.from('cfm_next_activity_log').upsert(item,{onConflict:'id',ignoreDuplicates:true});
    if(error)throw Error('Cloud save: '+error.message);
    const {data:remote,error:readError}=await db.from('cfm_next_activity_log')
      .select('id,module,work_no,happened_on,details,entered_by').eq('id',item.id).maybeSingle();
    if(readError||!verifyActivityReceipt(remote,item))
      throw Error('Cloud receipt not confirmed; phone entry retained');
    await outbox.remove(user.id,item.id);
    hint('✓ '+selected.title+' Cloud Verified • '+item.id.slice(0,8));
   }
   if(visible)void refresh();
  }catch(e){
   hint('⚠️ Entry retained on phone; Cloud not verified: '+String(e?.message||e)+
    '. Do not clear browser data or save the same entry again.',true);
  }finally{busy=false}
 }
 async function refresh(){
  if(!visible||refreshing||!getUser())return;
  refreshing=true;
  try{
   const {data,error}=await db.from('cfm_next_activity_log')
    .select('id,module,work_no,happened_on,details,entered_by,created_at')
    .eq('module',selected.id).order('created_at',{ascending:false}).limit(150);
   if(error)throw error;
   current=data||[];log.replaceChildren();
   const h=newNode('h3',{text:selected.title+' • Cloud History ('+current.length+' latest)'});
   log.append(h);
   if(!current.length)log.append(newNode('p',{class:'muted',text:'No staging entries saved yet.'}));
   for(const r of current){
    const d=r.details||{};
    const item=newNode('details');
    const summary=newNode('summary',{text:[r.happened_on,r.work_no||'No WO',d.person,
      String(d.description||'').slice(0,70)].filter(Boolean).join(' • ')});
    const pre=newNode('pre',{text:JSON.stringify({
     module:MODULES.find(m=>m.id===r.module)?.title||r.module,
     workNo:r.work_no,date:r.happened_on,person:d.person,remark:d.description,fields:d.fields,
     entryId:r.id,CloudSavedAt:r.created_at,stagingOnly:true
    },null,2)});
    item.append(summary,pre);log.append(item);
   }
  }catch(e){log.textContent='Cloud read unavailable: '+String(e?.message||e)+'. Old history remains unchanged.'}
  finally{refreshing=false}
 }
 form.addEventListener('submit',async evt=>{
  evt.preventDefault();
  const user=getUser(),role=getRole(),f=evt.currentTarget;
  if(!user||!['admin','supervisor','operator'].includes(role)){hint('Account is not permitted to add entries',true);return}
  const btn=$('workflowSave');if(!btn||btn.disabled)return;
  const v=Object.fromEntries(new FormData(f));
  const manual=$('workflowWoManual')?.value.trim()||'';
  const workNo=v.work_no==='__MANUAL__'?manual:v.work_no||'';
  const person=v.person==='__MANUAL__'?$('workflowPersonManual')?.value.trim():String(v.person||'').trim();
  const description=String(v.description||'').trim();
  if(!person||!description){hint('Select person and enter work details',true);return}
  const fields={};
  for(const field of selected.fields){
   const [name,,type,required]=field;
   const raw=String(v[name]||'').trim();
   if(required&&!raw){hint('Please complete '+field[1],true);return}
   if(type==='number'&&raw){const n=Number(raw);if(!Number.isFinite(n)||n<0||n>1000000){
    hint('Invalid quantity: '+field[1],true);return}fields[name]=n}
   else fields[name]=raw;
  }
  if(selected.id==='quality_check' && Number(fields.rejectedQty||0)>Number(fields.quantity||0)){
   hint('Rejected Qty cannot be greater than Inspected Qty',true);return
  }
  const id=crypto.randomUUID();
  const entry={id,module:selected.id,work_no:String(workNo||'').trim(),
   happened_on:String(v.happened_on||''),entered_by:user.id,
   details:{mode:'STAGING_REVIEW',person,description,fields,createdBy:user.email}};
  if(!isValidEntry(entry,user.id)){hint('Please complete all required fields',true);return}
  btn.disabled=true;let phoneSaved=false;
  try{
   const prior=await outbox.list(user.id);
   const same=prior.some(x=>activitySignature(x)===activitySignature(entry));
   if(same&&!confirm('Matching entry already pending on this phone. Save another intentionally?')){
     hint('Existing phone entry kept; no duplicate added.');void flush();return
   }
   await outbox.put(user.id,entry);
   phoneSaved=true;
   hint('✓ Saved safely on phone • Cloud verification in progress');
   f.reset();renderForm();
   await flush();
  }catch(e){
   hint((phoneSaved?'Phone entry saved; Cloud pending: ':'Phone save failed: ')+
    String(e?.message||e)+'. Do not clear browser data.',true);
  }finally{btn.disabled=false}
 });
 sync.addEventListener('click',()=>void flush());
 window.addEventListener('online',()=>void flush());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&visible){void flush();void refresh()}});
 setInterval(()=>{if(visible&&getUser()&&navigator.onLine){void flush();void refresh()}},30000);
 renderForm();
 return {
  show(){visible=true;panel.classList.remove('hide');renderForm();void refresh();void flush()},
  hide(){visible=false;panel.classList.add('hide')},
  refresh,
  showModule(id){const mod=MODULES.find(x=>x.id===id);if(mod)selected=mod;this.show()}
 };
}
