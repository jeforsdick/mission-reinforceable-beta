-- Permit the existing account-setup email audit events that the
-- Research Admin account-provisioning endpoint already writes.
-- Previously its second audit INSERT failed after Resend accepted the email
-- and the participant account was linked, producing a misleading error.
ALTER TABLE public.research_onboarding_actions
  DROP CONSTRAINT research_onboarding_actions_action_type_check;

ALTER TABLE public.research_onboarding_actions
  ADD CONSTRAINT research_onboarding_actions_action_type_check
  CHECK (action_type = ANY (ARRAY[
    'intake_approved'::text,
    'intake_declined'::text,
    'case_provisioned'::text,
    'teacher_account_created'::text,
    'coach_account_created'::text,
    'qa_login_link_generated'::text,
    'intake_edited'::text,
    'qa_test_password_set'::text,
    'teacher_account_setup_email_sent'::text,
    'coach_account_setup_email_sent'::text
  ]));
