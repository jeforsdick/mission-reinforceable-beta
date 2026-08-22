-- Metadata-only audit event for the tightly restricted demo password operation.
do $$ declare constraint_name text; begin
  select c.conname into constraint_name from pg_constraint c
  join pg_class t on t.oid = c.conrelid join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public' and t.relname = 'research_onboarding_actions'
    and c.contype = 'c' and pg_get_constraintdef(c.oid) like '%action_type%';
  if constraint_name is not null then execute format('alter table public.research_onboarding_actions drop constraint %I', constraint_name); end if;
end $$;
alter table public.research_onboarding_actions add constraint research_onboarding_actions_action_type_check
  check (action_type in ('intake_approved', 'intake_declined', 'case_provisioned',
    'teacher_account_created', 'coach_account_created', 'qa_login_link_generated', 'intake_edited',
    'qa_test_password_set'));
