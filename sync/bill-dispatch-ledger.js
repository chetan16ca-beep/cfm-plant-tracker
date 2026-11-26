/* Bill attachment ledger: pure validation, no production writes. */
(function(root){
'use strict';
const key=v=>String(v??'').trim().toUpperCase();
function identity(order){return JSON.stringify([key(order.workNo),key(order.party),key(order.poNo),key(order.description),Number(order.orderQty)])}
function manual(order){
 const history=Array.isArray(order.manualDispatchHistory)?order.manualDispatchHistory:[];
 if(!history.length)return {qty:0,verified:false};
 const last=history[history.length-1];
 if(last.identity!==identity(order)||!Number.isSafeInteger(last.additionalQty)||last.additionalQty<0)throw Error('Manual dispatch history requires verification');
 return {qty:last.additionalQty,verified:true};
}
function summarize(order, slips){
 const n=Number(order.orderQty); if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid order quantity');
 let sent=0; const seen=new Set();
 for(const slip of slips){
  const id=key(slip.id||slip.slipNo); if(!id||seen.has(id))throw Error('Missing or duplicate packing slip identity');seen.add(id);
  const items=Array.isArray(slip.items)&&slip.items.length?slip.items:[{workNo:slip.workNo,qty:slip.thisDispatched,manualPreviousBaseline:slip.manualPreviousBaseline}];
  for(const item of items){if(key(item.workNo)!==key(order.workNo))continue;
   const q=Number(item.qty),b=Number(item.manualPreviousBaseline||0);
   if(!Number.isSafeInteger(q)||q<0||!Number.isSafeInteger(b)||b<0)throw Error('Invalid shipment quantity');sent+=q+b;
  }
 }
 const packingQty=sent,m=manual(order);sent+=m.qty;
 if(sent>n)throw Error('Dispatch exceeds order quantity');
 return {orderQty:n,confirmedDispatchQty:sent,balanceQty:n-sent,packingQty,manualQty:m.qty,manualVerified:m.verified,needsLegacyReview:!m.verified&&sent===0&&(key(order.status)==='DISPATCHED'||!!order.dispatchDoneAt)};
}
root.CFM_BILL_DISPATCH_LEDGER={summarize,identity,manual};
})(typeof window==='undefined'?globalThis:window);
