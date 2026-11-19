/* CFM V351: Eagle Bag Stitching Label — print and image only, no ERP data writes. */
(function(){
'use strict';
const $=id=>document.getElementById(id),B='#153c82',W=531,H=1004;
let imported=null;
function text(id){return String($(id)?.value||'').trim()}
function put(id,v){if($(id)&&v!=null)$(id).value=String(v)}
function rows(){try{return typeof state!=='undefined'&&Array.isArray(state.pending)?state.pending:[]}catch(e){return []}}
function master(){return window.CFM_EFPPL_MASTER||[]}
function message(v){$('eagleLabelStatus').textContent=v}
function human(s){const x=String(s||'').match(/^(\d{4})-(\d\d)-(\d\d)$/);return x?x[3]+'/'+x[2]+'/'+x[1]:s}
const css='#eagleLabelOpen{margin:7px;padding:10px 13px;border:1px solid #9ebbd9;border-radius:9px;background:#edf5ff;color:#164879;font:750 12px system-ui;cursor:pointer}'+
'#eagleLabelDialog{width:min(920px,96vw);max-width:920px;max-height:94dvh;overflow:auto;padding:0;border:1px solid #b2c9e2;border-radius:14px;background:#f8fbff;color:#16364d;box-shadow:0 14px 40px #0004}'+
'#eagleLabelDialog::backdrop{background:#152a41ab}#eagleLabelDialog *{box-sizing:border-box;font-family:Arial,sans-serif}'+
'#eagleLabelDialog .head{position:sticky;top:0;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 14px;background:#153c82;color:#fff}'+
'#eagleLabelDialog .head strong{font-size:15px}#eagleLabelDialog .head small{display:block;font-size:11px;margin-top:3px}'+
'#eagleLabelDialog .layout{padding:12px;display:grid;grid-template-columns:minmax(0,1fr) 240px;gap:14px}'+
'#eagleLabelDialog .fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}'+
'#eagleLabelDialog label{display:block;font-size:11px;font-weight:700;color:#20445e}'+
'#eagleLabelDialog .full{grid-column:1/-1}'+
'#eagleLabelDialog input,#eagleLabelDialog select,#eagleLabelDialog textarea{display:block;width:100%;min-height:37px;margin-top:4px;padding:8px;border:1px solid #b7cbdf;border-radius:8px;background:#fff;color:#102e4a;font-size:12px}'+
'#eagleLabelDialog textarea{min-height:83px;resize:vertical}#eagleLabelDialog button{border:1px solid #a3bad1;border-radius:8px;padding:9px 11px;background:#fff;color:#184875;font-weight:700;font-size:12px;cursor:pointer}'+
'#eagleLabelDialog .primary{background:#1858a3;color:#fff;border-color:#1858a3}'+
'#eagleLabelDialog .actions{display:flex;flex-wrap:wrap;gap:7px;padding:10px 12px;position:sticky;bottom:0;background:white;border-top:1px solid #d4e1ee}'+
'#eagleLabelDialog .preview{display:flex;align-items:center;flex-direction:column;gap:8px}'+
'#eagleLabelDialog canvas{display:block;width:225px;height:425px;max-width:100%;box-shadow:0 4px 12px #0002;border:1px solid #b5c6d6;background:#fff}'+
'#eagleLabelDialog .note{font-size:11px;line-height:1.5;color:#586f84}#eagleLabelStatus{font-size:11px;color:#385d7a;text-align:center}'+
'@media(max-width:620px){#eagleLabelDialog .layout{grid-template-columns:1fr;padding:9px}#eagleLabelDialog .preview{order:-1}#eagleLabelDialog canvas{width:167px;height:315px}}';
function draw(){
 const can=$('eagleLabelCanvas'),ctx=can.getContext('2d');ctx.setTransform(W/450,0,0,H/850,0,0);
 ctx.clearRect(0,0,450,850);ctx.fillStyle='#fff';ctx.fillRect(0,0,450,850);
 ctx.strokeStyle=B;ctx.lineWidth=3;ctx.strokeRect(7,7,436,836);ctx.setLineDash([8,7]);ctx.lineWidth=2;ctx.strokeRect(25,25,400,800);ctx.setLineDash([]);
 ctx.fillStyle=B;
 // Monochrome eagle wing, suitable for transfer printing
 ctx.beginPath();ctx.moveTo(45,170);ctx.bezierCurveTo(50,100,78,65,132,73);ctx.bezierCurveTo(112,84,103,98,104,113);ctx.bezierCurveTo(94,106,72,110,61,125);ctx.bezierCurveTo(86,122,98,141,103,150);ctx.bezierCurveTo(82,138,58,151,45,170);ctx.fill();
 ctx.beginPath();ctx.moveTo(117,95);ctx.lineTo(145,104);ctx.lineTo(121,120);ctx.fill();
 ctx.font='900 65px Arial';ctx.fillText('EAGLE',151,133);
 ctx.font='bold 19px Arial';ctx.fillText('FILTRATION PRODUCT PVT. LTD.',44,191);
 ctx.font='italic 12px Arial';ctx.textAlign='center';ctx.fillText('Clean Air  •  Clean Process  •  Better Tomorrow',225,220);ctx.textAlign='left';
 ctx.beginPath();ctx.lineWidth=2;ctx.moveTo(40,248);ctx.lineTo(410,248);ctx.stroke();
 const data=[
 ['Product',text('eagleProduct')],['Size',text('eagleSize')],['Micron',text('eagleMicron')],
 ['Material',text('eagleMaterial')],['Work Order No.',text('eagleWorkNo')],
 ['Mfg. Date',human(text('eagleMfgDate'))],['Product Code',text('eagleProductCode')]];
 let y=276;
 for(let i=0;i<data.length;i++){
  const a=data[i],height=i===0||i===6?68:66;
  ctx.fillStyle=i%2?'#fff':'#f5f8fd';ctx.fillRect(41,y,368,height-3);
  ctx.fillStyle=B;ctx.font='bold 17px Arial';ctx.fillText(a[0],48,y+25);
  ctx.fillText(':',179,y+25);
  let v=a[1],f=i===6?13:17;
  ctx.font='bold '+f+'px Arial';
  while(v.length&&ctx.measureText(v).width>212&&f>11){f--;ctx.font='bold '+f+'px Arial'}
  if(ctx.measureText(v).width>212){while(v.length&&ctx.measureText(v+'…').width>212)v=v.slice(0,-1);v+='…'}
  ctx.fillText(v,194,y+25);
  ctx.strokeStyle='#b7c9e0';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(48,y+height-5);ctx.lineTo(400,y+height-5);ctx.stroke();
  y+=height;
 }
 ctx.fillStyle=B;ctx.fillRect(36,777,378,46);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 28px Arial';ctx.fillText('MADE IN INDIA',225,809);ctx.textAlign='left';imported=null;
}
function fillMatter(){
 let count=0;const rules=[
 ['eagleWorkNo',/^(?:work\s*order(?:\s*(?:no|number))?|work\s*no|wo(?:\s*no)?)\s*[:=\-]\s*(.+)$/i],
 ['eagleProductCode',/^(?:product\s*code|item\s*code|efppl\s*code)\s*[:=\-]\s*(.+)$/i],
 ['eagleProduct',/^(?:product(?:\s*name)?|item|description)\s*[:=\-]\s*(.+)$/i],
 ['eagleSize',/^size\s*[:=\-]\s*(.+)$/i],
 ['eagleMicron',/^microns?\s*[:=\-]\s*(.+)$/i],
 ['eagleMaterial',/^material\s*[:=\-]\s*(.+)$/i],
 ['eagleMfgDate',/^(?:mfg(?:\.|\s*date)?|manufactur(?:e|ing)\s*date|date)\s*[:=\-]\s*(.+)$/i]];
 for(const line of text('eagleMatter').split(/\r?\n|;/)){
  for(const [id,pattern] of rules){
   const m=line.trim().match(pattern);if(!m)continue;
   let v=m[1].trim();
   if(id==='eagleMfgDate'){const x=v.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);if(x)v=x[3]+'-'+x[2].padStart(2,'0')+'-'+x[1].padStart(2,'0')}
   put(id,v);count++;break;
  }
 }
 const code=master().find(x=>x.code===text('eagleProductCode'));if(code)put('eagleProductSelect',code.code);
 draw();message(count?count+' fields filled. Check and print.':'Use headings Product:, Size:, Micron:, Material:, Work Order No.:');
}
function workOrderOptions(){
 const sel=$('eagleWorkSelect'),old=sel.value;
 sel.replaceChildren(new Option('Select Work Order / manual entry',''));
 const seen=new Set();
 const list=[...rows()].sort((a,b)=>Number(String(b.workNo||'').match(/\d+/)?.[0]||0)-Number(String(a.workNo||'').match(/\d+/)?.[0]||0));
 for(const r of list){const wo=String(r.workNo||'').trim();if(!wo||seen.has(wo))continue;seen.add(wo);sel.add(new Option(wo+' • '+String(r.party||'').slice(0,30),wo))}
 if(seen.has(old))sel.value=old;
}
function fromWork(){
 const wo=text('eagleWorkSelect'),r=rows().find(x=>String(x.workNo||'').trim()===wo);
 if(!r)return;
 put('eagleWorkNo',wo);
 const desc=String(r.description||'').trim();put('eagleProduct',desc.slice(0,120));
 put('eagleSize','');put('eagleMicron','');put('eagleMaterial','');
 const size=desc.match(/\b(12|18|36|48|60)\s*(?:"|inch|in\b)/i);
 if(size)put('eagleSize',size[1]+' inch');
 const micron=desc.match(/\b(\d+(?:\.\d+)?)\s*(?:micron|µm|um)\b/i);
 if(micron)put('eagleMicron',micron[1]+' Micron');
 const anti=/anti[\s-]?static/i.test(desc);
 if(/\bpolyester\b/i.test(desc))put('eagleMaterial',anti?'Polyester Antistatic':'Polyester');
 else if(/\bpolypropylene\b|\bPP\b/i.test(desc))put('eagleMaterial',anti?'PP Antistatic':'PP');
 const code=window.CFM_EFPPL?.codeForRow?.(r);
 if(code){put('eagleProductSelect',code.code);put('eagleProductCode',code.code)}
 draw();message('Work Order loaded. Verify micron, material and date.');
}
function selectCode(){
 const code=text('eagleProductSelect'),p=master().find(x=>x.code===code);if(!p)return;
 put('eagleProductCode',p.code);if(!text('eagleProduct'))put('eagleProduct',p.description);
 const size=p.description.match(/\b(12|18|36|48|60)\s*"/);
 if(size&&!text('eagleSize'))put('eagleSize',size[1]+' inch');
 draw();
}
function importFile(file){
 if(!file||!file.type.startsWith('image/'))return;
 const url=URL.createObjectURL(file),img=new Image();
 img.onload=()=>{
  URL.revokeObjectURL(url);
  const c=$('eagleLabelCanvas'),ctx=c.getContext('2d');ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
  const scale=Math.min(W/img.width,H/img.height),w=img.width*scale,h=img.height*scale;
  ctx.drawImage(img,(W-w)/2,(H-h)/2,w,h);imported=true;
  message('Image pasted. Verify the label fits 45 × 85 mm.');
 };
 img.onerror=()=>{URL.revokeObjectURL(url);message('Could not read image.')};img.src=url;
}
function verified(){if(!imported&&!text('eagleWorkNo')){message('Enter actual Work Order No. before printing.');return false}return true}
function openPrint(sheet){
 if(!verified())return;
 const win=window.open('','_blank');if(!win){message('Allow print pop-ups in browser.');return}
 const data=$('eagleLabelCanvas').toDataURL('image/png'),num=sheet?12:1;
 const css=sheet?'@page{size:A4;margin:8mm}.page{display:grid;grid-template-columns:repeat(4,45mm);grid-template-rows:repeat(3,85mm);gap:3mm}'
 :'@page{size:45mm 85mm;margin:0}';
 const html='<!doctype html><html><head><meta charset="utf-8"><title>Eagle Stitching Label</title><style>body{margin:0}img{display:block;width:45mm;height:85mm;object-fit:contain;break-inside:avoid}'+css+'</style></head><body><div class="page">'+
 Array.from({length:num},()=>'<img src="'+data+'" alt="Label">').join('')+
 '</div><script>window.addEventListener("load",function(){window.focus();window.print()})<\/script></body></html>';
 win.document.open();win.document.write(html);win.document.close();
 message(sheet?'Print A4: 12 labels.':'Print single 45 × 85 mm. Use actual size 100%.');
}
function create(){
 const s=document.createElement('style');s.id='eagleLabelCSS';s.textContent=css;document.head.append(s);
 const d=document.createElement('dialog');d.id='eagleLabelDialog';
 d.innerHTML=
 '<div class="head"><div><strong>EAGLE • Bag Stitching Label Studio</strong><small>45 × 85 mm · PNG / Copy / Print</small></div><button id="eagleClose" type="button">✕ Close</button></div>'+
 '<div class="layout"><div>'+
 '<label>Paste Matter (optional)<textarea id="eagleMatter" placeholder="Product: CF Bag&#10;Size: 48 inch&#10;Micron: 2&#10;Material: Polyester Antistatic&#10;Work Order No.: 556&#10;Mfg. Date: 19/11/2026"></textarea></label>'+
 '<button id="eagleParse" type="button" style="margin:7px 0 10px">↳ Fill from Pasted Matter</button>'+
 '<div class="fields">'+
 '<label class="full">Select Existing Work Order<select id="eagleWorkSelect"><option value="">Select Work Order / manual entry</option></select></label>'+
 '<label class="full">EFPPL Product Code Master<select id="eagleProductSelect"><option value="">Select Product Code / Manual</option></select></label>'+
 '<label>Product<input id="eagleProduct" placeholder="CF Bag 48 Top L/T"></label>'+
 '<label>Size<input id="eagleSize" placeholder="48 inch"></label>'+
 '<label>Micron<input id="eagleMicron" placeholder="2 Micron"></label>'+
 '<label>Material<input id="eagleMaterial" placeholder="Polyester Antistatic"></label>'+
 '<label>Work Order No.<input id="eagleWorkNo" placeholder="Actual Work Order No."></label>'+
 '<label>Mfg. Date<input id="eagleMfgDate" type="date"></label>'+
 '<label class="full">Product Code (editable)<input id="eagleProductCode"></label></div>'+
 '<p class="note">Batch No. is replaced with Work Order No. Manufacture date must be verified. The label generator does not alter ERP Work Orders, Stock or Label Issued Register.</p>'+
 '<label>Or upload/paste your own label image<input id="eagleUpload" type="file" accept="image/png,image/jpeg,image/webp"></label>'+
 '<p class="note">Ctrl+V accepts an image in this window. Generate Label returns to the Eagle design.</p></div>'+
 '<div class="preview"><canvas id="eagleLabelCanvas" width="531" height="1004" aria-label="Label preview"></canvas><span id="eagleLabelStatus" role="status">Enter matter then Generate</span></div></div>'+
 '<div class="actions"><button id="eagleGenerate" class="primary">✦ Generate Label</button><button id="eagleCopy">⧉ Copy Image</button><button id="eagleDownload">↓ Save PNG</button><button id="eaglePrint">🖨 Print 45 × 85</button><button id="eagleA4">🖨 A4 (12-up)</button></div>';
 document.body.append(d);
 $('eagleClose').onclick=()=>d.close();
 $('eagleParse').onclick=fillMatter;
 $('eagleWorkSelect').onchange=fromWork;
 $('eagleProductSelect').onchange=selectCode;
 const inputs=['eagleProduct','eagleSize','eagleMicron','eagleMaterial','eagleWorkNo','eagleMfgDate','eagleProductCode'];
 for(const id of inputs)$(id).addEventListener('input',()=>{if(!imported)draw()});
 $('eagleGenerate').onclick=()=>{draw();message('PNG generated: 531 × 1004 pixels (45 × 85 mm at 300 DPI).')};
 $('eagleUpload').onchange=e=>importFile(e.target.files?.[0]);
 d.addEventListener('paste',e=>{const item=[...(e.clipboardData?.items||[])].find(x=>x.type.startsWith('image/'));if(item){e.preventDefault();importFile(item.getAsFile())}});
 $('eagleCopy').onclick=async()=>{
  if(!verified())return;
  try{const c=$('eagleLabelCanvas');const blob=await new Promise(ok=>c.toBlob(ok,'image/png'));
   if(!blob||!navigator.clipboard?.write||typeof ClipboardItem==='undefined')throw Error('No clipboard image support');
   await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);message('Image copied. Paste into your print sheet.');
  }catch(e){message('Copy image unsupported here. Use Save PNG and insert into print.')}
 };
 $('eagleDownload').onclick=()=>{
  if(!verified())return;
  const a=document.createElement('a');a.href=$('eagleLabelCanvas').toDataURL('image/png');
  a.download='Eagle-Bag-Stitching-Label-'+(text('eagleWorkNo').replace(/[^a-z0-9_-]/gi,'-')||'45x85')+'.png';
  document.body.append(a);a.click();a.remove();message('PNG downloaded.');
 };
 $('eaglePrint').onclick=()=>openPrint(false);
 $('eagleA4').onclick=()=>openPrint(true);
 draw();
}
function mount(){
 const dash=$('view-dashboard');if(!dash)return;
 if(!$('eagleLabelDialog'))create();
 if($('eagleLabelOpen'))return;
 const btn=document.createElement('button');btn.id='eagleLabelOpen';btn.type='button';btn.textContent='🏷 Bag Stitching Label · 45×85';
 btn.onclick=()=>{
  const sel=$('eagleProductSelect');
  if(sel.options.length===1){for(const p of master())sel.add(new Option(p.code+' | '+p.description,p.code))}
  workOrderOptions();$('eagleLabelDialog').showModal();draw();
 };
 const actions=dash.querySelector('.cfm-main-actions');
 if(actions)actions.append(btn);
 else {const wrap=document.createElement('div');wrap.style.cssText='display:flex;margin:5px 0';wrap.append(btn);const anchor=$('cfmThemeAKpis')||$('cfmThemeAStock');if(anchor)anchor.after(wrap);else dash.prepend(wrap)}
}
function init(){
 mount();
 const dash=$('view-dashboard');
 if(dash)new MutationObserver(()=>{if(!$('eagleLabelOpen'))mount()}).observe(dash,{childList:true,subtree:false});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();