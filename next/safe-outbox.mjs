/* CFM Next — atomic, per-entry phone outbox.
   One IndexedDB row per Daily Work entry avoids list-overwrite races
   between sync, another entry, and multiple tabs. */
export function verifyDailyReceipt(remote, local) {
  if (!remote || !local || remote.id !== local.id) return false;
  if (remote.family !== 'departmentWork' || local.family !== 'departmentWork') return false;
  if (remote.record_key !== local.record_key || remote.updated_by !== local.updated_by) return false;
  const a = remote.data, b = local.data;
  if (!a || !b || a.cfmDailyEntryId !== b.cfmDailyEntryId || a.reportOnly !== true) return false;
  return JSON.stringify(stable(a)) === JSON.stringify(stable(b));
}
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])]));
  return value;
}
export function validateNewDailyEntry(item, ownerId) {
  const d=item?.data;
  return !!(ownerId && item && typeof item.id==='string'
    && /^[0-9a-f-]{36}$/.test(item.id)
    && item.family==='departmentWork'
    && item.updated_by===ownerId
    && item.record_key==='CFM-DW-'+item.id
    && d?.cfmDailyEntryId===item.record_key && d.reportOnly===true
    && typeof d.person==='string' && d.person.trim()
    && typeof d.department==='string' && d.department.trim()
    && typeof d.description==='string' && d.description.trim()
    && Number.isFinite(d.doneQty) && d.doneQty>=0
    && Number.isFinite(d.givenQty) && d.givenQty>=0);
}
export function createSafeOutbox(idb) {
  let openPromise=null;
  function open() {
    if(openPromise) return openPromise;
    if(!idb) return Promise.reject(new Error('Secure phone storage unavailable; entry not saved'));
    openPromise=new Promise((resolve,reject)=>{
      let req;
      try{req=idb.open('cfm-next-safe-outbox',1)}
      catch(e){reject(e);return}
      req.onupgradeneeded=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains('dailyEntries'))
          db.createObjectStore('dailyEntries',{keyPath:'id'});
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||new Error('Cannot open safe phone storage'));
      req.onblocked=()=>reject(new Error('Phone storage upgrade blocked by another ERP tab'));
    }).catch(err=>{openPromise=null;throw err});
    return openPromise;
  }
  async function change(mode, callback) {
    const db=await open();
    return new Promise((resolve,reject)=>{
      let result;
      const tx=db.transaction('dailyEntries',mode), store=tx.objectStore('dailyEntries');
      tx.oncomplete=()=>resolve(result);
      tx.onabort=()=>reject(tx.error||new Error('Phone storage transaction cancelled'));
      tx.onerror=()=>{}; // onabort handles the transaction failure.
      try{callback(store,v=>{result=v})}
      catch(e){try{tx.abort()}catch(_){}reject(e)}
    });
  }
  return {
    async put(ownerId,item) {
      if(!validateNewDailyEntry(item,ownerId)) throw new Error('Invalid Daily Work entry; not saved');
      await change('readwrite',(store)=>{store.put({id:item.id,ownerId,item})});
      return item.id;
    },
    async list(ownerId) {
      return change('readonly',(store,set)=>{
        const req=store.getAll();
        req.onsuccess=()=>set((req.result||[])
          .filter(row=>row.ownerId===ownerId)
          .map(row=>row.item));
      });
    },
    async remove(ownerId,itemId) {
      await change('readwrite',(store)=>{
        const req=store.get(itemId);
        req.onsuccess=()=>{if(req.result?.ownerId===ownerId) store.delete(itemId)};
      });
    },
    async importLegacy(ownerId, storage) {
      if(!storage) return 0;
      const key='cfm_next_work_outbox_'+ownerId;
      const raw=storage.getItem(key);
      if(!raw) return 0;
      let rows;
      try{rows=JSON.parse(raw)}
      catch(_){throw Error('Old pending list is damaged; retained for manual recovery')}
      if(!Array.isArray(rows)) throw Error('Old pending list is invalid; retained');
      for(const item of rows) await this.put(ownerId,item);
      storage.removeItem(key); // only after every row committed to IndexedDB
      return rows.length;
    }
  };
}
