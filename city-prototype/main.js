import * as THREE from 'three';
import { createCityOverview } from './city-overview.js';
import { enableMobileExplore } from './mobile-explore.js';
const stage=document.querySelector('#stage'), scene=new THREE.Scene();scene.background=new THREE.Color('#26363a');scene.fog=new THREE.FogExp2('#4d5d60',.0105);
const camera=new THREE.PerspectiveCamera(38,innerWidth/innerHeight,.1,300);camera.position.set(29,27,38);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;stage.append(renderer.domElement);
scene.add(new THREE.HemisphereLight('#aebfbd','#202d30',1.45));const moon=new THREE.DirectionalLight('#d2d8ca',3.6);moon.position.set(-18,32,18);moon.castShadow=true;moon.shadow.mapSize.set(1024,1024);scene.add(moon);const rim=new THREE.DirectionalLight('#78979c',.9);rim.position.set(22,16,-27);scene.add(rim);
const mats={ground:new THREE.MeshStandardMaterial({color:'#39494a',roughness:.92}),road:new THREE.MeshStandardMaterial({color:'#202b2e',roughness:.56,metalness:.08}),facade:new THREE.MeshStandardMaterial({color:'#4b5b5d',roughness:.82}),facadeAlt:new THREE.MeshStandardMaterial({color:'#405153',roughness:.86}),facadePale:new THREE.MeshStandardMaterial({color:'#5b6969',roughness:.84}),side:new THREE.MeshStandardMaterial({color:'#273538',roughness:.9}),roof:new THREE.MeshStandardMaterial({color:'#657371',roughness:.88}),trim:new THREE.MeshStandardMaterial({color:'#263537',roughness:.66,metalness:.18}),warm:new THREE.MeshStandardMaterial({color:'#e8b56f',emissive:'#b7702d',emissiveIntensity:1.1}),glass:new THREE.MeshStandardMaterial({color:'#8ca4a2',metalness:.35,roughness:.25}),green:new THREE.MeshStandardMaterial({color:'#405b50'}),mountain:new THREE.MeshStandardMaterial({color:'#5c6b69',roughness:.98}),mountain2:new THREE.MeshStandardMaterial({color:'#78837d',roughness:.96})};
// Fine procedural grain breaks up the untextured concrete and stone at close range.
const grainCanvas=document.createElement('canvas');grainCanvas.width=grainCanvas.height=256;const grainContext=grainCanvas.getContext('2d'),grainPixels=grainContext.createImageData(256,256);let grainSeed=317;for(let i=0;i<grainPixels.data.length;i+=4){grainSeed=(grainSeed*1664525+1013904223)>>>0;const v=241+(grainSeed%15);grainPixels.data[i]=v;grainPixels.data[i+1]=v;grainPixels.data[i+2]=v;grainPixels.data[i+3]=255}grainContext.putImageData(grainPixels,0,0);const surfaceGrain=new THREE.CanvasTexture(grainCanvas);surfaceGrain.wrapS=surfaceGrain.wrapT=THREE.RepeatWrapping;surfaceGrain.repeat.set(3,3);surfaceGrain.colorSpace=THREE.SRGBColorSpace;const reliefGrain=new THREE.CanvasTexture(grainCanvas);reliefGrain.wrapS=reliefGrain.wrapT=THREE.RepeatWrapping;reliefGrain.repeat.set(3,3);reliefGrain.colorSpace=THREE.NoColorSpace;for(const material of [mats.facade,mats.facadeAlt,mats.facadePale,mats.side,mats.trim,mats.roof,mats.mountain,mats.mountain2]){material.map=surfaceGrain;material.bumpMap=reliefGrain;material.bumpScale=.035;material.needsUpdate=true}
const city=new THREE.Group();scene.add(city);const add=(geo,mat,pos,parent=city,cast=true)=>{const m=new THREE.Mesh(geo,mat);m.position.set(...pos);m.castShadow=cast;m.receiveShadow=true;parent.add(m);return m};
const artworkHitTargets=[];
const legacyTextureSources = new Map();

function artTexture(relativePath) {
  const url = new URL(relativePath, import.meta.url).href;
  if (!legacyTextureSources.has(url)) {
    const texture = new THREE.Texture();
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    legacyTextureSources.set(url, { texture, requested: false });
  }
  return legacyTextureSources.get(url).texture;
}

