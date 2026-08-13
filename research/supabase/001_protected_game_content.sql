-- Mission: Reinforceable protected individualized game content
-- Run in the Mission Reinforceable Dissertation Supabase project SQL Editor.

create table if not exists public.case_game_content (
  case_id uuid primary key references public.cases(id) on delete cascade,
  config jsonb not null,
  resources jsonb not null,
  daily_missions jsonb not null default '[]'::jsonb,
  wildcard_missions jsonb not null default '[]'::jsonb,
  crisis_missions jsonb not null default '[]'::jsonb,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.case_game_content enable row level security;

-- No anonymous/public browser access to individualized content.
revoke all on table public.case_game_content from anon;

-- Authenticated participants only need read access. Writes remain researcher/admin only.
grant select on table public.case_game_content to authenticated;

-- Re-runnable migration.
drop policy if exists "Participants can view assigned protected game content"
on public.case_game_content;

create policy "Participants can view assigned protected game content"
on public.case_game_content
for select
to authenticated
using (
  exists (
    select 1
    from public.participants p
    where p.case_id = case_game_content.case_id
      and p.auth_user_id = (select auth.uid())
      and p.active = true
  )
);

comment on table public.case_game_content is
'Protected individualized Mission: Reinforceable content. Each authenticated participant may select only the content attached to their assigned active case through RLS.';
