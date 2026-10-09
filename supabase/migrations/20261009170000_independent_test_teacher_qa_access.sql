-- Research-admin controlled, isolated gameplay for invited QA teachers.
-- Never requires or alters the dissertation intervention phase or orientation.
-- QA play writes qa_mode=true telemetry only and never enables reminders.

ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS qa_game_access_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS qa_email_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS qa_email_start_date date;

CREATE TABLE IF NOT EXISTS public.research_qa_game_access_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE RESTRICT,
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE RESTRICT,
  enabled boolean NOT NULL,
  actor uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.research_qa_game_access_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Research admins read QA access events" ON public.research_qa_game_access_events;
CREATE POLICY "Research admins read QA access events"
  ON public.research_qa_game_access_events FOR SELECT TO authenticated
  USING ((SELECT public.is_research_admin()));

-- IMPORTANT: This helper is security definer to avoid recursive RLS policy
-- lookups. It nevertheless binds the QA assignment to auth.uid().
CREATE OR REPLACE FUNCTION public.is_authorized_qa_teacher_for_case(
  target_case_id uuid, target_participant_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.participants p
    JOIN public.cases c ON c.id=p.case_id
    JOIN public.profiles pr ON pr.id=p.auth_user_id
    JOIN public.case_game_content gc ON gc.case_id=c.id
    WHERE p.case_id=target_case_id
      AND (target_participant_id IS NULL OR p.id=target_participant_id)
      AND p.auth_user_id=(SELECT auth.uid())
      AND p.is_test IS TRUE
      AND p.qa_game_access_enabled IS TRUE
      AND p.active IS FALSE AND c.active IS FALSE AND c.archived_at IS NULL
      AND pr.active IS TRUE AND pr.role='teacher'
      AND (SELECT count(*) FROM public.participants other WHERE other.case_id=c.id)=1
      AND EXISTS (
        SELECT 1 FROM public.case_protected_content_signoffs s
        WHERE s.case_id=c.id AND s.protected_content_version=gc.version
          AND s.review_type='resource_behavior_review'
      )
      AND EXISTS (
        SELECT 1 FROM public.case_protected_content_signoffs s
        WHERE s.case_id=c.id AND s.protected_content_version=gc.version
          AND s.review_type='resource_privacy_review'
      )
      AND EXISTS (
        SELECT 1 FROM public.case_protected_content_signoffs s
        WHERE s.case_id=c.id AND s.protected_content_version=gc.version
          AND s.review_type='resource_qa_preview'
      )
  );
