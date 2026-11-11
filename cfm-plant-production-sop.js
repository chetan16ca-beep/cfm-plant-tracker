/* CFM Plant Production SOP V253 - 11 Nov 2026
   Adds operator-side approval and production handover guards.
   Does not mutate historic records, auto-deduct meters, or write to Cloud by itself.
   The existing ERP Save & Cloud Sync remain the only persistence mechanism. */
(function () {
  'use strict';
  const SOP_DATE = '2026-11-11';
  const $ = (id) => document.getElementById(id);
  const norm = (v) => String(v == null ? '' : v).trim().toUpperCase();
  const number = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
  const arr = (v) => Array.isArray(v) ? v : [];
  const getState = () => { try { return typeof state !== 'undefined' ? state : null; } catch (_) { return null; } };
  const get = (form, key) => String(form?.elements.namedItem(key)?.value ?? '').trim();
  const display = (msg) => {
    const node = $('cfmSopError');
    if (node) { node.hidden = false; node.textContent = 'SOP HOLD — ' + msg; }
    try { typeof toast === 'function' ? toast('SOP HOLD: ' + msg) : console.warn('SOP HOLD:', msg); } catch (_) { console.warn(msg); }
  };
  const canonicalStage = (v) => {
    const p = norm(v);
    if (p.includes('FINAL CHECK') || p === 'QC' || p.includes('QUALITY')) return 'FINAL CHECKING';
    if (p.includes('THREAD')) return 'THREAD CUTTING';
    if (p.includes('STITCH')) return 'STITCHING';
    if (p.includes('GUN') || p.includes('FINISH')) return 'GUN';
    if (p.includes('PACK')) return 'PACKING';
    if (p.includes('CUT')) return 'CUTTING';
    return '';
  };
  const STAGES = ['CUTTING', 'STITCHING', 'THREAD CUTTING', 'GUN', 'FINAL CHECKING', 'PACKING'];
  const matchOrder = (s, work) => arr(s?.pending).find((r) => norm(r.workNo) === norm(work));
  const matchRoll = (s, entered) => {
    const value = norm(entered);
    const rolls = arr(s?.store);
    const direct = rolls.find((r) => norm(r.srlNo) === value);
    if (direct) return direct;
    const last = (value.match(/(?:^|\/)(\d{1,4})$/) || [])[1];
    if (!last) return null;
    const candidates = rolls.filter((r) => norm(r.srlNo).endsWith('/' + last.padStart(4, '0')));
    return candidates.length === 1 ? candidates[0] : null;
  };
  const stageDone = (s, work, process, excludeIndex = null) =>
    arr(s?.departmentWork).reduce((sum, r, i) =>
      sum + ((i !== excludeIndex && norm(r.workNo) === norm(work) && canonicalStage(r.process) === process)
        ? Math.max(0, number(r.doneQty)) : 0), 0);
  const goodCutting = (s, work) => arr(s?.cutting).some((r) => {
    if (norm(r.workNo) !== norm(work) || r.wastage || norm(r.srlNo) === 'W' ||
        r._stockDeductionBlocked === true || r._redPenPendingStock === true ||
        r._photoReviewPending === true) return false;
    const photo = /PHOTO|RED PEN/i.test(String(r.entryType || ''));
    if (photo && String(r.date || '') >= SOP_DATE && r._redPenVerified !== true) return false;
    return number(r.cutQty) > 0 && number(r.length) > 0 && number(r.height) > 0 &&
      !!matchRoll(s, r.srlNo);
  });
  let cuttingEditIndex = null;
  let deptEditIndex = null;
  function wrapForms() {
    if (typeof window.openCuttingForm === 'function' && !window.openCuttingForm.__cfmSop) {
      const previous = window.openCuttingForm;
      const wrapped = function (i, preset) {
        cuttingEditIndex = Number.isInteger(i) ? i : null;
        return previous.apply(this, arguments);
      };
      wrapped.__cfmSop = true;
      window.openCuttingForm = wrapped;
    }
    if (typeof window.markWorkDone === 'function' && !window.markWorkDone.__cfmSop) {
      const previous = window.markWorkDone;
      const guarded = function (i) {
        const s = getState();
        const wo = s && arr(s.pending)[i];
        if (!wo) { display('Work Order not found. Refresh ERP before closing production.'); return false; }
        const qty = number(wo.orderQty);
        const packed = stageDone(s, wo.workNo, 'PACKING');
        if (!(qty > 0) || packed + 0.001 < qty) {
          const msg = 'Work Done blocked for ' + wo.workNo +
            ': Packing supervisor handover ' + packed +
            ' / required ' + qty + ' pcs. Enter verified Packing before Work Done.';
          display(msg);
          alert('SOP HOLD: ' + msg);
          return false;
        }
        return previous.apply(this, arguments);
      };
      guarded.__cfmSop = true;
      window.markWorkDone = guarded;
    }
    if (typeof window.openDeptWorkForm === 'function' && !window.openDeptWorkForm.__cfmSop) {
      const previous = window.openDeptWorkForm;
      const wrapped = function (i) {
        deptEditIndex = Number.isInteger(i) ? i : null;
        return previous.apply(this, arguments);
      };
      wrapped.__cfmSop = true;
      window.openDeptWorkForm = wrapped;
    }
  }
  function formKind(form) {
    if (!form || !$('editDialog')?.open) return '';
    const exists = (n) => !!form.elements.namedItem(n);
    if (exists('srlNo') && exists('cutQty') && exists('length') && exists('height')) return 'cutting';
    if (exists('process') && exists('person') && exists('doneQty') && exists('workNo')) return 'department';
    if (exists('dispatchStatus') && exists('dispatchQty')) return 'dispatch';
    if (exists('orderQty') && exists('workNo') && exists('priority') && !exists('cutQtyHidden')) return 'order';
    return '';
  }
  function addSignoff(kind) {
    const fields = $('formFields');
    if (!fields || !kind) return;
    fields.querySelector('[data-sop-signoff]')?.remove();
    $('cfmSopError')?.remove();
    if (kind === 'order') return;
    const holder = document.createElement('section');
    holder.dataset.sopSignoff = kind;
    holder.style.cssText = 'grid-column:1/-1;padding:12px;border:1px solid #a9cbd5;border-radius:10px;background:#f3fbff;color:#123c54;font:13px/1.5 system-ui';
    const heading = document.createElement('strong');
    heading.textContent = 'CFM PRODUCTION SOP • Supervisor Verification';
    holder.append(heading);
    const help = document.createElement('p');
    help.style.cssText = 'margin:5px 0 9px';
    help.textContent = kind === 'cutting'
      ? 'Check Work No, real SRL and roll width, cutting size, quantity, stock and material usage before saving.'
      : kind === 'department'
        ? 'Confirm completed bag quantity and previous department handover. General activities without completed quantity stay allowed.'
        : 'Confirm packed quantity, dispatch documents and physical handover before marking DISPATCHED.';
    holder.append(help);
    if (kind !== 'department') {
      const label = document.createElement('label');
      label.textContent = 'Supervisor Name * ';
      const input = document.createElement('input');
      input.id = 'cfmSopSupervisor';
      input.type = 'text';
      input.maxLength = 90;
      input.autocomplete = 'name';
      input.style.cssText = 'display:block;width:100%;max-width:350px;box-sizing:border-box;margin:5px 0 10px;padding:9px;border:1px solid #9fb7c6;border-radius:7px';
      label.append(input); holder.append(label);
    }
    const label = document.createElement('label');
    label.style.cssText = 'display:flex;gap:9px;align-items:flex-start;font-weight:700;cursor:pointer';
    const check = document.createElement('input');
    check.id = 'cfmSopConfirm'; check.type = 'checkbox';
    check.style.cssText = 'width:18px;height:18px;flex:none;margin-top:2px';
    const copy = document.createElement('span');
    copy.textContent = 'I verified this job against the physical plant work and ERP records.';
    label.append(check, copy); holder.append(label);
    const error = document.createElement('div');
    error.id = 'cfmSopError'; error.hidden = true;
    error.setAttribute('role', 'alert');
    error.style.cssText = 'margin-top:9px;padding:8px;background:#fff2e9;border:1px solid #e59f87;color:#9c2f20;border-radius:7px;font-weight:800';
    holder.append(error);
    fields.append(holder);
  }
  function checkCutting(form, s) {
    const work = get(form, 'workNo');
    const wo = matchOrder(s, work);
    if (!wo) return 'Select an existing Work Order before Cutting.';
    const qty = number(get(form, 'cutQty'));
    const length = number(get(form, 'length'));
    const height = number(get(form, 'height'));
    const layer = number(get(form, 'layer'));
    if (!(qty > 0 && length > 0 && height > 0 && layer > 0) ||
        !Number.isInteger(qty) || !Number.isInteger(layer))
      return 'Cut Qty, Length, Height and Layer must be valid positive values.';
    if (!get(form, 'cuttingBy')) return 'Cutting By / operator name is mandatory.';
    const isWaste = norm(get(form, 'wastage')) === 'YES' || norm(get(form, 'srlNo')) === 'W';
    if (isWaste) {
      if (!get(form, 'remark')) return 'For wastage (W), add a reason in Remark.';
      return '';
    }
    const roll = matchRoll(s, get(form, 'srlNo'));
    if (!roll) return 'Select the correct, full Store SRL. Unknown or ambiguous roll is HOLD.';
    if (['NOT_PHYSICAL', 'METER_PENDING'].includes(norm(roll._physicalReconStatus)) ||
        ['BLOCKED', 'HOLD', 'ZERO', 'CLOSED'].includes(norm(roll.status)))
      return 'This SRL is not approved for material issue. Verify Store physical stock.';
    const width = number(roll.width);
    if (!(width > 0)) return 'Store SRL roll width is missing. Verify the actual roll width.';
    if (Math.min(length, height) > width + 0.1)
      return 'Cut part exceeds the real Store SRL roll width (' + width + ' inch).';
    const expected = length * height * qty * layer / width / 39.37;
    const old = Number.isInteger(cuttingEditIndex) ? arr(s.cutting)[cuttingEditIndex] : null;
    if (old && /PHOTO|RED PEN/i.test(String(old.entryType || '')))
      return 'Old photo cutting requires supervised photo-reconciliation, not direct edit; prevents duplicate SRL consumption.';
    const priorMeter = old && norm(old.srlNo) === norm(roll.srlNo) &&
      (!roll._physicalCountDate || String(old.date || '') > String(roll._physicalCountDate))
      ? (typeof cuttingUsedMtr === 'function' ? number(cuttingUsedMtr(old)) : 0) : 0;
    const live = typeof srlBalance === 'function' ? number(srlBalance(roll)) : number(roll.excelLiveBalanceMtr);
    if (!Number.isFinite(expected) || expected <= 0) return 'Invalid meter consumption calculation.';
    if (expected > live + priorMeter + 0.01)
      return 'Insufficient SRL balance. Calculated use ' + expected.toFixed(3) +
        ' MTR, available ' + (live + priorMeter).toFixed(3) + ' MTR. No Cutting saved.';
    return '';
  }
  function checkDepartment(form, s) {
    const stage = canonicalStage(get(form, 'process'));
    const doneRaw = get(form, 'doneQty');
    if (!stage || doneRaw === '' || number(doneRaw) <= 0) return '';
    const work = get(form, 'workNo');
    const wo = matchOrder(s, work);
    if (!wo) return 'Production Done Qty requires a valid Work Order. For general duties choose GENERAL WORK.';
    if (!get(form, 'person') || get(form, 'person') === '__NEW_PERSON__' && !get(form, 'newPerson'))
      return 'Select worker name before entering Done Qty.';
    if (!get(form, 'supervisor')) return 'Supervisor name is mandatory for production handover.';
    if (!Number.isInteger(Number(doneRaw)) || number(doneRaw) < 0) return 'Done Qty must be a whole number.';
    const orderQty = number(wo.orderQty);
    const done = number(doneRaw);
    const isEdit = $('dialogTitle')?.textContent?.startsWith('Edit Person Work');
    const exclude = isEdit && Number.isInteger(deptEditIndex) ? deptEditIndex : null;
    const already = stageDone(s, work, stage, exclude);
    if (already + done > orderQty + 0.001)
      return stage + ': total Done Qty cannot exceed Work Order Qty (' + orderQty + ').';
    if (stage === 'CUTTING') {
      if (!goodCutting(s, work))
        return 'No verified Cutting entry / SRL recorded for this Work Order. Do not hand over to Stitching.';
      return '';
    }
    // Final Checking is an optional recorded handover. Once recorded it becomes
    // mandatory for Packing, otherwise Packing follows Gun Finish directly.
    const anyQC = stageDone(s, work, 'FINAL CHECKING') > 0;
    const prev = stage === 'PACKING' && !anyQC ? 'GUN' : STAGES[STAGES.indexOf(stage) - 1];
    const predecessorQty = stageDone(s, work, prev, exclude);
    if (already + done > predecessorQty + 0.001)
      return stage + ' cannot exceed ' + prev + ' handover. Available ' +
        Math.max(0, predecessorQty - already) + ' pcs.';
    return '';
  }
  function checkDispatch(form, s) {
    const work = (String($('dialogTitle')?.textContent || '').match(/CFM-\d+/i) || [])[0];
    const wo = matchOrder(s, work);
    const status = norm(get(form, 'dispatchStatus'));
    if (status !== 'DISPATCHED' || !wo) return '';
    const previouslyDispatched = norm(wo.dispatchStatus) === 'DISPATCHED' || !!wo.dispatchDate;
    if (previouslyDispatched) return ''; // Legacy records can still be edited.
    const qty = number(get(form, 'dispatchQty'));
    if (!(qty > 0 && Number.isInteger(qty))) return 'Enter actual positive Dispatch Qty.';
    const packed = stageDone(s, work, 'PACKING');
    if (qty > packed + 0.001)
      return 'Dispatch blocked: Packing handover is ' + packed + ' pcs, Dispatch Qty ' + qty + ' pcs.';
    const docReady = [get(form, 'billStatus'), get(form, 'challanStatus')].some((x) =>
      ['DONE', 'NOT REQUIRED', 'READY'].includes(norm(x)));
    if (!docReady) return 'Bill or Challan status must be verified before Dispatch.';
    if (!get(form, 'transporter')) return 'Enter Transporter / Courier for physical Dispatch handover.';
    return '';
  }
  function checkOrder(form, s) {
    if ($('dialogTitle')?.textContent !== 'Add Pending Order') return '';
    const work = get(form, 'workNo');
    if (!/^CFM-\d+$/i.test(work)) return 'Enter a valid CFM Work Order Number.';
    if (!get(form, 'party')) return 'Party name is required.';
    if (!get(form, 'description')) return 'Order Description 1 is required.';
    if (!(number(get(form, 'orderQty')) > 0)) return 'Order Quantity must be greater than zero.';
    return '';
  }
  const check = (kind, form, s) => {
    if (kind === 'cutting') return checkCutting(form, s);
    if (kind === 'department') return checkDepartment(form, s);
    if (kind === 'dispatch') return checkDispatch(form, s);
    if (kind === 'order') return checkOrder(form, s);
    return '';
  };
  function needsApproval(kind, form, s) {
    if (kind === 'cutting') return true;
    if (kind === 'department') return !!canonicalStage(get(form, 'process')) && number(get(form, 'doneQty')) > 0;
    if (kind === 'dispatch') {
      const work = (String($('dialogTitle')?.textContent || '').match(/CFM-\d+/i) || [])[0];
      const wo = matchOrder(s, work);
      return norm(get(form, 'dispatchStatus')) === 'DISPATCHED' && wo &&
        !(norm(wo.dispatchStatus) === 'DISPATCHED' || wo.dispatchDate);
    }
    return false;
  }
  function stampApproval(kind, form) {
    const sup = kind === 'department' ? get(form, 'supervisor') : $('cfmSopSupervisor')?.value?.trim();
    const remark = form.elements.namedItem(kind === 'dispatch' ? 'accountsRemark' : 'remark');
    if (!remark || !sup) return;
    if (!/SOP verified by:/i.test(String(remark.value || '')))
      remark.value = String(remark.value || '').trim() +
        (remark.value?.trim() ? '\n' : '') +
        'SOP verified by: ' + sup + ' | ' + new Date().toLocaleString('en-IN');
  }
  // Legacy Batch Report has its own direct save paths. Route them through the same SOP.
  const BATCH_STAGES = ['CUTTING','STITCHING','THREAD CUTTING','GUN / FINISHING','FINAL CHECKING','PACKING'];
  function setupBatchSop() {
    const add = $('batchAddOne');
    if (!add || $('cfmBatchSopApproval')) return;
    const box = document.createElement('section');
    box.id = 'cfmBatchSopApproval';
    box.style.cssText = 'grid-column:1/-1;border:1px solid #a8ccd3;border-radius:9px;background:#f5fcff;margin:9px 0;padding:10px;font:13px/1.5 system-ui';
    const label = document.createElement('label');
    label.textContent = 'Supervisor Name *';
    const input = document.createElement('input');
    input.id = 'cfmBatchSopSupervisor';input.type = 'text';input.maxLength = 90;
    input.style.cssText = 'display:block;max-width:350px;width:100%;padding:8px;margin:4px 0 9px;box-sizing:border-box';
    label.append(input);box.append(label);
    const checkedLabel = document.createElement('label');
    checkedLabel.style.cssText = 'display:flex;gap:8px;font-weight:700';
    const check = document.createElement('input');check.type = 'checkbox';check.id = 'cfmBatchSopChecked';
    const span = document.createElement('span');
    span.textContent = 'I checked production quantity, previous handover and actual work.';
    checkedLabel.append(check,span);box.append(checkedLabel);
    add.parentElement?.insertBefore(box,add);
    add.textContent = '✓ Save Verified Stage';
    const legacy = $('batchSaveAll');
    if (legacy) legacy.title = 'Old unverified draft save is disabled. Use Save Verified Stage.';
  }
  function batchWork() {
    return (String($('dialogTitle')?.textContent || '').match(/CFM-\d+/i) || [])[0] || '';
  }
  function postBatchStage(work, process, person, qty, supervisor, remark) {
    const s = getState();
    const wo = s && matchOrder(s,work);
    if (!wo) return 'Work Order not found in ERP.';
    const stage = canonicalStage(process);
    if (!stage && !/FINAL CHECK|QUALITY/i.test(process))
      return 'Choose a production stage.';
    if (!person.trim()) return 'Worker Name is mandatory.';
    if (!supervisor.trim()) return 'Supervisor Name is mandatory.';
    if (!Number.isSafeInteger(Number(qty)) || !(Number(qty)>0))
      return 'Completed Qty must be a positive whole number.';
    const form = {elements:{namedItem:(k)=>({value:({
      workNo:work, process, person, supervisor, doneQty:qty, newPerson:''
    })[k] || ''})}};
    const issue = checkDepartment(form,s);
    if (issue) return issue;
    if (typeof save !== 'function') return 'ERP Save is not ready; refresh before posting.';
    const date = typeof todayISO === 'function' ? todayISO() : new Date().toISOString().slice(0,10);
    const baseRemark = String(remark || '').trim();
    const stamped = (baseRemark ? baseRemark + '\n' : '') +
      'SOP verified by: ' + supervisor.trim() + ' | ' + new Date().toLocaleString('en-IN');
    const rec = {
      workNo:work,party:wo.party||'',description:wo.description||'',description2:wo.description2||'',
      workDescription:baseRemark||wo.description||'',person:person.trim(),process,
      department:process,givenQty:number(wo.orderQty),orderQty:number(wo.orderQty),
      doneQty:Number(qty),pendingQty:Math.max(0,number(wo.orderQty)-Number(qty)),
      checklist:true,date,remark:stamped,supervisor:supervisor.trim(),
      updatedAt:new Date().toISOString(),
      updatedBy:typeof deviceLabel === 'function' ? deviceLabel() : 'CFM SOP'
    };
    if (!Array.isArray(s.departmentWork)) s.departmentWork = [];
    s.departmentWork.push(rec);
    try { save(); } catch (e) {
      s.departmentWork.pop();
      return 'Could not save verified stage: ' + String(e?.message || e);
    }
    try { typeof toast === 'function' && toast(process + ' • ' + Number(qty) + ' pcs verified and saved'); } catch (_) {}
    setTimeout(() => {
      try { if (typeof window.cfmSafeBatchOpen === 'function') window.cfmSafeBatchOpen(work); }
      catch (e) { console.warn('Batch report refresh',e); }
    },160);
    return '';
  }
  function bindBatchSop() {
    if (!document.__cfmBatchSopBound) {
      document.__cfmBatchSopBound = true;
      document.addEventListener('click',(e)=>{
        const button = e.target?.closest?.('#batchAddOne,#batchSaveAll');
        if (!button) return;
        // Capture before the legacy draft/save listeners; do not allow an unapproved write.
        e.preventDefault();e.stopImmediatePropagation();
        setupBatchSop();
        if (button.id === 'batchSaveAll') {
          alert('SOP HOLD: Old draft Save All is disabled. Use Save Verified Stage, one department at a time.');
          return;
        }
        const work = batchWork();
        const stage = $('batchStageOne')?.value || '';
        const person = String($('batchPersonOne')?.value || '').trim();
        const qty = Number($('batchDoneOne')?.value || 0);
        const supervisor = String($('cfmBatchSopSupervisor')?.value || '').trim();
        const remark = String($('batchRemarkOne')?.value || '').trim();
        if (!$('cfmBatchSopChecked')?.checked) {
          alert('SOP HOLD: Supervisor must verify work and tick the Batch approval.');
          return;
        }
        if ($('batchDraftList')?.children.length) {
          alert('SOP HOLD: Old unsaved drafts exist. Close the Batch Report and reopen; do not save them without checking.');
          return;
        }
        const issue = postBatchStage(work,stage,person,qty,supervisor,remark);
        if (issue) alert('SOP HOLD: ' + issue);
      },true);
    }
    if (typeof window.cfmBatchRowSave === 'function' && !window.cfmBatchRowSave.__cfmSop) {
      const guarded = function(work,tr,i) {
        const stage = BATCH_STAGES[i];
        if (!stage || !tr) return false;
        const person = String(tr.querySelector('.batch-person')?.value || '').trim();
        const qty = Number(tr.querySelector('.batch-done')?.value || 0);
        const remark = String(tr.querySelector('.batch-remark')?.value || '').trim();
        const supervisor = window.prompt('CFM SOP: Supervisor Name for ' + stage + ' (' + work + ')');
        if (!supervisor) return false;
        if (!window.confirm('I verified previous stage, real quantity and this worker entry. Continue?')) return false;
        const issue = postBatchStage(work,stage,person,qty,supervisor,remark);
        if (issue) { alert('SOP HOLD: ' + issue); return false; }
        return true;
      };
      guarded.__cfmSop=true;
      window.cfmBatchRowSave=guarded;
    }
  }
  function attach() {
    wrapForms();
    bindBatchSop();
    setupBatchSop();
    const button = $('saveFormBtn');
    if (!button || button.dataset.cfmSopBound === '1') return;
    button.dataset.cfmSopBound = '1';
    button.addEventListener('click', (e) => {
      const form = $('editForm');
      const kind = formKind(form);
      if (!kind) return;
      const s = getState();
      if (!s) { e.preventDefault(); e.stopImmediatePropagation(); display('ERP data is not loaded. Refresh safely and retry.'); return; }
      let issue = '';
      try { issue = check(kind, form, s); } catch (err) {
        issue = 'Unable to verify SOP: ' + (err?.message || String(err));
      }
      if (!issue && needsApproval(kind, form, s)) {
        if (!$('cfmSopConfirm')?.checked) issue = 'Supervisor must verify and tick the SOP confirmation.';
        else if (kind !== 'department' && !$('cfmSopSupervisor')?.value?.trim())
          issue = 'Supervisor Name is mandatory for SOP approval.';
      }
      if (issue) {
        e.preventDefault(); e.stopImmediatePropagation(); display(issue);
        return;
      }
      if (needsApproval(kind, form, s)) stampApproval(kind, form);
    }, {capture: true});
    const dlg = $('editDialog'), fields = $('formFields');
    if (dlg && fields) {
      let observedKind = '';
      const render = () => {
        setupBatchSop();
        if (!dlg.open) { observedKind = ''; return; }
        const kind = formKind($('editForm'));
        if (kind && (observedKind !== kind || !fields.querySelector('[data-sop-signoff]'))) {
          observedKind = kind; addSignoff(kind);
        }
      };
      const observer = new MutationObserver(() => render());
      observer.observe(dlg, {attributes:true,attributeFilter:['open']});
      observer.observe(fields, {childList:true});
      setTimeout(render, 0);
    }
  }
  function dashboard() {
    const home = $('view-dashboard');
    const s = getState();
    if (!home || !s) return;
    let panel = $('cfmSopPanel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'cfmSopPanel';
      panel.style.cssText = 'margin:12px 2px;padding:13px;border:1px solid #b9d9db;border-radius:13px;background:#f8fdfd;color:#17394a;font:13px/1.5 system-ui';
      const at = home.querySelector('.section-head') || home.firstElementChild;
      if (at) at.insertAdjacentElement('afterend', panel); else home.prepend(panel);
    }
    const today = (typeof todayISO === 'function' ? todayISO() : new Date().toISOString().slice(0,10));
    const production = arr(s.departmentWork).filter((r) => String(r.date || '') === today);
    const held = arr(s.cutting).filter((r) => r._stockDeductionBlocked === true ||
      r._redPenPendingStock === true || r._photoReviewPending === true).length;
    panel.replaceChildren();
    const title = document.createElement('strong');
    title.style.cssText = 'font-size:15px;color:#126184';
    title.textContent = '🏭 CFM Plant Production SOP • ACTIVE';
    const status = document.createElement('p');
    status.style.cssText = 'margin:5px 0 10px';
    status.textContent = 'Today ' + today + ' | Department Entries: ' + production.length +
      ' | Cutting HOLD rows: ' + held + ' | 4 PM: supervisor review.';
    panel.append(title,status);
    const note = document.createElement('p');
    note.style.cssText = 'margin:4px 0 10px;color:#486679';
    note.textContent = 'WO → Store SRL → Cutting (stock verified) → Cutting handover → Stitching → Thread Cut → Gun Finish → Packing → Dispatch. Previous-stage verified quantity is required.';
    panel.append(note);
    const buttons = document.createElement('div');
    buttons.style.cssText = 'display:flex;flex-wrap:wrap;gap:7px';
    [['📋 Work Orders','pending'],['📦 Store SRL','store'],['✂️ Cutting','cutting'],['👷 Stage Handover','deptwork'],['🚚 Dispatch','docs']].forEach(([label,view])=>{
      if (!$('view-' + view)) return;
      const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
      b.style.cssText = 'border:1px solid #b5d5e2;border-radius:7px;background:white;color:#155474;padding:7px 9px;font:700 12px system-ui';
      b.addEventListener('click',()=>{if(typeof window.showView==='function')window.showView(view)});
      buttons.append(b);
    });
    panel.append(buttons);
  }
  function start() {
    attach(); dashboard();
    setInterval(() => { try { attach(); dashboard(); } catch(e) { console.warn('CFM SOP status',e); } }, 12000);
  }
  window.CFM_PLANT_SOP = {version:'253',effectiveDate:SOP_DATE,validate:(kind,obj) => check(kind, obj, getState())};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();