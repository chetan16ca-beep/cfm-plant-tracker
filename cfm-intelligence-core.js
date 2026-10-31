/* CFM Intelligence Core V215. No remote writes; pure planning/search functions.
   Simulation and PO review NEVER commit to ERP. Remnants live in separate explicit local register. */
(function(){
'use strict';
const clean=v=>String(v==null?'':v).trim();
const norm=v=>clean(v).toUpperCase().replace(/\s+/g,' ');
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const esc=v=>clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const clone=x=>JSON.parse(JSON.stringify(x));
const uniq=a=>[...new Set(a)];
const valid=s=>!!s&&Array.isArray(s.pending)&&Array.isArray(s.cutting)&&Array.isArray(s.store);
const remnantKey='cfm-forge-remnants-v1'; // Not part of shared stock or ERP sync. Local register only.
function workNumber(r){return norm(r?.workNo||r?.workOrder||r?.wo)}
function rollNumber(r){return norm(r?.srlNo||r?.srl)}
function list(s,key){return Array.isArray(s?.[key])?s[key]:[]}
function snapshot(){try{return valid(state)?clone({pending:state.pending,cutting:state.cutting,store:state.store,departmentWork:state.departmentWork||[]}):null}catch(_){return null}}
function stockBalance(srl,stock){
 const roll=list(srl,'store').find(x=>rollNumber(x)===norm(stock))||null;
 if(!roll)return {found:false};
 // srlBalance references live state, and is only usable on an actual live-record object.
 let balance=null;let basis='';
 if(typeof srlBalance==='function'&&typeof state!=='undefined'&&srl===state){
   try{const b=Number(srlBalance(roll));if(Number.isFinite(b)){balance=b;basis='ERP live SRL calculation'}}catch(_){}
 }
 if(balance===null){
   const b=roll.excelLiveBalanceMtr??roll.physicalMtr??roll.openingMtr;
   if(b!==''&&b!=null&&Number.isFinite(Number(b))){
    balance=Number(b);basis='Displayed stored MTR field (may not include all deductions)';
   }
 }
 return {found:true,roll,actualWidth:num(roll.width),balance,basis};
}
function trial(input,s){
 if(!valid(s))return {error:'ERP data not ready on this device'};
 const existing=list(s,'pending').find(r=>workNumber(r)===norm(input.workNo));
 const newOrder=norm(input.workNo)===''||norm(input.workNo)==='TRIAL';
 const currentQty=newOrder?0:num(existing?.orderQty);
 const currentCut=newOrder?0:num(existing?.cutQty);
 if(!newOrder&&!existing)return {error:'Work No not found. Choose a listed Work Order or use TRIAL.'};
 const qty=Number(input.orderQty),cut=Number(input.extraCutQty||0),meters=Number(input.usedMtr||0);
 if(!Number.isFinite(qty)||qty<=0||qty>1000000)return {error:'Enter a valid Order Quantity above zero'};
 if(!Number.isFinite(cut)||cut<0||cut>1000000)return {error:'Trial Cutting Qty must be zero or above'};
 if(!Number.isFinite(meters)||meters<0||meters>1000000)return {error:'Trial Used MTR must be zero or above'};
 const beforePending=Math.max(0,currentQty-currentCut);
 const afterPending=Math.max(0,qty-currentCut-cut);
 const orderAfter={...(existing?clone(existing):{workNo:'TRIAL',party:'SIMULATION ONLY',cloth:input.cloth||'',width:input.width||''}),orderQty:qty,cutQty:currentCut+cut,_simulationOnly:true};
 const test={pending:clone(s.pending),cutting:clone(s.cutting),store:clone(s.store)};
 if(existing)test.pending[test.pending.findIndex(x=>workNumber(x)===workNumber(existing))]=orderAfter;
 else test.pending.push(orderAfter);
 if(cut>0)test.cutting.push({workNo:workNumber(orderAfter),cutQty:cut,entryType:'SIMULATION ONLY',srlNo:clean(input.srlNo),_simulationOnly:true});
 let stock=null;
 if(clean(input.srlNo)){
   stock=stockBalance(s,clean(input.srlNo));
   if(stock.found){
     stock.after=stock.balance===null?null:stock.balance-meters;
     if(stock.after!==null&&stock.after<0)stock.shortage=-stock.after;
     if(meters>0&&stock.balance===null)stock.warning='No reliable remaining MTR was confirmed; stock sufficiency UNKNOWN';
     if(stock.actualWidth>0&&num(orderAfter.width)>0&&stock.actualWidth<num(orderAfter.width))stock.warning='Physical roll width is smaller than Work Order width: verify before any real cutting';
   }else stock.warning='SRL does not exist in current Store. Simulation only; no stock change';
 }
 return {test,workNo:workNumber(orderAfter),currentQty,currentCut,beforePending,afterPending,deltaPending:afterPending-beforePending,qty,cut,meters,stock,isNew:newOrder};
}
function tokens(query){
 const stop=new Set(['WHAT','SHOW','FIND','ALL','ME','IS','THE','IN','OF','FOR','KA','KYA','HAI','KE','KI','AUR','KITNA','KITNE','ORDERS','ORDER','DETAIL','DIKHAO','BATAO','PLEASE','STOCK','CUTTING','PENDING','WORK']);
 return uniq(norm(query).replace(/[?.,]/g,' ').split(/\s+/).filter(x=>x.length>1&&!stop.has(x)));
}
function search(q,s){
 if(!valid(s))return [];
 const words=tokens(q);if(!words.length)return [];
 const all=[
 ...list(s,'pending').map(x=>({type:'Work Order',workNo:workNumber(x),ref:clean(x.poNo),record:x,
  summary:[x.party,x.description2||x.description,x.cloth,clean(x.width)+'"','Qty '+clean(x.orderQty)].filter(Boolean).join(' · ')})),
 ...list(s,'cutting').map(x=>({type:'Cutting',workNo:workNumber(x),ref:rollNumber(x),record:x,
  summary:[x.party,x.sizeLine||((x.length||'')+' × '+(x.height||'')),x.cloth,'Qty '+clean(x.cutQty)].filter(Boolean).join(' · ')})),
 ...list(s,'store').map(x=>({type:'Stock SRL',workNo:workNumber(x),ref:rollNumber(x),record:x,
  summary:[x.quality||x.cloth,x.width?clean(x.width)+'"':'',x.status,'Opening '+clean(x.openingMtr)+' MTR'].filter(Boolean).join(' · ')})),
 ...list(s,'departmentWork').map(x=>({type:'Department',workNo:workNumber(x),ref:clean(x.process||x.department),record:x,
  summary:[x.party,x.process||x.department,x.worker||x.person,'Qty '+clean(x.doneQty??x.qty)].filter(Boolean).join(' · ')}))
 ];
 const workMatch=norm(q).match(/\bCFM[\s-]*(\d+)\b/);
 const explicitWork=workMatch?'CFM-'+workMatch[1]:null;
 const result=[];
 for(const row of all){
  const hay=norm([row.type,row.workNo,row.ref,row.summary,JSON.stringify(row.record)].join(' '));
  if(explicitWork&&row.workNo!==explicitWork)continue;
  const matched=words.filter(w=>hay.includes(w));
  if(!matched.length)continue;
  const score=matched.length*4+(row.workNo&&norm(q).includes(row.workNo)?15:0)+(row.ref&&norm(q).includes(norm(row.ref))?10:0)+(matched.length===words.length?10:0);
  result.push({...row,score});
 }
 return result.sort((a,b)=>b.score-a.score||a.workNo.localeCompare(b.workNo)).slice(0,100);
}
function spec(text){
 const input=clean(text).slice(0,18000);
 const line=(re)=>{const m=input.match(re);return m?clean(m[1]):''};
 const qty=line(/(?:\b(?:order\s*)?qty\b|\bquantity\b|\bqnty\b|\bnos\b)\s*[:=\-\s]+\s*(\d+(?:\.\d+)?)/i);
 const po=line(/(?:\bP\.?\s*O\.?\s*(?:NO|NUMBER|#)?\b|\bPURCHASE ORDER NO\.?\b)\s*[:#=\-]+\s*([A-Z0-9/._-]+)/i);
 const date=line(/(?:delivery\s*date|dispatch\s*by|delivery\s*by|due\s*date)\s*[:=\-\s]+\s*(\d{1,4}[-\/.]\d{1,2}[-\/.]\d{2,4})/i);
 const width=line(/(?:cloth\s*width|roll\s*width|width)\s*[:=\-\s]+\s*(\d+(?:\.\d+)?)\s*(?:inch|inches|"|''|in\b)?/i);
 const micron=line(/(\d+(?:\.\d+)?)\s*(?:MICRON|MICRONS|MIC\b|µM|UM\b)/i);
 const anti=/\b(?:NON[\s-]*ANTI[\s-]*STATIC|NON[\s-]*ANTISTATIC|WITHOUT\s+ANTISTATIC)\b/i.test(input)?'NON ANTISTATIC':
   /\bANTI[\s-]*STATIC\b/i.test(input)?'ANTISTATIC':'';
 const description=line(/(?:item\s*description|product\s*description|description|material\s*description)\s*[:=\-]+\s*([^\n\r]{4,230})/i);
 const cloth=line(/(?:cloth\s*(?:code|quality)|fabric\s*(?:code|type)|material\s*code)\s*[:=\-\s]+\s*([A-Z0-9][A-Z0-9\s-]{1,35})/i);
 return {qty:qty?Number(qty):null,po,date,width:width?Number(width):null,micron:micron?Number(micron):null,anti,description,cloth};
}
function existingSpec(o){
 const t=[o.description,o.description2,o.cloth].filter(Boolean).join(' ');
 const x=spec(t);
 return {qty:o.orderQty===''?null:num(o.orderQty),po:clean(o.poNo),date:clean(o.deliveryDate),width:o.width===''?null:num(o.width),micron:x.micron,anti:x.anti,description:clean(o.description),cloth:clean(o.cloth)};
}
function compare(o,raw){
 if(!o)return {error:'Select an existing Work Order'};
 if(!clean(raw))return {error:'Paste revised PO text first'};
 const a=existingSpec(o),b=spec(raw);
 const keys=[['qty','Order Qty'],['po','PO / Reference'],['date','Delivery Date'],['width','Cloth Width'],['micron','Micron'],['anti','Antistatic'],['cloth','Cloth / Quality'],['description','Description']];
 const rows=keys.map(([key,label])=>{
   const old=a[key],fresh=b[key];
   if(fresh===''||fresh===null||fresh===undefined)return {key,label,old,fresh:'Not detected',status:'unverified'};
   if(old===''||old===null||old===undefined)return {key,label,old:old??'Not recorded',fresh,status:'added'};
   return {key,label,old,fresh,status:norm(old)===norm(fresh)?'same':'changed'};
 });
 return {old:a,newer:b,rows,changes:rows.filter(x=>x.status==='changed'||x.status==='added').length,unchecked:rows.filter(x=>x.status==='unverified').length};
}
function remRead(){
 try{const a=JSON.parse(localStorage.getItem(remnantKey)||'[]');return Array.isArray(a)?a.filter(x=>x&&typeof x==='object').slice(0,300):[]}catch(_){return []}
}
function remWrite(a){
 if(!Array.isArray(a)||a.length>300)throw Error('Remnant register limit 300');
 localStorage.setItem(remnantKey,JSON.stringify(a));
 if(localStorage.getItem(remnantKey)!==JSON.stringify(a))throw Error('Remnant register could not be verified');
}
function registerRemnant(r,s){
 const width=Number(r.width),length=Number(r.length),qty=Number(r.qty);
 if(!r.confirmed)return {error:'Physically measured and verified checkbox required'};
 if(!clean(r.cloth))return {error:'Cloth / quality is required'};
 if(![width,length,qty].every(x=>Number.isFinite(x)&&x>0)||width>1000||length>10000||qty>10000||!Number.isInteger(qty))return {error:'Enter valid remnant dimensions in inches and whole quantity'};
 const matched=list(s,'store').find(x=>rollNumber(x)===norm(r.srlNo));
 if(!matched)return {error:'Choose an SRL present in this device Store; unknown SRL cannot be verified'};
 const actual=num(matched.width);
 if(!actual)return {error:'Physical Store roll width missing. Verify roll width before logging remnant'};
 if(width>actual+0.01)return {error:'Measured remnant width exceeds physical SRL roll width ('+actual+' in). Check dimensions'};
 const quality=norm(matched.quality||matched.cloth||matched.description);
 if(quality&&norm(r.cloth)!==quality)return {error:'Cloth quality does not match the selected SRL. Verify before adding'};
 const a=remRead();
 const entry={id:'R-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),srlNo:rollNumber(matched),cloth:clean(r.cloth),width,length,qty,workNo:norm(r.workNo),createdAt:new Date().toISOString(),verified:true,source:'MANUAL-PHYSICAL-VERIFICATION',note:clean(r.note).slice(0,200)};
 a.unshift(entry);remWrite(a);return {ok:true,entry};
}
function remSuggest(s,requirements){
 const w=Number(requirements.width),l=Number(requirements.length),count=Number(requirements.qty||1);
 if(!Number.isFinite(w)||w<=0||!Number.isFinite(l)||l<=0||!Number.isInteger(count)||count<=0)return {error:'Enter valid required cut-piece width, length and quantity'};
 if(!clean(requirements.cloth))return {error:'Choose required cloth quality'};
 const result=[];
 for(const r of remRead()){
  if(norm(r.cloth)!==norm(requirements.cloth))continue;
  // Conservative plain-rectangle grid only: orientations are alternatives, not combined optimizations.
  const a=Math.floor(r.width/w)*Math.floor(r.length/l);
  const b=Math.floor(r.width/l)*Math.floor(r.length/w);
  const per=Math.max(a,b);
  if(per<=0)continue;
  const total=per*r.qty;
  result.push({...r,per,total,canCover:total>=count,layout:a>=b?'normal':'rotated',need:count,efficiency:((per*w*l)/(r.width*r.length))*100});
 }
 return result.sort((a,b)=>Number(b.canCover)-Number(a.canCover)||b.efficiency-a.efficiency||b.total-a.total).slice(0,60);
}
window.CFMIntelCore=Object.freeze({snapshot,valid,trial,search,compare,spec,existingSpec,remRead,remWrite,registerRemnant,remSuggest,stockBalance,workNumber,rollNumber,norm,num,esc,clone});
})();
