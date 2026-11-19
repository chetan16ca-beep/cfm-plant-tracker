/* CFM Packing Slip V380: read-only smoke tests. Never connect to Cloud. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source=readFileSync(new URL('../cfm-packing-slip-dispatch-v355.js',import.meta.url),'utf8');
const legacy=readFileSync(new URL('../cfm-legacy-packing-letterhead-v366.js',import.meta.url),'utf8');

function harness(){
 let printed='';
 const elements={
  packSlipWO:{value:'CFM-900'},
  packSlipPartyAddress:{value:'A-14 Industrial Estate, Ahmedabad, Gujarat'},
  packSlipThis:{value:'4'},
  packSlipPrior:{value:''},
  packSlipRemarks:{value:'Test only'}
 };
 const win={open(){return{document:{open(){},write(html){printed=html},close(){}},close(){}}}};
 const doc={readyState:'loading',addEventListener(){},getElementById(id){return elements[id]||null}};
 const instrumented=source.replace(/\}\)\(\);\s*$/,
  'window.__test={printSlip,previewFromWorkOrder,setRemote:v=>remote=v};})();');
 assert.notEqual(instrumented,source,'Packing Slip test export must be available');
 runInNewContext(instrumented,{document:doc,window:win,confirm(){throw Error('preview must not confirm a dispatch')},
  cloudPush(){throw Error('preview must not save Cloud data')},setTimeout(){throw Error('preview must not schedule saves')}},
  {timeout:1000});
 return{win,elements,html:()=>printed};
}
const order={workNo:'CFM-900',party:'ALIVUS LIFE SCIENCES',poNo:'ALV-PO-009',poDate:'2026-11-19',
 buyerItemCode:'608835',itemCode:'EFPPL-1008-CF48L-2MICRON',
 description:'CF48L FILTER BAG',description2:'2 Micron Antistatic',size:'48 INCH',
 micron:'2 MICRON',orderQty:20};

test('Exact Work Order PO, buyer item, EFPPL code, product, address and qty appear in landscape preview',()=>{
 const h=harness();
 h.win.__test.setRemote({payload:{pending:[order],packingSlips:[]}});
 h.win.__test.previewFromWorkOrder();
 const html=h.html();
 for(const phrase of ['ALIVUS LIFE SCIENCES','ALV-PO-009','608835','EFPPL-1008-CF48L-2MICRON',
 'CF48L FILTER BAG','2 Micron Antistatic','A-14 Industrial Estate, Ahmedabad, Gujarat',
 'ORDER QTY','PREVIOUS SENT','THIS DISPATCH','TOTAL SENT','BALANCE','DRAFT / NOT DISPATCHED',
 '@page{size:A4 landscape']){
  assert.ok(html.includes(phrase),'Missing packing detail: '+phrase);
 }
 assert.ok(html.endsWith('</html>'),'Complete print HTML must render');
});

test('Missing address is marked as missing, never fabricated',()=>{
 const h=harness();h.elements.packSlipPartyAddress.value='';
 h.win.__test.setRemote({payload:{pending:[order],packingSlips:[]}});
 h.win.__test.previewFromWorkOrder();
 assert.match(h.html(),/Address not recorded/);
 assert.doesNotMatch(h.html(),/A-14 Industrial Estate/);
});

test('Saved slip reprint uses original captured PO and address, not new fake details',()=>{
 const h=harness();
 h.win.__test.printSlip(true,{
  slipNo:'PK/CFM-500/001',party:'Test Party',partyAddress:'Original Address',
  poNo:'OLD-PO-85',workNo:'CFM-500',description:'Exact product',description2:'Spec',
  customerItemNo:'Customer-99',efpplCode:'EFPPL-99',orderQty:50,
  previousDispatched:10,thisDispatched:5,totalDispatched:15,balanceAfter:35,createdAt:'2026-11-18'
 });
 assert.match(h.html(),/Original Address/);
 assert.match(h.html(),/OLD-PO-85/);
 assert.match(h.html(),/Customer-99/);
 assert.doesNotMatch(h.html(),/DRAFT \/ NOT DISPATCHED/);
});

test('Print code preserves order data integrity and legacy Work Order print enhancement is read-only',()=>{
 assert.match(source,/state\.packingSlips=\[\.\.\.liveLog,record\]/);
 assert.match(source,/partyAddress:address/);
 assert.match(source,/Ship-to \/ Party Address missing/);
 assert.match(source,/onclick=previewFromWorkOrder/);
 assert.match(legacy,/Ship-to \/ Party Address/);
 assert.match(legacy,/text\(x\.workNo\)===wo/);
 assert.doesNotMatch(legacy,/state\.packingSlips\s*=/);
});