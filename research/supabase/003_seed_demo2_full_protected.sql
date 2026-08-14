-- FULL PROTECTED GAME SEED FOR CASE-DEMO-2
-- Generated from game/teachers/demo-2/ by scripts/build-protected-seed.js.
-- Safe to re-run: upserts by case_id.

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
  $mrjson${
  "teacherId": "demo-2",
  "displayName": "Demo Classroom 2",
  "classroomLabel": "Demo Classroom 2",
  "studentAlias": "Kai",
  "defaultHearts": 5,
  "missionSteps": 5,
  "shuffleChoices": true,
  "resultEndpoint": "https://script.google.com/macros/s/AKfycbwF2bFu7_NKzgQGEpIhfcJ9MsXa3UiE_y3BtYakx_vAHPHR-17iyg9-w0fKbvc17zCH/exec",
  "growthFocus": "Offer two safe choices, prompt the replacement response early, and reinforce the first appropriate step.",
  "xpMax": 1000,
  "xpMultiplier": 5,
  "feedback": {
    "high": "Strong Plan Alignment\n\nGreat work. Your choices consistently matched Kai's plan by using clear choices, brief precision requests, planned breaks or alternate seating, and immediate reinforcement for appropriate responding.",
    "mid": "Mixed Plan Alignment\n\nYou used some helpful responses, but a few choices missed important parts of Kai's plan. Look for moments to offer two manageable choices, prompt a break or seating request, use an incompatible direction, or reinforce direction following right away.",
    "low": "Needs Review\n\nSome choices moved away from Kai's plan and may have increased escape or escalation. Reset by keeping directions brief, avoiding unnecessary 'no' statements, offering two safe choices, and reinforcing the first appropriate response.",
    "actionHigh": "<p>Keep using the plan: choice, brief direction, replacement request, immediate reinforcement.</p>",
    "actionMid": "<p>Review where a clearer choice, replacement prompt, or faster reinforcement would have strengthened the response.</p>",
    "actionLow": "<p>Return to the core sequence: reduce unnecessary confrontation, give one clear direction or two safe choices, prompt the replacement response, and reinforce the first successful step.</p>"
  },
  "assets": {
    "landingClassroom": "../assets/game/skin-v2/landing-page-classroom.png",
    "sameDayClassroom": "../assets/game/skin-v2/same-day-return-page-classroom.png"
  },
  "contentSource": "supabase-protected"
}$mrjson$::jsonb,
  $mrjson${
  "title": "Mission Briefing: Kai",
  "studentSnapshot": {
    "student": "Kai",
    "routine": "Centers, whole-group routines, and transitions",
    "targetBehavior": "Refusal, unsafe physical contact, property misuse, or leaving the expected area when routines become difficult, lengthy, crowded, or when access to a preferred option is interrupted.",
    "function": "Kai's behavior is most likely to help Kai escape or delay difficult or nonpreferred demands."
  },
  "bipPathway": {
    "settingEvents": [
      "Kai may have a shorter tolerance for longer routines, especially later in the day.",
      "Whole-group activities and transitions can be more difficult than highly preferred routines.",
      "Helping the teacher and having a clear job can be highly motivating."
    ],
    "antecedents": [
      "A task or group routine lasts longer than Kai can comfortably sustain.",
      "A transition is crowded, unclear, or removes access to a preferred activity.",
      "An adult says 'no' or 'stop' without offering a manageable alternative.",
      "Kai is waiting without a clear task, job, or choice."
    ],
    "prevention": [
      "Offer two safe, manageable choices whenever possible.",
      "Use class jobs and preferred productive tasks during transitions or downtime.",
      "Use assigned seating or transition positions that reduce crowding by peers.",
      "Avoid unnecessary 'no' statements; pair limits with a safe choice when possible.",
      "Keep preferred independent tasks available during downtime.",
      "Make snack and break routines predictable and teach how to request them appropriately."
    ],
    "replacementBehavior": [
      "Raise a hand and request a short break or alternate work.",
      "Raise a hand and request another appropriate seat or location in the classroom.",
      "Follow one clear direction and return to the routine.",
      "Choose between two safe options offered by the adult."
    ],
    "reinforcement": [
      "Mark a chart move for following directions, completing tasks, participating, successful transitions, or prosocial behavior.",
      "Pair chart moves with brief praise, high fives, thumbs up, or another small reinforcer.",
      "When a larger reinforcer or break is earned, preserve access to the earned outcome whenever possible.",
      "Let Kai choose between at least two available reinforcers when feasible."
    ],
    "responsePlan": [
      "Use a brief precision request when Kai is not following directions or is unsafe.",
      "Prompt an incompatible action that cannot occur at the same time as the unsafe behavior.",
      "Praise direction following and appropriate behavior immediately, even if mild unrelated behavior is still occurring.",
      "Keep language brief and private; avoid turning the moment into a power struggle."
    ]
  },
  "behaviorBasics": [
    {
      "term": "Plan-aligned",
      "definition": "'You can sit at the end of the rug or at the side table. Pick one.'"
    },
    {
      "term": "Plan-aligned",
      "definition": "'Kai, I need you to put the markers in the bin.' Then praise the first step of following the direction."
    },
    {
      "term": "Plan-aligned",
      "definition": "'You can ask for a short break or choose the alternate work.'"
    },
    {
      "term": "Less helpful",
      "definition": "'No. Stop that right now.' without a clear next action or safe choice."
    },
    {
      "term": "Less helpful",
      "definition": "Publicly calling attention to a missed reinforcer or comparing Kai with peers."
    },
    {
      "term": "Remember",
      "definition": "The goal is to make the next appropriate response easy to see and worth doing: clear direction, safe choice, replacement request, then reinforcement."
    }
  ],
  "fidelityChecklist": [
    "Two safe choices",
    "Brief precision request",
    "Replacement request",
    "Immediate reinforcement"
  ]
}$mrjson$::jsonb,
  $mrjson$[
  {
    "id": "demo2-daily-long-center",
    "title": "The Long Center",
    "expectedSteps": 5,
    "start": "d1_start",
    "focus": "Use Kai's choices, replacement requests, brief directions, and reinforcement during a long center routine.",
    "routine": "literacy centers",
    "functionPressure": [
      "escape"
    ],
    "bipTargets": [
      "Choice",
      "Replacement Request",
      "Precision Request",
      "Reinforcement"
    ],
    "steps": {
      "d1_start": {
        "meta": {
          "fidelityTargetKey": "proactive_01"
        },
        "text": "BIP Briefing:\nKai may have difficulty when routines are long, crowded, or when access to a preferred option changes.\nYour job is to choose responses that follow Kai's plan:\n* offer two safe, manageable choices,\n* use a brief, specific direction or an incompatible action,\n* prompt a break, alternate-work, or alternate-seating request,\n* reinforce the first appropriate response right away.\nAvoid unnecessary no/stop statements, public correction, threats, or turning the moment into a power struggle.\n\nScene:\nCenters have been running for about 15 minutes. Kai finished the first activity and is now at a table with a sorting task.\n\nKai starts sliding the cards into a pile instead of sorting them. They glance toward the classroom jobs board and then toward the door.",
        "hint": "This is a good prevention moment. Make the next step clear and offer two manageable options before refusal grows.",
        "choices": {
          "A": {
            "text": "Move close and say, \"You can sort five cards here, or sort five at the side table. You choose.\"",
            "score": 10,
            "feedback": "This matches the plan. You kept the task available, made the expectation small, and offered two safe choices.",
            "wizard": "Strong move. Two clear paths make the next step easier to choose than escape.",
            "next": "d2_supported",
            "meta": {
              "bipComponent": "Prevent",
              "mechanism": "Two safe choices",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Say, \"You are almost done. Keep working and then we can move on.\"",
            "score": 5,
            "feedback": "This is calm and encouraging, but it does not give Kai a concrete next action or a choice.",
            "wizard": "Gentle, but vague. The plan works best when Kai can see exactly what to do next.",
            "next": "d2_wobbly",
            "meta": {
              "bipComponent": "Prevent",
              "mechanism": "General encouragement",
              "errorType": "unclear next step",
              "function": "escape"
            }
          },
          "C": {
            "text": "Say, \"No. Stop playing with the cards and finish the center.\"",
            "score": 0,
            "feedback": "This adds a direct no/stop statement without a safe alternative. That pattern is more likely to increase escape or escalation.",
            "wizard": "Careful. The door to a power struggle just opened. Pair the limit with a clear action or choice.",
            "next": "d2_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Limit statement",
              "errorType": "unpaired no/stop",
              "function": "escape"
            }
          }
        }
      },
      "d2_supported": {
        "text": "Kai points to the side table and carries the cards over. They sort two correctly, then pause and say, \"Can I be done?\"",
        "hint": "Prompt the replacement response. Kai can ask for a short break or alternate work.",
        "choices": {
          "A": {
            "text": "Say, \"You can ask for a short break or alternate work. Which do you need?\"",
            "score": 10,
            "feedback": "This directly teaches the planned replacement response instead of waiting for refusal.",
            "wizard": "Excellent. You turned \"Can I be done?\" into a skill Kai can use again.",
            "next": "d3_supported",
            "meta": {
              "bipComponent": "Teach",
              "mechanism": "Break or alternate-work request",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Say, \"Finish three more cards and then we can talk about a break.\"",
            "score": 5,
            "feedback": "This gives a clear amount of work, but it delays prompting the replacement request that the plan is trying to build.",
            "wizard": "Not bad, but the replacement skill is still hiding. Prompt the request while the moment is calm.",
            "next": "d3_wobbly",
            "meta": {
              "bipComponent": "Teach",
              "mechanism": "Small task",
              "errorType": "missed replacement prompt",
              "function": "escape"
            }
          },
          "C": {
            "text": "Say, \"You already moved tables, so now you need to finish.\"",
            "score": 0,
            "feedback": "This turns the earlier choice into leverage and blocks the planned request. It may make escape more likely.",
            "wizard": "The choice should stay supportive, not become a trap. Prompt the skill instead.",
            "next": "d3_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Blocked request",
              "errorType": "power struggle",
              "function": "escape"
            }
          }
        }
      },
      "d2_wobbly": {
        "text": "Kai sorts one card, then starts tapping the stack against the table. They say, \"This is taking forever.\"",
        "hint": "Make the next response concrete: a safe choice, a short request, or a small task.",
        "choices": {
          "A": {
            "text": "Say, \"You can do five here or five at the side table. After that, you can ask for a break.\"",
            "score": 10,
            "feedback": "This restores the plan by combining a manageable choice with the replacement break request.",
            "wizard": "Nice recovery. The path is visible again.",
            "next": "d3_supported",
            "meta": {
              "bipComponent": "Prevent",
              "mechanism": "Choice plus break request",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Say, \"I know it feels long. Keep going for another minute.\"",
            "score": 5,
            "feedback": "This acknowledges the difficulty, but the next action is still vague and the replacement request is not prompted.",
            "wizard": "Supportive words help, but Kai still needs a concrete move.",
            "next": "d3_wobbly",
            "meta": {
              "bipComponent": "Prevent",
              "mechanism": "Acknowledgment",
              "errorType": "unclear next step",
              "function": "escape"
            }
          },
          "C": {
            "text": "Say, \"Everyone else is still working, so you need to keep going too.\"",
            "score": 0,
            "feedback": "Peer comparison adds pressure without teaching the plan.",
            "wizard": "Comparing Kai to peers can make escape feel even more valuable.",
            "next": "d3_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Peer comparison",
              "errorType": "public pressure",
              "function": "escape"
            }
          }
        }
      },
      "d2_escalated": {
        "text": "Kai sweeps several cards onto the floor and pushes the chair back. A nearby student turns to look.",
        "hint": "Keep language brief. Use a precision request or an incompatible action and reinforce the first step of following it.",
        "choices": {
          "A": {
            "text": "Move close and say, \"Kai, I need you to pick up the five cards by your chair.\"",
            "score": 10,
            "feedback": "This is a brief, observable direction that is incompatible with continuing to scatter the materials.",
            "wizard": "Clear and concrete. Now watch for the first step to reinforce.",
            "next": "d3_wobbly",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Precision request and incompatible action",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Say, \"Please calm down and make a better choice.\"",
            "score": 5,
            "feedback": "The tone is calm, but the direction is not observable enough to guide Kai's next action.",
            "wizard": "Calm is good. Now make the action specific.",
            "next": "d3_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "General correction",
              "errorType": "vague direction",
              "function": "escape"
            }
          },
          "C": {
            "text": "Say loudly, \"Stop throwing things. You are losing your center choice.\"",
            "score": 0,
            "feedback": "This adds public attention, a no/stop pattern, and loss language during escalation.",
            "wizard": "That may feed the storm. Keep the direction private, brief, and doable.",
            "next": "d3_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Public consequence",
              "errorType": "public correction",
              "function": "escape"
            }
          }
        }
      },
      "d3_supported": {
        "text": "Kai says, \"Can I take a short break?\" They are still seated and the materials are safe.",
        "hint": "Reinforce the replacement request right away and make the return path predictable.",
        "choices": {
          "A": {
            "text": "Say, \"Great job asking. Yes—take your short break, then come back and finish five cards.\"",
            "score": 10,
            "feedback": "This reinforces the replacement request and keeps the return expectation clear.",
            "wizard": "Perfect timing. The skill worked, so you made it worth using again.",
            "next": "d4_supported",
            "meta": {
              "bipComponent": "Reinforce",
              "mechanism": "Break request plus return",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Say, \"Okay, take a break.\"",
            "score": 5,
            "feedback": "Honoring the request is helpful, but the return step is not defined.",
            "wizard": "The break is there, but the trail back needs a marker.",
            "next": "d4_wobbly",
            "meta": {
              "bipComponent": "Reinforce",
              "mechanism": "Break request",
              "errorType": "unclear return",
              "function": "escape"
            }
          },
          "C": {
            "text": "Say, \"Not yet. You need to show me you can work first.\"",
            "score": 0,
            "feedback": "This blocks the replacement response after Kai used it appropriately.",
            "wizard": "If the skill does not work, escape behavior may become more powerful again.",
            "next": "d4_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Blocked replacement",
              "errorType": "break request denied",
              "function": "escape"
            }
          }
        }
      },
      "d3_wobbly": {
        "text": "Kai begins following the direction, but slowly. They pick up two items and then look away from the task.",
        "hint": "Praise direction following immediately—even if the whole routine is not perfect yet.",
        "choices": {
          "A": {
            "text": "Say, \"Thank you for picking those up,\" and mark a chart move for following the direction.",
            "score": 10,
            "feedback": "This matches the plan: reinforce the first appropriate response quickly.",
            "wizard": "There it is—the first successful step. Catch it fast.",
            "next": "d4_supported",
            "meta": {
              "bipComponent": "Reinforce",
              "mechanism": "Immediate praise and chart move",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Wait until all the materials are picked up before giving praise.",
            "score": 5,
            "feedback": "Waiting for full completion misses an opportunity to strengthen the first step of compliance.",
            "wizard": "Do not wait for perfect. Reinforce the first move in the right direction.",
            "next": "d4_wobbly",
            "meta": {
              "bipComponent": "Reinforce",
              "mechanism": "Delayed praise",
              "errorType": "reinforcement delayed",
              "function": "escape"
            }
          },
          "C": {
            "text": "Say, \"See? You could have done that the first time.\"",
            "score": 0,
            "feedback": "This adds criticism after compliance instead of reinforcing it.",
            "wizard": "The right behavior appeared—do not punish it with a lecture.",
            "next": "d4_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Corrective lecture",
              "errorType": "criticism after compliance",
              "function": "escape"
            }
          }
        }
      },
      "d3_escalated": {
        "text": "Kai moves farther from the table and starts touching materials from another group's center.",
        "hint": "Use an incompatible, observable direction and keep the response private.",
        "choices": {
          "A": {
            "text": "Say quietly, \"Kai, I need you to carry this basket to the supply shelf.\"",
            "score": 10,
            "feedback": "This uses a concrete, helpful action that is incompatible with touching the other group's materials.",
            "wizard": "A productive job can interrupt the unsafe pattern and create a success to reinforce.",
            "next": "d4_wobbly",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Incompatible class job",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Stand nearby and say, \"Let's get back on track.\"",
            "score": 5,
            "feedback": "Staying close is helpful, but the direction is too general to guide a specific response.",
            "wizard": "Close support helps. Now give Kai one observable action.",
            "next": "d4_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Proximity",
              "errorType": "vague direction",
              "function": "escape"
            }
          },
          "C": {
            "text": "Tell the other students, \"Please ignore Kai until Kai is ready to follow directions.\"",
            "score": 0,
            "feedback": "This publicly identifies Kai's behavior and increases peer attention to the situation.",
            "wizard": "Keep Kai's correction private. The class does not need to become part of the consequence.",
            "next": "d4_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Public attention",
              "errorType": "public callout",
              "function": "escape"
            }
          }
        }
      },
      "d4_supported": {
        "text": "After the break or brief support, Kai returns to the center area. They sit down but look tired and glance toward the jobs board again.",
        "hint": "Use a preferred productive role and a clear amount of work to support re-entry.",
        "choices": {
          "A": {
            "text": "Say, \"Finish five cards, then you can collect the center bins for me.\"",
            "score": 10,
            "feedback": "This pairs a clear amount of work with a meaningful class job Kai values.",
            "wizard": "Nice. The return path ends with something worth reaching.",
            "next": "d5_supported",
            "meta": {
              "bipComponent": "Prevent",
              "mechanism": "Clear work amount plus class job",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Say, \"Let's see how much you can finish before the timer goes off.\"",
            "score": 5,
            "feedback": "This creates structure, but it does not use the known job preference or a clear completion target.",
            "wizard": "Structure helps. A specific amount and preferred job would make it stronger.",
            "next": "d5_wobbly",
            "meta": {
              "bipComponent": "Prevent",
              "mechanism": "Timer",
              "errorType": "missed preferred support",
              "function": "escape"
            }
          },
          "C": {
            "text": "Say, \"You lost a lot of time, so now you need to finish the whole stack.\"",
            "score": 0,
            "feedback": "Increasing the demand after difficulty makes escape more valuable and moves away from the plan.",
            "wizard": "Do not make the mountain bigger after Kai just came back to the trail.",
            "next": "d5_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Increased demand",
              "errorType": "response cost through extra work",
              "function": "escape"
            }
          }
        }
      },
      "d4_wobbly": {
        "text": "Kai is back near the center, but participation is fragile. They touch the task, then pull their hands back.",
        "hint": "Give one clear choice and reinforce the first successful action.",
        "choices": {
          "A": {
            "text": "Say, \"Do five cards with the red bin or the blue bin,\" then praise the first card completed.",
            "score": 10,
            "feedback": "This combines choice, a manageable response, and immediate reinforcement.",
            "wizard": "Three plan pieces in one clean move.",
            "next": "d5_supported",
            "meta": {
              "bipComponent": "Prevent",
              "mechanism": "Choice plus immediate reinforcement",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Say, \"Just try your best for the last few minutes.\"",
            "score": 5,
            "feedback": "The tone is supportive, but the expectation is not concrete.",
            "wizard": "Kind words, fuzzy path. Make the next action visible.",
            "next": "d5_wobbly",
            "meta": {
              "bipComponent": "Prevent",
              "mechanism": "Encouragement",
              "errorType": "vague expectation",
              "function": "escape"
            }
          },
          "C": {
            "text": "Say, \"No more breaks. We are finishing now.\"",
            "score": 0,
            "feedback": "This returns to an unpaired no statement and removes the planned support.",
            "wizard": "That closes the replacement path when you need it most.",
            "next": "d5_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "No statement",
              "errorType": "support removed",
              "function": "escape"
            }
          }
        }
      },
      "d4_escalated": {
        "text": "Kai is still avoiding the center and watching the doorway. The rest of the group is beginning to transition.",
        "hint": "Use the transition itself as a structured opportunity: clear job, assigned position, and reinforcement.",
        "choices": {
          "A": {
            "text": "Say, \"Kai, I need you to carry the center clipboard to the front of the line,\" then praise the first step toward the job.",
            "score": 10,
            "feedback": "This gives an incompatible class job, structures the transition, and creates a fast opportunity to reinforce compliance.",
            "wizard": "Excellent recovery. The transition becomes a job instead of another battle.",
            "next": "d5_wobbly",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Class job and transition support",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Let Kai wait until everyone else has lined up, then ask them to join.",
            "score": 5,
            "feedback": "Reducing crowding may help, but the plan's assigned transition position and active direction would be stronger.",
            "wizard": "Less crowding helps. A clear job or assigned position would make the route even safer.",
            "next": "d5_wobbly",
            "meta": {
              "bipComponent": "Prevent",
              "mechanism": "Reduced crowding",
              "errorType": "missed assigned position",
              "function": "escape"
            }
          },
          "C": {
            "text": "Tell Kai they cannot join the next activity until the center is completely finished.",
            "score": 0,
            "feedback": "This can create a prolonged escape-and-demand struggle instead of supporting a successful transition.",
            "wizard": "The mission is to build the next successful response, not extend the standoff.",
            "next": "d5_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Activity exclusion",
              "errorType": "extended power struggle",
              "function": "escape"
            }
          }
        }
      },
      "d5_supported": {
        "text": "Kai completes the small task and starts the class job. The transition bell rings.",
        "hint": "Finish by reinforcing the successful transition and participation.",
        "choices": {
          "A": {
            "text": "Mark a chart move and say, \"You finished your job and transitioned safely. Nice work.\"",
            "score": 10,
            "feedback": "This directly reinforces the behaviors the plan is designed to strengthen.",
            "wizard": "Quest complete. You made the successful behavior visible and valuable.",
            "meta": {
              "bipComponent": "Reinforce",
              "mechanism": "Chart move and specific praise",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Say, \"Thanks,\" and move on to the next activity.",
            "score": 5,
            "feedback": "Brief praise is helpful, but this misses the planned chart-move reinforcement.",
            "wizard": "A little reinforcement is better than none, but use the system that is already built for Kai.",
            "meta": {
              "bipComponent": "Reinforce",
              "mechanism": "Brief praise",
              "errorType": "chart move omitted",
              "function": "escape"
            }
          },
          "C": {
            "text": "Say, \"That was much better than how you started centers.\"",
            "score": 0,
            "feedback": "This compares the success to earlier problem behavior instead of reinforcing the behavior itself.",
            "wizard": "End on the success, not the mistake that came before it.",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Comparison to prior behavior",
              "errorType": "criticism mixed with praise",
              "function": "escape"
            }
          }
        }
      },
      "d5_wobbly": {
        "text": "Kai participates enough to rejoin the transition, but the routine still feels effortful.",
        "hint": "Reinforce the part that went right, even if the whole routine was not perfect.",
        "choices": {
          "A": {
            "text": "Mark a chart move for the successful transition and give specific praise for following the direction.",
            "score": 10,
            "feedback": "This follows the plan by reinforcing the successful piece immediately.",
            "wizard": "Exactly. Reinforce progress, not perfection.",
            "meta": {
              "bipComponent": "Reinforce",
              "mechanism": "Partial-success reinforcement",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Wait to see how Kai does in the next activity before giving reinforcement.",
            "score": 5,
            "feedback": "Waiting weakens the connection between the successful transition and reinforcement.",
            "wizard": "Catch the success while it is still warm.",
            "meta": {
              "bipComponent": "Reinforce",
              "mechanism": "Delayed reinforcement",
              "errorType": "reinforcement delayed",
              "function": "escape"
            }
          },
          "C": {
            "text": "Tell Kai they can earn the chart move back later if the next activity goes well.",
            "score": 0,
            "feedback": "The plan is to award chart moves for successful behavior, not withhold an earned move as leverage.",
            "wizard": "Do not turn earned reinforcement into a debt.",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Withheld earned reinforcement",
              "errorType": "response cost",
              "function": "escape"
            }
          }
        }
      },
      "d5_escalated": {
        "text": "The center ends with Kai still needing support to transition. You have one last chance to set up the next routine successfully.",
        "hint": "Use a clear transition position or job and reinforce the first step.",
        "choices": {
          "A": {
            "text": "Give Kai a specific transition job and assigned place, then praise the first step of following it.",
            "score": 10,
            "feedback": "This returns to the plan and creates a concrete success at the next transition.",
            "wizard": "Strong reset. A new routine is a new chance to follow the plan.",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Transition job and assigned position",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Keep Kai beside you during the transition and remind them to make good choices.",
            "score": 5,
            "feedback": "Proximity can help, but the direction and reinforcement plan are still too general.",
            "wizard": "Stay close, but give Kai something specific to do.",
            "meta": {
              "bipComponent": "Prevent",
              "mechanism": "Proximity",
              "errorType": "vague direction",
              "function": "escape"
            }
          },
          "C": {
            "text": "Tell Kai they have lost the next preferred activity because centers were difficult.",
            "score": 0,
            "feedback": "Removing a preferred activity after escalation does not teach the replacement response and may increase escape pressure.",
            "wizard": "Reset the skill pathway instead of adding another battle.",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Loss of preferred activity",
              "errorType": "punitive consequence",
              "function": "escape"
            }
          }
        }
      }
    }
  }
]$mrjson$::jsonb,
  $mrjson$[
  {
    "id": "demo2-wild-crowded-transition",
    "title": "The Crowded Transition",
    "expectedSteps": 5,
    "start": "w1_start",
    "focus": "Use assigned position, class jobs, choices, and brief directions during a difficult transition.",
    "routine": "snack-to-whole-group transition",
    "functionPressure": [
      "escape"
    ],
    "bipTargets": [
      "Assigned Position",
      "Choice",
      "Class Job",
      "Precision Request"
    ],
    "steps": {
      "w1_start": {
        "text": "BIP Briefing:\nKai may have difficulty when routines are long, crowded, or when access to a preferred option changes.\nYour job is to choose responses that follow Kai's plan:\n* offer two safe, manageable choices,\n* use a brief, specific direction or an incompatible action,\n* prompt a break, alternate-work, or alternate-seating request,\n* reinforce the first appropriate response right away.\nAvoid unnecessary no/stop statements, public correction, threats, or turning the moment into a power struggle.\n\nScene:\nSnack is ending and the class is moving to the rug for whole group. Kai usually does better when transitions are structured.\n\nToday, several students crowd around the sink and the usual end-of-row rug spot is blocked by a backpack. Kai stops moving and reaches toward another student's snack container.",
        "hint": "Reduce crowding and give Kai a clear role or position instead of only telling what not to do.",
        "choices": {
          "A": {
            "text": "Say, \"Kai, carry the sanitizer basket to the rug, then sit at the end of the row or the side chair. You choose.\"",
            "score": 10,
            "feedback": "This combines a preferred class job, assigned-position support, and two safe choices.",
            "wizard": "Excellent setup. The transition now has a job, a destination, and a choice.",
            "next": "w2_supported",
            "meta": {
              "bipComponent": "Prevent",
              "mechanism": "Job plus assigned-position choice",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Say, \"Come on, Kai. We are going to the rug now.\"",
            "score": 5,
            "feedback": "The direction is brief, but it misses the known supports for crowding and choice.",
            "wizard": "Clear, but incomplete. Use the supports that make this transition easier.",
            "next": "w2_wobbly",
            "meta": {
              "bipComponent": "Prevent",
              "mechanism": "Brief direction",
              "errorType": "missed choice and position",
              "function": "escape"
            }
          },
          "C": {
            "text": "Say, \"No, don't touch that. Get to the rug.\"",
            "score": 0,
            "feedback": "This uses an unpaired no/stop style response and does not provide an alternative action or position.",
            "wizard": "That closes one door without opening the safe one.",
            "next": "w2_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Unpaired no",
              "errorType": "no alternative",
              "function": "escape"
            }
          }
        }
      },
      "w2_supported": {
        "text": "Kai takes the basket and moves toward the rug. The end spot is still partly crowded, and Kai says, \"I want that spot,\" pointing to a seat between two peers.",
        "hint": "Hold the assigned-seating boundary while still offering two safe options.",
        "choices": {
          "A": {
            "text": "Say, \"That spot is not available. You can sit at the end of the row or the side chair.\"",
            "score": 10,
            "feedback": "You maintained the safety boundary and paired it with two manageable choices.",
            "wizard": "Perfect boundary spell: clear limit, safe choices.",
            "next": "w3_supported",
            "meta": {
              "bipComponent": "Prevent",
              "mechanism": "Boundary plus two safe choices",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Say, \"Let's find somewhere else that works.\"",
            "score": 5,
            "feedback": "This stays collaborative, but the available options are not concrete enough.",
            "wizard": "Friendly, but fuzzy. Name the two safe spots.",
            "next": "w3_wobbly",
            "meta": {
              "bipComponent": "Prevent",
              "mechanism": "Collaborative redirection",
              "errorType": "options unclear",
              "function": "escape"
            }
          },
          "C": {
            "text": "Say, \"No. You know you cannot sit there.\"",
            "score": 0,
            "feedback": "This repeats the no pattern without an immediate alternative.",
            "wizard": "The limit may be needed, but the plan says pair it with a choice.",
            "next": "w3_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "No statement",
              "errorType": "choice omitted",
              "function": "escape"
            }
          }
        }
      },
      "w2_wobbly": {
        "text": "Kai starts toward the rug, but then pauses beside the cubbies and picks up a classmate's pencil box.",
        "hint": "Prompt an incompatible action that is useful and observable.",
        "choices": {
          "A": {
            "text": "Say, \"Kai, I need you to put the pencil box on the cubby and carry the attendance folder to the rug.\"",
            "score": 10,
            "feedback": "This gives two observable actions and shifts Kai into a productive class job.",
            "wizard": "Strong recovery. Busy hands can become helping hands.",
            "next": "w3_supported",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Incompatible class job",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Say, \"Please leave other people's things alone.\"",
            "score": 5,
            "feedback": "This identifies the problem but does not provide the next action.",
            "wizard": "Tell Kai what to do, not only what to stop.",
            "next": "w3_wobbly",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Rule reminder",
              "errorType": "no next action",
              "function": "escape"
            }
          },
          "C": {
            "text": "Take the pencil box away and say, \"You are not making good choices today.\"",
            "score": 0,
            "feedback": "This adds criticism without teaching the next response.",
            "wizard": "The object is safe, but the pathway is still missing.",
            "next": "w3_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Critical comment",
              "errorType": "criticism",
              "function": "escape"
            }
          }
        }
      },
      "w2_escalated": {
        "text": "Kai pushes past two students and moves away from the rug area. They say, \"I'm not sitting there.\"",
        "hint": "Use a brief precision request and an action that is incompatible with continuing to move away.",
        "choices": {
          "A": {
            "text": "Move near Kai and say, \"Kai, I need you to carry this folder to the side chair.\"",
            "score": 10,
            "feedback": "This is brief, observable, and gives Kai an incompatible action connected to the safe location.",
            "wizard": "One clear mission objective. Good.",
            "next": "w3_wobbly",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Precision request plus safe location",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Say, \"Come back when you're ready.\"",
            "score": 5,
            "feedback": "This reduces confrontation, but it can allow escape from the transition without practicing the replacement response.",
            "wizard": "Low pressure helps, but do not lose the return path.",
            "next": "w3_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Wait",
              "errorType": "escape allowed without return",
              "function": "escape"
            }
          },
          "C": {
            "text": "Say loudly, \"If you leave again, you will miss the next activity.\"",
            "score": 0,
            "feedback": "A public threat adds pressure and does not use the planned supports.",
            "wizard": "That can turn the transition into a contest. Keep it brief and actionable.",
            "next": "w3_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Public threat",
              "errorType": "power struggle",
              "function": "escape"
            }
          }
        }
      },
      "w3_supported": {
        "text": "Kai reaches the selected seat and puts the class item down. They are standing beside the seat instead of sitting, but their hands are safe.",
        "hint": "Reinforce the successful transition step before asking for the next one.",
        "choices": {
          "A": {
            "text": "Say, \"Nice job getting to your spot and keeping hands safe,\" mark a chart move, then say, \"Sit in your spot.\"",
            "score": 10,
            "feedback": "This reinforces the successful part immediately and then gives the next clear direction.",
            "wizard": "Catch the success first, then build the next step.",
            "next": "w4_supported",
            "meta": {
              "bipComponent": "Reinforce",
              "mechanism": "Specific praise plus chart move",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Say, \"Good. Now sit down.\"",
            "score": 5,
            "feedback": "This gives praise and the next direction, but it misses the planned chart-move reinforcement.",
            "wizard": "Good sequence. Use the reinforcement system too.",
            "next": "w4_wobbly",
            "meta": {
              "bipComponent": "Reinforce",
              "mechanism": "Praise plus direction",
              "errorType": "chart move omitted",
              "function": "escape"
            }
          },
          "C": {
            "text": "Say, \"Finally. Sit down so we can start.\"",
            "score": 0,
            "feedback": "The criticism weakens the reinforcement value of the successful transition.",
            "wizard": "Do not attach a sting to the success.",
            "next": "w4_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Criticism after compliance",
              "errorType": "negative attention",
              "function": "escape"
            }
          }
        }
      },
      "w3_wobbly": {
        "text": "Kai gets close to the safe seating area but begins rocking the chair with one hand while watching the group.",
        "hint": "Give a direction that is incompatible with rocking the chair and reinforce the first response.",
        "choices": {
          "A": {
            "text": "Say, \"Kai, I need both chair legs on the floor and both hands on your lap,\" then praise the first part they do.",
            "score": 10,
            "feedback": "This is specific and incompatible with the unsafe chair movement.",
            "wizard": "Clear body action, quick reinforcement. Strong plan use.",
            "next": "w4_supported",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Incompatible direction",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Say, \"Be safe with the chair.\"",
            "score": 5,
            "feedback": "This names the goal but not the exact behavior Kai should do.",
            "wizard": "Make safety observable.",
            "next": "w4_wobbly",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Safety reminder",
              "errorType": "vague direction",
              "function": "escape"
            }
          },
          "C": {
            "text": "Say, \"Stop rocking that chair right now.\"",
            "score": 0,
            "feedback": "This uses the stop pattern without a replacement action.",
            "wizard": "Swap \"stop\" for a body action Kai can follow.",
            "next": "w4_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Stop statement",
              "errorType": "no replacement action",
              "function": "escape"
            }
          }
        }
      },
      "w3_escalated": {
        "text": "Kai moves toward the classroom doorway while the group settles. They are still inside the classroom but are leaving the expected whole-group area.",
        "hint": "Keep the request brief and create a clear safe destination with a choice or job.",
        "choices": {
          "A": {
            "text": "Say, \"Kai, I need you to bring the pointer to the side chair. You can sit there or at the end of the rug.\"",
            "score": 10,
            "feedback": "This combines an incompatible job, a clear destination, and two safe choices.",
            "wizard": "The path back is concrete and worth taking.",
            "next": "w4_wobbly",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Job plus safe-seat choice",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Stand between Kai and the doorway and say, \"It's time for group.\"",
            "score": 5,
            "feedback": "Proximity may help, but the direction and replacement path are incomplete.",
            "wizard": "Be close, but also give Kai the route.",
            "next": "w4_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Proximity",
              "errorType": "unclear route",
              "function": "escape"
            }
          },
          "C": {
            "text": "Say, \"If you go out that door, you will lose your break.\"",
            "score": 0,
            "feedback": "Threatening an earned or planned break can increase escalation and weakens the replacement system.",
            "wizard": "Do not make the break the battleground.",
            "next": "w4_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Threatened break loss",
              "errorType": "punitive consequence",
              "function": "escape"
            }
          }
        }
      },
      "w4_supported": {
        "text": "Kai is in the safe spot and group begins. After a few minutes, Kai raises a hand and says, \"Can I sit somewhere else?\"",
        "hint": "This is the planned alternative-seating request. Reinforce it and offer an appropriate option.",
        "choices": {
          "A": {
            "text": "Say, \"Great job asking. You can move to the side chair,\" and mark a chart move for the appropriate request.",
            "score": 10,
            "feedback": "This directly reinforces the replacement behavior and honors the appropriate seating request.",
            "wizard": "Replacement skill unlocked. Make it worth using.",
            "next": "w5_supported",
            "meta": {
              "bipComponent": "Reinforce",
              "mechanism": "Alternative-seating request",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Say, \"Yes, you can move,\" and continue teaching.",
            "score": 5,
            "feedback": "Honoring the request is helpful, but the specific reinforcement is missed.",
            "wizard": "The skill worked—celebrate it briefly.",
            "next": "w5_wobbly",
            "meta": {
              "bipComponent": "Reinforce",
              "mechanism": "Request honored",
              "errorType": "reinforcement omitted",
              "function": "escape"
            }
          },
          "C": {
            "text": "Say, \"You already chose your spot. You need to stay there.\"",
            "score": 0,
            "feedback": "This blocks the replacement behavior after Kai used it appropriately.",
            "wizard": "If the request does not work, Kai may stop using it.",
            "next": "w5_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Replacement request denied",
              "errorType": "request blocked",
              "function": "escape"
            }
          }
        }
      },
      "w4_wobbly": {
        "text": "Kai stays in the group area but begins looking away and fidgeting with classroom materials nearby.",
        "hint": "Use a small productive job or participation choice to sustain the routine.",
        "choices": {
          "A": {
            "text": "Offer, \"You can hold the pointer for the next question or pass out the picture cards. Pick one.\"",
            "score": 10,
            "feedback": "This uses two productive choices and a helping role to support participation.",
            "wizard": "Turn fading attention into a meaningful job.",
            "next": "w5_supported",
            "meta": {
              "bipComponent": "Prevent",
              "mechanism": "Productive participation choice",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Quietly remind Kai, \"Keep paying attention.\"",
            "score": 5,
            "feedback": "This is private but not specific enough to create active participation.",
            "wizard": "A reminder is weaker than a job Kai can do.",
            "next": "w5_wobbly",
            "meta": {
              "bipComponent": "Prevent",
              "mechanism": "Attention reminder",
              "errorType": "vague participation",
              "function": "escape"
            }
          },
          "C": {
            "text": "Call on Kai repeatedly until they answer correctly.",
            "score": 0,
            "feedback": "Increasing public demand can add escape pressure during an already difficult routine.",
            "wizard": "More pressure is not the same as more engagement.",
            "next": "w5_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Public demand",
              "errorType": "increased pressure",
              "function": "escape"
            }
          }
        }
      },
      "w4_escalated": {
        "text": "Kai remains near the edge of the group and is still struggling to enter the routine.",
        "hint": "Reset with one clear direction and an achievable role, then reinforce the first success.",
        "choices": {
          "A": {
            "text": "Say, \"Kai, I need you to put these three cards on the board,\" then praise the first card placed.",
            "score": 10,
            "feedback": "This creates a small incompatible class job and a fast success to reinforce.",
            "wizard": "A small useful job can reopen the routine.",
            "next": "w5_wobbly",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Small class job plus reinforcement",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Allow Kai to sit nearby without participating for the rest of group.",
            "score": 5,
            "feedback": "This may reduce escalation, but it does not actively teach re-entry or the replacement behavior.",
            "wizard": "Calm is valuable, but the next skill still needs a doorway.",
            "next": "w5_wobbly",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Reduced demand",
              "errorType": "re-entry not taught",
              "function": "escape"
            }
          },
          "C": {
            "text": "Tell Kai they will complete the group lesson alone later.",
            "score": 0,
            "feedback": "This shifts the interaction toward punishment and may strengthen escape from the group routine.",
            "wizard": "Do not turn escape into a bigger future demand.",
            "next": "w5_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Make-up demand",
              "errorType": "punitive extra work",
              "function": "escape"
            }
          }
        }
      },
      "w5_supported": {
        "text": "Kai participates in the next part of group from the supported seat or class job.",
        "hint": "End by reinforcing the participation and successful use of the plan.",
        "choices": {
          "A": {
            "text": "Give specific praise and mark a chart move for participating appropriately in group.",
            "score": 10,
            "feedback": "This strengthens the exact behavior the plan is designed to build.",
            "wizard": "Quest complete. The successful routine ends with reinforcement.",
            "meta": {
              "bipComponent": "Reinforce",
              "mechanism": "Participation reinforcement",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Smile and give a thumbs up.",
            "score": 5,
            "feedback": "A small reinforcer is helpful, but the chart-move system is missed.",
            "wizard": "Good spark—add the planned reinforcement too.",
            "meta": {
              "bipComponent": "Reinforce",
              "mechanism": "Small reinforcer",
              "errorType": "chart move omitted",
              "function": "escape"
            }
          },
          "C": {
            "text": "Say, \"See how much easier that was when you listened?\"",
            "score": 0,
            "feedback": "This adds a lecture to the success instead of reinforcing it cleanly.",
            "wizard": "Let success be success.",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Lecture after success",
              "errorType": "criticism",
              "function": "escape"
            }
          }
        }
      },
      "w5_wobbly": {
        "text": "Kai makes it through the transition and part of group with some support.",
        "hint": "Reinforce the successful pieces rather than waiting for a perfect routine.",
        "choices": {
          "A": {
            "text": "Mark a chart move for the safe transition or appropriate request and name exactly what Kai did well.",
            "score": 10,
            "feedback": "This reinforces progress and keeps the plan active.",
            "wizard": "Reinforce the piece you want to see again.",
            "meta": {
              "bipComponent": "Reinforce",
              "mechanism": "Progress reinforcement",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Wait until the next transition to see if Kai can repeat it before reinforcing.",
            "score": 5,
            "feedback": "Delayed reinforcement weakens the connection to the successful behavior.",
            "wizard": "Catch it now.",
            "meta": {
              "bipComponent": "Reinforce",
              "mechanism": "Delayed reinforcement",
              "errorType": "delay",
              "function": "escape"
            }
          },
          "C": {
            "text": "Remind Kai how difficult the transition was before giving praise.",
            "score": 0,
            "feedback": "Mixing criticism into reinforcement can reduce its value.",
            "wizard": "Keep the reinforcement clean.",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Criticism mixed with praise",
              "errorType": "mixed message",
              "function": "escape"
            }
          }
        }
      },
      "w5_escalated": {
        "text": "Group time ends with Kai still needing support. The next transition is about to begin.",
        "hint": "Use the next routine as a fresh chance to structure success.",
        "choices": {
          "A": {
            "text": "Assign a clear transition job, offer the planned safe position, and reinforce the first step Kai follows.",
            "score": 10,
            "feedback": "This resets to the plan instead of carrying the escalation forward.",
            "wizard": "New transition, new chance to cast the right spell.",
            "meta": {
              "bipComponent": "Prevent",
              "mechanism": "Structured reset",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Keep Kai beside you and give frequent reminders during the next transition.",
            "score": 5,
            "feedback": "Proximity may help, but a specific job or choice would be stronger.",
            "wizard": "Close support helps; structure it.",
            "meta": {
              "bipComponent": "Prevent",
              "mechanism": "Proximity",
              "errorType": "specific support omitted",
              "function": "escape"
            }
          },
          "C": {
            "text": "Remove Kai from the next preferred classroom role because group was difficult.",
            "score": 0,
            "feedback": "Removing a helpful role takes away a support that can promote successful participation.",
            "wizard": "Do not remove one of the tools that helps Kai succeed.",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Preferred role removed",
              "errorType": "support removed",
              "function": "escape"
            }
          }
        }
      }
    }
  }
]$mrjson$::jsonb,
  $mrjson$[
  {
    "id": "demo2-crisis-delayed-break",
    "title": "The Delayed Break",
    "expectedSteps": 5,
    "start": "c1_start",
    "focus": "Respond to escalation around a delayed break or reinforcer without abandoning the plan.",
    "routine": "earned-break transition",
    "functionPressure": [
      "escape"
    ],
    "bipTargets": [
      "Replacement Request",
      "Precision Request",
      "Incompatible Action",
      "Reinforcement"
    ],
    "steps": {
      "c1_start": {
        "text": "BIP Briefing:\nKai may have difficulty when routines are long, crowded, or when access to a preferred option changes.\nYour job is to choose responses that follow Kai's plan:\n* offer two safe, manageable choices,\n* use a brief, specific direction or an incompatible action,\n* prompt a break, alternate-work, or alternate-seating request,\n* reinforce the first appropriate response right away.\nAvoid unnecessary no/stop statements, public correction, threats, or turning the moment into a power struggle.\n\nScene:\nKai has been working through the afternoon and has earned a planned classroom break. Just as break time begins, another adult asks the class to finish a two-minute clean-up first.\n\nKai looks at the break area, then at the clean-up materials, and says loudly, \"No! I earned my break!\"",
        "hint": "Acknowledge the earned break, keep the delay predictable, and give one clear action or safe choice.",
        "choices": {
          "A": {
            "text": "Say quietly, \"You did earn your break. First put these three bins on the shelf, then your break starts. You can carry the red bins or the blue bins.\"",
            "score": 10,
            "feedback": "This preserves the earned break, gives a tiny clear task, and offers two safe choices.",
            "wizard": "Strong crisis prevention. The break is still real, and the path to it is short and clear.",
            "next": "c2_supported",
            "meta": {
              "bipComponent": "Prevent",
              "mechanism": "Preserve earned break plus choice",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Say, \"I know you're upset. We just need to clean up first.\"",
            "score": 5,
            "feedback": "This acknowledges the frustration, but the amount of work and the return to the earned break are not concrete enough.",
            "wizard": "The tone is good. Make the delay small and visible.",
            "next": "c2_wobbly",
            "meta": {
              "bipComponent": "Prevent",
              "mechanism": "Acknowledgment",
              "errorType": "delay unclear",
              "function": "escape"
            }
          },
          "C": {
            "text": "Say, \"No break until you calm down and help clean.\"",
            "score": 0,
            "feedback": "This changes an earned break into a consequence and uses the no pattern during escalation.",
            "wizard": "The break just became the battleground. Keep earned reinforcement predictable.",
            "next": "c2_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Earned break withheld",
              "errorType": "punitive withholding",
              "function": "escape"
            }
          }
        }
      },
      "c2_supported": {
        "text": "Kai grabs the red bins but puts them down hard. They say, \"I want my break now,\" while looking toward the door.",
        "hint": "Prompt the replacement request and reinforce the first step of following the direction.",
        "choices": {
          "A": {
            "text": "Say, \"You can ask, 'Can I take my break after these bins?' Thank you for picking them up.\"",
            "score": 10,
            "feedback": "This prompts the replacement language and reinforces direction following immediately.",
            "wizard": "Excellent. You are teaching the skill while the break remains available.",
            "next": "c3_supported",
            "meta": {
              "bipComponent": "Teach",
              "mechanism": "Break request plus praise",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Say, \"You're almost there. Just finish.\"",
            "score": 5,
            "feedback": "This is brief and encouraging, but it misses the planned replacement request.",
            "wizard": "Close, but do not skip the skill.",
            "next": "c3_wobbly",
            "meta": {
              "bipComponent": "Teach",
              "mechanism": "Encouragement",
              "errorType": "replacement prompt omitted",
              "function": "escape"
            }
          },
          "C": {
            "text": "Say, \"If you keep arguing, the break gets shorter.\"",
            "score": 0,
            "feedback": "Threatening to reduce the earned break can intensify the power struggle.",
            "wizard": "Do not shrink the reinforcer during the storm.",
            "next": "c3_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Threatened reinforcer loss",
              "errorType": "response cost",
              "function": "escape"
            }
          }
        }
      },
      "c2_wobbly": {
        "text": "Kai begins pushing a chair with one foot and repeats, \"I already earned it.\"",
        "hint": "Use an incompatible, observable direction and reinforce any compliance immediately.",
        "choices": {
          "A": {
            "text": "Say, \"Kai, I need both feet on the floor and both hands on this bin.\"",
            "score": 10,
            "feedback": "This gives an action incompatible with pushing the chair and creates a clear success to reinforce.",
            "wizard": "Good. Make the safe action easier to do than the unsafe one.",
            "next": "c3_supported",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Incompatible direction",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Say, \"Please be safe with the chair.\"",
            "score": 5,
            "feedback": "This names the goal but not the exact action Kai should do.",
            "wizard": "Make safety specific.",
            "next": "c3_wobbly",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Safety reminder",
              "errorType": "vague direction",
              "function": "escape"
            }
          },
          "C": {
            "text": "Say, \"Stop kicking the chair or you lose your break.\"",
            "score": 0,
            "feedback": "This combines the stop pattern with threatened loss of the earned break.",
            "wizard": "That can make escape and escalation more valuable.",
            "next": "c3_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Stop plus threatened loss",
              "errorType": "power struggle",
              "function": "escape"
            }
          }
        }
      },
      "c2_escalated": {
        "text": "Kai pushes the chair farther and knocks a lightweight classroom cart sideways. Several students turn to look. Kai takes two steps toward the classroom doorway.",
        "hint": "Keep the response private and concrete. Use one brief direction or a useful incompatible action.",
        "choices": {
          "A": {
            "text": "Move close and say, \"Kai, I need you to put this folder on the break table.\"",
            "score": 10,
            "feedback": "This gives a simple action toward the safe area and is incompatible with continuing toward the doorway.",
            "wizard": "One clear mission objective. Good crisis responding.",
            "next": "c3_wobbly",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Precision request toward safe area",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Say, \"Come back over here so we can talk.\"",
            "score": 5,
            "feedback": "This is calm, but the action is less specific and may invite a longer verbal interaction.",
            "wizard": "Shorter and more concrete will be stronger.",
            "next": "c3_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "General return request",
              "errorType": "too much verbal processing",
              "function": "escape"
            }
          },
          "C": {
            "text": "Say loudly, \"Everyone move away. Kai is losing control.\"",
            "score": 0,
            "feedback": "Publicly labeling the escalation increases attention and does not teach a replacement response.",
            "wizard": "Keep Kai's correction private whenever safety allows.",
            "next": "c3_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Public callout",
              "errorType": "public attention",
              "function": "escape"
            }
          }
        }
      },
      "c3_supported": {
        "text": "Kai follows the direction and says, \"Can I have my break after this?\" Their voice is still tense, but their body is safer.",
        "hint": "Honor and reinforce the replacement request while keeping the remaining requirement small.",
        "choices": {
          "A": {
            "text": "Say, \"Yes. Great job asking. Put the last bin on the shelf, then your break starts,\" and mark a chart move for following the direction.",
            "score": 10,
            "feedback": "This reinforces the replacement request, preserves the earned break, and strengthens direction following.",
            "wizard": "Perfect. The safer response works and pays off.",
            "next": "c4_supported",
            "meta": {
              "bipComponent": "Reinforce",
              "mechanism": "Request honored plus chart move",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Say, \"Yes, after clean-up,\" and point to the remaining materials.",
            "score": 5,
            "feedback": "The request is honored, but the exact remaining amount and reinforcement are less clear.",
            "wizard": "Good direction. Make the finish line smaller and clearer.",
            "next": "c4_wobbly",
            "meta": {
              "bipComponent": "Reinforce",
              "mechanism": "Request honored",
              "errorType": "finish line vague",
              "function": "escape"
            }
          },
          "C": {
            "text": "Say, \"We'll see. Show me you can handle it first.\"",
            "score": 0,
            "feedback": "This makes access to the earned break uncertain after Kai used the replacement response.",
            "wizard": "Uncertainty can reignite the battle.",
            "next": "c4_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Earned break made uncertain",
              "errorType": "replacement not honored",
              "function": "escape"
            }
          }
        }
      },
      "c3_wobbly": {
        "text": "Kai stops moving toward the doorway but remains tense. They pick up one item from the floor and then pause.",
        "hint": "Reinforce the first safe step immediately instead of waiting for full calm or completion.",
        "choices": {
          "A": {
            "text": "Say, \"Thank you for picking that up and staying in the classroom,\" then mark a chart move.",
            "score": 10,
            "feedback": "This reinforces the first successful behavior even though the situation is not fully resolved.",
            "wizard": "Catch progress, not perfection.",
            "next": "c4_supported",
            "meta": {
              "bipComponent": "Reinforce",
              "mechanism": "Immediate partial-success reinforcement",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Wait silently until Kai finishes picking everything up.",
            "score": 5,
            "feedback": "Reducing language may help, but waiting misses a chance to reinforce the first safe response.",
            "wizard": "Silence can be useful, but reinforce the good move when it appears.",
            "next": "c4_wobbly",
            "meta": {
              "bipComponent": "Reinforce",
              "mechanism": "Wait",
              "errorType": "reinforcement delayed",
              "function": "escape"
            }
          },
          "C": {
            "text": "Say, \"You made this much harder than it needed to be.\"",
            "score": 0,
            "feedback": "Criticism after a safer response can weaken re-entry and increase escalation.",
            "wizard": "Do not punish the recovery.",
            "next": "c4_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Criticism during recovery",
              "errorType": "negative attention",
              "function": "escape"
            }
          }
        }
      },
      "c3_escalated": {
        "text": "Kai remains near the edge of the classroom and is watching the door. Their hands are not on anyone, but they are still highly upset.",
        "hint": "Reduce language, give one safe action, and keep the earned break visible as part of the plan.",
        "choices": {
          "A": {
            "text": "Say, \"Kai, put the folder on the break table. Then sit in the break chair.\"",
            "score": 10,
            "feedback": "This gives a brief two-step action toward the planned safe break routine.",
            "wizard": "Clear, calm, and connected to the plan.",
            "next": "c4_wobbly",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Brief safe-action sequence",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Say, \"Take a minute and calm your body.\"",
            "score": 5,
            "feedback": "This may lower pressure, but the action and destination are not concrete.",
            "wizard": "A pause can help, but the safe destination should be explicit.",
            "next": "c4_wobbly",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Calm prompt",
              "errorType": "destination unclear",
              "function": "escape"
            }
          },
          "C": {
            "text": "Tell Kai the break is cancelled and direct them back to the full class task.",
            "score": 0,
            "feedback": "Cancelling the earned break and restoring the full demand can intensify escape-related escalation.",
            "wizard": "That makes the mountain taller at the worst time.",
            "next": "c4_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Break cancelled and demand increased",
              "errorType": "escalating consequence",
              "function": "escape"
            }
          }
        }
      },
      "c4_supported": {
        "text": "Kai begins the planned break. After several minutes, the break timer is almost finished.",
        "hint": "Prepare the return with two manageable choices or a clear small task.",
        "choices": {
          "A": {
            "text": "Say, \"When the timer ends, you can return to the rug seat or the side chair. Pick one.\"",
            "score": 10,
            "feedback": "This makes the return predictable and gives two safe options.",
            "wizard": "Excellent return spell. Choice keeps the re-entry manageable.",
            "next": "c5_supported",
            "meta": {
              "bipComponent": "Prevent",
              "mechanism": "Return choice",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Say, \"Break is almost done. Get ready to come back.\"",
            "score": 5,
            "feedback": "This prepares Kai, but it does not use the planned choice or define the return location.",
            "wizard": "Helpful warning. Add the two safe destinations.",
            "next": "c5_wobbly",
            "meta": {
              "bipComponent": "Prevent",
              "mechanism": "Transition warning",
              "errorType": "choice omitted",
              "function": "escape"
            }
          },
          "C": {
            "text": "Say, \"Your break is over. No more arguing—back to the group.\"",
            "score": 0,
            "feedback": "This combines a no/stop-style statement with confrontation during re-entry.",
            "wizard": "The return can be calm and structured instead.",
            "next": "c5_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Confrontational return",
              "errorType": "unpaired no",
              "function": "escape"
            }
          }
        }
      },
      "c4_wobbly": {
        "text": "Kai is calmer but still hesitant about returning. They ask, \"Can I sit somewhere else?\"",
        "hint": "This is the planned alternative-seating request. Reinforce it and offer an appropriate location.",
        "choices": {
          "A": {
            "text": "Say, \"Yes. Great job asking. You can use the side chair,\" and mark a chart move for the appropriate request.",
            "score": 10,
            "feedback": "This honors and reinforces the replacement request.",
            "wizard": "The skill appeared—make it work.",
            "next": "c5_supported",
            "meta": {
              "bipComponent": "Reinforce",
              "mechanism": "Alternative-seating request",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Say, \"Yes, you can sit there,\" and continue the transition.",
            "score": 5,
            "feedback": "Honoring the request is helpful, but the specific reinforcement is missed.",
            "wizard": "Good. Add a quick reinforcement to strengthen the skill.",
            "next": "c5_wobbly",
            "meta": {
              "bipComponent": "Reinforce",
              "mechanism": "Request honored",
              "errorType": "reinforcement omitted",
              "function": "escape"
            }
          },
          "C": {
            "text": "Say, \"No, you need to go back to your normal spot today.\"",
            "score": 0,
            "feedback": "This blocks the replacement behavior and returns to the no pattern during re-entry.",
            "wizard": "If the replacement request does not work, it will not compete well with escape.",
            "next": "c5_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Alternative-seating request denied",
              "errorType": "request blocked",
              "function": "escape"
            }
          }
        }
      },
      "c4_escalated": {
        "text": "Kai is not yet ready to rejoin the full routine. The class is moving on, and you need a safe, plan-aligned next step.",
        "hint": "Use a smaller alternative task or location that still teaches an appropriate request and return.",
        "choices": {
          "A": {
            "text": "Offer, \"You can ask for alternate work at the side table or return to the group. Which one?\"",
            "score": 10,
            "feedback": "This uses the planned alternate-work request and provides two manageable paths.",
            "wizard": "Strong reset. Both choices stay inside the plan.",
            "next": "c5_wobbly",
            "meta": {
              "bipComponent": "Teach",
              "mechanism": "Alternate-work choice",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Let Kai stay out of the routine until they independently decide to return.",
            "score": 5,
            "feedback": "This may avoid escalation, but it does not actively teach the replacement response or return path.",
            "wizard": "Calm matters, but the skill still needs practice.",
            "next": "c5_wobbly",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Unstructured pause",
              "errorType": "replacement not taught",
              "function": "escape"
            }
          },
          "C": {
            "text": "Tell Kai they will have to make up the missed routine during a preferred time later.",
            "score": 0,
            "feedback": "This adds a future consequence and may strengthen escape rather than teach re-entry.",
            "wizard": "Do not carry the crisis forward as another demand battle.",
            "next": "c5_escalated",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Make-up consequence",
              "errorType": "future power struggle",
              "function": "escape"
            }
          }
        }
      },
      "c5_supported": {
        "text": "Kai returns using the supported seat or alternate-work option. The crisis has de-escalated and the class routine continues.",
        "hint": "End by reinforcing the safe return and use of the replacement response.",
        "choices": {
          "A": {
            "text": "Give specific praise and a chart move for returning safely and using the appropriate request.",
            "score": 10,
            "feedback": "This reinforces the exact recovery skills the plan is designed to build.",
            "wizard": "Quest complete. Safe return becomes the behavior worth repeating.",
            "meta": {
              "bipComponent": "Reinforce",
              "mechanism": "Safe-return reinforcement",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Say, \"Thank you,\" and move on.",
            "score": 5,
            "feedback": "Brief praise is helpful, but it misses the planned chart-move reinforcement.",
            "wizard": "Good spark—use the full reinforcement system.",
            "meta": {
              "bipComponent": "Reinforce",
              "mechanism": "Brief praise",
              "errorType": "chart move omitted",
              "function": "escape"
            }
          },
          "C": {
            "text": "Say, \"Next time, don't make such a big deal about your break.\"",
            "score": 0,
            "feedback": "This adds criticism after recovery and may weaken future help-seeking.",
            "wizard": "Do not attach a lecture to the recovery.",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Criticism after recovery",
              "errorType": "negative attention",
              "function": "escape"
            }
          }
        }
      },
      "c5_wobbly": {
        "text": "Kai re-enters the routine with support, though the return is not completely smooth.",
        "hint": "Reinforce the successful piece now rather than waiting for perfect behavior.",
        "choices": {
          "A": {
            "text": "Mark a chart move for the safe return or appropriate request and give specific praise for that behavior.",
            "score": 10,
            "feedback": "This follows the plan by reinforcing meaningful progress immediately.",
            "wizard": "Recovery does not have to be perfect to be reinforced.",
            "meta": {
              "bipComponent": "Reinforce",
              "mechanism": "Recovery reinforcement",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Wait until the end of the activity to decide whether the return deserves reinforcement.",
            "score": 5,
            "feedback": "Delaying reinforcement weakens its connection to the successful return.",
            "wizard": "Catch the recovery while it is happening.",
            "meta": {
              "bipComponent": "Reinforce",
              "mechanism": "Delayed reinforcement",
              "errorType": "delay",
              "function": "escape"
            }
          },
          "C": {
            "text": "Withhold the chart move because the earlier crisis was too significant.",
            "score": 0,
            "feedback": "The plan awards reinforcement for successful behavior; earlier escalation should not erase a later earned success.",
            "wizard": "Do not make the recovery impossible to earn.",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Earned reinforcement withheld",
              "errorType": "response cost",
              "function": "escape"
            }
          }
        }
      },
      "c5_escalated": {
        "text": "Kai still needs substantial support as the class moves into the next routine.",
        "hint": "Reset to a clear choice, productive role, or replacement request rather than escalating consequences.",
        "choices": {
          "A": {
            "text": "Offer one small class job or alternate-work choice, prompt the appropriate request, and reinforce the first safe response.",
            "score": 10,
            "feedback": "This returns to the plan and creates a new opportunity for success.",
            "wizard": "Strong reset. The next routine can start with the right pathway.",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Structured reset",
              "errorType": "none",
              "function": "escape"
            }
          },
          "B": {
            "text": "Keep Kai near an adult and reduce the task while waiting for a calmer moment.",
            "score": 5,
            "feedback": "Reduced demand and proximity may help, but the replacement response still needs to be prompted and reinforced.",
            "wizard": "Stabilize first, then teach the next move.",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Reduced demand and proximity",
              "errorType": "replacement omitted",
              "function": "escape"
            }
          },
          "C": {
            "text": "Remove all preferred jobs and breaks for the rest of the afternoon.",
            "score": 0,
            "feedback": "Removing supports and reinforcers can increase escape pressure and takes away tools used to build appropriate behavior.",
            "wizard": "Do not remove the tools that help Kai succeed.",
            "meta": {
              "bipComponent": "Respond",
              "mechanism": "Global loss of supports",
              "errorType": "punitive consequence",
              "function": "escape"
            }
          }
        }
      }
    }
  }
]$mrjson$::jsonb,
  1,
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
  updated_at = now();

-- Verification: expect 1 Daily, 1 Mystery, 1 Crisis mission.
select
  c.case_code,
  cgc.config->>'studentAlias' as student_alias,
  cgc.config->>'contentSource' as content_source,
  jsonb_array_length(cgc.daily_missions) as daily_count,
  jsonb_array_length(cgc.wildcard_missions) as mystery_count,
  jsonb_array_length(cgc.crisis_missions) as crisis_count,
  cgc.version
from public.case_game_content cgc
join public.cases c on c.id = cgc.case_id
where c.case_code = 'CASE-DEMO-2';
