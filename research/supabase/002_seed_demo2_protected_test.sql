-- TEMPORARY VERIFICATION SEED FOR MR-DEMO-2
-- Purpose: prove that authenticated game content is coming from Supabase/RLS,
-- not from the public static teacher folder.
-- Safe to re-run: uses ON CONFLICT (case_id) DO UPDATE.

insert into public.case_game_content (
  case_id,
  config,
  resources,
  daily_missions,
  wildcard_missions,
  crisis_missions,
  version,
  updated_at
)
select
  c.id,
  jsonb_build_object(
    'teacherId', 'demo-2-protected',
    'displayName', 'Demo Classroom 2 • Protected',
    'classroomLabel', 'Demo Classroom 2 • Protected',
    'studentAlias', 'Kai',
    'defaultHearts', 5,
    'missionSteps', 1,
    'shuffleChoices', true,
    'growthFocus', 'Offer two safe choices, prompt the replacement response early, and reinforce the first appropriate step.',
    'xpMax', 1000,
    'xpMultiplier', 5,
    'feedback', jsonb_build_object(
      'high', E'Strong Plan Alignment\n\nYour response matched Kai''s plan.',
      'mid', E'Mixed Plan Alignment\n\nYour response included a helpful element but missed part of Kai''s plan.',
      'low', E'Needs Review\n\nReturn to Kai''s plan: clear choice or direction, replacement request, and immediate reinforcement.',
      'actionHigh', '<p>Keep using the plan-aligned response.</p>',
      'actionMid', '<p>Refine the response by adding the missing plan component.</p>',
      'actionLow', '<p>Reset to the core plan sequence.</p>'
    )
  ),
  $$
  {
    "title": "Protected Mission Briefing: Kai",
    "studentSnapshot": {
      "student": "Kai",
      "routine": "Centers, whole-group routines, and transitions",
      "targetBehavior": "Refusal, unsafe physical contact, property misuse, or leaving the expected area when routines become difficult or crowded.",
      "function": "Kai's behavior is most likely to help Kai escape or delay difficult or nonpreferred demands."
    },
    "bipPathway": {
      "settingEvents": ["Longer routines and later parts of the day may be harder."],
      "antecedents": ["Long or crowded routines", "Unclear transitions", "Unpaired no/stop statements"],
      "prevention": ["Offer two safe choices", "Use class jobs", "Reduce crowding", "Keep expectations clear"],
      "replacementBehavior": ["Request a short break", "Request alternate work", "Request alternate seating"],
      "reinforcement": ["Praise the first appropriate response", "Use the planned chart-move system"],
      "responsePlan": ["Use a brief precision request", "Prompt an incompatible action", "Reinforce direction following immediately"]
    },
    "behaviorBasics": [
      {"term": "Protected test", "definition": "If you can see this wording, the Resources content came from Supabase."}
    ],
    "fidelityChecklist": ["Two safe choices", "Brief precision request", "Replacement request", "Immediate reinforcement"]
  }
  $$::jsonb,
  $$
  [
    {
      "id": "demo2-protected-daily-test",
      "title": "Protected Daily Test",
      "expectedSteps": 1,
      "start": "start",
      "focus": "Verify protected content loading while practicing Kai's plan.",
      "routine": "literacy centers",
      "functionPressure": ["escape"],
      "bipTargets": ["Choice", "Replacement Request", "Reinforcement"],
      "steps": {
        "start": {
          "text": "BIP Briefing:\nKai does best when adults use two safe choices, brief directions, replacement requests, and quick reinforcement.\n\nScene:\nCenters have been running for a while. Kai pauses at the next task and looks toward the classroom jobs board.",
          "hint": "Offer two safe, manageable options before refusal grows.",
          "choices": {
            "A": {"text": "Offer two safe choices for how to complete the next small part of the task.", "score": 10, "feedback": "This matches Kai's plan by making the next response clear and manageable.", "wizard": "Protected content confirmed—and a strong plan-aligned move.", "meta": {"bipComponent": "Prevent", "mechanism": "Two safe choices", "errorType": "none", "function": "escape"}},
            "B": {"text": "Tell Kai to keep trying and check back in a minute.", "score": 5, "feedback": "This is calm, but it misses the concrete choice or replacement prompt.", "wizard": "Supportive, but add a clearer plan component.", "meta": {"bipComponent": "Prevent", "mechanism": "General encouragement", "errorType": "unclear next step", "function": "escape"}},
            "C": {"text": "Say, 'No. Stop avoiding the task and finish it.'", "score": 0, "feedback": "This uses the no/stop pattern without a safe alternative.", "wizard": "Return to a clear choice or direction.", "meta": {"bipComponent": "Respond", "mechanism": "Unpaired no/stop", "errorType": "power struggle", "function": "escape"}}
          }
        }
      }
    }
  ]
  $$::jsonb,
  $$
  [
    {
      "id": "demo2-protected-wild-test",
      "title": "Protected Mystery Test",
      "expectedSteps": 1,
      "start": "start",
      "focus": "Verify protected content loading during a transition.",
      "routine": "transition",
      "functionPressure": ["escape"],
      "bipTargets": ["Class Job", "Choice", "Assigned Position"],
      "steps": {
        "start": {
          "text": "BIP Briefing:\nKai benefits from structured transitions, useful jobs, safe seating options, and brief directions.\n\nScene:\nThe class is moving to the rug. The usual path is crowded and Kai stops near the cubbies.",
          "hint": "Use a clear role, destination, or two safe options.",
          "choices": {
            "A": {"text": "Give Kai a useful class job and two safe seating options.", "score": 10, "feedback": "This uses the transition supports built into Kai's plan.", "wizard": "Strong transition support.", "meta": {"bipComponent": "Prevent", "mechanism": "Job plus choice", "errorType": "none", "function": "escape"}},
            "B": {"text": "Quietly remind Kai that it is time to go to the rug.", "score": 5, "feedback": "Brief and private, but it misses the known transition supports.", "wizard": "Add the job, position, or choice.", "meta": {"bipComponent": "Prevent", "mechanism": "Brief reminder", "errorType": "support omitted", "function": "escape"}},
            "C": {"text": "Say loudly, 'No, stop. Get to the rug now.'", "score": 0, "feedback": "This adds public pressure and an unpaired no/stop response.", "wizard": "Make the safe next action visible instead.", "meta": {"bipComponent": "Respond", "mechanism": "Public correction", "errorType": "power struggle", "function": "escape"}}
          }
        }
      }
    }
  ]
  $$::jsonb,
  $$
  [
    {
      "id": "demo2-protected-crisis-test",
      "title": "Protected Crisis Test",
      "expectedSteps": 1,
      "start": "start",
      "focus": "Verify protected content loading when an earned break is delayed.",
      "routine": "earned break",
      "functionPressure": ["escape"],
      "bipTargets": ["Replacement Request", "Precision Request", "Reinforcement"],
      "steps": {
        "start": {
          "text": "BIP Briefing:\nKai's plan emphasizes honoring appropriate requests, using brief directions, and reinforcing the first safe response.\n\nScene:\nKai expects an earned break, but the usual break area is briefly unavailable. Kai starts to raise their voice.",
          "hint": "Keep the earned outcome predictable and give a clear, safe next step.",
          "choices": {
            "A": {"text": "Acknowledge the earned break, give a brief safe waiting choice, and preserve access to the break as soon as it is available.", "score": 10, "feedback": "This keeps the reinforcement system trustworthy while supporting a safe response.", "wizard": "Strong crisis prevention.", "meta": {"bipComponent": "Respond", "mechanism": "Preserve earned reinforcer", "errorType": "none", "function": "escape"}},
            "B": {"text": "Tell Kai the break will happen later and ask them to wait.", "score": 5, "feedback": "This may be necessary, but it needs a clearer safe waiting option and reinforcement plan.", "wizard": "Make the waiting path concrete.", "meta": {"bipComponent": "Respond", "mechanism": "Delay", "errorType": "unclear waiting response", "function": "escape"}},
            "C": {"text": "Tell Kai the break is canceled because they are getting upset.", "score": 0, "feedback": "Removing an earned reinforcer during escalation can intensify the situation and weaken the plan.", "wizard": "Do not turn the earned break into the battleground.", "meta": {"bipComponent": "Respond", "mechanism": "Removed reinforcer", "errorType": "punitive consequence", "function": "escape"}}
          }
        }
      }
    }
  ]
  $$::jsonb,
  999,
  now()
from public.cases c
where c.case_code = 'CASE-DEMO-2'
on conflict (case_id) do update set
  config = excluded.config,
  resources = excluded.resources,
  daily_missions = excluded.daily_missions,
  wildcard_missions = excluded.wildcard_missions,
  crisis_missions = excluded.crisis_missions,
  version = excluded.version,
  updated_at = excluded.updated_at;

-- Verification query: should return exactly one row for CASE-DEMO-2.
select
  c.case_code,
  c.student_alias,
  gc.version,
  gc.config ->> 'classroomLabel' as classroom_label,
  jsonb_array_length(gc.daily_missions) as daily_missions,
  jsonb_array_length(gc.wildcard_missions) as wildcard_missions,
  jsonb_array_length(gc.crisis_missions) as crisis_missions
from public.case_game_content gc
join public.cases c on c.id = gc.case_id
where c.case_code = 'CASE-DEMO-2';
