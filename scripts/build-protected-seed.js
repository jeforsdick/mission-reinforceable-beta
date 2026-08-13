const fs = require('fs');
const path = require('path');
const vm = require('vm');

const teacherId = process.argv[2] || 'demo-2';
const caseCode = process.argv[3] || 'CASE-DEMO-2';
const outputPath = process.argv[4] || 'research/supabase/003_seed_demo2_full_protected.sql';
const teacherDir = path.join(process.cwd(), 'game', 'teachers', teacherId);

function runFile(filename, context) {
  const source = fs.readFileSync(filename, 'utf8');
  vm.runInContext(source, context, { filename });
}

function sqlLiteral(value) {
  return String(value).replace(/'/g, "''");
}

const sandbox = {
  console,
  POOL: { daily: [], wild: [], crisis: [] },
  GAME_CONFIG: {},
  MR_TEACHER_CONFIG: null,
  MR_RESOURCES: null
};
sandbox.window = sandbox;
const context = vm.createContext(sandbox);

runFile(path.join(teacherDir, 'config.js'), context);
const config = JSON.parse(JSON.stringify(context.MR_TEACHER_CONFIG || {}));
const missionFiles = Array.isArray(config.missionFiles) ? config.missionFiles.slice() : [];
const resourcesFile = config.resourcesFile || '';

for (const relativeFile of missionFiles) {
  const cleanFile = String(relativeFile).split('?')[0];
  runFile(path.join(teacherDir, cleanFile), context);
}

if (resourcesFile) {
  runFile(path.join(teacherDir, String(resourcesFile).split('?')[0]), context);
}

delete config.missionFiles;
delete config.resourcesFile;
config.teacherId = teacherId;
config.contentSource = 'supabase-protected';

const payload = {
  config,
  resources: context.MR_RESOURCES || {},
  daily_missions: context.POOL.daily || [],
  wildcard_missions: context.POOL.wild || [],
  crisis_missions: context.POOL.crisis || []
};

const tag = '$mrjson$';
const json = value => `${tag}${JSON.stringify(value, null, 2)}${tag}::jsonb`;

const sql = `-- FULL PROTECTED GAME SEED FOR ${caseCode}\n-- Generated from game/teachers/${teacherId}/ by scripts/build-protected-seed.js.\n-- Safe to re-run: upserts by case_id.\n\ninsert into public.case_game_content (\n  case_id,\n  config,\n  resources,\n  daily_missions,\n  wildcard_missions,\n  crisis_missions,\n  version,\n  updated_at\n)\nselect\n  c.id,\n  ${json(payload.config)},\n  ${json(payload.resources)},\n  ${json(payload.daily_missions)},\n  ${json(payload.wildcard_missions)},\n  ${json(payload.crisis_missions)},\n  1,\n  now()\nfrom public.cases c\nwhere c.case_code = '${sqlLiteral(caseCode)}'\non conflict (case_id) do update set\n  config = excluded.config,\n  resources = excluded.resources,\n  daily_missions = excluded.daily_missions,\n  wildcard_missions = excluded.wildcard_missions,\n  crisis_missions = excluded.crisis_missions,\n  version = excluded.version,\n  updated_at = now();\n\n-- Verification: expect 1 Daily, 1 Mystery, 1 Crisis mission.\nselect\n  c.case_code,\n  cgc.config->>'studentAlias' as student_alias,\n  cgc.config->>'contentSource' as content_source,\n  jsonb_array_length(cgc.daily_missions) as daily_count,\n  jsonb_array_length(cgc.wildcard_missions) as mystery_count,\n  jsonb_array_length(cgc.crisis_missions) as crisis_count,\n  cgc.version\nfrom public.case_game_content cgc\njoin public.cases c on c.id = cgc.case_id\nwhere c.case_code = '${sqlLiteral(caseCode)}';\n`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, sql);

console.log(`Wrote ${outputPath}`);
console.log(`Daily: ${payload.daily_missions.length}, Mystery: ${payload.wildcard_missions.length}, Crisis: ${payload.crisis_missions.length}`);
