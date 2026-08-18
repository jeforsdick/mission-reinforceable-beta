import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./resources.js', import.meta.url), 'utf8');
const TITLES = {
  bip: 'BIP at a Glance', functionForest: 'Function Forest', prevention: 'Prevention Palace',
  replacement: 'Replacement Reservoir', reinforcement: 'Reinforcement Ridge',
  errorCorrection: 'Error Correction Canyon', library: 'BSP Library', coaching: 'Coaching Cottage',
  fidelity: 'Fidelity Fortress'
};

class Element {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase(); this.children = []; this.dataset = {}; this.attributes = {};
    this.className = ''; this.hidden = false; this.scrollTop = 7; this.textContent = '';
    this.listeners = {};
    this.classList = { toggle: (name, on) => { const names = new Set(this.className.split(/\s+/).filter(Boolean)); on ? names.add(name) : names.delete(name); this.className = [...names].join(' '); } };
  }
  appendChild(child) { this.children.push(child); return child; }
  replaceChildren(...children) { this.children = children; this.textContent = ''; }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(name, listener) { this.listeners[name] = listener; }
  click() { this.listeners.click(); }
}

function resources(blocks = [{ type: 'paragraph', text: 'Plan text.' }]) {
  return { schemaVersion: 1, sections: Object.fromEntries(Object.entries(TITLES).map(([key, title]) => [key, { title, blocks }])) };
}

function setup(data = resources()) {
  const title = new Element('h1');
  const content = new Element();
  const back = new Element('button');
  const hotspots = Object.keys(TITLES).filter(key => key !== 'bip').map(key => {
    const button = new Element('button'); button.dataset.resourceSection = key; return button;
  });
  const bySelector = { '#resources-title': title, '#resources-content': content, '#back-to-bip': back };
  const MR = { resourcesData: data, $: selector => bySelector[selector], $$: selector => selector === '.map-hotspot' ? hotspots : [] };
  const context = { window: { MR }, document: { createElement: tag => new Element(tag) } };
  vm.runInNewContext(source, context);
  return { MR, title, content, back, hotspots };
}

function descendantText(element) {
  return [element.textContent, ...element.children.flatMap(child => descendantText(child))];
}

test('runtime reads MR.resourcesData and has no embedded behavioral resource object', () => {
  assert.match(source, /MR\.resourcesData/);
  assert.doesNotMatch(source, /resourceSections|Jordan|blank page|writing task/i);
});

test('all nine canonical section keys render their data and title', () => {
  const data = resources();
  for (const [key, expectedTitle] of Object.entries(TITLES)) data.sections[key].blocks = [{ type: 'paragraph', text: `Text for ${key}` }];
  const view = setup(data);
  for (const [key, expectedTitle] of Object.entries(TITLES)) {
    view.MR.resources.renderResourceSection(key);
    assert.equal(view.title.textContent, expectedTitle);
    assert(descendantText(view.content).includes(`Text for ${key}`));
  }
});

test('paragraph, list, definitionList, and callout use text-only DOM nodes', () => {
  const markup = '<img src=x onerror=alert(1)> visible';
  const blocks = [
    { type: 'paragraph', text: markup },
    { type: 'list', items: [markup, 'Second'] },
    { type: 'definitionList', items: [{ term: markup, definition: 'Definition' }] },
    { type: 'callout', label: markup, text: 'Callout text' }
  ];
  const view = setup(resources(blocks));
  view.MR.resources.renderResourceSection('bip');
  assert.deepEqual(view.content.children.map(child => child.tagName), ['P', 'UL', 'DL', 'ASIDE']);
  assert.equal(descendantText(view.content).filter(text => text === markup).length, 4);
  assert.equal(view.content.children.some(child => child.tagName === 'IMG'), false);
});

test('missing or unsupported resources show the neutral unavailable state', () => {
  for (const data of [null, resources()]) {
    if (data) data.schemaVersion = 2;
    const view = setup(data);
    view.MR.resources.renderResourceSection('bip');
    assert.equal(view.title.textContent, 'Resources unavailable');
    assert(descendantText(view.content).includes('BIP resources are not available. Please contact the research team.'));
    assert.equal(view.back.hidden, true);
  }
});

test('malformed resources show unavailable rather than falling back to demo text', () => {
  const data = resources();
  delete data.sections.fidelity;
  const view = setup(data);
  view.MR.resources.renderResourceSection('bip');
  assert.equal(view.title.textContent, 'Resources unavailable');
});

test('hotspot active state and Back to BIP behavior remain wired', () => {
  const view = setup();
  view.MR.resources.render();
  const prevention = view.hotspots.find(button => button.dataset.resourceSection === 'prevention');
  prevention.click();
  assert.equal(view.title.textContent, 'Prevention Palace');
  assert.equal(prevention.attributes['aria-pressed'], 'true');
  assert.equal(prevention.className, 'is-active');
  assert.equal(view.back.hidden, false);
  view.back.click();
  assert.equal(view.title.textContent, 'BIP at a Glance');
  assert.equal(prevention.attributes['aria-pressed'], 'false');
  assert.equal(view.back.hidden, true);
});
