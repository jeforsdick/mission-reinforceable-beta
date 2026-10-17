import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const script = readFileSync(new URL('./heart-flight.js', import.meta.url), 'utf8');
function harness({ reducedMotion = false, modalVisible = true, mode = 'feedback', withGeometry = true } = {}) {
  const rect = (left, top, width, height) => ({ left, top, width, height });
  let removed = 0, timerSeq = 0;
  const timers = new Map();
  const createElement = tagName => ({
    tagName,
    children: [],
    dataset: {},
    className: '',
    src: '',
    alt: '',
    textContent: '',
    events: {},
    styles: {},
    style: {
      setProperty(name, value) { this[name] = value; }
    },
    setAttribute(name, value) { this[name] = value; },
    addEventListener(name, fn) { this.events[name] = fn; },
    append(...nodes) { this.children.push(...nodes); },
    appendChild(node) { this.children.push(node); },
    remove() { removed++; },
    getBoundingClientRect() { return rect(0, 0, 0, 0); }
  });
  const modal = {
    hidden: !modalVisible, dataset: { mode }, clientWidth: 1500, clientHeight: 900,
    children: [], appendChild(node) { this.children.push(node); },
    getBoundingClientRect() { return rect(0, 0, withGeometry ? 1000 : 0, 600); }
  };
  const wizard = { getBoundingClientRect: () => rect(600, 340, 150, 200) };
  const hearts = Array.from({ length: 5 }, (_, i) => ({
    getBoundingClientRect: () => rect(100 + i * 42, 60, 40, 40)
  }));
  const nodes = {
    'wizard-modal': modal,
    'wizard-modal-img': wizard,
    'heart-row': { children: hearts }
  };
  const document = {
    createElement,
    getElementById: id => nodes[id] || null
  };
  const MR = { asset: key => key === 'heart' ? '/heart-pixel.png' : null };
  const context = {
    MR, document, window: null,
    Number, Math,
    matchMedia: () => ({ matches: reducedMotion }),
    setTimeout(fn, time) { const id = ++timerSeq; timers.set(id, { fn, time }); return id; },
    clearTimeout(id) { timers.delete(id); }
  };
  context.window = context;
  vm.runInNewContext(script, vm.createContext(context));
  const flight = MR.heartFlight;
  return { flight, modal, nodes, timers, get removed() { return removed; } };
}

test('half-heart loss shows -1/2 with existing sprite and flies from Wizard to exact scaled heart target', () => {
  const v = harness();
  assert.equal(v.flight.play(5, 4.5), true);
  const layer = v.modal.children[0];
  assert.equal(layer.className, 'wizard-heart-flight-layer');
  assert.equal(layer['aria-hidden'], 'true');
  const flying = layer.children[0];
  const landing = layer.children[1];
  assert.equal(flying.dataset.loss, 'half');
  assert.equal(flying.children[0].src, '/heart-pixel.png');
  assert.equal(flying.children[1].textContent, '-1/2');
  assert.match(flying.children[1].className, /wizard-heart-flight-amount/);
  // For a 1500px stage displayed at 1000px, each X coordinate must
  // be multiplied by 1.5 to reach its correct game-space destination.
  const targetClientCenter = 100 + 4 * 42 + 20;
  assert.equal(Number.parseFloat(landing.style.left), targetClientCenter * 1.5);
  assert.equal(Number.parseFloat(landing.style.top), 80 * 1.5);
  assert.equal(Number.parseFloat(flying.style.left) + Number.parseFloat(flying.style['--heart-flight-dx']), Number.parseFloat(landing.style.left));
  assert.equal(Number.parseFloat(flying.style.top) + Number.parseFloat(flying.style['--heart-flight-dy']), Number.parseFloat(landing.style.top));
  assert.equal([...v.timers.values()][0].time, 1850, 'fallback cleanup must follow the 1.5-second flight');
});

test('full heart loss displays -1 and targets the last affected heart', () => {
  const v = harness();
  assert.equal(v.flight.play(4.5, 3.5), true);
  const [flying, landing] = v.modal.children[0].children;
  assert.equal(flying.children[1].textContent, '-1');
  assert.equal(flying.dataset.loss, 'full');
  assert.equal(Number.parseFloat(landing.style.left), (100 + 4 * 42 + 20) * 1.5);
});

test('no loss, no health, reduced motion, hidden Wizard and invalid geometry never show a flying overlay', () => {
  for (const [before, after, options] of [
    [5,5,{}],[0,0,{}],[0,-1,{}],[4,5,{}],
    [5,4,{reducedMotion:true}],[5,4,{modalVisible:false}],
    [5,4,{mode:'briefing'}],[5,4,{withGeometry:false}]
  ]) {
    const v = harness(options);
    assert.equal(v.flight.play(before,after),false);
    assert.equal(v.modal.children.length,0);
  }
});

test('the effect is one-shot and cleans up on animation end or early dismissal', () => {
  const v = harness();
  assert.equal(v.flight.play(5,4),true);
  const flying = v.modal.children[0].children[0];
  flying.events.animationend();
  assert.equal(v.removed,1);
  assert.equal(v.timers.size,0);
  assert.equal(v.flight.play(5,4.5),true);
  v.flight.clear();
  assert.equal(v.removed,2);
  assert.equal(v.timers.size,0);
});

test('QA only: Wizard popup appears first, regular teacher play retains existing pulse, restored play never animates', () => {
  const engine = readFileSync(new URL('./engine.js', import.meta.url),'utf8');
  assert.match(engine, /if \(restoredAnswer\) return;[\s\S]*?renderHUD\(\);\s*showWizardFeedback\(choice, score\);[\s\S]*?if \(consequencePreviewEnabled\(\) && MR\.heartFlight\)/);
  assert.match(engine, /MR\.heartFlight\.play\(heartChange\.before, heartChange\.after\)/);
  assert.match(engine, /else \{\s*animateHeartChange\(heartChange\.before, heartChange\.after\)/);
  assert.match(engine, /function hideWizardFeedback\(\) \{\s*if \(MR\.heartFlight\) MR\.heartFlight\.clear\(\)/);
  const html = readFileSync(new URL('../index.html', import.meta.url),'utf8');
  assert.match(html, /js\/heart-flight\.js\?v=20261017-heart-fraction-1/);
  assert.ok(html.indexOf('heart-flight.js') < html.indexOf('js/engine.js'));
});

test('CSS animation is exactly one second, targets a foreground Wizard layer, and is reduced-motion safe', () => {
  const css = readFileSync(new URL('../css/styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.wizard-modal \.wizard-heart-flight-layer\s*\{[\s\S]*?z-index:\s*5/);
  assert.match(css, /\.wizard-heart-flight\s*\{[\s\S]*?animation:\s*mr-wizard-heart-fly 1500ms/);
  assert.match(css, /\.wizard-heart-flight-landing\s*\{[\s\S]*?animation:\s*mr-wizard-heart-pop 330ms ease-out 1150ms/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.wizard-heart-flight-landing\s*\{\s*animation: none; display: none;/);
});
