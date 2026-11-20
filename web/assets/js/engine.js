/* NOCTARA — One WebGL world: dust / ruins / portal / sanctuary / vortex
   Original shader & geometry. Palette fed from CSS tokens. */
(function(){
  const canvas=document.getElementById('gl');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse=window.matchMedia('(pointer: coarse)').matches;
  let renderer;
  try{
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
  }catch(e){ document.body.classList.add('no-webgl'); return; }
  if(reduced || !renderer){ document.body.classList.add('reduced'); return; }

  const DPR=Math.min(window.devicePixelRatio||1, coarse?1.25:1.5);
  renderer.setPixelRatio(DPR); renderer.setSize(innerWidth,innerHeight);
  const scene=new THREE.Scene(); scene.fog=new THREE.FogExp2(0x090909,0.055);
  const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,0.1,100);
  camera.position.set(0,1.2,9);

  const COLORS={crimson:new THREE.Color('#8D101D'),blood:new THREE.Color('#B51F2B'),ivory:new THREE.Color('#F0E8D8'),blue:new THREE.Color('#344A63')};

  // Lights
  scene.add(new THREE.AmbientLight(0xF0E8D8,0.25));
  const horizon=new THREE.PointLight(0xB51F2B,3,30); horizon.position.set(0,0.5,-8); scene.add(horizon);
  const keyLight=new THREE.PointLight(0xF0E8D8,1.2,25); keyLight.position.set(3,5,4); scene.add(keyLight);
  const blueLight=new THREE.PointLight(0x344A63,1.5,20); blueLight.position.set(-4,2,2); scene.add(blueLight);

  // --- Dust particles (GPU points, no CPU loop) ---
  const dustCount=coarse?3500:9000;
  const dustGeo=new THREE.BufferGeometry();
  const dp=new Float32Array(dustCount*3), ds=new Float32Array(dustCount);
  for(let i=0;i<dustCount;i++){ dp[i*3]=(Math.random()-0.5)*22; dp[i*3+1]=(Math.random()-0.5)*12; dp[i*3+2]=(Math.random()-0.5)*16; ds[i]=Math.random(); }
  dustGeo.setAttribute('position',new THREE.BufferAttribute(dp,3));
  dustGeo.setAttribute('aSeed',new THREE.BufferAttribute(ds,1));
  const dustMat=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    uniforms:{uTime:{value:0},uColor:{value:COLORS.ivory}},
    vertexShader:`attribute float aSeed; uniform float uTime; varying float vA;
      void main(){ vec3 p=position; p.y+=sin(uTime*0.3+aSeed*20.0)*0.35; p.x+=cos(uTime*0.2+aSeed*17.0)*0.25;
      vec4 mv=modelViewMatrix*vec4(p,1.0); gl_PointSize=(1.5+aSeed*2.5)*(12.0/-mv.z); vA=0.25+aSeed*0.6; gl_Position=projectionMatrix*mv; }`,
    fragmentShader:`uniform vec3 uColor; varying float vA; void main(){ vec2 c=gl_PointCoord-0.5; float d=length(c); float a=smoothstep(0.5,0.0,d)*vA; gl_FragColor=vec4(uColor,a); }`
  });
  const dust=new THREE.Points(dustGeo,dustMat); scene.add(dust);

  // --- Ruins: columns ---
  const ruins=new THREE.Group();
  const stoneMat=new THREE.MeshStandardMaterial({color:0x1a1a1a,roughness:0.95,metalness:0.05});
  const stoneLight=new THREE.MeshStandardMaterial({color:0x2a2a28,roughness:0.9});
  for(let i=0;i<10;i++){
    const h=2.5+((i*37)%40)/10;
    const col=new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.34,h,10), i%2?stoneMat:stoneLight);
    const side=i%2?1:-1; col.position.set(side*(1.8+(i%3)*1.1), h/2-1.2, -2-i*1.15); col.rotation.z=(i%3-1)*0.04; ruins.add(col);
    const cap=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.22,0.9),stoneLight); cap.position.set(col.position.x, h-1.05, col.position.z); ruins.add(cap);
  }
  ruins.position.z=-2; scene.add(ruins);

  // --- Portal: ring + liquid shader disc ---
  const portalGroup=new THREE.Group(); portalGroup.position.set(0,0.6,-3.5);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.85,0.09,16,90), new THREE.MeshStandardMaterial({color:0xF0E8D8,roughness:0.35,metalness:0.7,emissive:0x8D101D,emissiveIntensity:0.35}));
  portalGroup.add(ring);
  const portalUniforms={uTime:{value:0},uMouse:{value:new THREE.Vector2(0,0)},uRipple:{value:0},uCrimson:{value:COLORS.blood},uBlue:{value:COLORS.blue}};
  const liquid=new THREE.Mesh(new THREE.CircleGeometry(1.78,64), new THREE.ShaderMaterial({
    transparent:true, uniforms:portalUniforms,
    vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader:`varying vec2 vUv; uniform float uTime; uniform vec2 uMouse; uniform float uRipple; uniform vec3 uCrimson; uniform vec3 uBlue;
      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
      void main(){ vec2 c=vUv-0.5; float r=length(c)*2.0;
        float ripple=sin(r*18.0-uTime*2.2)*0.5+0.5;
        float dist=distance(vUv, uMouse*0.5+0.5);
        float touch=exp(-dist*dist*8.0)*(0.6+uRipple*1.4);
        float n=noise(vUv*6.0+uTime*0.25)+noise(vUv*12.0-uTime*0.18)*0.5;
        vec3 col=mix(vec3(0.08,0.01,0.02), uCrimson, smoothstep(0.2,0.9,n*0.7+ripple*0.35+touch*0.5));
        col=mix(col, uBlue, smoothstep(0.75,1.0,n)*0.35);
        col+=vec3(1.0,0.35,0.35)*touch*0.55;
        float edge=smoothstep(1.0,0.92,r);
        // chromatic fringe at edge
        col.r+= (1.0-edge)*0.12;
        gl_FragColor=vec4(col, edge*0.96); }`
  }));
  portalGroup.add(liquid); scene.add(portalGroup);

  // --- Sanctuary: pedestal + 3 bottles ---
  const sanctuary=new THREE.Group(); sanctuary.position.set(0,-0.4,-1);
  const pedestal=new THREE.Mesh(new THREE.CylinderGeometry(2.4,2.7,0.5,8), stoneLight); pedestal.position.y=-1.4; sanctuary.add(pedestal);
  const bottleCols=[0x8D101D,0x344A63,0xF0E8D8];
  const bottles=[];
  function makeBottle(color,x){
    const g=new THREE.Group(); g.position.set(x,0.2,0);
    const mat=new THREE.MeshPhysicalMaterial({color,roughness:0.15,metalness:0.1,transparent:true,opacity:0.92,clearcoat:1});
    const body=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.46,1.25,24),mat); body.position.y=0.1; g.add(body);
    const shoulder=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.42,0.35,24),mat); shoulder.position.y=0.9; g.add(shoulder);
    const neck=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.13,0.55,16),mat); neck.position.y=1.32; g.add(neck);
    const label=new THREE.Mesh(new THREE.CylinderGeometry(0.435,0.435,0.5,24,1,true), new THREE.MeshStandardMaterial({color:0xF0E8D8,roughness:0.8,side:THREE.DoubleSide}));
    label.position.y=0.05; g.add(label);
    sanctuary.add(g); bottles.push(g); return g;
  }
  makeBottle(bottleCols[0],-1.55); makeBottle(bottleCols[1],0); makeBottle(bottleCols[2],1.55);
  // sanctuary columns
  for(let i=0;i<6;i++){ const c=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.26,6,10),stoneMat); const a=(i/6)*Math.PI*2; c.position.set(Math.cos(a)*3.6,1.2,Math.sin(a)*1.8-0.5); sanctuary.add(c); }
  scene.add(sanctuary);

  // --- Vortex particles ---
  const vCount=coarse?5000:14000; const vGeo=new THREE.BufferGeometry(); const vp=new Float32Array(vCount*3);
  for(let i=0;i<vCount;i++){ const t=i/vCount; const ang=t*Math.PI*14; const rad=0.2+t*3.2; vp[i*3]=Math.cos(ang)*rad; vp[i*3+1]=(t-0.5)*5; vp[i*3+2]=Math.sin(ang)*rad; }
  vGeo.setAttribute('position',new THREE.BufferAttribute(vp,3));
  const vortex=new THREE.Points(vGeo,new THREE.PointsMaterial({color:0xB51F2B,size:0.055,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));
  vortex.position.set(0,0.4,-2); scene.add(vortex);

  // State
  let progress=0, targetProgress=0, mouseX=0, mouseY=0, tMouseX=0, tMouseY=0, rippleBoost=0, vortexBoost=0, focusBottle=1;
  const camPath=[
    {pos:[0,1.2,9],look:[0,0.6,-3]},
    {pos:[0.6,1.0,5.5],look:[0,0.8,-4]},
    {pos:[0,0.7,1.2],look:[0,0.6,-3.5]},
    {pos:[0,0.9,4.2],look:[0,0.2,-1]},
    {pos:[0,1.4,6.5],look:[0,0.4,-2]},
    {pos:[0,1.6,10.5],look:[0,0.8,-2]},
  ];
  function lerp(a,b,t){return a+(b-a)*t}
  function samplePath(p){
    const seg=Math.min(4.999,Math.max(0,p*5)); const i=Math.floor(seg); const f=seg-i;
    const A=camPath[i],B=camPath[i+1];
    return {pos:[lerp(A.pos[0],B.pos[0],f),lerp(A.pos[1],B.pos[1],f),lerp(A.pos[2],B.pos[2],f)],look:[lerp(A.look[0],B.look[0],f),lerp(A.look[1],B.look[1],f),lerp(A.look[2],B.look[2],f)]};
  }

  window.addEventListener('pointermove',e=>{ tMouseX=(e.clientX/innerWidth-0.5)*2; tMouseY=(e.clientY/innerHeight-0.5)*2;
    portalUniforms.uMouse.value.set(tMouseX,-tMouseY); });
  window.__noctara={
    setProgress(v){ targetProgress=v; },
    ripple(){ rippleBoost=1; },
    vortex(){ vortexBoost=1; },
    setBottle(i){ focusBottle=i; const cols=[0xB51F2B,0x5b7ea6,0xF0E8D8]; keyLight.color.setHex(cols[i]); bottles.forEach((b,j)=>{ b.scale.setScalar(j===i?1.22:0.92); }); }
  };
  window.__noctara.setBottle(0);

  let visible=true;
  new IntersectionObserver(en=>{visible=en[0].isIntersecting},{threshold:0}).observe(canvas);
  document.addEventListener('visibilitychange',()=>{ visible=!document.hidden; });

  const clock=new THREE.Clock();
  function tick(){
    requestAnimationFrame(tick); if(!visible) return;
    const dt=Math.min(clock.getDelta(),0.05); const t=clock.elapsedTime;
    progress+=(targetProgress-progress)*(1-Math.exp(-dt*3.2));
    mouseX+=(tMouseX-mouseX)*(1-Math.exp(-dt*4)); mouseY+=(tMouseY-mouseY)*(1-Math.exp(-dt*4));
    rippleBoost*=Math.exp(-dt*1.4); vortexBoost*=Math.exp(-dt*0.9);
    dustMat.uniforms.uTime.value=t; portalUniforms.uTime.value=t; portalUniforms.uRipple.value=rippleBoost + Math.max(0, 1-Math.abs(progress-0.42)*6)*0.7;

    const s=samplePath(progress);
    camera.position.set(s.pos[0]+mouseX*0.45, s.pos[1]-mouseY*0.3, s.pos[2]);
    camera.lookAt(s.look[0]+mouseX*0.3, s.look[1], s.look[2]);

    // Scene choreography by progress
    ruins.position.z=-2+progress*1.2; ruins.rotation.y=Math.sin(progress*3)*0.08;
    const portalIn=Math.max(0,1-Math.abs(progress-0.42)*5);
    portalGroup.scale.setScalar(0.7+portalIn*0.6+rippleBoost*0.06); portalGroup.rotation.z=Math.sin(t*0.3)*0.04; ring.rotation.z=t*0.12;
    const sancIn=Math.max(0,1-Math.abs(progress-0.60)*5.5);
    sanctuary.position.y=-0.4+Math.sin(t*0.6)*0.04; sanctuary.rotation.y=(progress-0.6)*1.2 + mouseX*0.12;
    bottles.forEach((b,i)=>{ b.rotation.y=t*0.35+i; b.position.y=0.2+Math.sin(t*0.8+i*2)*0.05 + (i===focusBottle? vortexBoost*0.6:0); });
    const vortIn=Math.max(0,1-Math.abs(progress-0.78)*6)+vortexBoost;
    vortex.material.opacity=Math.min(0.95, vortIn); vortex.rotation.y=t*(0.4+vortIn*1.6); vortex.scale.setScalar(0.7+vortIn*0.7);
    horizon.intensity=2+Math.sin(t*0.7)*0.6+portalIn*2;
    dust.rotation.y=t*0.015;
    renderer.render(scene,camera);
  }
  tick();
  window.addEventListener('resize',()=>{ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); });
})();
