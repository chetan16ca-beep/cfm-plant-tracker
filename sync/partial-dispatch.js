/* Partial dispatch domain rules; no production writes. */
(function(root){
"use strict";
function qty(v){const n=Number(v);if(!Number.isSafeInteger(n)||n<0)throw Error("Invalid quantity");return n;}
function summary(order,entries){
 const total=qty(order.orderQty), seen=new Set();let sent=0;
 for(const e of entries){if(!e.id||seen.has(e.id))throw Error("Duplicate dispatch ID");seen.add(e.id);sent+=qty(e.qty);}
 if(sent>total)throw Error("Dispatch exceeds order");
 return {orderQty:total,dispatchQty:sent,balanceQty:total-sent,status:sent===total&&total>0?"DISPATCHED":sent>0?"PARTIAL DISPATCH":"PENDING"};
}
function add(order,entries,entry){if(!entry.id||!entry.date||qty(entry.qty)===0)throw Error("Dispatch ID, date and positive quantity required");const next=[...entries,entry];return {entries:next,...summary(order,next)};}
root.CFMPartialDispatch=Object.freeze({summary,add});
})(typeof window!=="undefined"?window:globalThis);
