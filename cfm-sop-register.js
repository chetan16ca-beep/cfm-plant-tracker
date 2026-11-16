/* CFM SOP Register V320 | 2026-11-16
 * Additive checklists only. NO stock/cutting/order/dispatch mutations.
 * Records ride in the existing state + cloud payload and save() pipeline.
 * Historical records are never silently marked PASS or overwritten.
 */
(function(){
'use strict';
const CATALOG=[
['MR','Material Receiving / QC',['MR-01|PO / Challan / Supplier & roll count verified','MR-02|Receipt area segregated and supplier label captured','MR-03|Sample cut; holes, stains, damage and contamination checked','MR-04|Cloth code, weave, GSM, antistatic and actual width checked to specification','MR-05|Measured actual meter entered; no assumed physical stock','MR-06|QC disposition, defect, remarks and checker recorded']],
['SRL','Roll SRL / Tag / Store',['SRL-01|Unique full SRL assigned after QC','SRL-02|Tag has SRL, cloth, width, actual meter, date and location','SRL-03|Secure tag attached to physical roll/bundle','SRL-04|Excel inward master line created','SRL-05|ERP Store matches Excel/physical roll measurements','SRL-06|HOLD/REJECT physically separated from ready stock']],
['MCL','Machine Cleaning',['MCL-01|Machine stopped','MCL-02|Approved safe shutdown/isolation followed','MCL-03|Lint/thread/dust and scrap removed safely','MCL-04|Contact surfaces and guards inspected','MCL-05|Tools removed and supervisor checked']],
['PCL','Plant / Floor Cleaning',['PCL-01|Floor, worktables and walkways cleaned','PCL-02|Waste segregated and passages clear','PCL-03|Spills/leaks/contamination addressed or held','PCL-04|Cleaning materials put away; shift approved']],
['ECL','Electrical Machine Cleaning (authorized only)',['ECL-01|Authorized electrician assigned','ECL-02|LOTO/isolation and zero-energy check confirmed','ECL-03|No water or unauthorized compressed air on electrical parts','ECL-04|Approved dry cleaning and cable/guard inspection done','ECL-05|Safe restoration and electrician sign-off']],
['RCL','Packing Room Cleaning',['RCL-01|Previous job labels and materials cleared','RCL-02|Packing surfaces/area cleaned','RCL-03|Bags, boxes and packaging clean and dry','RCL-04|Area released for the intended product']],
['CUT','Cutting',['CUT-01|Work No, product, quantity and measurements verified','CUT-02|Full Store SRL, actual roll width and cloth code verified','CUT-03|L x W, layers, pieces and planned usage checked','CUT-04|Machine/area cleaning release checked','CUT-05|Pieces counted; wastage W and defects documented','CUT-06|Actual SRL/meter use, cutting by and date recorded','CUT-07|Missing/ambiguous meter or mismatch placed on HOLD']],
['STI','Stitching',['STI-01|Incoming cut pieces, sizes and SRL linked','STI-02|Thread, needle, seam type and pattern verified','STI-03|Stitch alignment and open seams inspected','STI-04|Done/rework/reject quantity recorded','STI-05|Accepted pieces handed to Thread Cutting']],
['THR','Thread Cutting',['THR-01|Work and incoming pieces verified','THR-02|Excess thread trimmed without fabric damage','THR-03|Seams and cuts inspected','THR-04|Accepted/rework/reject counts recorded']],
['GUN','Gun Finishing',['GUN-01|Incoming Work No and pieces counted','GUN-02|Approved tool/finishing method checked','GUN-03|Fibre/thread/dust removed without damage','GUN-04|Finish and accepted/rework quantity recorded']],
['FQC','Final QC',['FQC-01|Size, micron/mesh, layers, antistatic spec verified','FQC-02|Joint, seam, hole, contamination and workmanship checked','FQC-03|Accepted/HOLD/reject quantities separated','FQC-04|Nonconformance and QC person recorded','FQC-05|Only released quantity handed to Packing']],
['PKG','Packing & Labeling',['PKG-01|Packing room cleaning release verified','PKG-02|Work, party, accepted qty and product matched','PKG-03|Clean suitable protective packing used','PKG-04|Work, product, pack no, qty, date, traceability label checked','PKG-05|Packed qty and supervisor handover recorded']],
['DSP','Dispatch',['DSP-01|Packing vs dispatch qty reconciled','DSP-02|Challan/invoice, transporter, address verified','DSP-03|Dispatch details and approval recorded','DSP-04|Dispatched job retained in history, not active pending']],
['RPT','Batch Report / SOP Review',['RPT-01|Work, party, product, qty and SRL linked','RPT-02|Material and production SOP IDs attached; separate area-cleaning logs reviewed','RPT-03|Results, operator, verifier and timestamp displayed','RPT-04|Missing checks marked NOT RECORDED, never PASS','RPT-05|Product ticket and Batch Annexure can print','RPT-06|Checklist record/version traceable']]
].map(([code,name,items])=>({code,name,items:items.map(s=>{const i=s.indexOf('|');return {id:s.slice(0,i),text:s.slice(i+1)}})}));

// V324 - controlled cleaning SOP specifications. Existing checkpoint IDs MCL/PCL/ECL/RCL
// retain their original meaning. Previous checklist results are never retroactively changed.
const CLEANING_MASTER={
 MCL:{
  heading:'Machine Cleaning & Pre-Operation Hygiene',
  scope:'Stitching, cutting, thread cutting and approved non-electrical machine surfaces',
  purpose:'Prevent lint, thread waste, cross-contamination and unsafe machine restart.',
  frequency:'At shift start/end, changeover and after repair/contamination; follow site-approved frequency.',
  responsibility:'Assigned machine operator performs; supervisor physically verifies and releases the machine.',
  safety:'Stop machine. Follow site-approved isolation before handling cleaning points. Do not open energized panels or remove safety guards without authorization.',
  items:[
  'MCL-01|Machine stopped and identified|Verify machine identity and complete stop before beginning cleaning. Confirm no moving needle, blade or driven parts.|Machine correctly identified, controls OFF and all moving parts stationary.',
  'MCL-02|Safe isolation confirmed|Follow the site-approved machine shutdown/isolation procedure before any cleaning near hazardous parts. Refer difficult isolation to maintenance.|Safe condition confirmed; unauthorized restart prevented during cleaning.',
  'MCL-03|Lint, thread and scrap removed|Remove loose fabric, lint, thread ends and process scrap from reachable machine and nearby work surfaces using approved tools.|No visible loose thread, dust accumulation or scrap on accessible areas.',
  'MCL-04|Surfaces and guards inspected|Inspect accessible bed, work platform, guards and covers for cleanliness, damage and correct position; do not open electrical enclosures.|Clean contact surfaces; guards present and visibly intact.',
  'MCL-05|Tools accounted for; supervisor checked|Return brushes, cloths and tools to assigned storage. Supervisor visually verifies the cleaned machine before release.|No tool or loose material left; supervisor release recorded.',
  'MCL-06|Approved cleaning method used|Use approved dry brush, vacuum or lint-free cloth suitable for machine surfaces; avoid unapproved solvent or water on electrical components.|Suitable method used without wet electrical parts or surface damage.',
  'MCL-07|Thread path and work zone clear|With machine safely isolated, remove accessible lint around stitch/needle and thread feed area without touching sharp parts unsafely.|Thread path and work zone clear of waste; no blocked accessible openings.',
  'MCL-08|Oil leak or defect inspected|Visually check for leakage, loose parts, damaged needle/guards or abnormal condition; stop and report defects for maintenance.|No unresolved safety-critical defect; defects recorded as HOLD/FAIL.',
  'MCL-09|Previous-job material cleared|Remove previous order fabric pieces, thread cones, job tags and scrap from the machine work zone before next product.|No mix-up material or unrelated labels at machine station.',
  'MCL-10|Area released for operation|Confirm machine and adjacent floor are clean, tools removed, protection restored and supervisor has reviewed the condition.|Machine/area released only after verification; unresolved issues held.'
  ]
 },
 PCL:{
  heading:'Plant & Production Area Cleaning',
  scope:'Production floors, walkways, tables, common working areas, bins and non-electrical accessible surfaces',
  purpose:'Maintain orderly, contaminant-controlled, obstruction-free production areas.',
  frequency:'Daily and shift end; immediately for spills or debris; follow area cleaning plan.',
  responsibility:'Designated housekeeping/area operator performs; area supervisor verifies.',
  safety:'Use approved cleaning materials and PPE. Isolate hazards and spills; never block emergency exits or electrical access.',
  items:[
  'PCL-01|Floors, tables and walkways cleaned|Remove loose lint, dust and scrap from designated floors, worktables and access routes using an approved method.|Visibly clean surfaces; dry, non-slip walking surfaces and no loose waste.',
  'PCL-02|Waste segregated; passages clear|Transfer thread/fabric scrap and other waste into identified bins. Keep aisles, entrances and exits unobstructed.|Waste in correct bins; no obstruction of walkways or emergency routes.',
  'PCL-03|Spills and contamination controlled|Identify liquid spills, leaks or contamination. Contain and report hazards; only trained staff use approved spill procedure.|No uncontrolled spill; contaminated area secured until released.',
  'PCL-04|Equipment returned; shift approved|Clean and return mops, brushes and waste collection tools. Supervisor checks area condition at handover.|Tools stored correctly; shift/area release confirmed.',
  'PCL-05|Corners and low-access points checked|Inspect reachable corners, machine surroundings and under-table areas for dust/fabric accumulation without unsafe access.|No visible built-up lint or fabric scraps in accessible points.',
  'PCL-06|High-contact work surfaces cleaned|Clean shared handles, table edges and contact surfaces as suitable for the surface and approved work method.|Clean and dry contact points; no residue that may transfer to product.',
  'PCL-07|Material zones remain separated|Check that clean materials, active work, rejected items and scrap remain in designated labeled locations.|No mixing of accepted, HOLD, reject and scrap material.',
  'PCL-08|Cleaning tools inspected and stored|Check cleaning tools are usable, clean after application and place them in designated storage.|No soiled or defective cleaning tool left in the work area.',
  'PCL-09|Safety access and bins verified|Check bin overflow, emergency access, electrical panel approach and visible floor hazards during the final walk-through.|Access clear, waste contained and hazards reported/controlled.',
  'PCL-10|Supervisor clearance documented|Perform final area walk-through and record outstanding issues, correction and release by area supervisor.|No open critical issue; verified area/shift status recorded.'
  ]
 },
 ECL:{
  heading:'Electrical Machine / Panel Cleaning',
  scope:'Electrical enclosures, drives, control cabinets and machine electrical interfaces - authorized personnel only',
  purpose:'Prevent contamination-related electrical faults without exposing personnel to electrical hazards.',
  frequency:'Per preventive-maintenance plan or when authorized after contamination/maintenance.',
  responsibility:'Authorized qualified electrician only performs and signs off; maintenance supervisor verifies.',
  safety:'Electrical work is restricted to qualified authorized personnel. Follow site electrical isolation, lockout/tagout and verification rules. Never clean energized panels.',
  items:[
  'ECL-01|Authorized electrician and permit verified|Confirm named competent/authorized electrician and required site work approval before any electrical-machine cleaning.|Authorization and site approval verified; unauthorized work not started.',
  'ECL-02|Electrical isolation and zero-energy verified|Authorized electrician follows documented lockout/tagout and safe de-energization verification requirements before cleaning.|Isolation verification complete under site procedure; no exposed energized work.',
  'ECL-03|Prohibited wet / air methods excluded|Confirm no water, wet cloth, unapproved solvent or unauthorized compressed air is used near electrical components.|Only approved electrical-safe cleaning practice used.',
  'ECL-04|Approved dry cleaning and visual check|Authorized personnel remove accessible dust with approved equipment and visually inspect cable/guards without disturbing connections.|Clean accessible enclosure; defects reported rather than adjusted unsafely.',
  'ECL-05|Restoration authorized and signed off|After reassembly and checks, only authorized personnel restore power using the approved site restart procedure.|Maintenance authorization and safe release recorded.',
  'ECL-06|Moisture / ingress check|Visually check for visible water ingress, condensation, excessive dust or contamination before any cleaning or restart.|No uncontrolled moisture/ingress; unsafe condition placed on HOLD.',
  'ECL-07|PPE and cleaning tools approved|Confirm task-appropriate PPE and approved clean tools are available and in serviceable condition.|Required PPE/tools confirmed by authorized worker.',
  'ECL-08|Heat or damage indicators reported|Visually flag scorch marks, unusual odor, cable damage, loose covers or other abnormal indicators; do not touch live equipment.|Abnormal conditions isolated and referred to qualified maintenance.',
  'ECL-09|Covers and labels inspected|After authorized cleaning verify enclosure covers, warning labels, guards and cable entries appear correctly secured.|Enclosure visibly intact and identification/guards restored.',
  'ECL-10|Maintenance release and record completed|Record electrical machine/panel identity, assigned electrician, supervisor and any defect/corrective-action reference.|Signed-off status and unresolved HOLD conditions traceable.'
  ]
 },
 RCL:{
  heading:'Packing Room Cleaning & Line Clearance',
  scope:'Packing room, packing tables, packaging-material racks, labeling and sealing stations',
  purpose:'Prevent packaging contamination, wrong-label use and product/lot mix-ups.',
  frequency:'Before packing, at product changeover and after shift cleaning as required.',
  responsibility:'Packing operator performs; packing/quality supervisor verifies area release.',
  safety:'Stop and make safe packing/sealing equipment before cleaning; use only approved clean and dry materials.',
  items:[
  'RCL-01|Previous order material cleared|Remove old product labels, prior-order packing materials, unused cartons and loose pieces before new packing starts.|No previous order items or loose labels on the packing line.',
  'RCL-02|Packing contact surfaces cleaned|Clean packing benches, preparation tables, weighing and accessible contact surfaces by approved method.|Surfaces visibly clean, dry and free from product transfer residue.',
  'RCL-03|Packaging stock clean and dry|Inspect bags, cartons, liners and sealing material before use; segregate torn, wet or soiled supplies.|Only intact and clean packaging materials available to operation.',
  'RCL-04|Packing room released for product|Supervisor verifies room/line status and intended product after cleaning and clearance.|Area approved for intended packing; outstanding holds closed.',
  'RCL-05|Room floor, racks and bins checked|Remove dust and waste from reachable floor corners, racks and scrap bins; keep packed products protected.|No visible loose debris near exposed packing.',
  'RCL-06|Contamination indicators inspected|Check for dust, fibers, water leak, pest evidence or other visible contamination around the packing zone.|No unresolved contamination; suspicious area quarantined and reported.',
  'RCL-07|Packaging material segregated|Keep accepted packing materials protected and separate from waste, returns and rejected supplies.|No mixed/rejected packaging at active packing station.',
  'RCL-08|Sealing / labeling workstation safe|Clean accessible sealing/labeling surfaces after approved shutdown and verify guards and work area.|Equipment surface clean; controls and guards visually intact.',
  'RCL-09|Current labels and instructions checked|Confirm only relevant product/party/job label set is at line; remove obsolete printouts and tags.|Current approved label and instruction only; no mixed labels.',
  'RCL-10|Final line clearance signed off|Verify the entire packing zone is clean and ready. Record supervisor approval or HOLD reason before starting.|Packing permitted only after documented clearance.'
  ]
 }
};
const LEGACY_CLEANING_ITEMS=Object.fromEntries(CATALOG.filter(c=>Object.hasOwn(CLEANING_MASTER,c.code)).map(c=>[c.code,c.items.map(x=>({...x}))]));
for(const cat of CATALOG){
 const doc=CLEANING_MASTER[cat.code];
 if(doc){
  cat.items=doc.items.map(line=>{
   const [id,text,description,acceptance]=line.split('|');
   return {id,text,description,acceptance};
  });
 }
}

// V326 controlled Packing & Bag Label Verification SOP. Label applies to EACH
// finished bag; it is not limited to the carton/outer packing label.
// Preserve PKG-01..05 IDs; historical snapshots and results are not rewritten.
const PACKING_MASTER={
 heading:'Packing Control & Individual Bag Label Verification',
 scope:'All finished filtration bags before final protective packing, and outer pack labels when specified.',
 purpose:'Prevent unlabeled bags, wrong product/party/specification identification, mixed orders and loss of traceability at dispatch.',
 frequency:'For every finished bag during final packing, at label changeover and at final packing release.',
 responsibility:'Packing operator checks label and product against the approved Work Order/label template; packing supervisor verifies results and releases the batch.',
 safety:'Do not pack or dispatch a bag with a missing, illegible, wrong or unattached required label. Hold affected bags, correct labels and verify again before release.',
 items:[
  'PKG-01|Packing room cleaning released|Check the saved Packing Room Cleaning release or confirm area clearance before placing clean finished bags on the packing station.|Packing room is clean and released; unresolved cleaning HOLD is escalated.',
  'PKG-02|Work Order, party, product and accepted quantity verified|Compare the packing batch with the latest approved Work Order, product description and Final QC accepted quantity.|Packing material and finished bags match the approved order and released quantity.',
  'PKG-03|Approved clean protective packing used|Inspect bag/liner/carton for damage, moisture and contamination before placing finished filters inside.|Suitable protective materials are clean, dry, intact and appropriate to product.',
  'PKG-04|Outer pack labeling and traceability verified|Compare outer pack marking with Work No, product, pack number, packed quantity and date as required on the approved packing template.|Outer pack has the required, legible and correctly matched traceability details.',
  'PKG-05|Packed quantity and supervisor handover recorded|Count accepted packed bags and reconcile with Final QC; record handover to supervisor for verification.|Packed quantity equals released quantity; discrepancies held for reconciliation.',
  'PKG-06|Individual label present on EVERY finished bag|Physically inspect every completed filter bag for the required product identification label before protective packing.|100% of finished bags have the required label; any unlabeled bag is held.',
  'PKG-07|Label applied at approved bag location|Verify label is fixed at the approved position for the specific bag design without covering functional surfaces or stitching.|Label is positioned consistently as per approved product/label specification.',
  'PKG-08|Correct company / manufacturer identity|Compare printed company/manufacturer identity with the current approved bag label artwork where required.|Company identity is correct and matches approved label template; no obsolete branding.',
  'PKG-09|Customer / Party name correct|Read the actual bag label and match Party Name/customer information to its Work Order and approved label requirement.|Exact required Party/Customer name on each bag; no mix-up with another order.',
  'PKG-10|Product name / bag type correct|Check label product identification (e.g. CF, FBD, RNF, SNF, ANFD, filter cloth) against actual bag and approved order.|Correct product type, variant and description; no incorrect product designation.',
  'PKG-11|Bag dimensions / size match order|Compare any printed bag size, length, diameter and product-specific dimensions to the approved Work Order and product drawing, where required.|Required label sizes are correct and consistent with the actual finished bag.',
  'PKG-12|Micron / mesh specification correct|Verify printed micron or mesh value against approved order, specification and finished product; apply N/A only when genuinely inapplicable.|Printed filtration rating matches approved specification wherever required.',
  'PKG-13|Cloth / material specification correct|Verify printed cloth name/code, material, fabric grade or construction when listed on approved label against manufacturing record.|No mismatch in required cloth/material identification.',
  'PKG-14|Antistatic, layers and special features correct|Compare printed antistatic status, layer count, treatment and other special features to the order when the label requires them.|Required features are accurate; any mismatch triggers HOLD and correction.',
  'PKG-15|Work Order / batch traceability correct|Match printed Work No, batch/lot or internal identification (if required on label) to physical bag batch and production record.|Bag traceability is unambiguous and linked to the correct approved order.',
  'PKG-16|Individual bag / package quantity reference correct|Check any quantity, pack number or unit identification shown on label or attached pack marking as required.|Correct quantity/pack identification; actual count reconciles to accepted packing batch.',
  'PKG-17|Print clearly readable and complete|Inspect each required printed field for clear text, complete characters, correct language/layout and absence of fading or smudges.|All mandatory label details readable and complete; no damaged or incomplete print.',
  'PKG-18|Label attachment strong and undamaged|Check sewn, heat-applied or other approved label attachment for alignment, secure fixing and absence of loose edges or product damage.|Label remains securely fixed; bag fabric and stitching are not damaged.',
  'PKG-19|No wrong / duplicate / mixed labels|After product or order changeover, remove prior labels and check every bag/pack contains the correct current label, with no duplicate conflicting tags.|No obsolete, duplicate conflicting or mixed-order labels on finished bags.',
  'PKG-20|Final bag-label verification & release|Packing operator completes individual bag-label verification; supervisor checks physical product against label and records any HOLD, FAIL, rework and final release.|All required checks passed or justified N/A; wrong/unlabeled bags remain on HOLD until corrected and verified.'
 ]
};
const SOP_MASTERS={...CLEANING_MASTER,PKG:PACKING_MASTER};
const LEGACY_CONTROLLED_ITEMS={
 ...LEGACY_CLEANING_ITEMS,
 PKG:CATALOG.find(c=>c.code==='PKG').items.map(item=>({...item}))
};
const isControlledSop=code=>!!SOP_MASTERS[code];
const pkg=CATALOG.find(c=>c.code==='PKG');
pkg.items=PACKING_MASTER.items.map(line=>{
 const [id,text,description,acceptance]=line.split('|');
 return {id,text,description,acceptance};
});

const SOP_DOCUMENT_REV='01';
const SOP_DOCUMENT_ISSUED='2026-11-16';
const sopDocumentNo=code=>'SOP-CFM-'+code;
const sopChecklistNo=code=>'CHK-CFM-'+code+'-01';

const $=id=>document.getElementById(id);
const norm=s=>String(s==null?'':s).trim().toUpperCase();
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const arr=s=>Array.isArray(s)?s:[];
const getState=()=>{try{return typeof state!=='undefined'?state:null}catch(_){return null}};
const isClean=code=>['MCL','PCL','ECL','RCL'].includes(code);
const isMaterial=code=>['MR','SRL'].includes(code);
// Each form shows only its own required traceability fields.
// Cleaning records are independent of Work Orders and cloth inward/stock.
const FIELDS_BY_SOP={
 MR:['srl','inward'], SRL:['srl'],
 MCL:['area','shift'], PCL:['area','shift'], ECL:['area','shift'], RCL:['area','shift'],
 CUT:['work','srl','shift'], STI:['work','srl','shift'],
 THR:['work','shift'], GUN:['work','shift'], FQC:['work','shift'],
 PKG:['work','shift'], DSP:['work','shift'], RPT:['work','shift']
};
const FIELD_CONTROLS={
 work:'cfmSopWork318', srl:'cfmSopSrl318', inward:'cfmSopInward318',
 area:'cfmSopArea318', shift:'cfmSopShift318'
};
const usesField=(code,key)=>(FIELDS_BY_SOP[code]||[]).includes(key);
const KEY='cfm-sop-register-fallback-v318';
const schemaId='CFM-SOP-v1';

/* V327 controlled team names: operator names are department-specific.
 * Electrical cleaning uses an explicitly named authorized electrician only.
 * Employee assignment is not a safety/cleaning sign-off.
 */
const TEAM_BY_SOP={
  CUT:['Sumit'],
  STI:['Vijayraj','Lavkush','Ankit','Satish','Rahul'],
  THR:['Bhavna','Radha','Jitu','Sangita'],
  GUN:['Bhavna','Radha','Jitu','Sangita'],
  PKG:['Bhavna','Radha','Jitu','Sangita'],
  FQC:['Chetan','Lala'],
  MR:['Chetan','Lala'],
  SRL:['Chetan','Lala'],
  DSP:['Lala'],
  MCL:['Bhavna','Radha','Sangita'],
  PCL:['Bhavna','Radha','Sangita'],
  RCL:['Bhavna','Radha','Sangita'],
  ECL:[], // authorised electrician name must be recorded, not inferred.
  RPT:[]  // verifier entered by name; no unconfirmed roster assignment.
};

function safeRead(){try{return arr(JSON.parse(localStorage.getItem(KEY)||'[]'))}catch(_){return []}}
function backup(a){try{localStorage.setItem(KEY,JSON.stringify(a.slice(-2500)))}catch(_){}}
function records(){
 const st=getState();if(!st)return [];
 const byId=new Map();
 for(const r of [...arr(st.sopRecords),...safeRead()]){
  if(!r||!r.id)continue;const old=byId.get(r.id);
  if(!old||String(r.timestamp||'')>=String(old.timestamp||''))byId.set(r.id,r);
 }
 return [...byId.values()].sort((a,b)=>String(a.timestamp||'').localeCompare(String(b.timestamp||'')));
}
function ensure(){
 const st=getState();if(!st)return false;
 const list=records();
 if(JSON.stringify(arr(st.sopRecords))!==JSON.stringify(list)){
   st.sopRecords=list;
   backup(list);
   // Recovery from old-device cloud payload; do not call save automatically
   // on startup without the operator initiating a write.
 }return true;
}
function latest(code,workNo,srl){
 const matches=records().filter(r=>norm(r.code)===norm(code)).filter(r=>{
  if(isMaterial(code))return srl&&norm(r.srlNo)===norm(srl);
  return workNo&&norm(r.workNo)===norm(workNo);
 });
 return matches[matches.length-1]||null;
}
function srlsFor(work){
 const st=getState(), all=new Set();
 arr(st?.cutting).filter(x=>norm(x.workNo)===norm(work)&&!x.wastage)
   .forEach(x=>{const v=String(x.srlNo||'').trim();if(v&&norm(v)!=='W')all.add(v)});
 const wo=arr(st?.pending).find(x=>norm(x.workNo)===norm(work));
 for(const k of ['srlNo','clothSrl','clothSrlNo'])if(wo?.[k])all.add(String(wo[k]).trim());
 return [...all];
}
function recordFor(code,work){
 if(isMaterial(code)){
   const a=srlsFor(work).map(srl=>latest(code,work,srl)).filter(Boolean);
   return a;
 }
 const r=latest(code,work,'');return r?[r]:[];
}
function aggregate(r,cat){
 if(!r)return 'NOT RECORDED';
 // Audit integrity: use the checkpoint revision that existed when the record
 // was created. Legacy V320/V323 cleaning entries have the original checks.
 const points=arr(r.checklistSnapshot).length?r.checklistSnapshot:
   isControlledSop(cat.code)?LEGACY_CONTROLLED_ITEMS[cat.code]:cat.items;
 return aggregateFromPoints(r,points);
}
function annex(work,compact=false){
 const allSrl=srlsFor(work), st=getState();
 const wo=arr(st?.pending).find(x=>norm(x.workNo)===norm(work));
 const lineStyle='border:1px solid #b9cbd9;padding:5px 6px;font:10px Arial,sans-serif;vertical-align:top';
 const cands=CATALOG.filter(cat=>!isClean(cat.code)).map(cat=>({cat,entries:recordFor(cat.code,work)}));
 let html='<section class="cfm-sop-print" style="page-break-before:always;color:#173548;font:11px Arial,sans-serif"><h2 style="font-size:17px;margin:0 0 7px">CFM SOP Checklist Annexure</h2>'+
 '<p style="font-size:10px">Work: <b>'+esc(work)+'</b> | Party: '+esc(wo?.party||'-')+' | Product: '+esc(wo?.description||'-')+' | Qty: '+esc(wo?.orderQty||'-')+
 ' | SRL: '+esc(allSrl.join(', ')||'NOT RECORDED')+'</p>'+
 '<p style="font-size:10px">Saved checklists only. Production Done Qty is NOT proof of checklist PASS. Missing results are NOT RECORDED. Work-related checks linked by Work No or Cutting SRL; area cleaning is logged separately.</p>';
 html+='<table style="border-collapse:collapse;width:100%"><thead><tr><th style="'+lineStyle+'">SOP / Code</th><th style="'+lineStyle+'">Result</th><th style="'+lineStyle+'">Operator / Supervisor</th><th style="'+lineStyle+'">Saved At</th></tr></thead><tbody>';
 for(const {cat,entries} of cands){
  let result=entries.length?entries.map(r=>aggregate(r,cat)).join('; '):'NOT RECORDED';
  html+='<tr><td style="'+lineStyle+'">'+esc(cat.code+' – '+cat.name)+'</td><td style="'+lineStyle+'">'+esc(result)+'</td><td style="'+lineStyle+'">'+esc(entries.map(r=>[r.operator,r.supervisor].filter(Boolean).join(' / ')).join('; ')||'-')+'</td><td style="'+lineStyle+'">'+esc(entries.map(r=>r.timestamp||'').join('; ')||'-')+'</td></tr>';
 }
 html+='</tbody></table>';
 if(compact)return html+'</section>';
 for(const {cat,entries} of cands){
  html+='<h3 style="font-size:12px;margin:13px 0 4px">'+esc(cat.code+' • '+cat.name)+'</h3>';
  if(!entries.length){html+='<p style="margin:3px 0;font-size:10px;color:#a13a31">NOT RECORDED: '+esc(cat.items.map(it=>it.id).join(', '))+'</p>';continue}
  for(const rec of entries){
   html+='<p style="font-size:10px;margin:4px 0">SRL: '+esc(rec.srlNo||'-')+' | Ref: '+esc(rec.inwardNo||rec.area||'-')+' | Shift: '+esc(rec.shift||'-')+' | '+esc(rec.timestamp||'-')+'</p>';
   html+='<table style="border-collapse:collapse;width:100%"><tbody>';
   for(const it of cat.items)html+='<tr><td style="'+lineStyle+';width:52px">'+esc(it.id)+'</td><td style="'+lineStyle+'">'+esc(it.text)+'</td><td style="'+lineStyle+';width:86px">'+esc(rec.results?.[it.id]||'NOT RECORDED')+'</td></tr>';
   html+='</tbody></table>';
   if(rec.remark)html+='<p style="font-size:10px">Remark: '+esc(rec.remark)+'</p>';
  }
 }
 return html+'<p style="margin-top:12px">Checklist record status is based on signed manual entries, not automatic assumption.</p></section>';
}
function printDoc(work,full){
 if(!/^CFM-\d+$/i.test(work)){alert('Select correct CFM Work No.');return}
 const st=getState(), wo=arr(st?.pending).find(x=>norm(x.workNo)===norm(work));
 if(!wo){alert('Work Order not found. Refresh cloud safely.');return}
 let html='<div style="font:13px Arial"><h2>CFM Product-wise SOP Ticket</h2><b>Work No:</b> '+esc(work)+
 ' &nbsp; <b>Party:</b> '+esc(wo.party||'-')+'<p><b>Product:</b> '+esc(wo.description||'-')+
 ' | <b>Order Qty:</b> '+esc(wo.orderQty||'-')+' | <b>SRL:</b> '+esc(srlsFor(work).join(', ')||'NOT RECORDED')+'</p></div>';
 html+=annex(work,!full);
 if(typeof window.openPrintWindow==='function')window.openPrintWindow('SOP Product Ticket '+work,html,false);
 else alert('Printer engine not ready');
}
function wrapPrint(){
 const old=window.openPrintWindow;
 if(typeof old!=='function'||old.__cfmSopV318)return;
 function wrapped(title,body,landscape){
   const isBatch=/Batch Report/i.test(String(title||'')) && !/SOP/i.test(String(title||''));
   const work=(String(title||'').match(/CFM-\d+/i)||[])[0];
   return old.call(this,title,isBatch&&work?String(body||'')+annex(work,false):body,landscape);
 }
 wrapped.__cfmSopV318=true;window.openPrintWindow=wrapped;
}

/* V321: Work-Order-independent SOP print, including area-cleaning checklists.
   Read-only: no ERP state writes and never invents completed/PASS checks. */
function printableSop(cat,rec){
 const saved=!!rec?.id;
 const spec=SOP_MASTERS[cat.code]||null;
 // An earlier saved checklist had fewer checkpoints: print exactly its legacy
 // checklist, never turn newly added revision 01 points into historical failures.
 const legacy=saved&&!!spec&&!arr(rec?.checklistSnapshot).length;
 // V325: Every print of a selected SOP always contains the full CURRENT
 // checklist. Historical outcomes are shown only for IDs actually recorded.
 // Unrecorded new checkpoints must never be silently marked PASS.
 const archivedPoints=saved&&arr(rec?.checklistSnapshot).length?rec.checklistSnapshot:
   legacy?LEGACY_CONTROLLED_ITEMS[cat.code]:cat.items;
 const points=spec?[
   ...cat.items,
   ...archivedPoints.filter(item=>!cat.items.some(now=>now.id===item.id))
 ]:archivedPoints;
 const originallyRecorded=archivedPoints.filter(item=>Object.prototype.hasOwnProperty.call(rec?.results||{},item.id)).length;
 const currentCompleted=cat.items.filter(item=>Object.prototype.hasOwnProperty.call(rec?.results||{},item.id)).length;
 const results=rec?.results||{};
 const revision=spec?(legacy?'01 TEMPLATE / LEGACY ENTRY':(rec?.sopRevision||SOP_DOCUMENT_REV)):'ERP CHECKLIST';
 const docNo=rec?.documentNo||(spec?sopDocumentNo(cat.code):'SOP-CFM-'+cat.code);
 const chkNo=rec?.checklistNo||(spec?sopChecklistNo(cat.code):'CHK-CFM-'+cat.code);
 const title=saved?'SAVED SOP ENTRY':'BLANK / UNSAVED TEMPLATE';
 const areaLabel=isClean(cat.code)?'Machine / Area':isMaterial(cat.code)?'Receipt / SRL Reference':'Work Order / Process';
 const ref=isClean(cat.code)?rec?.area:isMaterial(cat.code)?(rec?.srlNo||rec?.inwardNo):rec?.workNo;
 const savedAt=rec?.timestamp?new Date(rec.timestamp).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}):'NOT SAVED';
 // The saved historical result is based only on its original checkpoint
 // set. Separately disclose coverage of the current controlled checklist.
 const summary=saved?aggregateFromPoints(rec,archivedPoints):'NOT RECORDED';
 const checklistCoverage=spec?(saved?currentCompleted+'/'+cat.items.length:'0/'+cat.items.length):'';
 const cell=(value,extra='')=>'<td style="border:1px solid #bdcfdb;padding:7px;vertical-align:top;word-break:normal;'+extra+'">'+esc(value==null||value===''?'-':value)+'</td>';
 const itemRows=points.map(item=>'<tr>'+
   cell(item.id,'width:60px;font-weight:700;color:#195573')+
   cell(item.text,'font-weight:700;width:145px')+
   cell(item.description||item.text,'width:auto')+
   cell(item.acceptance||(legacy?'Visual verification per original checklist':'Meet documented work requirement'),'width:auto')+
   cell(saved?(results[item.id]||'NOT RECORDED'):'NOT RECORDED','width:92px;font-weight:700')+
  '</tr>').join('');
 const meta=(label,value)=>'<div style="border:1px solid #c6d6e0;border-radius:5px;padding:7px 9px;min-width:0"><small style="display:block;color:#506e80;font-size:9px;text-transform:uppercase;letter-spacing:.3px">'+esc(label)+'</small><b style="font-size:11px;overflow-wrap:anywhere">'+esc(value||'-')+'</b></div>';
 const printedAt=new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'});
 return '<style>@page{size:A4 landscape;margin:11mm}body{font:11px/1.4 Arial,sans-serif;color:#183a50}'+
  'h1{font-size:18px;margin:9px 0 4px;color:#143e58}h2{font-size:12px;margin:12px 0 5px;color:#12637b}'+
  'table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:10px;margin-top:10px}'+
  'th{background:#e6f2f8;color:#17455d;border:1px solid #adc6d4;padding:8px;text-align:left}thead{display:table-header-group}'+
  'tr{break-inside:avoid}p{margin:5px 0}'+
  '.cfm-doc-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:11px 0}'+
  '.cfm-sop-sign{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:29px}'+
  '.cfm-sop-sign>div{border-top:1px solid #708b9b;text-align:center;padding-top:5px;color:#46677b}'+
  '</style>'+
 '<section class="cfm-sop-audit-sheet">'+
 '<header style="display:flex;justify-content:space-between;gap:16px;align-items:start;border-bottom:3px solid #176c8d;padding:4px 0 10px">'+
  '<div><b style="font-size:18px;letter-spacing:.6px;color:#153f57">EAGLE FILTRATION PRODUCT PVT. LTD.</b>'+
  '<div style="font-size:10px;letter-spacing:1px;color:#537283">CFM PLANT OPERATIONS • CONTROLLED SOP CHECKLIST</div></div>'+
  '<div style="font-size:10px;text-align:right;min-width:200px"><b>DOCUMENT CONTROL</b><div>SOP No: '+esc(docNo)+'</div>'+
  '<div>Checklist No: '+esc(chkNo)+'</div><div>Revision: '+esc(revision)+'</div>'+
  '<div>Issue Date: '+esc(SOP_DOCUMENT_ISSUED)+'</div></div></header>'+
 '<h1>'+esc((spec?.heading||cat.name).toUpperCase())+'</h1>'+
 '<p style="font-size:11px;color:#465f71"><strong>Record status:</strong> '+esc(title)+
  (legacy?' • Legacy record: results are shown only for originally recorded checkpoints.':'')+
  (!saved?' • DO NOT USE AS PROOF OF EXECUTED CLEANING.':'')+'</p>'+
 (spec?'<div style="background:#f6fafc;padding:8px 11px;border:1px solid #d4e5ec;break-inside:avoid">'+
  '<p><b>1.0 PURPOSE</b> — '+esc(spec.purpose)+'</p>'+
  '<p><b>2.0 SCOPE</b> — '+esc(spec.scope)+'</p>'+
  '<p><b>3.0 FREQUENCY / TRIGGER</b> — '+esc(spec.frequency)+'</p>'+
  '<p><b>4.0 RESPONSIBILITY</b> — '+esc(spec.responsibility)+'</p>'+
  '<p><b>5.0 SAFETY / PRECAUTIONS</b> — '+esc(spec.safety)+'</p></div>':'')+
 (legacy?'<p style="padding:8px;border:1px solid #e3caa5;background:#fff8e9"><b>HISTORICAL RECORD:</b> All current Revision 01 checkpoints are listed for audit. New checkpoints without actual historical entries are NOT RECORDED; no work is assumed complete.</p>':'')+
 '<h2>6.0 EXECUTION & TRACEABILITY</h2>'+
 '<div class="cfm-doc-grid">'+
  meta('SOP Number',docNo)+meta('Checklist Number',chkNo)+meta('Revision',revision)+
  meta('Record / Entry ID',saved?rec.id:'NOT SAVED')+
  meta(areaLabel,ref||'NOT ENTERED')+meta('Shift',rec?.shift||'-')+
  meta('Cleaning / Entry Saved At (IST)',savedAt)+meta('Saved Record Result',summary)+
  (spec?meta('Current Checklist Evidence',checklistCoverage+' checkpoint(s) recorded'):'')+
  meta('Operator (name entered)',rec?.operator||'NOT RECORDED')+
  meta('Supervisor (name entered)',rec?.supervisor||'NOT RECORDED')+
  meta('Source Device',rec?.device||'-')+
  meta('Report Printed At (IST)',printedAt)+
  (rec?.workNo?meta('Work Order',rec.workNo):'')+
  (rec?.srlNo?meta('SRL No.',rec.srlNo):'')+'</div>'+
 '<h2>7.0 CHECKPOINT EXECUTION / ACCEPTANCE RECORD</h2>'+
 '<table><thead><tr><th style="width:64px">Check No.</th><th style="width:140px">Inspection Parameter</th>'+
  '<th>Detailed SOP Procedure / What to Verify</th><th>Objective Acceptance Criteria</th>'+
  '<th style="width:97px">Recorded Result</th></tr></thead><tbody>'+itemRows+'</tbody></table>'+
 '<h2>8.0 DEVIATION / NON-CONFORMANCE / CORRECTIVE ACTION</h2>'+
 '<div style="border:1px solid #c4d9e3;padding:9px;min-height:35px;overflow-wrap:anywhere">'+
  esc(rec?.remark||'No remark entered')+'</div>'+
 '<p style="font-size:10px;color:#445f72"><b>Result interpretation:</b> PASS = check completed and accepted; HOLD = not released; FAIL = failed; N/A = not applicable (justify in remark); NOT RECORDED = no evidence entered. Names entered in ERP are not electronic signatures.</p>'+
 '<h2>9.0 VERIFICATION & RELEASE</h2><div class="cfm-sop-sign">'+
  '<div>Executed By — Operator Signature / Date</div>'+
  '<div>Checked By — Supervisor Signature / Date</div>'+
  '<div>Authorized Release / Corrective-Action Closure</div></div>'+
 '<footer style="border-top:1px solid #c9d7de;margin-top:18px;padding-top:5px;display:flex;justify-content:space-between;gap:9px;color:#567085;font-size:9px">'+
  '<span>Controlled format • ERP-generated record; verify physical execution and signatures at audit</span>'+
  '<span>'+esc(chkNo)+' • Rev '+esc(revision)+'</span></footer></section>';
}
function aggregateFromPoints(rec,items){
 if(!rec)return 'NOT RECORDED';
 const stats=items.map(item=>rec.results?.[item.id]||'NOT RECORDED');
 if(stats.includes('FAIL'))return 'FAIL';
 if(stats.includes('HOLD'))return 'HOLD';
 if(stats.includes('NOT RECORDED'))return 'NOT RECORDED';
 return 'PASS / N/A';
}
/* V322: Date-wise SOP print. The date refers to saved timestamps in Asia/Kolkata;
   printing never changes SOP records or manufacturing/stock state. */
