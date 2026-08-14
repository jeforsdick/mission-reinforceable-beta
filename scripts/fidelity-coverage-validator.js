#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const KEY_PATTERN = /^(proactive|teaching|reinforcement|response|crisis)_\d{2}$/;
const COMPONENT_DOMAINS = {
  Prevent: 'proactive',
  Teach: 'teaching',
  Reinforce: 'reinforcement',
  Respond: 'response'
};

function loadTeacher(teacherDir) {
  const sandbox = { console, POOL: { daily: [], wild: [], crisis: [] }, GAME_CONFIG: {}, MR_TEACHER_CONFIG: null };
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  const run = file => vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  run(path.join(teacherDir, 'config.js'));
  const config = context.MR_TEACHER_CONFIG || {};
  for (const relative of config.missionFiles || []) run(path.join(teacherDir, String(relative).split('?')[0]));
  return {
    daily: Array.from(context.POOL.daily || []),
    wildcard: Array.from(context.POOL.wild || []),
    crisis: Array.from(context.POOL.crisis || [])
  };
}

function readManifest(filename) {
  if (!filename) return null;
  const manifest = JSON.parse(fs.readFileSync(filename, 'utf8'));
  if (!manifest || !Array.isArray(manifest.targets)) throw new Error('Expected-target manifest must contain a targets array');
  for (const target of manifest.targets) {
    const match = KEY_PATTERN.exec(target.target_key || '');
    if (!match || match[1] !== target.domain) {
      throw new Error(`Invalid expected target: ${JSON.stringify(target)}`);
    }
  }
  return manifest;
}

function validateCoverage(missionGroups, manifest = null, teacherName = 'content') {
  const coverage = new Map();
  const hardErrors = [];
  const warnings = [];
  const choiceComponents = [];
  let crisisMarkerLimitation = false;

  for (const [missionType, missions] of Object.entries(missionGroups)) {
    for (const mission of missions || []) {
      const perMission = new Map();
      for (const [stepId, step] of Object.entries(mission.steps || {})) {
        const stepMeta = step.meta || {};
        const location = { mission_id: mission.id, mission_type: missionType, step_id: stepId };
        const stepKey = stepMeta.fidelityTargetKey;
        const stepKeys = stepMeta.fidelityTargetKeys;
        const legacyKeys = [];
        for (const [choiceId, choice] of Object.entries(step.choices || {})) {
          const meta = choice.meta || {};
          if (meta.bipComponent) choiceComponents.push({ ...location, choice_id: choiceId, bip_component: meta.bipComponent });
          if (meta.fidelityTargetKey !== undefined || meta.fidelityTargetKeys !== undefined) {
            warnings.push({ rule: 'legacy_choice_level_target', ...location, choice_id: choiceId });
            const values = meta.fidelityTargetKeys !== undefined ? meta.fidelityTargetKeys : meta.fidelityTargetKey;
            if (meta.fidelityTargetKeys !== undefined || Array.isArray(meta.fidelityTargetKey)) {
              hardErrors.push({ rule: 'multiple_target_keys', ...location, choice_id: choiceId, value: values });
            }
            legacyKeys.push(...(Array.isArray(values) ? values : [values]));
          }
        }

        if (Array.isArray(stepKey) || stepKeys !== undefined) {
          hardErrors.push({ rule: 'multiple_target_keys', ...location, value: stepKeys !== undefined ? stepKeys : stepKey });
          continue;
        }
        const allKeys = [stepKey, ...legacyKeys].filter(value => value !== undefined && value !== null && value !== '');
        if (new Set(allKeys).size > 1) {
          hardErrors.push({ rule: 'multiple_target_keys', ...location, value: allKeys });
          continue;
        }
        // Step metadata is authoritative; the legacy fallback keeps old content visible while it is migrated.
        const key = stepKey || legacyKeys[0];
        if (key === undefined || key === null || key === '') continue;
        if (typeof key !== 'string' || !KEY_PATTERN.test(key)) {
          hardErrors.push({ rule: 'malformed_key', ...location, value: key });
          continue;
        }
        const domain = key.split('_')[0];
          if (domain === 'crisis') {
            // The current content contract has no explicit, reliable crisis-action marker.
            crisisMarkerLimitation = true;
          } else if (stepMeta.bipComponent && COMPONENT_DOMAINS[stepMeta.bipComponent] !== domain) {
            hardErrors.push({ rule: 'domain_key_mismatch', ...location, key, bip_component: stepMeta.bipComponent });
          }
          if (!coverage.has(key)) coverage.set(key, { target_key: key, domain, opportunities: 0, mission_ids: new Set() });
          const item = coverage.get(key);
          item.opportunities += 1;
          item.mission_ids.add(mission.id);
          perMission.set(key, (perMission.get(key) || 0) + 1);
      }
      for (const [key, count] of perMission) {
        if (count > 2) warnings.push({ rule: 'over_concentrated', target_key: key, mission_id: mission.id, opportunities: count });
      }
    }
  }

  const expected = new Map((manifest?.targets || []).map(target => [target.target_key, target]));
  for (const target of expected.values()) {
    if (!coverage.has(target.target_key)) coverage.set(target.target_key, { target_key: target.target_key, domain: target.domain, opportunities: 0, mission_ids: new Set() });
  }
  for (const item of coverage.values()) {
    if (item.opportunities > 0 && item.opportunities < 3) warnings.push({ rule: 'under_covered', target_key: item.target_key, opportunities: item.opportunities });
    if (item.opportunities > 0 && item.mission_ids.size === 1) warnings.push({ rule: 'single_mission', target_key: item.target_key, mission_id: [...item.mission_ids][0] });
    if (expected.has(item.target_key) && item.opportunities === 0) warnings.push({ rule: 'expected_unused', target_key: item.target_key });
    if (manifest && item.opportunities > 0 && !expected.has(item.target_key)) warnings.push({ rule: 'unknown_target', target_key: item.target_key });
  }
  if (crisisMarkerLimitation) warnings.push({ rule: 'crisis_marker_limitation', message: 'Crisis target compatibility cannot be validated: content has no reliable explicit crisis fidelity-action marker.' });

  return {
    teacher: teacherName,
    targets: [...coverage.values()].sort((a, b) => a.target_key.localeCompare(b.target_key)).map(item => ({ ...item, missions: item.mission_ids.size, mission_ids: [...item.mission_ids].sort() })),
    choice_bip_components: choiceComponents,
    hard_errors: hardErrors,
    warnings
  };
}

