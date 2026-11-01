/* CFM V250 — PC dashboard focus; presentation only, never mutates ERP records. */
(function(){
  'use strict';
  const ID='cfmPcDashboardMore250';
  function setup(){
    const view=document.getElementById('view-dashboard');
    if(!view||document.getElementById(ID))return;
    view.classList.add('cfm-pc-dashboard-focus');
    const head=view.querySelector(':scope > .section-head');
    if(!head)return;
    const button=document.createElement('button');
    button.type='button';
    button.id=ID;
    button.className='btn cfm-pc-more-toggle';
    button.setAttribute('aria-controls','view-dashboard');
    button.setAttribute('aria-expanded','false');
    button.textContent='☷ More Tools';
    button.title='Expand all dashboard modules and reports';
    button.addEventListener('click',function(){
      const expanded=view.classList.toggle('cfm-pc-dashboard-expanded');
      button.setAttribute('aria-expanded',String(expanded));
      button.textContent=expanded?'▴ Compact View':'☷ More Tools';
      button.title=expanded?'Return to compact PC dashboard':'Show all dashboard modules and reports';
    });
    head.appendChild(button);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
})();
