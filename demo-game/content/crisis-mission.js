/* Fictional public-demo mission; no participant content. */
(function registerCrisisDemoMission() {
  if (typeof POOL === "undefined") throw new Error("POOL must be loaded before this mission");
  POOL.crisis = POOL.crisis || [];
  POOL.crisis.push({
  "id": "crisis-writing-meltdown-beta",
  "title": "The Writing Meltdown",
  "routine": "independent writing during high-intensity refusal",
  "focus": "Respond calmly after refusal starts; make help or a brief break effective and support an achievable return.",
  "expectedSteps": 5,
  "start": "crisis_step1_start",
  "functionPressure": [
    "escape"
  ],
  "bipTargets": [
    "Help",
    "Break",
    "Small Step",
    "Calm Return"
  ],
  "authoringMeta": {
    "sourceStatus": "fictional_public_demo",
    "qualityReview": {
      "behavioral": false,
      "gameDesign": false
    },
    "draftLabel": "2026-10-18 public demo candidate; not published"
  },
  "endings": {
    "STRONG": {
      "summary": "Jordan began to return to writing through a small step and useful support. The earlier refusal is not erased.",
      "text": "You kept the exchange private and offered the writing plan’s support options during an already difficult moment. Jordan has requested help, taken a brief break, or begun a small supported writing step. The worksheet disruption still needs ordinary classroom follow-through; progress does not require a finished sentence.",
      "wizard": "You made room for recovery without forcing a perfect finish."
    },
    "MIXED": {
      "summary": "The confrontation has eased, but Jordan needs clearer follow-through before writing can resume reliably.",
      "text": "Some choices lowered pressure and made help or a break possible, but an important prompt or follow-through was late or incomplete. Jordan may be closer to the table without having written yet. The planned support still needs to be made effective.",
      "wizard": "A pause in the storm can be the start of the next move."
    },
    "FRAGILE": {
      "summary": "Jordan is still avoiding most of the task. A private help-or-break pathway remains the next opportunity.",
      "text": "The writing refusal continued or the support pathway was delayed. The classroom can continue responding calmly and maintain access to its existing fictional support plan. The purpose is to rehearse decisions, not to predict what a real student would do.",
      "wizard": "Next time, protect the first way back."
    }
  },
  "steps": {
    "crisis_step1_start": {
      "text": "Writing has just begun. Jordan pushes the worksheet off the desk and shouts, “I’m not doing it!” A pencil drops to the floor, and students at the next table stop working. You are supervising the class. Jordan is still at the desk, looking toward the reading corner. What do you do first?",
      "hint": "Refusal has started. Lower public attention and offer the planned help/break options without requiring instant work.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support"
      },
      "choices": {
        "A": {
          "text": "Move closer without an audience and quietly offer help or a short break, followed by one manageable writing step.",
          "score": 10,
          "consequence": "Jordan lowers their voice and asks, “Can I take a break?” The worksheet remains on the floor; writing has not resumed.",
          "feedback": "You stayed private and used the planned support instead of arguing about the refusal.",
          "wizard": "Steady voice. Clear route.",
          "next": "crisis_step2_supported",
          "ending": null,
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "private_help_break",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "Say calmly, “Take a minute to settle. We can talk about writing when you’re ready.”",
          "score": 5,
          "consequence": "Jordan goes quiet with their head down, but no help or break communication has been established.",
          "feedback": "The calmer tone is useful; the planned replacement response and return are missing.",
          "wizard": "Calmer, but still stuck.",
          "next": "crisis_step2_wobbly",
          "ending": null,
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "calm_pause",
            "function": "escape",
            "errorType": "partial_implementation"
          }
        },
        "C": {
          "text": "Remind Jordan loudly that the class is waiting and the sentence must be finished before the next activity.",
          "score": 0,
          "consequence": "Jordan shouts again and moves farther from the worksheet as students watch.",
          "feedback": "The public demand raises pressure and does not teach the alternative response.",
          "wizard": "The spotlight is growing.",
          "next": "crisis_step2_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "public_pressure",
            "function": "escape",
            "errorType": "plan_drift"
          }
        }
      }
    },
    "crisis_step2_supported": {
      "text": "Jordan is still upset, but the voice has lowered. The worksheet remains on the floor. Jordan says, “Can I have a break?” The request is already there; your next move determines whether it works.",
      "hint": "Jordan has already asked for a break. Honor it promptly rather than adding a lecture.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support"
      },
      "choices": {
        "A": {
          "text": "Honor the break Jordan already requested, briefly acknowledge the request, and give a simple one-word return plan.",
          "score": 10,
          "consequence": "Jordan accepts the brief break and later looks toward the writing table; the worksheet is still off the desk.",
          "feedback": "The request already occurred, so reinforcing and honoring it is the plan-aligned action.",
          "wizard": "The request worked. Good.",
          "next": "crisis_step3_supported",
          "ending": null,
          "meta": {
            "bipComponent": "Reinforce",
            "mechanism": "honor_break",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "Tell Jordan the break is available after explaining why the earlier shouting was a problem.",
          "score": 5,
          "consequence": "Jordan stays seated but hesitates to move; the requested break is delayed by a lengthy conversation.",
          "feedback": "The consequence discussion delays reinforcement of the appropriate request.",
          "wizard": "The lesson can wait.",
          "next": "crisis_step3_wobbly",
          "ending": null,
          "meta": {
            "bipComponent": "Reinforce",
            "mechanism": "delayed_break",
            "function": "escape",
            "errorType": "timing_or_delay"
          }
        },
        "C": {
          "text": "Say the break cannot happen now because Jordan shouted before asking for it.",
          "score": 0,
          "consequence": "Jordan turns away from you and the writing table; the request did not produce its promised support.",
          "feedback": "Denying the current appropriate request can make that communication less useful.",
          "wizard": "The door closed on a good ask.",
          "next": "crisis_step3_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Reinforce",
            "mechanism": "deny_break",
            "function": "escape",
            "errorType": "plan_drift"
          }
        }
      }
    },
    "crisis_step2_wobbly": {
      "text": "Jordan has stopped shouting and has their head down. The worksheet is still on the floor. Other students are returning to work, but Jordan has not requested help or a break.",
      "hint": "Jordan is quiet, but has not asked for a break. Model a usable request rather than demanding readiness.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support"
      },
      "choices": {
        "A": {
          "text": "Quietly say, “If you need a break, you can ask for one. Then we can try one word together.”",
          "score": 10,
          "consequence": "Jordan raises their head and says, “Can I have a short break?” The worksheet stays on the floor.",
          "feedback": "The modeled request produced actual communication and allows a timely follow-through.",
          "wizard": "There it is—the request we can answer.",
          "next": "crisis_step3_supported",
          "ending": null,
          "meta": {
            "bipComponent": "Teach",
            "mechanism": "prompt_request",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "Allow a little more quiet time before naming what support Jordan can request.",
          "score": 5,
          "consequence": "Jordan remains quiet with their head down while the writing task waits.",
          "feedback": "A pause can lower pressure, but it misses the chance to make communication useful.",
          "wizard": "Space alone is not the skill.",
          "next": "crisis_step3_wobbly",
          "ending": null,
          "meta": {
            "bipComponent": "Teach",
            "mechanism": "pause_without_prompt",
            "function": "escape",
            "errorType": "partial_implementation"
          }
        },
        "C": {
          "text": "Ask Jordan to sit up and show readiness before you can offer help or a break.",
          "score": 0,
          "consequence": "Jordan turns away again; access to support now depends on an extra prerequisite.",
          "feedback": "Requiring compliance first blocks the functional alternative to refusal.",
          "wizard": "Another hurdle appeared.",
          "next": "crisis_step3_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Teach",
            "mechanism": "extra_prerequisite",
            "function": "escape",
            "errorType": "plan_drift"
          }
        }
      }
    },
    "crisis_step2_escalated": {
      "text": "Jordan stays away from the worksheet and raises their voice again. Two students turn around. The work has not resumed, and you still need to keep the response private and manageable.",
      "hint": "The situation is still public. Keep a calm, private pathway available and classmates engaged.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support"
      },
      "choices": {
        "A": {
          "text": "In a low voice, say, “You can ask for a short break or help with one word.” Keep the class working.",
          "score": 10,
          "consequence": "Jordan stops shouting for a moment and turns toward you; there is no request yet.",
          "feedback": "You reduced the audience and offered a functional alternative. The escalation is not instantly resolved.",
          "wizard": "A pause in the storm—not the ending.",
          "next": "crisis_step3_wobbly",
          "ending": null,
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "calm_support",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "Let Jordan avoid writing for the rest of this period without discussing a help or break option.",
          "score": 5,
          "consequence": "The noise drops, but Jordan stays away from writing and has not used the replacement response.",
          "feedback": "The immediate quiet does not establish the plan-aligned communication or a supported return.",
          "wizard": "Quiet is only part of the goal.",
          "next": "crisis_step3_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "drop_task",
            "function": "escape",
            "errorType": "partial_implementation"
          }
        },
        "C": {
          "text": "Explain to Jordan in front of classmates why the shouting was unacceptable before offering help.",
          "score": 0,
          "consequence": "The exchange stays public and Jordan moves farther from the writing task.",
          "feedback": "A public explanation raises attention and delays the planned support.",
          "wizard": "Wrong moment for a lecture.",
          "next": "crisis_step3_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "public_lecture",
            "function": "escape",
            "errorType": "plan_drift"
          }
        }
      }
    },
    "crisis_step3_supported": {
      "text": "Jordan has asked for a short break. The worksheet remains on the floor where it was pushed earlier. The class is beginning to settle back into writing. Jordan waits for your answer. The break request needs to work before you ask for another writing response.",
      "hint": "This is an actual break request. Honor it; do not add a compliance condition first.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support"
      },
      "choices": {
        "A": {
          "text": "“Yes, take the short break you asked for. Thanks for telling me. We can try one word together afterward.”",
          "score": 10,
          "consequence": "Jordan takes the short break, then looks back toward the writing table. The worksheet remains on the floor.",
          "feedback": "The action makes the available support meaningful without adding an unrelated demand.",
          "wizard": "A useful option is taking shape.",
          "next": "crisis_step4_supported",
          "ending": null,
          "meta": {
            "bipComponent": "Teach",
            "mechanism": "honor_signal",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "“You’re doing better now. Stay quiet for a moment, and we’ll decide what to do.”",
          "score": 5,
          "consequence": "Jordan remains by the writing area but does not begin a request or a small task step.",
          "feedback": "Calm reassurance does not fully activate the planned communication or return step.",
          "wizard": "The pause helps; the path is still missing.",
          "next": "crisis_step4_wobbly",
          "ending": null,
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "reassurance_only",
            "function": "escape",
            "errorType": "partial_implementation"
          }
        },
        "C": {
          "text": "“First pick up the worksheet and finish your sentence, then we can talk about a break.”",
          "score": 0,
          "consequence": "Jordan turns away again and leaves the worksheet where it fell.",
          "feedback": "This makes a difficult assignment a prerequisite to requesting the planned support.",
          "wizard": "The work became the price of asking.",
          "next": "crisis_step4_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "stacked_demands",
            "function": "escape",
            "errorType": "plan_drift"
          }
        }
      }
    },
    "crisis_step3_wobbly": {
      "text": "Jordan is quieter and looking toward you, but no break has been requested yet. The worksheet remains on the floor. The class is beginning to refocus; Jordan needs a clear way to ask for support without a public exchange.",
      "hint": "No completed request yet: briefly model the help/break words and accept a real response.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support"
      },
      "choices": {
        "A": {
          "text": "Quietly model “Can I have help or a short break?” and give Jordan time to choose.",
          "score": 10,
          "consequence": "Jordan lifts their head and says, “Can you help me with one word?” The worksheet is still on the floor.",
          "feedback": "The action makes the available support meaningful without adding an unrelated demand.",
          "wizard": "A useful option is taking shape.",
          "next": "crisis_step4_supported",
          "ending": null,
          "meta": {
            "bipComponent": "Teach",
            "mechanism": "honor_signal",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "“You’re doing better now. Stay quiet for a moment, and we’ll decide what to do.”",
          "score": 5,
          "consequence": "Jordan remains by the writing area but does not begin a request or a small task step.",
          "feedback": "Calm reassurance does not fully activate the planned communication or return step.",
          "wizard": "The pause helps; the path is still missing.",
          "next": "crisis_step4_wobbly",
          "ending": null,
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "reassurance_only",
            "function": "escape",
            "errorType": "partial_implementation"
          }
        },
        "C": {
          "text": "“First pick up the worksheet and finish your sentence, then we can talk about a break.”",
          "score": 0,
          "consequence": "Jordan turns away again and leaves the worksheet where it fell.",
          "feedback": "This makes a difficult assignment a prerequisite to requesting the planned support.",
          "wizard": "The work became the price of asking.",
          "next": "crisis_step4_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "stacked_demands",
            "function": "escape",
            "errorType": "plan_drift"
          }
        }
      }
    },
    "crisis_step3_escalated": {
      "text": "Jordan is still turned away from writing, and nearby students have noticed the disruption. The worksheet remains on the floor. There is no clear request to respond to yet. Keep the class engaged while you offer a calm route toward support.",
      "hint": "Safety and calm supervision remain important. A correct choice may only begin recovery.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support"
      },
      "choices": {
        "A": {
          "text": "Stay nearby and quietly say, “Help or a short break is available. You can tell me which.”",
          "score": 10,
          "consequence": "Jordan stops calling out and glances toward the desk; there is no request yet.",
          "feedback": "The action makes the available support meaningful without adding an unrelated demand.",
          "wizard": "A useful option is taking shape.",
          "next": "crisis_step4_wobbly",
          "ending": null,
          "meta": {
            "bipComponent": "Teach",
            "mechanism": "honor_signal",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "“You’re doing better now. Stay quiet for a moment, and we’ll decide what to do.”",
          "score": 5,
          "consequence": "Jordan remains by the writing area but does not begin a request or a small task step.",
          "feedback": "Calm reassurance does not fully activate the planned communication or return step.",
          "wizard": "The pause helps; the path is still missing.",
          "next": "crisis_step4_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "reassurance_only",
            "function": "escape",
            "errorType": "partial_implementation"
          }
        },
        "C": {
          "text": "“First pick up the worksheet and finish your sentence, then we can talk about a break.”",
          "score": 0,
          "consequence": "Jordan turns away again and leaves the worksheet where it fell.",
          "feedback": "This makes a difficult assignment a prerequisite to requesting the planned support.",
          "wizard": "The work became the price of asking.",
          "next": "crisis_step4_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "stacked_demands",
            "function": "escape",
            "errorType": "plan_drift"
          }
        }
      }
    },
    "crisis_step4_supported": {
      "text": "Jordan is near the writing table. Either a requested break has ended or Jordan has just asked for help with one word; in both cases, Jordan now says, “Could you help me start?” The worksheet is still on the floor. There is an opening for a very small return without turning cleanup into a prerequisite.",
      "hint": "Jordan has asked for one-word help. Respond to that request before adding more work.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support"
      },
      "choices": {
        "A": {
          "text": "“Yes. Let’s get the page within reach, and I’ll help you start with one word.”",
          "score": 10,
          "consequence": "Jordan picks up the pencil and makes the first letter on the page.",
          "feedback": "This meets the actual communication and makes the return manageable instead of demanding full completion.",
          "wizard": "One real step is enough to begin.",
          "next": "crisis_step5_supported",
          "ending": null,
          "meta": {
            "bipComponent": "Reinforce",
            "mechanism": "reinforce_reentry",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "“Good job calming down. I’ll come back after I check on the rest of the class.”",
          "score": 5,
          "consequence": "Jordan stays nearby but does not start a word. The request or support option has not been followed through.",
          "feedback": "Praise for calm alone misses the specific help and small-step practice needed now.",
          "wizard": "The door opened; support did not quite follow.",
          "next": "crisis_step5_wobbly",
          "ending": null,
          "meta": {
            "bipComponent": "Reinforce",
            "mechanism": "praise_without_step",
            "function": "escape",
            "errorType": "missed_reinforcement_opportunity"
          }
        },
        "C": {
          "text": "“You need to complete the sentence by yourself now that you’ve calmed down.”",
          "score": 0,
          "consequence": "Jordan backs away from the writing area again. The worksheet stays on the floor.",
          "feedback": "The sudden increase in task demand competes with the planned small supported return.",
          "wizard": "The next step became the whole staircase.",
          "next": "crisis_step5_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "expand_demand",
            "function": "escape",
            "errorType": "plan_drift"
          }
        }
      }
    },
    "crisis_step4_wobbly": {
      "text": "Jordan is near the writing area but has not started writing. The worksheet remains on the floor. The class is returning to its work, and Jordan looks at you without making a clear request. There is less shouting, but a useful help-or-break route has not yet been established.",
      "hint": "A help request has occurred. Respond to it now; a small first attempt is enough.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support"
      },
      "choices": {
        "A": {
          "text": "Quietly offer, “I can help you start one word. If you need a short break first, tell me.”",
          "score": 10,
          "consequence": "Jordan says, “Help with one word,” and moves toward the page. You offer the first sound; Jordan starts a letter.",
          "feedback": "This meets the actual communication and makes the return manageable instead of demanding full completion.",
          "wizard": "One real step is enough to begin.",
          "next": "crisis_step5_supported",
          "ending": null,
          "meta": {
            "bipComponent": "Reinforce",
            "mechanism": "reinforce_reentry",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "“You’re calmer now. I’ll check on the other students first, then we can work out what comes next.”",
          "score": 5,
          "consequence": "Jordan stays nearby but does not start a word. The request or support option has not been followed through.",
          "feedback": "Praise for calm alone misses the specific help and small-step practice needed now.",
          "wizard": "The door opened; support did not quite follow.",
          "next": "crisis_step5_wobbly",
          "ending": null,
          "meta": {
            "bipComponent": "Reinforce",
            "mechanism": "praise_without_step",
            "function": "escape",
            "errorType": "missed_reinforcement_opportunity"
          }
        },
        "C": {
          "text": "“Now that it’s quieter, I need you to finish the sentence on your own before I can help.”",
          "score": 0,
          "consequence": "Jordan backs away from the writing area again. The worksheet stays on the floor.",
          "feedback": "The sudden increase in task demand competes with the planned small supported return.",
          "wizard": "The next step became the whole staircase.",
          "next": "crisis_step5_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "expand_demand",
            "function": "escape",
            "errorType": "plan_drift"
          }
        }
      }
    },
    "crisis_step4_escalated": {
      "text": "Jordan is still away from the writing table. The worksheet remains on the floor, and the other students are beginning to work again. Jordan glances at you but has not asked for help. The room needs a low-key next step.",
      "hint": "There is no request to honor yet. Offer one practical way to ask for help or a break.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support"
      },
      "choices": {
        "A": {
          "text": "Quietly say, “You can ask me for help with one word, or take a short break first.”",
          "score": 10,
          "consequence": "Jordan moves closer to the table. The worksheet is still on the floor.",
          "feedback": "This meets the actual communication and makes the return manageable instead of demanding full completion.",
          "wizard": "One real step is enough to begin.",
          "next": "crisis_step5_wobbly",
          "ending": null,
          "meta": {
            "bipComponent": "Reinforce",
            "mechanism": "reinforce_reentry",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "“Good job calming down. I’ll come back after I check on the rest of the class.”",
          "score": 5,
          "consequence": "Jordan stays nearby but does not start a word. The request or support option has not been followed through.",
          "feedback": "Praise for calm alone misses the specific help and small-step practice needed now.",
          "wizard": "The door opened; support did not quite follow.",
          "next": "crisis_step5_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Reinforce",
            "mechanism": "praise_without_step",
            "function": "escape",
            "errorType": "missed_reinforcement_opportunity"
          }
        },
        "C": {
          "text": "“You need to complete the sentence by yourself now that you’ve calmed down.”",
          "score": 0,
          "consequence": "Jordan backs away from the writing area again. The worksheet stays on the floor.",
          "feedback": "The sudden increase in task demand competes with the planned small supported return.",
          "wizard": "The next step became the whole staircase.",
          "next": "crisis_step5_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "expand_demand",
            "function": "escape",
            "errorType": "plan_drift"
          }
        }
      }
    },
    "crisis_step5_supported": {
      "text": "Jordan has begun a first letter with your help. The worksheet has been brought within reach, and the sentence is still unfinished. Jordan asks, “Can you help me with the rest of this word?” The previous disruption has not been erased, but an appropriate request and a writing attempt are happening now.",
      "hint": "Recognize the first effort and respond to the help request without demanding a whole sentence.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support"
      },
      "choices": {
        "A": {
          "text": "“Yes. You started the word. I’ll help with the next sound, one at a time.”",
          "score": 10,
          "consequence": "Jordan adds another letter with your help; the sentence is not complete.",
          "feedback": "The response reinforces the actual step and keeps help or a short break accessible.",
          "wizard": "A small return, without a magic reset.",
          "next": null,
          "ending": "STRONG",
          "meta": {
            "bipComponent": "Reinforce",
            "mechanism": "supported_return",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "“I’m glad it’s quieter. Put the materials aside and we’ll figure out the writing later.”",
          "score": 5,
          "consequence": "Jordan becomes quieter but does not practice the next writing or communication step.",
          "feedback": "Reducing public disruption helps, but an important teaching opportunity remains incomplete.",
          "wizard": "The room settles; the skill still needs a turn.",
          "next": null,
          "ending": "MIXED",
          "meta": {
            "bipComponent": "Reinforce",
            "mechanism": "delayed_help",
            "function": "escape",
            "errorType": "timing_or_delay"
          }
        },
        "C": {
          "text": "“Because writing took so long, you’ll need to finish everything before the next activity.”",
          "score": 0,
          "consequence": "Jordan puts the pencil down after the request is refused. The first letter remains, but writing stalls again.",
          "feedback": "Adding a larger demand during recovery is not a plan-aligned replacement-skill response.",
          "wizard": "More pressure is not the missing ingredient.",
          "next": null,
          "ending": "FRAGILE",
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "penalty",
            "function": "escape",
            "errorType": "plan_drift"
          }
        }
      }
    },
    "crisis_step5_wobbly": {
      "text": "Jordan is closer to the writing table, but writing has not started. The worksheet is still on the floor or just being brought within reach. The next activity is approaching. Jordan looks at you and says, “Just one word?” There is a small opening, but not yet a completed writing attempt.",
      "hint": "Jordan is signaling readiness. Make the first attempt feasible without pretending the disruption is over.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support"
      },
      "choices": {
        "A": {
          "text": "“Yes, one word to start. I’ll help you bring the paper close and say the first sound.”",
          "score": 10,
          "consequence": "Jordan draws the page close and touches pencil to paper. The first word has not been completed.",
          "feedback": "The response reinforces the actual step and keeps help or a short break accessible.",
          "wizard": "A small return, without a magic reset.",
          "next": null,
          "ending": "STRONG",
          "meta": {
            "bipComponent": "Reinforce",
            "mechanism": "supported_return",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "“I’m glad it’s quieter. Put the materials aside and we’ll figure out the writing later.”",
          "score": 5,
          "consequence": "Jordan becomes quieter but does not practice the next writing or communication step.",
          "feedback": "Reducing public disruption helps, but an important teaching opportunity remains incomplete.",
          "wizard": "The room settles; the skill still needs a turn.",
          "next": null,
          "ending": "MIXED",
          "meta": {
            "bipComponent": "Reinforce",
            "mechanism": "delayed_help",
            "function": "escape",
            "errorType": "timing_or_delay"
          }
        },
        "C": {
          "text": "“Because writing took so long, you’ll need to finish everything before the next activity.”",
          "score": 0,
          "consequence": "Jordan turns farther away from the writing materials as the class changes activities.",
          "feedback": "Adding a larger demand during recovery is not a plan-aligned replacement-skill response.",
          "wizard": "More pressure is not the missing ingredient.",
          "next": null,
          "ending": "FRAGILE",
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "penalty",
            "function": "escape",
            "errorType": "plan_drift"
          }
        }
      }
    },
    "crisis_step5_escalated": {
      "text": "Jordan is still avoiding writing as the class nears its next activity. The worksheet remains on the floor, and there is no completed help or break request. The teacher still needs to supervise the class. The final choice can preserve a private, manageable pathway back without pretending the crisis has already ended.",
      "hint": "Offer a brief, doable support route and avoid a punitive response to the earlier refusal.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support"
      },
      "choices": {
        "A": {
          "text": "Quietly say, “You can ask for help or a short break. We can try just one word when you’re ready.”",
          "score": 10,
          "consequence": "Jordan stops calling out and looks toward you. The worksheet remains on the floor, and writing has not restarted.",
          "feedback": "The response reinforces the actual step and keeps help or a short break accessible.",
          "wizard": "A small return, without a magic reset.",
          "next": null,
          "ending": "MIXED",
          "meta": {
            "bipComponent": "Reinforce",
            "mechanism": "supported_return",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "“I’m glad it’s quieter. Put the materials aside and we’ll figure out the writing later.”",
          "score": 5,
          "consequence": "Jordan becomes quieter but does not practice the next writing or communication step.",
          "feedback": "Reducing public disruption helps, but an important teaching opportunity remains incomplete.",
          "wizard": "The room settles; the skill still needs a turn.",
          "next": null,
          "ending": "FRAGILE",
          "meta": {
            "bipComponent": "Reinforce",
            "mechanism": "delayed_help",
            "function": "escape",
            "errorType": "timing_or_delay"
          }
        },
        "C": {
          "text": "“Because writing took so long, you’ll need to finish everything before the next activity.”",
          "score": 0,
          "consequence": "Jordan turns farther away from the writing materials as the class changes activities.",
          "feedback": "Adding a larger demand during recovery is not a plan-aligned replacement-skill response.",
          "wizard": "More pressure is not the missing ingredient.",
          "next": null,
          "ending": "FRAGILE",
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "penalty",
            "function": "escape",
            "errorType": "plan_drift"
          }
        }
      }
    }
  }
});
})();