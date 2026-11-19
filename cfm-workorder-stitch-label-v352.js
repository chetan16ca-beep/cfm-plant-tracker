/* CFM V365. Exact supplied Eagle emblem vector + correctly-proportioned SVG print; 5mm stitch margins. */
(function(){
'use strict';
const $=id=>document.getElementById(id),C_W=2008,C_H=1063,VIEW_W=850,VIEW_H=450;
let loaded=[],pasted=false,printable=false,overflow=false;
function val(id){return String($(id)?.value||'').trim()}
function put(id,v){if($(id))$(id).value=String(v??'')}
function note(v){if($('woLabelNotice'))$('woLabelNotice').textContent=v}
function orders(){try{return loaded.length?loaded:(typeof state!=='undefined'&&Array.isArray(state.pending)?state.pending:[])}catch(e){return loaded}}
function getCode(row){
 const stored=String(row?.itemCode||row?.efpplCode||'').trim();
 const mapped=window.CFM_EFPPL?.codeForRow?.(row)?.code||'';
 return /^EFPPL-\d{4}-/i.test(stored)?stored:(mapped||stored);
}
async function refresh(){
 let data=orders(),source='ERP';
 try{
  if(typeof cloudFetch==='function'){
   const res=await cloudFetch();
   if(Array.isArray(res?.payload?.pending)){data=res.payload.pending;source='Live Cloud'}
  }
 }catch(e){source='Offline ERP'}
 loaded=data;
 const sel=$('woLabelSelect'),current=sel.value;
 sel.replaceChildren(new Option('Select Work Order / Manual',''));
 const sorted=[...data].sort((a,b)=>Number(String(b.workNo||'').match(/\d+/)?.[0]||0)-Number(String(a.workNo||'').match(/\d+/)?.[0]||0));
 const used=new Set();
 for(const r of sorted){
  const n=String(r.workNo||'').trim();if(!n||used.has(n))continue;
  used.add(n);sel.add(new Option(n+' • '+String(r.description||'').replace(/\s+/g,' ').slice(0,42),n));
 }
 if(used.has(current))sel.value=current;
 note(source+' · '+used.size+' Work Orders available');
}
function selectWork(){
 const n=val('woLabelSelect'),r=orders().find(x=>String(x.workNo||'').trim()===n);
 if(!r)return;
 put('woLabelNo',n);put('woLabelHeading',r.description||'');put('woLabelDetails',r.description2||'');
 put('woLabelCode',getCode(r));draw();
 note('Work Order saved heading and details loaded. Verify EFPPL code.');
}
function wrap(ctx,s,max,font){
 ctx.font=font;const lines=[];
 for(const paragraph of String(s||'').replace(/\r\n?/g,'\n').split('\n')){
  if(!paragraph.trim()){lines.push('');continue}
  let active='';
  for(const word of paragraph.trim().split(/\s+/)){
   const combined=active?active+' '+word:word;
   if(ctx.measureText(combined).width<=max){active=combined;continue}
   if(active){lines.push(active);active=''}
   let piece='';
   for(const char of word){
    if(piece&&ctx.measureText(piece+char).width>max){lines.push(piece);piece=''}
    piece+=char;
   }
   active=piece;
  }
  if(active)lines.push(active);
 }
 return lines;
}
function draw(){
 const can=$('woLabelCanvas');if(!can)return;
 const ctx=can.getContext('2d');
 // Print at 600dpi (2008 × 1063) while composing in 850 × 450 label units (10 units/mm).
 ctx.setTransform(C_W/VIEW_W,0,0,C_H/VIEW_H,0,0);
 const no=val('woLabelNo'),heading=val('woLabelHeading'),detail=val('woLabelDetails'),code=val('woLabelCode');
 ctx.fillStyle='#fff';ctx.fillRect(0,0,VIEW_W,VIEW_H);
 ctx.strokeStyle='#111';
 function roundedPath(x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
 }
 function poly(points){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath()}
 // Physical sewing margins: 0..50 and 400..450 remain ENTIRELY blank (5mm each).
 // All branding, corner outlines and data live within y=54..395.
 ctx.lineWidth=2.6;roundedPath(13,54,824,341,14);ctx.stroke();
 // The traced authentic eagle HEAD from the user's latest company logo replaces the old water-drop bird.
 if(window.CFM_EAGLE_BRAND?.drawLogo)window.CFM_EAGLE_BRAND.drawLogo(ctx,40,79,91,79,'#000');
 else{ctx.fillStyle='#000';ctx.font='bold 50px Arial';ctx.fillText('E',56,129)}
 ctx.lineWidth=2;ctx.strokeStyle='#000';
 ctx.beginPath();ctx.moveTo(144,87);ctx.lineTo(144,158);ctx.moveTo(492,84);ctx.lineTo(492,159);ctx.stroke();
 // Top header reproduces the approved monochrome Eagle industrial label layout.
 ctx.fillStyle='#000';ctx.textBaseline='alphabetic';
 ctx.font='italic 900 43px Arial,sans-serif';ctx.fillText('EAGLE',160,120,316);
 ctx.font='bold 12.7px Arial,sans-serif';ctx.fillText('FILTRATION PRODUCT PVT. LTD.',162,140,322);
 ctx.font='bold 10.8px Arial,sans-serif';ctx.fillText('An ISO 9001:2015 Certified Company',162,155,320);
 // SINCE badge.
 roundedPath(352,59,116,21,10.5);ctx.fill();
 ctx.fillStyle='#fff';ctx.font='bold 13.5px Arial,sans-serif';ctx.textBaseline='middle';
 ctx.fillText('SINCE : 1992',365,69.5,95);
 // Contacts are real company fixed details from the approved image, not Work Order fields.
 ctx.fillStyle='#000';ctx.textBaseline='middle';
 ctx.font='bold 12.6px Arial,sans-serif';
 ctx.fillText('✉  info@eaglefiltrations.com',512,101,310);
 ctx.fillText('◎  www.eaglefiltrations.com',512,123,310);
 ctx.font='bold 17px Arial,sans-serif';
 ctx.fillText('☎  +91 70416 70091',512,145,308);
 // Manufacturing banner under letterhead (solid black/white, no colour).
 ctx.strokeStyle='#000';ctx.lineWidth=2.8;ctx.beginPath();
 ctx.moveTo(16,169);ctx.lineTo(340,169);ctx.stroke();
 ctx.fillStyle='#000';ctx.fillRect(367,165,468,30);
 ctx.lineWidth=2.5;
 for(let i=0;i<3;i++){
  const x=342+i*9;ctx.beginPath();ctx.moveTo(x+15,167);ctx.lineTo(x-9,191);ctx.stroke();
 }
 ctx.fillStyle='#fff';ctx.textBaseline='middle';ctx.font='bold 12px Arial,sans-serif';
 ctx.fillText('Mfg. of All Types of Industrial Filters, Bag Filters, & Automobile Filters.',379,180,444);
 // Exactly four printed Work Order fields. NO quantity, party, batch or fake code.
 const rows=[
  {title:'WORK ORDER NO.',value:no,font:21,min:12},
  {title:'DESCRIPTION',value:heading,font:20,min:11},
  {title:'DESCRIPTION 2',value:detail,font:20,min:11},
  {title:'EFPPL CODE',value:code,font:19,min:10.5}
 ];
 let tooLong=false;
 for(let i=0;i<4;i++){
  const row=rows[i],x=28,y=202+i*46,h=42,split=245,tip=259,right=820;
  // Full white outlined field, plus bold arrow-ended BLACK section identifier.
  ctx.strokeStyle='#000';ctx.lineWidth=2;roundedPath(x,y,right-x,h,8);ctx.stroke();
  ctx.fillStyle='#000';poly([[x+1,y+1],[split,y+1],[tip,y+h/2],[split,y+h-1],[x+1,y+h-1]]);
  ctx.fill();
  ctx.font='bold 16.5px Arial,sans-serif';ctx.fillStyle='#fff';ctx.textBaseline='middle';
  ctx.fillText(row.title,x+14,y+h/2,split-x-24);
  // Print live details with wrap. Never clip or silently substitute sample descriptions.
  const value=String(row.value||'').trim()||'—';
  let layout=null;
  for(let f=row.font;f>=row.min;f-=.5){
   const font='bold '+f+'px Arial,sans-serif';
   const lines=wrap(ctx,value,right-tip-24,font);
   const step=Math.ceil(f*1.13);
   if(lines.length*step<=h-7){layout={lines,font,step};break}
  }
  if(!layout){
   tooLong=true;ctx.fillStyle='#000';ctx.font='bold 12px Arial';ctx.fillText('DETAILS TOO LONG',tip+12,y+h/2);
  }else{
   ctx.fillStyle='#000';ctx.font=layout.font;
   const first=y+h/2-(layout.lines.length-1)*layout.step/2;
   layout.lines.forEach((line,k)=>ctx.fillText(line,tip+12,first+k*layout.step));
  }
 }
 // Enforce both 5mm stitching margins even when new graphic changes are added.
 ctx.fillStyle='#fff';ctx.fillRect(0,0,850,50);ctx.fillRect(0,400,850,50);
 overflow=tooLong;pasted=false;
 printable=!overflow&&Boolean(no&&code&&(heading||detail));
 note(overflow?'Label text exceeds 85×45 mm print-safe area. Shorten details; printing disabled.':
 printable?'EAGLE final B&W logo design • 85×45 mm • 600 DPI • 5 mm top/bottom sewing margins':
 'Select Work Order and check its Description, Description 2 and EFPPL Code.');
}
function pasteMatter(){
 const raw=val('woLabelMatter');if(!raw){note('Paste Work Order matter first.');return}
 const rawLines=raw.replace(/\r\n?/g,'\n').split('\n');
 let heading=[],details=[],mode='',no='',code='',tag=false;
 for(const line of rawLines){
  let m=line.match(/^\s*(?:work\s*order(?:\s*(?:no|number))?|wo(?:\s*no)?)\s*[:=\-]\s*(.+)$/i);
  if(m){no=m[1].trim();mode='';tag=true;continue}
  m=line.match(/^\s*(?:efppl\s*code|item\s*code|product\s*code)\s*[:=\-]\s*(.+)$/i);
  if(m){code=m[1].trim();mode='';tag=true;continue}
  m=line.match(/^\s*(?:heading|description\s*1|description|product)\s*[:=\-]\s*(.*)$/i);
  if(m){heading.push(m[1]);mode='h';tag=true;continue}
  m=line.match(/^\s*(?:details?|description\s*2|technical\s*details|extra\s*spec)\s*[:=\-]\s*(.*)$/i);
  if(m){details.push(m[1]);mode='d';tag=true;continue}
  if(/^\s*(?:company|party|customer)(?:\s*name)?\s*[:=\-]/i.test(line)){mode='';tag=true;continue}
  if(mode==='h')heading.push(line);else if(mode==='d')details.push(line);else if(line.trim())details.push(line);
 }
 if(!tag){heading=[rawLines[0]||''];details=rawLines.slice(1)}
 if(no)put('woLabelNo',no);if(code)put('woLabelCode',code);
 if(heading.length)put('woLabelHeading',heading.join('\n').trim());
 if(details.length)put('woLabelDetails',details.join('\n').trim());
 draw();
}
function imagePaste(file){
 if(!file||!file.type.startsWith('image/'))return;
 const url=URL.createObjectURL(file),img=new Image();
 img.onload=()=>{
  URL.revokeObjectURL(url);
  const ctx=$('woLabelCanvas').getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='white';ctx.fillRect(0,0,C_W,C_H);
  const ratio=Math.min(C_W/img.width,C_H/img.height),w=img.width*ratio,h=img.height*ratio;
  ctx.drawImage(img,(C_W-w)/2,(C_H-h)/2,w,h);
  pasted=true;printable=true;overflow=false;note('Pasted image ready for landscape print.');
 };
 img.onerror=()=>{URL.revokeObjectURL(url);note('Image could not be loaded.')};img.src=url;
}
function ok(){if(printable)return true;note('Enter Work Order, heading/details and EFPPL code before printing.');return false}
// Pure vector for native printing: avoids resampling raster text on Taffeta.
function vectorLabel(){
 const c=$('woLabelCanvas').getContext('2d');
 const no=val('woLabelNo'),heading=val('woLabelHeading'),detail=val('woLabelDetails'),code=val('woLabelCode');
 const escape=t=>String(t??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
 const txt=(x,y,str,size,fill='#000',weight=700,extra='')=>'<text x="'+x+'" y="'+y+'" fill="'+fill+'" font-family="Arial,Helvetica,sans-serif" font-size="'+size+'" font-weight="'+weight+'" '+extra+'>'+escape(str)+'</text>';
 const o=['<svg xmlns="http://www.w3.org/2000/svg" width="85mm" height="45mm" viewBox="0 0 850 450">','<rect width="850" height="450" fill="white"/>'];
 o.push('<rect x="13" y="54" width="824" height="341" rx="14" fill="none" stroke="#000" stroke-width="2.6"/>');
 if(window.CFM_EAGLE_BRAND?.logoPath)o.push('<g transform="translate(40 79) scale('+ (91/210)+' '+(79/187)+')" fill="#000"><path d="'+window.CFM_EAGLE_BRAND.logoPath+'" fill-rule="evenodd"/></g>');
 else o.push(txt(50,125,'E',50));
 o.push('<path d="M144 87V158 M492 84V159" stroke="#000" stroke-width="2" fill="none"/>');
 o.push(txt(160,120,'EAGLE',43,'#000',900,'font-style="italic"'));
 o.push(txt(162,140,'FILTRATION PRODUCT PVT. LTD.',12.7));
 o.push(txt(162,155,'An ISO 9001:2015 Certified Company',10.8));
 o.push('<rect x="352" y="59" width="116" height="21" rx="10.5" fill="#000"/>');
 o.push(txt(365,74,'SINCE : 1992',13.5,'#fff'));
 o.push(txt(512,101,'info@eaglefiltrations.com',12.6));
 o.push(txt(512,123,'www.eaglefiltrations.com',12.6));
 o.push(txt(512,145,'+91 70416 70091',17));
 o.push('<path d="M16 169H340" fill="none" stroke="#000" stroke-width="2.8"/>');
 o.push('<rect x="367" y="165" width="468" height="30" fill="#000"/>');
 for(let i=0;i<3;i++){const x=342+i*9;o.push('<path d="M'+(x+15)+' 167L'+(x-9)+' 191" stroke="#000" stroke-width="2.5"/>')}
 o.push(txt(379,185,'Mfg. of All Types of Industrial Filters, Bag Filters, & Automobile Filters.',12,'#fff'));
 const rows=[['WORK ORDER NO.',no,21,12],['DESCRIPTION',heading,20,11],['DESCRIPTION 2',detail,20,11],['EFPPL CODE',code,19,10.5]];
 for(let i=0;i<rows.length;i++){
  const [name,value,max,min]=rows[i],y=202+i*46,h=42;
  o.push('<rect x="28" y="'+y+'" width="792" height="42" rx="8" fill="white" stroke="#000" stroke-width="2"/>');
  o.push('<path d="M29 '+(y+1)+' H245 L259 '+(y+21)+' L245 '+(y+41)+' H29 Z" fill="#000"/>');
  o.push(txt(42,y+27,name,16.5,'#fff'));
  let fit=null;
  const valueText=String(value||'').trim()||'—';
  for(let f=max;f>=min;f-=.5){
   const lines=wrap(c,valueText,820-259-24,'bold '+f+'px Arial,sans-serif');
   const step=Math.ceil(f*1.13);
   if(lines.length*step<=h-7){fit={lines,f,step};break}
  }
  if(!fit)return null;
  const first=y+h/2-(fit.lines.length-1)*fit.step/2;
  fit.lines.forEach((line,k)=>o.push(txt(271,first+k*fit.step+fit.f*.36,line,fit.f)));
 }
 o.push('</svg>');
 return o.join('');
}
function printLabel(sheet){
 if(!ok())return;
 const w=window.open('','_blank');if(!w){note('Please enable pop-ups to print.');return}
 // Image import is explicitly raster; all generated Work Order labels print as vectors.
 const art=pasted?'<img src="'+$('woLabelCanvas').toDataURL('image/png')+'" alt="Imported label">':vectorLabel();
 if(!art){w.close();note('Long text may be cut; print blocked until corrected.');return}
 const count=sheet?12:1;
 const page=sheet?'@page{size:A4 portrait;margin:7mm}.grid{display:grid;grid-template-columns:repeat(2,85mm);grid-template-rows:repeat(6,45mm);gap:2mm 4mm;}':
 '@page{size:85mm 45mm;margin:0}';
 const content='<!doctype html><html><head><meta charset="utf-8"><title>Eagle Work Order Taffeta Label</title><style>'+page+
 'html,body{padding:0;margin:0;background:white}.grid>svg,.grid>img{width:85mm;height:45mm;display:block;break-inside:avoid;page-break-inside:avoid}.grid{margin:0}@media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="grid">'+
 Array.from({length:count},()=>art).join('')+
 '</div><script>addEventListener("load",()=>{focus();print()})<\/script></body></html>';
 w.document.open();w.document.write(content);w.document.close();
 note(sheet?'A4 print: 12 vector-sharp labels, with stitching margins.':'Vector print ready: Actual Size 100%, 85×45 mm, 5mm sewing margins.');
}
function build(){
 const style=document.createElement('style');
 style.textContent='#woLabelLaunch{margin:8px 0;padding:10px 12px;border:1px solid #a0bedb;border-radius:9px;background:#edf5ff;color:#16477b;font:700 12px Arial;cursor:pointer}'+
 '#woLabelDialog{width:min(900px,96vw);max-width:900px;max-height:94dvh;overflow:auto;border:1px solid #b8cbe1;border-radius:12px;padding:0;background:#f9fcff;color:#183852}#woLabelDialog::backdrop{background:#142c42b8}'+
 '#woLabelDialog *{box-sizing:border-box;font-family:Arial,sans-serif}#woLabelDialog .top{background:#164478;color:white;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;gap:8px;position:sticky;top:0}'+
 '#woLabelDialog .main{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:14px;padding:12px}#woLabelDialog label{display:block;margin:8px 0;font:700 12px Arial;color:#244967}'+
 '#woLabelDialog input,#woLabelDialog select,#woLabelDialog textarea{display:block;width:100%;border:1px solid #b2c9df;border-radius:7px;padding:9px;background:#fff;color:#17344d;margin-top:4px;font:12px Arial}'+
 '#woLabelDialog textarea{resize:vertical;min-height:75px}#woLabelDetails{min-height:100px!important}#woLabelDialog button{padding:9px 10px;border:1px solid #a3bfd6;border-radius:8px;background:white;color:#174676;font:700 12px Arial;cursor:pointer}'+
 '#woLabelDialog .tools{display:flex;flex-wrap:wrap;gap:7px;background:white;padding:10px 12px;position:sticky;bottom:0;border-top:1px solid #d5e3f0}#woLabelDialog .primary{background:#185ca9;color:#fff}'+
 '#woLabelDialog .preview{display:flex;flex-direction:column;align-items:center;gap:7px}#woLabelCanvas{width:320px;height:169px;max-width:100%;background:white;border:1px solid #abbdd2}#woLabelNotice{font:11px Arial;text-align:center;color:#315a77}'+
 '#woLabelDialog .help{font:11px/1.5 Arial;color:#546d80}@media(max-width:650px){#woLabelDialog .main{grid-template-columns:1fr;padding:9px}#woLabelDialog .preview{order:-1}#woLabelCanvas{width:300px;height:159px}}';
 document.head.append(style);
 const d=document.createElement('dialog');d.id='woLabelDialog';
 d.innerHTML='<div class="top"><div><strong>Work Order Stitching Label</strong><div style="font-size:11px">EAGLE B&W Label · 85 × 45 mm · 5mm sewing margins</div></div><button id="woLabelClose">✕ Close</button></div>'+
 '<div class="main"><div>'+
 '<label>Work Order<select id="woLabelSelect"><option value="">Select Work Order / Manual</option></select></label><button id="woLabelRefresh">↻ Refresh Work Orders</button>'+
 '<label>Work Order No.<input id="woLabelNo" placeholder="CFM-556"></label>'+
 '<label>Heading — Work Order Description<textarea id="woLabelHeading" placeholder="Same heading as Work Order"></textarea></label>'+
 '<label>Details — Work Order Description 2<textarea id="woLabelDetails" placeholder="Same details as Work Order"></textarea></label>'+
 '<label>EFPPL Product Code<input id="woLabelCode" placeholder="EFPPL-2000-CF-48-TLT"></label>'+
 '<p class="help">Top & bottom 5 mm stays COMPLETELY BLANK for stitching (no text, rules or border). Black ink on WHITE Taffeta: print at 100%, black-only (no color/gray ink). For BLACK Taffeta, use a suitable WHITE thermal-transfer ribbon; normal black ribbon is not readable. Printed fields: Work Order No. + Description + Description 2 + EFPPL Code only; EAGLE header/contact printed as in approved reference.</p>'+
 '<label>Paste Matter<textarea id="woLabelMatter" placeholder="Work Order No.: CFM-556&#10;Heading: CF BAG 48 TOP L/T&#10;Details: 2 MICRON ANTISTATIC&#10;EFPPL Code: EFPPL-2000-CF-48-TLT"></textarea></label><button id="woLabelPaste">↳ Apply Pasted Matter</button>'+
 '<label>Or upload/paste image<input id="woLabelUpload" type="file" accept="image/png,image/jpeg,image/webp"></label>'+
 '<p class="help">Ctrl+V can paste an image. If text does not fit, printing is blocked instead of clipping the content.</p>'+
 '</div><div class="preview"><canvas id="woLabelCanvas" width="2008" height="1063"></canvas><span id="woLabelNotice" role="status">Select Work Order</span></div></div>'+
 '<div class="tools"><button id="woLabelGenerate" class="primary">✦ Generate Image</button><button id="woLabelCopy">⧉ Copy Image</button><button id="woLabelSave">↓ Save PNG</button><button id="woLabelPrint">🖨 Print 85 × 45</button><button id="woLabelA4">🖨 A4 (12 labels)</button></div>';
 document.body.append(d);
 $('woLabelClose').onclick=()=>d.close();
 $('woLabelRefresh').onclick=refresh;$('woLabelSelect').onchange=selectWork;$('woLabelPaste').onclick=pasteMatter;
 for(const id of ['woLabelNo','woLabelHeading','woLabelDetails','woLabelCode'])$(id).addEventListener('input',draw);
 $('woLabelGenerate').onclick=draw;
 $('woLabelUpload').onchange=e=>imagePaste(e.target.files?.[0]);
 d.addEventListener('paste',e=>{const item=[...(e.clipboardData?.items||[])].find(x=>x.type.startsWith('image/'));if(item){e.preventDefault();imagePaste(item.getAsFile())}});
 $('woLabelCopy').onclick=async()=>{
  if(!ok())return;
  try{
   const blob=await new Promise(resolve=>$('woLabelCanvas').toBlob(resolve,'image/png'));
   if(!blob||!navigator.clipboard?.write||typeof ClipboardItem==='undefined')throw Error('Copy unsupported');
   await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);note('Image copied. Paste into your print layout.');
  }catch(e){note('Copy unsupported on this device. Use Save PNG instead.')}
 };
 $('woLabelSave').onclick=()=>{
  if(!ok())return;
  const a=document.createElement('a');a.href=$('woLabelCanvas').toDataURL('image/png');
  a.download='CFM-Stitching-Label-'+(val('woLabelNo').replace(/[^a-z0-9_-]/gi,'-')||'85x45')+'.png';
  document.body.append(a);a.click();a.remove();note('PNG saved.');
 };
 $('woLabelPrint').onclick=()=>printLabel(false);$('woLabelA4').onclick=()=>printLabel(true);
 draw();
}
function findPackingSection(dash){
 // The live Dashboard's actual Packing Slip & Label card is #v167Pack.
 // The older accordion-only selector missed this card and hid the print button.
 const realCard=dash.querySelector('#v167Pack');
 if(realCard)return realCard;
 // This section is created by the dashboard-compact module. Put the launcher
 // inside the existing "Packing Slip & Label" accordion, not on the main Dashboard.
 const matched=[...dash.querySelectorAll('details.cfm-mini-section')].find(el=>
  /packing\s*slip\s*(?:&|and)\s*label/i.test(
   el.querySelector(':scope > summary')?.textContent||''));
 if(matched)return matched.querySelector(':scope > .cfm-mini-body')||matched;
 // Handle early loading, before the compact accordion folds the underlying group.
 const group=[...dash.querySelectorAll('.exec-group')].find(el=>
  /packing\s*slip\s*(?:&|and)\s*label/i.test(
   el.querySelector('.dashboard-section-title h3')?.textContent||''));
 return group||null;
}
function linkPackingDialog(){
 const d=$('packSlipDialog');
 if(!d)return;
 const footer=d.querySelector('.pfoot');
 if(!footer||$('packSlipStitchLabel'))return;
 const btn=document.createElement('button');btn.id='packSlipStitchLabel';btn.type='button';
 btn.textContent='🏷 Print Stitching Label';
 btn.title='Separate white Taffeta 85 × 45 mm label for this Work Order';
 btn.onclick=async()=>{
  const no=$('packSlipWO')?.value||'';
  if(d.open)d.close();
  const label=$('woLabelDialog');if(!label)return;
  label.showModal();await refresh();
  if(no&&[...$('woLabelSelect').options].some(x=>x.value===no)){
   $('woLabelSelect').value=no;selectWork();
  }else if(no)note('Select the matching Work Order in the Label dropdown.');
 };
 footer.append(btn);
}
function mount(){
 const dash=$('view-dashboard');if(!dash)return false;
 if(!$('woLabelDialog'))build();
 let wrap=$('cfmBWTaffetaEntry');
 if(!wrap){
  wrap=document.createElement('div');wrap.id='cfmBWTaffetaEntry';
  wrap.style.cssText='display:flex;align-items:center;gap:6px;padding:6px 0;margin:3px 0;';
  const btn=document.createElement('button');btn.id='woLabelLaunch';btn.type='button';
  btn.textContent='🏷 EAGLE Stitching Label · 85×45';
  btn.style.cssText='display:block;min-height:37px;padding:8px 11px;border:1px solid #171717;border-radius:7px;background:#fff;color:#111;font:bold 12px Arial,sans-serif;cursor:pointer;max-width:100%';
  btn.onclick=()=>{$('woLabelDialog').showModal();draw();refresh()};
  wrap.append(btn);
 }
 const target=findPackingSection(dash);
 if(target&&wrap.parentElement!==target)target.append(wrap);
 // Do not create another standalone Dashboard button.
 linkPackingDialog();
 return !!target;
}
function boot(){
 if(!document.body)return;
 mount();
 let queued=false;
 const observer=new MutationObserver(()=>{
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{queued=false;mount()});
 });
 observer.observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();