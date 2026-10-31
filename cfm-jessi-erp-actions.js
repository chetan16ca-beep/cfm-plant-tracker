/* Jessi V219 voice-to-ERP drafts. No direct mutation of live ERP data.
 * Work Orders open existing Add form after Cloud duplicate check and explicit review.
 * Cutting opens existing form only after device + Cloud, SRL width, physical meter
 * and native meter calculation verification. Save guard runs capture phase.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const norm=s=>String(s??'').trim().toUpperCase().replace(/\s+/g,' ');
const arr=(s,k)=>Array.isArray(s?.[k])?s[k]:[];
const number=v=>v===''||v==null?null:(Number.isFinite(Number(v))?Number(v):null);
const digits=s=>String(s??'').replace(/[०-९૦-૯]/g,c=>{
 const a='०१२३४५६७८९',b='૦૧૨૩૪૫૬૭૮૯';return String(Math.max(a.indexOf(c),b.indexOf(c)));
});
const clean=s=>digits(s).replace(/सी\s*एफ\s*एम|सीएफएम|સી\s*એફ\s*એમ/gi,'CFM').trim();
const idFrom=q=>{
 const qn=norm(q);
 const m=qn.match(/\bCFM[\s-]*(\d{1,6})\b/);
 if(m)return 'CFM-'+m[1];
 const w=qn.match(/(?:\bWORK\s*(?:ORDER|NO|NUMBER)\b|वर्क\s*ऑर्डर|વર્ક\s*ઓર્ડર)\s*[:#-]?\s*(\d{1,6})\b/);
 return w?'CFM-'+w[1]:'';
};
const srlFrom=q=>{const m=norm(q).match(/\bEFPPL[A-Z0-9]*\s*\/\s*\d+\b/);return m?m[0].replace(/\s+/g,''):''};
const fmt=v=>String(Math.round(v*1000)/1000);
let draft=null,stamp=0,guardClean=null,preparing=false;
function source(){
 try{const s=window.CFMIntelCore?.snapshot?.();
  return s&&Array.isArray(s.pending)&&Array.isArray(s.store)&&Array.isArray(s.cutting)?s:null;
 }catch(_){return null}
}
function fields(text){
 const q=clean(text);
 const qN=norm(q);
 const qtyMatch=q.match(/(?:\b(?:qty|quantity)\b|क्वांटिटी|कितने|જથ્થો)\s*[:= -]*(\d+(?:\.\d+)?)/i)||
  q.match(/(?:\b(\d+(?:\.\d+)?)\s*(?:pieces?|pcs?\.?|nos?\.?|numbers?|bags?)\b|(\d+(?:\.\d+)?)\s*(?:पीस|नग|બેગ|પીસ))/i)||
  q.match(/\b(\d+(?:\.\d+)?)\s+(?:cutting|कटिंग|કટિંગ)\b/i);
 const size=q.match(/(\d+(?:\.\d+)?)\s*(?:x|×|\*|by)\s*(\d+(?:\.\d+)?)/i);
 const meter=q.match(/(?:actual|verified|measured|used|physical|वास्तविक|असली|मापा)\s*(?:used\s*)?(?:mtr|meter|meters|metre|मीटर|મીટર)?\s*[:= -]*(\d+(?:\.\d+)?)(?:\s*(?:mtr|meter|meters|मीटर|મીટર))?/i)||
 q.match(/(?:mtr|meter|meters|metre|मीटर|મીટર)\s*[:= -]*(\d+(?:\.\d+)?)/i)||
 q.match(/\b(\d+(?:\.\d+)?)\s*(?:mtr|meter|meters|metre|मीटर|મીટર)\b/i);
 const party=q.match(/(?:\bparty\b|पार्टी|પાર્ટી)\s*[:= -]+\s*(.+?)(?=\s+(?:\bqty\b|\bquantity\b|\bpo\b|\b\d+(?:\.\d+)?\s*(?:nos|pcs|pieces|bags)|\bcloth\b|\bdescription\b|\bSRL\b|\bEFPPL)\b|$)/i);
 const po=q.match(/\bPO\s*(?:NO|NUMBER|#)?\s*[:= -]+\s*([A-Z0-9/._-]+)/i);
 const cloth=q.match(/(?:\bcloth\b|कपड़ा|कापड|કાપડ|material)\s*[:= -]+\s*([A-Z0-9][A-Z0-9 -]{0,18})/i);
 const priority=qN.match(/\b(HIGH|URGENT|NORMAL|LOW)\b/);
 const command={
  workNo:idFrom(q),srlNo:srlFrom(q),qty:qtyMatch?Number(qtyMatch[1]||qtyMatch[2]):null,
  width:size?Number(size[2]):null,length:size?Number(size[1]):null,
  usedMtr:meter?Number(meter[1]):null,party:party?party[1].trim():'',
  po:po?po[1]:'',cloth:cloth?cloth[1].trim():'',priority:priority?priority[1]:'',
  raw:q
 };
 return command;
}
function classify(text){
 const q=norm(clean(text));
 const create=/\b(CREATE|ADD|NEW|BANAO|BANA|BANA DO|BANADO|KARO|KARNA|ENTER|ENTRY|SAVE|REGISTER)\b|बनाओ|बनाना|बना दो|जोड़ो|जोड़ो|करो|करना|डालो|डालना|बनवा|बनादो|બનાવો|જોડો|કરો/i.test(q);
 const explicitCreate=/\b(CREATE|ADD|NEW|BANAO|BANA|BANA DO|BANADO|ENTRY|REGISTER|MAKE)\b|बनाओ|बनाना|बना दो|बनादो|बनवा|जोड़ो|जोड़ो|डालो|બનાવો|જોડો/i.test(q);
 const cut=/\b(CUTTING|CUT|CUTT)\b|कटिंग|काटिंग|કટિંગ/i.test(q);
 const work=/\b(WORK\s*ORDER|WORK\s*NO|WORKORDER|WO|ORDER)\b|वर्क\s*[ऑआ]र्डर|वर्क\s*नंबर|वो\s*बनाओ|વર્ક\s*ઓર્ડર/i.test(q);
 const informational=/\b(STATUS|DETAIL|DETAILS|CHECK|SHOW|SEARCH|FIND|REPORT|PENDING|STOCK|HOW|WHAT|KITNA|KITNE)\b|स्थिति|स्टेटस|दिखाओ|बता[ओय]|कितना|કેટલા/i.test(q);
 const plainCut=/\b(DONE|COMPLETE|COMPLETED)\b|कर दिया|हो गया|डन|पूरी|કર્યું/i.test(q);
 if(cut&&(create||plainCut)&&(!informational||explicitCreate))return 'cutting';
 if(work&&explicitCreate&&!informational)return 'order';
 return '';
}
function missingOf(d){
 const c=d.value, missing=[];
 if(!/^CFM-\d{1,6}$/.test(norm(c.workNo)))missing.push('Work No');
 if(!Number.isSafeInteger(number(c.qty))||!(number(c.qty)>0))missing.push('Quantity');
 if(d.kind==='order'){
  if(!String(c.party||'').trim())missing.push('Party');
 }else{
  if(!String(c.srlNo||'').trim())missing.push('SRL');
  if(!(number(c.length)>0)||!(number(c.width)>0))missing.push('Cutting size L×W');
  if(!(number(c.usedMtr)>0))missing.push('Measured MTR');
 }
 return missing;
}
function speakable(kind,info){
 const remaining=missingOf({kind,value:info});
 if(remaining.length)
  return 'Jessi ready hai. '+(kind==='order'?'Work Order':'Cutting Entry')+
   ' banane ke liye '+remaining.join(', ')+' batao. Ek-ek karke bhi bol sakte ho. Draft neeche khul gaya hai. Save abhi nahi hua.';
 return (kind==='order'?'Work Order':'Cutting')+
  ' draft ready hai. Neeche details check karo, confirmation select karo, phir Verify aur Open Form dabao. Final Save aapko karna hoga.';
}
function panel(){
 const dialog=$('cfmAiDialog'),chat=dialog?.querySelector('.cfm-ai-chat');
 if(!chat)return null;
 let card=$('cfmJessiDraft');
 if(!card){
  card=document.createElement('section');card.id='cfmJessiDraft';card.className='cfm-jessi-draft';
  const compose=chat.querySelector('#cfmAiQuestionForm');if(compose)compose.before(card);else chat.append(card);
 }
 return card;
}
function updateDraft(){
 const box=panel();if(!box||!draft)return;
 const d=draft,c=d.value;
 box.replaceChildren();
 const title=document.createElement('div');title.className='cfm-jessi-draft-title';
 const h=document.createElement('strong');h.textContent=d.kind==='order'?'Jessi · New Work Order Draft':'Jessi · Cutting Entry Draft';
 const tag=document.createElement('span');tag.textContent='NOT SAVED';title.append(h,tag);box.append(title);
 const grid=document.createElement('div');grid.className='cfm-jessi-draft-grid';
 function input(label,key,type='text',hint=''){
  const cell=document.createElement('label');cell.className='cfm-jessi-draft-field';
  const name=document.createElement('span');name.textContent=label;
  const field=document.createElement('input');field.type=type;field.value=c[key]??'';field.dataset.jessiKey=key;field.autocomplete='off';
  if(type==='number'){field.min='0';field.step='any';field.inputMode='decimal'}
  field.addEventListener('input',()=>{c[key]=field.value;stamp++;showIssues()});
  cell.append(name,field);
  if(hint){const small=document.createElement('small');small.textContent=hint;cell.append(small)}
  grid.append(cell);
 }
 input('Work No','workNo');
 if(d.kind==='order'){
  input('Party / Customer','party');
  input('Order Quantity (bags)','qty','number');
  input('PO / Reference','po');
  input('Product Description','description');
  input('Cloth Quality (optional)','cloth');
 }else{
  input('Physical Store SRL (complete)','srlNo');
  input('Today Cut Qty (Work Order units)','qty','number','Must not exceed remaining Order Qty. Part-cut quantities are separate.');
  input('Cut Piece Length (inch)','length','number');
  input('Cut Piece Width (inch)','width','number');
  input('Measured Used MTR (actual)','usedMtr','number','Must be physically verified. NOT estimated from L×W.');
 }
 box.append(grid);
 if(d.kind==='order'){
  const suggest=document.createElement('button');
  suggest.id='cfmJessiNextWorkNo';suggest.type='button';suggest.className='cfm-jessi-suggest';
  suggest.textContent='☁ Suggest Next Work No (Cloud checked)';
  suggest.addEventListener('click',suggestNextNumber);
  box.append(suggest);
 }
 const issues=document.createElement('div');issues.className='cfm-jessi-draft-checks';issues.id='cfmJessiDraftChecks';issues.setAttribute('role','status');box.append(issues);
 const confirmation=document.createElement('label');confirmation.className='cfm-jessi-draft-ack';
 const ack=document.createElement('input');ack.id='cfmJessiReviewed';ack.type='checkbox';
 const msg=document.createElement('span');
 msg.textContent=d.kind==='order'?'I checked Work No, Party, Quantity and PO; I will review ERP form before Save.':
 'I checked the source SRL, real physical roll width, piece dimensions and measured used MTR.';
 confirmation.append(ack,msg);box.append(confirmation);
 const actions=document.createElement('div');actions.className='cfm-jessi-draft-actions';
 const preview=document.createElement('button');preview.type='button';preview.className='cfm-jessi-draft-next';
 preview.textContent=d.kind==='order'?'Verify & Open Work Order Form':'Verify & Open Cutting Form';
 preview.addEventListener('click',reviewAndOpen);
 const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel Draft';
 cancel.addEventListener('click',()=>{draft=null;box.remove()});
 actions.append(preview,cancel);box.append(actions);
 showIssues();
 try{box.scrollIntoView({block:'nearest',behavior:'smooth'})}catch(_){}
}
async function suggestNextNumber(){
 const button=$('cfmJessiNextWorkNo');
 if(!draft||draft.kind!=='order'||!button)return;
 if(draft.value.workNo&&!confirm('Replace the current draft Work No with the next proposed number?'))return;
 button.disabled=true;button.textContent='Checking Cloud Work Nos…';
 try{
  if(typeof cloudFetch!=='function')throw Error('Cloud read is unavailable; cannot suggest a safe Work No.');
  const remote=await cloudFetch();
  const payload=remote?.payload;
  if(!payload||!Array.isArray(payload.pending)||!Array.isArray(payload.cutting))
   throw Error('Cloud Work Nos are not available. No number suggested.');
  const local=source();
  const records=[...arr(payload,'pending'),...arr(payload,'cutting'),...arr(local,'pending'),...arr(local,'cutting')];
  const nums=records.map(x=>norm(x.workNo||'').match(/^CFM-(\d{1,6})$/)?.[1]).filter(Boolean).map(Number);
  if(!nums.length)throw Error('Cannot safely determine next Work No from current Cloud data.');
  const next=Math.max(...nums)+1;
  if(next>999999)throw Error('Work number limit reached.');
  if(!draft||draft.kind!=='order')return;
  draft.value.workNo='CFM-'+next;
  updateDraft();
  // Suggested number is NOT RESERVED; recheck Cloud upon opening native form.
  alert('Suggested CFM-'+next+' from saved Cloud/device Work Nos. This number is not reserved. Final duplicate check runs again before opening ERP Save form.');
 }catch(err){alert('Jessi: '+String(err.message||err)+'. Work No unchanged.')}
 finally{if(button.isConnected){button.disabled=false;button.textContent='☁ Suggest Next Work No (Cloud checked)'}}
}
function check(d,state){
 const issues=[],c=d.value;
 const wo=norm(c.workNo);
 const qty=number(c.qty);
 if(!/^CFM-\d{1,6}$/.test(wo))issues.push('Work No must be complete, e.g. CFM-725');
 if(!(qty>0&&Number.isSafeInteger(qty)))issues.push('Valid whole-number Quantity required');
 if(d.kind==='order'){
  if(!String(c.party||'').trim())issues.push('Party / Customer required');
  if(state&&arr(state,'pending').some(r=>norm(r.workNo)===wo))issues.push('Work No already exists on this device — duplicate blocked');
 }else{
  const order=arr(state,'pending').find(r=>norm(r.workNo)===wo);
  if(!order)issues.push('Work No must exist in Pending Order register on this device');
  else if(order.archived||norm(order.status)==='ARCHIVED')issues.push('Work No is archived');
  else if(qty>0&&number(order.orderQty)>0){
   const remaining=Math.max(0,number(order.orderQty)-(number(order.cutQty)||0));
   if(qty>remaining)issues.push('Cutting Qty '+qty+' exceeds uncut order units '+remaining+'. Voice draft will not over-complete Pending.');
  }
  const sr=norm(c.srlNo),roll=arr(state,'store').find(x=>norm(x.srlNo)===sr);
  if(!sr||!roll)issues.push('Full source SRL must exist in Physical Store — no guessing');
  const length=number(c.length),pieceWidth=number(c.width),meter=number(c.usedMtr);
  if(!(length>0&&pieceWidth>0))issues.push('Cut piece L×W dimensions are required (inches)');
  if(!(meter>0))issues.push('Physically measured Used MTR required; calculated estimates cannot deduct stock');
  if(roll){
   const actual=number(roll.width);
   const planned=number(order?.width);
   if(!(actual>0))issues.push('Real Store roll width not recorded');
   if(!(planned>0))issues.push('Work Order planned cloth width not recorded; supervisor must verify');
   if(actual>0&&planned>0&&Math.abs(actual-planned)>0.11)issues.push('WIDTH MISMATCH: Work Order '+planned+' in vs physical SRL '+actual+' in — blocked');
   if(actual>0&&pieceWidth>0&&length>0&&Math.min(length,pieceWidth)>actual+0.11)issues.push('Cut piece cannot fit across the physical cloth roll');
   if(actual>0&&pieceWidth>0&&length>0){
    const across=Math.floor(actual/pieceWidth),rotated=Math.floor(actual/length);
    if(across<1&&rotated<1)issues.push('No feasible cutting orientation fits this roll width');
    else{
     const usedA=across>0?Math.ceil(qty/across)*length/39.37:Infinity;
     const usedB=rotated>0?Math.ceil(qty/rotated)*pieceWidth/39.37:Infinity;
     d.layoutEstimate=Math.min(usedA,usedB);
    }
    // Existing native cuttingUsedMtr uses l*h*qty*layer / plannedWidth / 39.37.
    // The estimate below is NOT a verified material consumption figure.
    d.nativeEstimate=planned>0&&qty>0?length*pieceWidth*qty/(planned*39.37):null;
    if(meter>0&&d.nativeEstimate!=null&&Math.abs(meter-d.nativeEstimate)>0.02){
     issues.push('Native ERP would deduct '+fmt(d.nativeEstimate)+' MTR but physical measured is '+fmt(meter)+' MTR. Automatic stock deduction BLOCKED: use verified register correction instead.');
    }
   }
   if(meter>0&&typeof srlBalance==='function'){
    try{
     const live=state&&typeof getStore==='function'?getStore(sr):null;
     const balance=live?srlBalance(live):null;
     d.currentBalance=balance;
     if(!Number.isFinite(balance))issues.push('SRL live meter balance not available');
     else if(meter>balance+0.0001)issues.push('Physical meter exceeds ERP available balance ('+fmt(balance)+' MTR)');
    }catch(_){issues.push('Could not verify SRL live meter balance')}
   }else if(meter>0)issues.push('SRL meter calculation unavailable. Cannot permit stock deduction.');
  }
 }
 return issues;
}
function showIssues(){
 const box=$('cfmJessiDraftChecks');if(!box||!draft)return;
 const s=source(),issues=check(draft,s);
 const list=issues.length?issues:['Device checks ready. Final Cloud duplicate + meter check runs before form opens.'];
 box.replaceChildren();
 for(const item of list){const p=document.createElement('p');p.textContent=(issues.length?'⚠ ':'✓ ')+item;box.append(p)}
 if(draft.kind==='cutting'&&draft.layoutEstimate>0){
  const p=document.createElement('p');p.textContent='Theoretical strip layout: ~'+fmt(draft.layoutEstimate)+' MTR (excludes allowances, not a stock debit).';box.append(p);
 }
 box.dataset.mode=issues.length?'warn':'ok';
}
async function checkCloud(d){
 if(typeof cloudFetch!=='function')throw Error('Cloud read unavailable; cannot verify duplicate or stale order.');
 const remote=await cloudFetch();
 const payload=remote?.payload;
 if(!payload||!Array.isArray(payload.pending)||!Array.isArray(payload.cutting))throw Error('Cloud snapshot unavailable');
 const c=d.value,wo=norm(c.workNo);
 const found=payload.pending.find(x=>norm(x.workNo)===wo);
 if(d.kind==='order'){
  if(found)throw Error('Work No '+wo+' exists in Cloud. New duplicate blocked.');
 }else{
  if(!found)throw Error('Work No '+wo+' missing from Cloud. Sync/verify Work Nos before creating Cutting.');
  if(norm(found.status)==='ARCHIVED'||found.archived)throw Error('Cloud Work No is archived.');
  const cloudRoll=arr(payload,'store').find(x=>norm(x.srlNo)===norm(c.srlNo));
  const deviceRoll=arr(source(),'store').find(x=>norm(x.srlNo)===norm(c.srlNo));
  if(!cloudRoll||!deviceRoll)throw Error('SRL not found in both Cloud and device Store. Cutting blocked.');
  if(!(number(cloudRoll.width)>0)||!(number(deviceRoll.width)>0)||
     Math.abs(number(cloudRoll.width)-number(deviceRoll.width))>0.11)
   throw Error('CLOUD WIDTH MISMATCH for SRL '+c.srlNo+'. Physical width must be reconciled before Cutting.');
  if(number(found.width)>0&&Math.abs(number(found.width)-number(deviceRoll.width))>0.11)
   throw Error('Cloud Work Order width disagrees with device physical SRL. Cutting blocked.');
  const cloudRem=number(found.orderQty)!=null?number(found.orderQty)-(number(found.cutQty)||0):null;
  if(cloudRem!=null&&number(c.qty)>cloudRem)
   throw Error('Cloud order remaining Cutting Qty '+Math.max(0,cloudRem)+' is below requested '+c.qty+'. Refresh first.');
  const exists=payload.cutting.some(x=>norm(x.workNo)===wo&&norm(x.srlNo)===norm(c.srlNo)&&
   number(x.cutQty)===number(c.qty)&&number(x.length)===number(c.length)&&number(x.height)===number(c.width));
  if(exists)throw Error('A matching Cutting line already exists in Cloud. Duplicate blocked; review existing entry.');
 }
 return remote.version;
}
function enterValue(form,name,value){
 if(value===undefined||value===null||value==='')return;
 const x=form?.elements?.namedItem(name);
 if(!x||typeof x.value==='undefined')return;
 x.value=String(value);x.dispatchEvent(new Event('input',{bubbles:true}));x.dispatchEvent(new Event('change',{bubbles:true}));
}
function applyForm(d){
 const form=$('editForm');if(!form)throw Error('ERP form not available');
 const c=d.value;
 enterValue(form,'workNo',norm(c.workNo));
 if(d.kind==='order'){
  enterValue(form,'party',c.party);
  enterValue(form,'orderQty',c.qty);
  enterValue(form,'poNo',c.po);
  if(c.description)enterValue(form,'description',c.description);
  if(c.cloth)enterValue(form,'cloth',c.cloth);
 }else{
  const s=source(),roll=arr(s,'store').find(x=>norm(x.srlNo)===norm(c.srlNo));
  if(!roll)throw Error('Physical roll vanished; reopen after refresh');
  enterValue(form,'srlNo',norm(c.srlNo));
  enterValue(form,'cutQty',c.qty);
  enterValue(form,'length',c.length);
  enterValue(form,'height',c.width);
  enterValue(form,'layer',1);
  enterValue(form,'plannedWidth',roll.width);
  enterValue(form,'sizeLine',fmt(number(c.length))+' x '+fmt(number(c.width)));
  enterValue(form,'remark','Jessi voice draft reviewed. Physical MTR '+fmt(number(c.usedMtr))+' verified before saving. Check roll and calculations.');
  // Native Cutting defaults to "Save & Next Cutting". Disable that ONLY for Jessi
  // drafts: the automatically reopened next form would not be a verified voice draft.
  try{
   if(typeof dialogResumeMeta!=='undefined'&&dialogResumeMeta?.type==='cutting')
    dialogResumeMeta={...dialogResumeMeta,i:'jessi-verified-only'};
  }catch(_){}
  const saveButton=$('saveFormBtn');if(saveButton)saveButton.textContent='Save Verified Cutting';
  installCuttingGuard(d);
 }
}
function stopCapture(ev,reason){
 ev.preventDefault();ev.stopImmediatePropagation();ev.stopPropagation();
 alert('Jessi safety check: '+reason+'\nNo Cutting saved by this click.');
}
function installCuttingGuard(d){
 if(guardClean){guardClean();guardClean=null}
 const btn=$('saveFormBtn'),dlg=$('editDialog');
 if(!btn||!dlg)throw Error('ERP Save control unavailable');
 const fn=ev=>{
  const s=source(),f=$('editForm');
  const temp={...d,value:{
   workNo:f?.elements?.namedItem('workNo')?.value||'',
   srlNo:f?.elements?.namedItem('srlNo')?.value||'',
   qty:f?.elements?.namedItem('cutQty')?.value||'',
   length:f?.elements?.namedItem('length')?.value||'',
   width:f?.elements?.namedItem('height')?.value||'',
   usedMtr:d.value.usedMtr
  }};
  const problems=check(temp,s);
  const reviewed=d.value;
  if(norm(temp.value.workNo)!==norm(reviewed.workNo)||
     norm(temp.value.srlNo)!==norm(reviewed.srlNo)||
     number(temp.value.qty)!==number(reviewed.qty)||
     number(temp.value.length)!==number(reviewed.length)||
     number(temp.value.width)!==number(reviewed.width))
   problems.push('Voice-reviewed Cutting fields changed. Cancel and create a fresh Jessi draft.');
  const roll=arr(s,'store').find(x=>norm(x.srlNo)===norm(reviewed.srlNo));
  const planned=number(f?.elements?.namedItem('plannedWidth')?.value);
  const layer=number(f?.elements?.namedItem('layer')?.value);
  const wastage=norm(f?.elements?.namedItem('wastage')?.value||'NO');
  if(!roll||planned===null||Math.abs(planned-number(roll.width))>0.11)
   problems.push('Cutting Form Width changed or physical SRL width missing. Save blocked.');
  if(layer!==1)problems.push('Layer must be 1 in this verified voice entry. Recheck measured meter.');
  if(wastage!=='NO')problems.push('Wastage entry cannot be submitted from a standard Jessi Cutting draft.');
  if(problems.length)return stopCapture(ev,problems.join('; '));
  if(!confirm('Jessi review: Cutting '+temp.value.qty+' pieces for '+temp.value.workNo+
   ', SRL '+temp.value.srlNo+', measured '+temp.value.usedMtr+' MTR.\nExisting ERP Save will update Cutting, Pending and SRL consumption. Proceed?')){
   return stopCapture(ev,'User cancelled Save');
  }
 };
 btn.addEventListener('click',fn,true);
 const cleanup=()=>{btn.removeEventListener('click',fn,true);dlg.removeEventListener('close',cleanup);guardClean=null};
 dlg.addEventListener('close',cleanup,{once:true});guardClean=cleanup;
}
async function reviewAndOpen(){
 if(preparing||!draft)return;
 const d={kind:draft.kind,value:{...draft.value}};
 const ack=$('cfmJessiReviewed');
 if(!ack?.checked){alert('First confirm that you personally verified these details.');return}
 const s=source(),issues=check(d,s);
 if(issues.length){showIssues();alert('Please correct the highlighted fields before opening ERP form.');return}
 preparing=true;const b=$('cfmJessiDraft')?.querySelector('.cfm-jessi-draft-next');if(b){b.disabled=true;b.textContent='Checking Cloud…'}
 try{
  const version=await checkCloud(d);
  const c=d.value,wo=norm(c.workNo);
  // Do not auto-create a new Work No: only use explicitly provided, cloud-checked number.
  const local=source();
  const i=d.kind==='cutting'?arr(local,'pending').find(x=>norm(x.workNo)===wo):null;
  if(d.kind==='cutting'&&!i)throw Error('Source Work Order not present in current device Pending register.');
  const desc=d.kind==='order'?'Work Order':'Cutting';
  if(!confirm('Cloud v'+version+' checked. Open existing ERP '+desc+' form with reviewed voice draft for '+wo+'?\nNO DATA SAVED YET. You must inspect every field and press Save yourself.')){
   return;
  }
  const assistant=$('cfmAiDialog');
  if(assistant?.open)assistant.close();
  // existing entry form keeps full product master and auto-save rules.
  if(d.kind==='order'){
   if(typeof window.openPendingForm!=='function')throw Error('ERP Work Order form unavailable');
   window.openPendingForm(null);
  }else{
   if(typeof window.openCuttingForm!=='function')throw Error('ERP Cutting form unavailable');
   window.openCuttingForm(null,{workNo:wo,party:i.party||'',description:i.description||'',cloth:i.cloth||'',width:i.width||''});
  }
  applyForm(d);
  const dlg=$('editDialog');if(dlg?.open){
   const caption=document.createElement('div');caption.className='cfm-jessi-native-note';
   caption.textContent='Jessi voice draft · Review existing ERP fields. Save is MANUAL'+(d.kind==='cutting'?' and re-validates measured MTR and physical SRL width.':'')+'.';
   const root=$('formFields');if(root)root.prepend(caption);
  }
  draft=null;
 }catch(err){alert('Jessi: '+(err?.message||'Could not open ERP form')+'. No record was saved automatically.')}
 finally{preparing=false;if(b&&b.isConnected){b.disabled=false;b.textContent=d.kind==='order'?'Verify & Open Work Order Form':'Verify & Open Cutting Form'}}
}
function followup(text){
 if(!draft)return null;
 const q=clean(text),u=norm(q);
 // Never steal normal informational questions from the ERP record assistant.
 if(/\b(STATUS|DETAIL|DETAILS|SEARCH|FIND|SHOW|STOCK|PENDING|BALANCE|REPORT|SUMMARY)\b|स्थिति|दिखाओ|स्टॉक|પેન્ડિંગ/.test(u))return null;
 const extracted=fields(q),c=draft.value,changed=[];
 for(const key of ['workNo','party','po','cloth','srlNo','priority']){
  if(extracted[key]&&String(extracted[key]).trim()){c[key]=extracted[key];changed.push(key)}
 }
 for(const key of ['qty','length','width','usedMtr']){
  if(Number.isFinite(extracted[key])&&extracted[key]>0){c[key]=extracted[key];changed.push(key)}
 }
 if(!changed.length){
  const val=q.trim();
  const m=val.match(/^(?:work\s*(?:order|no|number)|number|वर्क\s*ऑर्डर)?\s*#?\s*(\d{1,6})$/i);
  if(m&&(!c.workNo||!/^CFM-\d+$/.test(norm(c.workNo)))){c.workNo='CFM-'+m[1];changed.push('workNo')}
  const names=[...new Set(arr(source(),'pending').map(x=>String(x.party||'').trim()).filter(Boolean))];
  const matched=names.find(x=>norm(x)===norm(val));
  if(!changed.length&&matched&&draft.kind==='order'){c.party=matched;changed.push('party')}
 }
 if(!changed.length)return null;
 stamp++;
 try{updateDraft()}catch(err){console.error('Jessi follow-up draft UI failed',err)}
 return {handled:true,reply:'Jessi ne '+changed.join(', ')+' draft mein add kiya. '+speakable(draft.kind,c),kind:draft.kind};
}
function showDraft(kind,info){
 if(kind!=='order'&&kind!=='cutting')return null;
 const value=info||fields('');
 if(kind==='order'&&!Object.prototype.hasOwnProperty.call(value,'description'))value.description='';
 draft={kind,value};stamp++;
 // Render synchronously while the Jessi dialog exists: do not depend on
 // a deferred microtask that might be delayed by browser speech activity.
 try{updateDraft()}catch(err){
  console.error('Jessi draft UI failed',err);
  return {handled:true,kind,reply:'Jessi draft screen could not open: '+String(err?.message||err)+'. Try refreshing V220. No data was saved.',error:true};
 }
 const box=$('cfmJessiDraft');
 if(!box){
  return {handled:true,kind,reply:'Draft module loaded but panel missing. Reopen Jessi and refresh V220. No data saved.',error:true};
 }
 return {handled:true,kind,reply:speakable(kind,value),draftShown:true};
}
function handle(text){
 const kind=classify(text);
 if(!kind)return followup(text);
 const value=fields(text);
 if(kind==='order')value.description='';
 return showDraft(kind,value);
}
window.cfmJessiNewWorkDraft=function(){
 return showDraft('order',{workNo:'',party:'',qty:null,po:'',description:'',cloth:'',srlNo:'',length:null,width:null,usedMtr:null});
};
window.cfmJessiNewCuttingDraft=function(){
 return showDraft('cutting',{workNo:'',party:'',qty:null,po:'',description:'',cloth:'',srlNo:'',length:null,width:null,usedMtr:null});
};
window.cfmJessiCommand=Object.freeze({handle,fields,classify,check,showDraft});
})();
