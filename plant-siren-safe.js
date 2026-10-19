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
})();