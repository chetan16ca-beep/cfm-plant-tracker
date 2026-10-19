/* CFM urgent new-order siren only. Does not change ERP data. */
(()=>{'use strict';
const frame=document.getElementById('app');
let audio=null,ready=false,baseline=false;
const seen=new Set();
const priorityById=new Map();
let lastSnapshot='';
function unlock(){
  try{
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return;
    if(!audio)audio=new AC();
    audio.resume().then(()=>{ready=true;}).catch(()=>{});
  }catch(e){}
}
document.addEventListener('pointerdown',unlock,{capture:true});
function bindFrame(){
  try{
    const doc=frame.contentDocument;
    if(!doc||doc.__cfmUrgentSirenBound)return;
    doc.__cfmUrgentSirenBound=true;
    doc.addEventListener('pointerdown',unlock,{capture:true});
  }catch(e){}
}
function ring(){
  unlock();
  if(!audio||audio.state!=='running')return;
  for(let k=0;k<3;k++){
    const t=audio.currentTime+k*.47;
    const o=audio.createOscillator(),g=audio.createGain();
    o.type='square';o.frequency.setValueAtTime(750,t);
    o.frequency.setValueAtTime(1050,t+.20);
    g.gain.setValueAtTime(.0001,t);
    g.gain.exponentialRampToValueAtTime(.16,t+.025);
    g.gain.exponentialRampToValueAtTime(.0001,t+.40);
    o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+.41);
  }
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
    let newUrgent=false;
    for(const r of orders){
      if(!r.id)continue;
      const previous=priorityById.get(r.id);
      const urgent=/urgent/i.test(r.priority);
      if(!r.archived&&urgent&&(previous===undefined||!/urgent/i.test(previous)))newUrgent=true;
      seen.add(r.id);priorityById.set(r.id,r.priority.toUpperCase());
    }
    if(newUrgent)ring();
  }catch(e){}
}
frame.addEventListener('load',()=>{baseline=false;seen.clear();priorityById.clear();setTimeout(scan,900)});
window.cfmUrgentSirenTest=()=>{unlock();setTimeout(ring,250)};
const test=document.createElement('button');
test.type='button';test.textContent='🔊 Test Siren';
test.style.cssText='position:fixed;right:12px;top:174px;z-index:2147483646;background:#9b1c1c;color:white;border:0;border-radius:10px;padding:9px 12px;font:700 13px Arial';
test.onclick=()=>{unlock();setTimeout(ring,150)};
document.body.appendChild(test);
setInterval(scan,3000);setTimeout(scan,2000);
})();