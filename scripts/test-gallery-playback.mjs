import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const exports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/portfolio/galleryPlayback.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports});
const {GalleryPlayback} = exports;
function fixture() {
  const listeners = {};
  const video = {currentTime:0,paused:true,plays:0,error:null,addEventListener:(k,f)=>listeners[k]=f,removeEventListener:k=>delete listeners[k],pause(){this.paused=true;},play(){this.paused=false;this.plays++;listeners.playing?.();return Promise.resolve();},load(){this.error=null;}};
  let status;
  const player = new GalleryPlayback(video,value=>status=value);
  return {video,player,listeners,status:()=>status};
}
const f=fixture();f.player.allow(true);f.player.show(true);
assert.equal(f.video.plays,0,'hidden second slide must not autoplay');
f.player.select(true);assert.equal(f.status(),'playing');assert.equal(f.video.loop,true);assert.equal(f.video.muted,false);assert.equal(f.video.volume,1);
f.player.select(true);assert.equal(f.video.plays,1,'React synchronization must not restart playback');
for (const [off,on] of [[()=>f.player.select(false),()=>f.player.select(true)],[()=>f.player.show(false),()=>f.player.show(true)],[()=>f.player.focus(false),()=>f.player.focus(true)]]) {
  f.video.currentTime=3;off();assert.equal(f.video.paused,true);assert.equal(f.video.currentTime,0);on();assert.equal(f.status(),'playing');assert.equal(f.video.currentTime,0);
}
f.video.error={code:2};f.listeners.error();assert.equal(f.status(),'error');assert.equal(f.video.paused,true);f.player.retry();assert.equal(f.status(),'playing');
let reject; f.player.select(false);f.video.play=()=>new Promise((_,r)=>reject=r);f.player.select(true);f.player.select(false);reject(new Error('interrupted'));await Promise.resolve();await Promise.resolve();assert.equal(f.status(),'idle','late rejection must not reveal a retry button on the hidden slide');
f.player.select(true);reject(new Error('autoplay denied'));await Promise.resolve();await Promise.resolve();assert.equal(f.status(),'error');
f.player.dispose();assert.deepEqual(Object.keys(f.listeners),[]);assert.equal(f.video.paused,true);assert.equal(f.video.currentTime,0);
const data=JSON.parse(fs.readFileSync('src/data/portfolio.json','utf8'));
for(const p of data.projects){assert.ok(p.galleryVideo.src.startsWith(p.interaction.base+'/'));for(const file of Object.values(p.galleryVideo))assert.ok(fs.existsSync('public'+file),file);}
console.log('PASS: gallery audio, loop, selection, visibility, tab hiding, reentry, error retry, stale promises, cleanup and role-specific assets.');
