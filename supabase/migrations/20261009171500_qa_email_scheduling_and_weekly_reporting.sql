-- QA email functionality isolated from dissertation production reminders/recaps.
CREATE OR REPLACE FUNCTION public.eligible_qa_teacher_emails()
RETURNS TABLE(participant_id uuid,case_id uuid,participant_code text,teacher_name text,teacher_email text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
 IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'service role required' USING ERRCODE='42501'; END IF;
 RETURN QUERY
 SELECT p.id,p.case_id,p.participant_code::text,pr.display_name::text,pr.email::text
 FROM public.participants p
 JOIN public.cases c ON c.id=p.case_id
 JOIN public.profiles pr ON pr.id=p.auth_user_id
 JOIN public.case_game_content gc ON gc.case_id=c.id
 WHERE p.is_test IS TRUE AND p.qa_game_access_enabled IS TRUE AND p.qa_email_enabled IS TRUE
   AND p.active IS FALSE AND c.active IS FALSE AND c.archived_at IS NULL
   AND pr.active IS TRUE AND pr.role='teacher' AND nullif(btrim(pr.email),'') IS NOT NULL
   AND (SELECT count(*) FROM public.participants p2 WHERE p2.case_id=c.id)=1
   AND EXISTS (SELECT 1 FROM public.case_protected_content_signoffs s WHERE s.case_id=c.id AND s.protected_content_version=gc.version AND s.review_type='resource_behavior_review')
   AND EXISTS (SELECT 1 FROM public.case_protected_content_signoffs s WHERE s.case_id=c.id AND s.protected_content_version=gc.version AND s.review_type='resource_privacy_review')
   AND EXISTS (SELECT 1 FROM public.case_protected_content_signoffs s WHERE s.case_id=c.id AND s.protected_content_version=gc.version AND s.review_type='resource_qa_preview');
END;
$$;
REVOKE ALL ON FUNCTION public.eligible_qa_teacher_emails() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.eligible_qa_teacher_emails() TO service_role;

CREATE OR REPLACE FUNCTION public.claim_qa_teacher_email_event(
 target_participant_id uuid,target_case_id uuid,target_email_type text,target_study_date date
)
RETURNS TABLE(claimed boolean,event_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE selected_event uuid;
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'service role required' USING ERRCODE='42501'; END IF;
 IF target_email_type NOT IN ('daily','weekly') THEN RAISE EXCEPTION 'invalid QA email type' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM public.participants p JOIN public.cases c ON c.id=p.case_id
   WHERE p.id=target_participant_id AND p.case_id=target_case_id
     AND p.is_test AND p.qa_game_access_enabled AND p.qa_email_enabled
     AND NOT p.active AND NOT c.active AND c.archived_at IS NULL
 ) THEN RAISE EXCEPTION 'QA mail requires enabled test account' USING ERRCODE='55000'; END IF;
 INSERT INTO public.qa_teacher_email_events (participant_id,case_id,email_type,study_date)
 VALUES(target_participant_id,target_case_id,target_email_type,target_study_date)
 ON CONFLICT(participant_id,email_type,study_date)
 DO UPDATE SET status='pending',attempt_count=public.qa_teacher_email_events.attempt_count+1,updated_at=now()
 WHERE public.qa_teacher_email_events.status='failed'
   AND public.qa_teacher_email_events.attempt_count<3
 RETURNING id INTO selected_event;
 RETURN QUERY SELECT (selected_event IS NOT NULL),selected_event;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_qa_teacher_email_event(uuid,uuid,text,date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_qa_teacher_email_event(uuid,uuid,text,date) TO service_role;

CREATE OR REPLACE FUNCTION public.research_admin_qa_weekly_game_summary(
 target_case_id uuid,target_week_start date
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE result jsonb;
BEGIN
 IF NOT (auth.role()='service_role' OR public.is_research_admin()) THEN
  RAISE EXCEPTION 'research admin required' USING ERRCODE='42501';
 END IF;
 IF extract(isodow FROM target_week_start) <> 1 THEN RAISE EXCEPTION 'week start must be Monday' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.participants p JOIN public.case_game_content gc ON gc.case_id=p.case_id
 WHERE p.case_id=target_case_id AND p.is_test IS TRUE) THEN RAISE EXCEPTION 'QA protected game unavailable' USING ERRCODE='P0002'; END IF;
 WITH a AS (
  SELECT p.id participant_id,p.case_id,gc.version,gc.daily_missions,gc.wildcard_missions,gc.crisis_missions
  FROM public.participants p JOIN public.case_game_content gc ON gc.case_id=p.case_id
  WHERE p.case_id=target_case_id AND p.is_test
 ), valid AS (
  SELECT gs.mode,(gs.ended_at AT TIME ZONE 'America/Denver')::date study_date
  FROM a JOIN public.game_sessions gs ON gs.participant_id=a.participant_id AND gs.case_id=a.case_id
  WHERE gs.status='completed' AND gs.qa_mode IS TRUE
    AND gs.mode IN ('daily','wild','crisis') AND gs.game_content_version=a.version
    AND (gs.ended_at AT TIME ZONE 'America/Denver')::date BETWEEN target_week_start AND target_week_start+4
    AND public.is_mr_dissertation_study_day((gs.ended_at AT TIME ZONE 'America/Denver')::date)
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(CASE gs.mode
       WHEN 'daily' THEN a.daily_missions
       WHEN 'wild' THEN a.wildcard_missions
       WHEN 'crisis' THEN a.crisis_missions END) m WHERE m->>'id'=gs.mission_id
    )
 )
 SELECT jsonb_build_object(
   'week_start',target_week_start,'week_end',target_week_start+4,
   'timezone','America/Denver',
   'missions_completed',count(*),'days_practiced',count(DISTINCT study_date),
   'mission_mix',jsonb_build_object('daily',count(*) FILTER(WHERE mode='daily'),
    'mystery',count(*) FILTER(WHERE mode='wild'),
    'crisis',count(*) FILTER(WHERE mode='crisis')),
   'behavior_plan_xp',NULL,'xp_available',false
 ) INTO result FROM valid;
 RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.research_admin_qa_weekly_game_summary(uuid,date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.research_admin_qa_weekly_game_summary(uuid,date) TO service_role;

CREATE OR REPLACE FUNCTION public.generate_qa_teacher_weekly_checkin(
 target_participant_id uuid,target_case_id uuid,target_week_start date,target_token_hash text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE checkin_id uuid;
BEGIN
 IF auth.role()<>'service_role' THEN RAISE EXCEPTION 'service role required' USING ERRCODE='42501'; END IF;
 IF target_token_hash !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'invalid token hash' USING ERRCODE='22023'; END IF;
 IF extract(isodow from target_week_start)<>1 OR NOT EXISTS (
   SELECT 1 FROM generate_series(target_week_start,target_week_start+4,interval '1 day') d
   WHERE public.is_mr_dissertation_study_day(d::date)
 ) THEN RAISE EXCEPTION 'QA weekly check-in must refer to eligible Monday-Friday week' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.participants p JOIN public.cases c ON c.id=p.case_id
 WHERE p.id=target_participant_id AND p.case_id=target_case_id AND p.is_test
 AND p.qa_game_access_enabled AND p.qa_email_enabled AND NOT p.active AND NOT c.active AND c.archived_at IS NULL)
 THEN RAISE EXCEPTION 'Only opted-in QA cases can issue this check-in' USING ERRCODE='55000'; END IF;
 INSERT INTO public.participant_weekly_checkins(participant_id,case_id,week_start,week_end,link_issued_at,qa_mode)
 VALUES(target_participant_id,target_case_id,target_week_start,target_week_start+4,now(),true)
 ON CONFLICT(participant_id,case_id,week_start,qa_mode)
 DO UPDATE SET link_issued_at=coalesce(public.participant_weekly_checkins.link_issued_at,excluded.link_issued_at)
 RETURNING id INTO checkin_id;
 INSERT INTO public.participant_weekly_checkin_tokens(token_hash,participant_id,case_id,week_start,week_end,expires_at,qa_mode)
 VALUES(target_token_hash,target_participant_id,target_case_id,target_week_start,target_week_start+4,
 (target_week_start+19)::timestamp AT TIME ZONE 'America/Denver',true);
 RETURN checkin_id;
END;
$$;
REVOKE ALL ON FUNCTION public.generate_qa_teacher_weekly_checkin(uuid,uuid,date,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.generate_qa_teacher_weekly_checkin(uuid,uuid,date,text) TO service_role;
