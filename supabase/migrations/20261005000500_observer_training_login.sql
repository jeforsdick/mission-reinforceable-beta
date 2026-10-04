
alter table public.research_observers
  add column if not exists login_email text;

alter table public.research_observers
  drop constraint if exists research_observers_login_email_format;

alter table public.research_observers
  add constraint research_observers_login_email_format
  check (
    login_email is null
    or login_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  );

create unique index if not exists research_observers_login_email_unique
  on public.research_observers ((lower(login_email)))
  where login_email is not null;

create or replace function public.research_admin_set_observer_login_email(
  target_observer_id uuid,
  target_login_email text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  result public.research_observers%rowtype;
  normalized text:=lower(nullif(btrim(target_login_email),''));
  linked_user uuid;
begin
  if not public.is_research_admin() then
    raise exception 'research admin required' using errcode='42501';
  end if;

  select a.auth_user_id into linked_user
  from public.research_observer_accounts a
  where a.observer_id=target_observer_id
    and a.active=true;

  if linked_user is not null then
    raise exception 'observer login is already linked; contact the research administrator before changing the email' using errcode='55000';
  end if;

  update public.research_observers
  set login_email=normalized,
      updated_by=auth.uid(),
      updated_at=now()
  where id=target_observer_id
  returning * into result;

  if result.id is null then
    raise exception 'observer not found' using errcode='P0002';
  end if;

  return to_jsonb(result);
end
$function$;

create or replace function public.research_observer_claim_training_account()
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  current_user uuid:=auth.uid();
  current_email text:=lower(nullif(btrim(auth.jwt()->>'email'),''));
  observer public.research_observers%rowtype;
  account public.research_observer_accounts%rowtype;
  training_name text;
begin
  if current_user is null or current_email is null then
    raise exception 'authenticated email required' using errcode='42501';
  end if;

  select * into observer
  from public.research_observers o
  where o.active=true
    and lower(o.login_email)=current_email;

  if observer.id is null then
    raise exception 'this email is not configured for observer training' using errcode='42501';
  end if;

  select * into account
  from public.research_observer_accounts a
  where a.observer_id=observer.id
  for update;

  if account.observer_id is null then
    insert into public.research_observer_accounts(
      observer_id,auth_user_id,active,created_by
    )
    values(observer.id,current_user,true,current_user)
    returning * into account;
  elsif account.auth_user_id is null then
    update public.research_observer_accounts
    set auth_user_id=current_user,active=true
    where observer_id=observer.id
    returning * into account;
  elsif account.auth_user_id<>current_user then
    raise exception 'this observer login is already linked to another account' using errcode='42501';
  elsif not account.active then
    raise exception 'this observer login is inactive' using errcode='42501';
  end if;

  training_name:=split_part(btrim(observer.display_name),' ',1);

  return jsonb_build_object(
    'observer_id',observer.id,
    'observer_code',observer.observer_code,
    'display_name',observer.display_name,
    'training_name',training_name,
    'login_email',observer.login_email
  );
end
$function$;

revoke all on function public.research_admin_set_observer_login_email(uuid,text) from public,anon,authenticated;
revoke all on function public.research_observer_claim_training_account() from public,anon,authenticated;
grant execute on function public.research_admin_set_observer_login_email(uuid,text) to authenticated;
grant execute on function public.research_observer_claim_training_account() to authenticated;

revoke insert on public.observer_training_attempts from anon;
revoke insert on public.observer_training_feedback from anon;
revoke insert on public.observer_training_questions from anon;

drop policy if exists "Training module inserts attempts" on public.observer_training_attempts;
create policy "Authenticated observers insert own training attempts"
on public.observer_training_attempts
for insert
to authenticated
with check (
  auth_user_id=(select auth.uid())
  and case_id in ('nora','kai')
  and attempt_type in ('practice','qualification')
  and interval_seconds=15
  and jsonb_array_length(intervals) between 1 and 240
  and exists(
    select 1
    from public.research_observer_accounts a
    join public.research_observers o on o.id=a.observer_id
    where a.auth_user_id=(select auth.uid())
      and a.active=true
      and o.active=true
      and lower(observer_name)=lower(split_part(btrim(o.display_name),' ',1))
  )
);

drop policy if exists "Training module inserts feedback" on public.observer_training_feedback;
create policy "Authenticated observers insert own training feedback"
on public.observer_training_feedback
for insert
to authenticated
with check (
  auth_user_id=(select auth.uid())
  and case_id in ('nora','kai')
  and exists(
    select 1
    from public.research_observer_accounts a
    join public.research_observers o on o.id=a.observer_id
    where a.auth_user_id=(select auth.uid())
      and a.active=true
      and o.active=true
      and lower(observer_name)=lower(split_part(btrim(o.display_name),' ',1))
  )
);

drop policy if exists "Training module inserts questions" on public.observer_training_questions;
create policy "Authenticated observers insert own training questions"
on public.observer_training_questions
for insert
to authenticated
with check (
  auth_user_id=(select auth.uid())
  and exists(
    select 1
    from public.research_observer_accounts a
    join public.research_observers o on o.id=a.observer_id
    where a.auth_user_id=(select auth.uid())
      and a.active=true
      and o.active=true
      and lower(observer_name)=lower(split_part(btrim(o.display_name),' ',1))
  )
);

drop policy if exists "Observers read own training attempts" on public.observer_training_attempts;
create policy "Observers read own training attempts"
on public.observer_training_attempts
for select
to authenticated
using (auth_user_id=(select auth.uid()));

drop policy if exists "Observers read own training feedback" on public.observer_training_feedback;
create policy "Observers read own training feedback"
on public.observer_training_feedback
for select
to authenticated
using (auth_user_id=(select auth.uid()));

drop policy if exists "Observers read own training questions" on public.observer_training_questions;
create policy "Observers read own training questions"
on public.observer_training_questions
for select
to authenticated
using (auth_user_id=(select auth.uid()));
