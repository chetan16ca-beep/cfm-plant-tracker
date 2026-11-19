/* CFM V348: Add SRL auto-number and existing Eagle cloth master picker.
 * UI-only. No Cloud writes on load. Original Store Save remains authoritative.
 * New SRL requires a live duplicate-number check immediately before Save.
 */
(function(){
 'use strict';
 const PREFIX='EFPPL03/';
 const readLocal=()=>{
   try{return typeof state!=='undefined'&&Array.isArray(state.store)?state.store:[]}
   catch(_){return []}
 };
 const up=v=>String(v==null?'':v).trim().toUpperCase();
 const codeOf=r=>up(r&&r.efpplCode);
 const makeNext=rows=>{
   let n=0;
   for(const r of rows||[]){
     const m=up(r&&r.srlNo).match(/^EFPPL03\/(\d+)$/);
     if(m)n=Math.max(n,Number(m[1])||0);
   }
   return PREFIX+String(n+1).padStart(4,'0');
 };
 function clothMaster(rows){
   const map=new Map(), missing=new Map();
   for(const r of rows||[]){
     const quality=String(r&&r.quality||'').trim();
     const code=codeOf(r);
     const proc=String(r&&r.process||'STANDARD').trim();
     if(code&&quality){
       const key=code;
       if(!map.has(key)||(!map.get(key).description&&r.description))
         map.set(key,{code,quality,process:proc,description:String(r.description||'').trim()});
     }else if(quality){
       const key=up(quality);
       if(!missing.has(key))missing.set(key,{code:'',quality,process:'STANDARD',description:''});
     }
   }
   return {
     mapped:[...map.values()].sort((a,b)=>a.code.localeCompare(b.code,undefined,{numeric:true})),
     missing:[...missing.values()].sort((a,b)=>a.quality.localeCompare(b.quality,undefined,{numeric:true}))
   };
 }
 function enhance(i){
   const dlg=document.getElementById('editDialog');
   const form=document.getElementById('editForm');
   if(!dlg||!form||!dlg.open)return;
   const field=n=>form.elements.namedItem(n);
   const serial=field('srlNo'),quality=field('quality'),code=field('efpplCode'),proc=field('process'),desc=field('description');
   const save=document.getElementById('saveFormBtn');
   if(!serial||!quality||!code||!proc||!save)return;
   const isNew=i==null;
   let manual=false,allowedNative=false,busy=false,liveRows=[];
   const note=document.createElement('small');
   note.style.cssText='display:block;margin-top:5px;color:#265474;font:600 11px system-ui';
   serial.parentElement.appendChild(note);
   const wrapper=document.createElement('div');
   wrapper.className='field full';
   wrapper.style.cssText='padding:10px;border-radius:11px;border:1px solid #cddfec;background:#f7fbff';
   const title=document.createElement('label');
   title.textContent='Cloth Master • Select Quality & EFPPL Code';
   title.style.cssText='font-weight:700;font-size:12px;color:#153a59';
   const search=document.createElement('input');
   search.type='search';search.placeholder='Search cloth, code or process…';
   search.setAttribute('aria-label','Search cloth master');
   search.style.cssText='width:100%;margin:7px 0 5px;min-height:37px';
   const pick=document.createElement('select');
   pick.setAttribute('aria-label','Select existing Eagle cloth code');
   pick.style.cssText='width:100%;min-height:42px;padding:7px;border:1px solid #a9cbdf;border-radius:8px;font:600 12px system-ui';
   const help=document.createElement('small');
   help.style.cssText='display:block;margin-top:5px;color:#4b6475';
   help.textContent='Selecting a mapped cloth fills EFPPL Code, Quality and Process. Width / MTR must be entered for this roll.';
   wrapper.append(title,search,pick,help);
   quality.parentElement.before(wrapper);
   let master={mapped:[],missing:[]};
   function renderOptions(){
     const selected=pick.value||codeOf({efpplCode:code.value});
     const query=up(search.value);
     pick.replaceChildren(new Option('Select Cloth / EFPPL Code',''));
     const addGroup=(items,label)=>{
       const group=document.createElement('optgroup');
       group.label=label;
       for(const x of items){
         const text=x.code?x.code+' | '+x.quality+' | '+x.process:x.quality+' (code not verified)';
         if(query&&!up(text).includes(query))continue;
         const o=new Option(text,x.code||'UNMAPPED:'+up(x.quality));
         group.appendChild(o);
       }
       if(group.children.length)pick.appendChild(group);
     };
     addGroup(master.mapped,'Existing EFPPL Cloth Master');
     addGroup(master.missing,'Other recorded cloths — verify code');
     if(master.mapped.some(x=>x.code===selected))pick.value=selected;
     else pick.value='';
   }
   function mergeMaster(remote=[]){
     master=clothMaster([...readLocal(),...remote]);
     renderOptions();
   }
   mergeMaster();
   search.addEventListener('input',renderOptions);
   pick.addEventListener('change',()=>{
     const item=master.mapped.find(x=>x.code===pick.value);
     if(item){
       code.value=item.code;quality.value=item.quality;proc.value=item.process;
       if(desc&&!String(desc.value||'').trim()&&item.description)desc.value=item.description;
       for(const el of [code,quality,proc,desc])el&&el.dispatchEvent(new Event('input',{bubbles:true}));
       help.textContent='Selected: '+item.code+'. Enter actual roll width and opening meter.';
     }else if(pick.value.startsWith('UNMAPPED:')){
       const other=master.missing.find(x=>'UNMAPPED:'+up(x.quality)===pick.value);
       if(other){quality.value=other.quality;code.value='';quality.dispatchEvent(new Event('input',{bubbles:true}));}
       help.textContent='This cloth has no verified EFPPL code. Please verify and enter its code manually.';
     }
   });
   if(code.value)pick.value=codeOf({efpplCode:code.value});
   if(!isNew)return;
   const suggest=rows=>{
     const value=makeNext([...readLocal(),...(rows||[])]);
     if(!manual){serial.value=value;note.textContent='Suggested automatically: '+value+' • Live verification required on Save';}
     return value;
   };
   suggest([]);
   serial.addEventListener('input',()=>{
     manual=true;
     note.textContent='Manual serial entered • duplicate will be checked against live Cloud before Save';
   });
   const fetchLive=async()=>{
     if(typeof cloudFetch!=='function')throw Error('Cloud connection not available');
     const remote=await cloudFetch();
     if(!remote||!remote.payload||!Array.isArray(remote.payload.store))
       throw Error('Live Store list could not be verified');
     return remote.payload.store;
   };
   (async()=>{
     try{
       note.textContent='Checking next SRL against live Cloud…';
       liveRows=await fetchLive();
       mergeMaster(liveRows);
       suggest(liveRows);
     }catch(err){
       note.textContent='Live Cloud unavailable. New SRL Save requires online duplicate check.';
       console.warn('CFM Add SRL verification:',err);
     }
   })();
   save.addEventListener('click',async function(e){
     if(allowedNative){allowedNative=false;return;}
     e.preventDefault();e.stopImmediatePropagation();
     if(busy)return;
     busy=true;save.disabled=true;
     const oldText=save.textContent;
     save.textContent='Checking live SRL…';
     try{
       const latest=await fetchLive();
       const entered=up(serial.value);
       if(!/^EFPPL03\/\d{4,}$/.test(entered))
         throw Error('New SRL format must be EFPPL03/0001 (or higher).');
       if([...latest,...readLocal()].some(r=>up(r.srlNo)===entered))
         throw Error(entered+' already exists. Please use the next available SRL.');
       const recommended=makeNext([...latest,...readLocal()]);
       if(!manual&&entered!==recommended){
         serial.value=recommended;
         note.textContent='Cloud changed: updated serial to '+recommended+'. Please press Save again.';
         throw Error('New SRL allocated from latest Cloud. Check the number and press Save again.');
       }
       if(!String(quality.value||'').trim())
         throw Error('Select Cloth Master / enter Quality first.');
       if(!String(code.value||'').trim())
         throw Error('EFPPL Cloth Code is required. Pick a mapped cloth or enter a verified code.');
       save.disabled=false;save.textContent=oldText;
       allowedNative=true;save.click();
     }catch(err){
       note.textContent=String(err&&err.message||err);
       if(typeof toast==='function')toast(note.textContent);
       else alert(note.textContent);
     }finally{
       busy=false;
       save.disabled=false;
       if(save.textContent==='Checking live SRL…')save.textContent=oldText;
     }
   },true);
 }
 function start(){
   if(typeof window.openStoreForm!=='function'||window.openStoreForm.cfmV348)return false;
   const original=window.openStoreForm;
   function enhanced(i){
     const result=original.apply(this,arguments);
     enhance(i===undefined?null:i);
     return result;
   }
   enhanced.cfmV348=true;
   window.openStoreForm=enhanced;
   return true;
 }
 if(!start()){
   let n=0;
   const timer=setInterval(()=>{if(start()||++n>25)clearInterval(timer)},250);
 }
})();
