import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./results-scroll.js', import.meta.url), 'utf8');

function harness({ visibleHeight = 180, fullHeight = 680 } = {}) {
  const frames = new Map();
  const events = new Map();
  let frameNumber = 0;
  const contentListeners = new Map();
  const cueListeners = new Map();
  const content = {
    clientHeight: visibleHeight,
    scrollHeight: fullHeight,
    scrollTop: 0,
    parentElement: null,
    addEventListener(type, fn) { contentListeners.set(type, fn); },
    scrollBy({ top }) {
      this.scrollTop = Math.min(this.scrollHeight - this.clientHeight, this.scrollTop + top);
      contentListeners.get('scroll')?.();
    }
  };
  const cue = {
    hidden: true,
    addEventListener(type, fn) { cueListeners.set(type, fn); },
    click() { cueListeners.get('click')?.(); }
  };
  const nodes = { 'results-content': content, 'results-scroll-cue': cue };
  const document = {
    readyState: 'loading',
    getElementById(id) { return nodes[id]; },
    addEventListener(type, fn) { events.set(type, fn); }
  };
  const context = {
    MR: {},
    document,
    addEventListener(type, fn) { events.set('window:' + type, fn); },
    requestAnimationFrame(fn) { const id = ++frameNumber; frames.set(id, fn); return id; },
    cancelAnimationFrame(id) { frames.delete(id); }
  };
  context.window = context;
  vm.runInNewContext(source, context);
  function flush() {
    for (let guard = 0; frames.size && guard < 10; guard++) {
      const pending = Array.from(frames.values());
      frames.clear();
      pending.forEach(fn => fn());
    }
  }
  events.get('DOMContentLoaded')?.();
  flush();
  return { context, content, cue, flush, events };
}

test('More below appears only for overflowing visible results, disappears at bottom', () => {
  const view = harness();
  view.context.MR.resultsScroll.refresh();
  view.flush();
  assert.equal(view.cue.hidden, false);
  view.cue.click();
  view.flush();
  assert.ok(view.content.scrollTop > 0);
  assert.equal(view.cue.hidden, false);
  view.content.scrollTop = view.content.scrollHeight - view.content.clientHeight;
  view.content.scrollBy({ top: 0 });
  view.flush();
  assert.equal(view.cue.hidden, true, 'cue is hidden when all coaching/review content has been reached');
  view.context.MR.resultsScroll.refresh();
  view.flush();
  assert.equal(view.content.scrollTop, 0, 'new mission starts at the top of the results');
  assert.equal(view.cue.hidden, false, 'new long results restore their scroll affordance');
});

test('short and hidden results never show a misleading scroll cue', () => {
  const view = harness({ visibleHeight: 180, fullHeight: 180 });
  view.context.MR.resultsScroll.refresh();
  view.flush();
  assert.equal(view.cue.hidden, true);
  view.content.scrollHeight = 300;
  view.content.clientHeight = 0; // results screen is hidden
  view.events.get('window:resize')?.();
  view.flush();
  assert.equal(view.cue.hidden, true);
  view.content.clientHeight = 180;
  view.events.get('window:orientationchange')?.();
  view.flush();
  assert.equal(view.cue.hidden, false);
});

test('teacher and public demo use same accessible results cue and responsive scroll styling', () => {
  for (const path of ['../index.html', '../../demo-game/index.html']) {
    const html = fs.readFileSync(new URL(path, import.meta.url), 'utf8');
    assert.match(html, /id="results-content"[^>]*tabindex="0"[^>]*role="region"/);
    assert.match(html, /id="results-scroll-cue"[^>]*aria-controls="results-content"[^>]*hidden/);
    assert.match(html, /results-scroll\.js\?v=20261016-results-scroll-1/);
    assert.match(html, /Mission Menu<\/button>/);
  }
  const css = fs.readFileSync(new URL('../css/styles.css', import.meta.url), 'utf8');
  assert.match(css, /#results-screen #results-content::-webkit-scrollbar-thumb/);
  assert.match(css, /#results-screen #results-content \{ max-height: min\(58svh, 470px\); overflow-y: auto; \}/);
  assert.match(css, /#results-screen \.results-scroll-cue/);
  const engine = fs.readFileSync(new URL('./engine.js', import.meta.url), 'utf8');
  assert.match(engine, /MR\.setScreen\('results'\);\s*if \(MR\.resultsScroll\) MR\.resultsScroll\.refresh\(\)/);
});
