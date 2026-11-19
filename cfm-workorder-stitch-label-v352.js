/* CFM V356. Final Option-25 monochrome corporate Taffeta label; read-only ERP data. */
(function(){
'use strict';
const $=id=>document.getElementById(id),C_W=1004,C_H=531,VIEW_W=850,VIEW_H=450;
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
 const ctx=can.getContext('2d');ctx.setTransform(C_W/VIEW_W,0,0,C_H/VIEW_H,0,0);
 const no=val('woLabelNo'),heading=val('woLabelHeading'),detail=val('woLabelDetails'),code=val('woLabelCode');
 // Option 25 reference: monochrome 4-row corporate chevron label with racing-stripe trim.
 // Source image aspect 1717:912 ~= 85:45. No logos, vendor/party names, or batch number.
 ctx.fillStyle='#fff';ctx.fillRect(0,0,VIEW_W,VIEW_H);
 function polygon(pts,color='#000'){
  ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=color;ctx.fill();
 }
 function border(x,y,w,h,r=0){
  const rad=Math.min(r,w/2,h/2);
  ctx.beginPath();ctx.moveTo(x+rad,y);ctx.lineTo(x+w-rad,y);ctx.quadraticCurveTo(x+w,y,x+w,y+rad);
  ctx.lineTo(x+w,y+h-rad);ctx.quadraticCurveTo(x+w,y+h,x+w-rad,y+h);
  ctx.lineTo(x+rad,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-rad);
  ctx.lineTo(x,y+rad);ctx.quadraticCurveTo(x,y,x+rad,y);ctx.closePath();
  ctx.stroke();
 }
 ctx.lineWidth=5;ctx.strokeStyle='#000';border(8,10,834,430,24);
 // Three rising diagonal bars at the top-left, mirrored at the bottom-right.
 for(let i=0;i<3;i++){
  const x=55+i*36;
  polygon([[x,29],[x+28,29],[x+6,61],[x-22,61]]);
  const bx=722+i*36;
  polygon([[bx+17,387],[bx+43,387],[bx+17,416],[bx-9,416]]);
 }
 ctx.lineWidth=3;ctx.strokeStyle='#000';
 ctx.beginPath();ctx.moveTo(177,48);ctx.lineTo(806,48);ctx.moveTo(42,404);ctx.lineTo(692,404);ctx.stroke();

 const rows=[
  {title:'Work Order No.',value:no,bold:true,min:15,max:29},
  {title:'Description',value:heading,bold:true,min:11,max:22},
  {title:'Description 2',value:detail,bold:false,min:11,max:21},
  {title:'EFPPL Product Code',value:code,bold:true,min:12,max:23}
 ];
 let anyOverflow=false;
 for(let i=0;i<rows.length;i++){
  const r=rows[i], y=82+i*71, h=69, x=29, split=342,tip=365,right=817;
  // White field extends to the far side; left black tab finishes with pointed arrow.
  ctx.fillStyle='#fff';ctx.fillRect(x,y,right-x,h);
  ctx.strokeStyle='#000';ctx.lineWidth=2.8;ctx.strokeRect(x,y,right-x,h);
  polygon([[x,y],[split,y],[tip,y+h/2],[split,y+h],[x,y+h]]);
  // White title text centered inside the black field label.
  const labelSize=i===3?19.5:(i===0?23:25);
  ctx.fillStyle='#fff';ctx.textBaseline='middle';ctx.font='bold '+labelSize+'px Arial';
  ctx.fillText(r.title,x+16,y+h/2,split-x-25);
  // Fit full live value inside its row. Never silently clip EFPPL code or specs.
  let fit=null;
  const content=String(r.value||'').trim()||'—';
  for(let f=r.max;f>=r.min;f-=0.5){
   const lines=wrap(ctx,content,right-tip-34,(r.bold?'bold ':'')+f+'px Arial');
   const lineH=Math.ceil(f*1.16);
   if(lines.length*lineH<=h-10){fit={font:f,lines,lineH};break}
  }
  if(!fit)anyOverflow=true;
  if(fit){
   ctx.fillStyle='#000';ctx.textBaseline='middle';
   ctx.font=(r.bold?'bold ':'')+fit.font+'px Arial';
   const y0=y+h/2-(fit.lines.length-1)*fit.lineH/2;
   fit.lines.forEach((line,n)=>ctx.fillText(line,tip+10,y0+n*fit.lineH));
  }else{
   ctx.fillStyle='#000';ctx.font='bold 13px Arial';ctx.textBaseline='middle';
   ctx.fillText('TEXT TOO LONG — EDIT DETAILS',tip+12,y+h/2);
  }
 }
 overflow=anyOverflow;
 pasted=false;printable=!overflow&&Boolean(no&&code&&(heading||detail));
 note(overflow?'Text too long for final 85 × 45 mm label. Printing disabled until details are shortened.':printable?
 'Final monochrome MNC label ready • 85 × 45 mm • Option 25 chevron layout.':
 'Select Work Order / enter heading, details and EFPPL code.');
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
function printLabel(sheet){
 if(!ok())return;
 const w=window.open('','_blank');if(!w){note('Please enable popups to print.');return}
 const src=$('woLabelCanvas').toDataURL('image/png'),n=sheet?12:1;
 const rule=sheet?'@page{size:A4 portrait;margin:8mm}.grid{display:grid;grid-template-columns:repeat(2,85mm);grid-template-rows:repeat(6,45mm);gap:2mm 4mm}'
 :'@page{size:85mm 45mm;margin:0}';
 const html='<!doctype html><html><head><meta charset="utf-8"><title>Work Order Label</title><style>body{margin:0}.grid img{width:85mm;height:45mm;display:block;object-fit:contain;break-inside:avoid}'+rule+'</style></head><body><div class="grid">'+
 Array.from({length:n},()=>'<img src="'+src+'" alt="Work Order Label">').join('')+
 '</div><script>window.addEventListener("load",function(){window.focus();window.print()})<\/script></body></html>';
 w.document.open();w.document.write(html);w.document.close();
 note(sheet?'A4 landscape labels (12) print opened.':'85 × 45 mm print opened.');
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
 d.innerHTML='<div class="top"><div><strong>Work Order Stitching Label</strong><div style="font-size:11px">Final B&W MNC Label · 85 × 45 mm · No branding</div></div><button id="woLabelClose">✕ Close</button></div>'+
 '<div class="main"><div>'+
 '<label>Work Order<select id="woLabelSelect"><option value="">Select Work Order / Manual</option></select></label><button id="woLabelRefresh">↻ Refresh Work Orders</button>'+
 '<label>Work Order No.<input id="woLabelNo" placeholder="CFM-556"></label>'+
 '<label>Heading — Work Order Description<textarea id="woLabelHeading" placeholder="Same heading as Work Order"></textarea></label>'+
 '<label>Details — Work Order Description 2<textarea id="woLabelDetails" placeholder="Same details as Work Order"></textarea></label>'+
 '<label>EFPPL Product Code<input id="woLabelCode" placeholder="EFPPL-2000-CF-48-TLT"></label>'+
 '<p class="help">Black ink on WHITE Taffeta: print at 100%, black-only (no color/gray ink). For BLACK Taffeta, use a suitable WHITE thermal-transfer ribbon; normal black ribbon is not readable. Printed fields: Work Order No. + Description + Description 2 + EFPPL Code only.</p>'+
 '<label>Paste Matter<textarea id="woLabelMatter" placeholder="Work Order No.: CFM-556&#10;Heading: CF BAG 48 TOP L/T&#10;Details: 2 MICRON ANTISTATIC&#10;EFPPL Code: EFPPL-2000-CF-48-TLT"></textarea></label><button id="woLabelPaste">↳ Apply Pasted Matter</button>'+
 '<label>Or upload/paste image<input id="woLabelUpload" type="file" accept="image/png,image/jpeg,image/webp"></label>'+
 '<p class="help">Ctrl+V can paste an image. If text does not fit, printing is blocked instead of clipping the content.</p>'+
 '</div><div class="preview"><canvas id="woLabelCanvas" width="1004" height="531"></canvas><span id="woLabelNotice" role="status">Select Work Order</span></div></div>'+
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
function mount(){
 const dash=$('view-dashboard');if(!dash)return false;
 if(!$('woLabelDialog'))build();
 let wrap=$('cfmBWTaffetaEntry');
 if(!wrap){
  wrap=document.createElement('section');
  wrap.id='cfmBWTaffetaEntry';
  wrap.setAttribute('aria-label','Black and white taffeta stitching label');
  wrap.style.cssText='display:flex!important;align-items:center;gap:8px;padding:7px 8px!important;margin:8px 0!important;background:#fff!important;border:2px solid #111!important;border-radius:10px!important;position:relative!important;visibility:visible!important;opacity:1!important;min-height:48px!important';
  const btn=document.createElement('button');
  btn.id='woLabelLaunch';btn.type='button';
  btn.textContent='🏷 B&W Taffeta Label · 85×45';
  btn.style.cssText='display:block!important;visibility:visible!important;opacity:1!important;min-height:36px!important;padding:9px 12px!important;border:1px solid #111!important;border-radius:7px!important;background:#111!important;color:#fff!important;font:bold 13px Arial,sans-serif!important;cursor:pointer!important;max-width:100%!important';
  btn.onclick=()=>{$('woLabelDialog').showModal();draw();refresh()};
  wrap.append(btn);
 }
 if(wrap.parentElement!==dash){
  const head=dash.querySelector(':scope > .section-head');
  if(head)head.after(wrap);
  else dash.prepend(wrap);
 }
 return true;
}
function boot(){
 let watching=null;
 const tryMount=()=>{
  const dash=$('view-dashboard');
  if(!dash)return false;
  mount();
  if(watching!==dash){
   if(watching&&watching._cfmLabelObserver)watching._cfmLabelObserver.disconnect();
   const observer=new MutationObserver(()=>{
    if(!$('cfmBWTaffetaEntry')||$('cfmBWTaffetaEntry').parentElement!==dash)mount();
   });
   observer.observe(dash,{childList:true,subtree:false});
   dash._cfmLabelObserver=observer;watching=dash;
  }
  return true;
 };
 if(tryMount())return;
 // Work Order Dashboard can be created later by ERP scripts.
 // Stop polling once mounted; no changes to ERP data or navigation.
 let attempts=0;
 const retry=setInterval(()=>{
  if(tryMount()||++attempts>=60)clearInterval(retry);
 },500);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();