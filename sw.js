const V='budget-v6';
const KEEP=[V,'pdf-libs-v1'];
const CORE=['./','./index.html','./manifest.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>!KEEP.includes(x)).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET')return;
  const u=new URL(r.url);
  // never cache Firebase/Google API traffic (auth, Firestore)
  if(/googleapis\.com$|firebaseio\.com$|firebaseapp\.com$|google\.com$/.test(u.hostname)&&!/fonts\./.test(u.hostname))return;
  // live data and chat: always go to the network, never cache (news must stay fresh)
  if(/(^|\.)workers\.dev$|(^|\.)tawk\.to$|(^|\.)tally\.so$|guardianapis\.com$/.test(u.hostname))return;
  if(r.mode==='navigate'){
    // open instantly from the saved copy, refresh it quietly in the background (new version is used on the next open)
    e.respondWith(caches.open(V).then(async c=>{
      const m=await c.match('./index.html');
      const net=fetch(r).then(x=>{if(x&&x.ok)c.put('./index.html',x.clone());return x}).catch(()=>null);
      e.waitUntil(net);
      return m||(await net)||Response.error();
    }));
    return;
  }
  if(u.origin===location.origin){
    // your own files (style.css, app.js, icons): show the saved copy now, refresh it in the background
    e.respondWith(caches.open(V).then(async c=>{
      const m=await c.match(r);
      const net=fetch(r).then(x=>{if(x&&x.ok)c.put(r,x.clone());return x}).catch(()=>null);
      e.waitUntil(net);
      return m||(await net)||Response.error();
    }));
    return;
  }
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(x=>{
    if(x&&(x.ok||x.type==='opaque')){const c=x.clone();caches.open(V).then(h=>h.put(r,c))}
    return x}).catch(()=>m)));
});
