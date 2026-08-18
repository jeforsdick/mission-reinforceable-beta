#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const { loadExecutableContent, missionGroups } = require('./protected-content-loader');
const { validateStructure, formatReport } = require('./structural-content-validator');
const { validateResources, formatResourceReport } = require('./resource-content-validator');

function sqlLiteral(value) { return String(value).replace(/'/g, "''"); }
function jsonSql(value) { return `$mrjson$${JSON.stringify(value, null, 2)}$mrjson$::jsonb`; }

function renderSql(payload, caseCode, sourceLabel, version) {
  return `-- PROTECTED GAME CONTENT FOR ${caseCode}\n-- Generated locally from ${sourceLabel}; review before applying.\n-- This file does not connect to Supabase.\n\ninsert into public.case_game_content (\n  case_id, config, resources, daily_missions, wildcard_missions, crisis_missions, version, updated_at\n)\nselect\n  c.id,\n  ${jsonSql(payload.config)},\n  ${jsonSql(payload.resources)},\n  ${jsonSql(payload.daily_missions)},\n  ${jsonSql(payload.wildcard_missions)},\n  ${jsonSql(payload.crisis_missions)},\n  ${version}, now()\nfrom public.cases c\nwhere c.case_code = '${sqlLiteral(caseCode)}'\non conflict (case_id) do update set\n  config = excluded.config, resources = excluded.resources, daily_missions = excluded.daily_missions,\n  wildcard_missions = excluded.wildcard_missions, crisis_missions = excluded.crisis_missions,\n  version = excluded.version, updated_at = now();\n`;
}

function parseArgs(argv, cwd = process.cwd()) {
  if (!argv.some(arg => arg.startsWith('--'))) {
    const teacherId = argv[0] || 'demo-2';
    return {
      sourceDir: path.join(cwd, 'game', 'teachers', teacherId),
      caseCode: argv[1] || 'CASE-DEMO-2',
      output: argv[2] || path.join(cwd, 'research/supabase/003_seed_demo2_full_protected.sql'),
      version: 1,
      contentMode: 'demo',
      legacyTeacherId: teacherId
    };
  }
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    if (!['--source-dir', '--case-code', '--version', '--output', '--json-output', '--review-manifest', '--content-mode'].includes(flag) || !argv[index + 1]) throw new Error(`Unknown or incomplete option: ${flag}`);
    values[flag.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = argv[index + 1];
  }
  if (!values.sourceDir || !values.caseCode || values.version === undefined || (!values.output && !values.jsonOutput)) {
    throw new Error('Usage: build-protected-seed.js --source-dir DIR --case-code CODE --version INTEGER [--content-mode participant|demo] (--output FILE | --json-output FILE) [--review-manifest FILE]');
  }
  if (!/^[1-9]\d*$/.test(values.version) || !Number.isSafeInteger(Number(values.version))) {
    throw new Error('--version must be a positive integer');
  }
  values.version = Number(values.version);
  values.contentMode ||= 'participant';
  if (!['participant', 'demo'].includes(values.contentMode)) throw new Error('--content-mode must be participant or demo');
  return values;
}

function repositoryRoot(cwd) {
  try { return childProcess.execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return null; }
}

function isInside(parent, child) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function main(argv) {
  const options = parseArgs(argv);
  options.sourceDir = fs.realpathSync(path.resolve(options.sourceDir));
  const root = repositoryRoot(process.cwd());
  if (root && isInside(root, options.sourceDir)) {
    if (options.contentMode === 'participant') throw new Error('Participant source directory must be outside the repository. Real participant source and output artifacts must never be stored in the public repository.');
    console.warn('WARNING: demo source directory is inside the repository; --content-mode demo is for fictional content only.');
  }
  const payload = loadExecutableContent(options.sourceDir);
  if (options.legacyTeacherId) payload.config.teacherId = options.legacyTeacherId;
  if (options.contentMode === 'participant') {
    const report = payload.config.weeklyTeacherReport;
    const required = ['targetBehavior', 'replacementBehavior', 'targetRoutine'];
    if (!report || required.some(key => typeof report[key] !== 'string' || !report[key].trim())) {
      throw new Error('Participant protected config requires substantive weeklyTeacherReport targetBehavior, replacementBehavior, and targetRoutine fields.');
    }
  }
  const structural = validateStructure(missionGroups(payload));
  if (!structural.valid) throw new Error(`Protected content failed structural validation:\n${formatReport(structural, path.basename(options.sourceDir))}`);
  const resources = validateResources(payload.resources, { expectedAlias: payload.config.studentAlias });
  if (!resources.valid) throw new Error(`Protected content failed resource validation:\n${formatResourceReport(resources)}`);
  if (resources.warnings.length) console.warn(formatResourceReport(resources));

  const outputs = [options.jsonOutput, options.output, options.reviewManifest].filter(Boolean).map(filename => path.resolve(filename));
  if (root && options.contentMode === 'participant' && outputs.some(filename => isInside(root, filename))) {
    throw new Error('Participant output paths must be outside the repository.');
  }

  const manifest = {
    caseCode: options.caseCode,
    protectedContentVersion: options.version,
    resourceSchemaVersion: payload.resources.schemaVersion,
    resourcesSha256: crypto.createHash('sha256').update(JSON.stringify(payload.resources)).digest('hex'),
    validator: { version: resources.validatorVersion, valid: resources.valid, errorCount: resources.errors.length, warningCount: resources.warnings.length },
    privacyReview: 'Automated privacy scanning is an aid, not certification; final privacy determination requires human review.',
    builtAt: new Date().toISOString()
  };

  for (const [filename, content] of [
    [options.jsonOutput, options.jsonOutput && `${JSON.stringify(payload, null, 2)}\n`],
    [options.output, options.output && renderSql(payload, options.caseCode, path.basename(options.sourceDir), options.version)],
    [options.reviewManifest, options.reviewManifest && `${JSON.stringify(manifest, null, 2)}\n`]
  ]) {
    if (!filename) continue;
    const resolved = path.resolve(filename);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, content);
    console.log(`Wrote ${resolved}`);
  }
  console.log(`Daily: ${payload.daily_missions.length}, Mystery: ${payload.wildcard_missions.length}, Crisis: ${payload.crisis_missions.length}`);
}

module.exports = { isInside, parseArgs, renderSql };
if (require.main === module) main(process.argv.slice(2));
