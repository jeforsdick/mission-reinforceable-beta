import test from 'node:test'; import assert from 'node:assert/strict'; import { readFile } from 'node:fs/promises';
const sql=await readFile(new URL('../supabase/migrations/20260818040000_mr_procedural_fidelity.sql',import.meta.url),'utf8');
test('reviews are research-admin-only and append-only',()=>{
 assert.match(sql,/enable row level security/); assert.match(sql,/revoke all on table public\.mr_procedural_fidelity_reviews from anon, authenticated/);
 assert.match(sql,/policy "Research admins read procedural fidelity reviews"[\s\S]*is_research_admin/);
 assert.doesNotMatch(sql,/grant (insert|update|delete)/i); assert.match(sql,/before update or delete on public\.mr_procedural_fidelity_reviews/); assert.match(sql,/if not public\.is_research_admin\(\)/);
});
test('RPC validates exact components, statuses, notes, active assignment, and server scoring',()=>{
 assert.match(sql,/array\['daily_prompt_delivered','mission_available','functional_access_available'\]/);
 assert.match(sql,/array\['weekly_usage_summary_delivered','weekly_teacher_checkin_distributed'\]/);
 assert.match(sql,/jsonb_object_keys\(submitted_components\)/); assert.match(sql,/not in \('yes','no','na'\)/);
 assert.match(sql,/status' in \('no','na'\)[\s\S]*brief note is required/); assert.match(sql,/char_length\(coalesce\(component->>'note',''\)\)>1000/);
 assert.match(sql,/p\.active and c\.active/); assert.match(sql,/round\(100\.0\*yeses\/applicable,2\)/); assert.match(sql,/when applicable=0 then null/);
});
test('period calendar and append-only latest-authoritative reporting are frozen',()=>{
 assert.match(sql,/America\/Denver/); assert.match(sql,/2026-08-12/); assert.match(sql,/2027-05-26/); assert.match(sql,/extract\(isodow from target_date\) between 1 and 5/);
 assert.match(sql,/row_number\(\) over\(partition by[\s\S]*reviewed_at desc/); assert.match(sql,/distinct on\(review_scope,coalesce\(study_date,week_start\)\)/);
 assert.match(sql,/generate_series\(target_week_start,target_week_start\+4/);
});
test('future periods are rejected using the current America/Denver day and week',()=>{
 const denverToday=/denver_today date := \(now\(\) at time zone 'America\/Denver'\)::date/g;
 const currentMonday=/current_week_start := denver_today - \(extract\(isodow from denver_today\)::integer - 1\)/g;
 const futureDaily=/if target_study_date > denver_today then[\s\S]*?procedural fidelity cannot be recorded for a future study period/g;
 const futureWeek=/if target_week_start > current_week_start then[\s\S]*?procedural fidelity cannot be recorded for a future study period/g;
 assert.equal([...sql.matchAll(denverToday)].length,2,'evidence and submission use Denver today');
 assert.equal([...sql.matchAll(currentMonday)].length,2,'evidence and submission calculate the current Monday');
 assert.equal([...sql.matchAll(futureDaily)].length,2,'future daily evidence and submission are rejected');
 assert.equal([...sql.matchAll(futureWeek)].length,2,'future weekly evidence and submission are rejected');
 assert.doesNotMatch(sql,/target_study_date >= denver_today/,'today remains allowed');
 assert.doesNotMatch(sql,/target_week_start >= current_week_start/,'the current study week remains allowed');
 assert.match(sql,/target_study_date > denver_today/,'historical daily dates remain allowed by the future guard');
 assert.match(sql,/target_week_start > current_week_start/,'historical weeks remain allowed by the future guard');
});
test('evidence is minimal, excludes QA, and does not auto-score engagement',()=>{
 assert.match(sql,/teacher_reminder_events/); assert.match(sql,/No reminder event recorded\. This does not automatically mean No/);
 assert.match(sql,/not gs\.qa_mode/); assert.match(sql,/does not by itself indicate an access failure/);
 assert.match(sql,/not w\.qa_mode/); assert.match(sql,/Nonsubmission does not prove/); assert.match(sql,/No automated delivery log is available yet/);
 assert.doesNotMatch(sql,/score|fidelity_target|game_responses/);
});
