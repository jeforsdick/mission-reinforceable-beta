-- Private research-admin intake review. Provisioning is deliberately omitted:
-- the repository does not document the required legacy cases/participants columns.

create table public.research_onboarding_actions (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references public.profiles(id),
  action_type text not null check (action_type in ('intake_approved', 'intake_declined')),
  request_id uuid not null,
  created_at timestamptz not null default now()
);

alter table public.research_onboarding_actions enable row level security;
revoke all on table public.research_onboarding_actions from anon, authenticated;
grant select on table public.research_onboarding_actions to authenticated;

create policy "Research admins read onboarding actions"
on public.research_onboarding_actions for select to authenticated
using ((select public.is_research_admin()));

create function public.research_admin_intakes()
returns setof public.intake_requests
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_research_admin() then raise exception 'research admin required' using errcode = '42501'; end if;
  return query select i.* from public.intake_requests i order by i.created_at desc;
end;
$$;

-- This lookup exposes only an exact normalized-email match, never an Auth user list.
create function public.research_admin_account_readiness(target_email text)
returns table (profile_id uuid, role text, active boolean)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_research_admin() then raise exception 'research admin required' using errcode = '42501'; end if;
  if target_email is null or target_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'valid email required' using errcode = '22023';
  end if;
  return query select p.id, p.role, p.active from public.profiles p
    where lower(btrim(p.email)) = lower(btrim(target_email));
end;
$$;

create function public.research_admin_set_intake_status(target_request_id uuid, target_status text)
returns text language plpgsql security definer set search_path = ''
as $$
declare current_status text;
begin
  if not public.is_research_admin() then raise exception 'research admin required' using errcode = '42501'; end if;
  if target_request_id is null or target_status not in ('approved', 'declined') then
    raise exception 'invalid intake status request' using errcode = '22023';
  end if;
  select i.status into current_status from public.intake_requests i
    where i.request_id = target_request_id for update;
  if not found then raise exception 'intake not found' using errcode = 'P0002'; end if;
  if current_status <> 'submitted' then
    raise exception 'only submitted intakes may be reviewed' using errcode = '22023';
  end if;
  update public.intake_requests set status = target_status where request_id = target_request_id;
  insert into public.research_onboarding_actions(actor_user_id, action_type, request_id)
    values (auth.uid(), 'intake_' || target_status, target_request_id);
  return target_status;
end;
$$;

revoke all on function public.research_admin_intakes() from public;
revoke all on function public.research_admin_account_readiness(text) from public;
revoke all on function public.research_admin_set_intake_status(uuid, text) from public;
revoke execute on function public.research_admin_intakes() from anon;
revoke execute on function public.research_admin_account_readiness(text) from anon;
revoke execute on function public.research_admin_set_intake_status(uuid, text) from anon;
grant execute on function public.research_admin_intakes() to authenticated;
grant execute on function public.research_admin_account_readiness(text) to authenticated;
grant execute on function public.research_admin_set_intake_status(uuid, text) to authenticated;

comment on table public.research_onboarding_actions is
'Minimal intake-review audit trail; intentionally contains no behavior-plan text.';
comment on function public.research_admin_intakes() is
'Active-research-admin-only intake review feed.';
comment on function public.research_admin_account_readiness(text) is
'Exact-email profile readiness lookup; does not expose Auth user lists.';
