/* CFM V330 - Eagle EFPPL Numbered Product Code Master.
   Presentation/entry helper. Does not write cloud state, stock, historical work orders or PO records. */
(function(){
'use strict';
const RAW=[
['1008','FBD-019','FBD Finger Bag - 19 Finger'],
['1009','FBD-037','FBD Finger Bag - 37 Finger'],
['1010','FBD-31','FBD Finger Bag - 31 Finger'],
['1011','FBD-12','FBD Finger Bag - 12 Finger'],
['1012','FBD-08','FBD Finger Bag - 8 Finger'],
['2000','CF-48-TLT','CF Bag 48" Top L/T'],
['2001','CF-48-ORD','CF Bag 48" Ordinary'],
['2002','CF-60-TLT','CF Bag 60" Top L/T'],
['2003','CF-60-ORD','CF Bag 60" Ordinary'],
['2004','CF-36-TLT','CF Bag 36" Top L/T'],
['2005','CF-36-ORD','CF Bag 36" Ordinary'],
['2006','CF-12-TLT','CF Bag 12" Top L/T'],
['2007','CF-12-ORD','CF Bag 12" Ordinary'],
['2008','CF-18-TLT','CF Bag 18" Top L/T'],
['2009','CF-18-ORD','CF Bag 18" Ordinary'],
['3000','RNF','RNF Filter Bag'],
['3001','SNF','SNF Filter Bag'],
['3002','BFB','Basket Filter Bag'],
['3003','CAN','Candle Filter Bag'],
['3004','PNFB','Pressure Nutch Filter Bag'],
['4000','FPC-26X30','Filter Press Cloth 26" x 30"'],
['4001','FPC-38X42','Filter Press Cloth 38" x 42"'],
['4002','FPC-52X54','Filter Press Cloth 52" x 54"'],
['4003','FPC-62X64','Filter Press Cloth 62" x 64"'],
['5000','ANFD-DC','ANFD Dust Collector Bag'],
['5001','ANFD-FC','ANFD Filter Cloth'],
['6000','SFP-19X43','Sparkler Filter Cloth Pad 19" x 43"'],
['6001','SFP-15X43','Sparkler Filter Cloth Pad 15" x 43"'],
['6002','SFP-25X55','Sparkler Filter Cloth Pad 25" x 55"'],
['7000','SFC','Spiral Filter Cloth']
];
const MASTER=RAW.map(x=>Object.freeze({itemNo:x[0],code:'EFPPL-'+x[0]+'-'+x[1],oldCode:'EFPPL-'+x[1],description:x[2]}));
const BYCODE=new Map(MASTER.map(x=>[x.code,x]));
const normal=x=>String(x||'').toUpperCase().replace(/[“”″]/g,'"').replace(/×/g,'X').replace(/\s+/g,' ').trim();
function findCode(value){
 const s=normal(value);
 if(!s)return null;
 for(const p of MASTER)if(s.includes(p.code)||s.includes(p.oldCode))return p;
 const m=s.match(/\bEFPPL[- ]?(1008|1009|1010|1011|1012|200[0-9]|300[0-4]|400[0-3]|500[01]|600[0-2]|7000)\b/);
 if(m)return MASTER.find(x=>x.itemNo===m[1])||null;
 if(/\bFBD\b/.test(s)){
  const finger=s.match(/\b(?:FBD(?:\s+FINGER)?(?:\s+BAG)?|FINGER(?:\s+BAG)?)\s*[-:]?\s*(0?8|12|19|31|37)\b/)||
               s.match(/\b(0?8|12|19|31|37)\s*[- ]?\s*FINGERS?\b/);
  if(!finger)return null;
  const num=Number(finger[1]);
  return MASTER.find(x=>x.itemNo.startsWith('10')&&Number(x.description.match(/(\d+) Finger/)[1])===num)||null;
 }
 if(/\b(?:CF|CENTRIFUG(?:E|AL))\b/.test(s)){
  const size=s.match(/\bCF\s*[- ]\s*(12|18|36|48|60)\b/)||
   s.match(/\b(?:CF|CENTRIFUG(?:E|AL))(?:\s+BAG)?\s*[- ]?\s*(12|18|36|48|60)\b/)||
   s.match(/\b(12|18|36|48|60)\s*(?:"|INCH(?:ES)?\b|IN\b)/);
  if(!size)return null;
  const top=/\bTOP\b|\bTLT\b|\bTOP\s*L\s*\/?\s*T\b|\bLIFTING\b/.test(s);
  const ordinary=/\bORD(?:INARY)?\b/.test(s);
  if(top===ordinary)return null;
  return MASTER.find(x=>x.oldCode==='EFPPL-CF-'+size[1]+'-'+(top?'TLT':'ORD'))||null;
 }
 const direct=[
 [/\bSPIRAL\s+FILTER\s+CLOTH\b/,'7000'],
 [/\bRNF\b/, '3000'],[/\bSNF\b/,'3001'],
 [/\bBASKET\s+FILTER\s+BAG\b/,'3002'],[/\bCANDLE\s+FILTER\s+BAG\b/,'3003'],
 [/\bPRESSURE\s+NUTCH\s+FILTER\s+BAG\b/,'3004'],
 [/\bANFD\b.*\bDUST\s+COLLECTOR\b/,'5000'],
 [/\bANFD\b.*\bFILTER\s+CLOTH\b/,'5001']
 ];
 for(const [pattern,num] of direct)if(pattern.test(s))return MASTER.find(x=>x.itemNo===num)||null;
 const dims=s.match(/\b(26|38|52|62|19|15|25)\s*(?:\"|INCH(?:ES)?)?\s*X\s*(30|42|54|64|43|55)\b/);
 if(dims){
  const d=dims[1]+'X'+dims[2];
  const family=/\bSPARKLER\b/.test(s)?'SFP':/\bFILTER\s+PRESS\b/.test(s)?'FPC':'';
  if(family)return MASTER.find(x=>x.oldCode==='EFPPL-'+family+'-'+d)||null;
 }
 return null;
}
function byCode(code){return BYCODE.get(String(code||'').trim().toUpperCase())||null}
function codeForRow(row){
 const stored=byCode(row&&row.itemCode);
 return stored||findCode(row&&row.description);
}
function createSelect(){
 const select=document.createElement('select');
 select.className='efppl-product-select';
 select.setAttribute('aria-label','EFPPL numbered product code');
 select.style.cssText='width:100%;min-height:39px;border:1px solid #9cbfd5;border-radius:8px;padding:8px;background:#f5fbff;color:#17364a;font:600 12px system-ui;margin-top:6px;max-width:100%';
 select.append(new Option('EFPPL Product Code - select / verify',''));
 for(const p of MASTER)select.append(new Option(p.code+' | '+p.description,p.code));
 return select;
}
function setCurrent(select,input,description,initial){
 if(!select||!input)return;
 const old=byCode(input.value);
 const known=byCode(initial)||old||findCode(description);
 if(!known)return;
 select.value=known.code;
 if(!input.value.trim()||byCode(input.value))input.value=known.code;
}
function addSingleForm(){
 const dlg=document.getElementById('editDialog');
 if(!dlg||!dlg.open||dlg.classList.contains('multi-po-dialog'))return;
 const form=dlg.querySelector('#editForm');if(!form)return;
 const item=form.querySelector('[name="itemCode"]');
 if(!item||item.dataset.efpplBound)return;
 item.dataset.efpplBound='1';
 const desc=form.querySelector('[name="description"]');
 const label=document.createElement('label');label.textContent='EFPPL Product Code (30-item master)';
 label.style.cssText='font-size:11px;display:block;margin-top:7px;font-weight:700;color:#235377';
 const select=createSelect();label.append(select);
 item.insertAdjacentElement('afterend',label);
 setCurrent(select,item,desc&&desc.value,'');
 select.addEventListener('change',()=>{
   if(!select.value)return;
   item.value=select.value;
   item.dispatchEvent(new Event('input',{bubbles:true}));
 });
 const update=()=>{if(select.dataset.manual==='1')return;
   const p=findCode(desc&&desc.value);
   if(!p)return;
   select.value=p.code;
   if(!item.value.trim()||byCode(item.value))item.value=p.code;
 };
 select.addEventListener('change',()=>{if(select.value)select.dataset.manual='1'});
 desc&&desc.addEventListener('blur',()=>setTimeout(update,0));
 desc&&desc.addEventListener('change',()=>setTimeout(update,0));
 // Existing Save handler reads the original Item Code input, not this selector.
 form.addEventListener('submit',()=>{if(select.value)item.value=select.value},true);
 const save=dlg.querySelector('#saveFormBtn');
 save&&save.addEventListener('click',()=>{if(select.value)item.value=select.value},true);
}
function addMultiRows(){
 for(const row of document.querySelectorAll('#multiPoItems .multi-po-item-row')){
  if(row.dataset.efpplBound)continue;
  const item=row.querySelector('.multi-item-code'),desc=row.querySelector('.multi-item-product');
  if(!item)continue;
  row.dataset.efpplBound='1';
  const field=item.closest('.field')||item.parentElement;
  const caption=document.createElement('div');
  caption.textContent='EFPPL Numbered Product Code';
  caption.style.cssText='font:700 11px system-ui;color:#256080;margin-top:7px';
  const select=createSelect();field.append(caption,select);
  setCurrent(select,item,desc&&desc.value,item.value);
  const refresh=()=>{
    if(select.dataset.manual==='1')return;
    const current=byCode(item.value), p=findCode(desc&&desc.value)||current;
    if(!p)return;
    select.value=p.code;
    item.value=p.code;
  };
  select.addEventListener('change',()=>{
    select.dataset.manual=select.value?'1':'';
    if(select.value){item.value=select.value;item.dispatchEvent(new Event('change',{bubbles:true}));}
  });
  desc&&desc.addEventListener('input',()=>setTimeout(refresh,0));
  desc&&desc.addEventListener('change',()=>setTimeout(refresh,0));
  desc&&desc.addEventListener('blur',()=>setTimeout(refresh,0));
  item.addEventListener('change',()=>{if(byCode(item.value)){select.value=item.value}});
  refresh();
 }
}
function addPoRows(){
 const lines=document.getElementById('lines');if(!lines)return;
 for(const row of lines.querySelectorAll('tr')){
  if(row.dataset.efpplBound)continue;
  const textInput=row.cells[0]?.querySelector('input');
  if(!textInput)continue;
  row.dataset.efpplBound='1';
  const select=createSelect(),caption=document.createElement('div');
  caption.textContent='EFPPL Product Code (verify after OCR)';
  caption.style.cssText='font:700 11px system-ui;color:#245982;margin-top:5px';
  row.cells[0].append(caption,select);
  const desc=()=>row.cells[0].querySelector('.po-big-spec')?.value||textInput.value;
  const update=()=>{
    if(select.dataset.manual==='1')return;
    const p=findCode(desc());if(!p)return;
    select.value=p.code;textInput.dataset.efpplCode=p.code;
  };
  const fromData=byCode(textInput.dataset.efpplCode);
  if(fromData)select.value=fromData.code;
  select.addEventListener('change',()=>{
    select.dataset.manual=select.value?'1':'';
    textInput.dataset.efpplCode=select.value;
    // Invalidate any previously prepared PO draft so the operator re-verifies it.
    lines.dispatchEvent(new Event('input',{bubbles:true}));
  });
  textInput.addEventListener('blur',()=>setTimeout(update,0));
  textInput.addEventListener('change',()=>setTimeout(update,0));
  const detail=row.cells[0].querySelector('.po-big-spec');
  detail&&detail.addEventListener('blur',()=>setTimeout(update,0));
  detail&&detail.addEventListener('change',()=>setTimeout(update,0));
  update();
 }
}
function addBillLabels(){
 const container=document.getElementById('billRequestWorkChecks');
 if(!container||typeof state==='undefined'||!state||!Array.isArray(state.pending))return;
 for(const checkbox of container.querySelectorAll('[data-bill-work]')){
  const label=checkbox.closest('label');
  if(!label||label.dataset.efpplBound)continue;
  label.dataset.efpplBound='1';
  const record=state.pending.find(x=>String(x.workNo||'').toUpperCase()===String(checkbox.dataset.billWork||'').toUpperCase());
  const matched=codeForRow(record);
  if(matched){const info=document.createElement('small');info.textContent='EFPPL Code: '+matched.code;info.style.cssText='color:#1c6893;font-weight:700';label.querySelector('span')?.append(info);}
 }
}
function patchBillRequest(){
 if(typeof window.billRequestMessage!=='function'||window.billRequestMessage.efpplPatched)return;
 const original=window.billRequestMessage;
 const patched=function(){
   const msg=original.apply(this,arguments);
   if(!msg||msg==='Select Work No.'||typeof state==='undefined')return msg;
   const selected=[...(document.getElementById('billRequestWork')?.selectedOptions||[])].map(o=>String(o.value).trim().toUpperCase());
   const rows=(state.pending||[]).filter(r=>selected.includes(String(r.workNo||'').toUpperCase()));
   let index=0;
   return String(msg).replace(/^Item: [^\n]*/gm,function(line){
     const r=rows[index++], p=codeForRow(r);
     return line+'\nEFPPL Product Code: '+(p?p.code:'NOT MAPPED - VERIFY PRODUCT MASTER');
   });
 };
 patched.efpplPatched=true;
 window.billRequestMessage=patched;
}
function scan(){
 addSingleForm();addMultiRows();addPoRows();addBillLabels();patchBillRequest();
}
let scheduled=false;
function schedule(){
 if(scheduled)return;scheduled=true;
 requestAnimationFrame(()=>{scheduled=false;try{scan()}catch(err){console.warn('EFPPL code helper',err)}});
}
const api=Object.freeze({master:MASTER,findCode,byCode,codeForRow});
window.CFM_EFPPL=api;
window.CFM_EFPPL_MASTER=MASTER;
window.CFM_EFPPL_CODES=MASTER.map(x=>x.code);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{
 schedule();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
});else{schedule();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});}
})();