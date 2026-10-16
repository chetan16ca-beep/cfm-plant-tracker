(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;':'&quot;'}[c]));
const panel=$('cfmAllOrdersPanel'),btn=$('cfmAllOrdersBtn');
if(!panel||!btn)return;
$('cfmAllOrdersClose').onclick=()=>panel.style.display='none';
btn.onclick=()=>{panel.style.display='block';render()};
$('cfmAllOrdersInput').oninput=render;
function render(){
const out=$('cfmAllOrdersList'),status=$('cfmAllOrdersStatus');let db;
try{db=JSON.parse($('app').contentWindow.localStorage.getItem('cfm-plant-tracker-data-v1')||'{}')}
catch(e){status.textContent='Unable to read saved data: '+e.message;return}
const records=new Map();
for(const [source,items] of [['pending',db.pending],['cutting',db.cutting],['issueRegister',db.issueRegister]]){
if(!Array.isArray(items))continue;
for(const item of items){
const no=String(item.workNo||item.workOrder||item.wo||'').trim();if(!no)continue;
const key=no.toUpperCase();
if(!records.has(key))records.set(key,{no,party:'',description:'',pending:null,cutting:0,issue:0});
const r=records.get(key);r.party=r.party||item.party||item.partyName||'';r.description=r.description||item.description||item.item||'';
if(source==='pending')r.pending=item;
if(source==='cutting')r.cutting++;
if(source==='issueRegister')r.issue++;
}
}
const q=$('cfmAllOrdersInput').value.trim().toLowerCase();
const found=[...records.values()].filter(r=>(r.no+' '+r.party+' '+r.description).toLowerCase().includes(q)).sort((a,b)=>b.no.localeCompare(a.no,undefined,{numeric:true}));
status.textContent=records.size+' unique work numbers found · '+found.length+' matches · no data changed';
out.innerHTML='';
for(const r of found.slice(0,350)){
const card=document.createElement('div');card.style.cssText='padding:12px 0;border-bottom:1px solid #ddd';
card.innerHTML='<b>'+esc(r.no)+'</b> — '+esc(r.party)+'<div>'+esc(r.description)+'</div><small>'+(r.pending?'Pending saved':'History only')+' · Cutting: '+r.cutting+' · Issue: '+r.issue+'</small><div></div>';
const actions=card.lastElementChild;
function action(label,view,field){
const b=document.createElement('button');b.textContent=label;b.style.cssText='padding:8px;margin:6px 6px 0 0;border:1px solid #aaa;border-radius:7px';
b.onclick=()=>{try{
const w=$('app').contentWindow;if(typeof w.showView!=='function')throw Error('Module not ready');
w.showView(view);const input=w.document.getElementById(field);
if(input){input.value=r.no;input.dispatchEvent(new w.Event('input',{bubbles:true}))}
if(view==='pending'){const sel=w.document.getElementById('pendingStatus');if(sel){sel.value='ALL';if(typeof w.renderPending==='function')w.renderPending()}}
panel.style.display='none';
}catch(e){alert('Cannot open: '+e.message)}};
actions.appendChild(b);
}
action('View Cutting','cutting','cutSearch');
if(r.pending)action('View Order','pending','pendingSearch');
action('View Documents','docs','docSearch');
out.appendChild(card);
}
}
})();