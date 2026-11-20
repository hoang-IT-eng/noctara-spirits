/* NOCTARA v2 — Crimson Valley. ORIGINAL engine written for this project.
   Techniques (not code/assets) inspired by cinematic valley heroes:
   camera-path flight over a point-sprite valley, screen-space cursor repulsion,
   bloom-by-proximity, idle drift, hover disperse + audio muffle hook.
   All geometry, shaders and the path are procedural and original. */
(function(){
  const container=document.getElementById('valley');
  const canvas=document.getElementById('gl');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try{ renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'}); }
  catch(e){ document.body.classList.add('no-webgl'); window.dispatchEvent(new Event('noctara:ready')); return; }
  if(reduced || !renderer){ document.body.classList.add('reduced'); window.dispatchEvent(new Event('noctara:ready')); return; }

  const coarse=window.matchMedia('(pointer: coarse)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio||1, coarse?1.25:1.5));
  renderer.setSize(innerWidth,innerHeight);
  renderer.setClearColor(0x050505,1);
  const scene=new THREE.Scene();
  scene.fog=new THREE.FogExp2(0x070507,0.028);
  const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,0.1,220);
  scene.add(camera);

  // ---------- liquid ink backdrop (original GLSL, rides with the camera) ----------
  const inkUniforms={uTime:{value:0},uMouse:{value:new THREE.Vector2(0.5,0.5)},uHover:{value:0},uRes:{value:new THREE.Vector2(innerWidth,innerHeight)}};
  const inkPlane=new THREE.Mesh(new THREE.PlaneGeometry(150,84), new THREE.ShaderMaterial({
    depthWrite:false, depthTest:false, uniforms:inkUniforms,
    vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader:`varying vec2 vUv; uniform float uTime; uniform vec2 uMouse; uniform float uHover; uniform vec2 uRes;
      float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float v=0.0; float a=0.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.1; a*=0.45; } return v; }
      void main(){
        vec2 uv=vUv;
        float dist=distance(uv,uMouse);
        float ripple=sin(dist*18.0-uTime*2.0)*exp(-dist*3.5);
        vec2 duv=uv+(uv-uMouse)*ripple*0.08;
        vec2 flow=duv*2.6+vec2(uTime*0.030,-uTime*0.020);
        float q=fbm(flow);
        float r=fbm(flow+q+vec2(uTime*0.040));
        vec3 col=mix(vec3(0.016,0.016,0.018), vec3(0.52,0.06,0.085), smoothstep(0.28,0.92,r)*0.88);
        col=mix(col, vec3(0.55,0.40,0.20), pow(r,4.0)*(0.22+uHover*0.35));   // gold-foil glints, stronger on hover
        float vig=smoothstep(1.25,0.15,length(uv-0.5));
        gl_FragColor=vec4(col*vig,1.0);
      }`
  }));
  inkPlane.position.set(0,0,-70); inkPlane.renderOrder=-10; inkPlane.frustumCulled=false;
  camera.add(inkPlane);

  // ---------- terrain height (procedural valley) ----------
  function heightAt(x,z){
    const valley=Math.min(14, Math.pow(Math.abs(x)/9,2)*7);           // valley walls rise at sides
    const roll=Math.sin(x*0.16)*Math.cos(z*0.11)*1.1 + Math.sin(z*0.05+x*0.03)*1.6;
    return valley+roll-1.2;
  }

  // ---------- spirit blooms: point sprites over the terrain ----------
  const COUNT=coarse?9000:26000;
  const pos=new Float32Array(COUNT*3), disp=new Float32Array(COUNT*3), seed=new Float32Array(COUNT), mixv=new Float32Array(COUNT);
  for(let i=0;i<COUNT;i++){
    const z=34-Math.random()*150;                                     // corridor along the path
    const spread=Math.random();
    const x=(Math.random()-0.5)*(14+spread*46);                       // dense centre, sparse walls
    const y=heightAt(x,z)+0.25+Math.random()*0.9;
    pos.set([x,y,z],i*3);
    const th=Math.random()*Math.PI*2, ph=Math.acos(2*Math.random()-1), r=10+Math.random()*24;
    disp.set([x+Math.sin(ph)*Math.cos(th)*r, y+Math.abs(Math.cos(ph))*r*0.7+4, z+Math.sin(ph)*Math.sin(th)*r],i*3);
    seed[i]=Math.random(); mixv[i]=Math.random();
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  geo.setAttribute('aDisperse',new THREE.BufferAttribute(disp,3));
  geo.setAttribute('aSeed',new THREE.BufferAttribute(seed,1));
  geo.setAttribute('aMix',new THREE.BufferAttribute(mixv,1));

  const uniforms={
    uTime:{value:0}, uProgress:{value:0}, uDisperse:{value:0}, uHover:{value:0},
    uMouse:{value:new THREE.Vector2(10,10)}, uCamPos:{value:new THREE.Vector3()},
    uPixelRatio:{value:renderer.getPixelRatio()},
    uCrimson:{value:new THREE.Color('#B51F2B')}, uDeep:{value:new THREE.Color('#8D101D')},
    uIvory:{value:new THREE.Color('#d8c9a3')}, uBlue:{value:new THREE.Color('#4a6a94')},
    uHalo:{value:0}
  };
  const vert=`
    attribute vec3 aDisperse; attribute float aSeed; attribute float aMix;
    uniform float uTime,uDisperse,uHover,uPixelRatio,uSizeMul,uHalo; uniform vec2 uMouse; uniform vec3 uCamPos;
    varying float vGlow; varying float vMix; varying float vFog; varying float vSeed; varying float vDist;
    void main(){
      vec3 p=mix(position, aDisperse, uDisperse);
      p.x+=sin(uTime*0.6+aSeed*40.0)*0.18; p.y+=sin(uTime*0.8+aSeed*31.0)*0.22;
      float distCam=distance(p,uCamPos);
      float bloom=smoothstep(26.0,4.0,distCam);              // blooms open as camera nears
      vec4 mv=modelViewMatrix*vec4(p,1.0);
      vec4 clip=projectionMatrix*mv;
      // screen-space cursor repulsion (strongest close by, in NDC)
      vec2 ndc=clip.xy/clip.w;
      vec2 d=ndc-uMouse; float md=length(d*vec2(1.4,1.0));
      float push=smoothstep(0.42,0.0,md);
      clip.xy+=normalize(d+0.0001)*push*0.14*clip.w;
      vGlow=push;
      float size=(0.9+bloom*1.5+aSeed*0.8+uHover*0.7)*(1.0+push*0.7)*uSizeMul;
      float capPx = uHalo>0.5 ? 64.0 : 26.0;                 // hard cap: no giant foreground blobs
      gl_PointSize=min(size*uPixelRatio*(34.0/max(1.0,-mv.z)), capPx*uPixelRatio);
      vMix=aMix; vSeed=aSeed; vDist=distCam;
      vFog=smoothstep(90.0,18.0,distCam);
      gl_Position=clip;
    }`;
  const frag=`
    uniform vec3 uCrimson,uDeep,uIvory,uBlue; uniform float uHalo;
    varying float vGlow; varying float vMix; varying float vFog; varying float vSeed; varying float vDist;
    void main(){
      vec2 c=gl_PointCoord-0.5; float r=length(c);
      float core=smoothstep(0.5,0.05,r);
      float petal=smoothstep(0.5,0.32,r)*0.45;                // soft petal ring
      vec3 col = vMix<0.78 ? mix(uDeep,uCrimson,vSeed) : (vMix<0.90 ? uIvory : uBlue);
      col+=vec3(1.0,0.45,0.4)*vGlow*0.8;                      // nearest to cursor glow
      float nearFade=smoothstep(1.4,5.0,vDist);               // foreground points fade OUT instead of blowing up
      float a=(core*0.6+petal*0.35)*(0.18+vFog*0.6)*nearFade;
      if(uHalo>0.5) a=core*0.05*nearFade*(0.3+vFog*0.7);
      gl_FragColor=vec4(col,a);
    }`;
  function makePoints(halo){
    const u=Object.assign({},uniforms,{uHalo:{value:halo?1:0},uSizeMul:{value:halo?3.2:1.0}});
    // share live uniform objects so one update drives both layers
    u.uTime=uniforms.uTime; u.uDisperse=uniforms.uDisperse; u.uHover=uniforms.uHover; u.uMouse=uniforms.uMouse; u.uCamPos=uniforms.uCamPos; u.uProgress=uniforms.uProgress;
    const m=new THREE.ShaderMaterial({uniforms:u,vertexShader:vert,fragmentShader:frag,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
    const pts=new THREE.Points(geo,m); pts.frustumCulled=false;
    return pts;
  }
  scene.add(makePoints(true)); scene.add(makePoints(false));

  // ---------- dust motes ----------
  const dn=coarse?700:1800, dp=new Float32Array(dn*3);
  for(let i=0;i<dn;i++) dp.set([(Math.random()-0.5)*50,Math.random()*14-1,30-Math.random()*140],i*3);
  const dGeo=new THREE.BufferGeometry(); dGeo.setAttribute('position',new THREE.BufferAttribute(dp,3));
  const dust=new THREE.Points(dGeo,new THREE.PointsMaterial({color:0xF0E8D8,size:0.06,transparent:true,opacity:0.5,depthWrite:false}));
  dust.frustumCulled=false; scene.add(dust);

  // ---------- terrain silhouette (dark wire-free mesh, very dark) ----------
  const terrGeo=new THREE.PlaneGeometry(90,170,72,120); terrGeo.rotateX(-Math.PI/2);
  const tp=terrGeo.attributes.position;
  for(let i=0;i<tp.count;i++){ tp.setY(i, heightAt(tp.getX(i), tp.getZ(i)-55)); }
  terrGeo.computeVertexNormals();
  const terrain=new THREE.Mesh(terrGeo,new THREE.MeshStandardMaterial({color:0x0a0a0c,roughness:1,metalness:0}));
  terrain.position.z=-55; scene.add(terrain);
  scene.add(new THREE.AmbientLight(0x344A63,0.7));
  const moon=new THREE.DirectionalLight(0xF0E8D8,0.5); moon.position.set(-8,20,10); scene.add(moon);
  const bloodLight=new THREE.PointLight(0xB51F2B,2.4,60); scene.add(bloodLight);

  // ---------- the portal at the valley's heart (path t≈0.55) ----------
  const portal=new THREE.Group();
  const ring=new THREE.Mesh(new THREE.TorusGeometry(3.4,0.14,14,80),
    new THREE.MeshStandardMaterial({color:0xF0E8D8,roughness:0.3,metalness:0.8,emissive:0x8D101D,emissiveIntensity:0.7}));
  portal.add(ring);
  const pUniforms={uTime:{value:0},uMouse:{value:new THREE.Vector2(0,0)}};
  const liquid=new THREE.Mesh(new THREE.CircleGeometry(3.3,56),new THREE.ShaderMaterial({
    transparent:true,uniforms:pUniforms,
    vertexShader:`varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`varying vec2 vUv; uniform float uTime; uniform vec2 uMouse;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
      void main(){ vec2 c=vUv-0.5; float r=length(c)*2.0;
        float w=n(vUv*7.0+uTime*0.3)+n(vUv*14.0-uTime*0.22)*0.5;
        float rip=sin(r*16.0-uTime*2.4)*0.5+0.5;
        float touch=exp(-distance(vUv,uMouse*0.5+0.5)*4.0);
        vec3 col=mix(vec3(0.10,0.01,0.02),vec3(0.71,0.12,0.17),smoothstep(0.15,0.95,w*0.65+rip*0.3+touch*0.45));
        col=mix(col,vec3(0.20,0.29,0.39),smoothstep(0.8,1.05,w)*0.4);
        gl_FragColor=vec4(col,smoothstep(1.0,0.94,r)*0.97); }`
  }));
  portal.add(liquid); scene.add(portal);

  // ---------- sanctuary bottles at path t≈0.78 ----------
  const sanctuary=new THREE.Group();
  const cols=[0x8D101D,0x344A63,0xF0E8D8];
  cols.forEach((c,i)=>{
    const g=new THREE.Group();
    const mat=new THREE.MeshPhysicalMaterial({color:c,roughness:0.15,metalness:0.1,transparent:true,opacity:0.95,clearcoat:1});
    const body=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.6,1.7,20),mat); g.add(body);
    const neck=new THREE.Mesh(new THREE.CylinderGeometry(0.17,0.4,0.8,16),mat); neck.position.y=1.2; g.add(neck);
    const foil=new THREE.Mesh(new THREE.CylinderGeometry(0.565,0.575,0.34,20,1,true), new THREE.MeshStandardMaterial({color:0xc9a96e,roughness:0.28,metalness:0.95,side:THREE.DoubleSide}));
    foil.position.y=0.05; g.add(foil);   // hot-stamped gold foil band
    g.position.set((i-1)*1.9,0.4,0); sanctuary.add(g);
  });
  scene.add(sanctuary);

  // ---------- camera path (original spline through the valley) ----------
  const path=new THREE.CatmullRomCurve3([
    new THREE.Vector3(0,3.2,32), new THREE.Vector3(1.5,2.6,16), new THREE.Vector3(-2,2.4,0),
    new THREE.Vector3(0.5,2.2,-16), new THREE.Vector3(0,2.4,-30), new THREE.Vector3(-1.5,2.6,-46),
    new THREE.Vector3(1,2.8,-62), new THREE.Vector3(0,3.4,-80), new THREE.Vector3(0,4.2,-98)
  ]);
  const portalPos=path.getPointAt(0.55), sancPos=path.getPointAt(0.78);
  portal.position.copy(portalPos).add(new THREE.Vector3(0,1.2,-4));
  sanctuary.position.copy(sancPos).add(new THREE.Vector3(0,-0.6,-7));
  sanctuary.position.y=heightAt(sanctuary.position.x,sanctuary.position.z)+1.4;

  // ---------- state & API ----------
  let progress=0, target=0, disperse=0, disperseTarget=0, mouseX=0, mouseY=0, tMx=0, tMy=0, vel=0, lastTarget=0;
  window.addEventListener('pointermove',e=>{
    tMx=(e.clientX/innerWidth-0.5)*2; tMy=(e.clientY/innerHeight-0.5)*2;
    uniforms.uMouse.value.set((e.clientX/innerWidth)*2-1, -((e.clientY/innerHeight)*2-1));
    pUniforms.uMouse.value.set(tMx,-tMy);
    inkUniforms.uMouse.value.set(e.clientX/innerWidth, 1-e.clientY/innerHeight);
  });
  window.__noctara={
    setProgress(v){ target=Math.max(0,Math.min(1,v)); },
    startHoverTransition(){ disperseTarget=1; if(window.__noctaraAudio) window.__noctaraAudio(true); },
    stopHoverTransition(){ disperseTarget=0; if(window.__noctaraAudio) window.__noctaraAudio(false); },
    ripple(){ disperseTarget=1; setTimeout(()=>{ if(!window.__hoverHeld) disperseTarget=0; },650); },
    intro(){ disperseTarget=1; setTimeout(()=>{ if(!window.__hoverHeld) disperseTarget=0; },1400); },
    setBottle(i){ cols.forEach((c,j)=>{ sanctuary.children[j].scale.setScalar(j===i?1.25:0.9); }); bloodLight.color.setHex([0xB51F2B,0x5b7ea6,0xF0E8D8][i]); }
  };

  let visible=true; document.addEventListener('visibilitychange',()=>visible=!document.hidden);
  const clock=new THREE.Clock(); let readySent=false, inkTime=0;
  function tick(){
    requestAnimationFrame(tick); if(!visible) return;
    const dt=Math.min(clock.getDelta(),0.05), t=clock.elapsedTime;
    const prev=progress;
    progress+=(target-progress)*(1-Math.exp(-dt*3.4));
    vel=Math.abs(progress-prev)/Math.max(dt,0.001);
    disperse+=(disperseTarget-disperse)*(1-Math.exp(-dt*2.2));
    mouseX+=(tMx-mouseX)*(1-Math.exp(-dt*3.5)); mouseY+=(tMy-mouseY)*(1-Math.exp(-dt*3.5));

    // flight: ease along path, look ahead, tilt toward mouse, FOV kick with velocity
    const p=Math.min(0.995,progress);
    const posAt=path.getPointAt(p), lookAt=path.getPointAt(Math.min(0.999,p+0.035));
    camera.position.copy(posAt);
    camera.position.x+=mouseX*0.7; camera.position.y+=-mouseY*0.45+Math.sin(t*0.5)*0.08;
    camera.lookAt(lookAt.x+mouseX*1.2, lookAt.y-mouseY*0.5, lookAt.z);
    camera.rotation.z+=mouseX*0.03;
    const targetFov=58+Math.min(10,vel*90);
    camera.fov+=(targetFov-camera.fov)*(1-Math.exp(-dt*4)); camera.updateProjectionMatrix();

    uniforms.uTime.value=t; uniforms.uDisperse.value=disperse;
    uniforms.uHover.value=disperse; uniforms.uCamPos.value.copy(camera.position);
    pUniforms.uTime.value=t;
    inkTime+=dt*(disperseTarget>0.5?0.25:1.0);               // hover slows the ink flow
    inkUniforms.uTime.value=inkTime; inkUniforms.uHover.value=disperse;
    portal.lookAt(camera.position.x,portal.position.y,camera.position.z);
    ring.rotation.z=t*0.15;
    sanctuary.rotation.y=Math.sin(t*0.4)*0.15;
    sanctuary.children.forEach((g,i)=>{ g.rotation.y=t*0.4+i*2; g.position.y=0.4+Math.sin(t*0.9+i*2.1)*0.07; });
    bloodLight.position.copy(portal.position); bloodLight.intensity=2+Math.sin(t*0.8)*0.7+disperse*2;
    dust.rotation.y=t*0.006;
    document.body.style.setProperty('--vel', Math.min(1,vel*2.4).toFixed(3));
    renderer.render(scene,camera);
    if(!readySent){ readySent=true; setTimeout(()=>window.dispatchEvent(new Event('noctara:ready')),350); }
  }
  tick();
  window.addEventListener('resize',()=>{ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); });
})();
