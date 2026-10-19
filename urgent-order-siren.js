/* CFM urgent new-order siren only. Does not change ERP data. */
(()=>{'use strict';
const frame=document.getElementById('app');
let audio=null,ready=false,baseline=false;
const seen=new Set();
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
    const w=frame.contentWindow;
    if(!w||!w.document||w.document.readyState!=='complete')return;
    const orders=w.eval('typeof state!=="undefined" && state && Array.isArray(state.pending) ? state.pending.map(r=>({id:String(r.workNo||r.id||""),priority:String(r.priority||r.urgency||""),archived:!!r.archived})) : null');
    if(!orders)return;
    if(!baseline){orders.forEach(r=>{if(r.id)seen.add(r.id)});baseline=true;return;}
    let newUrgent=false;
    for(const r of orders){
      if(!r.id||seen.has(r.id))continue;
      seen.add(r.id);
      if(!r.archived&&/urgent/i.test(r.priority))newUrgent=true;
    }
    if(newUrgent)ring();
  }catch(e){}
}
frame.addEventListener('load',()=>{baseline=false;seen.clear();setTimeout(scan,900)});
setInterval(scan,3000);setTimeout(scan,2000);
})();