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
 assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=width&&b.y+b.height<=height,'cards stay inside the safe stage');
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
const root={querySelectorAll:s=>s==='.sphere-char'?[letter]:[{style:{}}],querySelector:()=>({})};
const fonts=target({ready:Promise.resolve()}),doc=target({hidden:false,fonts}),win=target();
const pref=target({matches:false});let ticker,cleanup=[],refs=0,clock=1000,disconnected=false, resize;
const gsap={ticker:{add:f=>ticker=f,remove:f=>{assert.equal(ticker,f);ticker=null;}},fromTo:()=>({kill(){}})};
const jsx=(type,props)=>({type,props});
const {Home}=load('src/components/portfolio/Home.tsx',{'react':{useRef:()=>({current:[root,stage,null,false][refs++]}),useState:x=>[x,()=>{}]},'react/jsx-runtime':{jsx,jsxs:jsx},'next/link':()=>{},'@/data/portfolio.json':data,'@/data/home-gallery.json':gallery,'./SiteShell':{useIntro:()=>true},'./motion':{gsap,useGSAP:fn=>{const c=fn();if(c)cleanup.push(c);}},'./sphereGeometry':math},{matchMedia:()=>pref,ResizeObserver:class{constructor(callback){resize=callback;}observe(){}disconnect(){disconnected=true;}},document:doc,window:win,performance:{now:()=>clock}});
Home();await Promise.resolve();await Promise.resolve();
for(let i=0;i<100;i++)ticker(i,16.67);
assert.ok(cards.every(c=>Number(c.style.opacity)>.99));
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
pref.matches=true;pref.listeners.get('change')();const still=cards[0].style.transform;for(let i=0;i<20;i++)ticker(i,16.67);assert.equal(still.split('scale')[0],cards[0].style.transform.split('scale')[0],'reduced motion stops rotation');
const numbers=cards[0].style.transform.match(/translate3d\(([^p]+)px,([^p]+)px/);
letterRect={left:Number(numbers[1])+18,top:Number(numbers[2])+90,width:18,height:25};resize();for(let i=0;i<60;i++)ticker(i,16.67);assert.ok(Number(letter.style.opacity)<.001,'overlapping characters fade');
letterRect={left:-200,top:-200,width:18,height:25};resize();for(let i=0;i<60;i++)ticker(i,16.67);assert.ok(Number(letter.style.opacity)>.999,'letters restore after images leave');
doc.hidden=true;doc.listeners.get('visibilitychange')();const hidden=cards[0].style.transform;ticker(200,100);assert.equal(hidden,cards[0].style.transform);
for(const c of cleanup)c();assert.equal(ticker,null);assert.equal(stage.listeners.size,0);assert.equal(win.listeners.size,0);assert.equal(doc.listeners.size,0);assert.equal(fonts.listeners.size,0);assert.ok(disconnected);
console.log('PASS: all 12 role mappings, image ratios, safe projection, collision padding, damping, decoded-image reveal, auto rotation, drag/click/keyboard distinction, cancel, zoom modifiers, reduced motion, visibility and complete cleanup.');