function formatReport(report) {
  const lines = [`Fidelity Coverage — ${report.teacher}`, ''];
  for (const target of report.targets) {
    lines.push(target.target_key, `  domain: ${target.domain}`, `  opportunities: ${target.opportunities}`, `  missions: ${target.missions}`);
    if (target.mission_ids.length) lines.push(`  mission IDs: ${target.mission_ids.join(', ')}`);
    for (const warning of report.warnings.filter(item => item.target_key === target.target_key)) lines.push(`  WARNING: ${warning.rule}`);
    lines.push('');
  }
  lines.push(`Choice-level bipComponent values observed: ${report.choice_bip_components.length}`);
  lines.push(`Hard errors: ${report.hard_errors.length}`);
  for (const error of report.hard_errors) lines.push(`  ERROR ${error.rule}: ${error.mission_id}/${error.step_id}/${error.choice_id}`);
  const generalWarnings = report.warnings.filter(item => !item.target_key);
  lines.push(`Warnings: ${report.warnings.length}`);
  for (const warning of generalWarnings) lines.push(`  WARNING ${warning.rule}: ${warning.message || warning.mission_id || ''}`.trimEnd());
  return `${lines.join('\n')}\n`;
}

function main(argv) {
  const args = [...argv];
  const json = args.includes('--json');
  if (json) args.splice(args.indexOf('--json'), 1);
  const teacherArg = args[0];
  if (!teacherArg) throw new Error('Usage: node scripts/fidelity-coverage-validator.js <teacher-folder> [manifest.json] [--json]');
  const teacherDir = path.resolve(teacherArg);
  const report = validateCoverage(loadTeacher(teacherDir), readManifest(args[1]), path.basename(teacherDir));
  process.stdout.write(json ? `${JSON.stringify(report, null, 2)}\n` : formatReport(report));
  if (report.hard_errors.length) process.exitCode = 1;
}

module.exports = { KEY_PATTERN, formatReport, loadTeacher, readManifest, validateCoverage };
if (require.main === module) main(process.argv.slice(2));
