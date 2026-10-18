/* Fictional public-demo mission; no participant content. */
(function registerMysteryDemoMission() {
  if (typeof POOL === "undefined") throw new Error("POOL must be loaded before this mission");
  POOL.wild = POOL.wild || [];
  POOL.wild.push({
  "id": "mystery-schedule-switch-beta",
  "title": "The Schedule Switch",
  "routine": "writing after an unexpected schedule change",
  "focus": "Use Jordan’s familiar writing supports when the schedule changes and the sentence starter cannot be found.",
  "expectedSteps": 5,
  "start": "mystery_step1_start",
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
      "summary": "Jordan used a manageable first writing step and got useful help despite the schedule change. The sentence is still in progress.",
      "text": "The schedule changed and the usual card was missing, but you provided a practical replacement for the starter, kept the first step small, and responded when Jordan needed help. Jordan has begun writing or using an effective support route. The rest of the assignment can follow in small steps.",
      "wizard": "The schedule changed. The plan still gave you a way through."
    },
    "MIXED": {
      "summary": "Some support helped Jordan approach writing, but a missed or delayed step left the return uncertain.",
      "text": "Some support reduced uncertainty during the unexpected routine. Jordan has not yet established a steady writing step, or the response was delayed. The next opportunity is to restore the starter, answer communication promptly, and reinforce a manageable return.",
      "wizard": "A useful clue appeared. Keep the next step small."
    },
    "FRAGILE": {
      "summary": "Jordan is still disconnected from much of the writing task. The teacher can revisit the small-step and help-request plan.",
      "text": "The changed schedule and missing support continued to get in the way. A help request may have been delayed or the writing demand enlarged before Jordan could start. The classroom can return to the same fictional plan next time without turning the disruption into a confrontation.",
      "wizard": "The next try starts with one workable step."
    }
  },
  "steps": {
    "mystery_step1_start": {
      "text": "The assembly ran late, so writing has moved to just after lunch. While the class puts lunch boxes away, Jordan stops at the writing folder. “I thought writing was tomorrow.” The usual sentence-starter card is missing from the desk, and another student needs your help. What do you do first?",
      "hint": "Jordan did not expect writing now. Give a brief explanation and a manageable first move; the usual starter is missing.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support"
      },
      "choices": {
        "A": {
          "text": "“Writing moved after lunch. Let’s pick one animal first; I’ll write our usual starter on your page.”",
          "score": 10,
          "consequence": "Jordan opens the folder and asks, “Can you write the starter? My card isn’t here.”",
          "feedback": "A short explanation and one small first step make the change manageable; Jordan has asked for a specific support.",
          "wizard": "A surprise schedule, but a familiar way in.",
          "next": "mystery_step2_supported",
          "ending": null,
          "meta": {
            "bipComponent": "Prevent",
            "mechanism": "restore_starter",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "“I know this is different. Put your folder out, and I’ll help after I settle this table.”",
          "score": 5,
          "consequence": "Jordan puts the folder on the desk but leaves it closed. “What am I supposed to write?”",
          "feedback": "The reassurance is kind, but Jordan still needs an accessible first step now.",
          "wizard": "The schedule makes sense. The first step doesn’t—yet.",
          "next": "mystery_step2_wobbly",
          "ending": null,
          "meta": {
            "bipComponent": "Prevent",
            "mechanism": "delayed_support",
            "function": "escape",
            "errorType": "timing_or_delay"
          }
        },
        "C": {
          "text": "“Look at the schedule on the board. Get your writing out while I finish helping everyone else.”",
          "score": 0,
          "consequence": "Jordan slides the folder away and says, “We already did schoolwork.” Two students look over.",
          "feedback": "Repeating the schedule does not restore Jordan’s missing support or reduce the task.",
          "wizard": "The schedule is posted; the problem is still here.",
          "next": "mystery_step2_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Prevent",
            "mechanism": "schedule_only",
            "function": "escape",
            "errorType": "missed_prevention_opportunity"
          }
        }
      }
    },
    "mystery_step2_supported": {
      "text": "Jordan opens the folder, then taps the empty corner of the desk. “Can you write my starter? My card isn’t here.” Across the room, a student has just spilled a lunch container. The other table needs attention, but Jordan has already asked for the help that would make writing possible.",
      "hint": "Jordan already made an appropriate request. What makes that request work right now?",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support"
      },
      "choices": {
        "A": {
          "text": "“Yes.” Write “My animal is…” on the page, then help Jordan choose one animal.",
          "score": 10,
          "consequence": "Jordan points to “octopus” on the word wall. The starter is available on the paper.",
          "feedback": "Responding to an existing help request and restoring the familiar scaffold are plan-aligned.",
          "wizard": "They asked. You answered. That matters.",
          "next": "mystery_step3_supported",
          "ending": null,
          "meta": {
            "bipComponent": "Prevent",
            "mechanism": "honor_support_request",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "“I heard you. I’ll write it when I finish helping with the spill. Pick your animal for now.”",
          "score": 5,
          "consequence": "Jordan keeps the folder open but taps the blank page without choosing a word.",
          "feedback": "You acknowledged the request, but delayed the support that would make the task doable.",
          "wizard": "A good intention with a long wait attached.",
          "next": "mystery_step3_wobbly",
          "ending": null,
          "meta": {
            "bipComponent": "Prevent",
            "mechanism": "delayed_support",
            "function": "escape",
            "errorType": "timing_or_delay"
          }
        },
        "C": {
          "text": "“Let’s try writing without it today. You know how the starter works.”",
          "score": 0,
          "consequence": "Jordan closes the folder and looks toward the door instead of the writing page.",
          "feedback": "Removing a familiar support after a direct request leaves Jordan without a workable entry.",
          "wizard": "The missing tool just became the whole problem.",
          "next": "mystery_step3_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Prevent",
            "mechanism": "removed_support",
            "function": "escape",
            "errorType": "plan_drift"
          }
        }
      }
    },
    "mystery_step2_wobbly": {
      "text": "Jordan has put the folder on the desk but has not opened it. “What am I supposed to write?” the student asks. The usual starter card is missing, and a lunch container has spilled at the next table. You have one moment to respond before helping there.",
      "hint": "A real question is on the table. Offer a small, concrete start rather than more waiting.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support"
      },
      "choices": {
        "A": {
          "text": "“One animal. I’ll write ‘My animal is…’ here, and you can choose the word.”",
          "score": 10,
          "consequence": "Jordan opens the folder and points to a word on the animal chart. The starter is on the page.",
          "feedback": "You answered Jordan’s question with a usable scaffold and a bounded first step.",
          "wizard": "The question finally has an answer.",
          "next": "mystery_step3_supported",
          "ending": null,
          "meta": {
            "bipComponent": "Prevent",
            "mechanism": "small_step",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "“You can write about any animal. I’ll check back after I pick up this spill.”",
          "score": 5,
          "consequence": "Jordan opens the folder but leaves the pencil beside the paper. The first move remains unclear.",
          "feedback": "Giving a topic without an explicit starting action still leaves the hard part untouched.",
          "wizard": "A topic isn’t always a starting line.",
          "next": "mystery_step3_wobbly",
          "ending": null,
          "meta": {
            "bipComponent": "Prevent",
            "mechanism": "reassurance_only",
            "function": "escape",
            "errorType": "missed_active_ingredient"
          }
        },
        "C": {
          "text": "“We already talked about animals. Open the folder and figure it out.”",
          "score": 0,
          "consequence": "Jordan turns away and says, “Not today.” The folder stays shut.",
          "feedback": "This repeats the demand without supplying the missing scaffold or answering the question.",
          "wizard": "Still no bridge to the page.",
          "next": "mystery_step3_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Prevent",
            "mechanism": "peer_comparison",
            "function": "escape",
            "errorType": "plan_drift"
          }
        }
      }
    },
    "mystery_step2_escalated": {
      "text": "Jordan has pushed the folder away. “I’m not writing after lunch!” Two students glance up. The starter card is missing, and you are still helping the class settle. The immediate job is to lower pressure and offer a feasible route into writing.",
      "hint": "A calm private response can start recovery. It need not resolve refusal immediately.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support"
      },
      "choices": {
        "A": {
          "text": "Move beside Jordan and say quietly, “We can start with one animal. Would help or a short break work better?”",
          "score": 10,
          "consequence": "Jordan stops pushing the folder, then glances at you. The folder is still closed.",
          "feedback": "This lowers the audience and offers the plan’s communication options; recovery can begin without instant compliance.",
          "wizard": "Less audience. One usable choice.",
          "next": "mystery_step3_wobbly",
          "ending": null,
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "help_break_return",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "“I get that it changed. Sit here until you’re ready, and we’ll talk about writing later.”",
          "score": 5,
          "consequence": "Jordan stays turned away. The argument stops, but there is no clear next step.",
          "feedback": "Validation helps reduce pressure, but it does not make help or a brief break functional.",
          "wizard": "Quieter is not the whole quest.",
          "next": "mystery_step3_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "pause_without_return",
            "function": "escape",
            "errorType": "partial_implementation"
          }
        },
        "C": {
          "text": "“Everyone had the same schedule change. Writing starts now, so bring that folder back.”",
          "score": 0,
          "consequence": "Jordan pushes the folder farther away and repeats, “No.”",
          "feedback": "Comparing Jordan with peers increases demands without supporting the replacement response.",
          "wizard": "The audience just got bigger.",
          "next": "mystery_step3_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "expanded_demand",
            "function": "escape",
            "errorType": "plan_drift"
          }
        }
      }
    },
    "mystery_step3_supported": {
      "text": "The starter “My animal is…” is written on the page. Jordan points to an animal on the word chart, then looks at you. “Can you help me start the word?” A student at the other table calls for paper towels. The writing support is ready, and Jordan has asked for help using it.",
      "hint": "Jordan has already asked for help. Give a brief answer that makes the first word possible.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support"
      },
      "choices": {
        "A": {
          "text": "“Yes. Look at the word chart with me; I’ll help you copy the first sound.”",
          "score": 10,
          "consequence": "Jordan points to the word chart and puts pencil to paper. The starter is still visible.",
          "feedback": "This follows the plan by providing an immediate manageable response to the actual moment.",
          "wizard": "A small foothold, right on time.",
          "next": "mystery_step4_supported",
          "ending": null,
          "meta": {
            "bipComponent": "Teach",
            "mechanism": "honor_help",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "“Keep thinking about your animal. I’ll be back when this table is settled.”",
          "score": 5,
          "consequence": "Jordan remains beside the desk without starting a word. The other table still needs help.",
          "feedback": "This response stays calm but delays the concrete support needed to begin.",
          "wizard": "Still waiting for the starting line.",
          "next": "mystery_step4_wobbly",
          "ending": null,
          "meta": {
            "bipComponent": "Teach",
            "mechanism": "delayed_help",
            "function": "escape",
            "errorType": "timing_or_delay"
          }
        },
        "C": {
          "text": "“You know how to write a word. I need you to try without my help.”",
          "score": 0,
          "consequence": "Jordan moves farther from the folder and watches the other children instead.",
          "feedback": "Requiring independent writing before providing the planned help undermines the communication route.",
          "wizard": "The door to help stays shut.",
          "next": "mystery_step4_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Teach",
            "mechanism": "blocked_help",
            "function": "escape",
            "errorType": "missed_teaching_opportunity"
          }
        }
      }
    },
    "mystery_step3_wobbly": {
      "text": "Jordan stays by the writing desk. The folder and pencil are within reach, but no usable first word has started. The missing card, or a delayed replacement for it, still complicates writing. The spill at the other table needs attention. Jordan says, “I still don’t know what to put.”",
      "hint": "There is no completed request to repeat. Offer a concrete starter or prompt Jordan to ask for help.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support"
      },
      "choices": {
        "A": {
          "text": "“I can write the starter right here. Point to one animal on the chart, and I’ll help with its first sound.”",
          "score": 10,
          "consequence": "Jordan opens the folder, points to “shark” on the chart, and watches you write the starter on the page.",
          "feedback": "This follows the plan by providing an immediate manageable response to the actual moment.",
          "wizard": "A small foothold, right on time.",
          "next": "mystery_step4_supported",
          "ending": null,
          "meta": {
            "bipComponent": "Teach",
            "mechanism": "honor_help",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "“Keep thinking about your animal. I’ll be back when this table is settled.”",
          "score": 5,
          "consequence": "Jordan remains beside the desk without starting a word. The other table still needs help.",
          "feedback": "This response stays calm but delays the concrete support needed to begin.",
          "wizard": "Still waiting for the starting line.",
          "next": "mystery_step4_wobbly",
          "ending": null,
          "meta": {
            "bipComponent": "Teach",
            "mechanism": "delayed_help",
            "function": "escape",
            "errorType": "timing_or_delay"
          }
        },
        "C": {
          "text": "“You know how to write a word. I need you to try without my help.”",
          "score": 0,
          "consequence": "Jordan moves farther from the folder and watches the other children instead.",
          "feedback": "Requiring independent writing before providing the planned help undermines the communication route.",
          "wizard": "The door to help stays shut.",
          "next": "mystery_step4_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Teach",
            "mechanism": "blocked_help",
            "function": "escape",
            "errorType": "missed_teaching_opportunity"
          }
        }
      }
    },
    "mystery_step3_escalated": {
      "text": "Jordan is turned away from the writing materials. Some classmates are watching as the lunch cleanup continues. The missing starter has not been restored. You can respond privately without making Jordan’s refusal the center of the room.",
      "hint": "Start with a quiet, manageable path back. Avoid inventing a new consequence.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support"
      },
      "choices": {
        "A": {
          "text": "Move closer and quietly offer, “Help with one animal word, or a short break first?”",
          "score": 10,
          "consequence": "Jordan stops turning away and looks back toward the writing table; the folder stays closed.",
          "feedback": "This follows the plan by providing an immediate manageable response to the actual moment.",
          "wizard": "A small foothold, right on time.",
          "next": "mystery_step4_wobbly",
          "ending": null,
          "meta": {
            "bipComponent": "Teach",
            "mechanism": "honor_help",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "“Keep thinking about your animal. I’ll be back when this table is settled.”",
          "score": 5,
          "consequence": "Jordan remains beside the desk without starting a word. The other table still needs help.",
          "feedback": "This response stays calm but delays the concrete support needed to begin.",
          "wizard": "Still waiting for the starting line.",
          "next": "mystery_step4_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Teach",
            "mechanism": "delayed_help",
            "function": "escape",
            "errorType": "timing_or_delay"
          }
        },
        "C": {
          "text": "“You know how to write a word. I need you to try without my help.”",
          "score": 0,
          "consequence": "Jordan moves farther from the folder and watches the other children instead.",
          "feedback": "Requiring independent writing before providing the planned help undermines the communication route.",
          "wizard": "The door to help stays shut.",
          "next": "mystery_step4_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Teach",
            "mechanism": "blocked_help",
            "function": "escape",
            "errorType": "missed_teaching_opportunity"
          }
        }
      }
    },
    "mystery_step4_supported": {
      "text": "Jordan is beside an open writing folder with an animal selected. The first word is within reach, though it is not finished. A student at the spill table asks for another paper towel. Jordan glances at the pencil and then toward you; the next support needs to be brief enough to fit both tables.",
      "hint": "Before you turn to the other table, what will help Jordan keep going with a manageable step?",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support"
      },
      "choices": {
        "A": {
          "text": "“You picked your animal. Try its first sound; I’ll check back after I help with the spill.”",
          "score": 10,
          "consequence": "Jordan writes the first letter while you help the other table; the rest of the word remains unfinished.",
          "feedback": "You made the next step achievable and responded to the communication that was actually present.",
          "wizard": "A little progress survives the surprise.",
          "next": "mystery_step5_supported",
          "ending": null,
          "meta": {
            "bipComponent": "Reinforce",
            "mechanism": "prompt_reinforcement",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "“Nice choice of animal. Work on it for a minute while I get the other table settled.”",
          "score": 5,
          "consequence": "Jordan remains near the folder, but the pencil stops moving and no next step is clear.",
          "feedback": "Encouragement alone leaves the next move uncertain when competing demands return.",
          "wizard": "The support fades just a bit too early.",
          "next": "mystery_step5_wobbly",
          "ending": null,
          "meta": {
            "bipComponent": "Reinforce",
            "mechanism": "praise_only",
            "function": "escape",
            "errorType": "missed_reinforcement_opportunity"
          }
        },
        "C": {
          "text": "“I can only help students who are already working. Start the sentence and then call me.”",
          "score": 0,
          "consequence": "Jordan puts down the pencil and turns away from the page.",
          "feedback": "This makes planned help depend on completing the difficult step first.",
          "wizard": "That makes help harder to reach.",
          "next": "mystery_step5_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "pressure",
            "function": "escape",
            "errorType": "plan_drift"
          }
        }
      }
    },
    "mystery_step4_wobbly": {
      "text": "Jordan remains near the writing materials, but no first word has been secured. The spill is being cleaned up across the room. Jordan looks from the paper to you and asks, “Could you help me start?” This is a request for assistance, not a request to put writing off until later.",
      "hint": "Jordan just asked directly. Acknowledge and assist; do not ask for a second request.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support"
      },
      "choices": {
        "A": {
          "text": "“Yes, I can help.” Write the starter on the paper if it is missing, then sound out the first letter together.",
          "score": 10,
          "consequence": "Jordan copies the first letter with your help and keeps the writing folder open.",
          "feedback": "You made the next step achievable and responded to the communication that was actually present.",
          "wizard": "A little progress survives the surprise.",
          "next": "mystery_step5_supported",
          "ending": null,
          "meta": {
            "bipComponent": "Reinforce",
            "mechanism": "prompt_reinforcement",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "“I’ll help after I finish here. Keep your folder open so we can find your starting word.”",
          "score": 5,
          "consequence": "Jordan remains near the folder, but the pencil stops moving and no next step is clear.",
          "feedback": "Encouragement alone leaves the next move uncertain when competing demands return.",
          "wizard": "The support fades just a bit too early.",
          "next": "mystery_step5_wobbly",
          "ending": null,
          "meta": {
            "bipComponent": "Reinforce",
            "mechanism": "praise_only",
            "function": "escape",
            "errorType": "missed_reinforcement_opportunity"
          }
        },
        "C": {
          "text": "“You need to try the first word yourself before I can help. I have another table waiting.”",
          "score": 0,
          "consequence": "Jordan puts down the pencil and turns away from the page.",
          "feedback": "This makes planned help depend on completing the difficult step first.",
          "wizard": "That makes help harder to reach.",
          "next": "mystery_step5_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "pressure",
            "function": "escape",
            "errorType": "plan_drift"
          }
        }
      }
    },
    "mystery_step4_escalated": {
      "text": "Jordan remains disengaged from the writing task. The folder is still nearby, but Jordan has moved attention toward the rest of the room. You can maintain calm support as classmates return to their work.",
      "hint": "Begin recovery privately. A correct response may only bring Jordan closer, not finish the writing.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support"
      },
      "choices": {
        "A": {
          "text": "Quietly offer, “I can help with one word, or you can ask for a short break before we try.”",
          "score": 10,
          "consequence": "Jordan edges back toward the desk. No letter has been written yet.",
          "feedback": "You made the next step achievable and responded to the communication that was actually present.",
          "wizard": "A little progress survives the surprise.",
          "next": "mystery_step5_wobbly",
          "ending": null,
          "meta": {
            "bipComponent": "Reinforce",
            "mechanism": "prompt_reinforcement",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "“Good, keep working. I have to help the other group right now.”",
          "score": 5,
          "consequence": "Jordan remains near the folder, but the pencil stops moving and no next step is clear.",
          "feedback": "Encouragement alone leaves the next move uncertain when competing demands return.",
          "wizard": "The support fades just a bit too early.",
          "next": "mystery_step5_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Reinforce",
            "mechanism": "praise_only",
            "function": "escape",
            "errorType": "missed_reinforcement_opportunity"
          }
        },
        "C": {
          "text": "“I can only help students who are already working. Start the sentence and then call me.”",
          "score": 0,
          "consequence": "Jordan puts down the pencil and turns away from the page.",
          "feedback": "This makes planned help depend on completing the difficult step first.",
          "wizard": "That makes help harder to reach.",
          "next": "mystery_step5_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "pressure",
            "function": "escape",
            "errorType": "plan_drift"
          }
        }
      }
    },
    "mystery_step5_supported": {
      "text": "Jordan has put a first letter on the page. The sentence is nowhere near finished, but the folder stays open and the spill is being cleared. Jordan points to the word chart and asks, “Can you help me with the next part?” There is an immediate opportunity to respond to that request and reinforce the start.",
      "hint": "Answer this new request, reinforce the first attempt, and keep the remaining expectation small.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support"
      },
      "choices": {
        "A": {
          "text": "“That first letter was a start. Yes, I’ll help you sound out the next part.”",
          "score": 10,
          "consequence": "Jordan adds another letter with help; the sentence is unfinished, but the request worked.",
          "feedback": "This directly supports a current need and reinforces a small step without enlarging the task.",
          "wizard": "That is a real way forward.",
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
          "text": "“Okay, we’ll talk about the writing later. Put your folder away for now.”",
          "score": 5,
          "consequence": "Jordan sets the folder aside; the interaction is calmer, but no help-and-return plan is established.",
          "feedback": "Ending the demand may reduce conflict but misses a chance to make appropriate communication effective.",
          "wizard": "Quiet is not quite the same as progress.",
          "next": null,
          "ending": "MIXED",
          "meta": {
            "bipComponent": "Reinforce",
            "mechanism": "weak_followthrough",
            "function": "escape",
            "errorType": "partial_implementation"
          }
        },
        "C": {
          "text": "“Before I help, you need to finish the whole sentence on your own.”",
          "score": 0,
          "consequence": "Jordan turns away from the writing materials. The help pathway is no longer available.",
          "feedback": "This adds the original hard demand as a prerequisite for the support Jordan needs.",
          "wizard": "The finish line moved much too far.",
          "next": null,
          "ending": "FRAGILE",
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "expanded_demand",
            "function": "escape",
            "errorType": "plan_drift"
          }
        }
      }
    },
    "mystery_step5_wobbly": {
      "text": "Jordan remains beside the writing folder. There may be a starter or an animal choice on the page, but the first word has not taken hold. The spill is being cleared and the class is nearly ready to transition. Jordan asks, “Can you help with the first part?”",
      "hint": "There is an actual request for help. Respond directly and support a manageable return.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support"
      },
      "choices": {
        "A": {
          "text": "“Yes. Let’s find the first sound together. You can write just that part.”",
          "score": 10,
          "consequence": "Jordan tries the first sound with you and stays by the folder.",
          "feedback": "This directly supports a current need and reinforces a small step without enlarging the task.",
          "wizard": "That is a real way forward.",
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
          "text": "“Okay, we’ll talk about the writing later. Put your folder away for now.”",
          "score": 5,
          "consequence": "Jordan sets the folder aside; the interaction is calmer, but no help-and-return plan is established.",
          "feedback": "Ending the demand may reduce conflict but misses a chance to make appropriate communication effective.",
          "wizard": "Quiet is not quite the same as progress.",
          "next": null,
          "ending": "MIXED",
          "meta": {
            "bipComponent": "Reinforce",
            "mechanism": "weak_followthrough",
            "function": "escape",
            "errorType": "partial_implementation"
          }
        },
        "C": {
          "text": "“Before I help, you need to finish the whole sentence on your own.”",
          "score": 0,
          "consequence": "Jordan turns away from the writing materials. The help pathway is no longer available.",
          "feedback": "This adds the original hard demand as a prerequisite for the support Jordan needs.",
          "wizard": "The finish line moved much too far.",
          "next": null,
          "ending": "FRAGILE",
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "expanded_demand",
            "function": "escape",
            "errorType": "plan_drift"
          }
        }
      }
    },
    "mystery_step5_escalated": {
      "text": "The afternoon transition is approaching. Jordan is still turned away from most of the writing task, and the folder is close by. The missing starter and the interrupted routine have not been fully resolved. No word has been written in this branch. The next response can still make help or a short break a workable route.",
      "hint": "Offer a practical help or short-break pathway; do not assume a written attempt occurred.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support"
      },
      "choices": {
        "A": {
          "text": "Quietly offer to write the starter together or help Jordan ask for a short break before trying one word.",
          "score": 10,
          "consequence": "Jordan turns toward you and points at the folder. There is an opening for support, although writing has not restarted.",
          "feedback": "This directly supports a current need and reinforces a small step without enlarging the task.",
          "wizard": "That is a real way forward.",
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
          "text": "“Okay, we’ll talk about the writing later. Put your folder away for now.”",
          "score": 5,
          "consequence": "Jordan sets the folder aside; the interaction is calmer, but no help-and-return plan is established.",
          "feedback": "Ending the demand may reduce conflict but misses a chance to make appropriate communication effective.",
          "wizard": "Quiet is not quite the same as progress.",
          "next": null,
          "ending": "FRAGILE",
          "meta": {
            "bipComponent": "Reinforce",
            "mechanism": "weak_followthrough",
            "function": "escape",
            "errorType": "partial_implementation"
          }
        },
        "C": {
          "text": "“Before I help, you need to finish the whole sentence on your own.”",
          "score": 0,
          "consequence": "Jordan turns away from the writing materials. The help pathway is no longer available.",
          "feedback": "This adds the original hard demand as a prerequisite for the support Jordan needs.",
          "wizard": "The finish line moved much too far.",
          "next": null,
          "ending": "FRAGILE",
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "expanded_demand",
            "function": "escape",
            "errorType": "plan_drift"
          }
        }
      }
    }
  }
});
})();