import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20260822010000_research_admin_draft_game_preview.sql', import.meta.url), 'utf8');
const existingPreview = await readFile(new URL('../supabase/migrations/20260816000000_research_admin_game_qa_preview.sql', import.meta.url), 'utf8');

test('saved-draft QA resolver is a narrow Research-Admin-only security definer RPC', () => {
  assert.match(migration, /create function public\.research_admin_draft_game_preview\(\s*target_case_code text,\s*target_mission_type text,\s*target_slot_number integer/);
  assert.match(migration, /language plpgsql\s+security definer\s+set search_path = ''/);
  assert.match(migration, /begin\s+if not public\.is_research_admin\(\)/);
  assert.match(migration, /raise exception 'research admin required' using errcode = '42501'/);
});

test('saved-draft QA validates case, mission type, and per-type slot ranges server-side', () => {
  assert.match(migration, /\^CASE-\[0-9\]\{3\}\$/);
  assert.match(migration, /target_mission_type not in \('daily', 'wild', 'crisis'\)/);
  assert.match(migration, /target_mission_type = 'daily' and target_slot_number not between 1 and 10/);
  assert.match(migration, /target_mission_type in \('wild', 'crisis'\) and target_slot_number not between 1 and 5/);
});

test('saved-draft QA requires one inactive assignment and the exact saved revision, not published content', () => {
  assert.match(migration, /c\.active = false[\s\S]*p\.active = false/);
  assert.match(migration, /match_count <> 1[\s\S]*prepared case assignment is ambiguous/);
  assert.match(migration, /from public\.case_game_mission_draft_revisions d[\s\S]*d\.mission_type = target_mission_type[\s\S]*d\.slot_number = target_slot_number/);
  assert.match(migration, /saved mission draft not found/);
  assert.doesNotMatch(migration, /case_game_content/);
});

test('saved-draft QA is read-only, minimal, and has defense-in-depth grants', () => {
  assert.doesNotMatch(migration, /\b(?:insert|update|delete)\b/i);
  assert.doesNotMatch(migration, /mission json|resources|fidelity|intake/i);
  assert.match(migration, /returns table \(\s*case_id uuid,\s*case_code text,\s*student_alias text,\s*participant_id uuid,\s*participant_code text/);
  assert.match(migration, /revoke all on function public\.research_admin_draft_game_preview\(text, text, integer\) from public/);
  assert.match(migration, /revoke execute on function public\.research_admin_draft_game_preview\(text, text, integer\) from anon/);
  assert.match(migration, /grant execute on function public\.research_admin_draft_game_preview\(text, text, integer\) to authenticated/);
});

test('published QA resolver remains separate and still requires case_game_content', () => {
  assert.match(existingPreview, /create function public\.research_admin_game_preview\(target_case_code text\)/);
  assert.match(existingPreview, /exists \(select 1 from public\.case_game_content gc where gc\.case_id = c\.id\)/);
  assert.doesNotMatch(existingPreview, /research_admin_draft_game_preview/);
});
