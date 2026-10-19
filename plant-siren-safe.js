/* Standalone siren module; no ERP iframe changes. */
(()=>{'use strict';
const types={urgent:'Urgent Order',bill:'Bill Request',dispatch:'Ready to Dispatch',stock:'Low Stock SRL'};
let ctx;
function sound(){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;ctx=ctx||new C();ctx.resume();const t=ctx.currentTime;for(let i=0;i<3;i++){const o=ctx.createOscillator(),g=ctx.createGain();o.type='sawtooth';o.frequency.setValueAtTime(660,t+i*.3);o.frequency.linearRampToValueAtTime(950,t+i*.3+.2);g.gain.setValueAtTime(.001,t+i*.3);g.gain.linearRampToValueAtTime(.12,t+i*.3+.04);g.gain.linearRampToValueAtTime(.001,t+i*.3+.25);o.connect(g);g.connect(ctx.destination);o.start(t+i*.3);o.stop(t+i*.3+.26)}}catch(e){console.warn('Siren sound',e)}}
function say(msg){try{if(!window.speechSynthesis)return;const u=new SpeechSynthesisUtterance(msg);u.lang='en-IN';u.rate=.94;speechSynthesis.speak(u)}catch(e){}}
function alertSiren(type,detail){const label=types[type]||'Plant Alert';sound();say(label+(detail?' '+detail:''));return label}
window.CFMPlantSiren=alertSiren;
const panel=document.createElement('div');panel.id='cfm-safe-siren-panel';panel.style.cssText='position:fixed;right:10px;bottom:14px;z-index:1000022;background:#fff;border:1px solid #ddd;border-radius:12px;padding:8px;box-shadow:0 3px 16px #0003;font:12px Arial;max-width:220px';
const toggle=document.createElement('button');toggle.textContent='🔔 Plant Siren';toggle.style.cssText='background:#a52a19;color:#fff;border:0;border-radius:8px;padding:9px;font-weight:bold';panel.appendChild(toggle);
const menu=document.createElement('div');menu.hidden=true;menu.style.cssText='padding-top:8px;display:grid;gap:5px';for(const [type,label] of Object.entries(types)){const b=document.createElement('button');b.textContent='🔊 '+label;b.style.cssText='padding:8px;border:1px solid #ddd;border-radius:6px;background:#f6f8fa';b.addEventListener('click',()=>alertSiren(type));menu.appendChild(b)}panel.appendChild(menu);
toggle.addEventListener('click',()=>{menu.hidden=!menu.hidden;menu.style.display=menu.hidden?'none':'grid';if(!menu.hidden)sound()});menu.style.display='none';
document.body.appendChild(panel);

/* Read-only observation of the running ERP. Never mutate its state or navigation. */
const seen=new Map();
let initialized=false;
let lastScanError='';
let scanStatus=null;
function showStatus(message){if(!scanStatus){scanStatus=document.createElement('div');scanStatus.style.cssText='font:11px Arial;margin-top:6px;color:#7c2d12;max-width:205px';panel.appendChild(scanStatus)}scanStatus.textContent=message;}
function scan(){
 try{
  const frame=document.getElementById('app');
  const win=frame&&frame.contentWindow;
  if(!win||!win.document||win.document.readyState!=='complete')return;
  const snap=win.eval('(()=>{if(typeof state==="undefined"||!state)return null;const pending=(state.pending||[]).map(r=>({id:String(r.workNo||r.id||""),priority:String(r.priority||r.urgency||""),bill:String(r.billStatus||""),dispatch:String(r.dispatchStatus||"")}));const stock=(state.store||[]).map(r=>({id:String(r.srlNo||r.srl||r.serial||""),balance:typeof srlBalance==="function"?Number(srlBalance(r)):NaN}));const missing=[];for(const r of state.pending||[]){try{if(typeof pendingQty==='function'&&pendingQty(r)<=0)continue;const cloth=String(r.cloth||'').trim(),width=String(r.width||'').trim();if(!cloth)continue;const matches=(state.store||[]).filter(x=>String(x.quality||x.cloth||'').trim().toUpperCase()===cloth.toUpperCase()&&(!width||!String(x.width||'').trim()||String(x.width||'').trim()===width));const open=matches.some(x=>typeof srlBalance==='function'&&Number(srlBalance(x))>0);if(!open)missing.push({id:String(r.workNo||r.id||''),cloth,width})}catch(e){}}return {pending,stock,missing}})()');
  if(!snap){showStatus('⚠ ERP data not accessible');return;}
  showStatus('✓ Alert monitoring active');
  const current=new Map();
  for(const r of snap.pending){
   if(!r.id)continue;
   for(const [type,value,active] of [['urgent',r.priority,/urgent|high/i.test(r.priority)],['bill',r.bill,/request/i.test(r.bill)],['dispatch',r.dispatch,/ready/i.test(r.dispatch)]]){
    const key=type+':'+r.id;current.set(key,active);
    if(active&&!seen.get(key))alertSiren(type,r.id);
   }
  }
  for(const r of snap.stock){
   if(!r.id||!Number.isFinite(r.balance))continue;
   const key='stock:'+r.id,active=r.balance<=5;current.set(key,active);
   if(active&&!seen.get(key))alertSiren('stock',r.id);
  }
  for(const r of snap.missing||[]){if(!r.id)continue;const key='missing:'+r.id+':'+r.cloth+':'+r.width;current.set(key,true);if(!seen.get(key))alertSiren('stock',r.id+' '+r.cloth+' NO OPEN STOCK')}
  seen.clear();for(const [key,val] of current)seen.set(key,val);
  initialized=true;
 }catch(e){showStatus('⚠ Alert scan error');if(!scan.warned){console.warn('CFM siren scan unavailable:',e);scan.warned=true}}
}
setInterval(scan,15000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)scan()});
document.getElementById('app')?.addEventListener('load',()=>{initialized=false;seen.clear();setTimeout(scan,1200)});
setTimeout(scan,2500);
})();