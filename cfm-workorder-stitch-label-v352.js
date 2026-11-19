/* CFM V369. Branded Eagle 85x45 Bag Label / SVG text / Batch removed / Cloud read-only. */
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
function label45Layout(){
 const ctx=$('woLabelCanvas')?.getContext('2d');if(!ctx)return null;
 const v={wo:val('woLabelNo'),code:val('woLabelCode'),product:val('woLabelHeading'),spec:val('woLabelDetails'),size:val('woLabelSize'),micron:val('woLabelMicron'),date:val('woLabelMfgDate')};
 function fit(raw,width,max=24,min=12){
  const value=String(raw||'').trim()||'—';
  for(let size=max;size>=min;size-=.5){
   const lines=wrap(ctx,value,width,'bold '+size+'px Arial,sans-serif');
   const step=Math.ceil(size*1.16);
   if(lines.length*step<=46)return{lines,size,step};
  }return null;
 }
 const out={v,wo:fit(v.wo,247,28,15),code:fit(v.code,244,24,12),product:fit(v.product,246,25,12),size:fit(v.size,243,26,13),micron:fit(v.micron||v.spec,246,23,11),date:fit(v.date,246,24,12)};
 out.overflow=[out.wo,out.code,out.product,out.size,out.micron,out.date].some(x=>!x);
 out.valid=!out.overflow&&Boolean(v.wo&&v.code&&v.product);
 return out;
}
function vectorLabel(){
 const L=label45Layout();if(!L?.valid)return null;
 const escSvg=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 const txt=(x,y,v,size,color='#111',weight=700,more='')=>'<text x="'+x+'" y="'+y+'" font-family="Arial,Helvetica,sans-serif" font-size="'+size+'" font-weight="'+weight+'" fill="'+color+'" '+more+'>'+escSvg(v)+'</text>';
 const a=['<svg xmlns="http://www.w3.org/2000/svg" width="85mm" height="45mm" viewBox="0 0 850 450">',
 '<rect width="850" height="450" fill="#fff"/>',
 '<rect x="8" y="8" width="834" height="434" rx="16" fill="none" stroke="#112d99" stroke-width="5"/>'];
 const bird=window.CFM_EAGLE_BRAND;
 if(bird?.logoBluePath&&bird?.logoGreenPath){
  a.push('<g transform="translate(27 23) scale(.70 .66)"><path d="'+bird.logoBluePath+'" fill="#193ba1" fill-rule="evenodd"/><path d="'+bird.logoGreenPath+'" fill="#168e42" fill-rule="evenodd"/></g>');
 }else a.push(txt(63,103,'E',82,'#193ba1',900));
 a.push('<path d="M187 37V143" stroke="#111" stroke-width="2.5"/>');
 a.push('<rect x="287" y="17" width="143" height="27" rx="14" fill="#178e42"/>');
 a.push(txt(304,37,'SINCE : 1992',20,'#fff',800));
 a.push(txt(200,99,'EAGLE',66,'#eb222e',900,'font-style="italic"'));
 a.push(txt(207,122,'FILTRATION PRODUCT PVT. LTD.',20,'#189141',700));
 a.push(txt(207,141,'An ISO 9001:2015 Certified Company',15,'#111',700));
 a.push('<path d="M18 182H177 M180 182L201 159H836V190H180Z" stroke="#15329a" stroke-width="2" fill="#173393"/>');
 a.push(txt(217,181,'Mfg. of All Types of Industrial Filters, Bag Filters, & Automobile Filters.',15,'#fff',700));
 // EXACT final format: 3 paired information rows and one contact row. No Batch field.
 const top=[200,255,310],split=[17,181,447,568,833];
 a.push('<rect x="17" y="200" width="816" height="165" rx="7" fill="#fff" stroke="#111" stroke-width="2.5"/>');
 a.push('<path d="M17 255H833 M17 310H833 M181 200V365 M447 200V365 M568 200V365" stroke="#111" stroke-width="2"/>');
 for(let i=0;i<3;i++)a.push('<rect x="19" y="'+(top[i]+2)+'" width="160" height="51" fill="#f0f0f0"/><rect x="449" y="'+(top[i]+2)+'" width="117" height="51" fill="#f0f0f0"/>');
 const fs=[
  ['WORK ORDER NO.',23,192,L.wo,0,16],
  ['ITEM CODE',454,577,L.code,0,17],
  ['PRODUCT',23,192,L.product,1,19],
  ['SIZE',454,577,L.size,1,19],
  ['MICRON',23,192,L.micron,2,19],
  ['MFG. DATE',453,577,L.date,2,17]
 ];
 for(const [name,x,valueX,fit,row,letterSize] of fs){
  const middle=top[row]+27.5;
  a.push(txt(x,middle+6,name,letterSize,'#111',800));
  const first=middle-(fit.lines.length-1)*fit.step/2+fit.size*.35;
  fit.lines.forEach((line,n)=>a.push(txt(valueX,first+n*fit.step,line,fit.size,'#000',800)));
 }
 // Batch has been replaced by Email / Website / Phone, aligned in a single footer.
 a.push('<rect x="17" y="374" width="816" height="59" rx="6" fill="#fff" stroke="#111" stroke-width="2.5"/>');
 a.push('<path d="M308 374V433 M583 374V433" stroke="#111" stroke-width="2"/>');
 const contacts=[
  {kind:'email',x:22,label:'info@eaglefiltrations.com',width:277,size:19},
  {kind:'web',x:318,label:'www.eaglefiltrations.com',width:257,size:19},
  {kind:'phone',x:591,label:'+91 70416 70091',width:233,size:23}
 ];
 const ctx=$('woLabelCanvas').getContext('2d');
 for(const v of contacts){
  if(v.kind==='email')a.push('<rect x="'+(v.x+1)+'" y="394" width="26" height="20" rx="2" stroke="#173793" stroke-width="2" fill="none"/><path d="M'+(v.x+2)+' 395l12 10 12 -10" fill="none" stroke="#173793" stroke-width="2"/>');
  if(v.kind==='web')a.push('<circle cx="'+(v.x+14)+'" cy="404" r="12" stroke="#173793" stroke-width="2" fill="none"/><path d="M'+(v.x+2)+' 404h24 M'+(v.x+14)+' 392v24" stroke="#173793" stroke-width="2"/>');
  if(v.kind==='phone')a.push('<circle cx="'+(v.x+14)+'" cy="404" r="13" fill="#173793"/>'+txt(v.x+7,410,'+',20,'#fff',900));
  let size=v.size;for(;size>=14;size-=.5){ctx.font='bold '+size+'px Arial,sans-serif';if(ctx.measureText(v.label).width<v.width-38)break}
  a.push(txt(v.x+35,404+size*.35,v.label,size,'#111',700));
 }
 a.push('</svg>');return a.join('');
}
let drawSequence=0;
function draw(){
 const canvas=$('woLabelCanvas');if(!canvas)return;
 const L=label45Layout();if(!L)return;
 const ctx=canvas.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#fff';ctx.fillRect(0,0,C_W,C_H);
 overflow=L.overflow;pasted=false;printable=L.valid;
 const seq=++drawSequence;
 if(!L.valid){note(L.overflow?'Details too long for 85×45 mm; print blocked to avoid clipping.':'Select Work Order and check Product and Item Code.');return}
 const svg=vectorLabel(),pic=new Image();
 pic.onload=()=>{if(seq!==drawSequence)return;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,C_W,C_H);ctx.drawImage(pic,0,0,C_W,C_H)};
 pic.onerror=()=>note('Preview not rendered; try Refresh.');
 pic.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
 note('EAGLE 85×45 mm label ready · SVG vector print · contacts in place of Batch · no blur from image scaling.');
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
 const art=pasted?'<img src="'+$('woLabelCanvas').toDataURL('image/png')+'" alt="Imported label">':vectorLabel();
 if(!art){w.close();note('Long text may be cut; print blocked until corrected.');return}
 const count=sheet?10:1;
 const page=sheet?'@page{size:A4 portrait;margin:7mm}.grid{display:grid;grid-template-columns:repeat(2,85mm);grid-template-rows:repeat(5,45mm);gap:3mm 5mm;}':
 '@page{size:85mm 45mm;margin:0}';
 const content='<!doctype html><html><head><meta charset="utf-8"><title>Eagle Work Order Taffeta Label</title><style>'+page+
 'html,body{padding:0;margin:0;background:white}.grid>svg,.grid>img{width:85mm;height:45mm;display:block;break-inside:avoid;page-break-inside:avoid}.grid{margin:0}@media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="grid">'+
 Array.from({length:count},()=>art).join('')+
 '</div><script>addEventListener("load",()=>{focus();print()})<\/script></body></html>';
 w.document.open();w.document.write(content);w.document.close();
 note(sheet?'A4 print: 10 SVG vector 85×45 mm labels':'85×45 mm SVG print ready: Actual Size 100%, Fit to Page OFF.');
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
 d.innerHTML='<div class="top"><div><strong>Work Order Stitching Label</strong><div style="font-size:11px">EAGLE Bag Label · 85 × 45 mm · Approved design</div></div><button id="woLabelClose">✕ Close</button></div>'+
 '<div class="main"><div>'+
 '<label>Work Order<select id="woLabelSelect"><option value="">Select Work Order / Manual</option></select></label><button id="woLabelRefresh">↻ Refresh Work Orders</button>'+
 '<label>Work Order No.<input id="woLabelNo" placeholder="CFM-556"></label>'+
 '<label>Product — Work Order Description<textarea id="woLabelHeading" placeholder="Same heading as Work Order"></textarea></label>'+
 '<label>Micron / Specification — Description 2<textarea id="woLabelDetails" placeholder="Same details as Work Order"></textarea></label>'+
 '<label>EFPPL Product Code<input id="woLabelCode" placeholder="EFPPL-2000-CF-48-TLT"></label>'+
 '<label>Size (auto if available)<input id="woLabelSize" placeholder="48″"></label>'+
 '<label>Micron / Full Specification Override<input id="woLabelMicron" placeholder="5 MICRON ANTISTATIC"></label>'+
 '<label>Manufacturing Date (actual date)<input id="woLabelMfgDate" placeholder="19-Nov-2026"></label>'+
 '<p class="help">EAGLE Bag Label 85×45 mm with Work Order, Item Code, Product, Size, Micron / full technical spec and Mfg Date. Batch, Qty, SRL, Material, Stage and QC excluded. Approved Email / Website / Phone appear in footer. Missing size and manufacturing date are shown as — (never invented). Generated print is native SVG vector (not bitmap) for clear text. Use Actual Size 100% and disable Fit to Page.</p>'+
 '<label>Paste Matter<textarea id="woLabelMatter" placeholder="Work Order No.: CFM-556&#10;Heading: CF BAG 48 TOP L/T&#10;Details: 2 MICRON ANTISTATIC&#10;EFPPL Code: EFPPL-2000-CF-48-TLT"></textarea></label><button id="woLabelPaste">↳ Apply Pasted Matter</button>'+
 '<label>Or upload/paste image<input id="woLabelUpload" type="file" accept="image/png,image/jpeg,image/webp"></label>'+
 '<p class="help">Ctrl+V can paste an image. If text does not fit, printing is blocked instead of clipping the content.</p>'+
 '</div><div class="preview"><canvas id="woLabelCanvas" width="2008" height="1063"></canvas><span id="woLabelNotice" role="status">Select Work Order</span></div></div>'+
 '<div class="tools"><button id="woLabelGenerate" class="primary">✦ Generate Image</button><button id="woLabelCopy">⧉ Copy Image</button><button id="woLabelSave">↓ Save PNG</button><button id="woLabelPrint">🖨 Print 85 × 45</button><button id="woLabelA4">🖨 A4 (10 labels)</button></div>';
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
 btn.title='White Taffeta 85 × 25 mm label for this Work Order';
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
  btn.textContent='🏷 Option 1 Stitching Label · 85×25';
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