function renderLegacyScene() {
  // The current routes use cinema plates. Only request the old 3D textures
  // if a route actually falls back to the WebGL renderer.
  for (const [url, entry] of legacyTextureSources) {
    if (entry.requested) continue;
    entry.requested = true;
    const image = new Image();
    image.onload = () => {
      entry.texture.image = image;
      entry.texture.needsUpdate = true;
    };
    image.onerror = error => console.warn('Artwork texture failed to load', url, error);
    image.src = url;
  }
  renderer.render(scene, camera);
}
function artworkPanel(parent,{path,width,height,position,rotationY=0,frame=mats.trim,glow=false,key}){const panel=new THREE.Group();panel.position.set(...position);panel.rotation.y=rotationY;parent.add(panel);add(new THREE.BoxGeometry(width+.34,height+.34,.28),frame,[0,0,0],panel);add(new THREE.BoxGeometry(width+.1,height+.1,.08),mats.side,[0,0,.16],panel,false);const surface=add(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:artTexture(path),toneMapped:false,side:THREE.DoubleSide}),[0,0,.211],panel,false);surface.userData.workKey=key;artworkHitTargets.push(surface);if(glow){const edge=new THREE.PointLight('#e2bd87',2.2,5,2);edge.position.set(0,0,.6);panel.add(edge)}return surface}
// City ground is tiled around the paved footprint so no ground top face shares
// the same plane as a road or plaza surface. All finished pavement tops are Y=0.
const groundBounds={minX:-32,maxX:32,minZ:-37,maxZ:33};
const plazaMat=new THREE.MeshStandardMaterial({color:'#566260',roughness:.94});
const surfaceRegions=[
  {kind:'road',minX:-32,maxX:-3,minZ:-1.5,maxZ:5.5},
  {kind:'road',minX:7,maxX:32,minZ:-1.5,maxZ:5.5},
  {kind:'road',minX:-1,maxX:5,minZ:-37,maxZ:-3},
  {kind:'road',minX:-1,maxX:5,minZ:7,maxZ:33},
  {kind:'plaza',minX:-3,maxX:7,minZ:-3,maxZ:7},
  // One continuous BANQUET HALL apron: the 2.8-unit path is centered within it,
  // so the renderer emits one pavement surface rather than overlapping meshes.
  {kind:'paving',minX:-14,maxX:-10,minZ:-2.5,maxZ:-1.5},
  // APARTMENT 03 access spur; it meets the north side of the east-west road.
  {kind:'road',minX:9.25,maxX:10.75,minZ:-2.8,maxZ:2},
  // Flat approach only. Slope-following mountain road remains for a later phase.
  {kind:'road',minX:-21.5,maxX:-19,minZ:-14.8,maxZ:2},
  // ARCHIVE south promenade meets the south arm of the north-south road.
  {kind:'paving',minX:-10,maxX:2,minZ:22.8,maxZ:25.2}
];
const xCuts=[groundBounds.minX,groundBounds.maxX],zCuts=[groundBounds.minZ,groundBounds.maxZ];
for(const r of surfaceRegions){
  r.minX=Math.max(r.minX,groundBounds.minX);r.maxX=Math.min(r.maxX,groundBounds.maxX);
  r.minZ=Math.max(r.minZ,groundBounds.minZ);r.maxZ=Math.min(r.maxZ,groundBounds.maxZ);
  xCuts.push(r.minX,r.maxX);zCuts.push(r.minZ,r.maxZ);
}
const uniqueSorted=values=>[...new Set(values)].sort((a,b)=>a-b),xs=uniqueSorted(xCuts),zs=uniqueSorted(zCuts);
function regionAt(x,z){
  const active=surfaceRegions.filter(r=>x>r.minX-1e-8&&x<r.maxX+1e-8&&z>r.minZ-1e-8&&z<r.maxZ+1e-8);
  if(active.some(r=>r.kind==='plaza'))return'plaza';
  if(active.some(r=>r.kind==='paving'))return'paving';
  return active.length?'road':null;
}
// Merge adjacent X cells of the same type in each Z strip. The resulting
// ground, road, plaza and sidewalk boxes meet at edges without coplanar overlap.
for(let zi=0;zi<zs.length-1;zi++){
  const z0=zs[zi],z1=zs[zi+1],zc=(z0+z1)/2;let runType=null,runStart=null;
  const flushGround=(endX)=>{if(runStart!==null)add(new THREE.BoxGeometry(endX-runStart,.7,z1-z0),mats.ground,[(runStart+endX)/2,-.35,(z0+z1)/2],city,false);runStart=null};
  for(let xi=0;xi<xs.length-1;xi++){
    const x0=xs[xi],x1=xs[xi+1],type=regionAt((x0+x1)/2,zc);
    if(type){flushGround(x0);runType=null;continue}
    if(runStart===null)runStart=x0;
  }
  flushGround(xs[xs.length-1]);
}
for(let zi=0;zi<zs.length-1;zi++){
  const z0=zs[zi],z1=zs[zi+1],zc=(z0+z1)/2;let runType=null,runStart=null;
  const flushSurface=endX=>{if(runType&&runStart!==null){const h=runType==='plaza'?.1:.08,y=-h/2,mat=runType==='road'?mats.road:plazaMat;add(new THREE.BoxGeometry(endX-runStart,h,z1-z0),mat,[(runStart+endX)/2,y,(z0+z1)/2],city,false)}runStart=null;runType=null};
  for(let xi=0;xi<xs.length-1;xi++){
    const x0=xs[xi],x1=xs[xi+1],type=regionAt((x0+x1)/2,zc);
    if(type!==runType){flushSurface(x0);if(type){runType=type;runStart=x0}}
  }
  flushSurface(xs[xs.length-1]);
}
// Subtle dashed center markings follow the new east-west avenue and stop at the plaza.
for(let i=-31;i<=-4;i+=2.2)add(new THREE.BoxGeometry(.09,.002,.35),mats.roof,[i,.001,2],city,false);
for(let i=8;i<=31;i+=2.2)add(new THREE.BoxGeometry(.09,.002,.35),mats.roof,[i,.001,2],city,false);
// Faceted mountain masses with uneven shoulders and broken ridgelines.
const mountainGroup=new THREE.Group();city.add(mountainGroup);mountainGroup.position.set(-14,0,-18);
function mountain(x,z,r,h,mat){
  const segments=9,phase=x*.17+z*.11,rings=[{y:0,r:1},{y:.2,r:.86},{y:.57,r:.56},{y:.82,r:.27}],vertices=[];
  const point=(ring,i)=>{const a=(i%segments)/segments*Math.PI*2+.2+phase*.04,wobble=1+.1*Math.sin(a*3+phase)+.055*Math.cos(a*5-phase),rad=r*ring.r*wobble;return[Math.cos(a)*rad,ring.y*h+(ring.y===0?0:h*.045*Math.sin(a*2+phase)),Math.sin(a)*rad]};
  const tri=(a,b,c)=>vertices.push(...a,...b,...c),meshRings=rings.map(ring=>Array.from({length:segments},(_,i)=>point(ring,i))),apex=[Math.cos(phase)*r*.07,h,Math.sin(phase)*r*.07];
  for(let level=0;level<meshRings.length-1;level++)for(let i=0;i<segments;i++){const j=(i+1)%segments,b0=meshRings[level][i],b1=meshRings[level][j],t0=meshRings[level+1][i],t1=meshRings[level+1][j];tri(b0,t0,t1);tri(b0,t1,b1)}
  const top=meshRings[meshRings.length-1];for(let i=0;i<segments;i++)tri(top[i],apex,top[(i+1)%segments]);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
  const m=add(geometry,mat,[x,-.12,z],mountainGroup);m.castShadow=true;
}
mountain(-6,-2,9,11,mats.mountain2);mountain(2,-5,11,15,mats.mountain);mountain(11,-1,8,10,mats.mountain2);mountain(7,5,8,8,mats.mountain);
// Broad sculpted foothills form a continuous mountain base beneath the ridgelines.
const hillGeo=new THREE.SphereGeometry(1,32,20),hillPositions=hillGeo.attributes.position;for(let i=0;i<hillPositions.count;i++){const x=hillPositions.getX(i),y=hillPositions.getY(i),z=hillPositions.getZ(i),rough=1+.045*Math.sin(x*7.1+z*4.4)*Math.cos(y*5.8-z*3.1)+.022*Math.sin(y*11+x*4);hillPositions.setXYZ(i,x*rough,y*rough,z*rough)}hillGeo.computeVertexNormals();for(const h of [[-9,1,2,8,4,10],[0,1.8,0,11,5,9],[9,1,2,8,3.5,9]]){const m=add(hillGeo,mats.mountain,[h[0],h[1],h[2]],mountainGroup);m.scale.set(h[3],h[4],h[5]);m.castShadow=true}

