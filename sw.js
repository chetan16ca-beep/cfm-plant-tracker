const CACHE='cfm-plant-v44-1';
const ASSETS=["./","./index.html","./manifest.json","./icons/icon.svg","chunks/s1-000.txt","chunks/s2-000.txt","chunks/s2-001.txt","chunks/s2-002.txt","chunks/s2-003.txt","chunks/s2-004.txt","chunks/s2-005.txt","chunks/s2-006.txt","chunks/s2-007.txt","chunks/s2-008.txt","chunks/s3-000.txt","chunks/s3-001.txt","chunks/s4-000.txt","chunks/s4-001.txt","chunks/s4-002.txt","chunks/s4-003.txt","chunks/s4-004.txt","chunks/s4-005.txt","chunks/s4-006.txt","chunks/s4-007.txt","chunks/s4-008.txt","chunks/s4-009.txt","chunks/s4-010.txt","chunks/s4-011.txt","chunks/s4-012.txt","chunks/s4-013.txt","chunks/s4-014.txt"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{
    if(!r||r.status!==200)return r;
    const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;
  }).catch(()=>caches.match('./index.html'))));
});
