import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const data = JSON.parse(fs.readFileSync(new URL('../src/data/portfolio.json', import.meta.url), 'utf8'));
const config = data.projects[Number(process.env.CHARACTER_INDEX ?? 0)].interaction;
const transpile = file => ts.transpileModule(fs.readFileSync(file,'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
function load(file, imports, globals={}) {
  const exports = {};
  vm.runInNewContext(transpile(file), { exports, require:name=>imports[name], console, ...globals });
  return exports;
}
const motion = load('src/components/portfolio/characterMotion.ts',{});
const rect = {left:700,top:50,width:615,height:820};
assert.equal(motion.lookFrameForPointer(1007.5,230.4,rect,config),null);
for(let i=1;i<config.directions.length;i++)assert.ok(config.directions[i].frame>config.directions[i-1].frame,'orbit samples must be monotonic');
assert.equal(config.directions.at(-1).frame-config.directions[0].frame,config.frameCount);
let previous;
for(let degree=-540;degree<=540;degree+=.5){
  const r=degree*Math.PI/180;
  const frame=motion.lookFrameForPointer(1007.5+400*Math.cos(r),230.4+400*Math.sin(r),rect,config);
  assert.ok(Number.isFinite(frame)&&frame>=0&&frame<config.frameCount);
  if(previous!==undefined)assert.ok(Math.abs(motion.nearestLoopFrame(frame,previous,config.frameCount)-previous)<1,'no discontinuity anywhere in three complete circles');
  previous=frame;
}
for(const [current,target] of [[0,191],[191,0],[48,144],[143,145]])assert.ok(Math.abs(motion.nearestLoopFrame(target,current,192)-current)<=96);
const atlasMocks={fetch:async()=>({ok:true,blob:async()=>({})}),createImageBitmap:async()=>({width:3840,height:3840,close(){this.closed=true;}}),AbortController};
const {LookAtlases}=load('src/components/portfolio/LookAtlases.ts',{'./characterMotion':motion},atlasMocks);
function eventTarget() {return { listeners:{}, addEventListener(k,f){this.listeners[k]=f;}, removeEventListener(k){delete this.listeners[k];} };}
async function test() {
  let hook, refsIndex=0, stateIndex=0, tick, busy=null;
  const win=eventTarget(), doc={...eventTarget(), hidden:false,documentElement:eventTarget()};
  const root={getBoundingClientRect:()=>rect}, draws=[];
  const canvas={style:{},getContext:()=>({drawImage:(_image,x,y)=>draws.push(`${x}:${y}`)})};
  const videos=config.actions.map(()=>({style:{opacity:'0'},currentTime:0,duration:4,paused:true,play(){this.paused=false; this.onplaying?.(); return Promise.resolve();},pause(){this.paused=true;}}));
  const refs=[{current:root},{current:canvas},{current:videos},{current:null},{current:()=>{}}];
  const timers=new Map();let timerId=0;
  const react={ useRef:()=>refs[refsIndex++], useState:()=>stateIndex++===0?[true,()=>{}]:stateIndex===2?["loading",()=>{}]:[null,value=>{busy=value;}],useEffect:()=>{} };
  const gsap={ticker:{add(fn){tick=fn;},remove(){tick=null;}},to(node,opts){node.style.opacity=String(opts.opacity);opts.onComplete?.();return {kill(){}};}};
  class Image {decode(){return Promise.resolve();}}
  const mod=load('src/components/portfolio/CharacterInteraction.tsx',{
    react,'react/jsx-runtime':{jsx:()=>({}),jsxs:()=>({})},'./motion':{gsap,useGSAP:fn=>{hook=fn;}},'./SiteShell':{useIntro:()=>true},'./characterMotion':motion,'./LookAtlases':{LookAtlases}
  },{ Image,window:win,document:doc,matchMedia:()=>({matches:false}),ResizeObserver:class{observe(){} disconnect(){}},setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id) });
  mod.CharacterInteraction({config,active:true,name:'Shield Soother'});
  const cleanup=hook({},fn=>fn);
  const flush=async()=>{for(let i=0;i<25;i++)await Promise.resolve();};
  await flush();tick(0,16);assert.ok(draws.length,'rest pose renders');
  win.listeners.pointermove({clientX:1300,clientY:100,pointerType:'mouse'});
  for(let i=0;i<100;i++){await flush();tick(i/60,16);}
  assert.ok(new Set(draws).size>8,'pointer motion produces a sequence of different poses');
  for(let i=0;i<3;i++) {
    refs[4].current(i);assert.equal(busy,config.actions[i].label);assert.equal(videos[i].paused,false);
    assert.equal(videos[i].muted,false);assert.equal(videos[i].volume,1);
    refs[4].current((i+1)%3);assert.equal(busy,config.actions[i].label,'repeated clicks do not interrupt');
    videos[i].onended();assert.equal(busy,null);assert.equal(videos[i].paused,true);assert.equal(videos[i].style.opacity,'0');
  }
  refs[4].current(0);videos[0].onerror();assert.equal(busy,null,'video errors recover to tracking');
  refs[4].current(1);doc.hidden=true;doc.listeners.visibilitychange();assert.ok(videos[1].paused);assert.equal(busy,null);doc.hidden=false;
  videos[0].play=()=>Promise.reject(new Error('media unavailable'));refs[4].current(0);await flush();assert.equal(busy,null,'play rejection recovers');
  refs[4].current(2);cleanup();assert.ok(videos.every(v=>v.paused));assert.equal(tick,null);assert.equal(busy,null);
  assert.equal(Object.keys(win.listeners).length,0);assert.equal(Object.keys(doc.listeners).length,0);assert.equal(timers.size,0);
  const cache=new LookAtlases(config);
  assert.equal(cache.decodedBytes,225*1024*1024);
  assert.equal(cache.ready,false);await cache.prepare();assert.equal(cache.ready,true);
  const calls=[];const ctx={drawImage:(...args)=>calls.push(args)};
  for(let i=0;i<192;i++)cache.draw(ctx,i);
  assert.equal(calls.length,192);
  assert.ok(calls.every(args=>args.length===9&&args[1]>=0&&args[1]+480<=3840&&args[2]>=0&&args[2]+640<=3840));
  cache.dispose();assert.equal(cache.ready,false);cache.draw(ctx,0);assert.equal(calls.length,192);
  let release;let closed=0;
  const {LookAtlases:Delayed}=load('src/components/portfolio/LookAtlases.ts',{'./characterMotion':motion},{...atlasMocks,createImageBitmap:()=>new Promise(resolve=>{release=()=>resolve({width:3840,height:3840,close(){closed++;}});})});
  const cancelled=new Delayed({...config,atlas:{...config.atlas,count:1}});const pending=cancelled.prepare();await flush();cancelled.dispose();release();await pending;assert.equal(closed,1);assert.equal(cancelled.ready,false);
  const {LookAtlases:Failed}=load('src/components/portfolio/LookAtlases.ts',{'./characterMotion':motion},{...atlasMocks,fetch:async()=>({ok:false,status:404})});
  const failed=new Failed(config);await assert.rejects(failed.prepare());assert.equal(failed.ready,false);
  refs[3].current.dispose();
  for(const p of data.projects) for(const src of [p.cover,p.workCover,...p.images,...p.detailImages].filter(Boolean))assert.ok(fs.existsSync('public'+src),src);
  for(let i=0;i<config.atlas.count;i++)assert.ok(fs.existsSync(`public${config.base}/${config.atlas.directory}/atlas-${i}.webp`));
  for(const action of config.actions)assert.ok(fs.existsSync(`public${config.base}/${action.file}`));
  console.log('PASS: direction mapping, continuous pose updates, all 3 actions, repeat-click guard, playback errors, visibility pause, cleanup, complete atlas preparation, cancel/error cleanup, memory budget, asset references.');
}
test().catch(error=>{console.error(error);process.exitCode=1;});
