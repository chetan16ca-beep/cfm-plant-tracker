/* CFM Corporate Blue | Theme A V344. Visual-only layer; original ERP functions and stock calculations are preserved. */
(function(){
'use strict';
const css=String.raw`
:root{--cfm-a-blue:#0862b4;--cfm-a-navy:#082e50;--cfm-a-teal:#009e99}
body.cfm-theme-a{background:linear-gradient(180deg,#eaf3fa 0,#f4f8fb 340px)!important;color:#16324d!important}
body.cfm-theme-a header.topbar,
body.cfm-theme-a .topbar{background:linear-gradient(108deg,#061f37,#083e61 72%,#075a67)!important;border-color:#1d7183!important;color:#fff!important;box-shadow:0 5px 16px #04243c36!important}
body.cfm-theme-a .topbar .brand p,
body.cfm-theme-a .topbar .brand h1{color:#e0f4fa!important}
body.cfm-theme-a .topbar button{border-radius:9px!important}
body.cfm-theme-a .app-version-badge{background:#08415d!important;color:#eaffff!important;border:1px solid #3e9f9c!important}
body.cfm-theme-a #view-dashboard{color:#123d5b!important}
body.cfm-theme-a #view-dashboard>.section-head h2{font-size:18px!important;color:#0a4169!important}
body.cfm-theme-a #cfmThemeAHero{display:flex;align-items:center;justify-content:space-between;gap:12px;
 min-height:60px;padding:10px 15px;margin:6px 0 9px;border-radius:13px;
 background:linear-gradient(110deg,#0a2b4d 0%,#0b527d 74%,#008e97 100%)!important;
 color:#fff;box-shadow:0 5px 16px #082e5030}
body.cfm-theme-a #cfmThemeAHero small{display:block;font:700 9px/1.3 system-ui;letter-spacing:.1em;color:#b3edf3}
body.cfm-theme-a #cfmThemeAHero strong{display:block;font:850 17px/1.25 system-ui;letter-spacing:-.01em}
body.cfm-theme-a #cfmThemeAHero span{font:700 10px/1.4 system-ui;color:#d4ecf4}
body.cfm-theme-a #cfmThemeAHero .cfm-a-symbol{display:grid;place-items:center;flex:0 0 40px;height:40px;
 border:1px solid #71ccc8;border-radius:11px;background:#ffffff17;font-size:23px}
body.cfm-theme-a #cfmThemeAStock{margin:0 0 9px;border:1px solid #b1d3e6;background:#fff;
 border-radius:13px;overflow:hidden;box-shadow:0 4px 12px #0d54851b}
body.cfm-theme-a #cfmThemeAStock>summary{display:block;padding:11px 13px;cursor:pointer;list-style:none}
body.cfm-theme-a #cfmThemeAStock>summary::-webkit-details-marker{display:none}
body.cfm-theme-a #cfmThemeAStock .cfm-a-stock-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;
 font:850 13px system-ui;color:#083755}
body.cfm-theme-a #cfmThemeAStock .cfm-a-stock-heading>span:last-child{font-size:11px;color:#08728b}
body.cfm-theme-a #cfmThemeAStock .cfm-a-stock-values{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:6px}
body.cfm-theme-a #cfmThemeAStock .cfm-a-stock-number{font:850 20px/1.15 system-ui;color:#0868ba;font-variant-numeric:tabular-nums}
body.cfm-theme-a #cfmThemeAStock .cfm-a-stock-meta{font:650 10px/1.4 system-ui;color:#517084}
body.cfm-theme-a #cfmThemeAStock .cfm-a-stock-meta .warn{color:#9f6200}
body.cfm-theme-a #cfmThemeAStock[open]>summary{border-bottom:1px solid #d7e6f0}
body.cfm-theme-a #cfmThemeAStock #cfmPhysicalStockDashboard{margin:0!important;padding:10px!important;border:0!important;box-shadow:none!important;border-radius:0!important}
body.cfm-theme-a #cfmThemeAKpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin:7px 0}
body.cfm-theme-a #cfmThemeAKpis button{display:flex;flex-direction:column;align-items:flex-start;gap:3px;
 min-width:0;min-height:64px;padding:9px;border:1px solid #c7dded;background:#fff;cursor:pointer;text-align:left;
 border-radius:11px;box-shadow:0 2px 7px #0b447414;color:#193d59}
body.cfm-theme-a #cfmThemeAKpis button:nth-child(1){border-top:3px solid #0579cb}
body.cfm-theme-a #cfmThemeAKpis button:nth-child(2){border-top:3px solid #00a395}
body.cfm-theme-a #cfmThemeAKpis button:nth-child(3){border-top:3px solid #c9912f}
body.cfm-theme-a #cfmThemeAKpis button:nth-child(4){border-top:3px solid #6964d6}
body.cfm-theme-a #cfmThemeAKpis span{font:650 10px/1.15 system-ui;color:#53718a}
body.cfm-theme-a #cfmThemeAKpis strong{font:850 20px/1.1 system-ui;letter-spacing:-.02em;color:#09395c;font-variant-numeric:tabular-nums}
body.cfm-theme-a #view-dashboard .cfm-mini-section{border-color:#c5dbe8!important;border-radius:11px!important}
body.cfm-theme-a #view-dashboard .cfm-mini-section>summary{color:#0c4872!important}
body.cfm-theme-a #view-dashboard .cfm-mini-section[open]>summary{background:#eff7fc!important}
body.cfm-theme-a #view-dashboard .module-command-card{border-color:#c6dceb!important}
body.cfm-theme-a #view-dashboard .module-command-card .m-ico{color:#0877b8!important}
body.cfm-theme-a #view-dashboard .cfm-main-action{border-color:#c3d9e8!important;background:#fff!important;color:#164466!important}
body.cfm-theme-a #view-dashboard .cfm-main-action.cfm-cutting-print-primary{background:#eaf5fd!important}
body.cfm-theme-a #cfmDeptSopMenu319{border-color:#bcd8e6!important}
body.cfm-theme-a #cfmDeptSopMenu319>summary{color:#12496d!important}
@media(min-width:761px){
 body.cfm-theme-a #nav{background:#092f4f!important}
 body.cfm-theme-a #nav button{color:#d5ecf5!important}
 body.cfm-theme-a #nav button.active{background:#0867a4!important;color:#fff!important}
}
@media(max-width:760px){
 body.cfm-theme-a #nav{position:fixed!important;top:auto!important;left:0!important;right:0!important;bottom:0!important;
  width:100%!important;height:64px!important;max-height:64px!important;min-height:64px!important;
  z-index:99!important;display:flex!important;flex-wrap:nowrap!important;overflow-x:auto!important;overflow-y:hidden!important;
  background:linear-gradient(110deg,#082744,#0a3b5d)!important;border-top:1px solid #4f9cbc!important;
  padding:3px 5px calc(3px + env(safe-area-inset-bottom,0px))!important;
  box-shadow:0 -4px 15px #0929452e!important}
 body.cfm-theme-a #nav button{flex:0 0 66px!important;min-width:66px!important;width:66px!important;color:#cce4ee!important}
 body.cfm-theme-a #nav button.active{background:#086fc0!important;color:#fff!important;border-radius:9px!important}
 body.cfm-theme-a #nav button .ico{color:inherit!important}
 body.cfm-theme-a main{padding-bottom:90px!important}
 body.cfm-theme-a #cfmThemeAKpis{grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}
 body.cfm-theme-a #cfmThemeAKpis button{padding:7px;min-height:60px}
 body.cfm-theme-a #cfmThemeAKpis strong{font-size:17px}
 body.cfm-theme-a #cfmThemeAKpis span{font-size:9px}
}
@media(max-width:375px){
 body.cfm-theme-a #cfmThemeAKpis{grid-template-columns:repeat(2,minmax(0,1fr))}
 body.cfm-theme-a #cfmThemeAKpis button{min-height:51px}
}
`;
const $=id=>document.getElementById(id);
const number=x=>Number.isFinite(Number(x))?Number(x):0;
const meters=x=>number(x).toLocaleString('en-IN',{minimumFractionDigits:0,maximumFractionDigits:2})+' m';
let stockObserver=null, observedPanel=null, queued=false;
function data(){
 try{return typeof state!=='undefined'&&state&&Array.isArray(state.store)?state:null}catch(e){return null}
}
function stock(){
 try{
  if(typeof physicalStockSummary==='function')return physicalStockSummary();
  if(typeof window.physicalStockSummary==='function')return window.physicalStockSummary();
 }catch(e){}
 return null;
}
function activateView(key){
 try{if(typeof showView==='function')showView(key)}catch(e){console.warn('Dashboard shortcut could not open',e)}
}
function make(tag,cls,label){
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(label!==undefined)el.textContent=label;
 return el;
}
function ensure(){
 const root=$('view-dashboard');
 if(!root)return null;
 if(!$('cfmThemeAHero')){
  const hero=make('div','','');
  hero.id='cfmThemeAHero';
  const left=make('div');left.append(make('small','','EAGLE FILTRATION • CFM ERP'),make('strong','','Plant Operations'),make('span','','Work Orders · Cutting · Store · Dispatch'));
  hero.append(left,make('div','cfm-a-symbol','▤'));
  root.prepend(hero);
 }
 let wrapper=$('cfmThemeAStock');
 const original=$('cfmPhysicalStockDashboard');
 if(!wrapper){
  wrapper=make('details');wrapper.id='cfmThemeAStock';
  const summary=make('summary');
  const title=make('div','cfm-a-stock-heading');
  title.append(make('span','','▣ Live Stock / Physical Stock'),make('span','','Details ▾'));
  const vals=make('div','cfm-a-stock-values');
  vals.append(make('strong','cfm-a-stock-number','Checking…'),make('span','cfm-a-stock-meta','Measured / Estimated • After Cutting'));
  summary.append(title,vals);
  wrapper.append(summary);
  const hero=$('cfmThemeAHero');
  if(hero)hero.after(wrapper);else root.prepend(wrapper);
 }
 if(original&&original.parentElement!==wrapper){
  wrapper.append(original);
 }
 if(!$('cfmThemeAKpis')){
  const kpis=make('div');kpis.id='cfmThemeAKpis';
  const specs=[['Work Orders','pending'],['Cutting Entries','cutting'],['Store SRL','store'],['Open Pending','pending']];
  specs.forEach(([label,key],i)=>{
   const b=make('button');b.type='button';b.title='Open '+label;
   b.append(make('span','',label),make('strong','', '—'));
   b.addEventListener('click',()=>activateView(key));kpis.append(b);
  });
  wrapper.after(kpis);
 }
 return root;
}
function refresh(){
 const holder=$('cfmThemeAStock'),kpis=$('cfmThemeAKpis');
 if(!holder)return;
 const d=stock(),n=holder.querySelector('.cfm-a-stock-number'),m=holder.querySelector('.cfm-a-stock-meta');
 if(n&&m){
  if(d&&Array.isArray(d.measured)&&Array.isArray(d.estimated)){
   const counted=d.measured.length,estimated=d.estimated.length;
   n.textContent=(counted+estimated)?meters(d.total):'Verification pending';
   m.textContent='Measured '+(counted?meters(d.real):'unverified')+' · Estimated '+(estimated?meters(d.provisional):'none')+
    (d.short?.length?' · '+d.short.length+' shortage alert(s)':'');
   m.classList.toggle('warn',estimated>0||!!d.short?.length);
  }else{n.textContent='Awaiting ERP stock';m.textContent='Connect Cloud / Check physical SRL balance';}
 }
 const s=data();
 if(kpis&&s){
  let op='—';
  try{if(typeof orderOpen==='function')op=s.pending.filter(orderOpen).length}catch(e){}
  const vals=[s.pending.length,s.cutting.length,s.store.length,op];
  [...kpis.querySelectorAll('button strong')].forEach((e,i)=>e.textContent=String(vals[i]));
 }
}
function watchStock(){
 const panel=$('cfmPhysicalStockDashboard');
 if(!panel||panel===observedPanel)return;
 if(stockObserver)stockObserver.disconnect();
 observedPanel=panel;
 stockObserver=new MutationObserver(schedule);
 stockObserver.observe(panel,{childList:true,subtree:false});
 schedule();
}
function schedule(){
 if(queued)return;
 queued=true;
 requestAnimationFrame(()=>{queued=false;ensure();watchStock();refresh()});
}
function init(){
 if(!$('view-dashboard'))return;
 document.body.classList.add('cfm-theme-a');
 if(!$('cfm-theme-a-css')){
  const style=make('style');style.id='cfm-theme-a-css';style.textContent=css;
  document.head.append(style);
 }
 ensure();watchStock();refresh();
 const root=$('view-dashboard');
 // Observe only direct dashboard additions, never state or item mutations.
 new MutationObserver(schedule).observe(root,{childList:true,subtree:false});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();