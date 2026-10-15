import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = file => readFileSync(new URL(file, import.meta.url), 'utf8');
const checkpointSource = source('./mission-resume.js');
const storageSource = source('./storage.js');
const timerSource = source('./session-timer.js');
const engineSource = source('./engine.js').replace('  MR.engine = {',
  '  MR.__test = { selectChoice, getCurrent: () => current, getCheckpointStage: () => checkpointStage };\n  MR.engine = {');

const createStorage = () => {
  const values = new Map();
  return {
    values,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: key => { values.delete(key); }
  };
};

function mission() {
  const steps = {};
  for (let n = 1; n <= 5; n++) {
    for (const state of n === 1 ? ['start'] : ['supported','wobbly','escalated']) {
      const key = `d${n}_${state}`;
      steps[key] = {
        text: 'Fictional classroom',
        hint: 'Use the plan',
        meta: { fidelityTargetKey: 'proactive_01' },
        choices: Object.fromEntries([['A',10,'supported'],['B',5,'wobbly'],['C',0,'escalated']]
          .map(([choice,score,nextState]) => [choice, {
            score, text: 'Choice '+choice, consequence: 'Modeled result',
            wizard: 'Wizard feedback', feedback: 'Behavioral explanation',
            meta: { bipComponent: 'Prevent', function: 'attention' },
            ...(n === 5 ? { ending: score === 10 ? 'STRONG' : score === 5 ? 'MIXED' : 'FRAGILE' }
              : { next: `d${n+1}_${nextState}` })
          }]))
      };
    }
  }
  return {
    id: 'CASE-QA_DAILY_01', title: 'Safe Fictional Practice',
    expectedSteps: 5, start: 'd1_start', steps,
    endings: Object.fromEntries(['STRONG','MIXED','FRAGILE'].map(k=>[k,{text:k,wizard:k}]))
  };
}

function harness(storage, db, options = {}) {
  const elements = new Map();
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, {
      hidden: true, dataset: {}, textContent: '', innerHTML: '', style: {},
      classList: { add(){}, remove(){}, toggle(){} },
      setAttribute(){}, addEventListener(){}
    });
    return elements.get(selector);
  };
  const now = { date: options.date || '2026-10-15' };
  const MR = {
    $: element, $$: () => [], escapeHTML: value => String(value || ''),
    setScreen: view => { MR.screen = view; },
    todayKey: () => now.date,
    studyDate: { dateKey: () => now.date, dailySeed: () => 20261015 },
    studyCalendar: { isEligibleStudyDay: () => true },
    teacherConfig: { teacherId:'CASE-QA',displayName:'QA',defaultHearts:5,missionSteps:5,xpMax:1000,shuffleChoices:false },
    pool: { daily:[mission()], wild:[],crisis:[] },
    telemetryContext: { participantId:'teacher-01',caseId:'case-01',gameContentVersion:3,qaMode:options.qaMode || false,fidelityTargets:{} },
    dailyMissionCompleted: false,
    asset: () => 'placeholder.svg',
    audio: { playSfx() {}, startBgm() {} }
  };
  let creates = 0;
  MR.auth = {
    async hasCompletedMissionToday() { return false; },
    async createTelemetrySession(row) { creates++; db.set(row.id,{...row}); },
    async getMissionSession(id) { return db.get(id) || null; },
    async completeParticipantMission(id) { db.get(id).status='completed';return 'completed'; },
    async completeTelemetrySession(id) { db.get(id).status='completed'; },
    async insertTelemetryResponses(rows) { db.responses.push(...rows); }
  };
  const handlers = {};
  const globals = { window:null, document:{hidden:false,body:{dataset:{screen:'play'}},addEventListener(){}}, localStorage:storage,
    console, Date, Math, Uint8Array, setTimeout, clearTimeout, MR };
  globals.window = globals;
  globals.addEventListener = (type,callback) => { handlers[type] = callback; };
  globals.crypto = { randomUUID: () => 'fafafafa-1111-4111-8111-fafafafafafa', getRandomValues: arr => arr.fill(1) };
  globals.scrollTo = () => {};
  const context = vm.createContext(globals);
  [storageSource,checkpointSource,timerSource,engineSource].forEach(script=>vm.runInContext(script,context));
  return { MR,db,elements,now,handlers, get creates(){return creates;} };
}

test('refresh during feedback resumes the identical scored branch and same database session',async()=>{
  const storage=createStorage(),db=new Map();db.responses=[];
  const one=harness(storage,db);await one.MR.engine.start('daily');
  one.MR.engine.continueAfterFeedback(); // briefing -> first question; one session inserted
  await Promise.resolve();
  one.MR.__test.selectChoice('B');
  assert.equal(one.MR.__test.getCurrent().history.length,1);
  assert.equal(one.MR.__test.getCurrent().hearts,4.5);
  const saved=one.MR.missionResume.read();
  assert.equal(saved.stage,'feedback');
  assert.equal(saved.answers.length,1);
  assert.doesNotMatch(JSON.stringify(saved),/Wizard feedback|Fictional classroom|Behavioral explanation/);
  const two=harness(storage,db);
  assert.equal(await two.MR.engine.resumeSavedMission(),true);
  assert.equal(two.creates,0,'resuming must never insert a second telemetry session');
  assert.equal(two.MR.__test.getCurrent().history.length,1);
  assert.equal(two.MR.__test.getCurrent().score,5);
  assert.equal(two.MR.__test.getCurrent().hearts,4.5);
  two.MR.engine.continueAfterFeedback();
  assert.equal(two.MR.__test.getCurrent().stepId,'d2_wobbly');
  assert.equal(two.MR.missionResume.read().stage,'question');
  assert.equal(two.MR.missionResume.read().answers.length,1);
});

