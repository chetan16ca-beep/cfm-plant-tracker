/* CFM NEXT offline shell only. Never cache ERP database writes, credentials or Supabase results. */
const CACHE='cfm-next-shell-20261124-v1';
const BASE=self.registration.scope;
const ASSETS=[new URL('./index.html',BASE).href,new URL('./manifest.webmanifest',BASE).href];
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  for(const url of ASSETS){
   try{const res=await fetch(url,{cache:'no-store'});if(res.ok)await cache.put(url,res)}catch(_){}
  }
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k.startsWith('cfm-next-shell-')&&k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET')return;
 const url=new URL(req.url);
 if(url.origin!==location.origin||!url.pathname.startsWith(new URL(BASE).pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{
   const res=await fetch(req,{cache:'no-store'});
   if(res.ok&&res.type!=='opaque')try{await cache.put(req,res.clone())}catch(_){}
   return res;
  }catch(_){
   const cached=await cache.match(req,{ignoreSearch:true});
   if(cached)return cached;
   if(req.mode==='navigate'){
    const shell=await cache.match(new URL('./index.html',BASE).href);
    if(shell)return shell;
   }
   return Response.error();
  }
 })());
});