function sopPrintDateOf(value){
 const date=new Date(value);
 if(!Number.isFinite(date.getTime()))return '';
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',day:'2-digit',month:'2-digit',year:'numeric'}).formatToParts(date);
 const m={};parts.forEach(p=>{if(p.type!=='literal')m[p.type]=p.value});
 return m.year+'-'+m.month+'-'+m.day;
}
function sopTodayDate(){return sopPrintDateOf(new Date())}
function sopDateHeading(day){
 const m=String(day||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
 return m?m[3]+'-'+m[2]+'-'+m[1]:String(day||'');
}
function sopPrintRowsForDate(day){
 return records().filter(r=>sopPrintDateOf(r?.timestamp)===day);
}
function sopPrintDaily(day){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)){alert('Choose a valid SOP Print Date.');return}
 if(typeof window.openPrintWindow!=='function'){alert('Print engine is not ready. Reopen ERP.');return}
 const daily=sopPrintRowsForDate(day);
 const style='border:1px solid #bed1da;padding:7px 8px;vertical-align:top;text-align:left';
 const td=x=>'<td style="'+style+'">'+esc(x==null||x===''?'-':x)+'</td>';
 const rows=daily.map((r,i)=>{
   const cat=CATALOG.find(c=>c.code===r.code);
   return '<tr>'+td(i+1)+td(r.documentNo||'SOP-CFM-'+r.code)+td(r.checklistNo||('CHK-CFM-'+r.code))+
     td(r.sopRevision||(isControlledSop(r.code)?'LEGACY':'-'))+td(r.id)+td(cat?.name||r.code)+
     td(r.area||r.workNo||r.srlNo||r.inwardNo||'-')+
     td(r.operator||'-')+td(r.supervisor||'-')+
     td(cat?aggregateFromPoints(r,arr(r.checklistSnapshot).length?r.checklistSnapshot:(isControlledSop(cat.code)?LEGACY_CONTROLLED_ITEMS[cat.code]:cat.items)):'UNKNOWN SOP')+
     td(new Date(r.timestamp).toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit'}))+'</tr>';
 }).join('');
 let doc='<style>@page{size:A4 portrait;margin:13mm}body{font:11px Arial,sans-serif;color:#183c51}table{width:100%;border-collapse:collapse}th{border:1px solid #bed1da;padding:7px;text-align:left;background:#e5f3fa}tr{break-inside:avoid}.page{page-break-before:always}</style>'+
 '<div style="border-bottom:3px solid #126b95;padding-bottom:9px"><b style="font-size:17px">EAGLE FILTRATION PRODUCT PVT. LTD.</b><div>CFM OPERATIONS • DATE-WISE SOP REGISTER</div></div>'+
 '<h2>SOP Register • '+esc(sopDateHeading(day))+'</h2>'+
 '<p><b>'+daily.length+'</b> actual saved SOP record(s). IST date is calculated from saved timestamp. Missing checklists are never counted as PASS.</p>'+
 '<table style="font-size:9px"><thead><tr><th>#</th><th>SOP No.</th><th>Checklist No.</th><th>Rev.</th><th>Record ID</th><th>Checklist</th><th>Machine / Area / Work</th><th>Operator</th><th>Supervisor</th><th>Result</th><th>Time (IST)</th></tr></thead><tbody>'+
 (rows||'<tr><td colspan="11" style="padding:12px;color:#a13a31">No saved SOP records for selected date.</td></tr>')+
 '</tbody></table>';
 // Include each saved checklist so a printed date register remains auditable.
 daily.forEach((rec,i)=>{
   const cat=CATALOG.find(c=>c.code===rec.code);
   if(cat)doc+='<div class="page"><div style="font-weight:bold;color:#406b81">Record '+(i+1)+' of '+daily.length+' • '+esc(sopDateHeading(day))+'</div>'+printableSop(cat,rec)+'</div>';
 });
 window.openPrintWindow('CFM SOP Daily Register '+day,doc,true);
}

