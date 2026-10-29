/* OLD CFM ERP | Full PO details, no automatic Work Order writes. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const clean=v=>String(v??'').replace(/[‐‑–—]/g,'-').replace(/\u00a0/g,' ').trim().replace(/[ \t]+/g,' ');
const product=/\b(?:CF|FBD|ANFD|RVPD|RCVD|CENTRIFUGE|FILTER|HEPA|CARTRIDGE|SPARKLER|CLOTH|HOUSING|PTFE|POLYESTER|POLYPROPYLENE)\b/i;
const codeRx=/\b(?:GA|CA|CFG|ICFG|FBD|IFBD|NF|EFP[- ]?P)[ -]?\d{2,6}[A-Z]?\b/i;
const spec=/\b(?:MICRON|MESH|ANTISTATIC|LAYER|GSM|FINGER|SINGLE|DOUBLE|WIDTH|LENGTH|DIAMETER|DIA|SIZE|MATERIAL|L\/T|LIFTING|TOP|BOTTOM|STITCH|SEAM|FABRIC|THREAD)\b|\d{2}\s*(?:["″]|MM|INCH)/i;
const unit=/\b(\d{1,6})(?:\.0+)?\s*(?:NOS?\.?|PCS?\.?|PIECES?|EA|EACH|UNIT[S]?|BAGS?|SET[S]?)\b/ig;
const stop=/^(?:TOTAL|SUB\s*TOTAL|GRAND|TAX|GST|GSTIN|HSN|PAN|BUYER|BILL\s*TO|SHIP\s*TO|SELLER|SUPPLIER|VENDOR|ADDRESS|DATE|P\.?\s*O\.?|PURCHASE\s*ORDER|INVOICE|ORDER\s*NO|PAYMENT|DELIVERY|TERMS|NET\s*AMOUNT|FREIGHT|DISCOUNT|RATES?|AMOUNTS?|SIGNATURE|PAGE|PHONE|CONTACT|BANK|EMAIL|REMARKS?|UNIT\s*PRICE)\b/i;
const qty=s=>{const a=[...String(s).matchAll(unit)];if(a.length)return +a[a.length-1][1];const x=String(s).match(/\b(?:QTY|QUANTITY)\s*[:=\-]?\s*(\d{1,6})\b/i);return x?+x[1]:null};
function getDate(raw){
 const rows=raw.split(/\r?\n/);
 for(let i=0;i<Math.min(rows.length,110);i++){
  if(/\b(?:DELIVERY|INVOICE|DISPATCH|DUE|EXPIRY|PAYMENT|SHIP(?:MENT)?)\s*DATE\b/i.test(rows[i])&&!/\b(?:PO|ORDER)\s*DATE\b/i.test(rows[i]))continue;
  const m=rows[i].match(/\b(?:PO|P\.O\.|PURCHASE\s*ORDER|ORDER)?\s*DATE\b\s*[:=-]?\s*(.*)/i);
  if(!m)continue;
  for(const item of [m[1],rows[i+1]||'']){
   let p=item.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
   if(p){const d=p[1]+'-'+p[2].padStart(2,'0')+'-'+p[3].padStart(2,'0');if(!isNaN(Date.parse(d)))return d}
   p=item.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/);
   if(p){const d=p[3]+'-'+p[2].padStart(2,'0')+'-'+p[1].padStart(2,'0');if(!isNaN(Date.parse(d)))return d}
   p=item.match(/\b(\d{1,2})[\s\-/]+([A-Za-z]{3,9})[\s\-/]+(20\d{2})\b/);
   if(p){const dt=new Date(p[2]+' '+p[1]+', '+p[3]);if(!isNaN(dt.valueOf()))return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0')}
  }
 }
 return '';
}

function getPO(raw){
 const lines=raw.split(/\r?\n/);
 for(let i=0;i<Math.min(lines.length,110);i++){
  const line=clean(lines[i]);
  // Generic PO reference variants: Order Number, Purchase Order No, PO Ref, PO #, PO:.
  const m=line.match(/\b(?:P\.?\s*O\.?|PURCHASE\s*ORDER|ORDER)\s*(?:(?:REF(?:ERENCE)?\s*)?(?:NUMBER|NUM\.?|NO\.?|ID|#)\b\s*[:#=.\-]*\s*|[:#=]\s*)([A-Z0-9][A-Z0-9_-]{1,34}(?:\s*\/\s*[A-Z0-9][A-Z0-9_-]{0,28}){0,5})/i);
  if(m&&/\d/.test(m[1])&&!/^(?:DATE|NUMBER|PURCHASE|ORDER)$/i.test(m[1]))return m[1].replace(/\s*\/\s*/g,' / ').trim();
  // Some POs put the reference on a separate line.
  if(/^(?:P\.?\s*O\.?|PURCHASE\s*ORDER)\s*(?:NUMBER|NUM\.?|NO\.?|REF(?:ERENCE)?(?:\s*NO\.?)?|ID|#)\s*[:#=.\-]?\s*$/i.test(line)){
   const next=clean(lines[i+1]||'');
   if(/^[A-Z0-9][A-Z0-9_/-]{2,50}$/i.test(next)&&/\d/.test(next))return next.replace(/\s*\/\s*/g,' / ');
  }
 }
 return '';
}
function getParty(raw){
 const rows=raw.split(/\r?\n/).slice(0,105).map(clean);
 for(let i=0;i<rows.length;i++){
  const t=rows[i],m=t.match(/^(?:BUYER(?:\s*NAME|\s*ADDRESS)?|BILL(?:ED)?(?:\s*\/\s*INVOICE)?\s*TO|INVOICE\s*TO|PURCHASER|CUSTOMER(?:\s*NAME|\s*DETAILS)?|ORDERED\s*BY|CONSIGNEE)\s*[:\-]?\s*(.*)$/i);
  if(!m)continue;
  const own=m[1].replace(/\b(?:DELIVER\s*\/\s*SHIP|SHIP)\s*TO\s*:?.*$/i,'').trim();
  if(own.length>3&&/[A-Za-z]/.test(own)&&!/^ADDRESS\b/i.test(own))return own.slice(0,135);
  for(let j=i+1;j<Math.min(i+5,rows.length);j++){
   if(rows[j].length>3&&/[A-Za-z]/.test(rows[j])&&!stop.test(rows[j])&&!/^(?:DELIVER\s*\/\s*SHIP|SHIP)\s*TO\b/i.test(rows[j]))return rows[j].slice(0,135);
  }
 }
 // Official company letterhead, but ONLY if there is an explicit vendor block.
 // Otherwise don't mistake the supplier for the buyer.
 const header=rows.slice(0,6);
 const name=header.find(x=>/\b(?:LIMITED|PRIVATE\s*LIMITED|PVT\.?\s*LTD\.?|LTD\.?|LLP)\b/i.test(x)
   && !/\b(?:FORMERLY|KNOWN\s*AS|CIN|GST|REGISTERED\s*OFFICE|REG\s*OFFICE|TEL)\b/i.test(x));
 const vendor=rows.some(x=>/^(?:VENDOR|SUPPLIER)\s*(?:CODE|NAME|ADDRESS|DETAILS)?\s*:/i.test(x));
 return name&&vendor?name.slice(0,135):'';
}
function extract(raw){
 const lines=String(raw||'').replace(/[‐‑–—]/g,'-').split(/\r?\n/).map(clean).filter(Boolean);
 const found=[],expected={};let open=null,group='';
 function flush(){
  if(!open)return;
  let description=open.parts.join(' ').replace(/^\s*\d{1,3}\s*[.)-]\s*/,'').replace(/\s+/g,' ').trim();
  if(open.quantity!==null){
    const qmatches=[...description.matchAll(unit)];
    // PO grid: "... PORE SIZE 5 µ 18.00 NOS 3550.00 15.00 54315.00".
    // Drop the Qty/UOM AND price/discount/amount columns, not the technical spec.
    if(qmatches.length){
      const q=qmatches.find(x=>Number(x[1])===open.quantity)||qmatches[qmatches.length-1];
      const before=description.slice(0,q.index).trim();
      const after=description.slice(q.index+q[0].length).trim();
      description=(after===''||/^(?:[₹\s,]*\d[\d,.]*\s*){1,6}$/.test(after))?before:(before+' '+after).trim();
    }
   }
  description=description.replace(/^\s*[|│]\s*/,'').replace(/[\s,;|:-]+$/,'').slice(0,600);
  if(description.length>=5&&(open.isNumbered||product.test(description)||codeRx.test(description))){
   if(!found.some(x=>x.description===description&&x.qty===open.quantity))found.push({description,qty:open.quantity,group:open.group});
  }
  open=null;
 }
 for(let i=0;i<lines.length;i++){
  const line=lines[i];
  if(/^={2,}\s*(?:PO\s*)?PAGE\b/i.test(line))continue;
  const groupHead=line.match(/^(CENTRIFUGE|CF|FBD)\s*(?:FINGER)?\s*BAGS?\s*[:\-]?\s*(\d{1,5})\s*(?:NOS?|PCS?|PIECES?)\s*$/i);
  if(groupHead){flush();group=/FBD/i.test(groupHead[1])?'FBD Bag':'Centrifuge Bag';expected[group]=Number(groupHead[2]);continue}
  if(stop.test(line)){flush();continue}
  if(/^(?:SR\.?\s*NO|SL\.?\s*NO|ITEM\s*NO)\b/i.test(line)&&/\b(?:DESC|QTY|RATE)\b/i.test(line)){flush();continue}
  const n=line.match(/^(\d{1,3})\s*(?:[.)\-]\s*|\s+)(.+)$/);
  const body=(n?n[2]:line).replace(/^\s*[|│]\s*/,'').trim();
  const isProd=product.test(body)||codeRx.test(body);
  const newLine=Boolean((n&&isProd)||(isProd&&(!open||codeRx.test(body)||qty(line)!==null)));
  if(newLine){
   flush();open={parts:[body],quantity:qty(line),group,isNumbered:Boolean(n)};
   continue;
  }
  if(open){
   const q=qty(line);
   if(open.quantity===null&&q!==null)open.quantity=q;
   const rest=line.replace(unit,'').trim();
   if(rest&&open.parts.length<10&&line.length<240&&(
     spec.test(rest)||product.test(rest)||codeRx.test(rest)
     ||(open.parts.length<4&&q===null&&/[A-Za-z]{4}/.test(rest)&&!/\b(?:PRICE|RATE|RS\.?|INR)\b/i.test(rest))
   ))open.parts.push(rest);
  }
  if(found.length>=40)break;
 }
 flush();
 return {party:getParty(raw),po:getPO(raw),date:getDate(raw),found,expected,lines:lines.length};
}
window.cfmPOExtractV3=extract;
const summary=document.createElement('div');
summary.id='poV3Review';summary.className='warn';
summary.style.cssText='background:#eef8ff;border:1px solid #bedfee;margin:10px 0 14px;padding:12px;line-height:1.6;';
const table=$('lines');table.closest('section').insertBefore(summary,table);
window.cfmPOAfterParse=(result)=>{
 const missing=[];
 if(!$('party').value.trim())missing.push('Party');
 if(!$('po').value.trim())missing.push('PO No');
 if(!$('date').value)missing.push('PO Date');
 if(!result.found.length)missing.push('Product lines');
 if(result.found.some(x=>x.qty===null))missing.push('Product Qty');
 summary.textContent=(missing.length?'⚠️ Fill/verify: '+missing.join(', ')+'. ':'✓ Header values detected. ')+result.found.length+' product line(s). Full Product Specification is editable below. Original PO must be checked before Save.';
 summary.style.background=missing.length?'#fff4e0':'#e6f8ef';
};
function enlarge(tr){
 if(tr.dataset.fullPo)return;
 const input=tr.cells[0]?.querySelector('input');if(!input)return;
 tr.dataset.fullPo='1';input.classList.add('legacy-description');
 const area=document.createElement('textarea');area.className='po-big-spec';area.rows=4;area.maxLength=600;
 area.value=input.value;
 area.placeholder='Enter COMPLETE description • Product Code • Material • Size • Micron • Layer • Stitching';
 area.addEventListener('input',()=>{
  input.value=area.value;input.dispatchEvent(new Event('input',{bubbles:true}));
  area.style.height='auto';area.style.height=Math.min(Math.max(area.scrollHeight,115),330)+'px';
 });
 input.after(area);
 const cap=document.createElement('div');cap.textContent='Full Product / Technical Specification';cap.className='po-spec-caption';area.before(cap);
}
function enhance(){for(const row of table.querySelectorAll('tr'))enlarge(row)}
new MutationObserver(enhance).observe(table,{childList:true});enhance();
const style=document.createElement('style');style.id='po-fullspec-v3';style.textContent=
 '#lines .legacy-description{display:none!important}'+
 '#lines .po-big-spec{display:block;min-height:112px;max-height:340px;resize:vertical;white-space:pre-wrap;font:14px/1.5 system-ui!important;border:1px solid #b4c8d6;border-radius:10px;padding:11px;width:100%;margin:0;background:#fff;color:#173047}'+
 '#lines .po-spec-caption{font-size:11px;color:#566c79;font-weight:700;margin-bottom:7px}'+
 '#lines td:first-child{min-width:250px}#lines td:nth-child(2){min-width:90px}#lines td{vertical-align:top}'+
 '@media(max-width:680px){main{padding:9px}section{padding:11px}#lines,#lines tbody{display:block;width:100%}#lines thead{display:none}#lines tr{display:grid;grid-template-columns:minmax(0,1fr) 84px 45px;gap:9px;margin:0 0 12px;padding:11px;border:1px solid #d6e2ed;border-radius:12px;background:#fbfdff}#lines tr td{display:block;border:0;padding:0;width:auto;min-width:0!important}#lines tr td:first-child{grid-column:1/-1}#lines tr td:nth-child(2):before{content:"Qty";font-size:11px;display:block;font-weight:700;margin-bottom:7px}#lines tr td:nth-child(2) input{min-height:42px;text-align:center}#lines tr td:nth-child(3){grid-column:3}#lines tr td:nth-child(3) button{padding:9px 11px;min-height:42px}}';
document.head.appendChild(style);
// View the original PO at full size while verifying lengthy technical specifications.
const original=$('preview');
const originalLink=document.createElement('a');
originalLink.id='poOriginalFullView';
originalLink.target='_blank';originalLink.rel='noopener noreferrer';
originalLink.textContent='🔎 Open Original PO Full Size';
originalLink.style.cssText='display:none;font-weight:700;color:#126eb4;margin:8px 0 12px;font-size:13px;';
original.after(originalLink);
function sourceLink(){
 const view=original.querySelector('iframe,img');
 if(view?.src){originalLink.href=view.src;originalLink.style.display='inline-block'}
 else originalLink.style.display='none';
}
new MutationObserver(sourceLink).observe(original,{childList:true});sourceLink();
})();
