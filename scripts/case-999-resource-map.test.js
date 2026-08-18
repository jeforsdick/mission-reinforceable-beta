'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { REQUIRED_SECTIONS, validateResources } = require('./resource-content-validator');

const ROOT = path.join(__dirname, '..');
const RESOURCE_PATH = path.join(ROOT, 'research/fixtures/case-999/resources.json');
const SQL_PATH = path.join(ROOT, 'research/supabase/004_update_case_999_resources_v5.sql');
const resources = JSON.parse(fs.readFileSync(RESOURCE_PATH, 'utf8'));
const sql = fs.readFileSync(SQL_PATH, 'utf8');
const fidelityTargets = [
  'Give non-contingent attention.',
  'Prompt replacement behavior.',
  'Praise.',
  'Ignore/minimize attention for concern behavior when safe and consistent with the BIP.'
];
const safetyStatement = "Mission: Reinforceable does not add crisis procedures that are not in Anna's plan. Immediate safety concerns should be handled according to existing school procedures; this BIP Map focuses on Anna's plan-supported prevention, teaching, reinforcement, and recovery responses.";

function allText(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(allText);
  if (value && typeof value === 'object') return Object.values(value).flatMap(allText);
  return [];
}

test('CASE-999 fixture passes canonical Resource Map validation without privacy warnings', () => {
  const report = validateResources(resources, { expectedAlias: 'Anna' });
  assert.equal(report.valid, true, JSON.stringify(report.errors, null, 2));
  assert.deepEqual(report.warnings, []);
  assert.equal(resources.studentAlias, 'Anna');
});

test('CASE-999 contains all nine canonical sections and exact fidelity targets', () => {
  assert.deepEqual(Object.keys(resources.sections), Object.keys(REQUIRED_SECTIONS));
  for (const [key, title] of Object.entries(REQUIRED_SECTIONS)) {
    assert.equal(resources.sections[key].title, title);
  }
  const targetBlock = resources.sections.fidelity.blocks.find(block => block.type === 'list');
  assert.deepEqual(targetBlock.items, fidelityTargets);
  assert(allText(resources).includes(safetyStatement));
});

test('CASE-999 fixture contains no prohibited identifying fields or patterns', () => {
  const serialized = JSON.stringify(resources);
  assert.doesNotMatch(serialized, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
  assert.doesNotMatch(serialized, /(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]\d{3}[\s.-]\d{4}\b/);
  assert.doesNotMatch(serialized, /\b(?:student initials?|teacher name|school name|district name|diagnos(?:is|ed))\b/i);
  assert.deepEqual([...new Set(allText(resources).filter(text => /\bAnna\b/.test(text) && text !== 'Anna'))].every(Boolean), true);
  assert.equal((serialized.match(/"studentAlias"/g) || []).length, 1);
});

test('CASE-999 SQL only updates resources, version, and updated_at with a 4 to 5 guard', () => {
  assert.match(sql, /where case_code = 'CASE-999'/i);
  assert.match(sql, /set resources = [\s\S]*?version = 5,[\s\S]*?updated_at = now\(\)/i);
  assert.match(sql, /and version = 4/i);
  assert.match(sql, /if not found then[\s\S]*?version must be 4/i);
  assert.match(sql, /case is missing/i);
  assert.match(sql, /more than one case/i);
  assert.match(sql, /case_game_content row is missing/i);
  const setClause = sql.match(/\bset\s+([\s\S]*?)\n\s*where case_id/i)[1];
  assert.doesNotMatch(setClause, /\b(config|daily_missions|wildcard_missions|crisis_missions)\s*=/i);
  assert.doesNotMatch(sql, /\b(insert|delete|truncate)\b/i);
});
