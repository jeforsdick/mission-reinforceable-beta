import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('index.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('intake.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('intake.css', import.meta.url), 'utf8');

assert.doesNotMatch(html + js, /research_admin|Admin sign in|case-select|case_intake|profiles|participants|signOut|sign-in/i);
assert.doesNotMatch(js, /\.select\s*\(/);
assert.match(js, /const DRAFT_KEY = 'mr-intake-draft-v1'/);
assert.match(js, /localStorage\.setItem\(DRAFT_KEY, JSON\.stringify\(collectDraft\(\)\)\)/);
assert.match(js, /localStorage\.getItem\(DRAFT_KEY\)/);
assert.match(js, /localStorage\.removeItem\(DRAFT_KEY\)/);
assert.match(js, /state\.client\.from\('intake_requests'\)\.insert\(submissionPayload\(\)\)/);
assert.equal((js.match(/\.from\('/g) || []).length, 1);
assert.match(js, /fidelity_targets: collectTargets\(\)/);
assert.match(js, /\{ domain: card\.dataset\.domain, description, sort_order: index \+ 1 \}/);
assert.match(js, /\['proactive', 'teaching', 'reinforcement', 'response'\]/);
assert.match(js, /hasCrisis\(\) \? \['crisis'\] : \[\]/);
assert.match(js, /card\.querySelector\('\.add-step'\)\.addEventListener/);
assert.match(js, /wrapper\.querySelector\('\.remove-step'\)\.addEventListener/);
assert.match(js, /card\.hidden = !enabled/);
assert.match(js, /if \(state\.busy \|\| !validate\(\)\) return/);
assert.match(js, /clearSavedDraft\(false\);\s*\n\s*\$\('#intake-form'\)\.hidden = true/);
assert.match(html, /Draft saved on this device\.|Save Draft/);
assert.match(html, /Clear Saved Draft/);
assert.match(html, /Intake Received/);
assert.equal((html.match(/class="form-section"/g) || []).length, 5);
assert.equal((html.match(/name="has_crisis_plan"/g) || []).length, 2);
assert.match(css, /@media\(max-width:760px\)/);

console.log('Public intake draft, validation, JSON fidelity targets, anonymous insert, crisis, and responsive smoke checks passed.');
