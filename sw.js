const CACHE='cfm-plant-v58-shell';
const BASE=self.registration.scope;
const SHELL=[BASE,BASE+'index.html',BASE+'manifest.json',BASE+'icons/icon-192.svg',BASE+'icons/icon-512.svg'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(
    fetch(e.request).then(r=>{
      if(r&&r.status===200){
        const cp=r.clone();
        caches.open(CACHE).then(c=>c.put(e.request,cp)).catch(()=>{});
      }
      return r;
    }).catch(()=>caches.match(e.request).then(r=>r||caches.match(BASE+'index.html')))
  );
});

function notificationOptions(payload={}){
  return {
    body:payload.body||'New plant update',
    icon:BASE+'icons/icon-192.svg',
    badge:BASE+'icons/icon-192.svg',
    tag:payload.tag||('cfm-'+Date.now()),
    renotify:true,
    vibrate:[180,80,180],
    data:{url:payload.url||BASE,...(payload.data||{})},
    actions:[{action:'open',title:'Open ERP'}]
  };
}

self.addEventListener('message',e=>{
  const d=e.data||{};
  if(d.type==='SHOW_NOTIFICATION'){
    e.waitUntil(self.registration.showNotification(d.title||'CFM Plant Tracker',notificationOptions(d)));
  }
});

self.addEventListener('push',e=>{
  let payload={};
  try{payload=e.data?e.data.json():{}}catch(_){payload={body:e.data?e.data.text():'New update'}}
  const title=payload.title||'CFM Plant Tracker';
  e.waitUntil(self.registration.showNotification(title,notificationOptions(payload)));
});

self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const target=(e.notification.data&&e.notification.data.url)||BASE;
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const c of list){
      if('focus' in c){c.navigate(target).catch(()=>{});return c.focus()}
    }
    return clients.openWindow?clients.openWindow(target):undefined;
  }));
});