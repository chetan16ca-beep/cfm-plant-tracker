/* CFM V254 - Unique Measurement Master Print.
   Read-only grouping; never deletes original measurement records or writes ERP/Cloud. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const norm = (value) => String(value == null ? '' : value).normalize('NFKC')
    .replace(/\s+/g, ' ').trim().toUpperCase();
  const isPlaceholder = (value) => {
    const s = norm(value);
    return !s || s === '-' || s === 'N/A' || s === 'NA' ||
      s.includes('MEASUREMENT REQUIRED') || s.includes('NO PREVIOUS MEASUREMENT') ||
      s === 'PENDING' || s === 'NOT AVAILABLE' || s === 'NOT GIVEN' ||
      s === 'TBD' || s === 'NEW PRODUCT';
  };
  const bestMeasurement = (r) => {
    const options = [r?.finalMeasurement, r?.measurement3, r?.measurement2,
      r?.measurement1, r?.previousMeasurement];
    return String(options.find(v=>!isPlaceholder(v)) || '').trim();
  };
  const specKey = (v) => norm(v)
    .replace(/(\d)\s*[×xX*]\s*(\d)/g,'$1 X $2')
    .replace(/\s*([:;,|])\s*/g,'$1 ')
    .replace(/\s+/g,' ').trim();
  const encode = (s) => String(s == null ? '' : s).replace(/[&<>"']/g,x=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[x]));
  const stateRows = () => {
    try { return typeof state !== 'undefined' && Array.isArray(state.measurements)
      ? state.measurements : []; } catch (_) { return []; }
  };
  function summarize(input, productWise = false) {
    const records = Array.isArray(input) ? input : [];
    const groups = new Map();
    let excluded=0, valid=0;
    for (const r of records) {
      const measurement=bestMeasurement(r);
      if (!measurement) { excluded++;continue; }
      valid++;
      const identity = productWise
        ? norm(r?.description || r?.oldProductName || r?.eagleCode || r?.party || 'UNKNOWN') + '|'
          + specKey(measurement)
        : specKey(measurement);
      if (!groups.has(identity)) groups.set(identity,{
        measurement, occurrences:0, codes:new Set(), parties:new Set(),
        products:new Set(), workNos:new Set(), cloths:new Set(), widths:new Set()
      });
      const g=groups.get(identity);g.occurrences++;
      if (r?.eagleCode) g.codes.add(String(r.eagleCode).trim());
      if (r?.party) g.parties.add(String(r.party).trim());
      if (r?.description) g.products.add(String(r.description).trim());
      if (r?.workNo) g.workNos.add(String(r.workNo).trim());
      if (r?.standardCloth) g.cloths.add(String(r.standardCloth).trim());
      if (r?.stdWidth) g.widths.add(String(r.stdWidth).trim());
    }
    const list=[...groups.values()].sort((a,b)=>a.measurement.localeCompare(b.measurement,undefined,{
      numeric:true,sensitivity:'base'
    }));
    return {
      rows:records.length, valid, excluded, unique:list.length,
      duplicates:valid-list.length, list, productWise
    };
  }
  function getCurrent(filtered) {
    const rows=stateRows();
    if (!filtered) return rows;
    const search=String($('measurementSearch')?.value || '').trim().toLowerCase();
    return search?rows.filter(r=>JSON.stringify(r).toLowerCase().includes(search)):rows;
  }
  function refsFrom(set, max) {
    const items=[...set];
    return items.slice(0,max).map(encode).join(', ')+
      (items.length>max?' (+'+(items.length-max)+' more)':'');
  }
  function getReportHtml(summary) {
    const today = new Date().toLocaleDateString('en-IN');
    const mode = summary.productWise?'Product-wise Unique':'Unique Measurement Specifications';
    const rows=summary.list.map((g,i)=> {
      const codes=refsFrom(g.codes,9);
      const products=refsFrom(g.products,3);
      const works=refsFrom(g.workNos,8);
      const cloth=refsFrom(g.cloths,5);
      return '<tr><td class="num">'+(i+1)+'</td>'+
        '<td class="meas">'+encode(g.measurement)+'</td>'+
        '<td><strong>'+ (codes||'—') +'</strong>'+
        (products?'<div>'+products+'</div>':'')+
        (works?'<small>WO: '+works+'</small>':'')+
        (cloth?'<small>Cloth: '+cloth+'</small>':'')+
        '</td><td class="num">'+g.occurrences+'</td></tr>';
    }).join('');
    return '<!doctype html><html lang="en"><head><meta charset="utf-8">'+
      '<meta name="viewport" content="width=device-width,initial-scale=1">'+
      '<title>CFM '+encode(mode)+' Print</title>'+
      '<style>@page{size:A4 landscape;margin:11mm}*{box-sizing:border-box}body{font:11px/1.4 Arial,sans-serif;color:#182333;margin:0}h1{font-size:17px;margin:0 0 4px}'+
      '.sub{color:#47647a;margin:0 0 7px}.stats{font-size:11px;padding:7px 0;margin:4px 0 10px;border-top:1px solid #cedae2;border-bottom:1px solid #cedae2}'+
      'table{border-collapse:collapse;width:100%;table-layout:fixed}th,td{border:1px solid #bac9d4;padding:6px 7px;vertical-align:top;overflow-wrap:anywhere}th{background:#e8f3fa;text-align:left}'+
      'th:nth-child(1),td:nth-child(1){width:5%}th:nth-child(2),td:nth-child(2){width:35%}th:nth-child(3),td:nth-child(3){width:52%}th:nth-child(4),td:nth-child(4){width:8%}'+
      '.meas{font-weight:700;font-size:12px;white-space:pre-wrap}.num{text-align:center;white-space:nowrap}small{display:block;color:#567;line-height:1.35;margin-top:3px}'+
      'tr{break-inside:avoid;page-break-inside:avoid}thead{display:table-header-group}.note{font-size:10px;margin-top:8px;color:#567}'+
      '.toolbar{display:flex;justify-content:space-between;align-items:center;padding:9px;margin:0 0 12px;background:#edf5fc}button{padding:8px 13px;background:#176fb4;border:0;color:white;border-radius:6px;font-weight:700}'+
      '@media print{.toolbar{display:none!important}}</style></head><body>'+
      '<div class="toolbar"><b>Preview • '+summary.unique+' unique entries</b><button onclick="window.print()">🖨 Print / Save as PDF</button></div>'+
      '<h1>EAGLE FILTRATION — CFM Cutting Measurement Master</h1>'+
      '<p class="sub">'+encode(mode)+' • '+encode(today)+' • A4 Landscape</p>'+
      '<div class="stats"><b>Total records:</b> '+summary.rows+
      ' &nbsp; | &nbsp; <b>Valid measurements:</b> '+summary.valid+
      ' &nbsp; | &nbsp; <b>Unique print rows:</b> '+summary.unique+
      ' &nbsp; | &nbsp; <b>Duplicates grouped:</b> '+summary.duplicates+
      ' &nbsp; | &nbsp; <b>Blank / Pending excluded:</b> '+summary.excluded+'</div>'+
      '<table><thead><tr><th>Sr</th><th>Measurement / Cutting Details</th><th>Eagle Code / Product Reference</th><th>Master Rows</th></tr></thead>'+
      '<tbody>'+ (rows||'<tr><td colspan="4">No verified measurements to print.</td></tr>') +
      '</tbody></table><p class="note">Repeated identical measurement text is grouped; original ERP master is unchanged. '+ 
      'Different product references can share one measurement; verify product, pattern and cloth before production. '+ 
      'This is a read-only report, not a manufacturing approval.</p>'+
      '</body></html>';
  }
  function selectedMode() { return $('cfmUniquePerProduct')?.checked === true; }
  function draw() {
    const root=$('cfmUniqueMeasurementTools');
    if (!root) return;
    const filtered=getCurrent(true);
    const a=summarize(filtered,selectedMode());
    const line=$('cfmUniqueStats');
    if (line) line.textContent=
      filtered.length+' Master Rows | '+a.unique+' Unique Measurements | '+
      a.duplicates+' Duplicates Grouped | '+a.excluded+' Blank/Pending Excluded'+
      (($('measurementSearch')?.value||'').trim()?' | Search filter ON':'');
    return a;
  }
  function print(filtered=true) {
    const summary=summarize(getCurrent(filtered),selectedMode());
    if (!summary.unique) { alert('No valid measurements found for printing. Check Measurement Master or clear Search.');return false; }
    const w=window.open('','_blank');
    if (!w) { alert('Print preview blocked. Allow pop-ups for the CFM ERP and retry.');return false; }
    w.document.open();w.document.write(getReportHtml(summary));w.document.close();
    w.focus();
    return true;
  }
  function mount() {
    const page=$('view-measurements');
    if (!page || $('cfmUniqueMeasurementTools')) return;
    const bar=document.createElement('section');
    bar.id='cfmUniqueMeasurementTools';
    bar.style.cssText='margin:12px 2px;padding:12px;background:#f0faff;border:1px solid #b8daee;border-radius:11px;color:#153c58;font:13px/1.5 system-ui';
    const title=document.createElement('strong');title.textContent='🖨 Unique Measurements — Print Without Duplicates';
    title.style.cssText='display:block;font-size:15px;margin-bottom:5px';bar.append(title);
    const explanation=document.createElement('p');
    explanation.style.cssText='margin:2px 0 9px';
    explanation.textContent='Same measurement prints once; all original master entries remain unchanged. The current Search filter is respected.';
    bar.append(explanation);
    const label=document.createElement('label');label.style.cssText='display:flex;gap:7px;align-items:center;margin:5px 0 9px;font-weight:700';
    const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.id='cfmUniquePerProduct';
    checkbox.addEventListener('change',draw);
    label.append(checkbox,document.createTextNode('Product-wise grouping (keep same measurement separate for different products)'));
    bar.append(label);
    const stats=document.createElement('p');stats.id='cfmUniqueStats';stats.setAttribute('role','status');
    stats.style.cssText='font-weight:800;color:#175e85;margin:7px 0';bar.append(stats);
    const actions=document.createElement('div');actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap';
    for(const [labelText,filtered] of [['🖨 Print Unique (Search Results)',true],['🖨 Print All Unique',false]]) {
      const btn=document.createElement('button');btn.type='button';btn.textContent=labelText;
      btn.className='btn btn-primary';btn.style.cssText='font-size:12px;min-height:38px';
      btn.addEventListener('click',()=>print(filtered));actions.append(btn);
    }
    bar.append(actions);
    const search=$('measurementSearch');
    if (search) search.addEventListener('input',draw);
    const anchor=page.querySelector('.filters')||page.querySelector('.section-head');
    if(anchor)anchor.insertAdjacentElement('afterend',bar);else page.prepend(bar);
    draw();
  }
  window.CFM_UNIQUE_MEASUREMENTS={summarize,bestMeasurement,specKey,print,draw};
  function ready(){try{mount()}catch(e){console.warn('Unique Measurement Print',e)}}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
  setTimeout(ready,1200);
})();