-- Research-admin controlled, isolated gameplay for invited QA teachers.
-- Never requires or alters the dissertation intervention phase or orientation.
-- QA play writes qa_mode=true telemetry only and never enables reminders.

ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS qa_game_access_enabled boolean NOT NULL DEFAULT false;

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
  UPDATE public.participants SET qa_game_access_enabled=target_enabled
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
