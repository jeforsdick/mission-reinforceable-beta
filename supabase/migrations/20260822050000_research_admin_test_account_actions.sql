-- Metadata-only audit events for legacy demo accounts that have no intake request.
create table public.research_admin_test_account_actions (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references public.profiles(id),
  case_id uuid not null references public.cases(id),
  participant_id uuid not null references public.participants(id),
  action_type text not null check (action_type in ('qa_test_password_set')),
  created_at timestamptz not null default now()
);

alter table public.research_admin_test_account_actions enable row level security;
revoke all on table public.research_admin_test_account_actions from public, anon, authenticated;
grant select on table public.research_admin_test_account_actions to authenticated;
grant insert on table public.research_admin_test_account_actions to service_role;
create policy "Research admins read test account actions"
  on public.research_admin_test_account_actions
  for select to authenticated
  using ((select public.is_research_admin()));