// MOUNTAINS: a small open-air cinema is cut into the slope, with a deep roof,
// stone piers and stepped audience rows modeled on the supplied reference.
const mountainScreen=new THREE.Group();city.add(mountainScreen);mountainScreen.position.set(-18.4,4.4,-11.2);mountainScreen.rotation.y=-.62;
const screenStone=new THREE.MeshStandardMaterial({color:'#59615b',roughness:.96,metalness:.02,map:surfaceGrain,bumpMap:reliefGrain,bumpScale:.045}),terraceStone=new THREE.MeshStandardMaterial({color:'#414b49',roughness:.94,map:surfaceGrain,bumpMap:reliefGrain,bumpScale:.035}),screenReveal=new THREE.MeshStandardMaterial({color:'#121a1c',roughness:.9});
// A thin reveal sits against the hillside; the shallow lintel replaces the
// oversized canopy and columns from the previous iteration.
add(new THREE.BoxGeometry(8.34,4.72,.22),screenReveal,[0,3.48,-.2],mountainScreen,false);
for(const x of [-4.2,4.2])add(new THREE.BoxGeometry(.18,4.9,.38),screenStone,[x,3.5,-.16],mountainScreen);
add(new THREE.BoxGeometry(8.65,.22,.68),screenStone,[0,5.94,-.16],mountainScreen);
add(new THREE.BoxGeometry(8.62,.16,.5),mats.trim,[0,1.04,-.13],mountainScreen,false);
const mountainScreenSurface=artworkPanel(mountainScreen,{path:'../assets/covers/stone-is-the-root-of-cloud-v3-cover.png',width:7.92,height:4.455,position:[0,3.52,-.085],frame:mats.trim,key:'mountains'});
mountainScreenSurface.scale.x = (1909 / 1079) / (7.92 / 4.455);
// A shallow stage and gently bowed rock terraces follow the hillside contour.
add(new THREE.BoxGeometry(9.05,.22,1.15),terraceStone,[0,-.23,1.02],mountainScreen);
function curvedRockTier(width,z,depth,y){const shape=new THREE.Shape(),front=-z+depth/2,back=-z-depth/2;shape.moveTo(-width/2,front);shape.quadraticCurveTo(-width*.22,front+.22,0,front+.3);shape.quadraticCurveTo(width*.22,front+.22,width/2,front);shape.lineTo(width*.47,back);shape.quadraticCurveTo(0,back-.18,-width*.47,back);shape.closePath();const geo=new THREE.ExtrudeGeometry(shape,{depth:.24,bevelEnabled:true,bevelSegments:1,bevelSize:.04,bevelThickness:.035});geo.rotateX(-Math.PI/2);const tier=add(geo,terraceStone,[0,y,0],mountainScreen);tier.castShadow=true;tier.receiveShadow=true}
curvedRockTier(9.6,2.2,1.55,-.42);curvedRockTier(10.4,3.7,1.65,-.72);curvedRockTier(11.1,5.25,1.72,-1.02);
for(const x of [-5.2,5.2]){const slope=add(new THREE.BoxGeometry(.8,1.35,5.1),screenStone,[x,-.32,3.6],mountainScreen);slope.rotation.x=-.12;slope.rotation.z=x<0?.1:-.1}
for(const x of [-4.65,4.65])add(new THREE.BoxGeometry(.1,.055,3.3),new THREE.MeshBasicMaterial({color:'#bd9568'}),[x,-.08,2.9],mountainScreen,false);
const screenGlow=new THREE.PointLight('#d3b183',.55,7,2);screenGlow.position.set(0,3.2,.55);mountainScreen.add(screenGlow);

