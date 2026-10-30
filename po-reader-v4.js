/* CFM PO Reader V4: generic PO layout corrections, client-side only.
   Does not save work orders. Always require operator verification. */
(function(){
'use strict';
const base=window.cfmPOExtractV3;
if(typeof base!=='function')return;
const norm=s=>String(s||'').replace(/[‐‑–—]/g,'-').replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').trim();
function getBuyer(raw,buyer){
 if(buyer)return buyer;
 const lines=String(raw||'').split(/\r?\n/);
 // Parallel vendor and buyer address headers.
 const ix=lines.findIndex(x=>/\bVENDOR\s+ADDRESS\b/i.test(x)&&/\bBUYER\s+ADDRESS\b/i.test(x));
 if(ix>=0){
  for(let k=ix+1;k<Math.min(ix+6,lines.length);k++){
   const cells=lines[k].trim().split(/\s{4,}/).map(norm).filter(Boolean);
   const right=cells[cells.length-1];
   if(cells.length>=2&&right&&/\b(?:LIMITED|PVT\.?\s*LTD\.?|LTD\.?)\b/i.test(right))
    return right.slice(0,135);
  }
 }
 // Small manufacturer letterhead with an explicit TO: supplier section.
 if(lines.some(x=>/^\s*(?:TO[,:]?|M\/S)\s*$/i.test(x))&&
    lines.some(x=>/^\s*(?:PURCHASE\s+ORDER|P\s*O)\s*$/i.test(x))){
   const header=lines.filter(x=>x.trim()).slice(0,6).map(x=>x.trim().split(/\s{4,}/)[0].trim());
   if(header.length>1&&/^[A-Z][A-Z .&/-]{3,}$/.test(header[0])
    &&/^(?:ENGINEERING|CHEMICAL|PHARMA|INDUSTR|MANUFACTUR)/i.test(header[1]))
    return (header[0]+' '+header[1]).slice(0,135);
 }
 return '';
}
const validQty=(n)=>Number.isSafeInteger(n)&&n>0&&n<100000;
function groupItems(raw){
 const lines=String(raw||'').replace(/[‐‑–—]/g,'-').split(/\r?\n/).map(norm).filter(Boolean);
 const hdr=/^(\d{1,3})\s+((?:CENTRIFUGE|CENTRIFUGAL|CF\s+|FBD|RVPD|RCVD|FILTER\s+).{3,190}?)\s+(\d{1,5})(?:\.0+)?\s*(NOS?\.?|PCS?\.?|PIECES?|EA|EACH|UNITS?)\b/i;
 const productCode=/\b((?:I?CFG|I?FBD|NF)[- ]?\d{2,5})\b/i;
 const qtyPattern=/\b(\d{1,5})(?:\.0+)?\s*(?:NOS?\.?|PCS?\.?|PIECES?|EA|EACH|UNITS?)\b/i;
 let parent=null,hasChildren=false;
 const groups=[];
 for(let i=0;i<lines.length;i++){
  const line=lines[i];
  if(/^(?:PAYMENT\s+TERMS|MANDATORY\s+INSTRUCTIONS|TERMS?\s*(?:&|AND)\s*CONDITIONS|GRAND\s+TOTAL|GST\s*\d)\b/i.test(line))break;
  const head=line.match(hdr);
  if(head){
   const family=head[2].replace(/[\s,;]+$/,'').trim();
   parent={family,qty:Number(head[3]),children:[],row:i,
    group:/\bFBD\b/i.test(family)?'FBD Bag':/\b(?:CENTRIFUGE|CENTRIFUGAL|CF)\b/i.test(family)?'Centrifuge Bag':'Other'};
   groups.push(parent);continue;
  }
  if(!parent)continue;
  const code=line.match(productCode),qty=line.match(qtyPattern);
  if(code&&qty&&line.length<200){
   const matches=[...line.matchAll(/(\d{1,5})(?:\.0+)?\s*(?:NOS?\.?|PCS?\.?|PIECES?|EA|EACH|UNITS?)\b/ig)];
   const last=matches[matches.length-1];
   const desc=last?(line.slice(0,last.index)+line.slice(last.index+last[0].length)).trim():line;
   const full=(parent.family+' | '+desc).replace(/\s+/g,' ').slice(0,600);
   parent.children.push({description:full,itemCode:code[1].replace(/\s+/g,'').toUpperCase(),qty:Number(qty[1]),group:parent.group});
   hasChildren=true;continue;
  }
  if(!parent.children.length&&i===parent.row+1&&/^[A-Za-z].{3,130}$/.test(line)&&
      !/^(?:QUOTATION|TOTAL|GST|RATE|PRICE)\b/i.test(line))
   parent.extra=line;
 }
 if(!hasChildren)return null;
 const found=[],expected={};
 for(const p of groups){
  if(p.children.length){
   found.push(...p.children);
   if(p.group!=='Other')expected[p.group]=p.qty;
  }else{
   found.push({description:(p.family+(p.extra?' | '+p.extra:'')).slice(0,600),itemCode:'',qty:p.qty,group:p.group});
  }
 }
 return found.length?{found,expected,extraction:'nested-line-items',needsReview:found.some(x=>!validQty(x.qty))}:null;
}
function simpleQtyTable(raw){
 const lines=String(raw||'').replace(/[‐‑–—]/g,'-').split(/\r?\n/).map(norm).filter(Boolean);
 const header=lines.findIndex(x=>/\b(?:SR\.?|S\.?\s*NO\.?|ITEM)\b/i.test(x)&&/\bQTY\b/i.test(x)&&/\b(?:SIZE|DESCRIPTION|ITEM)\b/i.test(x));
 if(header<0)return null;
 const found=[];
 for(let i=header+1;i<Math.min(lines.length,header+85);i++){
  const line=lines[i];
  if(/^(?:DELIVERY\s*:|PAYMENT\s*:|GST\s*:|TERMS|WITH BEST REGARDS|AUTHORIZED|FOR,\s|REMARKS|AMOUNT\s+IN\s+WORDS)\b/i.test(line))break;
  const m=line.match(/^(\d{1,3})\s+(.{9,220}?)\s+(\d{1,4})(?:\.0+)?\s*$/);
  if(!m)continue;
  const desc=norm(m[2]),qty=Number(m[3]);
  if(!validQty(qty)||!/[A-Za-z]{3}/.test(desc)
   ||!/\b(?:FILTER|CENTRIFUGE|CLOTH|FBD|BAG|CARTRIDGE|PAD|HOUSING|SPARKLER|ANFD|RVPD|HEPA)\b/i.test(desc))continue;
  found.push({description:desc,itemCode:'',qty,group:''});
 }
 return found.length?{found,expected:{},extraction:'numbered-qty-table',needsReview:false}:null;
}
window.cfmPOExtractV3=function(raw){
 const parsed=base(raw);
 const nested=groupItems(raw),simple=simpleQtyTable(raw);
 const chosen=nested||(simple&&(
  parsed.found.length===0||
  parsed.found.filter(x=>validQty(x.qty)).length<simple.found.length||
  (simple.found.length>=2&&parsed.found.some(x=>!validQty(x.qty)))
 )?simple:null);
 const result=chosen?{...parsed,...chosen}:parsed;
 result.party=getBuyer(raw,result.party);
 result.needsReview=!!(result.needsReview||result.found.some(x=>!validQty(x.qty)));
 return result;
};
window.cfmPOReaderV4Ready=true;
})();