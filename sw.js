// CFM PWA: network-first for live ERP UI; offline fallback only.
// No IndexedDB, localStorage, Supabase order/stock changes.
const CACHE='cfm-plant-ui-20261031-v227-existing-po-alert';
const BASE=self.registration.scope;
const SHELL=[BASE+'index.html',BASE+'manifest.json',BASE+'icons/icon-192.svg',BASE+'icons/icon-512.svg'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(async cache=>{
    for(const url of SHELL){try{await cache.add(new Request(url,{cache:'no-store'}))}catch(e){}}
  }));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith('cfm-plant-')&&key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

async function freshOrCached(request){
  const cache=await caches.open(CACHE);
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response.ok && response.type!=='opaque'){
      try{await cache.put(request,response.clone())}catch(e){}
    }
    return response;
  }catch(error){
    const cached=await cache.match(request,{ignoreSearch:true});
    if(cached)return cached;
    if(request.mode==='navigate'){
      const shell=await cache.match(BASE+'index.html',{ignoreSearch:true});
      if(shell)return shell;
    }
    return Response.error();
  }
}

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin===location.origin){
    const isAppAsset=url.pathname.startsWith(new URL(BASE).pathname);
    if(isAppAsset){
      // Online users always get fresh HTML, scripts, chunks and all other app assets.
      event.respondWith(freshOrCached(req));
    }
  }
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
self.addEventListener('message',event=>{
  const d=event.data||{};
  if(d.type==='SKIP_WAITING')self.skipWaiting();
  if(d.type==='SHOW_NOTIFICATION'){
    event.waitUntil(self.registration.showNotification(d.title||'CFM Plant Tracker',notificationOptions(d)));
  }
});
self.addEventListener('push',event=>{
  let payload={};
  try{payload=event.data?event.data.json():{}}catch(e){payload={body:event.data?event.data.text():'New update'}}
  event.waitUntil(self.registration.showNotification(payload.title||'CFM Plant Tracker',notificationOptions(payload)));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=(event.notification.data&&event.notification.data.url)||BASE;
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const client of list){
      if('focus' in client){
        client.navigate(target).catch(()=>{});
        return client.focus();
      }
    }
    return clients.openWindow?clients.openWindow(target):undefined;
  }));
});
