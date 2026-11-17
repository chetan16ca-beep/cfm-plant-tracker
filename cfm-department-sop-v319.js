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
 {title:'Packing',icon:'📦',items:[['PKG','Packing']]},
 {title:'Label',icon:'🏷️',items:[['LBL','Individual Bag Label Verification']]},
 {title:'Dispatch',icon:'🚚',items:[['DSP','Dispatch']]},
 {title:'Report Verification',icon:'📋',items:[['RPT','Batch Report Check']]}
];
// Only the six manufacturing stages belong to the Work Order SOP launcher.
// The dashboard retains all other independent department SOP checklists.
const WO_SOP_CODES=new Set(['CUT','STI','THR','GUN','PKG','LBL']);
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
 const h=document.createElement('h2');h.textContent=group?group.title+' SOP':work?'Work Order SOP / Checklist':'Choose Department SOP';h.style.cssText='font:800 18px system-ui;margin:0';
 const x=document.createElement('button');x.type='button';x.textContent='✕ Close';x.style.cssText=btnStyle;x.onclick=closeChooser;
 header.append(h,x);shell.append(header);
 const detail=document.createElement('p');detail.textContent=(work?'Work No. '+work+' • ':'')+(group?'Only '+group.title+' checklists are shown.':work?'Only Cutting, Stitching, Thread Cutting, Gun Finishing, Packing and Label checklists belong to this Work Order.':'Select one department first.');shell.append(detail);
 const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:9px';
 if(group){
  group.items.forEach(([code,label])=>{
   const b=document.createElement('button');b.type='button';b.style.cssText=btnStyle;b.textContent=sop(code)+' • '+label;b.onclick=()=>specific(code,work);grid.append(b);
  });
 }else{
  CATS.forEach(g=>g.items.forEach(([code,label])=>{
   if(work&&!WO_SOP_CODES.has(code))return;
   const button=document.createElement('button');button.type='button';button.style.cssText=btnStyle;
   button.textContent=g.icon+' '+sop(code)+' • '+label;
   button.onclick=()=>specific(code,work);grid.append(button);
  }));
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
  // Compact by default: keep every SOP/checklist and print action available on tap.
  const root=document.createElement('details');root.id='cfmDeptSopMenu319';
  root.style.cssText='margin:6px 0;padding:0;background:#f7fbff;border:1px solid #c4e1f1;border-radius:10px;overflow:hidden';
  const summary=document.createElement('summary');
  summary.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;list-style:none;padding:10px 12px;min-height:42px;color:#135176;font:800 13px system-ui';
  const heading=document.createElement('span');heading.textContent='☑ SOP & Department Checklists';
  const hint=document.createElement('span');hint.textContent='15 SOPs ▾';hint.style.cssText='white-space:nowrap;color:#50768a;font:700 11px system-ui';
  summary.append(heading,hint);
  root.addEventListener('toggle',()=>{hint.textContent=root.open?'Close ▴':'15 SOPs ▾'});
  const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;padding:8px;border-top:1px solid #d8e7ef';
  CATS.forEach(g=>g.items.forEach(([code,label])=>{
   const button=document.createElement('button');button.type='button';
   button.textContent=g.icon+' '+code+' · '+label;
   button.title=sop(code)+' • '+label;
   button.style.cssText='padding:7px 6px;min-height:39px;background:white;border:1px solid #bbd8e7;border-radius:8px;color:#165478;text-align:left;font:700 11px/1.25 system-ui;cursor:pointer;overflow-wrap:anywhere';
   button.onclick=()=>specific(code,'');grid.append(button);
  }));
  root.append(summary,grid);dash.insertBefore(root,dash.firstChild);
 }
 const legacy=$('cfmSopOpen318');if(legacy)legacy.style.setProperty('display','none','important');
 document.querySelectorAll('#pendingList .data-card').forEach(card=>{
   const original=card.querySelector('[data-cfm-sop]');
   if(original)original.style.setProperty('display','none','important');
   if(card.querySelector('[data-cfm-dept-sop]'))return;
   const work=(card.querySelector('.work')?.textContent||'').trim();
   if(!/^CFM-\d+$/i.test(work))return;
   const b=document.createElement('button');b.type='button';b.className='btn btn-sm';b.dataset.cfmDeptSop='1';
   b.textContent='☑ Work Order SOP';b.onclick=()=>choose(work);
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
