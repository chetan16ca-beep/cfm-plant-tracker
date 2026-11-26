/* V451 helper only: approved label artwork and print module remain unchanged. */
(function(){
'use strict';
const $=id=>document.getElementById(id),T=x=>String(x??'').trim(),N=x=>T(x).toUpperCase();
function explicitMicron(row){
 const raw=T(row?.micron??row?.micronRating);
 if(/^\d+(?:\.\d+)?(?:\s*(?:microns?|[µμ]m?))?$/i.test(raw))return raw.match(/\d+(?:\.\d+)?/)[0];
 const s=[row?.description,row?.description2].filter(Boolean).join(' ');
 return s.match(/(\d+(?:\.\d+)?)\s*(?:microns?\b|[µμ]m?)/i)?.[1]||s.match(/(?:micron|pore\s*size)\s*[:=-]?\s*(\d+(?:\.\d+)?)/i)?.[1]||'';
}
function orderNumber(v){return T(v).match(/^(?:CFM[-\s]*)?(\d+)$/i)?.[1]||''}
function getCode(r){const c=T(r?.itemCode||r?.efpplCode);return /^EFPPL-\d{4}-/i.test(c)?c:T(window.CFM_EFPPL?.codeForRow?.(r)?.code)||c}
let rows=[],seq=0;
async function refresh(){const k=++seq;try{const s=await cloudFetch();if(k===seq&&Array.isArray(s?.payload?.pending))rows=s.payload.pending}catch(_){}}
function mount(){
 const sel=$('woLabelSelect'),code=$('woLabelCode'),head=$('woLabelHeading');if(!sel||!code||!head||$('woLabelSearch451'))return;
 const search=document.createElement('input');search.id='woLabelSearch451';search.placeholder='Search Work Order / Company / Product';search.setAttribute('aria-label','Search Work Orders');sel.before(search);
 const wrapper=document.createElement('label');wrapper.textContent='EFPPL MASTER — SELECT VERIFIED CODE';const master=document.createElement('select');master.id='woLabelMaster451';wrapper.append(master);code.parentElement.after(wrapper);
 const hint=document.createElement('p');hint.className='help';hint.textContent='Missing code? Select verified EFPPL master code. If Product text is too long, shorten only the label description using the PO. Work Order data will not change.';head.parentElement.after(hint);
 function loadMaster(){const selected=master.value;master.replaceChildren(new Option('Choose verified EFPPL code',''));for(const p of window.CFM_EFPPL?.master||[])master.add(new Option(p.code+' | '+p.description,p.code));master.value=selected||code.value}
 function filter(){const q=N(search.value);for(const o of sel.options){const r=rows.find(x=>T(x.workNo)===o.value);o.hidden=!!q&&!!o.value&&!N([o.textContent,r?.party,r?.poNo,r?.description,r?.itemCode].join(' ')).includes(q)&&o.value!==sel.value}}
 search.addEventListener('input',filter);
 master.addEventListener('change',()=>{if(master.value){code.value=master.value;code.dispatchEvent(new Event('input',{bubbles:true}))}});
 sel.addEventListener('change',()=>{const selected=sel.value,r=rows.find(x=>T(x.workNo)===selected);if(r){$('woLabelMicron').value=explicitMicron(r);$('woLabelMicron').dispatchEvent(new Event('input',{bubbles:true}));}master.value=code.value;});
 const dialog=$('woLabelDialog');let open=false;
 const observer=new MutationObserver(()=>{if(dialog.open&&!open){open=true;loadMaster();refresh().then(filter)}else if(!dialog.open)open=false});
 observer.observe(dialog,{attributes:true,attributeFilter:['open']});
 const selectObserver=new MutationObserver(filter);selectObserver.observe(sel,{childList:true});
 $('woLabelRefresh')?.addEventListener('click',()=>{loadMaster();refresh().then(filter)});
 loadMaster();if(dialog.open){open=true;refresh().then(filter)}
}
window.CFM_STITCH_V451={explicitMicron,orderNumber,getCode};
function boot(){mount();let n=0;const timer=setInterval(()=>{mount();if($('woLabelSearch451')||++n>120)clearInterval(timer)},500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();