// Mountain switchback path and hilltop cabin.
const pathPts=[new THREE.Vector3(-13,.02,7),new THREE.Vector3(-8,.03,3),new THREE.Vector3(-11,.04,-1),new THREE.Vector3(-5,.04,-5),new THREE.Vector3(-4,.05,-10)];const curve=new THREE.CatmullRomCurve3(pathPts);const roadMesh=add(new THREE.TubeGeometry(curve,60,.48,8,false),mats.road,[0,0,0],city,false);roadMesh.position.y=.04;
function building(x,z,w,d,h,opts={}){
  const group=new THREE.Group();group.position.set(x,0,z);city.add(group);
  const tones=[mats.facade,mats.facadeAlt,mats.facadePale],tone=tones[Math.abs(Math.round(x*3+z*5))%tones.length],front=d/2;
  add(new THREE.BoxGeometry(w,h,d),tone,[0,h/2,0],group);
  add(new THREE.BoxGeometry(.24,h,d+.2),mats.side,[w/2+.1,h/2,0],group);
  add(new THREE.BoxGeometry(.16,h,d+.12),mats.side,[-w/2-.06,h/2,0],group);
  // A stone plinth, cornice and corner piers give the block a legible base and roofline.
  add(new THREE.BoxGeometry(w+.42,.42,d+.38),mats.side,[0,.21,0],group);
  add(new THREE.BoxGeometry(w+.38,.2,.28),mats.roof,[0,h-.08,front+.035],group);
  add(new THREE.BoxGeometry(w+.5,.42,d+.5),mats.roof,[0,h+.16,0],group);
  for(const xx of [-w/2+.12,w/2-.12])add(new THREE.BoxGeometry(.2,h-.25,.2),mats.trim,[xx,(h-.25)/2+.08,front+.07],group);
  const cols=Math.max(1,Math.floor((w-.55)/1.18)),spacing=(w-1)/cols,startX=-((cols-1)*spacing)/2;
  for(let floor=0,yy=1.05;yy<h-.45;floor++,yy+=1.48){
    for(let col=0;col<cols;col++){
      const xx=startX+col*spacing;if(opts.door&&yy<2.2&&Math.abs(xx)<.95)continue;const lit=!!opts.lit&&((Math.abs(Math.round((x+xx)*7+z*3+floor*5))%6)!==0),glass=lit?mats.warm:mats.glass;
      add(new THREE.BoxGeometry(.68,.8,.12),mats.trim,[xx,yy,front+.075],group,false);
      add(new THREE.BoxGeometry(.52,.62,.045),glass,[xx,yy,front+.145],group,false);
      add(new THREE.BoxGeometry(.035,.62,.04),mats.roof,[xx,yy,front+.17],group,false);
      add(new THREE.BoxGeometry(.54,.035,.04),mats.roof,[xx,yy,front+.17],group,false);
      add(new THREE.BoxGeometry(.78,.1,.22),mats.roof,[xx,yy-.46,front+.12],group);
    }
    if(floor>0)add(new THREE.BoxGeometry(w+.22,.12,.24),mats.roof,[0,yy-.76,front+.04],group);
  }
  if(h>7){
    add(new THREE.BoxGeometry(w*.34,.7,d*.38),mats.side,[0,h+.68,0],group);
    add(new THREE.BoxGeometry(w*.39,.1,d*.43),mats.roof,[0,h+1.08,0],group);
  }
  if(opts.balconies){for(let yy=1.55;yy<h;yy+=2.8)for(let xx=-w/2+.85;xx<w/2-.3;xx+=2.35){add(new THREE.BoxGeometry(1.18,.12,.72),mats.roof,[xx,yy,front+.34],group);add(new THREE.BoxGeometry(1.1,.055,.06),mats.trim,[xx,yy+.43,front+.66],group,false);for(const dx of [-.52,0,.52])add(new THREE.BoxGeometry(.045,.42,.05),mats.roof,[xx+dx,yy+.23,front+.66],group,false)}}
  if(opts.roofProfile==='hip'){const cap=add(new THREE.ConeGeometry(1,.78,4),tone,[0,h+.42,0],group);cap.scale.set(w*.52,1,d*.52);cap.rotation.y=Math.PI/4;cap.castShadow=true}
  if(opts.roofProfile==='terrace'){add(new THREE.BoxGeometry(w*.48,.58,d*.55),mats.side,[0,h+.47,-d*.08],group);add(new THREE.BoxGeometry(w*.53,.1,d*.6),mats.roof,[0,h+.8,-d*.08],group);for(const x of [-w*.23,w*.23])add(new THREE.BoxGeometry(.055,.45,d*.55),mats.trim,[x,h+.73,-d*.08],group,false)}
  if(opts.door){add(new THREE.BoxGeometry(1.42,2.45,.2),mats.roof,[0,1.2,front+.1],group);add(new THREE.BoxGeometry(1.05,2,.09),mats.side,[0,1,front+.22],group,false);add(new THREE.BoxGeometry(.16,.16,.08),mats.warm,[.37,1,.29+front],group,false)}
  return group;
}
// Varied urban blocks at different heights and depths.
building(-7,-3,5,5,8,{lit:true,roofProfile:'hip'});building(1,-8,5,4,12,{lit:true,balconies:true,roofProfile:'terrace'});building(10,-5,4,5,7,{lit:true,roofProfile:'hip'});building(14,2,6,5,10,{lit:true,balconies:true,roofProfile:'terrace'});building(-12,6,4,4,6,{lit:true,roofProfile:'hip'});
// Apartment tower, strongly legible at the right of the central avenue.
const apt=building(8,4,10,8,14,{lit:true,balconies:true});
// Symmetric banquet hall with portico, steps and glowing entrance.
const hall=building(-2,14,12,9,7,{lit:true,door:true});add(new THREE.BoxGeometry(9,.7,2),mats.roof,[-2,7.8,10],city);for(let x=-5;x<2;x+=2)add(new THREE.CylinderGeometry(.18,.22,5.8,10),mats.roof,[x,4.5,10],city);
// Contemporary archive pavilion.
building(15,13,11,8,4.6,{lit:true,door:true});
// Bus stop: platform and curb aligned beside the avenue, with shelter on the sidewalk and bus stopped in-lane.
const busAnchor=new THREE.Vector3(18,0,7.6);
const stopPlatform=new THREE.Group();stopPlatform.position.set(21.5,0,3.65);city.add(stopPlatform);
add(new THREE.BoxGeometry(10,.24,3.1),mats.roof,[0,.02,0],stopPlatform,false); // raised paved waiting platform
add(new THREE.BoxGeometry(10,.28,.24),mats.warm,[0,.24,1.56],stopPlatform,false); // curb edge toward road
// tactile paving strip on platform edge
add(new THREE.BoxGeometry(9.4,.035,.34),new THREE.MeshStandardMaterial({color:'#817d6a',roughness:.95}),[0,.16,1.25],stopPlatform,false);
const shelter=new THREE.Group();shelter.position.set(21.2,.15,3.2);city.add(shelter);
// Full canopy, slim metal posts, transparent street-facing and side panels, solid rear windbreak.
add(new THREE.BoxGeometry(5.8,.22,2.65),mats.roof,[0,3.35,0],shelter);
add(new THREE.BoxGeometry(6.05,.12,2.82),mats.side,[0,3.48,0],shelter,false);
for(const x of [-2.7,2.7])for(const z of [-1.12,1.12])add(new THREE.BoxGeometry(.12,3.25,.12),mats.side,[x,1.63,z],shelter);
add(new THREE.BoxGeometry(5.25,2.75,.055),mats.glass,[0,1.78,-1.08],shelter,false); // rear screen
add(new THREE.BoxGeometry(.055,2.65,2.05),mats.glass,[-2.64,1.72,0],shelter,false); // end screen
add(new THREE.BoxGeometry(5.45,.12,.12),mats.roof,[0,1.2,-1.12],shelter,false);
// Bench and warm illuminated route panel inside the shelter.
add(new THREE.BoxGeometry(2.65,.16,.55),mats.roof,[-.15,1.02,-.55],shelter);
for(const x of [-1.2,.9])add(new THREE.BoxGeometry(.1,.78,.12),mats.side,[x,.56,-.55],shelter);
const stopSign=new THREE.Group();stopSign.position.set(17.85,.15,3.8);city.add(stopSign);
add(new THREE.CylinderGeometry(.07,.09,3.9,10),mats.side,[0,1.95,0],stopSign);
add(new THREE.BoxGeometry(.92,1.18,.14),mats.warm,[0,3.55,0],stopSign);
add(new THREE.BoxGeometry(.68,.18,.04),mats.side,[0,3.84,.09],stopSign,false);
// A tall sheltered lightbox frames the supplied widescreen cover without
// cropping or stretching it; dark vertical margins belong to the fixture.
const busLightbox=new THREE.Group();busLightbox.position.set(2.68,2.26,-.1);busLightbox.rotation.y=Math.PI/2;shelter.add(busLightbox);
add(new THREE.BoxGeometry(2.66,2.88,.34),mats.side,[0,0,0],busLightbox);
add(new THREE.BoxGeometry(2.46,2.68,.08),mats.trim,[0,0,.2],busLightbox,false);
const busScreenSurface=artworkPanel(busLightbox,{path:'../assets/covers/Xiao Nan-cover.jpg',width:2.35,height:1.096,position:[0,0,.27],frame:mats.trim,key:'bus'});
const busPanelGlow=new THREE.PointLight('#e0bf8d',1.5,4,2);busPanelGlow.position.set(0,0,.8);busLightbox.add(busPanelGlow);
for(let i=0;i<4;i++)add(new THREE.BoxGeometry(.04,.035,.55),mats.warm,[2.65,1.72-i*.12,-.65],shelter,false);
const wetAsphalt=new THREE.MeshStandardMaterial({color:'#172327',roughness:.22,metalness:.26});
for(const [x,z,w,d] of [[19.2,5.45,5.8,.55],[24.6,6.25,3.1,.38],[16.1,9.7,2.5,.32]]){const reflection=add(new THREE.BoxGeometry(w,.012,d),wetAsphalt,[x,.012,z],city,false);reflection.rotation.y=-.08}
// A detailed single-decker bus, aligned with road direction (+X), with separate lower chassis, cabin glazing, wheels and lights.
const bus=new THREE.Group();city.add(bus);bus.position.set(19.5,0,8.35);
const busBody=new THREE.MeshStandardMaterial({color:'#687775',roughness:.58,metalness:.12}),busDark=new THREE.MeshStandardMaterial({color:'#263538',roughness:.38,metalness:.25}),busGlass=new THREE.MeshStandardMaterial({color:'#25383c',roughness:.22,metalness:.32}),lampMat=new THREE.MeshStandardMaterial({color:'#f0cf91',emissive:'#e7b56f',emissiveIntensity:1.4});
add(new THREE.BoxGeometry(7.4,.72,2.55),mats.side,[0,.65,0],bus); // chassis
add(new THREE.BoxGeometry(7.25,1.95,2.5),busBody,[0,1.88,0],bus);
add(new THREE.BoxGeometry(6.35,.16,2.54),mats.roof,[.05,2.92,0],bus);
// Continuous dark side window band, with body-colored piers between panes.
add(new THREE.BoxGeometry(6.45,.9,.035),busGlass,[-.05,2.23,1.27],bus,false);
add(new THREE.BoxGeometry(6.45,.9,.035),busGlass,[-.05,2.23,-1.27],bus,false);
for(const x of [-2.55,-1.3,0,1.3,2.45]){add(new THREE.BoxGeometry(.095,1.03,.055),busBody,[x,2.23,1.3],bus,false);add(new THREE.BoxGeometry(.095,1.03,.055),busBody,[x,2.23,-1.3],bus,false)}
// Front windscreen and face at the leading (+X) end.
add(new THREE.BoxGeometry(.045,1.25,2.12),busGlass,[3.68,2.12,0],bus,false);
add(new THREE.BoxGeometry(.1,.48,2.38),busBody,[3.69,1.25,0],bus);
add(new THREE.BoxGeometry(.07,.27,.42),lampMat,[3.75,1.15,.83],bus,false);add(new THREE.BoxGeometry(.07,.27,.42),lampMat,[3.75,1.15,-.83],bus,false);
add(new THREE.BoxGeometry(.08,.12,1.8),busDark,[3.76,.75,0],bus,false); // grille
for(const x of [-2.25,2.25]){const wheel=add(new THREE.CylinderGeometry(.58,.58,.28,20),busDark,[x,.58,1.29],bus);wheel.rotation.x=Math.PI/2;const hub=add(new THREE.CylinderGeometry(.25,.25,.3,16),mats.roof,[x,.58,1.3],bus,false);hub.rotation.x=Math.PI/2;const far=add(new THREE.CylinderGeometry(.58,.58,.28,20),busDark,[x,.58,-1.29],bus);far.rotation.x=Math.PI/2}
// Low route marker, lit stop pole and street-side litter bin.
const bin=new THREE.Group();bin.position.set(24.5,.15,5.25);city.add(bin);add(new THREE.CylinderGeometry(.33,.38,.9,12),mats.side,[0,.45,0],bin);add(new THREE.CylinderGeometry(.4,.4,.1,12),mats.roof,[0,.92,0],bin);
// Three open-front cutaway interiors make the remaining destinations readable in the city and from their close views.
const interiorMat=new THREE.MeshStandardMaterial({color:'#59696a',roughness:.88}), darkWood=new THREE.MeshStandardMaterial({color:'#493e3a',roughness:.82}), linen=new THREE.MeshStandardMaterial({color:'#b2aa96',roughness:.9}), paper=new THREE.MeshStandardMaterial({color:'#ded6c5',roughness:.8}), softLight=new THREE.MeshStandardMaterial({color:'#e8bd79',emissive:'#b36b2d',emissiveIntensity:.65}), upholstery=new THREE.MeshStandardMaterial({color:'#52615f',roughness:.96});
function roomShell(group,w,d,h,{floor=interiorMat,back=interiorMat,side=interiorMat,cutaway=false}={}){add(new THREE.BoxGeometry(w,.28,d),floor,[0,.14,0],group);add(new THREE.BoxGeometry(w,.22,.28),mats.roof,[0,h,-d/2+.14],group,false);if(!cutaway)add(new THREE.BoxGeometry(w,.22,.28),mats.roof,[0,h,d/2-.14],group,false);for(const x of [-w/2+.14,w/2-.14])add(new THREE.BoxGeometry(.28,.22,d),mats.roof,[x,h,0],group,false);add(new THREE.BoxGeometry(w,.18,.22),back,[0,h/2,-d/2],group);add(new THREE.BoxGeometry(.2,h,d),side,[-w/2,h/2,0],group)}
// BANQUET HALL: axial table, repeated upholstered chairs, a head seat and a
// portrait projection at the far end, keeping the Last Supper-like hierarchy.
const banquetRoom=new THREE.Group();banquetRoom.position.set(-2,0,14);scene.add(banquetRoom);roomShell(banquetRoom,12,9,5.2,{floor:new THREE.MeshStandardMaterial({color:'#302d30',roughness:.82}),back:new THREE.MeshStandardMaterial({color:'#403638',roughness:.9}),cutaway:true});
add(new THREE.BoxGeometry(2.25,.24,7.35),darkWood,[0,1.55,-.35],banquetRoom);add(new THREE.BoxGeometry(2.12,.08,7.16),linen,[0,1.72,-.35],banquetRoom,false);for(const x of [-.78,.78])for(const z of [-3.15,2.55])add(new THREE.BoxGeometry(.16,1.4,.16),darkWood,[x,.75,z-.35],banquetRoom);
// A quiet continuous ceiling surface preserves the room boundary without a
// foreground beam grid cutting across the film view.
add(new THREE.BoxGeometry(11.55,.08,8.55),new THREE.MeshStandardMaterial({color:'#24272a',roughness:.84}),[0,5.1,0],banquetRoom,false);
for(const x of [-5.45,5.45]){add(new THREE.BoxGeometry(.08,2.2,.08),mats.warm,[x,3.5,0],banquetRoom,false);const sconce=new THREE.PointLight('#c68459',.8,4);sconce.position.set(x*.91,3.6,0);banquetRoom.add(sconce)}
add(new THREE.BoxGeometry(3.95,4.16,.24),mats.side,[0,3,-4.22],banquetRoom,false);
const banquetScreenSurface=artworkPanel(banquetRoom,{path:'../assets/covers/The Flock-cover.png',width:3.28,height:3.79,position:[0,3,-4.065],frame:mats.trim,key:'banquet'});
for(let i=0;i<5;i++){const z=-2.9+i*1.22;for(const x of [-.66,.66]){add(new THREE.CylinderGeometry(.22,.22,.035,20),paper,[x,1.79,z-.35],banquetRoom,false);add(new THREE.CylinderGeometry(.095,.095,.34,12),softLight,[x,1.98,z-.35],banquetRoom,false);add(new THREE.BoxGeometry(.48,.025,.045),mats.roof,[x+.28,1.79,z-.35],banquetRoom,false)}}
function chair(parent,x,z,rot=0){const c=new THREE.Group();c.position.set(x,0,z);c.rotation.y=rot;parent.add(c);add(new THREE.BoxGeometry(.9,.16,.82),upholstery,[0,1,0],c);add(new THREE.BoxGeometry(.9,1.25,.14),upholstery,[0,1.62,-.34],c);for(const dx of [-.34,.34])for(const dz of [-.28,.28])add(new THREE.BoxGeometry(.09,1,.09),darkWood,[dx,.5,dz],c)}
for(const z of [-2.95,-1.55,-.15,1.25,2.65]){chair(banquetRoom,-2.05,z,Math.PI/2);chair(banquetRoom,2.05,z,-Math.PI/2)}
const banquetBeam=new THREE.SpotLight('#e6bb84',13,14,Math.PI/5,.5,1.3);banquetBeam.position.set(0,4.7,-2.6);banquetBeam.target.position.set(0,1.3,-.2);banquetRoom.add(banquetBeam,banquetBeam.target);
const banquetAnchor=new THREE.Vector3(1,7.4,17.8);
// APARTMENT 03: intimate cutaway room with a real window opening, bedroom alcove and quiet furniture group.
const apartmentRoom=new THREE.Group();apartmentRoom.position.set(8,0,4);scene.add(apartmentRoom);roomShell(apartmentRoom,10,8,4.5,{floor:new THREE.MeshStandardMaterial({color:'#425354',roughness:.92}),back:new THREE.MeshStandardMaterial({color:'#4b5d5e',roughness:.88}),side:new THREE.MeshStandardMaterial({color:'#354749',roughness:.9}),cutaway:true});
// A wide night window occupies the right-hand wall; its framing and curtains
// make the open cutaway read as a small apartment rather than a furniture set.
const nightGlass=new THREE.MeshStandardMaterial({color:'#536a70',emissive:'#253c45',emissiveIntensity:.52,roughness:.3,metalness:.16,transparent:true,opacity:.72});
add(new THREE.BoxGeometry(.045,2.72,4.75),nightGlass,[4.78,2.58,-.3],apartmentRoom,false);
for(const z of [-2.72,-1.12,.45,2.12])add(new THREE.BoxGeometry(.16,2.95,.12),mats.roof,[4.72,2.58,z],apartmentRoom,false);
for(const y of [1.08,4.06])add(new THREE.BoxGeometry(.18,.16,4.95),mats.roof,[4.72,y,-.3],apartmentRoom,false);
add(new THREE.BoxGeometry(.12,.12,5.05),mats.trim,[4.72,4.2,-.3],apartmentRoom,false);
for(const z of [-3.05,2.35]){const curtain=add(new THREE.BoxGeometry(.22,2.8,.72),upholstery,[4.48,2.45,z],apartmentRoom,false);curtain.material=curtain.material.clone();curtain.material.color.set('#59666a');curtain.material.transparent=true;curtain.material.opacity=.62}
// The TV is a real wall-mounted surface, while the open front edge frames entry into the cutaway.
add(new THREE.BoxGeometry(2.95,1.7,.2),mats.side,[-2.55,2.82,-3.82],apartmentRoom,false);
const apartmentScreenSurface=artworkPanel(apartmentRoom,{path:'../assets/covers/Me-cover.png',width:2.76,height:1.38,position:[-2.55,2.82,-3.69],frame:mats.trim,key:'apartment'});
add(new THREE.BoxGeometry(3.45,.48,.58),darkWood,[-2.55,.66,-3.35],apartmentRoom);
for(const x of [-4,-1.1])add(new THREE.BoxGeometry(.12,.6,.16),mats.side,[x,.3,-3.35],apartmentRoom);
for(const x of [-4.65,4.65])add(new THREE.BoxGeometry(.16,3.2,.16),mats.trim,[x,1.6,3.85],apartmentRoom);
add(new THREE.BoxGeometry(3.4,.42,2.15),upholstery,[-2.15,.65,1.75],apartmentRoom);add(new THREE.BoxGeometry(3.4,.72,.24),mats.side,[-2.15,1.08,.68],apartmentRoom);add(new THREE.BoxGeometry(2.15,.15,1.35),darkWood,[1.2,1.35,.2],apartmentRoom);for(const x of [.35,2.05])add(new THREE.BoxGeometry(.12,1.3,.12),mats.side,[x,.68,.2],apartmentRoom);add(new THREE.BoxGeometry(.75,.85,.72),upholstery,[1.2,.48,1.5],apartmentRoom);add(new THREE.BoxGeometry(2.65,.35,3.05),mats.side,[-1.8,.4,-2],apartmentRoom);add(new THREE.BoxGeometry(2.45,.22,2.7),linen,[-1.8,.72,-2],apartmentRoom);add(new THREE.BoxGeometry(.9,.18,.6),paper,[-2.3,.92,-2.8],apartmentRoom,false);
const apartmentLamp=new THREE.PointLight('#9bb9c0',1.1,8,2);apartmentLamp.position.set(1,3.4,1);apartmentRoom.add(apartmentLamp);const bedsideLamp=add(new THREE.CylinderGeometry(.06,.12,.46,12),softLight,[.2,1.55,-1.2],apartmentRoom,false);const bedsideGlow=new THREE.PointLight('#d8b787',.5,3);bedsideGlow.position.set(.2,1.9,-1.2);apartmentRoom.add(bedsideGlow);
const apartmentAnchor=new THREE.Vector3(8,1.5,8.1);
// ARCHIVE: a dark two-axis gallery, with a photographic wall, one large moving
// image projection, a central concrete pier, a viewing bench and an installation plinth.
const archiveRoom=new THREE.Group();archiveRoom.position.set(15,0,13);scene.add(archiveRoom);roomShell(archiveRoom,11,8,4.6,{floor:new THREE.MeshStandardMaterial({color:'#373b39',roughness:.94}),back:new THREE.MeshStandardMaterial({color:'#252b2b',roughness:.95}),side:new THREE.MeshStandardMaterial({color:'#343b3a',roughness:.94}),cutaway:true});
const galleryConcrete=new THREE.MeshStandardMaterial({color:'#414541',roughness:.96,map:surfaceGrain,bumpMap:reliefGrain,bumpScale:.025});
// Projected animation on the far wall; its plane keeps the source image ratio.
add(new THREE.BoxGeometry(4.9,3.42,.34),galleryConcrete,[1.38,2.72,-4.02],archiveRoom,false);
const archiveProjection=artworkPanel(archiveRoom,{path:'../assets/images/Animation1.jpg',width:4.25,height:3.003,position:[1.38,2.72,-3.81],frame:mats.side,key:'archive'});
// Two individually framed real photographs sit on the perpendicular left wall.
for(const [z,file] of [[-2.25,'Photo1.jpg'],[.65,'Photo2.jpg']]){
  const frame=new THREE.Group();frame.position.set(-5.12,2.62,z);frame.rotation.y=Math.PI/2;archiveRoom.add(frame);
  add(new THREE.BoxGeometry(1.78,1.31,.24),mats.trim,[0,0,0],frame);
  add(new THREE.BoxGeometry(1.58,1.12,.08),mats.side,[0,0,.15],frame,false);
  const print=add(new THREE.PlaneGeometry(1.48,.994),new THREE.MeshBasicMaterial({map:artTexture('../assets/images/'+file),toneMapped:false,side:THREE.DoubleSide}),[0,0,.205],frame,false);print.userData.workKey='archive';artworkHitTargets.push(print);
}
// A modest print pair and installation image extend the exhibition without
// turning the room into a wall of thumbnails.
const smallPrint=artworkPanel(archiveRoom,{path:'../assets/images/Animation2.jpg',width:1.34,height:.935,position:[4.6,2.6,-2.8],rotationY:-Math.PI/2,frame:mats.trim,key:'archive'});
add(new THREE.BoxGeometry(1.65,.58,1.45),galleryConcrete,[3.25,.39,-.45],archiveRoom);
add(new THREE.BoxGeometry(1.45,1.8,.2),mats.side,[3.25,1.62,-.45],archiveRoom,false);
const installationImage=artworkPanel(archiveRoom,{path:'../assets/images/installation art1.JPG',width:1.5,height:.844,position:[3.25,1.62,-.32],frame:mats.trim,key:'archive'});
// The central column and low bench establish scale and a viewing axis.
add(new THREE.BoxGeometry(.78,4.55,.9),galleryConcrete,[-.6,2.28,-.05],archiveRoom);
add(new THREE.BoxGeometry(3.25,.5,.78),new THREE.MeshStandardMaterial({color:'#747975',roughness:.88}),[.75,.52,2.25],archiveRoom);
for(const x of [-.55,2.05])add(new THREE.BoxGeometry(.12,.42,.62),mats.side,[x,.25,2.25],archiveRoom);
for(const x of [-4.6,4.55]){const spot=new THREE.SpotLight('#e8d4b2',8,9,Math.PI/7,.55,1.5);spot.position.set(x,4.2,1);spot.target.position.set(x<0?-4.8:3.2,2.2,-1);archiveRoom.add(spot,spot.target)}
const projectionGlow=new THREE.PointLight('#b8cad0',1.6,7,2);projectionGlow.position.set(1.4,2.75,-2.8);archiveRoom.add(projectionGlow);
for(const [x,label] of [[-4.8,'PHOTO'],[1.4,'MOVING IMAGE'],[3.25,'INSTALLATION']]){const cv=document.createElement('canvas');cv.width=512;cv.height=88;const ctx=cv.getContext('2d');ctx.fillStyle='#d8d5cb';ctx.font='28px monospace';ctx.textAlign='center';ctx.fillText(label,256,57);const tex=new THREE.CanvasTexture(cv);const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,opacity:.86}));sp.position.set(x,4.28,label==='PHOTO'?-.6:-3.3);sp.scale.set(2.1,.36,1);archiveRoom.add(sp)}
const archiveAnchor=new THREE.Vector3(15,1.6,17.1);
// Trees: trunk plus layered conical canopy, placed across foreground and hillside.
function tree(x,z,s=1){const g=new THREE.Group();g.position.set(x,0,z);city.add(g);add(new THREE.CylinderGeometry(.13*s,.2*s,1.5*s,7),mats.side,[0,.75*s,0],g);for(let i=0;i<3;i++)add(new THREE.ConeGeometry((1.05-i*.18)*s,1.7*s,7),mats.green,[0,(1.75+i*.9)*s,0],g)}for(const p of [[-17,9,1.2],[-15,2,1],[-12,-5,1.2],[-20,-4,1.5],[-9,14,1],[12,10,.9],[22,-12,1.2],[21,17,1]])tree(...p);
// Street lamps with warm practical lights.
function lamp(x,z){const g=new THREE.Group();g.position.set(x,0,z);city.add(g);add(new THREE.CylinderGeometry(.06,.09,4,8),mats.side,[0,2,0],g);add(new THREE.BoxGeometry(.8,.12,.12),mats.side,[.35,3.8,0],g);const light=add(new THREE.SphereGeometry(.17,10,8),mats.warm,[.72,3.7,0],g,false);const point=new THREE.PointLight('#e9b56f',18,8);point.position.set(.7,3.5,0);g.add(point)}lamp(4,5);lamp(-5,9);lamp(12,6);
const plazaPractical=new THREE.PointLight('#d1a66e',7,14,2);plazaPractical.position.set(2,3.5,2);city.add(plazaPractical);
// Visible location beacons are anchored to the actual 3D focus coordinates.
const mountainAnchor=new THREE.Vector3(-14,4,-18);const markerMat=new THREE.MeshStandardMaterial({color:'#e6ba77',emissive:'#a15d28',emissiveIntensity:.7});function beacon(pos,label){const g=new THREE.Group();g.position.copy(pos);scene.add(g);const ring=new THREE.Mesh(new THREE.TorusGeometry(.55,.045,8,40),markerMat);g.add(ring);const sprite=document.createElement('canvas');sprite.width=256;sprite.height=64;const c=sprite.getContext('2d');c.fillStyle='#e9e4d8';c.font='22px monospace';c.fillText(label,8,40);const tex=new THREE.CanvasTexture(sprite),sm=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));sm.position.set(0,1.2,0);sm.scale.set(3,0.75,1);g.add(sm);return g}const markM=beacon(mountainAnchor,'01 MOUNTAINS'),markB=beacon(busAnchor,'02 BUS STOP');
const overview = {
  position: new THREE.Vector3(24, 14.3, 53),
  target: new THREE.Vector3(1, 10.4, -18),
  fov: 43
};
const cinema = createCityOverview(stage, (key, category) => {
  if (current !== key || anim) return;
  document.querySelector('.entry .enter')?.click();
  if (category) document.querySelector(`.workroom.open [data-cat="${category}"]`)?.click();
});
cinema.settle('overview');
city.visible = false;
banquetRoom.visible = apartmentRoom.visible = archiveRoom.visible = false;
markM.visible = markB.visible = false;
const mountainCameraTarget=new THREE.Vector3(-18.35,7.32,-11.27),mountainCameraPosition=mountainCameraTarget.clone().add(new THREE.Vector3(-.58,.24,.78).normalize().multiplyScalar(13.6));const focus={overview,mountains:{position:mountainCameraPosition,target:mountainCameraTarget,fov:43},bus:{position:new THREE.Vector3(29.2,4.65,11.8),target:new THREE.Vector3(23.55,2.55,3.15),fov:42},banquet:{position:new THREE.Vector3(-1.8,4.4,23),target:new THREE.Vector3(-2,2.55,11.8),fov:40},apartment:{position:new THREE.Vector3(8.6,4.2,12),target:new THREE.Vector3(6.05,2.3,.8),fov:41},archive:{position:new THREE.Vector3(15.8,3.7,20.7),target:new THREE.Vector3(16,2.3,10.8),fov:43}};let anim=null,current='overview',openOnArrival=false;
let controlsTarget=focus.overview.target.clone();camera.position.copy(overview.position);camera.fov=overview.fov;camera.updateProjectionMatrix();camera.up.set(0,1,0);camera.lookAt(controlsTarget);camera.updateMatrixWorld(true);
enableMobileExplore(cinema, () => !anim && cinema.has(current));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function go(key) {
  const destination = focus[key];
  if (!destination || current === key) return;
  const previous = current;
  const interrupted = anim;
  const route = previous === 'overview' && cinema.duration(key) ? key :
    key === 'overview' && cinema.duration(previous) ? previous : null;
  const reverse = key === 'overview';
  const from = route && interrupted?.route === route ? interrupted.progress : reverse ? 1 : 0;
  const to = reverse ? 0 : 1;
  current = key;
  openOnArrival = false;
  const interior = ['banquet', 'apartment', 'archive'].includes(key);
  banquetRoom.visible = key === 'banquet';
  apartmentRoom.visible = key === 'apartment';
  archiveRoom.visible = key === 'archive';
  document.body.classList.toggle('in-scene', interior);
  document.body.classList.toggle('exterior-in-motion', !!route);
  document.body.style.removeProperty('--exterior-entry');
  document.querySelectorAll('[data-location]').forEach(button => button.classList.toggle('active', button.dataset.location === key));
  document.querySelector('#overview').classList.toggle('active', reverse);
  const duration = reducedMotion.matches ? 1 : route ? Math.max(1, cinema.duration(route) * Math.abs(to - from)) : 1450;
  anim = {
    key, start: performance.now(), duration, route, from, to, progress: from, announced: false,
    explorationStart: interrupted?.explorationWeight ?? 1, explorationWeight: interrupted?.explorationWeight ?? 1,
    fromP: camera.position.clone(), fromT: controlsTarget.clone(), fromFov: camera.fov,
    destination
  };
  cinema.placeLabels(false);
  if (route) cinema.play(route, from, anim.explorationWeight);
  else {
    if (interior && !cinema.has(key)) renderLegacyScene();
    cinema.settle(key);
    cinema.placeLabels(false);
  }
  document.querySelector('#title').innerHTML=({mountains:'Beyond the city,<br>into <i>weather.</i>',bus:'Waiting in<br>the <i>blue hour.</i>',banquet:'The long table,<br>the <i>many.</i>',apartment:'A room for<br>the <i>unspoken.</i>',archive:'Images held<br>in <i>common.</i>'})[key]||'From Where I Stand.';document.querySelector('#info').textContent=({mountains:'A switchback path climbs through the cloud line.',bus:'A lit shelter rests beside the avenue.',banquet:'A long table set beneath a quiet pool of light.',apartment:'A private room between reflection and the city.',archive:'Three rooms for photographs, moving images and installation.'})[key]||'Select a place to explore.'}
