import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = p => readFileSync(new URL(p,import.meta.url),'utf8');
test('both entry points load identical shared presentation assets with the same release token',()=>{
 const game=read('../index.html'), demo=read('../../demo-game/index.html');
 assert.match(demo,/<base href="\.\.\/game\/"/);
 for(const asset of ['css/styles.css','js/scenario-fit.js','js/heart-flight.js','js/engine.js','js/results-scroll.js']){
  const extract=s=>s.match(new RegExp(asset.replaceAll('.','\\.')+'\\?v=([^" ]+)'))?.[1];
  assert.ok(extract(game),asset+' must be versioned');
  assert.equal(extract(game),extract(demo),asset+' release must match');
 }
 for(const html of [game,demo]){
  assert.ok(html.indexOf('js/heart-flight.js')<html.indexOf('js/engine.js'));
  for(const id of ['scenario-scroll-region','scenario-scroll-cue','results-content','results-scroll-cue','wizard-modal-img']){
   assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
  }
 }
});
test('no URL, QA or draft flag chooses a polished presentation variant',()=>{
 const engine=read('./engine.js');
 assert.doesNotMatch(engine,/consequencePreviewEnabled|qa_consequence_preview/);
 // Auth and telemetry still own QA separation; presentation never alters assignment.
 assert.match(engine,/if \(!context\.qaMode\)[\s\S]*completeParticipantMission/);
 assert.match(engine,/else \{\s*await MR\.auth\.completeTelemetrySession/);
});
test('game and demo responses revalidate instead of retaining old presentation indefinitely',()=>{
 const config=JSON.parse(read('../../vercel.json'));
 for(const route of ['/game/:path*','/demo-game/:path*']){
  const rule=config.headers.find(x=>x.source===route);
  assert.ok(rule.headers.some(h=>h.key==='Cache-Control'&&h.value.includes('must-revalidate')));
 }
});
