/* CFM PO Reader V5: generic buyer PO table fallback.
   Read-only extraction; an operator must verify the original PO.
   Amount/rate/HSN must never be guessed as quantity. */
(function(){
'use strict';
const previous=window.cfmPOExtractV3;
if(typeof previous!=='function')return;
const norm=x=>String(x||'').replace(/[‐‑‒–—]/g,'-').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const unit=/^(?:NOS?\.?|PCS?\.?|PIECES?|EA|EACH|UNITS?|BAGS?|SETS?|ROLLS?|MTRS?|METERS?|KGS?|PAIRS?|PACKS?|BOXES?)$/i;
const prod=/\b(?:FILTER|BAG|CLOTH|FABRIC|CENTRIFUGE|CENTRIFUGAL|FBD|ANFD|RVPD|RCVD|HEPA|CARTRIDGE|HOUSING|PAD|PAPER|MESH|SCREEN|GASKET|VALVE|PIPE|SLEEVE|ELEMENT|PTFE|PVDF|POLYESTER|POLYPROPYLENE|MICRON)\b/i;
const header=/\b(?:DESCRIPTION|PARTICULAR|PRODUCT|ITEM|MATERIAL|ARTICLE|GOODS|SPECIFICATION)\b/i;
const stop=/^(?:TERMS|PAYMENT|DELIVERY\s+TERMS|TOTAL|GRAND|GST|GSTIN|TAX|SIGNATURE|AUTHORIZED|AMOUNT\s+IN\s+WORDS|BANK|REMARKS)\b/i;
const positive=x=>Number.isSafeInteger(x)&&x>0&&x<=100000;
const toInt=x=>/^\d{1,6}(?:\.0+)?$/.test(String(x||'').trim())?Number(x):null;
function structured(raw){
 const lines=String(raw||'').split(/\r?\n/);
 let headerFound=false,found=[],sawRows=false;
 for(const line of lines){
  const cells=line.split(/\s*\|\s*|\t+|\s{3,}/).map(norm).filter(Boolean);
  if(cells.length<3)continue;
  if(header.test(line)&&/\b(?:QTY|QUANTITY|ORDERED|UOM)\b/i.test(line)&&
      !/^(?:HSN|SAC|TAX)\b/i.test(norm(line))){headerFound=true;continue}
  if(!headerFound||stop.test(norm(line)))continue;
  const sn=toInt(cells[0]);
  if(sn==null||sn>999)continue;
  let qIndex=-1;
  for(let j=1;j<cells.length-1;j++){
   const quantity=toInt(cells[j]);
   if(positive(quantity)&&unit.test(cells[j+1])){qIndex=j;break}
  }
  if(qIndex<2)continue;
  let dIndex=-1;
  for(let j=qIndex-1;j>=1;j--)if(/[A-Za-z]{3}/.test(cells[j])&&!stop.test(cells[j])&&!unit.test(cells[j])){dIndex=j;break}
  if(dIndex<1)continue;
  const desc=norm(cells[dIndex]).slice(0,600);
  if(desc.length<5)continue;
  // Exact item code stays separate, description is never replaced by a master.
  const before=cells.slice(1,dIndex);
  const code=before.find(x=>/^[A-Z0-9][A-Z0-9_/-]{3,49}$/i.test(x))||'';
  found.push({description:desc,itemCode:code,qty:toInt(cells[qIndex]),group:''});
  sawRows=true;
 }
 return sawRows?{found,expected:{},extraction:'generic-structured-table',needsReview:false}:null;
}
function plain(raw){
 const lines=String(raw||'').split(/\r?\n/);
 const start=lines.findIndex(x=>header.test(x)&&/\b(?:QTY|QUANTITY)\b/i.test(x));
 if(start<0)return null;
 const found=[];
 for(let k=start+1;k<Math.min(lines.length,start+110);k++){
  const line=norm(lines[k]);
  if(stop.test(line))break;
  let m=line.match(/^(\d{1,3})\s*[.)\-]?\s+(.{5,240}?)\s+(\d{1,5})(?:\.0+)?$/);
  if(m&&prod.test(m[2])&&positive(Number(m[3]))){
   // Avoid swallowing the size spec as quantity: only use when an explicit
   // Qty header exists and this value is the final numeric token.
   found.push({description:norm(m[2]).slice(0,600),itemCode:'',qty:Number(m[3]),group:''});
   continue;
  }
  // Some buyer tables start Qty+UOM then the item description.
  m=line.match(/^(\d{1,3})\s+(\d{1,5})\s+(NOS?\.?|PCS?\.?|EA|MTRS?|KGS?)\s+(.{5,240})$/i);
  if(m&&prod.test(m[4])&&positive(Number(m[2]))){
   found.push({description:norm(m[4]).slice(0,600),itemCode:'',qty:Number(m[2]),group:''});
  }
 }
 return found.length?{found,expected:{},extraction:'generic-plain-table',needsReview:false}:null;
}
function moreMetadata(raw,o){
 const rows=String(raw||'').split(/\r?\n/);
 const out={...o};
 if(!out.party){
  for(const row of rows.slice(0,100)){
   const m=row.match(/^\s*(?:BUYER(?:\s+NAME|\s+COMPANY)?|CUSTOMER(?:\s+NAME)?|COMPANY\s+NAME)\s*[:\-]\s*(.{5,130})$/i);
   if(m&&/[A-Za-z]/.test(m[1])){out.party=norm(m[1]).slice(0,135);break}
  }
 }
 if(!out.po){
  for(const row of rows.slice(0,90)){
   const m=row.match(/\b(?:PURCHASE\s*ORDER|P\.?\s*O\.?|ORDER)\s*(?:REF(?:ERENCE)?|NO\.?|NUMBER|#)?\s*[:#=.\-]?\s*([A-Z0-9][A-Z0-9/-]{2,45})\b/i);
   if(m&&/\d/.test(m[1])){out.po=m[1];break}
  }
 }
 return out;
}
function score(r){
 const a=Array.isArray(r.found)?r.found:[];
 const complete=a.filter(x=>positive(x.qty)).length;
 return complete*20+a.length*3-(a.length-complete)*12;
}
window.cfmPOExtractV3=function(raw){
 const original=previous(raw);
 const pipe=structured(raw);
 const fallback=plain(raw);
 const candidate=pipe||(fallback&&score(fallback)>score(original)+8?fallback:null);
 // Explicitly structured Qty/UOM columns take priority over earlier parsers:
 // older parser sometimes mistook the trailing Rate column for the item Qty.
 const improved=candidate&&(
  (candidate.extraction==='generic-structured-table'&&candidate.found.length>=original.found.length)||
  score(candidate)>score(original)+8
 )?{...original,...candidate}:original;
 const result=moreMetadata(raw,improved);
 result.needsReview=!!(result.needsReview||result.found.some(x=>!positive(x.qty)));
 return result;
};
window.cfmPOReaderV5Ready=true;
})();