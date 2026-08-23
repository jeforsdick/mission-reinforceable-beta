#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');

function repositoryRoot(cwd) {
  try { return childProcess.execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return null; }
}

function isInside(parent, child) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

// Resolve the nearest existing ancestor so a symlink cannot disguise a repository path.
function prospectiveRealPath(target) {
  const missing = [];
  let cursor = path.resolve(target);
  while (!fs.existsSync(cursor)) {
    missing.unshift(path.basename(cursor));
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  return path.join(fs.realpathSync(cursor), ...missing);
}

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    if (!['--case-code', '--output'].includes(flag) || !argv[index + 1]) throw new Error(`Unknown or incomplete option: ${flag || '(missing option)'}`);
    values[flag.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = argv[index + 1];
  }
  if (!values.caseCode || !values.output) throw new Error('Usage: node scripts/create-private-case-starter.js --case-code CASE-### --output "/approved/private/location/CASE-###"');
  if (!/^CASE-[A-Z0-9-]+$/.test(values.caseCode)) throw new Error('--case-code must begin with CASE- and contain only uppercase letters, numbers, and hyphens.');
  return values;
}

function starterFiles(caseCode) {
  return {
    'README-FIRST.txt': `PRIVATE CASE STARTER — ${caseCode}\n\nThis folder must stay in approved private storage outside the public repository.\n\nEdit in this order:\n1. config.js — replace every bracketed placeholder using approved case information.\n2. fidelity-targets.expected.json — enter only finalized fidelity target keys.\n3. content/resources.js — complete all nine Resource Map sections.\n4. content/daily-mission-1.js — replace the generic mission placeholder, then add mission files as needed.\n5. Run the structural and fidelity coverage validators from the public repository.\n6. Build protected-seed.sql only after human review.\n\nNever add a full name, credentials, secrets, or unnecessary identifying information. Never commit this folder to GitHub.\n`,
    'config.js': `// PRIVATE STARTER: replace bracketed placeholders with approved, minimum-necessary values.\nwindow.MR_TEACHER_CONFIG = {\n  teacherId: '[APPROVED GAME IDENTIFIER]',\n  displayName: '[GENERIC CLASSROOM LABEL]',\n  classroomLabel: '[GENERIC CLASSROOM LABEL]',\n  studentAlias: '[APPROVED STUDENT ALIAS]',\n  resourcesFile: 'content/resources.js',\n  missionFiles: ['content/daily-mission-1.js']\n};\n`,
    'fidelity-targets.expected.json': `{\n  "targets": [{\n    "target_key": "[FINALIZED_TARGET_KEY]",\n    "domain": "[FINALIZED_TARGET_DOMAIN]",\n    "description": "[FINALIZED OBSERVABLE TEACHER STEP]"\n  }]\n}\n`,
    'content/resources.js': `// Complete all nine required sections using the supported Resource Map block types.\n// Use only the approved alias and minimum-necessary plan information.\nwindow.MR_RESOURCES = {\n  schemaVersion: 1,\n  studentAlias: '[APPROVED STUDENT ALIAS]',\n  sections: {}\n};\n`,
    'content/daily-mission-1.js': `// Replace this generic placeholder by following docs/MISSION_AUTHORING_STANDARD.md.\n// Link a decision to a finalized fidelity target only when that target is tested.\n(function registerDailyMission() {\n  if (typeof POOL === 'undefined') {\n    throw new Error('POOL must be defined before loading daily-mission-1.js');\n  }\n\n  POOL.daily = POOL.daily || [];\n\n  POOL.daily.push({\n    id: '[UNIQUE MISSION ID]',\n    title: '[MISSION TITLE]',\n    expectedSteps: 5,\n    start: '[START STEP ID]',\n    steps: {}\n  });\n})();\n`
  };
}

function createStarter(options, cwd = process.cwd()) {
  const root = repositoryRoot(cwd);
  if (!root) throw new Error('Could not identify the mission-reinforceable-beta repository. Open Terminal in the repository and try again.');
  const output = prospectiveRealPath(options.output);
  if (isInside(fs.realpathSync(root), output)) throw new Error('SAFETY STOP: The private case folder cannot be created inside mission-reinforceable-beta. Choose an approved secure location outside the public repository. Nothing was created.');
  if (fs.existsSync(output)) throw new Error(`Output already exists: ${output}. Choose a new empty location; existing private files will not be overwritten.`);
  const directories = [output, path.join(output, 'content')];
  for (const directory of directories) fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  // Windows does not implement POSIX mode bits; creation still succeeds there.
  if (process.platform !== 'win32') directories.forEach(directory => fs.chmodSync(directory, 0o700));
  for (const [relative, contents] of Object.entries(starterFiles(options.caseCode))) {
    const filename = path.join(output, relative);
    fs.writeFileSync(filename, contents, { flag: 'wx', mode: 0o600 });
  }
  console.log(`Created private case starter for ${options.caseCode} at ${output}`);
  console.log('No participant information was added. Open README-FIRST.txt next.');
  return output;
}

function main(argv) { createStarter(parseArgs(argv)); }

module.exports = { createStarter, isInside, parseArgs, prospectiveRealPath, starterFiles };
if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(`\n${error.message}\n`); process.exitCode = 1; }
}
