import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('index.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('intake.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('intake.css', import.meta.url), 'utf8');

// These dependency-free smoke checks guard the security and interaction contracts
// in environments where a browser and live administrator credentials are absent.
assert.match(js, /role !== 'research_admin' \|\| state\.profile\.active !== true/);
assert.match(html, /Your account does not have research administrator access\./);
assert.match(js, /\.upsert\(intakePayload\(status\), \{ onConflict: 'case_id' \}\)/);
assert.match(js, /row\.id \? await state\.client\.from\('fidelity_targets'\)\.update/);
assert.match(js, /wasSubmitted \? await state\.client\.from\('fidelity_targets'\)\.update\(\{ active: false \}\)/);
assert.match(js, /status === 'submitted' && !validate\(\)/);
assert.match(js, /card\.querySelector\('\.add-step'\)\.addEventListener/);
assert.match(js, /wrapper\.querySelector\('\.remove-step'\)\.addEventListener/);
assert.match(js, /card\.hidden = !enabled/);
assert.match(js, /status === 'draft'/);
assert.match(css, /@media\(max-width:760px\)/);
assert.equal((html.match(/class="form-section"/g) || []).length, 5);
assert.equal((html.match(/name="has_crisis_plan"/g) || []).length, 2);

console.log('Intake security, save, validation, repeatable-step, crisis, and responsive smoke checks passed.');