$$;
REVOKE ALL ON FUNCTION public.is_authorized_qa_teacher_for_case(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_authorized_qa_teacher_for_case(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.test_participant_game_assignment()
RETURNS TABLE(case_id uuid, case_code text, student_alias text, participant_id uuid, participant_code text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $$
  SELECT c.id, c.case_code::text, c.student_alias::text, p.id, p.participant_code::text
  FROM public.participants p
  JOIN public.cases c ON c.id=p.case_id
  WHERE p.auth_user_id=(SELECT auth.uid())
    AND public.is_authorized_qa_teacher_for_case(c.id,p.id)
  LIMIT 2;
$$;
REVOKE ALL ON FUNCTION public.test_participant_game_assignment() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.test_participant_game_assignment() TO authenticated;

CREATE OR REPLACE FUNCTION public.research_admin_set_qa_game_access(
  target_case_id uuid, target_enabled boolean
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE
  target public.participants%ROWTYPE;
  published_version integer;
  change_count integer;
BEGIN
  IF NOT public.is_research_admin() THEN
    RAISE EXCEPTION 'research admin required' USING ERRCODE='42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(target_case_id::text));
  IF NOT EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id=target_case_id AND c.active IS FALSE AND c.archived_at IS NULL
  ) THEN
    RAISE EXCEPTION 'QA game access requires an inactive, nonarchived case.' USING ERRCODE='55000';
  END IF;
  SELECT count(*) INTO change_count FROM public.participants p WHERE p.case_id=target_case_id;
  IF change_count<>1 THEN
    RAISE EXCEPTION 'Exactly one QA participant is required.' USING ERRCODE='55000';
  END IF;
  SELECT p.* INTO target FROM public.participants p WHERE p.case_id=target_case_id FOR UPDATE;
  IF target.is_test IS NOT TRUE OR target.active IS TRUE THEN
    RAISE EXCEPTION 'Only an inactive test participant can use QA access.' USING ERRCODE='55000';
  END IF;
  IF target_enabled THEN
    IF target.auth_user_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id=target.auth_user_id AND pr.active AND pr.role='teacher'
    ) THEN
      RAISE EXCEPTION 'Create and link an active teacher account first.' USING ERRCODE='55000';
    END IF;
    SELECT gc.version INTO published_version
      FROM public.case_game_content gc WHERE gc.case_id=target_case_id;
    IF published_version IS NULL THEN
      RAISE EXCEPTION 'Publish the protected game before enabling QA play.' USING ERRCODE='55000';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.case_protected_content_signoffs s WHERE s.case_id=target_case_id
        AND s.protected_content_version=published_version AND s.review_type='resource_behavior_review'
    ) OR NOT EXISTS (
      SELECT 1 FROM public.case_protected_content_signoffs s WHERE s.case_id=target_case_id
        AND s.protected_content_version=published_version AND s.review_type='resource_privacy_review'
    ) OR NOT EXISTS (
      SELECT 1 FROM public.case_protected_content_signoffs s WHERE s.case_id=target_case_id
        AND s.protected_content_version=published_version AND s.review_type='resource_qa_preview'
    ) THEN
      RAISE EXCEPTION 'Complete all three current-version game reviews first.' USING ERRCODE='55000';
    END IF;
  END IF;
  UPDATE public.participants SET qa_game_access_enabled=target_enabled, qa_email_enabled=CASE WHEN target_enabled THEN qa_email_enabled ELSE false END
    WHERE id=target.id;
  INSERT INTO public.research_qa_game_access_events
    (case_id,participant_id,enabled,actor)
    VALUES (target_case_id,target.id,target_enabled,(SELECT auth.uid()));
  RETURN jsonb_build_object(
    'qa_access_enabled',target_enabled,'participant_id',target.id,
    'case_id',target_case_id,'production_game_access_unchanged',true
  );
END;
$$;
REVOKE ALL ON FUNCTION public.research_admin_set_qa_game_access(uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.research_admin_set_qa_game_access(uuid,boolean) TO authenticated;


CREATE OR REPLACE FUNCTION public.research_admin_qa_game_access_status(target_case_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_research_admin() THEN
    RAISE EXCEPTION 'research admin required' USING ERRCODE='42501';
  END IF;
  SELECT jsonb_build_object(
    'is_test',p.is_test,'qa_access_enabled',p.qa_game_access_enabled,'qa_email_enabled',p.qa_email_enabled,
    'qa_email_start_date',p.qa_email_start_date,
    'account_linked',p.auth_user_id IS NOT NULL,'case_active',c.active,
    'participant_active',p.active,
    'is_qa_case',p.is_test AND NOT c.active AND NOT p.active AND c.archived_at IS NULL
  ) INTO result
  FROM public.participants p JOIN public.cases c ON c.id=p.case_id
  WHERE c.id=target_case_id;
  RETURN coalesce(result,'{}'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.research_admin_qa_game_access_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.research_admin_qa_game_access_status(uuid) TO authenticated;


-- QA mail is an opt-in channel, independent of dissertation reminders.
CREATE TABLE IF NOT EXISTS public.qa_teacher_email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE RESTRICT,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE RESTRICT,
  email_type text NOT NULL CHECK (email_type IN ('daily','weekly')),
  study_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  attempt_count integer NOT NULL DEFAULT 1 CHECK (attempt_count BETWEEN 1 AND 3),
  provider_message_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (participant_id,email_type,study_date)
);
ALTER TABLE public.qa_teacher_email_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Research admins read QA email events" ON public.qa_teacher_email_events;
CREATE POLICY "Research admins read QA email events"
  ON public.qa_teacher_email_events FOR SELECT TO authenticated
  USING ((SELECT public.is_research_admin()));

CREATE TABLE IF NOT EXISTS public.research_qa_email_setting_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE RESTRICT,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE RESTRICT,
  enabled boolean NOT NULL,
  actor uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.research_qa_email_setting_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Research admins read QA email setting events" ON public.research_qa_email_setting_events;
CREATE POLICY "Research admins read QA email setting events"
  ON public.research_qa_email_setting_events FOR SELECT TO authenticated
  USING ((SELECT public.is_research_admin()));

CREATE OR REPLACE FUNCTION public.research_admin_set_qa_email_delivery(target_case_id uuid,target_enabled boolean,target_start_date date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE target public.participants%ROWTYPE;
BEGIN
 IF NOT public.is_research_admin() THEN RAISE EXCEPTION 'research admin required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(target_case_id::text));
 SELECT p.* INTO target FROM public.participants p JOIN public.cases c ON c.id=p.case_id
 WHERE c.id=target_case_id AND c.active IS FALSE AND c.archived_at IS NULL FOR UPDATE OF p;
 IF NOT FOUND OR target.is_test IS NOT TRUE OR target.active IS TRUE
   OR (SELECT count(*) FROM public.participants p WHERE p.case_id=target_case_id)<>1 THEN
   RAISE EXCEPTION 'An inactive and explicitly marked QA participant is required' USING ERRCODE='55000';
 END IF;
 IF target_enabled AND target_start_date IS NOT NULL AND target_start_date < (now() AT TIME ZONE 'America/Denver')::date THEN
   RAISE EXCEPTION 'QA email start date cannot be in the past' USING ERRCODE='22023';
 END IF;
 IF target_enabled AND (target.qa_game_access_enabled IS NOT TRUE OR target.auth_user_id IS NULL) THEN
   RAISE EXCEPTION 'Enable the linked QA teacher game access first' USING ERRCODE='55000';
 END IF;
 UPDATE public.participants SET
   qa_email_enabled=target_enabled,
   qa_email_start_date=CASE WHEN target_enabled THEN coalesce(target_start_date,
     (now() AT TIME ZONE 'America/Denver')::date + ((8-extract(isodow from (now() AT TIME ZONE 'America/Denver')::date)::integer) % 7))
    ELSE qa_email_start_date END
 WHERE id=target.id;
 INSERT INTO public.research_qa_email_setting_events(participant_id,case_id,enabled,actor)
 VALUES(target.id,target_case_id,target_enabled,(SELECT auth.uid()));
 RETURN (SELECT jsonb_build_object('qa_email_enabled',p.qa_email_enabled,'qa_email_start_date',p.qa_email_start_date) FROM public.participants p WHERE p.id=target.id);
END;
$$;
REVOKE ALL ON FUNCTION public.research_admin_set_qa_email_delivery(uuid,boolean,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.research_admin_set_qa_email_delivery(uuid,boolean,date) TO authenticated;

-- Disabling QA play automatically disables QA mail, while never touching
-- production reminder settings, intervention phases, or dissertation data.
-- Narrow read access to this authenticated invited test teacher's case.
DROP POLICY IF EXISTS "Invited QA teachers read their test case" ON public.cases;
CREATE POLICY "Invited QA teachers read their test case" ON public.cases
 FOR SELECT TO authenticated
 USING (public.is_authorized_qa_teacher_for_case(id));

DROP POLICY IF EXISTS "Invited QA teachers read published test game" ON public.case_game_content;
CREATE POLICY "Invited QA teachers read published test game" ON public.case_game_content
 FOR SELECT TO authenticated
 USING (public.is_authorized_qa_teacher_for_case(case_id));

DROP POLICY IF EXISTS "Invited QA teachers read test fidelity target codes" ON public.fidelity_targets;
CREATE POLICY "Invited QA teachers read test fidelity target codes" ON public.fidelity_targets
 FOR SELECT TO authenticated
 USING (public.is_authorized_qa_teacher_for_case(case_id));

-- Test play is always explicitly marked qa_mode=true. Production participant
-- policies remain unchanged, including study-day limits and completion RPCs.
DROP POLICY IF EXISTS "Invited QA teachers insert QA sessions" ON public.game_sessions;
CREATE POLICY "Invited QA teachers insert QA sessions" ON public.game_sessions
 FOR INSERT TO authenticated
 WITH CHECK (qa_mode IS TRUE AND public.is_authorized_qa_teacher_for_case(case_id,participant_id));

DROP POLICY IF EXISTS "Invited QA teachers read own QA sessions" ON public.game_sessions;
CREATE POLICY "Invited QA teachers read own QA sessions" ON public.game_sessions
 FOR SELECT TO authenticated
 USING (qa_mode IS TRUE AND public.is_authorized_qa_teacher_for_case(case_id,participant_id));

DROP POLICY IF EXISTS "Invited QA teachers complete own QA sessions" ON public.game_sessions;
CREATE POLICY "Invited QA teachers complete own QA sessions" ON public.game_sessions
 FOR UPDATE TO authenticated
 USING (qa_mode IS TRUE AND public.is_authorized_qa_teacher_for_case(case_id,participant_id))
 WITH CHECK (qa_mode IS TRUE AND public.is_authorized_qa_teacher_for_case(case_id,participant_id));

DROP POLICY IF EXISTS "Invited QA teachers insert QA responses" ON public.game_responses;
CREATE POLICY "Invited QA teachers insert QA responses" ON public.game_responses
 FOR INSERT TO authenticated
 WITH CHECK (
   qa_mode IS TRUE
   AND public.is_authorized_qa_teacher_for_case(case_id,participant_id)
   AND EXISTS (
     SELECT 1 FROM public.game_sessions gs WHERE gs.id=session_id
       AND gs.case_id=game_responses.case_id
       AND gs.participant_id=game_responses.participant_id AND gs.qa_mode IS TRUE
   )
 );

DROP POLICY IF EXISTS "Invited QA teachers read own QA responses" ON public.game_responses;
CREATE POLICY "Invited QA teachers read own QA responses" ON public.game_responses
 FOR SELECT TO authenticated
 USING (qa_mode IS TRUE AND public.is_authorized_qa_teacher_for_case(case_id,participant_id));

DROP POLICY IF EXISTS "Invited QA teachers insert QA resource events" ON public.game_resource_events;
CREATE POLICY "Invited QA teachers insert QA resource events" ON public.game_resource_events
 FOR INSERT TO authenticated
 WITH CHECK (qa_mode IS TRUE AND public.is_authorized_qa_teacher_for_case(case_id,participant_id));
