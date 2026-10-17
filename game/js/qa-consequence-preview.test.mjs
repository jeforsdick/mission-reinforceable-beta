import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./engine.js', import.meta.url), 'utf8');
const at = source.lastIndexOf('\n})();');
assert.ok(at > 0, 'engine wrapper is present');
const code = source.slice(0, at) + `
  MR.__qaScenarioTest = {
    setCurrent(value) { current = value; },
    enabled: consequencePreviewEnabled,
    render: nextScenarioHTML,
    updateCue: updateScenarioScrollCue,
    wireCue: wireScenarioScrollCue
  };
` + source.slice(at);

function harness({ qa = true, draft = true, optIn = true } = {}) {
  const scrollListeners = new Map();
  const cueListeners = new Map();
  const scroll = {
    clientHeight: 200, scrollHeight: 680, scrollTop: 0,
    addEventListener(type, handler) { scrollListeners.set(type, handler); },
    scrollBy({top}) { this.scrollTop = Math.min(this.scrollHeight - this.clientHeight, this.scrollTop + top); scrollListeners.get('scroll')?.(); }
  };
  const cue = { dataset:{}, hidden:true, addEventListener(type, handler) { cueListeners.set(type, handler); }, click(){cueListeners.get('click')?.();} };
  const elements = {'#scenario-scroll-region':scroll,'#scenario-scroll-cue':cue,'#scenario-text':{innerHTML:''}};
  const MR = {
    telemetryContext:{qaMode:qa,draftQa:draft},
    $: s=>elements[s], $$:()=>[],
    escapeHTML:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),
    asset:()=>null
  };
  const ctx = {MR,console,URLSearchParams,
    location:{search:optIn?'?qa_consequence_preview=1':''},
    addEventListener(){},requestAnimationFrame: callback=>callback(),
    document:{addEventListener(){}}
  };
  ctx.window=ctx;
  vm.runInNewContext(code,vm.createContext(ctx));
  return {MR,scroll,cue};
}

const previous={consequence:'AM drops <two> tiles and turns toward the available adult.'};
const step={text:'AM asks for help. The classroom is calmer.'};
test('authorized draft QA shows selected consequence followed by the next scene',()=>{
  const {MR,scroll,cue}=harness();
  MR.__qaScenarioTest.setCurrent({history:[previous]});
  const html=MR.__qaScenarioTest.render(step);
  assert.match(html,/WHAT HAPPEN/);
  assert.match(html,/NOW\.\.\./);
  assert.match(html,/AM drops &lt;two&gt; tiles/);
  assert.ok(html.indexOf('AM drops')<html.indexOf('AM asks'));
  MR.__qaScenarioTest.wireCue();
  MR.__qaScenarioTest.updateCue();
  assert.equal(cue.hidden,false);
  cue.click();
  assert.ok(scroll.scrollTop>0);
  scroll.scrollTop=scroll.scrollHeight-scroll.clientHeight;
  MR.__qaScenarioTest.updateCue();
  assert.equal(cue.hidden,true);
  MR.__qaScenarioTest.setCurrent({history:[]});
  assert.doesNotMatch(MR.__qaScenarioTest.render(step),/WHAT HAPPENED/,'first scene has no previous choice');
});

test('live teacher and non-opt-in preview preserve original scenario and hide cue',()=>{
  for(const options of [{qa:false,draft:false,optIn:true},{qa:true,draft:false,optIn:true},{qa:true,draft:true,optIn:false}]) {
    const {MR,cue}=harness(options);
    MR.__qaScenarioTest.setCurrent({history:[previous]});
    assert.equal(MR.__qaScenarioTest.enabled(),false);
    assert.equal(MR.__qaScenarioTest.render(step),step.text);
    MR.__qaScenarioTest.updateCue();
    assert.equal(cue.hidden,true);
  }
});

test('QA preview markup is scoped to teacher game; copy is not committed to public demo',()=>{
 const html=fs.readFileSync(new URL('../index.html', import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../css/styles.css',import.meta.url),'utf8');
 assert.match(html,/id="scenario-scroll-region"/);
 assert.match(html,/id="scenario-scroll-cue"[^>]*hidden/);
 assert.match(html,/js\/engine\.js\?v=20261017-results-order-1/);
 assert.match(css,/\.scenario-scroll-cue\[hidden\]/);
 assert.match(css,/overflow-y: auto/);
});
