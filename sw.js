const V='budget-v29';
const EX='ext-v1'; // libraries and fonts from other sites: kept across app updates so the app can open with no internet
const KEEP=[V,EX,'pdf-libs-v1'];
const EXT=['https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js','https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js','https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'];
const CORE=['./','./index.html','./manifest.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>Promise.race([caches.open(EX).then(c=>Promise.all(EXT.map(u=>c.match(u).then(m=>m||fetch(new Request(u,{mode:'no-cors'})).then(r=>c.put(u,r)))))).catch(()=>{}),new Promise(r=>setTimeout(r,8000))])).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>!KEEP.includes(x)).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET')return;
  // update check from the page: always ask the network, never the saved copy
  if(r.cache==='no-store')return;
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
    if(x&&(x.ok||x.type==='opaque')){const c=x.clone();caches.open(EX).then(h=>h.put(r,c))}
    return x}).catch(()=>m)));
});
