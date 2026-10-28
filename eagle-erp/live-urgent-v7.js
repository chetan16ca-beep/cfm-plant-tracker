(()=>{
"use strict";
/* NEW ERP mobile synchronization and voluntary URGENT-only sound. No old state writes. */
const app=window.eagleV3,home=document.querySelector("#home .control-hero .hero-actions");
if(!app||!home)return;
let baseline=null,enabled=false,audio=null,polling=false,lastSync=0;
const button=document.createElement("button");
button.type="button";button.id="v7UrgentAlert";button.textContent="Enable URGENT Alerts";
button.title="Sounds only for newly received URGENT Work Orders after this page loads";
home.appendChild(button);
function urgentSet(){
 const orders=app.getState()?.orders||[];
 return new Set(orders.filter(x=>!x.archived&&String(x.priority).toUpperCase()==="URGENT").map(x=>Number(x.no)));
}
function sound(){
 if(!audio||audio.state!=="running")return;
 const start=audio.currentTime;
 [0,0.36,0.72].forEach((delay,i)=>{
  const oscillator=audio.createOscillator(),gain=audio.createGain();
  oscillator.type="sine";oscillator.frequency.value=i===1?850:680;
  gain.gain.setValueAtTime(0.0001,start+delay);
  gain.gain.exponentialRampToValueAtTime(0.09,start+delay+0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001,start+delay+0.26);
  oscillator.connect(gain);gain.connect(audio.destination);
  oscillator.start(start+delay);oscillator.stop(start+delay+0.28);
 });
}
function observe(){
 const current=urgentSet();
 if(baseline!==null&&enabled){
  const fresh=[...current].filter(n=>!baseline.has(n));
  if(fresh.length){sound();button.textContent="🚨 NEW URGENT: CFM-"+fresh.join(", CFM-");button.style.borderColor="#f2c3a1";
   if("Notification" in window&&Notification.permission==="granted"){try{new Notification("CFM • URGENT Work Order",{body:fresh.map(n=>"CFM-"+n).join(", ")})}catch(_){/* Android may not support Notification constructor */}}
  }
 }
 baseline=current;
}
document.addEventListener("eagle:state",observe);
if(app.getState()?.orders?.length)observe();
button.addEventListener("click",async()=>{
 if(enabled){enabled=false;button.textContent="Enable URGENT Alerts";return}
 try{
  const Context=window.AudioContext||window.webkitAudioContext;
  if(Context){audio=audio||new Context();await audio.resume()}
  enabled=true;baseline=urgentSet();button.textContent="URGENT Alerts ON";
  if("Notification" in window&&Notification.permission==="default"){try{await Notification.requestPermission()}catch(_){}}
 }catch(e){button.textContent="Alerts unavailable on this device";enabled=false}
});
async function poll(){
 if(polling||document.visibilityState!=="visible"||app.isBusy?.())return;
 const target=document.activeElement;
 if(target&&target.matches?.("input,textarea,select,[contenteditable=true]"))return;
 if(Date.now()-lastSync<60000)return;
 polling=true;
 try{await app.refresh(false);lastSync=Date.now()}
 catch(e){const status=document.getElementById("cloud");if(status)status.textContent="Cloud refresh retry available"}
 finally{polling=false}
}
const timer=setInterval(poll,90000);
window.addEventListener("pagehide",()=>clearInterval(timer),{once:true});
})();