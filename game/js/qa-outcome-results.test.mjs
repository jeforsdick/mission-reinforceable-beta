import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('./engine.js', import.meta.url), 'utf8');
const end = source.lastIndexOf('\n})();');
assert.ok(end > 0);
const script = source.slice(0, end) + `
  MR.__qaOutcomeTest = {
    setPending(ending, currentValue) {
      current = currentValue;
      pendingEnding = ending;
      pendingNext = null;
      modalMode = 'feedback';
    },
    getPending: () => pendingEnding,
    html: coachingDebriefHTML,
    outcome: outcomeForResults,
    close: continueAfterFeedback,
    wizard: showWizardFeedback
  };
` + source.slice(end);

function harness({ qa = true, draft = true, optIn = true } = {}) {
  const elements = new Map();
  const $ = selector => {
    if (!elements.has(selector)) elements.set(selector, {
      hidden: true, dataset: {}, textContent: '', innerHTML: '', style:{}, src:'', className:'',
      setAttribute(){}, classList: {toggle(){}}
    });
    return elements.get(selector);
  };
  const saved = { sessions:0, responses:[], details:null, screens:[] };
  const MR = {
    $,$$:()=>[],asset:k=>'/pixel/'+k+'.png',
    escapeHTML:value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),
    teacherConfig: {teacherId:'QA',displayName:'QA', defaultHearts:5,xpMax:1000, xpMultiplier:5},
    telemetryContext: {qaMode:qa,draftQa:draft,participantId:'p',caseId:'c',gameContentVersion:null,fidelityTargets:{}},
    studyDate: {dateKey:()=> '2026-10-17'},
    todayKey:()=> '2026-10-17',
    pool: {crisis:[]},
    auth: {
      completeTelemetrySession:async()=>{saved.sessions++;},
      completeParticipantMission:async()=>{saved.sessions++;return 'completed';},
      insertTelemetryResponses:async rows=>{saved.responses=rows;}
    },
    setScreen:s=> saved.screens.push(s),
    missionResume:{clear(){}},
    audio:{playSfx(){}},
    shuffle:a=>a
  };
  const ctx={MR,console,Date,Math,URLSearchParams,window:null,
    crypto: globalThis.crypto,
    location:{search:optIn?'?qa_consequence_preview=1':''},
    document:{addEventListener(){},body:{dataset:{screen:'play'}}}
  };
  ctx.window=ctx;
  vm.runInNewContext(script, vm.createContext(ctx));
  return {MR, $,saved};
}
const mission={id:'qa-crisis',title:'Fictional crisis QA',steps:{d5_supported:{choices:{
  A:{score:10,ending:'STRONG'}
}}},endings:{STRONG:{text:'The selected student returns to work and appropriately requests help.',wizard:'A successful ending!'}}};
const history=Array.from({length:5},(_,i)=>({stepId:i===4?'d5_supported':'d'+(i+1)+'_supported',
  stepIndex:i+1,choiceKey:'A',score:10, selectedScore:10,hintOpenCount:0,
  context:'Fictional',choiceText:'Plan aligned response',bestChoiceText:'Plan aligned response',
  feedback:'Helpful connection'}));
