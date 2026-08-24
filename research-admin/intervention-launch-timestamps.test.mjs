import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const migration=await readFile(new URL('../supabase/migrations/20260824030000_repair_intervention_launch_timestamp_assumptions.sql',import.meta.url),'utf8');
const bootstrap=await readFile(new URL('../supabase/migrations/20260812000000_legacy_schema_bootstrap.sql',import.meta.url),'utf8');

test('access repair does not assume cases.updated_at exists',()=>{
  assert.match(migration,/update public\.cases set active=target_enabled where id=target_case_id;/);
  assert.doesNotMatch(migration,/public\.cases set[^;]*updated_at/i);
});

test('participants.updated_at is assigned only behind a schema-existence check',()=>{
  assert.match(bootstrap,/create table if not exists public\.participants[\s\S]*?updated_at timestamptz not null default now\(\)/);
  assert.match(migration,/information_schema\.columns[\s\S]*table_name='participants' and column_name='updated_at'[\s\S]*execute 'update public\.participants set active=\$1,updated_at=\$2 where id=\$3'/);
  assert.match(migration,/else\s+update public\.participants set active=target_enabled where id=target_participant_id;/);
});

test('access state, audit timestamp, and response timestamp remain coupled',()=>{
  assert.match(migration,/update public\.cases set active=target_enabled/);
  assert.match(migration,/update public\.participants set active=(?:\$1|target_enabled)/);
  assert.match(migration,/insert into public\.research_intervention_launch_events\(case_id,participant_id,action,actor,recorded_at,protected_content_version\)[\s\S]*values\(target_case_id,target_participant_id,case when target_enabled then 'game_access_enabled' else 'game_access_disabled' end,auth\.uid\(\),changed,content_version\)/);
  assert.match(migration,/jsonb_build_object\('case_active',c\.active,'participant_active',p\.active,'changed_at',changed\)/);
});

test('repair preserves launch authorization and reminder shutdown behavior',()=>{
  assert.match(migration,/if not public\.is_research_admin\(\) then raise exception 'research admin required'/);
  assert.match(migration,/research_admin_assert_intervention_launch_ready\(target_case_id\)/);
  assert.match(migration,/update public\.teacher_reminder_settings set enabled=false,deactivated_at=changed/);
  assert.match(migration,/if reminders_were_enabled then[\s\S]*'reminders_disabled'/);
  assert.match(migration,/grant execute on function public\.research_admin_set_intervention_game_access\(uuid,boolean\) to authenticated/);
});
