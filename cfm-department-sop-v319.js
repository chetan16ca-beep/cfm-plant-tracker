/* CFM department-specific SOP launcher V319; presentation-only.
   Original V318 records, cloud sync, checklist rules and print hooks unchanged. */
(function(){
'use strict';
const CATS=[
 {title:'Cleaning',icon:'🧹',items:[['MCL','Machine Cleaning'],['PCL','Plant Cleaning'],['ECL','Electrical Machine Cleaning'],['RCL','Packing Room Cleaning']]},
 {title:'Material',icon:'📦',items:[['MR','Material Receiving / QC'],['SRL','Roll Tag & Store']]},
 {title:'Cutting',icon:'✂️',items:[['CUT','Cutting']]},
 {title:'Stitching',icon:'🧵',items:[['STI','Stitching']]},
 {title:'Thread Cutting',icon:'🪡',items:[['THR','Thread Cutting']]},
 {title:'Gun Finishing',icon:'🔧',items:[['GUN','Gun Finishing']]},
 {title:'Final QC',icon:'🔎',items:[['FQC','Final Quality Checking']]},
 {title:'Packing',icon:'📦',items:[['PKG','Packing & Labeling']]},
 {title:'Dispatch',icon:'🚚',items:[['DSP','Dispatch']]},
 {title:'Report Verification',icon:'📋',items:[['RPT','Batch Report Check']]}
];
const $=id=>document.getElementById(id);
const sop=id=>'SOP-CFM-'+id;
const btnStyle='padding:11px 12px;min-height:48px;background:white;border:1px solid #b6d8ea;border-radius:9px;color:#165478;text-align:left;font:700 13px/1.35 system-ui;cursor:pointer';
const closeChooser=()=>$('cfmDeptSopChooser319')?.remove();
function specific(code,work){
 closeChooser();
 if(typeof window.cfmSopOpen!=='function'){alert('SOP register is loading. Refresh ERP safely.');return}
 window.cfmSopOpen(work||'');
 const modal=$('cfmSopModalV318');
 const picker=$('cfmSopCode318');
 if(!modal||!picker){alert('SOP checklist could not open. Please refresh ERP.');return}
 picker.value=code;
 picker.dispatchEvent(new Event('change',{bubbles:true}));
 const label=picker.closest('label');if(label)label.style.display='none';
 const item=CATS.flatMap(group=>group.items).find(item=>item[0]===code);
 const title=modal.querySelector('h2');
 if(title)title.textContent=sop(code)+' • '+(item?.[1]||'Department Checklist');
 const parent=modal.querySelector('#cfmSopChecks318');
 if(parent)parent.setAttribute('aria-label',sop(code)+' numbered checks');
}
function choose(work,group){
 closeChooser();
 const overlay=document.createElement('div');overlay.id='cfmDeptSopChooser319';
 overlay.style.cssText='position:fixed;inset:0;z-index:2147483610;display:grid;place-items:center;padding:10px;background:#062f47bb';
 const shell=document.createElement('section');shell.style.cssText='width:min(700px,100%);max-height:93vh;overflow:auto;box-sizing:border-box;background:#fff;padding:14px;border-radius:13px;font:13px/1.45 system-ui;color:#143f5e';
 const header=document.createElement('div');header.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:10px';
 const h=document.createElement('h2');h.textContent=group?group.title+' SOP':'Choose Department SOP';h.style.cssText='font:800 18px system-ui;margin:0';
 const x=document.createElement('button');x.type='button';x.textContent='✕ Close';x.style.cssText=btnStyle;x.onclick=closeChooser;
 header.append(h,x);shell.append(header);
 const detail=document.createElement('p');detail.textContent=(work?'Work No. '+work+' • ':'')+(group?'Only '+group.title+' checklists are shown.':'Select one department first.');shell.append(detail);
 const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:9px';
 if(group){
  group.items.forEach(([code,label])=>{
   const b=document.createElement('button');b.type='button';b.style.cssText=btnStyle;b.textContent=sop(code)+' • '+label;b.onclick=()=>specific(code,work);grid.append(b);
  });
 }else{
  CATS.forEach(g=>{
   const b=document.createElement('button');b.type='button';b.style.cssText=btnStyle;b.textContent=g.icon+' '+g.title;
   b.onclick=()=>g.items.length===1?specific(g.items[0][0],work):choose(work,g);grid.append(b);
  });
 }
 shell.append(grid);
 if(group){
  const back=document.createElement('button');back.type='button';back.textContent='← All Departments';back.style.cssText=btnStyle+';margin-top:10px';back.onclick=()=>choose(work);shell.append(back);
 }
 overlay.append(shell);document.body.append(overlay);
 overlay.addEventListener('click',e=>{if(e.target===overlay)closeChooser()});
}
function mount(){
 const dash=$('view-dashboard');
 if(dash&&!$('cfmDeptSopMenu319')){
  const root=document.createElement('section');root.id='cfmDeptSopMenu319';
  root.style.cssText='margin:10px 0;padding:12px;background:#f7fbff;border:1px solid #c4e1f1;border-radius:12px';
  const h=document.createElement('h3');h.textContent='Department-wise SOP / Checklists';h.style.cssText='font:800 16px system-ui;color:#135176;margin:0 0 5px';
  const p=document.createElement('p');p.textContent='Cleaning, Material और Production अलग-अलग खोलें। हर page में सिर्फ उसी SOP के numbered points आएँगे।';p.style.cssText='font:12px/1.4 system-ui;color:#4c7088;margin:0 0 9px';
  const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:7px';
  CATS.forEach(g=>{
   const b=document.createElement('button');b.type='button';b.textContent=g.icon+' '+g.title;b.style.cssText=btnStyle+';text-align:center';
   b.onclick=()=>g.items.length===1?specific(g.items[0][0],''):choose('',g);grid.append(b);
  });
  root.append(h,p,grid);dash.insertBefore(root,dash.firstChild);
 }
 const legacy=$('cfmSopOpen318');if(legacy)legacy.style.setProperty('display','none','important');
 document.querySelectorAll('#pendingList .data-card').forEach(card=>{
   const original=card.querySelector('[data-cfm-sop]');
   if(original)original.style.setProperty('display','none','important');
   if(card.querySelector('[data-cfm-dept-sop]'))return;
   const work=(card.querySelector('.work')?.textContent||'').trim();
   if(!/^CFM-\d+$/i.test(work))return;
   const b=document.createElement('button');b.type='button';b.className='btn btn-sm';b.dataset.cfmDeptSop='1';
   b.textContent='☑ Department SOP';b.onclick=()=>choose(work);
   (card.querySelector('.card-actions')||card).append(b);
 });
}
let scheduled=false;
const observe=new MutationObserver(()=>{
 if(scheduled)return;scheduled=true;
 setTimeout(()=>{scheduled=false;mount()},300);
});
observe.observe(document.documentElement,{childList:true,subtree:true});
setTimeout(mount,450);setTimeout(mount,1600);
window.cfmOpenDepartmentSop=(code,work)=>specific(String(code||'').toUpperCase(),work||'');
})();
