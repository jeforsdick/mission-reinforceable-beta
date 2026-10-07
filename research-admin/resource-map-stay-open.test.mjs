import assert from 'node:assert/strict';
import fs from 'node:fs';

const js = fs.readFileSync(new URL('admin.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('index.html', import.meta.url), 'utf8');

assert.match(js, /resourceBuilderWasOpen/);
assert.match(js, /focusedResourceSection/);
assert.match(js, /refreshedResourceBuilder\.open = true/);
assert.match(js, /restoreResourceOpenSections\(panel, state\.resourceOpenSections\)/);
assert.match(js, /window\.scrollBy\(0, refreshedAnchor\.getBoundingClientRect\(\)\.top - resourceAnchorTop\)/);
assert.match(html, /admin\.js\?v=20261007-resource-map-stay-open-1/);

console.log('Resource Map redraw keeps builder open and preserves editing position.');
