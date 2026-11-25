/* Bill attachment ledger: pure validation, no production writes. */
(function(root){
'use strict';
const key=v=>String(v??'').trim().toUpperCase();
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
 if(sent>n)throw Error('Dispatch exceeds order quantity');
 return {orderQty:n,confirmedDispatchQty:sent,balanceQty:n-sent,needsLegacyReview:sent===0&&(key(order.status)==='DISPATCHED'||!!order.dispatchDoneAt)};
}
root.CFM_BILL_DISPATCH_LEDGER={summarize};
})(typeof window==='undefined'?globalThis:window);
