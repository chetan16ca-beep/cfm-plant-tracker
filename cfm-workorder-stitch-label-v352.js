/* CFM V366. Final Option 1 85x25mm, no logo/name/Stage/QC, read-only. */
(function(){
'use strict';
const $=id=>document.getElementById(id),C_W=2008,C_H=591,VIEW_W=850,VIEW_H=250;
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
function label25Layout(){
 const ctx=$('woLabelCanvas')?.getContext('2d');
 if(!ctx)return null;
 const values={
  wo:val('woLabelNo'),desc:val('woLabelHeading'),spec:val('woLabelDetails'),code:val('woLabelCode')
 };
 const fit=(value,max,min,width,limit)=>{
  const txt=String(value||'').trim()||'—';
  for(let f=max;f>=min;f-=.5){
   const font='bold '+f+'px Arial,sans-serif';
   const lines=wrap(ctx,txt,width,font);
   const lineHeight=Math.ceil(f*1.15);
   if(lines.length<=limit)return {lines,font,size:f,lineHeight};
  }
  return null;
 };
 const L={
  work:fit(values.wo,26,15,545,1),
  desc:fit(values.desc,23,13,545,2),
  spec:fit(values.spec,19.5,12,545,2),
  code:fit(values.code,23,14,545,1),
  values
 };
 L.valid=!!(values.wo&&values.code&&(values.desc||values.spec)&&L.work&&L.desc&&L.spec&&L.code);
 L.overflow=!L.work||!L.desc||!L.spec||!L.code;
 return L;
}
function draw(){
 const canvas=$('woLabelCanvas');if(!canvas)return;
 const ctx=canvas.getContext('2d');ctx.setTransform(C_W/VIEW_W,0,0,C_H/VIEW_H,0,0);
 const L=label25Layout();if(!L)return;
 ctx.clearRect(0,0,850,250);ctx.fillStyle='#fff';ctx.fillRect(0,0,850,250);
 // Option 1: premium MNC industrial bands without any logo, company name, Stage or QC.
 // White Taffeta 85 × 25 mm. 3 mm top & bottom unprinted stitching edges.
 ctx.strokeStyle='#000';ctx.lineWidth=3;
 ctx.beginPath();ctx.roundRect(16,32,818,186,13);ctx.stroke();
 ctx.strokeStyle='#000';ctx.lineWidth=2.3;
 for(const y of [87,167]){ctx.beginPath();ctx.moveTo(115,y);ctx.lineTo(815,y);ctx.stroke()}
 // Corner stripes are entirely within the print-safe interior.
 ctx.lineWidth=5;
 for(let i=0;i<3;i++){
  const x=46+i*22;
  ctx.beginPath();ctx.moveTo(x+20,41);ctx.lineTo(x,68);ctx.stroke();
  const xr=758+i*20;
  ctx.beginPath();ctx.moveTo(xr+18,194);ctx.lineTo(xr,215);ctx.stroke();
 }
 const labels=[['WORK ORDER NO.',52,37],['DESCRIPTION',103,68],['EFPPL CODE',180,35]];
 ctx.fillStyle='#000';ctx.textBaseline='middle';
 for(const [title,y,h] of labels){
  ctx.font='bold 20px Arial,sans-serif';
  ctx.fillText(title,126,y+h/2,185);
 }
 const dividerX=320;
 ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(dividerX,48);ctx.lineTo(dividerX,206);ctx.stroke();
 function content(row,center,maxLines,baseline){
  if(!row)return;
  ctx.fillStyle='#000';ctx.font=row.font;ctx.textBaseline='middle';
  const mid=center-(row.lines.length-1)*row.lineHeight/2;
  row.lines.forEach((text,k)=>ctx.fillText(text,337,mid+k*row.lineHeight,481));
 }
 content(L.work,70);
 // Two distinct Work Order fields are kept in DESCRIPTION as heading + technical details.
 content(L.desc,L.spec.lines.length>0?116:127);
 content(L.spec,L.desc.lines.length>0?148:136);
 content(L.code,190);
 // Sew zone is always entirely blank, including border and bars.
 ctx.fillStyle='#fff';ctx.fillRect(0,0,850,30);ctx.fillRect(0,220,850,30);
 overflow=L.overflow;pasted=false;printable=L.valid;
 note(L.overflow?'Text too long for the 25mm label; shorten details, print disabled.':
 printable?'Option 1 ready · 85×25 mm · NO logo/name/Stage/QC · 3mm stitching margins · sharp print':
 'Select a Work Order to generate the 85×25 mm label.');
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
 const L=label25Layout();if(!L?.valid)return null;
 const escape=t=>String(t??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
 const txt=(x,y,word,size,weight=700,max=0)=>'<text x="'+x+'" y="'+y+'" fill="#000" font-family="Arial,Helvetica,sans-serif" font-size="'+size+'" font-weight="'+weight+'"'+(max?' textLength="'+max+'" lengthAdjust="spacingAndGlyphs"':'')+'>'+escape(word)+'</text>';
 const o=['<svg xmlns="http://www.w3.org/2000/svg" width="85mm" height="25mm" viewBox="0 0 850 250">',
 '<rect width="850" height="250" fill="white"/>',
 '<rect x="16" y="32" width="818" height="186" rx="13" stroke="#000" stroke-width="3" fill="none"/>',
 '<path d="M115 87H815 M115 167H815 M320 48V206" stroke="#000" stroke-width="2.3" fill="none"/>'];
 for(let i=0;i<3;i++){
  const x=46+i*22,rx=758+i*20;
  o.push('<path d="M'+(x+20)+' 41L'+x+' 68 M'+(rx+18)+' 194L'+rx+' 215" fill="none" stroke="#000" stroke-width="5"/>');
 }
 const names=[['WORK ORDER NO.',71],['DESCRIPTION',137],['EFPPL CODE',197]];
 names.forEach(([name,y])=>o.push(txt(126,y,name,20)));
 const add=(fit,y)=>{
  const mid=y-(fit.lines.length-1)*fit.lineHeight/2;
  fit.lines.forEach((line,k)=>o.push(txt(337,mid+k*fit.lineHeight+fit.size*.36,line,fit.size)));
 };
 add(L.work,70);add(L.desc,116);add(L.spec,148);add(L.code,190);
 o.push('</svg>');return o.join('');
}
function printLabel(sheet){
 if(!ok())return;
 const w=window.open('','_blank');if(!w){note('Please enable pop-ups to print.');return}
 // Image import is explicitly raster; all generated Work Order labels print as vectors.
 const art=pasted?'<img src="'+$('woLabelCanvas').toDataURL('image/png')+'" alt="Imported label">':vectorLabel();
 if(!art){w.close();note('Long text may be cut; print blocked until corrected.');return}
 const count=sheet?20:1;
 const page=sheet?'@page{size:A4 portrait;margin:7mm}.grid{display:grid;grid-template-columns:repeat(2,85mm);grid-template-rows:repeat(10,25mm);gap:2mm 4mm;}':
 '@page{size:85mm 25mm;margin:0}';
 const content='<!doctype html><html><head><meta charset="utf-8"><title>Eagle Work Order Taffeta Label</title><style>'+page+
 'html,body{padding:0;margin:0;background:white}.grid>svg,.grid>img{width:85mm;height:25mm;display:block;break-inside:avoid;page-break-inside:avoid}.grid{margin:0}@media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="grid">'+
 Array.from({length:count},()=>art).join('')+
 '</div><script>addEventListener("load",()=>{focus();print()})<\/script></body></html>';
 w.document.open();w.document.write(content);w.document.close();
 note(sheet?'A4 print: 20 vector-sharp 85×25 mm labels':'Vector print ready: Actual Size 100%, 85×25 mm, 3mm sewing margins.');
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
 '#woLabelDialog .preview{display:flex;flex-direction:column;align-items:center;gap:7px}#woLabelCanvas{width:320px;height:94px;max-width:100%;background:white;border:1px solid #abbdd2}#woLabelNotice{font:11px Arial;text-align:center;color:#315a77}'+
 '#woLabelDialog .help{font:11px/1.5 Arial;color:#546d80}@media(max-width:650px){#woLabelDialog .main{grid-template-columns:1fr;padding:9px}#woLabelDialog .preview{order:-1}#woLabelCanvas{width:300px;height:88px}}';
 document.head.append(style);
 const d=document.createElement('dialog');d.id='woLabelDialog';
 d.innerHTML='<div class="top"><div><strong>Work Order Stitching Label</strong><div style="font-size:11px">Option 1 · B&W Taffeta 85 × 25 mm · No logo/company name</div></div><button id="woLabelClose">✕ Close</button></div>'+
 '<div class="main"><div>'+
 '<label>Work Order<select id="woLabelSelect"><option value="">Select Work Order / Manual</option></select></label><button id="woLabelRefresh">↻ Refresh Work Orders</button>'+
 '<label>Work Order No.<input id="woLabelNo" placeholder="CFM-556"></label>'+
 '<label>Heading — Work Order Description<textarea id="woLabelHeading" placeholder="Same heading as Work Order"></textarea></label>'+
 '<label>Details — Work Order Description 2<textarea id="woLabelDetails" placeholder="Same details as Work Order"></textarea></label>'+
 '<label>EFPPL Product Code<input id="woLabelCode" placeholder="EFPPL-2000-CF-48-TLT"></label>'+
 '<p class="help">Top & bottom 3 mm stays COMPLETELY BLANK for stitching (no text, rules or border). Black ink on WHITE Taffeta: print at 100%, black-only (no color/gray ink). For BLACK Taffeta, use a suitable WHITE thermal-transfer ribbon; normal black ribbon is not readable. Printed fields: Work Order No. + Description (including Description 2 technical details) + EFPPL Code only. No logo, no company name, no Stage/QC.</p>'+
 '<label>Paste Matter<textarea id="woLabelMatter" placeholder="Work Order No.: CFM-556&#10;Heading: CF BAG 48 TOP L/T&#10;Details: 2 MICRON ANTISTATIC&#10;EFPPL Code: EFPPL-2000-CF-48-TLT"></textarea></label><button id="woLabelPaste">↳ Apply Pasted Matter</button>'+
 '<label>Or upload/paste image<input id="woLabelUpload" type="file" accept="image/png,image/jpeg,image/webp"></label>'+
 '<p class="help">Ctrl+V can paste an image. If text does not fit, printing is blocked instead of clipping the content.</p>'+
 '</div><div class="preview"><canvas id="woLabelCanvas" width="2008" height="591"></canvas><span id="woLabelNotice" role="status">Select Work Order</span></div></div>'+
 '<div class="tools"><button id="woLabelGenerate" class="primary">✦ Generate Image</button><button id="woLabelCopy">⧉ Copy Image</button><button id="woLabelSave">↓ Save PNG</button><button id="woLabelPrint">🖨 Print 85 × 25</button><button id="woLabelA4">🖨 A4 (20 labels)</button></div>';
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