function printSopCategory(cat,fields){
 if(typeof window.openPrintWindow!=='function'){alert('Print engine is still loading. Refresh the ERP and retry.');return}
 const {workNo,area,srlNo,inwardNo,date}=fields;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date||''))){alert('Choose SOP Print Date.');return}
 const matches=sopPrintRowsForDate(date).filter(r=>norm(r.code)===norm(cat.code)).filter(r=>{
  // Blank optional reference means "all machines/works of this SOP on this day".
  if(isClean(cat.code))return !area||norm(r.area)===norm(area);
  if(isMaterial(cat.code))return (!srlNo&&!inwardNo)||(
    srlNo?norm(r.srlNo)===norm(srlNo):norm(r.inwardNo)===norm(inwardNo));
  return !workNo||norm(r.workNo)===norm(workNo);
 });
 let doc='<div style="font:12px Arial;padding:9px 0;border-bottom:1px solid #b2cad8"><b>SELECTED SOP ONLY: SOP-CFM-'+esc(cat.code)+'</b> • Date: '+esc(sopDateHeading(date))+' • '+matches.length+' saved record(s) • All '+cat.items.length+' checkpoints</div>';
 if(matches.length){
  matches.forEach((rec,i)=>{
   if(i)doc+='<div style="page-break-before:always"></div>';
   doc+=printableSop(cat,rec);
  });
 }else{
  doc+='<p style="color:#a13a31;font:700 12px Arial">NO SAVED RECORDS ON '+esc(sopDateHeading(date))+'. This is a blank SOP reference, NOT proof that cleaning or checking was done.</p>'+
    printableSop(cat,null);
 }
 window.openPrintWindow('SOP '+cat.code+' '+date,doc,!!SOP_MASTERS[cat.code]);
}

