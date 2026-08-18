-- Research Admin Command Center, Build 1: dissertation operations foundation.
-- Study phase, gameplay access, operational tasks, measures, coaching, and events
-- are intentionally separate concepts. Nothing in this migration sends email or
-- changes cases.active, participants.active, or reminder settings.

create table public.research_case_protocol (
  case_id uuid primary key references public.cases(id) on delete restrict,
  stagger_position smallint not null unique check (stagger_position between 1 and 5),
  planned_baseline_observations smallint not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_by uuid not null references public.profiles(id) on delete restrict,
  updated_at timestamptz not null default now(),
  constraint research_case_protocol_mapping check (
    planned_baseline_observations = case stagger_position
      when 1 then 6 when 2 then 8 when 3 then 10 when 4 then 12 when 5 then 14 end)
);
create table public.research_case_protocol_events (
  id uuid primary key default gen_random_uuid(), case_id uuid not null references public.cases(id) on delete restrict,
  stagger_position smallint not null check (stagger_position between 1 and 5),
  planned_baseline_observations smallint not null,
  recorded_by uuid not null references public.profiles(id) on delete restrict, recorded_at timestamptz not null default now(),
  constraint research_case_protocol_event_mapping check (planned_baseline_observations = case stagger_position when 1 then 6 when 2 then 8 when 3 then 10 when 4 then 12 when 5 then 14 end)
);
create table public.research_protocol_checklist_events (
  id uuid primary key default gen_random_uuid(), case_id uuid not null references public.cases(id) on delete restrict,
  item_key text not null check (item_key in ('teacher_consent','parent_permission','student_assent','bsp_technical_review','safety_screen','target_routine_finalized','target_behavior_definition','fidelity_checklist_finalized','fidelity_checklist_second_review','baseline_orientation','intervention_orientation')),
  status text not null check (status in ('pending','complete','not_applicable')),
  brief_note text check (brief_note is null or char_length(brief_note)<=1000),
  recorded_by uuid not null references public.profiles(id) on delete restrict, recorded_at timestamptz not null default now()
);
create table public.research_case_phase_events (
  id uuid primary key default gen_random_uuid(), case_id uuid not null references public.cases(id) on delete restrict,
  phase text not null check (phase in ('prebaseline','baseline','intervention','maintenance','complete','withdrawn')),
  effective_date date not null, decision_note text check (decision_note is null or char_length(decision_note)<=1000),
  recorded_by uuid not null references public.profiles(id) on delete restrict, recorded_at timestamptz not null default now()
);
create table public.research_tasks (
  id uuid primary key default gen_random_uuid(), case_id uuid references public.cases(id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  category text not null check (category in ('meeting','follow_up','scheduling','research_admin','observation_planning','measure_follow_up','closeout','other')),
  due_date date, required boolean not null default false, status text not null default 'pending' check (status in ('pending','complete','not_applicable')),
  note text check (note is null or char_length(note)<=1000), created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(), completed_by uuid references public.profiles(id) on delete restrict, completed_at timestamptz
);
create table public.research_measure_events (
  id uuid primary key default gen_random_uuid(), case_id uuid not null references public.cases(id) on delete restrict,
  measure_key text not null check (measure_key in ('tses_pre','tses_post','urp_ir','teacher_interview')),
  status text not null check (status in ('pending','complete','declined','not_applicable')), completed_on date,
  external_reference text check (external_reference is null or char_length(external_reference)<=250),
  brief_note text check (brief_note is null or char_length(brief_note)<=1000),
  recorded_by uuid not null references public.profiles(id) on delete restrict, recorded_at timestamptz not null default now(),
  constraint research_measure_completion_date check (status='complete' or completed_on is null)
);
create table public.research_coaching_contacts (
  id uuid primary key default gen_random_uuid(), case_id uuid not null references public.cases(id) on delete restrict,
  contact_date date not null, format text not null check (format in ('in_person','virtual','email','phone','other')),
  approximate_duration_minutes integer check (approximate_duration_minutes is null or approximate_duration_minutes between 1 and 1440),
  provider_role text not null check (char_length(btrim(provider_role)) between 1 and 160), focuses text[] not null,
  brief_note text check (brief_note is null or char_length(brief_note)<=1000),
  recorded_by uuid not null references public.profiles(id) on delete restrict, recorded_at timestamptz not null default now(),
  constraint research_coaching_focuses check (cardinality(focuses)>0 and focuses <@ array['observation','consultation','performance_feedback','modeling','data_review','problem_solving','responsive_support','other']::text[])
);
create table public.research_study_events (
  id uuid primary key default gen_random_uuid(), case_id uuid not null references public.cases(id) on delete restrict, event_date date not null,
  event_type text not null check (event_type in ('teacher_absence','student_absence','school_schedule_disruption','missed_observation','technical_issue','email_delivery_issue','bsp_change','safety_concern','support_requested','withdrawal','placement_change','protocol_deviation','observer_issue','advisor_pi_decision','other')),
  affects_observation boolean not null default false, affects_mr_exposure boolean not null default false, affects_phase_interpretation boolean not null default false,
  brief_note text not null check (char_length(btrim(brief_note)) between 1 and 1000), action_taken text check (action_taken is null or char_length(action_taken)<=1000),
  resolved_at timestamptz, resolved_by uuid references public.profiles(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default now()
);

create index research_protocol_checklist_case_idx on public.research_protocol_checklist_events(case_id,item_key,recorded_at desc,id desc);
create index research_phase_case_idx on public.research_case_phase_events(case_id,effective_date desc,recorded_at desc,id desc);
create index research_tasks_case_idx on public.research_tasks(case_id,status,due_date);
create index research_measure_case_idx on public.research_measure_events(case_id,measure_key,recorded_at desc,id desc);
create index research_coaching_case_idx on public.research_coaching_contacts(case_id,contact_date desc);
create index research_study_events_case_idx on public.research_study_events(case_id,resolved_at,event_date desc);

create function public.prevent_research_operations_delete() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'research operations history cannot be deleted' using errcode='55000'; end $$;
do $$ declare table_name text; begin
  foreach table_name in array array['research_case_protocol','research_case_protocol_events','research_protocol_checklist_events','research_case_phase_events','research_tasks','research_measure_events','research_coaching_contacts','research_study_events'] loop
    execute format('create trigger %I_no_delete before delete on public.%I for each row execute function public.prevent_research_operations_delete()',table_name,table_name);
  end loop;
end $$;

do $$ declare table_name text; begin
  foreach table_name in array array['research_case_protocol','research_case_protocol_events','research_protocol_checklist_events','research_case_phase_events','research_tasks','research_measure_events','research_coaching_contacts','research_study_events'] loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('revoke all on table public.%I from anon, authenticated',table_name);
    execute format('grant select on table public.%I to authenticated',table_name);
    execute format('create policy "Research admins read %s" on public.%I for select to authenticated using ((select public.is_research_admin()))',table_name,table_name);
  end loop;
end $$;

create function public.research_admin_set_case_protocol(target_case_id uuid, target_stagger_position smallint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare baseline_count smallint; result public.research_case_protocol%rowtype;
begin
 if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
 if target_stagger_position not between 1 and 5 then raise exception 'stagger position must be 1 through 5' using errcode='22023'; end if;
 if exists(select 1 from public.research_case_phase_events where case_id=target_case_id and phase='baseline') then raise exception 'protocol plan cannot be corrected after baseline has begun' using errcode='55000'; end if;
 baseline_count:=case target_stagger_position when 1 then 6 when 2 then 8 when 3 then 10 when 4 then 12 when 5 then 14 end;
 insert into public.research_case_protocol(case_id,stagger_position,planned_baseline_observations,created_by,updated_by)
 values(target_case_id,target_stagger_position,baseline_count,auth.uid(),auth.uid()) on conflict(case_id) do update
 set stagger_position=excluded.stagger_position,planned_baseline_observations=excluded.planned_baseline_observations,updated_by=auth.uid(),updated_at=now() returning * into result;
 insert into public.research_case_protocol_events(case_id,stagger_position,planned_baseline_observations,recorded_by) values(target_case_id,target_stagger_position,baseline_count,auth.uid());
 return to_jsonb(result);
end $$;

create function public.research_admin_record_checklist_status(target_case_id uuid,target_item_key text,target_status text,target_brief_note text default null)
returns jsonb language plpgsql security definer set search_path='' as $$ declare result public.research_protocol_checklist_events%rowtype; begin
 if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
 insert into public.research_protocol_checklist_events(case_id,item_key,status,brief_note,recorded_by) values(target_case_id,target_item_key,target_status,nullif(btrim(target_brief_note),''),auth.uid()) returning * into result; return to_jsonb(result);
end $$;

create function public.research_admin_record_measure(target_case_id uuid,target_measure_key text,target_status text,target_completed_on date default null,target_external_reference text default null,target_brief_note text default null)
returns jsonb language plpgsql security definer set search_path='' as $$ declare result public.research_measure_events%rowtype; begin
 if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
 insert into public.research_measure_events(case_id,measure_key,status,completed_on,external_reference,brief_note,recorded_by)
 values(target_case_id,target_measure_key,target_status,case when target_status='complete' then target_completed_on end,nullif(btrim(target_external_reference),''),nullif(btrim(target_brief_note),''),auth.uid()) returning * into result; return to_jsonb(result);
end $$;

create function public.research_admin_record_phase(target_case_id uuid,target_phase text,target_effective_date date,target_decision_note text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare missing text[]:=array[]::text[]; result public.research_case_phase_events%rowtype; denver_today date:=(now() at time zone 'America/Denver')::date; key text;
begin
 if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
 if target_effective_date>denver_today then raise exception 'phase effective date cannot be in the future (America/Denver)' using errcode='22023'; end if;
 if target_phase='baseline' then
   foreach key in array array['teacher_consent','parent_permission','bsp_technical_review','safety_screen','target_routine_finalized','target_behavior_definition','fidelity_checklist_finalized','fidelity_checklist_second_review','baseline_orientation'] loop
     if coalesce((select e.status from public.research_protocol_checklist_events e where e.case_id=target_case_id and e.item_key=key order by e.recorded_at desc,e.id desc limit 1),'pending')<>'complete' then missing:=array_append(missing,key); end if;
   end loop;
   if coalesce((select e.status from public.research_protocol_checklist_events e where e.case_id=target_case_id and e.item_key='student_assent' order by e.recorded_at desc,e.id desc limit 1),'pending') not in ('complete','not_applicable') then missing:=array_append(missing,'student_assent'); end if;
   if not exists(select 1 from public.research_case_protocol where case_id=target_case_id) then missing:=array_append(missing,'stagger_position'); end if;
   if coalesce((select e.status from public.research_measure_events e where e.case_id=target_case_id and e.measure_key='tses_pre' order by e.recorded_at desc,e.id desc limit 1),'pending')<>'complete' then missing:=array_append(missing,'tses_pre'); end if;
   if cardinality(missing)>0 then raise exception 'baseline prerequisites missing: %',array_to_string(missing,', ') using errcode='55000',detail='Complete every listed prerequisite, then explicitly record baseline again.'; end if;
 end if;
 insert into public.research_case_phase_events(case_id,phase,effective_date,decision_note,recorded_by) values(target_case_id,target_phase,target_effective_date,nullif(btrim(target_decision_note),''),auth.uid()) returning * into result; return to_jsonb(result);
end $$;

create function public.research_admin_create_task(target_case_id uuid,target_title text,target_category text,target_due_date date default null,target_required boolean default false,target_note text default null)
returns jsonb language plpgsql security definer set search_path='' as $$ declare result public.research_tasks%rowtype; begin if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
 insert into public.research_tasks(case_id,title,category,due_date,required,note,created_by) values(target_case_id,btrim(target_title),target_category,target_due_date,target_required,nullif(btrim(target_note),''),auth.uid()) returning * into result; return to_jsonb(result); end $$;
create function public.research_admin_set_task_status(target_task_id uuid,target_status text)
returns jsonb language plpgsql security definer set search_path='' as $$ declare result public.research_tasks%rowtype; begin if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
 update public.research_tasks set status=target_status,completed_by=case when target_status='pending' then null else auth.uid() end,completed_at=case when target_status='pending' then null else now() end where id=target_task_id returning * into result; if result.id is null then raise exception 'task not found' using errcode='P0002'; end if; return to_jsonb(result); end $$;
create function public.research_admin_record_coaching_contact(target_case_id uuid,target_contact_date date,target_format text,target_provider_role text,target_focuses text[],target_approximate_duration_minutes integer default null,target_brief_note text default null)
returns jsonb language plpgsql security definer set search_path='' as $$ declare result public.research_coaching_contacts%rowtype; begin if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
 insert into public.research_coaching_contacts(case_id,contact_date,format,provider_role,focuses,approximate_duration_minutes,brief_note,recorded_by) values(target_case_id,target_contact_date,target_format,btrim(target_provider_role),target_focuses,target_approximate_duration_minutes,nullif(btrim(target_brief_note),''),auth.uid()) returning * into result; return to_jsonb(result); end $$;
create function public.research_admin_record_study_event(target_case_id uuid,target_event_date date,target_event_type text,target_brief_note text,target_affects_observation boolean default false,target_affects_mr_exposure boolean default false,target_affects_phase_interpretation boolean default false,target_action_taken text default null)
returns jsonb language plpgsql security definer set search_path='' as $$ declare result public.research_study_events%rowtype; begin if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
 insert into public.research_study_events(case_id,event_date,event_type,brief_note,affects_observation,affects_mr_exposure,affects_phase_interpretation,action_taken,created_by) values(target_case_id,target_event_date,target_event_type,btrim(target_brief_note),target_affects_observation,target_affects_mr_exposure,target_affects_phase_interpretation,nullif(btrim(target_action_taken),''),auth.uid()) returning * into result; return to_jsonb(result); end $$;
create function public.research_admin_resolve_study_event(target_event_id uuid,target_action_taken text default null)
returns jsonb language plpgsql security definer set search_path='' as $$ declare result public.research_study_events%rowtype; begin if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
 update public.research_study_events set resolved_at=now(),resolved_by=auth.uid(),action_taken=coalesce(nullif(btrim(target_action_taken),''),action_taken) where id=target_event_id and resolved_at is null returning * into result; if result.id is null then raise exception 'open study event not found' using errcode='P0002'; end if; return to_jsonb(result); end $$;

create function public.research_admin_operations_dashboard(target_case_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$ declare result jsonb; begin
 if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
 with case_rows as (select c.id,c.case_code,c.student_alias,p.participant_code study_id,c.active case_active,p.active participant_active,
   coalesce((select pe.phase from public.research_case_phase_events pe where pe.case_id=c.id order by pe.effective_date desc,pe.recorded_at desc,pe.id desc limit 1),'prebaseline') current_phase,
   (select to_jsonb(cp) from public.research_case_protocol cp where cp.case_id=c.id) protocol
   from public.cases c join public.participants p on p.case_id=c.id where target_case_id is null or c.id=target_case_id)
 select jsonb_build_object('authoritative_timezone','America/Denver','cases',coalesce(jsonb_agg(
   to_jsonb(cr)||jsonb_build_object(
    'checklist',coalesce((select jsonb_agg(to_jsonb(x) order by x.item_key) from (select distinct on(e.item_key) e.* from public.research_protocol_checklist_events e where e.case_id=cr.id order by e.item_key,e.recorded_at desc,e.id desc)x),'[]'::jsonb),
    'checklist_history',coalesce((select jsonb_agg(to_jsonb(e) order by e.recorded_at desc) from public.research_protocol_checklist_events e where e.case_id=cr.id),'[]'::jsonb),
    'phase_history',coalesce((select jsonb_agg(to_jsonb(e) order by e.effective_date desc,e.recorded_at desc) from public.research_case_phase_events e where e.case_id=cr.id),'[]'::jsonb),
    'measures',coalesce((select jsonb_agg(to_jsonb(x) order by x.measure_key) from (select distinct on(e.measure_key)e.* from public.research_measure_events e where e.case_id=cr.id order by e.measure_key,e.recorded_at desc,e.id desc)x),'[]'::jsonb),
    'measure_history',coalesce((select jsonb_agg(to_jsonb(e) order by e.recorded_at desc) from public.research_measure_events e where e.case_id=cr.id),'[]'::jsonb),
    'tasks',coalesce((select jsonb_agg(to_jsonb(t)||jsonb_build_object('overdue',t.status='pending' and t.due_date<(now() at time zone 'America/Denver')::date) order by (t.status='pending') desc,t.due_date nulls last) from public.research_tasks t where t.case_id=cr.id),'[]'::jsonb),
    'coaching_contacts',coalesce((select jsonb_agg(to_jsonb(c) order by c.contact_date desc,c.recorded_at desc) from public.research_coaching_contacts c where c.case_id=cr.id),'[]'::jsonb),
    'study_events',coalesce((select jsonb_agg(to_jsonb(e) order by (e.resolved_at is null) desc,e.event_date desc) from public.research_study_events e where e.case_id=cr.id),'[]'::jsonb)
   ) order by cr.study_id) filter(where cr.id is not null),'[]'::jsonb),
   'study_wide_tasks',coalesce((select jsonb_agg(to_jsonb(t)||jsonb_build_object('overdue',t.status='pending' and t.due_date<(now() at time zone 'America/Denver')::date) order by (t.status='pending') desc,t.due_date nulls last) from public.research_tasks t where t.case_id is null),'[]'::jsonb)) into result from case_rows cr;
 return result;
end $$;

do $$ declare fn record; begin for fn in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'research_admin_%' and p.proname in ('research_admin_set_case_protocol','research_admin_record_checklist_status','research_admin_record_measure','research_admin_record_phase','research_admin_create_task','research_admin_set_task_status','research_admin_record_coaching_contact','research_admin_record_study_event','research_admin_resolve_study_event','research_admin_operations_dashboard') loop execute format('revoke all on function %s from public, anon',fn.signature); execute format('grant execute on function %s to authenticated',fn.signature); end loop; end $$;
