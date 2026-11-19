/* CFM V385. EAGLE label: white boxes, regular headings and 500-weight medium auto-fit values. */
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
 put('woLabelCode',getCode(r));
 const h=String(r.description||'');
 const sizeRaw=String(r.size||r.sizeInch||r.dimensions||'').trim();
 const inch=h.match(/\b\d{1,3}(?:\.\d+)?\s*(?:"|″|INCH(?:ES)?)/i)?.[0]||'';
 put('woLabelSize',sizeRaw||inch);
 put('woLabelMicron',String(r.micron||r.micronRating||r.description2||'').trim());
 put('woLabelMfgDate',String(r.mfgDate||r.manufacturingDate||r.productionDate||'').trim());
 draw();
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
// V382: user-approved single-column 6-field label, printed natively at 85 × 45 mm.
function label45Layout(){
 const ctx=$('woLabelCanvas')?.getContext('2d');if(!ctx)return null;
 const v={wo:val('woLabelNo'),code:val('woLabelCode'),product:val('woLabelHeading'),
  spec:val('woLabelDetails'),size:val('woLabelSize'),
  micron:val('woLabelMicron'),date:val('woLabelMfgDate')};
 // Geometry measured in 0.1 mm, matching the printed SVG. One large value
 // column gives long codes and product details the full width of the label.
 const fields=[
  {key:'wo',label:'WO NO.',max:34,min:12},
  {key:'code',label:'ITEM CODE',max:30,min:12},
  {key:'product',label:'PRODUCT',max:31,min:12},
  {key:'micron',label:'MICRON',max:29,min:11},
  {key:'size',label:'SIZE',max:32,min:12},
  {key:'date',label:'MFG. DATE',max:34,min:11}
 ];
 function fit(raw,info){
  const value=String(raw||'').trim()||'—',width=550;
  for(let size=info.max;size>=info.min;size-=.5){
   // Single line can be prominent; 2 lines stay within 37-unit row height.
   const font='600 '+size+'px Arial,Helvetica,sans-serif';
   const lines=wrap(ctx,value,width,font);
   if(lines.length>2||(lines.length>1&&size>16.5))continue;
   ctx.font=font;
   const widths=lines.map(line=>{
    const m=ctx.measureText(line);
    return Math.max(m.width,Number.isFinite(m.actualBoundingBoxLeft)&&Number.isFinite(m.actualBoundingBoxRight)?
     m.actualBoundingBoxLeft+m.actualBoundingBoxRight:0);
   });
   if(widths.every(x=>x<=width-2))return{lines,size,step:Math.ceil(size*1.1),widths,innerWidth:width};
  }
  return null;
 }
 const out={v,fields};
 for(const o of fields){
  const raw=o.key==='micron'?v.micron||v.spec:v[o.key];
  out[o.key]=fit(raw,o);
 }
 out.overflowFields=fields.filter(o=>!out[o.key]).map(o=>o.label);
 out.overflow=out.overflowFields.length>0;
 out.valid=!out.overflow&&Boolean(v.wo&&v.code&&v.product);
 return out;
}
function vectorLabel(){
 const L=label45Layout();if(!L?.valid)return null;
 const E=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 const t=(x,y,v,size,color='#111',weight=800,attrs='')=>
  '<text x="'+x+'" y="'+y+'" font-family="Arial,Helvetica,sans-serif" font-size="'+size+
  '" font-weight="'+weight+'" fill="'+color+'" '+attrs+'>'+E(v)+'</text>';
 const a=['<svg xmlns="http://www.w3.org/2000/svg" width="85mm" height="45mm" viewBox="0 0 850 450">',
  '<rect width="850" height="450" fill="#fff"/>',
  '<rect x="8" y="8" width="834" height="434" rx="24" fill="none" stroke="#132f87" stroke-width="5"/>'];
 const brand=window.CFM_EAGLE_BRAND;
 // Source-traced corporate EAGLE silhouette and original EAGLE wordmark.
 if(brand?.logoBluePath&&brand?.logoGreenPath){
  a.push('<g transform="translate(31 18) scale(.71 .73)"><path d="'+brand.logoBluePath+
    '" fill="#1f4c97" fill-rule="evenodd"/><path d="'+brand.logoGreenPath+
    '" fill="#2caa52" fill-rule="evenodd"/></g>');
 }else a.push(t(48,128,'EAGLE',48,'#132f87',900));
 a.push('<path d="M188 37V157" stroke="#132f87" stroke-width="3"/>');
 if(brand?.wordmarkPath){
  a.push('<g transform="translate(192 48) scale(.71 .84)" fill="#ee2737" fill-rule="evenodd"><path d="'+
   brand.wordmarkPath+'"/></g>');
 }else a.push(t(197,111,'EAGLE',62,'#ee2737',900));
 a.push(t(199,136,'FILTRATION PRODUCT PVT. LTD.',20,'#1b9850',800));
 a.push(t(199,157,'An ISO 9001:2015 Certified Company',17,'#111',800));
 // Green Since 1992 capsule and 3 true corporate contact details.
 a.push('<rect x="441" y="15" width="167" height="32" rx="16" fill="#20a34f"/>');
 a.push(t(457,39,'SINCE : 1992',23,'#fff',800));
 a.push('<circle cx="555" cy="78" r="13" fill="#193f97"/>');
 a.push('<rect x="547" y="72" width="16" height="12" rx="1" fill="none" stroke="#fff" stroke-width="2"/>');
 a.push('<path d="M548 73l7 6 7 -6" fill="none" stroke="#fff" stroke-width="1.5"/>');
 a.push('<circle cx="555" cy="112" r="13" fill="#193f97"/>');
 a.push('<circle cx="555" cy="112" r="9" fill="none" stroke="#fff" stroke-width="1.6"/>');
 a.push('<path d="M546 112h18 M555 104v16" fill="none" stroke="#fff" stroke-width="1.4"/>');
 a.push('<circle cx="555" cy="146" r="13" fill="#193f97"/>');
 a.push(t(547,153,'+',21,'#fff',900));
 a.push(t(576,84,'info@eaglefiltrations.com',18,'#111',700));
 a.push(t(576,119,'www.eaglefiltrations.com',18,'#111',700));
 a.push(t(576,153,'+91 70416 70091',25,'#111',800));
 // Manufacturing title also stays white (no filled blue band).
 a.push('<path d="M109 201L150 169H831V207H109Z" fill="#000" stroke="#000" stroke-width="2"/>');
 a.push('<path d="M157 169L119 204" stroke="#000" stroke-width="2"/>');
 a.push(t(174,194,'Mfg. of All Types of Industrial Filters, Bag Filters, & Automobile Filters.',
  24,'#fff',600,'textLength="635" lengthAdjust="spacingAndGlyphs"'));
 // Six full-width content rows: white non-bold headings, medium-weight auto-fitted values.
 const ty=214, left=21, edge=829, split=252, rh=37;
 a.push('<rect x="'+left+'" y="'+ty+'" width="'+(edge-left)+'" height="'+(rh*6)+
  '" rx="6" fill="#fff" stroke="#19398e" stroke-width="3"/>');
 a.push('<rect x="'+(left+2)+'" y="'+(ty+2)+'" width="'+(split-left-2)+
  '" height="'+(rh*6-4)+'" fill="#fff"/>');
 a.push('<path d="M'+split+' '+ty+'V'+(ty+rh*6)+'" stroke="#19398e" stroke-width="3"/>');
 for(let i=1;i<6;i++){
  const y=ty+i*rh;
  a.push('<path d="M'+split+' '+y+'H'+edge+'" stroke="#19398e" stroke-width="2.3"/>');
  a.push('<path d="M'+(left+2)+' '+y+'H'+split+'" stroke="#19398e" stroke-width="2.3"/>');
 }
 L.fields.forEach((f,i)=>{
  const y=ty+i*rh,fit=L[f.key],txt=f.label;
  a.push(t(36,y+26,txt,f.key==='date'?27:24,'#000',600));
  const start=fit.lines.length===1?y+27:y+16;
  fit.lines.forEach((line,k)=>{
   const length=Math.min(fit.widths[k],fit.innerWidth-1);
   a.push(t(267,start+k*fit.step,line,fit.size,'#000',600,
    'textLength="'+length.toFixed(2)+'" lengthAdjust="spacingAndGlyphs"'));
  });
 });
 a.push('</svg>');
 return a.join('');
}
let drawSequence=0;
function draw(){
 const canvas=$('woLabelCanvas');if(!canvas)return;
 const L=label45Layout();if(!L)return;
 const ctx=canvas.getContext('2d');
 ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#fff';ctx.fillRect(0,0,C_W,C_H);
 overflow=L.overflow;pasted=false;printable=L.valid;
 const seq=++drawSequence;
 if(!L.valid){
  note(L.overflow?'Box overflow ('+L.overflowFields.join(', ')+'). Shorten that value before printing; no text will be cut.':'Select Work Order and verify Product / Item Code.');
  return;
 }
 const svg=vectorLabel(),image=new Image();
 image.onload=()=>{if(seq!==drawSequence)return;ctx.clearRect(0,0,C_W,C_H);ctx.drawImage(image,0,0,C_W,C_H)};
 image.onerror=()=>note('Preview could not render. Please refresh.');
 image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
 note('CFM V387 · White boxes, high-contrast readable text · 85×45 mm vector.');
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
function printLabel(sheet){
 if(!ok())return;
 const w=window.open('','_blank');if(!w){note('Please enable pop-ups to print.');return}
 // Image import is explicitly raster; all generated Work Order labels print as vectors.
 // TA220 is a 203-DPI monochrome thermal printer. Convert only the
 // generated print SVG to 100% black/white: gray and color ink gets halftoned
 // into speckles and makes small letters appear broken. The approved preview,
 // positions, fonts, logo contours and printed label dimensions are unchanged.
 const vector=pasted?null:vectorLabel();
 const ink=vector?.replace(/\b(fill|stroke)="#([0-9a-f]{3}|[0-9a-f]{6})"/gi,(full,attr,color)=>{
  const white=['fff','ffffff','f0f0f0'].includes(color.toLowerCase());
  return attr+'="'+(white?'#fff':'#000')+'"';
 });
 const art=pasted?'<img src="'+$('woLabelCanvas').toDataURL('image/png')+'" alt="Imported label">':ink;
 if(!art){w.close();note('Long text may be cut; print blocked until corrected.');return}
 const count=sheet?10:1;
 const page=sheet?'@page{size:A4 portrait;margin:7mm}.grid{display:grid;grid-template-columns:repeat(2,85mm);grid-template-rows:repeat(5,45mm);gap:3mm 5mm;}':
 '@page{size:85mm 45mm;margin:0}';
 const content='<!doctype html><html><head><meta charset="utf-8"><title>Eagle Work Order Taffeta Label</title><style>'+page+
 'html,body{padding:0;margin:0;background:white}.grid>svg,.grid>img{width:85mm;height:45mm;display:block;break-inside:avoid;page-break-inside:avoid}.grid{margin:0}@media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="grid">'+
 Array.from({length:count},()=>art).join('')+
 '</div><script>addEventListener("load",()=>{focus();print()})<\/script></body></html>';
 w.document.open();w.document.write(content);w.document.close();
 note(sheet?'A4: 10 SVG black-only labels, 85×45 mm':'TA220: solid-black vector ink · 85×45 mm Actual Size 100% · Fit to Page OFF.');
}
function build(){
 const style=document.createElement('style');
 style.textContent=[
 '#woLabelLaunch{margin:4px 0;padding:8px 12px;border:1px solid #163985;border-radius:8px;background:#fff;color:#173a7a;font:800 12px Arial;cursor:pointer}',
 '#woLabelDialog{width:min(940px,98vw);max-height:96dvh;overflow:auto;border:1px solid #bdc9dc;border-radius:14px;padding:0;background:#fff;color:#18334a}',
 '#woLabelDialog::backdrop{background:#0f2343aa}#woLabelDialog *{box-sizing:border-box;font-family:Arial,Helvetica,sans-serif}',
 '#woLabelDialog .top{display:flex;align-items:center;justify-content:space-between;gap:8px;background:#163988;color:#fff;padding:11px 14px;position:sticky;top:0;z-index:2}',
 '#woLabelDialog .top strong{font-size:17px;display:block}#woLabelDialog .top small{font-size:11px;color:#eef6ff}',
 '#woLabelDialog .main{display:grid;grid-template-columns:minmax(0,1fr) 325px;gap:14px;padding:12px}',
 '#woLabelDialog .fields{display:grid;grid-template-columns:1fr 1fr;column-gap:9px;row-gap:6px}',
 '#woLabelDialog .wide{grid-column:1/-1}#woLabelDialog label{display:block;font:800 11px Arial;color:#35475c;margin:0}',
 '#woLabelDialog input,#woLabelDialog select,#woLabelDialog textarea{display:block;width:100%;margin-top:4px;border:1px solid #b9c8da;background:#fff;color:#1a3345;border-radius:7px;padding:8px 9px;font:500 13px Arial;min-height:36px}',
 '#woLabelDialog textarea{resize:vertical;min-height:54px}#woLabelDialog #woLabelDetails{min-height:52px}',
 '#woLabelDialog button{border:1px solid #adc0d6;border-radius:8px;background:#fff;color:#173d78;padding:8px 12px;font:800 12px Arial;cursor:pointer}',
 '#woLabelDialog .primary{background:#153f92;color:#fff;border-color:#153f92}',
 '#woLabelDialog .workselect{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end;margin-bottom:10px}',
 '#woLabelDialog .workselect button{min-height:36px;white-space:nowrap}',
 '#woLabelDialog .preview{display:flex;flex-direction:column;align-items:stretch;gap:7px;position:sticky;top:67px;align-self:start}',
 '#woLabelDialog .preview strong{font-size:11px;color:#355070}#woLabelCanvas{display:block;width:100%;height:auto;aspect-ratio:85/45;background:#fff;border:1px solid #bcc8d6;border-radius:7px}',
 '#woLabelNotice{font-size:11px;line-height:1.45;color:#375c6e;min-height:24px}',
 '#woLabelDialog details.advanced{border:1px solid #d5dfea;border-radius:8px;margin-top:10px;padding:7px 9px}',
 '#woLabelDialog details.advanced summary{font:bold 12px Arial;color:#28476d;cursor:pointer}',
 '#woLabelDialog details.advanced label{margin-top:9px}#woLabelDialog .help{font:11px/1.45 Arial;color:#566878;margin:7px 0}',
 '#woLabelDialog .tools{display:flex;flex-wrap:wrap;gap:6px;position:sticky;bottom:0;background:#fff;padding:10px 12px;border-top:1px solid #d8e0e9;z-index:3}',
 '#woLabelDialog .tools button{flex:1;min-width:105px}#woLabelDialog .tools .primary{order:0}',
 '@media(max-width:720px){#woLabelDialog .main{grid-template-columns:1fr;padding:9px;gap:11px}',
 '#woLabelDialog .preview{position:static;order:-1}#woLabelDialog .workselect{grid-template-columns:minmax(0,1fr) auto}',
 '#woLabelDialog .top strong{font-size:15px}#woLabelDialog .tools{padding:8px;gap:6px}',
 '#woLabelDialog .tools button{padding:10px 6px;min-width:115px}#woLabelCanvas{max-width:560px}}'
 ].join('');
 document.head.append(style);
 const d=document.createElement('dialog');d.id='woLabelDialog';
 d.innerHTML='<div class="top"><div><strong>EAGLE · Stitching Label</strong><small>New approved corporate design · 85 × 45 mm · Work Order Auto-Fill</small></div><button id="woLabelClose">✕ Close</button></div>'+
 '<div class="main"><div class="editor">'+
 '<div class="workselect"><label>SELECT WORK ORDER<select id="woLabelSelect"><option value="">Select Work Order / Manual</option></select></label><button id="woLabelRefresh">↻ Refresh</button></div>'+
 '<div class="fields">'+
 '<label>WORK ORDER NO.<input id="woLabelNo" placeholder="CFM-556"></label>'+
 '<label>EFPPL ITEM CODE<input id="woLabelCode" placeholder="EFPPL-2000-CF-48-TLT"></label>'+
 '<label class="wide">PRODUCT — WORK ORDER DESCRIPTION<textarea id="woLabelHeading" rows="2" placeholder="Auto from Work Order"></textarea></label>'+
 '<label class="wide">MICRON<input id="woLabelMicron" placeholder="5 MICRON ANTISTATIC"></label>'+
 '<label>SIZE<input id="woLabelSize" placeholder="48″"></label>'+
 '<label>MFG. DATE (ACTUAL)<input id="woLabelMfgDate" placeholder="19-Nov-2026"></label>'+
 '</div>'+
 '<details class="advanced"><summary>More options · Description 2 / Paste Matter / Image</summary>'+
 '<label>Work Order Description 2 (reference)<textarea id="woLabelDetails" rows="2" placeholder="Technical details from Work Order"></textarea></label>'+
 '<label>Paste Work Order matter<textarea id="woLabelMatter" rows="3" placeholder="Work Order No.: CFM-556&#10;Heading: CF BAG 48 TOP L/T&#10;Details: 5 MICRON ANTISTATIC&#10;EFPPL Code: EFPPL-2000-CF-48-TLT"></textarea></label>'+
 '<button id="woLabelPaste">↳ Apply Pasted Matter</button>'+
 '<label>Or import image (PNG/JPG)<input id="woLabelUpload" type="file" accept="image/png,image/jpeg,image/webp"></label>'+
 '</details>'+
 '<p class="help">Auto from selected Work Order. Confirm the actual manufacturing date. Details use medium-weight text and auto-fit each box; too-long values block printing instead of getting cut. Print at 100% Actual Size, Fit to Page OFF.</p>'+
 '</div><div class="preview"><strong>LIVE PRINT PREVIEW</strong><canvas id="woLabelCanvas" width="2008" height="1063"></canvas><span id="woLabelNotice" role="status">Select Work Order</span></div></div>'+
 '<div class="tools"><button id="woLabelPrint" class="primary">🖨 Print 85 × 45</button><button id="woLabelA4">🖨 A4 (10)</button>'+
 '<button id="woLabelGenerate">↻ Preview</button><button id="woLabelSave">↓ Save PNG</button><button id="woLabelCopy">⧉ Copy Image</button></div>';
 document.body.append(d);
 $('woLabelClose').onclick=()=>d.close();
 $('woLabelRefresh').onclick=refresh;$('woLabelSelect').onchange=selectWork;$('woLabelPaste').onclick=pasteMatter;
 for(const id of ['woLabelNo','woLabelHeading','woLabelDetails','woLabelCode','woLabelSize','woLabelMicron','woLabelMfgDate'])$(id).addEventListener('input',draw);
 $('woLabelGenerate').onclick=draw;
 $('woLabelUpload').onchange=e=>imagePaste(e.target.files?.[0]);
 d.addEventListener('paste',e=>{const item=[...(e.clipboardData?.items||[])].find(x=>x.type.startsWith('image/'));if(item){e.preventDefault();imagePaste(item.getAsFile())}});
 $('woLabelCopy').onclick=async()=>{
  if(!ok())return;
  try{
   const blob=await new Promise(resolve=>$('woLabelCanvas').toBlob(resolve,'image/png'));
   if(!blob||!navigator.clipboard?.write||typeof ClipboardItem==='undefined')throw Error('Copy unsupported');
   await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);note('Image copied.');
  }catch(e){note('Copy unsupported. Use Save PNG instead.')}
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
 btn.textContent='🏷 Print EAGLE Bag Label · 85×45';
 btn.title='Approved EAGLE 85 × 45 mm vector bag label for this Work Order';
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
  btn.textContent='🏷 EAGLE Bag Label · 85×45';
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