test('leaving to Mission Menu pauses and resumes the same mission',async()=>{
  const storage=createStorage(),db=new Map();db.responses=[];
  const run=harness(storage,db);
  await run.MR.engine.start('daily');run.MR.engine.continueAfterFeedback();
  run.MR.__test.selectChoice('A');run.MR.engine.continueAfterFeedback();
  assert.equal(run.MR.engine.leaveMissionToMenu(),true);
  assert.equal(run.MR.engine.resumableMission().completed,1);
  assert.equal(await run.MR.engine.resumeSavedMission(),true);
  assert.equal(run.MR.__test.getCurrent().stepId,'d2_supported');
  assert.equal(run.creates,1);
});

test('five decisions complete once; stored checkpoint disappears after successful telemetry',async()=>{
  const storage=createStorage(),db=new Map();db.responses=[];
  const run=harness(storage,db);await run.MR.engine.start('daily');
  run.MR.engine.continueAfterFeedback();
  for(let i=0;i<5;i++){
    run.MR.__test.selectChoice('A');
    run.MR.engine.continueAfterFeedback();
  }
  assert.equal(run.MR.missionResume.read().stage,'outcome');
  run.MR.engine.continueAfterFeedback();
  await new Promise(resolve => setTimeout(resolve, 35)); // Allow async DB completion and response insert to settle.
  assert.equal(db.responses.length,5);
  assert.equal(run.MR.missionResume.read(),null);
  assert.equal(run.creates,1);
});

test('new study date and different participant cannot inherit an unfinished mission',async()=>{
  const storage=createStorage(),db=new Map();db.responses=[];
  const run=harness(storage,db);await run.MR.engine.start('daily');
  run.MR.engine.continueAfterFeedback();
  assert.ok(run.MR.missionResume.read());
  run.now.date='2026-10-16';
  assert.equal(run.MR.missionResume.read(),null);
  const user2=harness(storage,db);
  user2.MR.telemetryContext.participantId='another';
  assert.equal(user2.MR.missionResume.read(),null);
});

test('completed/unknown backend session cannot be resurrected, even in QA',async()=>{
  const storage=createStorage(),db=new Map();db.responses=[];
  const run=harness(storage,db,{qaMode:true});await run.MR.engine.start('daily');
  run.MR.engine.continueAfterFeedback();await Promise.resolve();
  const saved=run.MR.missionResume.read();
  db.get(saved.sessionId).status='completed';
  const refreshed=harness(storage,db,{qaMode:true});
  assert.equal(await refreshed.MR.engine.resumeSavedMission(),false);
  assert.equal(refreshed.MR.missionResume.read(),null);
});

test('navigation preserves external Website link and in-game Mission Menu controls',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const app=source('./app.js');
  assert.match(html, /class="back-to-site-cottage" href="\.\.\/" aria-label="Visit the Mission: Reinforceable website"/);
  assert.match(html, /id="nav-home"[^>]*>[\s\S]*?Mission Menu<\/button>/);
  assert.match(html, /id="play-menu-btn"/);
  assert.match(app, /MR\.engine\.leaveMissionToMenu\(\)/);
  assert.match(app, /MR\.engine\.resumeSavedMission\(\)/);
});

test('browser Back restores active timer only for a valid same-day checkpoint', async () => {
  const storage=createStorage(),db=new Map();db.responses=[];
  const run=harness(storage,db);
  await run.MR.engine.start('daily');
  run.MR.engine.continueAfterFeedback();
  let resumes=0;
  run.MR.SessionTimer.resume=()=>{resumes++;};
  run.handlers.pagehide();
  run.handlers.pageshow({ persisted: true });
  assert.equal(resumes,1);
  run.now.date='2026-10-16';
  run.handlers.pageshow({ persisted: true });
  assert.equal(resumes,1,'expired checkpoints must not resume active play');
});

test('active unfinished mission cannot accept further decisions after Denver study date changes', async()=>{
  const storage=createStorage(),db=new Map(); db.responses=[];
  const run=harness(storage,db);
  await run.MR.engine.start('daily');
  run.MR.engine.continueAfterFeedback();
  run.MR.__test.selectChoice('A');
  assert.equal(run.MR.__test.getCurrent().history.length,1);
  run.now.date='2026-10-16';
  run.MR.engine.continueAfterFeedback();
  assert.equal(run.MR.__test.getCurrent(),null);
  assert.equal(run.MR.missionResume.read(),null);
  assert.equal(db.responses.length,0);
});

test('other game navigation preserves the ongoing session before changing screens',()=>{
  const app=source('./app.js');
  const progress=app.match(/#nav-progress'\)\.addEventListener\('click',[\s\S]*?MR\.setScreen\('progress'\)/)?.[0]||'';
  const resources=app.match(/#nav-resources'\)\.addEventListener\('click',[\s\S]*?MR\.setScreen\('resources'\)/)?.[0]||'';
  assert.match(progress,/MR\.engine\.leaveMissionToMenu\(\)/);
  assert.match(resources,/MR\.engine\.leaveMissionToMenu\(\)/);
});
