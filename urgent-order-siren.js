/* CFM urgent new-order siren only. Does not change ERP data. */
(()=>{'use strict';
const frame=document.getElementById('app');
let audio=null,ready=false,baseline=false;
const seen=new Set();
const priorityById=new Map();
let lastSnapshot='';
async function unlock(){
  try{
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return false;
    if(!audio)audio=new AC();
    if(audio.state!=='running')await audio.resume();
    ready=audio.state==='running';
    return ready;
  }catch(e){console.warn('CFM siren audio',e);return false;}
}
document.addEventListener('pointerdown',unlock,{capture:true});
function bindFrame(){
  try{
    const doc=frame.contentDocument;
    if(!doc||doc.__cfmUrgentSirenBound)return;
    doc.__cfmUrgentSirenBound=true;
    doc.addEventListener('pointerdown',unlock,{capture:true});
    doc.addEventListener('click',e=>{const label=(e.target?.textContent||'').trim();if(/^(save|update|submit)$/i.test(label)){setTimeout(scan,350);setTimeout(scan,1100);setTimeout(scan,2200);}},true);
  }catch(e){}
}
async function ring(){
  const ok=await unlock();
  if(!ok){test.textContent='⚠ Audio blocked';return false;}
  for(let k=0;k<4;k++){
    const t=audio.currentTime+.04+k*.5;
    const o=audio.createOscillator(),g=audio.createGain();
    o.type='sawtooth';
    o.frequency.setValueAtTime(650,t);
    o.frequency.linearRampToValueAtTime(1150,t+.23);
    o.frequency.linearRampToValueAtTime(650,t+.43);
    g.gain.setValueAtTime(.001,t);
    g.gain.linearRampToValueAtTime(.22,t+.035);
    g.gain.setValueAtTime(.22,t+.35);
    g.gain.linearRampToValueAtTime(.001,t+.45);
    o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+.46);
  }
  return true;
}
function announceUrgent(workNumbers){
  if(!('speechSynthesis' in window))return;
  const clean=workNumbers.filter(Boolean).slice(0,8);
  if(!clean.length)return;
  const say=()=>{
    try{
      window.speechSynthesis.cancel();
      const names=clean.map(id=>id.toUpperCase().replace(/CFM[\\s-]*/,'C F M ').replace(/(\\d)/g,'$1 ')).join('. ');
      const utterance=new SpeechSynthesisUtterance('New urgent order. Work number '+names+'. Please check immediately.');
      utterance.lang='en-IN';utterance.rate=0.87;utterance.pitch=1;utterance.volume=1;
      window.speechSynthesis.speak(utterance);
    }catch(e){console.warn('Urgent voice announcement:',e);}
  };
  setTimeout(say,2200);
}
function scan(){
  bindFrame();
  try{
    const doc=frame.contentDocument;
    if(doc){for(const el of doc.querySelectorAll('select')){const id=(el.id+' '+el.name+' '+(el.closest('.field')?.textContent||'')).toLowerCase();if(id.includes('priority')&&!Array.from(el.options).some(o=>o.value.toUpperCase()==='URGENT'))el.add(new Option('URGENT','URGENT'));}}

    const w=frame.contentWindow;
    if(!w||!w.document||w.document.readyState!=='complete')return;
    const orders=w.eval('typeof state!=="undefined" && state && Array.isArray(state.pending) ? state.pending.map(r=>({id:String(r.workNo||r.id||""),priority:String(r.priority||r.urgency||""),archived:!!r.archived})) : null');
    if(!orders)return;
    if(!baseline){orders.forEach(r=>{if(r.id){seen.add(r.id);priorityById.set(r.id,r.priority.toUpperCase());}});baseline=true;return;}
    const newUrgent=[];
    for(const r of orders){
      if(!r.id)continue;
      const previous=priorityById.get(r.id);
      const urgent=/urgent/i.test(r.priority);
      if(!r.archived&&urgent&&(previous===undefined||!/urgent/i.test(previous)))newUrgent.push(r.id);
      seen.add(r.id);priorityById.set(r.id,r.priority.toUpperCase());
    }
    if(newUrgent.length){ring();announceUrgent(newUrgent);test.textContent='🚨 '+newUrgent.join(', ');setTimeout(()=>test.textContent='🔊 Test Siren',3500);}
  }catch(e){}
}
frame.addEventListener('load',()=>{baseline=false;seen.clear();priorityById.clear();setTimeout(scan,900)});
window.cfmUrgentSirenTest=()=>ring();
const test=document.createElement('button');
test.type='button';test.textContent='🔊 Test Siren';
test.style.cssText='position:fixed;right:12px;top:174px;z-index:2147483646;background:#9b1c1c;color:white;border:0;border-radius:10px;padding:9px 12px;font:700 13px Arial';
test.onclick=async()=>{test.textContent='🔊 Playing…';const ok=await ring();setTimeout(()=>{test.textContent=ok?'🔊 Test Siren':'⚠ Audio blocked'},2300)};
document.body.appendChild(test);
setInterval(scan,3000);setTimeout(scan,2000);
})();