test('shared presentation moves actual mission-specific ending to Results',()=>{
 const {MR}=harness();
 const outcome={key:'STRONG',text:'The student begins working again. The full story remains available to study.',summary:'The student makes progress with appropriate help.',wizard:'The wizard celebrates.'};
 const run={mode:'crisis',missionId:'qa-crisis',score:50,maxScore:50,accuracy:100,history,missionOutcome:outcome};
 const html=MR.__qaOutcomeTest.html(run,{title:'Perfect Mission!'});
 assert.match(html,/Your Mission Outcome/);
 assert.match(html,/The student makes progress with appropriate help/);
 assert.match(html,/Read full outcome/);
 assert.match(html,/The student begins working again/);
 assert.match(html,/The wizard celebrates/);
 assert.match(html,/results-outcome-wizard/);
 assert.ok(html.indexOf('Mission Summary')<html.indexOf('Your Mission Outcome'),
   'scores must be visible before a longer mission ending');
 assert.ok(html.indexOf('Your Mission Outcome')<html.indexOf('Coaching Summary'));
 assert.ok(html.indexOf('Coaching Summary')<html.indexOf('Workable, but Refine'),
  'the secondary counts must appear below the coaching summary');
 assert.ok(html.indexOf('Missed Opportunity')<html.indexOf('<h2>Review</h2>'),
  'both counts must appear before the selection review');
 assert.ok(html.indexOf('Game practice scores')<html.indexOf('Your Mission Outcome'));
 assert.match(html,/Plan-Aligned Choices/);
 assert.match(html,/Practice Alignment/);
 assert.match(html,/Game practice scores, not classroom implementation fidelity/);
 assert.match(html,/results-stats-secondary/);
 assert.equal((html.match(/class="results-stats-secondary"/g)||[]).length,1);
 const summaryCard=html.match(/class="results-card results-summary-card"[\s\S]*?<\/section>/)?.[0] || '';
 assert.ok(summaryCard, 'summary card must exist');
 assert.doesNotMatch(summaryCard,/Workable, but Refine|Missed Opportunity/);
});
test('positive and improvement counts show all five decisions in one breakdown',()=>{
 const {MR}=harness();
 const mixed=structuredClone(history);
 mixed[1].score=mixed[1].selectedScore=5;
 mixed[2].score=mixed[2].selectedScore=0;
 mixed[0].feedback='You honored the classroom support plan.';
 mixed[0].choiceText='Help the student after an appropriate request.';
 const run={mode:'crisis',missionId:'qa-crisis',score:35,maxScore:50,accuracy:70,history:mixed};
 const html=MR.__qaOutcomeTest.html(run,{title:'Keep Practicing'});
 assert.match(html,/class="results-stats-secondary" aria-label="Choice breakdown"/);
 assert.match(html,/Plan-Aligned — What Went Well<\/dt><dd>3<\/dd>/);
 assert.match(html,/Workable, but Refine<\/dt><dd>1<\/dd>/);
 assert.match(html,/Missed Opportunity<\/dt><dd>1<\/dd>/);
 assert.ok(html.indexOf('Coaching Summary') < html.indexOf('Choice breakdown'));
 assert.ok(html.indexOf('Choice breakdown') < html.indexOf('<h2>Review</h2>'));
 assert.ok(html.indexOf('Plan-Aligned — What Went Well</h2>') < html.indexOf('Workable, but Refine</h2>'));
 assert.ok(html.indexOf('Workable, but Refine</h2>') < html.indexOf('Missed Opportunities</h2>'));
 assert.match(html,/You honored the classroom support plan/);
 const firstReview=html.match(/<article class="results-review-item results-review-best">[\s\S]*?<\/article>/)?.[0];
 assert.ok(firstReview, 'a successful choice should appear in Review');
 assert.match(firstReview,/Help the student after an appropriate request/);
 assert.doesNotMatch(firstReview,/Stronger Plan-Aligned Move/, 'successes should not be treated as errors');
 assert.equal((html.match(/<article class="results-review-item/g)||[]).length,5,
  'every decision has an appropriate review item');
});
test('perfect missions celebrate all five choices instead of showing only an empty review',()=>{
 const {MR}=harness();
 const html=MR.__qaOutcomeTest.html({mode:'daily',score:50,maxScore:50,accuracy:100,history},{title:'Perfect Mission!'});
 assert.match(html,/Plan-Aligned — What Went Well<\/dt><dd>5<\/dd>/);
 assert.match(html,/Workable, but Refine<\/dt><dd>0<\/dd>/);
 assert.match(html,/Missed Opportunity<\/dt><dd>0<\/dd>/);
 assert.equal((html.match(/class="results-review-item results-review-best"/g)||[]).length,5);
 assert.doesNotMatch(html,/No review items today/);
});
test('no plan-aligned choices still shows the complete breakdown without invented praise',()=>{
 const {MR}=harness();
 const missed=history.map(item=>({...item,score:0,selectedScore:0}));
 const html=MR.__qaOutcomeTest.html({mode:'daily',score:0,maxScore:50,accuracy:0,history:missed},{title:'Keep Practicing'});
 assert.match(html,/Plan-Aligned — What Went Well<\/dt><dd>0<\/dd>/);
 assert.match(html,/Missed Opportunity<\/dt><dd>5<\/dd>/);
 assert.doesNotMatch(html,/Plan-Aligned — What Went Well<\/h2>/);
 assert.equal((html.match(/<article class="results-review-item/g)||[]).length,5);
});

test('without an authored summary, outcomes remain short and complete story stays accessible',()=>{
 const {MR}=harness();
 const run={mode:'crisis',score:45,maxScore:50,accuracy:90,history,missionOutcome:{
   key:'MIXED',
   text:'AM accepts some support. The next step is to make appropriate communication useful. Staff continue watching the room.',
   wizard:'More practice will help.'
 }};
 const html=MR.__qaOutcomeTest.html(run,{title:'Strong Mission!'});
 assert.match(html,/results-outcome-brief">AM accepts some support\./);
 assert.match(html,/Read full outcome/);
 assert.match(html,/The next step is to make appropriate communication useful/);
 assert.ok(html.indexOf('Mission Summary')<html.indexOf('Your Mission Outcome'));
});
test('teacher, full-draft and demo receive the same mission-specific results',()=>{
 const run={mode:'crisis',score:50,maxScore:50,accuracy:100,history,missionOutcome:{key:'STRONG',text:'The student returns to work.',wizard:'A helpful finish.'}};
 for (const setting of [{qa:false,draft:false,optIn:false},{qa:true,draft:true,optIn:false},{qa:true,draft:true,optIn:true}]) {
  const {MR}=harness(setting);
  const html=MR.__qaOutcomeTest.html(run,{title:'Perfect Mission!'});
  assert.match(html,/Your Mission Outcome/);
  assert.match(html,/The student returns to work/);
  assert.match(html,/results-outcome-wizard/);
 }
});
for (const [mode,options] of Object.entries({individual:{},fullDraft:{optIn:false},teacher:{qa:false,draft:false,optIn:false},demo:{qa:false,draft:false,optIn:false}})) {
test(mode+': fifth decision reaches shared Results with one completion and five responses',async()=>{
 const {MR,$,saved}=harness(options);
 MR.pool.crisis=[mission];
 const last={key:'STRONG',text:mission.endings.STRONG.text,wizard:mission.endings.STRONG.wizard};
 const current={
  mission, mode:'crisis', studyDateKey:'2026-10-17',
  telemetrySessionId:'session-qa',telemetrySessionInsert:Promise.resolve(true),
  history:structuredClone(history), score:50,maxScore:50,hearts:5,maxHearts:5,
  expectedSteps:5,xpMax:1000
 };
 MR.__qaOutcomeTest.setPending(last,current);
 MR.__qaOutcomeTest.wizard({wizard:'Short final reaction!'},10);
 assert.equal($('#wizard-modal-continue').textContent,'View Results');
 MR.__qaOutcomeTest.close();
 await new Promise(r=>setTimeout(r,25));
 assert.equal(saved.sessions,1);
 assert.equal(saved.responses.length,5);
 assert.ok(saved.screens.includes('results'));
 assert.match($('#results-content').innerHTML,/The selected student returns to work/);
 assert.doesNotMatch($('#results-content').innerHTML,/Mission Outcome popup/);
 assert.equal(MR.__qaOutcomeTest.getPending(),null);
});
}
test('historical QA result reconstructs outcome from saved step and choice if draft still available',()=>{
 const {MR}=harness();
 MR.pool.crisis=[mission];
 const run={mode:'crisis',missionId:'qa-crisis',history};
 assert.equal(MR.__qaOutcomeTest.outcome(run).text,mission.endings.STRONG.text);
 const missing={...run,missionId:'not-loaded'};
 assert.equal(MR.__qaOutcomeTest.outcome(missing),null);
 const dash=readFileSync(new URL('./dashboard.js',import.meta.url),'utf8');
 assert.match(dash,/stepId: response\.step_id/);
 assert.match(dash,/choiceKey: response\.choice_id/);
});
