/* CFM Forge UI 213: custom, distinct plant-control deck presentation.
 * Only UI text, styles and shortcuts. Does not read, save, merge or modify ERP data.
 */
(function(){
'use strict';
const paths=[
 {i:'01',label:'Orders',hint:'Intake & planning',view:'pending'},
 {i:'02',label:'Material',hint:'SRL & cloth rolls',view:'store'},
 {i:'03',label:'Production',hint:'Department activity',view:'deptwork'},
 {i:'04',label:'Dispatch',hint:'Ready items',view:'readydispatch'}
];
function navigate(view){
 const target=document.getElementById('view-'+view);
 if(!target){alert('This module is not available in the current ERP build.');return}
 if(typeof window.showView==='function')window.showView(view);
 else target.querySelector('button')?.focus();
}
function buildDeck(){
 document.body.classList.add('cfm-forge');
 const dash=document.getElementById('cfmSapWorkspace');
 if(!dash)return;
 const intro=dash.querySelector('.sap-intro');
 if(intro&&!intro.dataset.forge){
  intro.dataset.forge='1';
  const kicker=intro.querySelector('.sap-kicker');
  if(kicker)kicker.textContent='CFM / PRECISION FILTRATION OPERATIONS';
  const h=intro.querySelector('h1');
  if(h)h.textContent='Your Plant. One Control Deck.';
  const p=intro.querySelector('p');
  if(p)p.textContent='Work Orders → Material → Production → Dispatch';
  const content=intro.querySelector('div');
  if(content&&!content.querySelector('.cfm-forge-signature')){
   const stamp=document.createElement('div');stamp.className='cfm-forge-signature';
   stamp.textContent='CFM FORGE  /  OPERATIONS INTERFACE';
   content.appendChild(stamp);
  }
 }
 if(!dash.querySelector('.cfm-forge-ribbon')){
  const ribbon=document.createElement('nav');ribbon.className='cfm-forge-ribbon';
  ribbon.setAttribute('aria-label','Production flow shortcuts');
  for(const item of paths){
   const b=document.createElement('button');b.type='button';
   b.title='Open '+item.label+' module';b.setAttribute('data-forge-view',item.view);
   const n=document.createElement('span');n.className='flow-no';n.textContent=item.i;
   const copy=document.createElement('span');copy.className='flow-copy';
   const title=document.createElement('strong');title.textContent=item.label;
   const hint=document.createElement('small');hint.textContent=item.hint;
   copy.append(title,hint);b.append(n,copy);
   b.addEventListener('click',()=>navigate(item.view));ribbon.append(b);
  }
  intro?.after(ribbon);
 }
}
function decorateOrderJourney(){
 const dialog=document.getElementById('editDialog');
 if(!dialog?.open||!dialog.classList.contains('cfm-wo-dialog'))return;
 const sections=dialog.querySelector('.cfm-wo-sections');
 if(!sections||dialog.querySelector('.cfm-forge-journey'))return;
 const stages=[...sections.querySelectorAll('.cfm-wo-group')];
 if(!stages.length)return;
 const track=document.createElement('nav');track.className='cfm-forge-journey';
 track.setAttribute('aria-label','Work Order form section shortcuts');
 for(const stage of stages){
  const h=stage.querySelector('h4');if(!h)continue;
  const b=document.createElement('button');b.type='button';
  b.textContent=h.textContent;
  b.addEventListener('click',()=>stage.scrollIntoView({block:'nearest',behavior:'smooth'}));
  track.append(b);
 }
 if(track.childElementCount)sections.before(track);
}
function apply(){buildDeck();decorateOrderJourney()}
function init(){
 apply();
 const target=document.getElementById('editDialog');
 if(target){
  let scheduled=false;
  const queue=()=>{if(scheduled)return;scheduled=true;Promise.resolve().then(()=>{scheduled=false;decorateOrderJourney()})};
  new MutationObserver(records=>{
   if(records.some(r=>r.type==='childList'||r.type==='attributes'))queue();
  }).observe(target,{subtree:true,childList:true,attributes:true,attributeFilter:['class','open']});
 }
 const dash=document.getElementById('view-dashboard');
 if(dash){const obs=new MutationObserver(()=>{if(document.getElementById('cfmSapWorkspace')){apply();obs.disconnect()}});obs.observe(dash,{childList:true,subtree:true})}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();