function openPanel(preset){
 if(!ensure()){alert('ERP not ready');return}
 $('cfmSopModalV318')?.remove();
 const overlay=document.createElement('div');overlay.id='cfmSopModalV318';
 overlay.style.cssText='position:fixed;inset:0;z-index:2147483600;background:#082338b3;padding:9px;display:flex;align-items:center;justify-content:center';
 const panel=document.createElement('div');panel.style.cssText='width:min(800px,100%);max-height:96vh;overflow:auto;background:#fff;color:#17334b;border-radius:15px;padding:16px;box-sizing:border-box;font:13px/1.5 system-ui;box-shadow:0 12px 40px #0006';
 const options=CATALOG.map(c=>'<option value="'+esc(c.code)+'">'+esc(c.code+' – '+c.name)+'</option>').join('');
 panel.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0;font-size:19px">CFM • SOP Register</h2><button id="cfmSopClose318" type="button" style="font-size:20px;border:0;background:#eef5fb;border-radius:8px;padding:5px 12px">×</button></div>'+
 '<p style="margin:5px 0;color:#567">Numbered operator checklist • Cloud save via existing ERP. No automatic stock or cutting edit.</p>'+
 '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(185px,1fr));gap:9px">'+
 '<label>SOP<select id="cfmSopCode318" style="width:100%;padding:8px">'+options+'</select></label>'+
 '<label>Work No.<input id="cfmSopWork318" placeholder="CFM-753" style="width:100%;padding:8px;box-sizing:border-box"></label>'+
 '<label>Full SRL<input id="cfmSopSrl318" placeholder="EFPPL03/0234" style="width:100%;padding:8px;box-sizing:border-box"></label>'+
 '<label>Inward No.<input id="cfmSopInward318" placeholder="INW-..." style="width:100%;padding:8px;box-sizing:border-box"></label>'+
 '<label>Machine / Area<input id="cfmSopArea318" placeholder="Cutting 1 / Packing Room" style="width:100%;padding:8px;box-sizing:border-box"></label>'+
 '<label>Shift<select id="cfmSopShift318" style="width:100%;padding:8px"><option>Day</option><option>Night</option><option>General</option></select></label>'+
 '<label>SOP Print Date (IST)<input id="cfmSopPrintDate322" type="date" style="width:100%;padding:8px;box-sizing:border-box"></label>'+
 '<label>Operator / Checked By *<select id="cfmSopOperator318" style="width:100%;padding:8px;box-sizing:border-box"></select></label>'+'<label id="cfmSopOtherPersonWrap327" style="display:none">Authorized Person Name *<input id="cfmSopOperatorOther327" maxlength="90" autocomplete="name" placeholder="Enter actual authorized person name" style="width:100%;padding:8px;box-sizing:border-box"></label>'+
 '<label>Supervisor *<input id="cfmSopSupervisor318" style="width:100%;padding:8px;box-sizing:border-box"></label></div>'+
 '<div id="cfmSopChecks318" style="margin:12px 0"></div>'+
 '<label>Remark / deviation<input id="cfmSopRemark318" style="display:block;width:100%;padding:8px;box-sizing:border-box"></label>'+
 '<label style="display:flex;gap:8px;margin:10px 0;font-weight:bold"><input id="cfmSopApproved318" type="checkbox"> Actual work checked; results entered truthfully</label>'+
 '<div id="cfmSopMsg318" role="status" style="min-height:22px;color:#9a3328;font-weight:700"></div>'+
 '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">'+
 '<button type="button" id="cfmSopSave318" style="padding:11px 14px;border:0;background:#087f6d;color:#fff;font-weight:700;border-radius:9px">Save Checklist</button>'+
 '<button type="button" id="cfmSopPrint321" style="padding:11px 14px;border:0;background:#155d92;color:#fff;font-weight:700;border-radius:9px">🖨 Print Selected SOP — All Checks</button>'+
 '<button type="button" id="cfmSopPrintDaily322" style="padding:11px 14px;border:0;background:#40677d;color:#fff;font-weight:700;border-radius:9px">📅 Print All SOPs / Date</button>'+
 '<button type="button" id="cfmSopTicket318" style="padding:11px 14px;border:0;background:#1472bb;color:#fff;font-weight:700;border-radius:9px">Print Product Ticket + SOP</button>'+
 '<button type="button" id="cfmSopAnnex318" style="padding:11px 14px;border:1px solid #ccd6df;background:#fff;border-radius:9px">Print Full Annexure</button></div>';
 overlay.append(panel);document.body.append(overlay);
 const field=id=>$(id)?.value?.trim()||'';
 const setMsg=s=>{$('cfmSopMsg318').textContent=s};

 const populateOperatorDropdown=(code)=>{
  const select=$('cfmSopOperator318'),extra=$('cfmSopOperatorOther327'),wrap=$('cfmSopOtherPersonWrap327');
  if(!select||!extra||!wrap)return;
  const names=TEAM_BY_SOP[code]||[];
  const old=select.value;
  select.replaceChildren();
  const option=(value,label)=>{
   const item=document.createElement('option');
   item.value=value;item.textContent=label;select.append(item);
  };
  option('','Select person');
  names.forEach(name=>option(name,name));
  if(!names.length){
   option('__MANUAL__',code==='ECL'?'Authorized electrician — enter name':'Enter responsible person name');
   select.value='__MANUAL__';
  }else if(names.includes(old))select.value=old;
  else select.value='';
  const toggle=()=>{
   const manual=select.value==='__MANUAL__';
   wrap.style.display=manual?'':'none';
   extra.required=manual;
   extra.placeholder=code==='ECL'?'Authorized electrician full name':'Actual person full name';
   if(!manual)extra.value='';
  };
  select.onchange=toggle;
  toggle();
 };
 const render=()=>{
  const cat=CATALOG.find(x=>x.code===field('cfmSopCode318'));if(!cat)return;
  for(const [key,id] of Object.entries(FIELD_CONTROLS)){
   const control=$(id),label=control?.closest('label'),visible=usesField(cat.code,key);
   if(label)label.style.display=visible?'':'none';
   if(control)control.disabled=!visible;
  }
  const area=$('cfmSopArea318'),areaLabel=area?.closest('label');
  if(areaLabel){
   const areaTitle={MCL:'Machine *',PCL:'Plant / Floor Area *',ECL:'Electrical Machine / Panel *',RCL:'Packing Room / Area *'}[cat.code]||'Machine / Area *';
   if(areaLabel.firstChild?.nodeType===3)areaLabel.firstChild.nodeValue=areaTitle;
   if(area)area.placeholder={MCL:'Stitching Machine 01',PCL:'Plant Floor / Walkway',ECL:'Electrical Machine / Panel 01',RCL:'Packing Room'}[cat.code]||'Machine / Area';
  }
  // Product ticket and batch annexure need a Work Order: hide for area / receipt logs.
  const hasWork=usesField(cat.code,'work');
  for(const id of ['cfmSopTicket318','cfmSopAnnex318']){
   const button=$(id);if(button)button.style.display=hasWork?'':'none';
  }
  const spec=SOP_MASTERS[cat.code];
  const docInfo=spec?'<section style="border:1px solid #afd6e8;background:#f3f9fd;border-radius:10px;padding:12px;margin-bottom:12px">'+
    '<div style="font-weight:800;color:#164d69;font-size:15px">'+esc(spec.heading)+'</div>'+
    '<div style="display:flex;flex-wrap:wrap;gap:10px;font-size:11px;font-weight:700;margin:6px 0">'+
     '<span>SOP NO: '+esc(sopDocumentNo(cat.code))+'</span><span>CHECKLIST: '+esc(sopChecklistNo(cat.code))+'</span>'+
     '<span>REV: '+esc(SOP_DOCUMENT_REV)+'</span></div>'+
    '<p style="font-size:12px;margin:5px 0"><b>Purpose:</b> '+esc(spec.purpose)+'</p>'+
    '<p style="font-size:12px;margin:5px 0"><b>Scope:</b> '+esc(spec.scope)+'</p>'+
    '<p style="font-size:12px;margin:5px 0"><b>Frequency:</b> '+esc(spec.frequency)+'</p>'+
    '<p style="font-size:12px;margin:5px 0"><b>Responsibility:</b> '+esc(spec.responsibility)+'</p>'+
    '<p style="font-size:12px;margin:6px 0;color:#84391b"><b>Safety control:</b> '+esc(spec.safety)+'</p></section>':'';
  $('cfmSopChecks318').innerHTML=docInfo+'<b>'+esc(cat.name)+' • '+cat.items.length+' numbered checks</b>'+
   cat.items.map(item=>(cat.code==='PKG'&&item.id==='PKG-06'?'<div style="padding:10px 12px;margin:12px 0 4px;background:#e8f6ee;border-left:4px solid #14804b;font-weight:800;color:#155a3b">BAG LABEL VERIFICATION — EVERY FINISHED BAG (PKG-06 to PKG-20)</div>':'')+'<div style="display:grid;grid-template-columns:minmax(0,1fr) 118px;gap:8px;padding:10px 0;border-bottom:1px solid #dceaf2;align-items:start">'+
    '<div><strong style="display:block;color:#1e4f68;font-size:13px">'+esc(item.id+' • '+item.text)+'</strong>'+
    (item.description?'<div style="font-size:12px;line-height:1.45;color:#3a5567;margin-top:4px"><b>Procedure:</b> '+esc(item.description)+'</div>':'')+
    (item.acceptance?'<div style="font-size:12px;line-height:1.45;color:#18665d;margin-top:3px"><b>Acceptance:</b> '+esc(item.acceptance)+'</div>':'')+'</div>'+
    '<select data-sop-id="'+esc(item.id)+'" aria-label="'+esc(item.id)+' result" style="padding:7px;max-width:118px"><option value="">NOT RECORDED</option><option>PASS</option><option>HOLD</option><option>FAIL</option><option>N/A</option></select></div>').join('');
  populateOperatorDropdown(cat.code);
  setMsg('');
 };
 $('cfmSopWork318').value=preset||'';
 if(preset&&srlsFor(preset).length===1)$('cfmSopSrl318').value=srlsFor(preset)[0];
 $('cfmSopPrintDate322').value=sopTodayDate();
 $('cfmSopCode318').addEventListener('change',render);render();
 $('cfmSopClose318').addEventListener('click',()=>overlay.remove());
 overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});
 $('cfmSopSave318').addEventListener('click',()=>{
  const cat=CATALOG.find(x=>x.code===field('cfmSopCode318'));if(!cat)return;
  // Never persist hidden references (e.g. preset Work No from a pending card)
  // into a cleaning checklist. Historical saved checklists are left untouched.
  const workNo=usesField(cat.code,'work')?field('cfmSopWork318'):'',
    srlNo=usesField(cat.code,'srl')?field('cfmSopSrl318'):'',
    inwardNo=usesField(cat.code,'inward')?field('cfmSopInward318'):'',
    area=usesField(cat.code,'area')?field('cfmSopArea318'):'',
    shift=usesField(cat.code,'shift')?field('cfmSopShift318'):'',
    operator=field('cfmSopOperator318')==='__MANUAL__'?field('cfmSopOperatorOther327'):field('cfmSopOperator318'),supervisor=field('cfmSopSupervisor318'),
    remark=field('cfmSopRemark318');
  const st=getState();
  if(!st||typeof save!=='function'){setMsg('ERP Save not ready');return}
  if(!operator||!supervisor||!$('cfmSopApproved318').checked){setMsg('Operator, supervisor and verification tick are mandatory.');return}
  if(isMaterial(cat.code)&&!srlNo&&!(cat.code==='MR'&&inwardNo)){setMsg('Full SRL required (or Inward No for receipt before SRL allotment).');return}
  if(isClean(cat.code)&&!area){setMsg('Machine / Area is required for cleaning log.');return}
  if(!isMaterial(cat.code)&&!isClean(cat.code)&&(!/^CFM-\d+$/i.test(workNo)||!arr(st.pending).some(r=>norm(r.workNo)===norm(workNo)))){setMsg('Select an existing Work No. for production checklist.');return}
  const results={};let hasBad=false;
  panel.querySelectorAll('[data-sop-id]').forEach(x=>{results[x.dataset.sopId]=x.value;if(['HOLD','FAIL'].includes(x.value))hasBad=true});
  if(Object.values(results).some(v=>!v)){setMsg('Complete every numbered item with PASS, HOLD, FAIL or N/A.');return}
  if(hasBad&&!remark){setMsg('HOLD or FAIL needs a reason / corrective action in Remark.');return}
  if(isControlledSop(cat.code)&&Object.values(results).includes('N/A')&&!remark){setMsg('Audit: N/A needs a written justification in Remark.');return}
  const rec={id:'SOP-'+Date.now()+'-'+Math.random().toString(36).slice(2,9),schema:schemaId,code:cat.code,workNo,srlNo,inwardNo,area,shift,operator,supervisor,results,remark,timestamp:new Date().toISOString(),device:typeof deviceLabel==='function'?deviceLabel():'ERP',documentNo:isControlledSop(cat.code)?sopDocumentNo(cat.code):'',checklistNo:isControlledSop(cat.code)?sopChecklistNo(cat.code):'',sopRevision:isControlledSop(cat.code)?SOP_DOCUMENT_REV:'',checklistSnapshot:isControlledSop(cat.code)?cat.items.map(item=>({...item})):[]};
  const before=arr(st.sopRecords).slice();
  st.sopRecords=records().concat(rec);backup(st.sopRecords);
  try{
   save(false);
   render();
   setMsg('Checklist saved locally. Confirm Cloud Sync before relying on the record.');
  }
  catch(e){st.sopRecords=before;backup(before);setMsg('Save failed: '+String(e.message||e))}
 });
 $('cfmSopPrint321').addEventListener('click',()=>{
  const cat=CATALOG.find(x=>x.code===field('cfmSopCode318'));if(!cat)return;
  printSopCategory(cat,{
   workNo:field('cfmSopWork318'),area:field('cfmSopArea318'),
   srlNo:field('cfmSopSrl318'),inwardNo:field('cfmSopInward318'),
   date:field('cfmSopPrintDate322')
  });
 });
 $('cfmSopPrintDaily322').addEventListener('click',()=>sopPrintDaily(field('cfmSopPrintDate322')));
 $('cfmSopTicket318').addEventListener('click',()=>printDoc(field('cfmSopWork318'),false));
 $('cfmSopAnnex318').addEventListener('click',()=>{
   const w=field('cfmSopWork318');if(!/^CFM-\d+$/i.test(w))return setMsg('Work No required to print annexure');
   if(typeof window.openPrintWindow==='function')window.openPrintWindow('SOP Full Annexure '+w,annex(w,false),false);
 });
}
function mount(){
 try{wrapPrint();ensure();}catch(e){console.warn('CFM SOP mount:',e)}
 const dashboard=$('view-dashboard');if(dashboard&&!$('cfmSopOpen318')){
  const b=document.createElement('button');b.id='cfmSopOpen318';b.type='button';b.textContent='☑ SOP / Cleaning / Material Checklist';b.style.cssText='display:block;margin:10px 0;padding:12px 15px;border:1px solid #8dcce5;border-radius:11px;background:#f0f9ff;color:#145376;font:700 13px system-ui;cursor:pointer';
  b.addEventListener('click',()=>openPanel(''));dashboard.insertBefore(b,dashboard.firstChild);
 }
 document.querySelectorAll('#pendingList .data-card').forEach(card=>{
  if(card.querySelector('[data-cfm-sop]'))return;
  const work=(card.querySelector('.work')?.textContent||'').trim();
  if(!/^CFM-\d+$/i.test(work))return;
  const b=document.createElement('button');b.type='button';b.dataset.cfmSop='1';
  b.className='btn btn-sm';b.textContent='☑ SOP';
  b.addEventListener('click',()=>openPanel(work));
  (card.querySelector('.card-actions')||card).appendChild(b);
 });
}
let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;setTimeout(()=>{queued=false;mount()},350)}).observe(document.documentElement,{childList:true,subtree:true});
setTimeout(mount,500);setTimeout(mount,1600);
window.cfmSopOpen=work=>openPanel(work||'');
window.cfmSopPrintAnnexure=work=>printDoc(work,true);
})();
