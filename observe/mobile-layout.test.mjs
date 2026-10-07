import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('observe.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('index.html', import.meta.url), 'utf8');

assert.match(css, /\.opportunity-training-row\{[\s\S]*grid-template-columns:minmax\(220px,.85fr\) minmax\(360px,1.15fr\)/);
assert.match(css, /@media\(max-width:760px\)[\s\S]*\.opportunity-training-row\{[\s\S]*grid-template-columns:1fr!important/);
assert.match(css, /\.training-opportunity-buttons\{[\s\S]*grid-template-columns:1fr 1fr!important/);
assert.match(css, /\.active-view:not\(\[hidden\]\)::after/);
assert.match(css, /\.target-occurred-button:disabled\{[\s\S]*opacity:1/);
assert.match(css, /\.fidelity-panel\{[\s\S]*padding-bottom:178px/);
assert.match(html, /observe\.css\?v=20261007-mobile-opportunities-1/);

console.log('Observer training mobile repeated-opportunity layout checks passed.');
