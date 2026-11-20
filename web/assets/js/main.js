/* NOCTARA v2 — interface layer: loader-gated reveal, flight chapters,
   idle drift, hover-transition coupling, generated audio with low-pass muffle. */
(function(){
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const loader=$('#loader'), ui=$('#ui');

  // Loader: fades when the engine reports ready (fallback timeout so nobody is trapped)
  let revealed=false;
  function ready(){ if(revealed) return; revealed=true; loader.classList.add('gone'); ui.classList.add('on'); }
  window.addEventListener('noctara:ready',ready); setTimeout(ready,3500);

  // Lenis smooth scroll
  let lenis=null;
  if(window.Lenis && !reduced){ lenis=new Lenis({duration:1.3,smoothWheel:true}); function raf(t){ lenis.raf(t); requestAnimationFrame(raf);} requestAnimationFrame(raf); }
  $$('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{
    const id=a.getAttribute('href'); if(id.length>1){ const el=document.querySelector(id); if(el){ e.preventDefault(); if(lenis) lenis.scrollTo(el,{offset:0}); else el.scrollIntoView({behavior:reduced?'auto':'smooth'}); } }
  }));

  // Chapters along the flight
  const CHAPTERS=[
    {at:0.00,k:'NOCTARA SPIRITS — A CINEMATIC FLIGHT',t:'Enter the<br/>unknown.',c:'Every spirit has a story.<br/>Scroll — and fly into ours.',s:'HOVER THE CIRCLE — THE VALLEY HOLDS ITS BREATH',rail:'01 — AWAKENING',go:true},
    {at:0.16,k:'Chapter II — The Journey',t:'Through ruins<br/>&amp; <em>embers</em>',c:'The camera is yours now. Blooms open<br/>as you near them; the cursor pushes the valley aside.',s:'MOVE YOUR CURSOR — THE BLOOMS RECOIL &amp; GLOW',rail:'02 — JOURNEY',go:false},
    {at:0.38,k:'Chapter III — The Portal',t:'Touch the<br/><em>crimson deep</em>',c:'Ahead, the portal turns in its arch.<br/>Fly closer — its liquid remembers every touch.',s:'THE RING AHEAD IS REAL GEOMETRY, NOT A PICTURE',rail:'03 — PORTAL',go:false},
    {at:0.58,k:'Chapter IV — The Sanctuary',t:'Three artifacts.<br/><em>One sanctuary.</em>',c:'Crimson. Obsidian. Ivory.<br/>They are waiting at the end of the valley.',s:'FULL COLLECTION WAITS BELOW THE FLIGHT',rail:'04 — SANCTUARY',go:false},
    {at:0.76,k:'Chapter V — The Transformation',t:'Pour.<br/><em>Become.</em>',c:'The valley thins into light.<br/>What was scattered becomes spirit.',s:'THE BLOOMS DISPERSE AS YOU ARRIVE',rail:'05 — TRANSFORMATION',go:false},
    {at:0.90,k:'Chapter VI — The Reveal',t:'Pour your<br/><em>spirit.</em>',c:'Chill your spirit. Shake your spirit.<br/>The collection is just below.',s:'SCROLL ON — ENTER THE SANCTUARY',rail:'06 — REVEAL',go:true},
  ];
  const kEl=$('#chKicker'), tEl=$('#chTitle'), cEl=$('#chCap'), sEl=$('#chSmall'), railFill=$('#railFill'), railLabel=$('#railLabel'), goBtn=$('#go');
  let curChapter=-1;
  function setChapter(i){
    if(i===curChapter) return; curChapter=i; const ch=CHAPTERS[i];
    const swap=()=>{ kEl.textContent=ch.k.replace(/&amp;/g,'&'); tEl.innerHTML=ch.t; cEl.innerHTML=ch.c; sEl.innerHTML=ch.s; railLabel.textContent=ch.rail; goBtn.style.visibility=ch.go?'visible':'hidden'; };
    if(window.gsap && !reduced && curChapter>=0){ gsap.to([kEl,tEl,cEl,sEl],{opacity:0,y:-14,duration:0.32,ease:'power2.in',onComplete(){ swap(); gsap.fromTo([kEl,tEl,cEl,sEl],{opacity:0,y:22},{opacity:1,y:0,duration:0.7,ease:'power3.out',stagger:0.06}); }}); }
    else swap();
  }
  setChapter(0);

  // Scroll -> flight progress (+ idle drift), past-flight state
  const flight=$('#flight');
  let lastScrollT=performance.now(), drift=0;
  function onFrame(){
    const fh=flight.offsetHeight-innerHeight;
    const raw=fh>0? Math.max(0,Math.min(1, scrollY/fh)) : 0;
    if(performance.now()-lastScrollT>2600 && raw>0.001 && raw<0.985 && !reduced){ drift=Math.min(0.06,drift+0.00035); } else if(scrollY<10){ drift=0; }
    const p=Math.min(1,raw+drift*(1-raw));
    if(window.__noctara) window.__noctara.setProgress(p);
    if(railFill) railFill.style.width=(p*100)+'%';
    let idx=0; CHAPTERS.forEach((ch,i)=>{ if(p>=ch.at) idx=i; }); setChapter(idx);
    // auto-disperse near transformation
    if(window.__noctara && !window.__hoverHeld){ const nearTrans=p>0.74&&p<0.9; if(nearTrans!==window.__transDisp){ window.__transDisp=nearTrans; nearTrans?window.__noctara.startHoverTransition():window.__noctara.stopHoverTransition(); } }
    document.body.classList.toggle('past', scrollY>flight.offsetHeight-innerHeight*0.6);
    requestAnimationFrame(onFrame);
  }
  window.addEventListener('scroll',()=>{ lastScrollT=performance.now(); },{passive:true});
  requestAnimationFrame(onFrame);

  // Hover transition on the round CTA (flight eases, blooms disperse, audio muffles)
  goBtn.addEventListener('pointerenter',()=>{ window.__hoverHeld=true; if(window.__noctara) window.__noctara.startHoverTransition(); });
  goBtn.addEventListener('pointerleave',()=>{ window.__hoverHeld=false; if(window.__noctara) window.__noctara.stopHoverTransition(); });
  goBtn.addEventListener('click',()=>{ const el=$('#collection'); if(lenis) lenis.scrollTo(el); else el.scrollIntoView({behavior:'smooth'}); });

  // Audio — generated drone through a low-pass; muted by default; hover muffles further
  let actx=null, master=null, filter=null, soundOn=false, muffled=false;
  function ensureAudio(){
    if(actx) return;
    actx=new (window.AudioContext||window.webkitAudioContext)();
    filter=actx.createBiquadFilter(); filter.type='lowpass'; filter.frequency.value=1200;
    master=actx.createGain(); master.gain.value=0;
    filter.connect(master); master.connect(actx.destination);
    [55,82.4,110.3].forEach((f,i)=>{ const o=actx.createOscillator(); o.type=i?'triangle':'sine'; o.frequency.value=f; const g=actx.createGain(); g.gain.value=i?0.1:0.45; o.connect(g); g.connect(filter); o.start(); });
  }
  window.__noctaraAudio=function(m){ muffled=m; if(actx&&filter) filter.frequency.linearRampToValueAtTime(m?320:1200, actx.currentTime+0.6); };
  $('#sound').addEventListener('click',function(){
    ensureAudio(); actx.resume(); soundOn=!soundOn;
    this.setAttribute('aria-pressed',String(soundOn));
    master.gain.linearRampToValueAtTime(soundOn?0.055:0, actx.currentTime+1.1);
  });

  // Cursor
  const cursor=$('#cursor'), ring=$('#cursorRing'); let cx=innerWidth/2,cy=innerHeight/2,rx=cx,ry=cy;
  window.addEventListener('pointermove',e=>{ cx=e.clientX; cy=e.clientY; cursor.style.left=cx+'px'; cursor.style.top=cy+'px'; });
  (function loop(){ rx+=(cx-rx)*0.15; ry+=(cy-ry)*0.15; ring.style.left=rx+'px'; ring.style.top=ry+'px'; requestAnimationFrame(loop); })();

  // Products
  const PRODUCTS=[
    {kicker:'N°01 — THE FIRST FIRE',name:'CRIMSON ORIGIN',desc:'Born from bitter cherry and smoked plum, finished in charred oak. The first spirit the traveler tasted after the portal — and the reason he stayed.',nose:'Bitter cherry, cacao husk, wet stone',palate:'Smoked plum, black pepper, blood orange',finish:'Long, warm, a whisper of ash & honey'},
    {kicker:'N°02 — THE BLUE HOUR',name:'OBSIDIAN VEIL',desc:'A midnight botanical distilled under low light. Juniper shadowed by black cardamom and a cold note of sea salt — the sanctuary at 2 a.m.',nose:'Juniper, black cardamom, inkberry',palate:'Dark citrus, sea salt, cold herbs',finish:'Dry, blue, impossibly clean'},
    {kicker:'N°03 — THE QUIET LIGHT',name:'IVORY ECLIPSE',desc:'An ivory liqueur of white tea, pear and vanilla ash. Soft on entry, then an eclipse — a dark core of toasted almond at the centre.',nose:'White tea, pear skin, almond blossom',palate:'Vanilla ash, baked pear, white pepper',finish:'Silken, luminous, lingering'}
  ];
  $$('.bottle-card').forEach(card=>card.addEventListener('click',()=>{
    $$('.bottle-card').forEach(c=>{c.classList.remove('is-active');c.setAttribute('aria-selected','false')});
    card.classList.add('is-active'); card.setAttribute('aria-selected','true');
    const p=PRODUCTS[+card.dataset.bottle];
    $('#dKicker').textContent=p.kicker; $('#dName').textContent=p.name; $('#dDesc').textContent=p.desc;
    $('#dNose').textContent=p.nose; $('#dPalate').textContent=p.palate; $('#dFinish').textContent=p.finish;
    if(window.__noctara) window.__noctara.setBottle(+card.dataset.bottle);
  }));

  $('#contactForm').addEventListener('submit',e=>{ e.preventDefault(); $('#formMsg').textContent='✓ Received. Our keeper of allocations will write to you within one blue hour.'; e.target.reset(); });
})();
