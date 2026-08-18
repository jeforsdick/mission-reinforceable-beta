-- Fictional CASE-999 Resource Map deployment: protected content version 4 -> 5.
-- Review and run as one statement in the Mission: Reinforceable Supabase SQL Editor.
-- This does not change case/participant activation, reminders, telemetry, missions, or config.
do $case_999_update$
declare
  v_case_id uuid;
  v_case_count integer;
  v_content_count integer;
begin
  select count(*), (array_agg(id))[1]
    into v_case_count, v_case_id
    from public.cases
   where case_code = 'CASE-999';

  if v_case_count = 0 then
    raise exception 'CASE-999 deployment aborted: case is missing';
  elsif v_case_count > 1 then
    raise exception 'CASE-999 deployment aborted: more than one case has this case_code';
  end if;

  select count(*)
    into v_content_count
    from public.case_game_content
   where case_id = v_case_id;

  if v_content_count = 0 then
    raise exception 'CASE-999 deployment aborted: case_game_content row is missing';
  end if;

  update public.case_game_content
     set resources = $resources${
  "schemaVersion": 1,
  "studentAlias": "Anna",
  "sections": {
    "bip": {
      "title": "BIP at a Glance",
      "blocks": [
        {
          "type": "paragraph",
          "text": "Anna's behavior is most likely when adult attention is unavailable or directed elsewhere."
        },
        {
          "type": "paragraph",
          "text": "The plan focuses on:"
        },
        {
          "type": "list",
          "items": [
            "Providing proactive, non-contingent adult attention.",
            "Prompting appropriate ways to ask for attention or help.",
            "Reinforcing appropriate attention-seeking quickly.",
            "Minimizing attention to concern behavior when safe.",
            "Calmly returning Anna to the replacement response."
          ]
        },
        {
          "type": "callout",
          "label": "Plan focus",
          "text": "Make appropriate attention-seeking easier and more effective than concern behavior."
        },
        {
          "type": "callout",
          "label": "Safety",
          "text": "Mission: Reinforceable does not add crisis procedures that are not in Anna's plan. Immediate safety concerns should be handled according to existing school procedures; this BIP Map focuses on Anna's plan-supported prevention, teaching, reinforcement, and recovery responses."
        }
      ]
    },
    "functionForest": {
      "title": "Function Forest",
      "blocks": [
        {
          "type": "paragraph",
          "text": "Anna's behavior is most likely when adult attention is unavailable."
        },
        {
          "type": "paragraph",
          "text": "The behavior may function to bring adult interaction back to Anna."
        },
        {
          "type": "paragraph",
          "text": "The implementation goal is not simply to stop behavior; it is to make appropriate attention-seeking more efficient and successful."
        }
      ]
    },
    "prevention": {
      "title": "Prevention Palace",
      "blocks": [
        {
          "type": "list",
          "items": [
            "Give regular non-contingent attention.",
            "Arrange engaging independent activities when adult attention will be elsewhere.",
            "Use visual timers when helpful.",
            "Give advance reminders before adult attention shifts away.",
            "Create predictable opportunities for Anna to receive positive adult interaction before concern behavior occurs."
          ]
        },
        {
          "type": "paragraph",
          "text": "Non-contingent attention is delivered proactively and is not dependent on concern behavior or a replacement request."
        }
      ]
    },
    "replacement": {
      "title": "Replacement Reservoir",
      "blocks": [
        {
          "type": "paragraph",
          "text": "Plan-supported replacement responses include:"
        },
        {
          "type": "list",
          "items": [
            "Appropriately ask for adult attention.",
            "Ask for help.",
            "Wait appropriately.",
            "Use a calm body and voice.",
            "Take a deep breath when prompted or appropriate."
          ]
        },
        {
          "type": "paragraph",
          "text": "Prompt or model the replacement response early rather than waiting for behavior to escalate. Anna does not need to use every replacement response in every situation."
        }
      ]
    },
    "reinforcement": {
      "title": "Reinforcement Ridge",
      "blocks": [
        {
          "type": "paragraph",
          "text": "Immediately reinforce appropriate replacement responding with:"
        },
        {
          "type": "list",
          "items": [
            "Behavior-specific praise.",
            "Adult attention.",
            "Brief one-to-one interaction or play.",
            "Other plan-identified preferred reinforcers when appropriate."
          ]
        },
        {
          "type": "callout",
          "label": "Reinforce quickly",
          "text": "The replacement behavior should contact reinforcement quickly."
        },
        {
          "type": "paragraph",
          "text": "Praise should clearly name what Anna did successfully."
        }
      ]
    },
    "errorCorrection": {
      "title": "Error Correction Canyon",
      "blocks": [
        {
          "type": "paragraph",
          "text": "When everyone is safe:"
        },
        {
          "type": "list",
          "items": [
            "Remain calm and matter-of-fact.",
            "Minimize or withhold adult attention for concern behavior as described in the BIP.",
            "Promptly cue the appropriate replacement response.",
            "Provide attention or reinforcement when Anna uses the replacement response.",
            "Return to the classroom routine without adding unnecessary attention to the concern behavior."
          ]
        },
        {
          "type": "callout",
          "label": "When safe",
          "text": "Planned ignoring or minimizing attention applies only when safe and consistent with the BIP."
        }
      ]
    },
    "library": {
      "title": "BSP Library",
      "blocks": [
        {
          "type": "definitionList",
          "items": [
            {
              "term": "Function",
              "definition": "Why a behavior is effective for the student or what outcome it tends to produce."
            },
            {
              "term": "Non-contingent attention",
              "definition": "Adult attention delivered proactively on a planned basis, not dependent on concern behavior or a replacement response."
            },
            {
              "term": "Replacement behavior",
              "definition": "A safer, more appropriate behavior that allows the student to access the same or similar outcome."
            },
            {
              "term": "Reinforcement",
              "definition": "A consequence that makes a behavior more likely in the future."
            },
            {
              "term": "Prompt",
              "definition": "A cue or model that helps the student use the expected replacement response."
            },
            {
              "term": "Planned ignoring / minimizing attention",
              "definition": "Reducing attention following concern behavior when safe and when specifically included in the behavior plan, while continuing to monitor safety and prompt the appropriate replacement behavior."
            }
          ]
        }
      ]
    },
    "coaching": {
      "title": "Coaching Cottage",
      "blocks": [
        {
          "type": "list",
          "items": [
            "Connect proactively.",
            "Prompt the replacement.",
            "Reinforce it immediately.",
            "Keep correction calm and brief."
          ]
        },
        {
          "type": "paragraph",
          "text": "Mission: Reinforceable data may help the coach notice areas to discuss within normal coaching-as-usual, but the game does not replace the coach's professional judgment."
        }
      ]
    },
    "fidelity": {
      "title": "Fidelity Fortress",
      "blocks": [
        {
          "type": "paragraph",
          "text": "These are the plan-aligned implementation actions practiced throughout Mission: Reinforceable:"
        },
        {
          "type": "list",
          "items": [
            "Give non-contingent attention.",
            "Prompt replacement behavior.",
            "Praise.",
            "Ignore/minimize attention for concern behavior when safe and consistent with the BIP."
          ]
        },
        {
          "type": "paragraph",
          "text": "Game score is not classroom fidelity."
        },
        {
          "type": "callout",
          "label": "Practice and measurement",
          "text": "Game practice helps rehearse the plan. Classroom observation is the study's measure of implementation fidelity."
        }
      ]
    }
  }
}$resources$::jsonb,
         version = 5,
         updated_at = now()
   where case_id = v_case_id
     and version = 4;

  if not found then
    raise exception 'CASE-999 deployment aborted: protected content version must be 4';
  end if;
end
$case_999_update$;
