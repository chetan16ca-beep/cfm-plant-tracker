/* CFM OLD ERP: PO Reader V2. Parsing only; never creates any work order. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const btn=$('readPO');
if(!btn||!$('poFile')||!$('recognized'))return;
const stamp=()=>new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
function status(message,bad=false){
 const el=$('readStatus');el.textContent=message;
 el.style.color=bad?'#a32825':'#246350';
 el.setAttribute('role','status');
}
function waitLibrary(name,urls){
 if(window[name])return Promise.resolve(window[name]);
 return (async function(){
  for(const url of urls){
   try{
    await new Promise((resolve,reject)=>{
     const script=document.createElement('script');
     let settled=false;
     const timer=setTimeout(()=>finish(false),18000);
     function finish(ok){
      if(settled)return;settled=true;clearTimeout(timer);
      script.onload=null;script.onerror=null;
      if(ok)resolve();else{script.remove();reject(Error('CDN unavailable'))}
     }
     script.onload=()=>finish(true);script.onerror=()=>finish(false);
     script.async=true;script.src=url;document.head.appendChild(script);
    });
    if(window[name])return window[name];
   }catch(_){}
  }
  throw Error(name+' unavailable. Check internet, allow CDN content, or paste the PO text and use Parse Text.');
 })();
}
function pullDate(raw){
 let m=raw.match(/(?:\bP\.?\s*O\.?\s*DATE\b|\bORDER\s*DATE\b|\bDATE\b)[^\r\n\d]{0,18}(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/i);
 if(m)return m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0');
 m=raw.match(/(?:\bP\.?\s*O\.?\s*DATE\b|\bORDER\s*DATE\b|\bDATE\b)[^\r\n\d]{0,18}(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/i);
 if(m)return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');
 m=raw.match(/(?:\bP\.?\s*O\.?\s*DATE\b|\bORDER\s*DATE\b|\bDATE\b)[^\r\n\d]{0,18}(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/i);
 if(m){const dt=new Date(m[2]+' '+m[1]+', '+m[3]);if(!Number.isNaN(dt.getTime()))return m[3]+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+m[1].padStart(2,'0')}
 return '';
}
function getPo(raw){
 const rows=raw.split(/\r?\n/);
 for(const s of rows.slice(0,100)){
  const m=s.match(/\b(?:P\.?\s*O\.?|PURCHASE\s*ORDER|ORDER)\s*(?:NO\.?|NUMBER|NUM\.?|#)\s*[:#.\-]*\s*([A-Z0-9][A-Z0-9/_-]{2,35})/i);
  if(m&&/\d/.test(m[1])&&!/^(?:DATE|NUMBER|PURCHASE|ORDER)$/i.test(m[1]))return m[1];
 }
 return '';
}
function getBuyer(raw){
 const rows=raw.split(/\r?\n/).map(x=>x.trim());
 for(let i=0;i<Math.min(rows.length,70);i++){
  const same=rows[i].match(/^(?:BUYER(?:\s*NAME)?|BILL(?:ED)?\s*TO|PURCHASER|CUSTOMER\s*NAME|ORDERED\s*BY)\s*[:\-]\s*(.{4,110})$/i);
  if(same&&/[A-Za-z]/.test(same[1]))return same[1].replace(/\s{2,}.*/, '').trim();
  if(/^(?:BUYER(?:\s*ADDRESS|\s*NAME)?|BILL(?:ED)?\s*TO|PURCHASER|CUSTOMER\s*NAME|ORDERED\s*BY)\s*:?\s*$/i.test(rows[i])){
   for(let k=i+1;k<Math.min(rows.length,i+4);k++){
    if(rows[k]&&/[A-Za-z]/.test(rows[k])&&!/^(?:ADDRESS|GSTIN|PAN|PHONE|EMAIL|DATE)\b/i.test(rows[k]))return rows[k].slice(0,120);
   }
  }
 }
 return '';
}
function quantityIn(line){
 const matches=[...line.matchAll(/(?:^|[\s(:|])(\d{1,6})(?:\.0+)?\s*(NOS?\.?|PCS?\.?|PIECES?|EA|EACH|UNITS?|BAGS?|SET)\b/ig)];
 if(matches.length)return Number(matches[matches.length-1][1]);
 let m=line.match(/\b(?:QTY|QUANTITY|ORDERED\s*QTY)\s*[:=\-]?\s*(\d{1,6})(?:\.0+)?\b/i);
 if(m)return Number(m[1]);
 return null;
}
const sectionRx=/(?:CENTRIFUGE\s*BAGS?|CF\s*BAGS?|FBD\s*(?:FINGER\s*)?BAGS?|RVPD\s*BAGS?|RCVD\s*BAGS?|ANFD(?:\s*FILTER)?\s*CLOTHS?|FILTER\s*PRESS\s*CLOTHS?|FILTER\s*BAGS?|HEPA\s*FILTERS?|CARTRIDGES?|SPARKLER\s*(?:PADS?|PAPERS?)|FILTER\s*HOUSINGS?)/i;
function poExtract(text){
 const raw=String(text||'').replace(/[‐‑–—]/g,'-').replace(/\u00a0/g,' ').replace(/\t/g,' ');
 const lines=raw.split(/\r?\n/).map(s=>s.replace(/\s{2,}/g,' ').trim()).filter(Boolean);
 const found=[],expected={};let current='';
 const groupNames=[['Centrifuge Bag',/CENTRIFUGE\s*BAGS?/i],['FBD Bag',/\bFBD\s*(?:FINGER\s*)?BAGS?/i]];
 for(const line of lines){
  for(const [name,re] of groupNames){if(re.test(line)){current=name;const h=line.match(/\b(\d{1,5})\s*(?:NOS?|PCS?|PIECES?)\b/i);if(h&&line.length<75&&/^\s*(?:CENTRIFUGE|FBD)\b/i.test(line))expected[name]=Number(h[1]);break}}
  if(/^(?:TOTAL|GRAND\s*TOTAL|SUB\s*TOTAL|BILL\s*TO|GST|GSTIN|INVOICE|TRANSPORT|FREIGHT|PAYMENT|TAX|DISCOUNT|NET\s*AMOUNT|TERMS|AMOUNT|SIGNATURE|PAGE\s+\d+)\b/i.test(line))continue;
  if(/^\W*[\d,.]+\s*$/.test(line))continue;
  const code=(line.match(/\b(?:I?CFG|I?FBD|EFP[- ]?P|NF)\s*[-/]?\s*\d{2,5}\b/i)||[])[0]||'';
  const hasProduct=sectionRx.test(line)||Boolean(code)||/\b(?:MICRON|ANTISTATIC|FILTER\s*CLOTH|FILTER\s*PAD|SS\s*HOUSING|POLYPROPYLENE)\b/i.test(line);
  if(!hasProduct)continue;
  const qty=quantityIn(line);
  const purelyGroup=/^(?:CENTRIFUGE|FBD)\s*BAGS?\s*[:\-]?\s*\d+\s*(?:NOS?|PCS?|PIECES?)\s*$/i.test(line);
  if(purelyGroup)continue;
  const hasSpec=Boolean(code)||/\b(?:\d{1,3}\s*(?:MICRON|MESH|INCH|FINGER|MM)\b|\d{2}\s*(?:["″]|X\s*\d)|\b(?:ANTISTATIC|L\/T|TOP\s*LIFT|SPUN|MULTIFILAMENT|DOUBLE\s*LAYER))\b/i.test(line);
  if(qty===null&&!hasSpec)continue;
  let description=line.replace(/^\s*(?:S\.?\s*NO\.?|SR\.?\s*NO\.?|ITEM)\s*[:#.\-]?\s*/i,'').replace(/^\s*\d{1,3}\s*[.)]\s*/,'').trim();
  if(qty!==null)description=description.replace(new RegExp('\\b'+qty+'(?:\\.0+)?\\s*(?:NOS?\\.?|PCS?\\.?|PIECES?|EA|EACH|UNITS?|BAGS?|SET)\\b','i'),'').trim();
  description=description.replace(/\s*[-|,]\s*$/,'').slice(0,350);
  if(description.length<6)continue;
  const key=(code||description).toUpperCase().replace(/\s+/g,' ');
  if(found.some(x=>x.key===key))continue;
  found.push({description,qty:qty&&Number.isSafeInteger(qty)?qty:null,key,group:current});
  if(found.length>=40)break;
 }
 return {party:getBuyer(raw),po:getPo(raw),date:pullDate(raw),found,expected,lines:lines.length};
}
window.cfmPOExtractV2=poExtract; // Pure, read-only parser for diagnostics.
function applyText(text){
 const result=(window.cfmPOExtractV3||poExtract)(text);
 if(result.party&&!$('party').value.trim())$('party').value=result.party;
 if(result.po&&!$('po').value.trim())$('po').value=result.po;
 if(result.date&&!$('date').value)$('date').value=result.date;
 if(result.deliveryDate&&$('deliveryDate')&&!$('deliveryDate').value)$('deliveryDate').value=result.deliveryDate;
 if(result.found.length){
  $('lines').replaceChildren();
  result.found.forEach(x=>{
   $('add').click();
   const row=$('lines').lastElementChild;
   const desc=row.cells[0].querySelector('input');
   desc.value=x.description;
   desc.dataset.poItemCode=x.itemCode||'';
   row.cells[1].querySelector('input').value=x.qty??'';
  });
 }
 window.cfmPOExpectedGroups=result.expected;
 if(typeof window.cfmPOAfterParse==='function')window.cfmPOAfterParse(result);
 const missing=result.found.filter(x=>x.qty===null).length;
 const warnings=[];
 if(!result.party&&!$('party').value)warnings.push('Party name needs manual entry');
 if(!result.po&&!$('po').value)warnings.push('PO number needs manual entry');
 if(!result.date&&!$('date').value)warnings.push('PO date needs manual entry');
 if(!result.found.length)warnings.push('No confident product lines; enter product and quantity manually');
 if(missing)warnings.push(missing+' product lines need quantity');
 status('Text extracted ('+result.lines+' lines). Found '+result.found.length+' possible products. '+(warnings.length?'CHECK: '+warnings.join('; ')+'. ':'')+'Always verify against original PO.',Boolean(warnings.length));
 return result;
}
function withTimeout(promise,ms,label){
 return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(Error(label+' took too long. Try a smaller/clearer photo or paste the original text.')),ms))]);
}
async function recognizeImage(image){
 const T=await waitLibrary('Tesseract',['https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js','https://unpkg.com/tesseract.js@5/dist/tesseract.min.js']);
 let worker;
 try{
  if(typeof T.createWorker==='function'){
   status('Starting OCR engine… This may download language data.');
   worker=await withTimeout(T.createWorker('eng',1,{logger:p=>{
    if(p.status==='recognizing text')status('Reading image… '+Math.round(100*(p.progress||0))+'%');
   }}),100000,'OCR engine');
   const r=await withTimeout(worker.recognize(image),110000,'OCR recognition');
   let text=String(r.data?.text||'');
   if((image instanceof File || (typeof HTMLCanvasElement!=='undefined'&&image instanceof HTMLCanvasElement)) && typeof worker.setParameters==='function' && window.cfmPOExtractV3){
    const assess=value=>{
     const p=window.cfmPOExtractV3(value);
     return p.found.length*90+p.found.filter(x=>x.qty!==null).length*45+
        (p.party?20:0)+(p.po?25:0)+(p.date?35:0)+
        p.found.reduce((n,x)=>n+Math.min(x.description.length,160)/8,0);
    };
    const first=window.cfmPOExtractV3(text);
    if(!first.found.length||!first.date||!first.po||first.found.some(x=>x.qty===null)){
     try{
      status('Rechecking product specs, PO number and date with a second OCR layout…');
      await worker.setParameters({tessedit_pageseg_mode:'6'});
      const attempt=await withTimeout(worker.recognize(image),100000,'OCR second layout');
      const alternative=String(attempt.data?.text||'');
      if(assess(alternative)>assess(text))text=alternative;
     }catch(e){console.warn('PO OCR alternative layout skipped',e)}
    }
   }
   return text;
  }
  const r=await withTimeout(T.recognize(image,'eng'),110000,'OCR recognition');
  return String(r.data?.text||'');
 }finally{try{if(worker)await worker.terminate()}catch(_){}}
}
async function pdfRead(file){
 const lib=await waitLibrary('pdfjsLib',['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js','https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js']);
 if(lib.GlobalWorkerOptions)lib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
 const pdf=await withTimeout(lib.getDocument({data:await file.arrayBuffer()}).promise,45000,'PDF opening');
 let all='',ocrPages=0;
 const count=Math.min(pdf.numPages,8);
 for(let i=1;i<=count;i++){
  status('Reading PDF page '+i+' / '+count+'…');
  const page=await pdf.getPage(i),tc=await page.getTextContent();
  const rows=new Map();
  for(const item of tc.items||[]){
   const text=String(item.str||'').trim();if(!text)continue;
   const y=item.transform?.[5]??0, x=item.transform?.[4]??0;
   const key=Math.round(y/3)*3;
   if(!rows.has(key))rows.set(key,[]);
   rows.get(key).push({x,text});
  }
  const text=[...rows.entries()].sort((a,b)=>b[0]-a[0]).map(([,line])=>line.sort((a,b)=>a.x-b.x).map(k=>k.text).join(' ')).join('\n');
  all+='\n=== PO PAGE '+i+' ===\n'+text+'\n';
  const chars=text.replace(/[^a-z0-9]/gi,'').length;
  if(chars<100||(chars<2400&&(window.cfmPOExtractV3||poExtract)(text).found.length===0)){
   status('Scanned PDF page '+i+': running OCR…');
   const view=page.getViewport({scale:1.65});
   const scale=Math.min(1,Math.sqrt(3100000/(view.width*view.height)));
   const vp=page.getViewport({scale:1.65*scale});
   const canvas=document.createElement('canvas');
   canvas.width=Math.round(vp.width);canvas.height=Math.round(vp.height);
   await page.render({canvasContext:canvas.getContext('2d',{willReadFrequently:true}),viewport:vp}).promise;
   try{
    all+='\n'+await recognizeImage(canvas)+'\n';ocrPages++;
   }catch(ocrError){
    // Retain embedded PDF text if an additional scanned page cannot run OCR.
    if(all.replace(/[^a-z0-9]/gi,'').length<100)throw ocrError;
    status('OCR page '+i+' unavailable; keeping readable PDF text. Check this page.',true);
    console.warn('CFM OCR fallback',ocrError);
   }
   canvas.width=1;canvas.height=1;
  }
 }
 if(pdf.numPages>count)status('First '+count+' of '+pdf.numPages+' pages checked. Verify remaining items manually.');
 return {text:all,ocrPages,pages:pdf.numPages};
}
const summary=document.createElement('div');
summary.className='warn';summary.style.margin='10px 0';
summary.style.background='#e9f4ff';
summary.innerHTML='<b>PO Auto Read V2</b> — photo, scanned PDF and text PDF supported. All detected product lines require manual verification. Nothing is saved to ERP until final confirmation.';
$('preview').before(summary);
const parseBtn=document.createElement('button');parseBtn.type='button';parseBtn.textContent='↻ Parse Edited Text';parseBtn.style.background='#486f85';
$('recognized').after(parseBtn);
parseBtn.onclick=()=>{const val=$('recognized').value.trim();if(!val)return status('Paste recognized PO text before parsing.',true);applyText(val)};
$('recognized').addEventListener('change',e=>{
 // Run the improved parser first; prevent the old narrow parser from undoing corrected text.
 e.stopImmediatePropagation();
 const val=$('recognized').value.trim();if(val)applyText(val);
},true);
btn.onclick=async()=>{
 const file=$('poFile').files[0];
 if(!file)return status('Choose a PO photo or PDF first.',true);
 const isPdf=file.type==='application/pdf'||/\.pdf$/i.test(file.name);
 if(file.size>(isPdf?20:12)*1024*1024)return status('File is too large. PDF max 20 MB, photo max 12 MB.',true);
 if(!isPdf&&!/^image\/(?:jpeg|png|webp|bmp)$/i.test(file.type))return status('Unsupported photo type. Convert HEIC to JPG or use PDF.',true);
 btn.disabled=true;btn.textContent='Reading PO…';
 status('Preparing '+file.name+' ('+Math.round(file.size/1024)+' KB)…');
 try{
  const source=isPdf?await pdfRead(file):{text:await recognizeImage(file),pages:1,ocrPages:1};
  $('recognized').value=source.text;
  if(!source.text.replace(/\W/g,'').length)throw Error('No text could be read. Take a brighter, sharper image; or enter PO details manually.');
  const result=applyText(source.text);
  const extra=' • '+source.pages+' page(s) • '+source.ocrPages+' OCR page(s)';
  status($('readStatus').textContent+extra,result.found.length===0);
 }catch(e){
  status('PO reading failed: '+String(e.message||e)+' Manual entry is still available below. You can also paste PO text and press Parse Edited Text.',true);
 }finally{btn.disabled=false;btn.textContent='🔎 Auto Read PO'}
};
// V8 one-touch flow: file selection starts PDF/photo reading automatically.
 // The operator still verifies PO and manually approves final work-order save.
 let lastSelection=null;
 $('poFile').addEventListener('change',()=>{
  const file=$('poFile').files?.[0];lastSelection=file||null;
  if(!file)return;
  status('File selected • Auto Read starting…');
  setTimeout(()=>{
   if(lastSelection===file&&!btn.disabled&&window.cfmPOReaderReady)btn.click();
  },100);
 });
 window.cfmPOReaderReady=true;
})();
