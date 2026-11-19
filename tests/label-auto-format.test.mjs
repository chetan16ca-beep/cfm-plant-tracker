/* CFM V384 stitching label smoke tests. Read-only; no actual cloud/storage. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../cfm-workorder-stitch-label-v352.js',import.meta.url),'utf8');
function harness(){
 let printed='';
 const row={
  workNo:'CFM-556',party:'ALIVUS LIFE SCIENCES',itemCode:'EFPPL-2000-CF-48-TLT',
  description:'CF BAG 48 TOP L/T',description2:'5 MICRON ANTISTATIC',
  size:'48"',micron:'5 MICRON ANTISTATIC',mfgDate:'19-Nov-2026'
 };
 const elements={
  woLabelSelect:{value:'CFM-556'},woLabelNo:{value:''},woLabelCode:{value:''},
  woLabelHeading:{value:''},woLabelDetails:{value:''},
  woLabelSize:{value:''},woLabelMicron:{value:''},woLabelMfgDate:{value:''},
  woLabelNotice:{textContent:''},
 };
 const ctx={
  font:'600 20px Arial',setTransform(){},fillRect(){},clearRect(){},drawImage(){},
  measureText(value){
   const size=Number((this.font.match(/(\d+(?:\.\d+)?)px/)||[])[1]||20);
   return{width:[...String(value)].reduce((n,c)=>
    n+(/[iIl1]/.test(c)?.31:/[MW@]/.test(c)?.82:c===' '?.34:.57),0)*size};
  }
 };
 elements.woLabelCanvas={getContext(){return ctx}};
 const document={readyState:'loading',addEventListener(){},
  getElementById(id){return elements[id]||null}};
 const window={CFM_EAGLE_BRAND:{
  logoBluePath:'M1 2L3 4Z',logoGreenPath:'M4 5L6 7Z',wordmarkPath:'M1 2L465 2Z'
 },open(){return{document:{open(){},write(html){printed=html},close(){}},close(){}}}};
 class Image{set src(_){}}
 const instrumented=source.replace(/\}\)\(\);\s*$/,
 'window.__tests={setOrders:v=>loaded=v,selectWork,label45Layout,vectorLabel,printLabel};})();');
 assert.notEqual(instrumented,source,'Could not prepare label test hooks');
 runInNewContext(instrumented,{document,window,Image}, {timeout:1200});
 window.__tests.setOrders([row]);
 return{row,elements,window,printed:()=>printed};
}
test('Selecting a Work Order automatically fills all six label fields',()=>{
 const h=harness();
 h.window.__tests.selectWork();
 const vals=h.elements;
 assert.equal(vals.woLabelNo.value,'CFM-556');
 assert.equal(vals.woLabelCode.value,'EFPPL-2000-CF-48-TLT');
 assert.equal(vals.woLabelHeading.value,'CF BAG 48 TOP L/T');
 assert.equal(vals.woLabelMicron.value,'5 MICRON ANTISTATIC');
 assert.equal(vals.woLabelSize.value,'48"');
 assert.equal(vals.woLabelMfgDate.value,'19-Nov-2026');
 const layout=h.window.__tests.label45Layout();
 assert.equal(layout.valid,true);
 assert.equal(layout.fields.length,6);
 for(const info of layout.fields)assert.ok(layout[info.key]?.lines?.length>0,info.key+' must fit');
});
test('Approved 85x45 layout uses original EAGLE logo and six white non-bold heading cells',()=>{
 const h=harness();h.window.__tests.selectWork();
 const svg=h.window.__tests.vectorLabel();
 for(const phrase of ['width="85mm" height="45mm"','SINCE : 1992',
  'info@eaglefiltrations.com','www.eaglefiltrations.com','+91 70416 70091',
  'Mfg. of All Types of Industrial Filters, Bag Filters, & Automobile Filters.',
  'WO NO.','ITEM CODE','PRODUCT','MICRON /','SPECIFICATION','SIZE','MFG. DATE',
  'EFPPL-2000-CF-48-TLT','CF BAG 48 TOP L/T','5 MICRON ANTISTATIC']){
  assert.ok(svg.includes(phrase),'Label preview missing '+phrase);
 }
 assert.match(svg,/M1 2L465 2Z/,'Logo must use corporate wordmark path');
 assert.ok(svg.includes('fill="#fff"'),'Heading boxes are white');
 assert.match(svg, /WO NO\.<\/text>/);
 assert.match(svg, /font-weight="400"[^>]*>WO NO\.<\/text>/);
 assert.match(svg, /font-weight="400"[^>]*>ITEM CODE<\/text>/);
 assert.match(svg, /font-weight="400"[^>]*>PRODUCT<\/text>/);
 assert.match(svg, /font-weight="600"[^>]*>CFM-556<\/text>/);
 assert.doesNotMatch(svg, /<rect[^>]*fill="#19398e"/);
 assert.doesNotMatch(svg, /<path[^>]*fill="#19398e"/);
});
test('Direct TA220 print is black/white vector at actual 85x45 size',()=>{
 const h=harness();h.window.__tests.selectWork();h.window.__tests.printLabel(false);
 const html=h.printed();
 assert.ok(html.includes('@page{size:85mm 45mm;margin:0}'));
 assert.match(html,/<svg /);
 assert.ok(html.includes('EFPPL-2000-CF-48-TLT'));
 assert.doesNotMatch(html,/#19398e|#ee2737|#20a34f/);
 assert.ok(html.includes('fill="#000"'));
});
test('Overlong Work Order product blocks printing instead of clipping',()=>{
 const h=harness();h.window.__tests.selectWork();
 h.elements.woLabelHeading.value='EXCESSIVELY LONG PRODUCT DESCRIPTION '.repeat(100);
 const layout=h.window.__tests.label45Layout();
 assert.equal(layout.valid,false);
 assert.ok(layout.overflowFields.includes('PRODUCT'));
 assert.equal(h.window.__tests.vectorLabel(),null);
});
test('Compact new UI keeps Work Order selector, preview, print and optional advanced details',()=>{
 for(const id of ['woLabelSelect','woLabelNo','woLabelCode','woLabelHeading','woLabelMicron',
  'woLabelSize','woLabelMfgDate','woLabelCanvas','woLabelPrint','woLabelA4','woLabelDetails']){
  assert.ok(source.includes('id="'+id+'"'),'Missing UI control '+id);
 }
 assert.match(source,/class="advanced"/);
 assert.match(source,/LIVE PRINT PREVIEW/);
 assert.doesNotMatch(source,/Phone is in the header\. Missing size and manufacturing date/);
});