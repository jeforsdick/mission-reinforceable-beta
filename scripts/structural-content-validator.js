#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { KEY_PATTERN } = require('./fidelity-coverage-validator');
const { loadExecutableContent, missionGroups } = require('./protected-content-loader');

const ENDING_KEYS = new Set(['STRONG', 'MIXED', 'FRAGILE']);

function validateStructure(groups) {
  const errors = [];
  const seenMissionIds = new Set();
  const add = (rule, mission, details = {}) => errors.push({ rule, mission_id: mission.id, ...details });

  for (const missions of Object.values(groups)) {
    for (const mission of missions || []) {
      if (!mission.id || seenMissionIds.has(mission.id)) add('duplicate_mission_id', mission);
      seenMissionIds.add(mission.id);
      const steps = mission.steps || {};
      if (!mission.start || !steps[mission.start]) add('missing_start_step', mission, { start: mission.start });

      for (const [stepId, step] of Object.entries(steps)) {
        const choices = Object.values(step.choices || {});
        if (choices.length !== 3) add('incorrect_decision_count', mission, { step_id: stepId, actual: choices.length });
        const scores = choices.map(choice => choice.score).sort((a, b) => a - b);
        if (scores.length !== 3 || scores[0] !== 0 || scores[1] !== 5 || scores[2] !== 10) {
          add('invalid_score_set', mission, { step_id: stepId, scores });
        }
        const key = step.meta && step.meta.fidelityTargetKey;
        if (key !== undefined && (typeof key !== 'string' || !KEY_PATTERN.test(key))) {
          add('invalid_fidelity_key', mission, { step_id: stepId, value: key });
        }
        for (const choice of choices) {
          if (choice.next && !steps[choice.next]) add('unresolved_next', mission, { step_id: stepId, next: choice.next });
          if (choice.ending !== undefined) {
            if (choice.next) add('nonterminal_ending', mission, { step_id: stepId, ending: choice.ending });
            if (!ENDING_KEYS.has(choice.ending)) add('invalid_ending_key', mission, { step_id: stepId, ending: choice.ending });
            if (!mission.endings || !mission.endings[choice.ending]) add('missing_referenced_ending', mission, { step_id: stepId, ending: choice.ending });
          }
        }
      }

      if (!mission.start || !steps[mission.start]) continue;
      const expected = Number(mission.expectedSteps);
      const visit = (stepId, depth, stack) => {
        if (stack.has(stepId)) {
          add('loop', mission, { step_id: stepId });
          return;
        }
        const step = steps[stepId];
        if (!step) return;
        const nextStack = new Set(stack).add(stepId);
        for (const choice of Object.values(step.choices || {})) {
          if (choice.next) visit(choice.next, depth + 1, nextStack);
          else if (!Number.isInteger(expected) || depth !== expected) {
            add('incorrect_playthrough_length', mission, { step_id: stepId, expected, actual: depth });
          }
        }
      };
      visit(mission.start, 1, new Set());
    }
  }
  return { valid: errors.length === 0, errors };
}

function formatReport(report, label = 'content') {
  const lines = [`Structural Validation — ${label}`, `Errors: ${report.errors.length}`];
  for (const error of report.errors) lines.push(`  ERROR ${error.rule}: ${error.mission_id || '(missing id)'}/${error.step_id || ''}`);
  return `${lines.join('\n')}\n`;
}

function main(argv) {
  const sourceDir = argv[0];
  if (!sourceDir) throw new Error('Usage: node scripts/structural-content-validator.js <source-directory> [--json]');
  const payload = loadExecutableContent(sourceDir);
  const report = validateStructure(missionGroups(payload));
  process.stdout.write(argv.includes('--json') ? `${JSON.stringify(report, null, 2)}\n` : formatReport(report, path.basename(path.resolve(sourceDir))));
  if (!report.valid) process.exitCode = 1;
}

module.exports = { ENDING_KEYS, formatReport, validateStructure };
if (require.main === module) main(process.argv.slice(2));
