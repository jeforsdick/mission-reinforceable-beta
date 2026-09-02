-- Repair the test-participant toggle for deployed databases whose participants
-- table intentionally has no updated_at column.

create or replace function public.research_admin_set_test_participant(target_case_id uuid, target_is_test boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
 if not public.is_research_admin() then raise exception 'research admin required' using errcode='42501'; end if;
 if not target_is_test then
  delete from public.teacher_reminder_events e using public.participants p
  where p.case_id=target_case_id and p.is_test and e.participant_id=p.id and e.provider_message_id='simulated-test';
 end if;
 update public.participants set is_test=target_is_test where case_id=target_case_id returning jsonb_build_object('participant_id',id,'is_test',is_test) into result;
 if result is null then raise exception 'case participant not found' using errcode='P0002'; end if;
 return result;
end $$;
