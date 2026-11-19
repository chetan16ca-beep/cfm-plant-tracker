/* CFM V349: Add SRL auto-number and existing Eagle cloth master picker.
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
   let localOnlyRow=null;
   const note=document.createElement('small');
   note.style.cssText='display:block;margin-top:5px;color:#265474;font:600 11px system-ui';
   serial.parentElement.appendChild(note);
   const recoverBtn=document.createElement('button');
   recoverBtn.type='button';recoverBtn.hidden=true;
   recoverBtn.style.cssText='display:none;margin:7px 0;padding:9px 12px;border:1px solid #adcde6;border-radius:9px;background:#176b9d;color:#fff;font:700 12px system-ui';
   recoverBtn.textContent='☁️ Recover existing local SRL to Cloud';
   serial.parentElement.appendChild(recoverBtn);
   const showRecover=local=>{
     localOnlyRow=local;
     recoverBtn.hidden=false;recoverBtn.style.display='inline-block';
     recoverBtn.textContent='☁️ Sync '+String(local.srlNo||'this SRL')+' to Cloud';
   };
   const hideRecover=()=>{localOnlyRow=null;recoverBtn.hidden=true;recoverBtn.style.display='none'};

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
   // An earlier local Save may have succeeded while the versioned Cloud PATCH failed.
   // Recover ONLY this existing roll, preserving all other Cloud records verbatim.
   recoverBtn.addEventListener('click',async()=>{
     if(!localOnlyRow||busy)return;
     const local=JSON.parse(JSON.stringify(localOnlyRow));
     const number=up(local.srlNo);
     if(!window.confirm('SRL '+number+' is on this device but not in Cloud. Sync exactly this saved local record?\\nCloth: '+String(local.quality||'-')+' | Opening MTR: '+String(local.openingMtr??'-')+'\\nOther stock / orders will remain unchanged.'))return;
     busy=true;recoverBtn.disabled=true;save.disabled=true;
     const originalLabel=recoverBtn.textContent;
     recoverBtn.textContent='☁️ Recovering existing SRL…';
     try{
       if(cloudBusy)throw Error('Another Cloud sync is running. Please retry after it finishes.');
       clearTimeout(cloudPushTimer);
       const remote=await cloudFetch();
       if(!remote||!remote.payload||!Array.isArray(remote.payload.store)||!Number.isSafeInteger(Number(remote.version)))
         throw Error('Live Cloud could not be verified.');
       const already=remote.payload.store.find(x=>up(x.srlNo)===number);
       if(already){
         hideRecover();
         note.textContent=number+' is already saved in Live Cloud. No duplicate was created.';
         toast('✓ '+number+' already exists in Cloud');
         return;
       }
       if(!readLocal().some(r=>up(r.srlNo)===number))
         throw Error('Local SRL record changed. Reopen Store and check details.');
       if(cloudBusy)throw Error('Cloud sync started during recovery. Retry safely.');
       const base=Number(remote.version),payload=JSON.parse(JSON.stringify(remote.payload));
       payload.store.push(local);
       const controller=new AbortController();
       const timeout=setTimeout(()=>controller.abort(),20000);
       let rows;
       try{
         const response=await fetch(CLOUD_URL+'/rest/v1/cfm_shared_state?id=eq.main&version=eq.'+base,{
           method:'PATCH',signal:controller.signal,cache:'no-store',
           headers:{...cloudHeaders(),Prefer:'return=representation','x-cfm-base-version':String(base)},
           body:JSON.stringify({payload,version:base+1,updated_at:new Date().toISOString()})
         });
         if(!response.ok)throw Error('Cloud recovery rejected (HTTP '+response.status+'). No local record deleted.');
         rows=await response.json();
       }finally{clearTimeout(timeout)}
       if(!Array.isArray(rows)||!rows.length)
         throw Error('Another device updated Cloud. No roll overwritten; retry recovery.');
       const verify=await cloudFetch();
       if(!verify?.payload?.store?.some(r=>up(r.srlNo)===number))
         throw Error('Cloud confirmation not received. Verify before retrying.');
       hideRecover();
       note.textContent='✓ '+number+' verified in Live Cloud (v'+verify.version+').';
       // Do not upload a stale full-device snapshot after a targeted SRL recovery.
       // Enable regular saves only if every locally synced field exactly matches Cloud.
       let same=false;
       try{same=JSON.stringify(cloudStatePayload())===JSON.stringify(verify.payload)}catch(_){}
       cloudVersion=Number(verify.version);
       cloudUpdatedAt=String(verify.updated_at||'');
       if(same){
         cloudReady=true;cloudDirty=false;
         setCloudBadge('☁️ SRL Cloud saved • 3-4 Mobile LIVE','green');
       }else{
         cloudReady=false;cloudDirty=true;
         clearTimeout(cloudPushTimer);
         setCloudBadge('⚠️ SRL saved • other local data needs review','amber');
       }
       toast('✓ '+number+' confirmed in Live Cloud');
     }catch(err){
       note.textContent=String(err&&err.message||err);
       toast('Cloud recovery pending • '+note.textContent);
     }finally{
       busy=false;recoverBtn.disabled=false;save.disabled=false;
       if(!recoverBtn.hidden)recoverBtn.textContent=originalLabel;
     }
   });
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
       const serverRecord=latest.find(r=>up(r.srlNo)===entered);
       if(serverRecord){
         hideRecover();
         throw Error(entered+' is already saved in Live Cloud. No new duplicate is allowed.');
       }
       const localRecord=readLocal().find(r=>up(r.srlNo)===entered);
       if(localRecord){
         showRecover(localRecord);
         throw Error(entered+' is saved on this device but missing from Live Cloud. Use the blue Sync button below; do not create a duplicate.');
       }
       hideRecover();
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
       // Original Store form saves locally, then queues an asynchronous Cloud push.
       // A local toast is NOT a verified Cloud receipt; check the server separately.
       setTimeout(async()=>{
         try{
           const check=await cloudFetch();
           if(check?.payload?.store?.some(r=>up(r.srlNo)===entered)){
             toast('✓ '+entered+' confirmed in Live Cloud');
           }else{
             toast('⚠ '+entered+' saved on device; Cloud not confirmed. Reopen Add SRL for safe recovery.');
           }
         }catch(_){toast('⚠ '+entered+' Cloud check unavailable. Verify Sync before another entry.')}
       },1800);
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
   if(typeof window.openStoreForm!=='function'||window.openStoreForm.cfmV349)return false;
   const original=window.openStoreForm;
   function enhanced(i){
     const result=original.apply(this,arguments);
     enhance(i===undefined?null:i);
     return result;
   }
   enhanced.cfmV349=true;
   window.openStoreForm=enhanced;
   return true;
 }
 if(!start()){
   let n=0;
   const timer=setInterval(()=>{if(start()||++n>25)clearInterval(timer)},250);
 }
})();
