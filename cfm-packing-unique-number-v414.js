/* CFM V414: one globally unique, auto-incrementing Packing Slip document number.
 * Same series across single-WO, multi-PO/WO and no-WO shipments.
 * Reservation happens ONLY inside a version-checked Cloud save transaction.
 * Never reuses numbers of saved or deleted slips; never renumbers old records.
 */
(function(){
'use strict';
const ROOT='EFPPL/PS/';
const str=x=>String(x??'').trim();
const refs=p=>[
 ...(Array.isArray(p?.packingSlips)?p.packingSlips:[]),
 ...(Array.isArray(p?.packingSlipDeletedRefs)?p.packingSlipDeletedRefs:[])
];
function sequenceFrom(x){
 const m=/^EFPPL\/PS\/\d{4}\/(\d{1,12})$/i.exec(str(x));
 return m?Number(m[1]):0;
}
function next(payload,date=new Date()){
 if(!payload||typeof payload!=='object')throw Error('Verified Cloud packing snapshot required');
 const yr=date.getFullYear();
 if(!Number.isSafeInteger(yr)||yr<2026||yr>2099)throw Error('Invalid Packing Slip date/year');
 const oldRefs=refs(payload);
 const recorded=new Set();
 const names=new Set();
 let largest=0;
 for(const row of oldRefs){
  const id=str(row?.id),no=str(row?.slipNo);
  if(id)recorded.add(id);
  if(no)names.add(no.toUpperCase());
  const seq=sequenceFrom(no);
  if(Number.isSafeInteger(seq)&&seq>largest)largest=seq;
 }
 const prior=Number(payload.packingSlipGlobalSequence);
 if(payload.packingSlipGlobalSequence!==undefined&&payload.packingSlipGlobalSequence!==null&&
   (!Number.isSafeInteger(prior)||prior<0))
   throw Error('Invalid Cloud Packing Slip sequence; cannot reserve a document number');
 // When enabling on existing ERP, count old distinct Cloud audit IDs as the
 // initial floor. This avoids reusing a previously deleted/documented number.
 const base=Math.max(largest,Number.isSafeInteger(prior)?prior:0,recorded.size);
 const serial=base+1;
 if(!Number.isSafeInteger(serial)||serial>999999999)throw Error('Packing Slip serial range exhausted');
 const slipNo=ROOT+yr+'/'+String(serial).padStart(5,'0');
 if(names.has(slipNo.toUpperCase()))throw Error('Duplicate Packing Slip number detected');
 return {slipNo,serial,year:yr};
}
function verify(payload,doc){
 if(!doc||!Number.isSafeInteger(doc.serial)||!str(doc.slipNo))
  throw Error('Invalid Packing Slip document identifier');
 const active=(Array.isArray(payload?.packingSlips)?payload.packingSlips:[]);
 const historic=(Array.isArray(payload?.packingSlipDeletedRefs)?payload.packingSlipDeletedRefs:[]);
 const count=active.filter(x=>str(x.slipNo).toUpperCase()===str(doc.slipNo).toUpperCase()).length;
 const deleted=historic.some(x=>str(x.slipNo).toUpperCase()===str(doc.slipNo).toUpperCase());
 if(count!==1||deleted||Number(payload.packingSlipGlobalSequence)<doc.serial)
  throw Error('Cloud Unique Slip No. verification failed; do not print this document');
 return true;
}
window.CFM_PACK_UNIQUE_V414=Object.freeze({next,verify,sequenceFrom});
})();