// Block competing destinations while the exterior route owns the camera.
document.addEventListener('click', event => {
  if (!anim?.route) return;
  const target = event.target.closest('[data-location], .world-label, #overview, #viewAllWorks, .entry .enter');
  if (!target || (target.id === 'overview' && current !== 'overview')) return;
  if (target.matches('.entry .enter') && !event.isTrusted && current !== 'overview') openOnArrival = true;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);
document.querySelectorAll('[data-location]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.location)));document.querySelector('#overview').addEventListener('click',()=>go('overview'));
for (const label of document.querySelectorAll('.world-label')) {
  label.onclick = () => go(label.id.slice(6));
}
// Artwork surfaces are real Three.js hit targets. They route through the
// existing location selection and ENTER THE WORK controls, preserving the one
// established player and Archive gallery.
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
renderer.domElement.addEventListener('pointerdown', event => {
  const exploring = document.documentElement.classList.contains('mobile-explore');
  if (event.pointerType === 'touch' && exploring && cinema.has(current)) return;
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.set(
    (event.clientX - rect.left) / rect.width * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );
  ray.setFromCamera(mouse, camera);
  const activeArtwork = artworkHitTargets.filter(surface => surface.userData.workKey === current);
  const [hit] = ray.intersectObjects(activeArtwork, true);
  const key = hit?.object.userData.workKey;
  if (anim || !key) return;
  document.querySelector(`[data-location="${key}"]`)?.click();
  document.querySelector('.entry .enter')?.click();
});
function render(now) {
  requestAnimationFrame(render);
  if (anim) {
    const t = Math.max(0, Math.min(1, (now - anim.start) / anim.duration));
    const eased = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const { route, from, to, destination } = anim;
    if (route) {
      anim.progress = THREE.MathUtils.lerp(from, to, t);
      anim.explorationWeight = Math.max(0, anim.explorationStart - t * 5);
      cinema.play(route, anim.progress, anim.explorationWeight);
      if (anim.key !== 'overview' && anim.progress > .89) {
        if (!anim.announced) {
          anim.announced = true;
          document.dispatchEvent(new CustomEvent('innercity:scene-arrived', { detail: { key: anim.key } }));
        }
        const reveal = Math.min(1, (anim.progress - .89) / .11);
        document.body.style.setProperty('--exterior-entry', reveal * reveal * (3 - 2 * reveal));
      }
    }
    camera.position.lerpVectors(anim.fromP, destination.position, eased);
    camera.fov = THREE.MathUtils.lerp(anim.fromFov, destination.fov || 38, eased);
    camera.updateProjectionMatrix();
    controlsTarget.lerpVectors(anim.fromT, destination.target, eased);
    camera.lookAt(controlsTarget);
    if (t === 1) {
      const { key: arrived, announced } = anim;
      anim = null;
      cinema.settle(arrived);
      document.body.classList.remove('exterior-in-motion');
      document.body.style.removeProperty('--exterior-entry');
      if (arrived !== 'overview' && !announced) {
        document.dispatchEvent(new CustomEvent('innercity:scene-arrived', { detail: { key: arrived } }));
      }
      if (openOnArrival) {
        openOnArrival = false;
        document.querySelector('.entry .enter')?.click();
      }
    }
  }
  if (!cinema.has(current)) renderLegacyScene();
}
requestAnimationFrame(render);
const initialBounds=new THREE.Box3().setFromObject(city);const viewHeight=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.position.distanceTo(controlsTarget);const direction=camera.getWorldDirection(new THREE.Vector3());console.info('INNER CITY camera diagnostics',{position:camera.position.toArray(),lookAt:controlsTarget.toArray(),direction:direction.toArray(),cityBounds:{min:initialBounds.min.toArray(),max:initialBounds.max.toArray()},fov:camera.fov,near:camera.near,far:camera.far,viewHeight,cityCornersInView:initialBounds.getBoundingSphere(new THREE.Sphere()).center.clone().project(camera).z<1});
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);cinema.fit();if(anim?.route)cinema.play(anim.route,anim.progress);else if(!anim)cinema.settle(current)}addEventListener('resize',resize);
window.addEventListener('error',e=>{if(/three|WebGL/i.test(e.message))document.querySelector('#error').hidden=false});
