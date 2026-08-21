import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260821020000_research_admin_game_authoring_drafts.sql', import.meta.url),
  'utf8',
);

const tables = [
  'case_game_resource_draft_revisions',
  'case_game_mission_draft_revisions',
  'case_game_setup_draft_revisions',
];
const functions = [
  'research_admin_save_resource_map_draft',
  'research_admin_save_mission_draft',
  'research_admin_save_game_setup_draft',
  'research_admin_game_authoring_workspace',
];

function functionBody(name) {
  const match = sql.match(new RegExp(`create function public\\.${name}\\([\\s\\S]*?\\n\\$\\$;`, 'i'));
  assert.ok(match, `${name} exists`);
  return match[0];
}

test('three protected draft revision tables use RLS with no client table grants', () => {
  for (const table of tables) {
    assert.match(sql, new RegExp(`create table public\\.${table} \\(`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security;`));
    assert.match(sql, new RegExp(`revoke all on table public\\.${table} from anon, authenticated;`));
    assert.doesNotMatch(sql, new RegExp(`grant (?:select|insert|update|delete|all) on table public\\.${table}`, 'i'));
  }
  assert.doesNotMatch(sql, /create policy/i);
});

test('every RPC independently enforces Research Admin and safe definer context', () => {
  for (const name of functions) {
    const body = functionBody(name);
    assert.match(body, /security definer set search_path = ''/i);
    assert.match(body, /if not public\.is_research_admin\(\) then raise exception 'research admin required'/);
    assert.match(sql, new RegExp(`revoke all on function public\\.${name}\\([^)]+\\) from public;`));
    assert.match(sql, new RegExp(`grant execute on function public\\.${name}\\([^)]+\\) to authenticated;`));
  }
});

test('mission type and per-type slot limits are enforced by table and save RPC', () => {
  assert.match(sql, /mission_type = 'daily' and slot_number between 1 and 10/);
  assert.match(sql, /mission_type = 'wild' and slot_number between 1 and 5/);
  assert.match(sql, /mission_type = 'crisis' and slot_number between 1 and 5/);
  const save = functionBody('research_admin_save_mission_draft');
  assert.match(save, /target_mission_type not in \('daily', 'wild', 'crisis'\)/);
  assert.match(save, /target_mission_type = 'daily' and target_slot_number not between 1 and 10/);
  assert.match(save, /target_mission_type in \('wild', 'crisis'\) and target_slot_number not between 1 and 5/);
});

test('save operations append incomplete JSON-object revisions and never update them', () => {
  for (const name of functions.slice(0, 3)) {
    const body = functionBody(name);
    assert.match(body, /jsonb_typeof\(target_(?:resources|mission|setup)\) <> 'object'/);
    assert.match(body, /insert into public\.case_game_(?:resource|mission|setup)_draft_revisions/);
    assert.doesNotMatch(body, /\bupdate\b|\bdelete\b/i);
  }
});

test('workspace deterministically returns only latest revisions and active fidelity targets', () => {
  const workspace = functionBody('research_admin_game_authoring_workspace');
  assert.match(workspace, /order by d\.created_at desc, d\.id desc limit 1/g);
  assert.match(workspace, /select distinct on \(d\.mission_type, d\.slot_number\)/);
  assert.match(workspace, /order by d\.mission_type, d\.slot_number, d\.created_at desc, d\.id desc/);
  assert.match(workspace, /from public\.fidelity_targets ft where ft\.case_id = c\.id and ft\.active/);
  assert.match(workspace, /select ci\.has_crisis_plan from public\.case_intake ci/);
});

test('foundation is isolated from publishing and operational behavior', () => {
  assert.doesNotMatch(sql, /(?:insert into|update|delete from) public\.case_game_content/i);
  assert.doesNotMatch(sql, /(?:insert into|update|delete from) public\.(?:cases|participants|teacher_reminder_settings|teacher_reminder_events|case_protected_content_signoffs)/i);
  assert.doesNotMatch(sql, /\b(?:email|activate|activation|phase|score|qa_mode)\b/i);
  assert.match(sql, /never participant runtime, never coach-facing, never[\s\S]{0,8}public, never returned to teachers, and never automatically published/);
});
