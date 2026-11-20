/* NOCTARA — scroll engine, UI, products, audio, cursor */
(function(){
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];

  // Loader (progress simulated tied to load, capped fast)
  let lp=0; const fill=$('#loaderFill'), pct=$('#loaderPct');
  const li=setInterval(()=>{ lp=Math.min(92,lp+Math.random()*16); fill.style.width=lp+'%'; pct.textContent=Math.floor(lp); },110);
  window.addEventListener('load',()=>{ setTimeout(()=>{ clearInterval(li); fill.style.width='100%'; pct.textContent='100'; setTimeout(()=>$('#loader').classList.add('done'),350); },250); });
  setTimeout(()=>$('#loader').classList.add('done'),3200); // never trap visitor

  // Lenis + GSAP
  let lenis=null;
  if(window.Lenis && !reduced){ lenis=new Lenis({duration:1.25,smoothWheel:true}); }
  if(window.gsap && window.ScrollTrigger){ gsap.registerPlugin(ScrollTrigger); }
  function raf(t){ if(lenis) lenis.raf(t); requestAnimationFrame(raf); } requestAnimationFrame(raf);
  if(lenis && window.gsap){ lenis.on('scroll',()=>{ if(window.ScrollTrigger) ScrollTrigger.update(); }); }

  // Anchor links via lenis
  $$('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{ const id=a.getAttribute('href'); if(id.length>1){ const el=document.querySelector(id); if(el){ e.preventDefault(); closeMenu(); if(lenis) lenis.scrollTo(el,{offset:-70}); else el.scrollIntoView({behavior:reduced?'auto':'smooth'}); } } }));

  // Scroll progress -> engine + rail
  const railFill=$('#railFill'), chapterLabel=$('#chapterLabel');
  const sections=$$('.scene'); const railItems=$$('.progress-rail li');
  function onScroll(){
    const max=document.documentElement.scrollHeight-innerHeight; const p=max>0?scrollY/max:0;
    if(window.__noctara) window.__noctara.setProgress(p);
    if(railFill) railFill.style.height=(p*100)+'%';
    // velocity grain stretch
    document.body.style.setProperty('--vel', Math.min(1, Math.abs(window.__vel||0)/40));
    // active chapter
    let idx=0; sections.forEach((s,i)=>{ const r=s.getBoundingClientRect(); if(r.top<innerHeight*0.55) idx=i; });
    railItems.forEach((li,i)=>li.classList.toggle('active',i===idx));
    if(chapterLabel) chapterLabel.textContent=String(idx+1).padStart(2,'0')+' / 06';
    // header contrast
    $('#header').style.background = scrollY>80 ? 'linear-gradient(to bottom, rgba(9,9,9,.92), rgba(9,9,9,.55))' : '';
  }
  let lastY=scrollY; window.addEventListener('scroll',()=>{ window.__vel=scrollY-lastY; lastY=scrollY; onScroll(); },{passive:true}); onScroll();
  railItems.forEach(li=>li.addEventListener('click',()=>{ const el=document.getElementById(li.dataset.target); if(el){ if(lenis) lenis.scrollTo(el,{offset:-70}); else el.scrollIntoView({behavior:'smooth'}); } }));

  // Reveals
  if(window.gsap && !reduced){
    $$('.mask > span').forEach(el=>{ gsap.fromTo(el,{yPercent:110},{yPercent:0,duration:1.2,ease:'power4.out',scrollTrigger:{trigger:el.closest('.scene')||el,start:'top 75%'}}); });
    $$('.reveal').forEach(el=>{ gsap.fromTo(el,{y:36,opacity:0},{y:0,opacity:1,duration:1,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 85%'}}); });
    // velocity skew on display titles
    let proxy={skew:0}, skewSetter=gsap.quickSetter('.display','skewY','deg');
    ScrollTrigger.create({ onUpdate:self=>{ const skew=gsap.utils.clamp(-4,4,self.getVelocity()/-260); if(Math.abs(skew)>Math.abs(proxy.skew)){ proxy.skew=skew; gsap.to(proxy,{skew:0,duration:0.7,ease:'power3',overwrite:true,onUpdate:()=>skewSetter(proxy.skew)}); } } });
  }

  // Menu
  const overlay=$('#menuOverlay');
  function openMenu(){ overlay.classList.add('open'); overlay.setAttribute('aria-hidden','false'); $('#menuBtn').setAttribute('aria-expanded','true'); }
  function closeMenu(){ overlay.classList.remove('open'); overlay.setAttribute('aria-hidden','true'); $('#menuBtn').setAttribute('aria-expanded','false'); }
  $('#menuBtn').addEventListener('click',openMenu); $('#menuClose').addEventListener('click',closeMenu);
  window.addEventListener('keydown',e=>{ if(e.key==='Escape') closeMenu(); });

  // Portal interactions
  $('#rippleBtn').addEventListener('click',()=>{ if(window.__noctara) window.__noctara.ripple(); $('#portalHint').textContent='◉ RIPPLE SENT — THE DEEP REMEMBERS'; });
  $('#portal').addEventListener('pointermove',()=>{ if(window.__noctara && Math.random()>0.7) window.__noctara.ripple(); });
  $('#vortexBtn').addEventListener('click',()=>{ if(window.__noctara) window.__noctara.vortex(); });

  // Products
  const PRODUCTS=[
    {kicker:'N°01 — THE FIRST FIRE',name:'CRIMSON ORIGIN',desc:'Born from bitter cherry and smoked plum, finished in charred oak. The first spirit the traveler tasted after the portal — and the reason he stayed.',nose:'Bitter cherry, cacao husk, wet stone',palate:'Smoked plum, black pepper, blood orange',finish:'Long, warm, a whisper of ash & honey'},
    {kicker:'N°02 — THE BLUE HOUR',name:'OBSIDIAN VEIL',desc:'A midnight botanical distilled under low light. Juniper shadowed by black cardamom and a cold note of sea salt — the sanctuary at 2 a.m.',nose:'Juniper, black cardamom, inkberry',palate:'Dark citrus, sea salt, cold herbs',finish:'Dry, blue, impossibly clean'},
    {kicker:'N°03 — THE QUIET LIGHT',name:'IVORY ECLIPSE',desc:'An ivory liqueur of white tea, pear and vanilla ash. Soft on entry, then an eclipse — a dark core of toasted almond at the centre.',nose:'White tea, pear skin, almond blossom',palate:'Vanilla ash, baked pear, white pepper',finish:'Silken, luminous, lingering'}
  ];
  $$('.bottle-card').forEach(card=>card.addEventListener('click',()=>{
    $$('.bottle-card').forEach(c=>{c.classList.remove('is-active');c.setAttribute('aria-selected','false')});
    card.classList.add('is-active'); card.setAttribute('aria-selected','true');
    const i=+card.dataset.bottle, p=PRODUCTS[i];
    const detail=$('#productDetail');
    if(window.gsap && !reduced) gsap.fromTo(detail,{opacity:0.35,y:12},{opacity:1,y:0,duration:0.6,ease:'power3.out'});
    $('#dKicker').textContent=p.kicker; $('#dName').textContent=p.name; $('#dDesc').textContent=p.desc;
    $('#dNose').textContent=p.nose; $('#dPalate').textContent=p.palate; $('#dFinish').textContent=p.finish;
    if(window.__noctara) window.__noctara.setBottle(i);
  }));

  // Sound — generated ambient drone, OFF by default, never autoplay
  let audioCtx=null, gainNode=null, soundOn=false;
  $('#soundBtn').addEventListener('click',function(){
    if(!audioCtx){ audioCtx=new (window.AudioContext||window.webkitAudioContext)(); gainNode=audioCtx.createGain(); gainNode.gain.value=0; gainNode.connect(audioCtx.destination);
      [55,82.4,110].forEach((f,i)=>{ const o=audioCtx.createOscillator(); o.type=i===0?'sine':'triangle'; o.frequency.value=f; const g=audioCtx.createGain(); g.gain.value=i===0?0.5:0.12; o.connect(g); g.connect(gainNode); o.start(); });
    }
    soundOn=!soundOn; this.setAttribute('aria-pressed',String(soundOn)); this.textContent=soundOn?'SOUND ON':'SOUND OFF';
    audioCtx.resume(); gainNode.gain.linearRampToValueAtTime(soundOn?0.06:0, audioCtx.currentTime+1.2);
  });

  // Custom cursor
  const cursor=$('#cursor'), ring=$('#cursorRing'); let cx=innerWidth/2,cy=innerHeight/2,rx=cx,ry=cy;
  window.addEventListener('pointermove',e=>{ cx=e.clientX; cy=e.clientY; cursor.style.left=cx+'px'; cursor.style.top=cy+'px';
    const t=e.target.closest('[data-cursor],a,button,.bottle-card'); const label=e.target.closest('[data-cursor]')?.dataset.cursor||'';
    cursor.classList.toggle('is-label',!!label); $('#cursorLabel').textContent=label; });
  (function loop(){ rx+=(cx-rx)*0.14; ry+=(cy-ry)*0.14; ring.style.left=rx+'px'; ring.style.top=ry+'px'; requestAnimationFrame(loop); })();
  // Magnetic buttons
  if(matchMedia('(pointer:fine)').matches && !reduced){ $$('.btn-primary').forEach(b=>{ b.addEventListener('pointermove',e=>{ const r=b.getBoundingClientRect(); b.style.transform=`translate(${(e.clientX-r.left-r.width/2)*0.12}px, ${(e.clientY-r.top-r.height/2)*0.18}px)`; }); b.addEventListener('pointerleave',()=>b.style.transform=''); }); }

  // Contact form (real interaction, no fake backend)
  $('#contactForm').addEventListener('submit',e=>{ e.preventDefault(); $('#formMsg').textContent='✓ Received. Our keeper of allocations will write to you within one blue hour.'; e.target.reset(); });
})();
