import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = relative => fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
const index = read('../index.html');
const app = read('./app.js');
const auth = read('./auth.js');
const engine = read('./engine.js');
const migration = read('../../supabase/migrations/20260819040000_gameplay_cleanup_3b.sql');

assert.doesNotMatch(index, /teacher-loader\.js/);
assert.match(index, /protected-content\.js/);
assert.doesNotMatch(app, /loadTeacher|game_folder|StaticDemoFallback/);
assert.match(app, /Protected game content is not configured for this participant/);
assert.doesNotMatch(auth, /game_folder/);
assert.doesNotMatch(engine, /sendRun|missionRunPayload|choiceLogForAppsScript|betaSurvey|resultEndpoint|script\.google\.com/);
assert.match(engine, /if \(!MR\.telemetryContext\) MR\.storage\.saveRun\(run\)/);
assert.match(migration, /drop function if exists public\.research_admin_game_preview\(text\)/i);
assert.doesNotMatch(migration.match(/returns table \([\s\S]*?\)/i)[0], /game_folder/);
assert.match(migration, /alter table public\.cases drop column if exists game_folder/i);
assert.doesNotMatch(migration, /cascade/i);
assert.equal(fs.existsSync(new URL('../teachers/olson/', import.meta.url)), false);
assert.equal(fs.existsSync(new URL('../teachers/_template/', import.meta.url)), false);
assert.equal(fs.existsSync(new URL('../../google-apps-script/Code.gs', import.meta.url)), false);

console.log('gameplay cleanup 3B tests passed');
