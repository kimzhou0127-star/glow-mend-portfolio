import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const transpile = file => ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
function load(file, imports={},globals={}) { const exports={};vm.runInNewContext(transpile(file),{exports,require:n=>imports[n],console,...globals});return exports; }
const math=load('src/components/portfolio/sphereGeometry.ts');
const gallery=JSON.parse(fs.readFileSync('src/data/home-gallery.json'));
const data=JSON.parse(fs.readFileSync('src/data/portfolio.json'));
assert.equal(gallery.length,12);assert.equal(new Set(gallery.map(x=>x.src)).size,12);
for(const item of gallery){assert.equal(item.slug,data.projects[Math.floor((item.id-1)/4)].slug);assert.ok(fs.existsSync('public'+item.src));}
const points=math.spherePoints(12);
for(const p of points)assert.ok(Math.abs(Math.hypot(p.x,p.y,p.z)-1)<1e-10);
for(const [width,height] of [[1404,710],[1244,610],[1884,890],[2524,890],[360,500]])for(let a=0;a<Math.PI*2;a+=.17)for(const [i,p] of points.entries())for(const zoom of [.7,1,1.4]) {
 const q=math.rotatePoint(p,a*.7,a),b=math.projectCard(q,width,height,gallery[i].width/gallery[i].height,zoom,1);
 assert.ok(b.x+b.width>0&&b.y+b.height>0&&b.x<width&&b.y<height,'each card remains reachable in the full-screen field');
 assert.ok(Math.abs(b.width/b.height-gallery[i].width/gallery[i].height)<1e-8,'no crop or distortion');
}
assert.equal(math.overlaps({x:0,y:0,width:10,height:10},{x:30,y:0,width:10,height:10}),false);
assert.equal(math.overlaps({x:0,y:0,width:10,height:10},{x:17,y:0,width:10,height:10}),true);
let slow=1,fast=1;for(let i=0;i<30;i++)slow=math.damp(slow,0,4.8,1/30);for(let i=0;i<120;i++)fast=math.damp(fast,0,4.8,1/120);assert.ok(Math.abs(slow-fast)<1e-10,'frame-rate independent damping');
function target(extra={}) {return {listeners:new Map(),addEventListener(k,f){this.listeners.set(k,f);},removeEventListener(k,f){assert.equal(this.listeners.get(k),f);this.listeners.delete(k);},...extra};}
const cards=gallery.map(()=>({style:{},tabIndex:0,querySelector:()=>({decode:()=>Promise.resolve()}),matches(){return !!this.keyboardFocus;},closest(s){return s==='.sphere-card'?this:null;},setPointerCapture(){this.captured=true;},hasPointerCapture(){return !!this.captured;},releasePointerCapture(){this.captured=false;}}));
let letterRect={left:700,top:430,width:18,height:25};
const letter={style:{},getBoundingClientRect:()=>letterRect};
const stage=target({dataset:{},querySelectorAll:()=>cards,getBoundingClientRect:()=>({left:18,top:90,width:1404,height:710})});
const contrast={style:{},getAttribute:()=>null,removeAttribute(name){assert.equal(name,'style');this.style={};},getBoundingClientRect:()=>({left:0,top:0,width:1404,height:710})};
const root={parentElement:{parentElement:{querySelectorAll:()=>[contrast]}},querySelectorAll:s=>s==='.sphere-char'?[letter]:[{style:{}}],querySelector:()=>({})};
const fonts=target({ready:Promise.resolve()}),doc=target({hidden:false,fonts}),win=target();
const pref=target({matches:false});let ticker,cleanup=[],refs=0,clock=1000,disconnected=false, resize;
const gsap={ticker:{add:f=>ticker=f,remove:f=>{assert.equal(ticker,f);ticker=null;}},fromTo:()=>({kill(){}})};
const jsx=(type,props)=>({type,props});
const {Home}=load('src/components/portfolio/Home.tsx',{'react':{useRef:()=>({current:[root,stage,null,false][refs++]}),useState:x=>[x,()=>{}]},'react/jsx-runtime':{jsx,jsxs:jsx},'next/link':()=>{},'@/data/portfolio.json':data,'@/data/home-gallery.json':gallery,'./SiteShell':{useIntro:()=>true},'./motion':{gsap,useGSAP:fn=>{const c=fn();if(c)cleanup.push(c);}},'./sphereGeometry':math},{matchMedia:()=>pref,ResizeObserver:class{constructor(callback){resize=callback;}observe(){}disconnect(){disconnected=true;}},document:doc,window:win,getComputedStyle:()=>({color:'rgb(17, 17, 17)'}),performance:{now:()=>clock}});
Home();await Promise.resolve();await Promise.resolve();resize();
for(let i=0;i<100;i++)ticker(i,16.67);
assert.ok(cards.every(c=>Number(c.style.opacity)>.54&&Number(c.style.opacity)<=1),'decoded cards stay visible at every depth');
assert.ok(cards.some(c=>Number(c.style.opacity)>.99&&c.style.filter==='none'),'front images stay clear');
const rearCard=cards.find(c=>Number(c.style.opacity)<.8);
assert.ok(rearCard&&rearCard.style.filter.startsWith('blur('),'rear images fade and blur');
rearCard.keyboardFocus=true;stage.listeners.get('focusin')({target:rearCard});
for(let i=0;i<60;i++)ticker(i,16.67);
assert.ok(Number(rearCard.style.opacity)>.999&&rearCard.style.filter==='none','keyboard focus restores rear image clarity');
rearCard.keyboardFocus=false;stage.listeners.get('focusout')();
for(let i=0;i<60;i++)ticker(i,16.67);
assert.ok(Number(rearCard.style.opacity)<.9&&rearCard.style.filter!=='none','depth effect returns after focus leaves');
assert.equal(contrast.style.color,'transparent');assert.equal(contrast.style.backgroundClip,'text');assert.ok(contrast.style.background.includes('linear-gradient(#fff,#fff)'),'image overlap paints white glyphs');
cards[0].keyboardFocus=true;fireFocus();function fireFocus(){stage.listeners.get('focusin')({target:cards[0]});}
const focusedPose=cards[0].style.transform;for(let i=0;i<20;i++)ticker(i,16.67);const xy = t => t.match(/translate3d\(([^p]+)px,([^p]+)px/).slice(1).map(Number);assert.ok(Math.hypot(...xy(focusedPose).map((v,i)=>v-xy(cards[0].style.transform)[i]))<1e-6,'keyboard focus pauses movement');
cards[0].keyboardFocus=false;fireFocus();
const transform=cards[0].style.transform;ticker(101,16.67);assert.notEqual(transform,cards[0].style.transform,'auto rotation');
const evt=(x,y,time)=>({pointerId:1,button:0,clientX:x,clientY:y,timeStamp:time,target:cards[0]});
const fire=(type,e)=>stage.listeners.get(type)(e);
fire('pointerdown',evt(200,200,1));fire('pointermove',evt(280,240,20));assert.equal(stage.dataset.dragging,'true');fire('pointerup',evt(280,240,30));
let prevented=false;fire('click',{detail:1,preventDefault(){prevented=true;},stopPropagation(){}});assert.equal(prevented,true,'drag cannot navigate');assert.equal(stage.dataset.dragging,undefined);
prevented=false;fire('pointerdown',evt(200,200,100));fire('pointerup',evt(202,201,120));fire('click',{detail:1,preventDefault(){prevented=true;},stopPropagation(){}});assert.equal(prevented,false,'click navigates');
fire('pointerdown',evt(200,200,200));fire('pointermove',evt(230,200,220));fire('pointercancel',{});assert.equal(stage.dataset.dragging,undefined);
fire('click',{detail:0,preventDefault(){throw new Error('keyboard navigation blocked');},stopPropagation(){}});
let wheelPrevented=false;fire('wheel',{ctrlKey:false,metaKey:false,preventDefault(){wheelPrevented=true;}});assert.equal(wheelPrevented,false);
fire('wheel',{ctrlKey:true,deltaY:-99999,preventDefault(){wheelPrevented=true;}});assert.equal(wheelPrevented,true);for(let i=0;i<150;i++)ticker(i,16.67);
pref.matches=true;pref.listeners.get('change')();const still=cards[0].style.transform;for(let i=0;i<20;i++)ticker(i,16.67);assert.ok(Math.hypot(...xy(still).map((v,i)=>v-xy(cards[0].style.transform)[i]))<1e-6,'reduced motion stops rotation');
doc.hidden=true;doc.listeners.get('visibilitychange')();const hidden=cards[0].style.transform;ticker(200,100);assert.equal(hidden,cards[0].style.transform);
for(const c of cleanup)c();assert.ok(cards.every(c=>c.style.filter===''&&c.style.opacity===''),'depth styles clear on unmount');assert.equal(ticker,null);assert.equal(stage.listeners.size,0);assert.equal(win.listeners.size,0);assert.equal(doc.listeners.size,0);assert.equal(fonts.listeners.size,0);assert.ok(disconnected);assert.equal(Object.keys(contrast.style).length,0,"original header styling restored on leaving homepage");
console.log('PASS: all 12 role mappings, image ratios, full-screen projection, collision padding, damping, decoded-image reveal, auto rotation, drag/click/keyboard distinction, cancel, zoom modifiers, reduced motion, visibility and complete cleanup.');

const label={x:10,y:10,width:100,height:20};
assert.equal(math.textImageBackground(label,[], 'rgb(17, 17, 17)'), 'linear-gradient(rgb(17, 17, 17),rgb(17, 17, 17))');
assert.ok(math.textImageBackground(label,[{x:40,y:0,width:30,height:40}], '#777').startsWith('linear-gradient(#fff,#fff) 30px -10px / 30px 40px no-repeat,'));
assert.equal(math.textImageBackground(label,[{x:200,y:200,width:30,height:40}], '#777'), 'linear-gradient(#777,#777)');
const top=math.projectCard({x:0,y:-1,z:0},1440,900,.75,1);
const bottom=math.projectCard({x:0,y:1,z:0},1440,900,.75,1);
assert.ok(top.y+top.height/2>200&&bottom.y+bottom.height/2<700,'normal orbit stays compact rather than pushing images to screen edges');
assert.ok(fs.readFileSync('src/app/globals.css','utf8').includes('.sphere-stage { position: absolute; inset: 0;'),'full-screen movement boundary remains available');
assert.ok(Math.abs(top.width-185*Math.min(1404/1440,710/700)*2/1.5)<1e-8,'approved image size unchanged');
console.log('PASS: compact orbit with full-screen boundary, preserved image size, white text only over images and original-color restoration.');

assert.equal(math.depthAppearance(1).opacity,1);assert.equal(math.depthAppearance(1/3).blur,0);
assert.ok(Math.abs(math.depthAppearance(-1).opacity-.65)<1e-10);assert.equal(math.depthAppearance(-1).blur,6);
let previous=math.depthAppearance(-1);
for(let z=-.999;z<=1;z+=.001){const next=math.depthAppearance(z);assert.ok(next.opacity>=previous.opacity&&next.blur<=previous.blur);assert.ok(Math.abs(next.blur-previous.blur)<.007,'smooth depth transitions without a boundary jump');previous=next;}
console.log('PASS: continuous rear blur/opacity, clear front third, keyboard clarity and depth-style cleanup.');

assert.ok(math.depthAppearance(0).blur>0&&math.depthAppearance(0).opacity<1,'middle layer participates in the gradual effect');
