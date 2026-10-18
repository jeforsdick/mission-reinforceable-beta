/* Fictional public demo draft. NOT DEPLOYED. */
(function registerDailyMission1() {
  window.POOL = window.POOL || { daily: [], wild: [], crisis: [] };
  window.POOL.daily = window.POOL.daily || [];
  window.POOL.daily.push({
  "id": "daily-blank-page-beta",
  "title": "The Blank Page",
  "routine": "independent writing",
  "focus": "Make the first writing step small, respond to help requests, and reinforce re-engagement.",
  "expectedSteps": 5,
  "start": "daily_step1_start",
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
    "sourceStatus": "FICTIONAL_PUBLIC_DEMO",
    "qualityReview": {
      "behavioral": false,
      "gameDesign": false
    },
    "draftVersion": "2026-10-18-proposal-2-continuity-revision"
  },
  "endings": {
    "STRONG": {
      "summary": "Jordan used help or a small writing step, and you reinforced it. The sentence may still be unfinished.",
      "text": "Jordan made a supported start and experienced a teacher response that made asking for help or trying a small step useful. Writing may remain unfinished; the important result is an improving route into the task.",
      "wizard": "That first step counts."
    },
    "MIXED": {
      "summary": "Some pressure eased, but help or the next writing step was delayed. A workable opening remains.",
      "text": "Parts of the exchange supported a calmer moment or a small attempt. Other moments left a request unanswered or the writing step unclear. The next opportunity is to respond to communication promptly and support a manageable start.",
      "wizard": "Good opening. Sharpen the follow-through."
    },
    "FRAGILE": {
      "summary": "Jordan is still stuck, or the final response added pressure. The writing support plan needs another try.",
      "text": "The writing problem was not meaningfully resolved in this simulated route. A requested help response, small first step, or timely reinforcement was missing, and the teacher has a clearer option to practice next time. No outcome for a real student is implied.",
      "wizard": "Try the smaller, supported path."
    }
  },
  "steps": {
    "daily_step1_start": {
      "text": "The class has just finished sharing favorite animals. Now everyone is writing one sentence. Jordan talks easily about octopuses, but the pencil sits beside a blank page. You are answering a question at the next table when Jordan nudges the paper away and says, “I don’t know how to start.”",
      "hint": "The plan calls for a small first step and an easy way to request help.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support",
        "sceneLabel": "The Blank Page"
      },
      "choices": {
        "A": {
          "text": "Move beside Jordan, point to the sentence starter, and say, “Pick one animal. I can help with the first word.”",
          "score": 10,
          "consequence": "Jordan pulls the page closer and points to the starter. No word is written yet, but there is an achievable place to begin.",
          "feedback": "You made the first demand small and offered immediate help.",
          "wizard": "One small doorway. Nice.",
          "next": "daily_step2_supported",
          "ending": null,
          "meta": {
            "bipComponent": "Prevent",
            "mechanism": "small_step_help_break_and_reinforcement",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "Say, “Think of your favorite animal. I’ll come back when I finish with this table.”",
          "score": 5,
          "consequence": "Jordan looks at the paper again but keeps the pencil down. Waiting has not made the first move clearer.",
          "feedback": "Your tone is calm, but Jordan still needs an explicit first step or usable help.",
          "wizard": "Calm helps. A starting point helps more.",
          "next": "daily_step2_wobbly",
          "ending": null,
          "meta": {
            "bipComponent": "Prevent",
            "mechanism": "small_step_help_break_and_reinforcement",
            "function": "escape",
            "errorType": "partial_implementation"
          }
        },
        "C": {
          "text": "Point to the directions on the board and say, “Everyone else is writing. You need to get started.”",
          "score": 0,
          "consequence": "Jordan pushes the sheet farther away and says, “I’m not doing it.” Two classmates glance over.",
          "feedback": "Repeating the whole demand increases pressure without making the work doable.",
          "wizard": "That page just got bigger.",
          "next": "daily_step2_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Prevent",
            "mechanism": "small_step_help_break_and_reinforcement",
            "function": "escape",
            "errorType": "plan_drift"
          }
        }
      }
    },
    "daily_step2_supported": {
      "text": "Jordan has the page in front of them and looks at the sentence starter. “Can you help me pick an animal?” Jordan asks while another student calls you from across the table. Jordan is waiting to see whether asking actually gets help.",
      "hint": "Jordan already asked appropriately; make that request work.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support",
        "sceneLabel": "A quiet request"
      },
      "choices": {
        "A": {
          "text": "Answer, “Yes. Octopus or turtle?” Let Jordan choose, then help write the first word.",
          "score": 10,
          "consequence": "Jordan picks octopus and writes an O with your help. They keep the page close and look at the word starter.",
          "feedback": "You honored the existing help request and made the first response manageable.",
          "wizard": "That request opened the door.",
          "next": "daily_step3_supported",
          "ending": null,
          "meta": {
            "bipComponent": "Prevent",
            "mechanism": "small_step_help_break_and_reinforcement",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "Say, “Good asking. Choose any animal you want,” and turn to the next table.",
          "score": 5,
          "consequence": "Jordan smiles at the acknowledgment but looks back at the page, still unsure how to put the idea into writing.",
          "feedback": "You noticed the request but did not deliver the help Jordan asked for.",
          "wizard": "Almost there—follow through.",
          "next": "daily_step3_wobbly",
          "ending": null,
          "meta": {
            "bipComponent": "Prevent",
            "mechanism": "small_step_help_break_and_reinforcement",
            "function": "escape",
            "errorType": "partial_implementation"
          }
        },
        "C": {
          "text": "Tell Jordan, “You know animals. Try it by yourself before you ask me.”",
          "score": 0,
          "consequence": "Jordan closes the pencil box and turns away from the paper. Asking for help did not change the hard task.",
          "feedback": "Delaying help after an appropriate request makes that replacement response less useful.",
          "wizard": "Don’t close the help window.",
          "next": "daily_step3_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Prevent",
            "mechanism": "small_step_help_break_and_reinforcement",
            "function": "escape",
            "errorType": "plan_drift"
          }
        }
      }
    },
    "daily_step2_wobbly": {
      "text": "Jordan remains seated, rubbing the pencil eraser over the desk. “I have an animal in my head,” Jordan says, “but I can’t write it.” The class is quietly writing, and the next table is beginning to need you. There is still a chance to turn hesitation into a first step.",
      "hint": "Provide one concrete writing move while keeping help available.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support",
        "sceneLabel": "Still waiting"
      },
      "choices": {
        "A": {
          "text": "Say, “Tell me the animal. I’ll help you sound out the first letter, then you try it.”",
          "score": 10,
          "consequence": "Jordan names an animal and writes its first letter with your help. The page now has a starting point.",
          "feedback": "A brief model and small task step directly address the point of difficulty.",
          "wizard": "A first mark counts.",
          "next": "daily_step3_supported",
          "ending": null,
          "meta": {
            "bipComponent": "Prevent",
            "mechanism": "small_step_help_break_and_reinforcement",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "Suggest, “Draw the animal first if that helps,” then continue circulating.",
          "score": 5,
          "consequence": "Jordan draws a small shape but the sentence remains blank, with no clear bridge from drawing to writing.",
          "feedback": "An easier entry can help, but the plan still needs an explicit writing step and support.",
          "wizard": "Useful start; missing bridge.",
          "next": "daily_step3_wobbly",
          "ending": null,
          "meta": {
            "bipComponent": "Prevent",
            "mechanism": "small_step_help_break_and_reinforcement",
            "function": "escape",
            "errorType": "partial_implementation"
          }
        },
        "C": {
          "text": "Say, “You’re spending too long thinking. Write a sentence now.”",
          "score": 0,
          "consequence": "Jordan folds the paper corner and says, “No.” The original writing demand is still too large.",
          "feedback": "The repeated demand does not teach a help request or make the task smaller.",
          "wizard": "Pressure isn’t a plan.",
          "next": "daily_step3_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Prevent",
            "mechanism": "small_step_help_break_and_reinforcement",
            "function": "escape",
            "errorType": "plan_drift"
          }
        }
      }
    },
    "daily_step2_escalated": {
      "text": "Jordan has pushed the page to the edge of the desk and says, “I’m not writing.” A nearby student looks over. The pencil and paper are still within reach, and the rest of the group is working. You need a quiet response that offers an alternative to refusing the whole task.",
      "hint": "Keep your response private; offer the planned help or brief-break route.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support",
        "sceneLabel": "Refusal starts"
      },
      "choices": {
        "A": {
          "text": "Move close and quietly offer, “You can ask for help or a short break. We’ll start with one word afterward.”",
          "score": 10,
          "consequence": "Jordan stops talking over the class and watches you. The refusal has not ended, but a less demanding route is available.",
          "feedback": "You reduced public pressure and cued the plan’s functional communication options.",
          "wizard": "The volume drops; stay steady.",
          "next": "daily_step3_wobbly",
          "ending": null,
          "meta": {
            "bipComponent": "Prevent",
            "mechanism": "small_step_help_break_and_reinforcement",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "Quietly say, “Take a minute. I’ll check back,” and return to your group.",
          "score": 5,
          "consequence": "Jordan stays at the desk but does not touch the paper. The conflict pauses without a clear way back.",
          "feedback": "Giving space may reduce pressure but leaves the replacement response and first step unspecified.",
          "wizard": "The pause needs a path.",
          "next": "daily_step3_wobbly",
          "ending": null,
          "meta": {
            "bipComponent": "Prevent",
            "mechanism": "small_step_help_break_and_reinforcement",
            "function": "escape",
            "errorType": "partial_implementation"
          }
        },
        "C": {
          "text": "Say where others can hear, “You still have to finish, even if you don’t want to.”",
          "score": 0,
          "consequence": "Jordan says “No!” again and turns the chair away from the desk. More students notice.",
          "feedback": "Public insistence increases attention and demand without prompting the planned alternative.",
          "wizard": "Keep the spotlight small.",
          "next": "daily_step3_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Prevent",
            "mechanism": "small_step_help_break_and_reinforcement",
            "function": "escape",
            "errorType": "plan_drift"
          }
        }
      }
    },
    "daily_step3_supported": {
      "text": "Jordan has turned back to the page and made a first mark. The next table calls for you, but Jordan points to the writing and asks, “Can you check this with me?” You have a moment to respond before returning to the group.",
      "hint": "An appropriate bid for support deserves useful follow-through.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support",
        "sceneLabel": "A first foothold"
      },
      "choices": {
        "A": {
          "text": "Say, “Yes—show me what you have.” Help with one small writing move and acknowledge the effort.",
          "score": 10,
          "consequence": "Jordan shows you the first letter. With a quick prompt, they add another letter and glance up at you.",
          "feedback": "Jordan already requested a check. You answered it, supported one manageable writing move, and acknowledged the effort.",
          "wizard": "That request got a real answer.",
          "next": "daily_step4_supported",
          "ending": null,
          "meta": {
            "bipComponent": "Teach",
            "mechanism": "small_step_help_break_and_reinforcement",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "Say, “Nice asking. Keep going,” while moving toward the other table.",
          "score": 5,
          "consequence": "Jordan nods at the praise, then waits with the pencil above the page as you head to the other table.",
          "feedback": "You acknowledged the request, but Jordan asked for a check. A brief look and one specific next step would make that request effective.",
          "wizard": "Praise is nice. The check was the ask.",
          "next": "daily_step4_wobbly",
          "ending": null,
          "meta": {
            "bipComponent": "Teach",
            "mechanism": "small_step_help_break_and_reinforcement",
            "function": "escape",
            "errorType": "partial_implementation"
          }
        },
        "C": {
          "text": "Say, “I saw your start. Try the next part yourself while I help this table,” and walk away.",
          "score": 0,
          "consequence": "Jordan watches you leave and sets the pencil down. The requested check did not happen.",
          "feedback": "Independence is a reasonable goal, but Jordan has asked for help with an unfinished word. A brief response would keep asking useful.",
          "wizard": "Jordan still needed the check.",
          "next": "daily_step4_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Teach",
            "mechanism": "Delayed check",
            "function": "escape",
            "errorType": "missed help response"
          }
        }
      }
    },
    "daily_step3_wobbly": {
      "text": "Jordan has settled somewhat but is still doing little writing. The pencil moves between Jordan’s fingers while the rest of the table works. “I’m stuck,” Jordan says quietly. You can offer help without abandoning the group, but a vague reassurance may leave the same problem in place.",
      "hint": "Acknowledge being stuck and specify the next doable action.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support",
        "sceneLabel": "The pencil pauses"
      },
      "choices": {
        "A": {
          "text": "Say, “I can help. Tell me the word you want, and we’ll sound out its first letter together.”",
          "score": 10,
          "consequence": "Jordan names an animal and tries its first letter while you help. The request brought an immediate response.",
          "feedback": "“I’m stuck” is already communication that support is needed. You respond directly and help Jordan make a manageable writing move.",
          "wizard": "You heard the help request.",
          "next": "daily_step4_supported",
          "ending": null,
          "meta": {
            "bipComponent": "Teach",
            "mechanism": "small_step_help_break_and_reinforcement",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "Offer, “Try one more minute and I’ll help if you still need it.”",
          "score": 5,
          "consequence": "Jordan watches you head to the next table. The pencil stays down while they wait for the promised help.",
          "feedback": "Offering help later is understandable while supervising the group, but Jordan needs an immediate usable first step or brief support.",
          "wizard": "The help is still on its way.",
          "next": "daily_step4_wobbly",
          "ending": null,
          "meta": {
            "bipComponent": "Teach",
            "mechanism": "small_step_help_break_and_reinforcement",
            "function": "escape",
            "errorType": "partial_implementation"
          }
        },
        "C": {
          "text": "Say, “Look at the sentence starter again. You have everything you need,” and return to the group.",
          "score": 0,
          "consequence": "Jordan rereads the starter, then slides the paper away. They still cannot get the word onto the page.",
          "feedback": "The starter alone has not solved the problem. This misses Jordan’s stated need for help and makes avoidance more likely.",
          "wizard": "The starter needed a helper.",
          "next": "daily_step4_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Teach",
            "mechanism": "Redirect without help",
            "function": "escape",
            "errorType": "missed help response"
          }
        }
      }
    },
    "daily_step3_escalated": {
      "text": "Jordan has turned away from the writing materials and is protesting loudly enough to distract a classmate. The paper is still on the desk; writing is not happening. You are also responsible for the rest of the group. A calm response can begin recovery, but it may take more than one exchange.",
      "hint": "Do not expect instant compliance; offer a clear, private route back.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support",
        "sceneLabel": "The work stops"
      },
      "choices": {
        "A": {
          "text": "Lower your voice and offer, “Ask for a short break or help. Then we’ll try one word together.”",
          "score": 10,
          "consequence": "Jordan becomes quieter and looks toward you, but does not return to the writing yet. The next step remains delicate.",
          "feedback": "This is plan-aligned and begins recovery without promising an instant return.",
          "wizard": "Recovery can start small.",
          "next": "daily_step4_wobbly",
          "ending": null,
          "meta": {
            "bipComponent": "Teach",
            "mechanism": "small_step_help_break_and_reinforcement",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "Tell Jordan, “You can sit quietly until you feel ready,” and move away.",
          "score": 5,
          "consequence": "Jordan stops speaking loudly but continues to avoid the paper. The plan’s help-or-break route remains unused.",
          "feedback": "Less attention may quiet the moment, but it does not provide the planned replacement response.",
          "wizard": "Quiet isn’t the whole goal.",
          "next": "daily_step4_wobbly",
          "ending": null,
          "meta": {
            "bipComponent": "Teach",
            "mechanism": "small_step_help_break_and_reinforcement",
            "function": "escape",
            "errorType": "partial_implementation"
          }
        },
        "C": {
          "text": "Say, “We’ll talk about a break after you show me that you’ve tried writing something.”",
          "score": 0,
          "consequence": "Jordan pushes the chair back and says, “I can’t!” The break or help option is still out of reach.",
          "feedback": "Making access to the planned break or help contingent on writing can keep refusal going. Offer the planned communication route now.",
          "wizard": "That puts the bridge after the hurdle.",
          "next": "daily_step4_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Teach",
            "mechanism": "Help contingent on work",
            "function": "escape",
            "errorType": "contingency mismatch"
          }
        }
      }
    },
    "daily_step4_supported": {
      "text": "Jordan has either made another small writing move or started a word with your help. The sentence is still unfinished. Another child needs a quick check, and Jordan watches you for what happens next. This is a chance to notice the specific request or writing attempt while keeping the class moving.",
      "hint": "Reinforce the useful response, then make the next step attainable.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support",
        "sceneLabel": "Keep the momentum"
      },
      "choices": {
        "A": {
          "text": "Point to the new letter or word and say, “You got started and asked for help. Try one more small piece.”",
          "score": 10,
          "consequence": "Jordan adds a small piece to the writing before you check the other table. The sentence is not finished.",
          "feedback": "You name the meaningful action, reinforce it, and offer a manageable next writing step.",
          "wizard": "A small step gets noticed.",
          "next": "daily_step5_supported",
          "ending": null,
          "meta": {
            "bipComponent": "Reinforce",
            "mechanism": "small_step_help_break_and_reinforcement",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "Smile and say, “Good job!” before moving to the other student.",
          "score": 5,
          "consequence": "Jordan keeps the pencil near the page but pauses when you move away. The next writing move is unclear.",
          "feedback": "Praise is positive, but nonspecific feedback misses the exact skill and next action.",
          "wizard": "Name what worked.",
          "next": "daily_step5_wobbly",
          "ending": null,
          "meta": {
            "bipComponent": "Reinforce",
            "mechanism": "small_step_help_break_and_reinforcement",
            "function": "escape",
            "errorType": "partial_implementation"
          }
        },
        "C": {
          "text": "Say, “Great, you’ve started. I think you can work through the rest without me,” and help the other table.",
          "score": 0,
          "consequence": "Jordan studies the remaining blank space and sets the pencil down. The next step feels too big again.",
          "feedback": "This sounds encouraging, but it removes the small-step support before Jordan can continue independently.",
          "wizard": "The next leap is too big.",
          "next": "daily_step5_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Reinforce",
            "mechanism": "Premature independence",
            "function": "escape",
            "errorType": "missed active ingredient"
          }
        }
      }
    },
    "daily_step4_wobbly": {
      "text": "Jordan is quieter now, but the writing is still stalled. Depending on the last exchange, help was promised, a request went unanswered, or Jordan only just looked back toward the materials. Jordan glances between you and the page and says, “Could you help with one word?” Your next move can make that request useful.",
      "hint": "Respond to the opening with specific help and timely acknowledgment.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support",
        "sceneLabel": "A narrow opening"
      },
      "choices": {
        "A": {
          "text": "Answer, “Yes.” Help Jordan choose one word and begin it, then acknowledge the effort right away.",
          "score": 10,
          "consequence": "Jordan begins the word with your help. You name the effort, and Jordan keeps the pencil on the page.",
          "feedback": "Jordan has already asked for help. You respond to the request, provide a small writing step, and reinforce the attempt.",
          "wizard": "That request paid off.",
          "next": "daily_step5_supported",
          "ending": null,
          "meta": {
            "bipComponent": "Reinforce",
            "mechanism": "small_step_help_break_and_reinforcement",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "Say, “Good asking. Pick a word while I finish with this group, and I’ll come back.”",
          "score": 5,
          "consequence": "Jordan watches you move away and rests the pencil on the page. The requested help is still waiting.",
          "feedback": "You acknowledge the request but delay the support needed to start a word. A brief response now would make help-seeking useful.",
          "wizard": "The request is still waiting.",
          "next": "daily_step5_wobbly",
          "ending": null,
          "meta": {
            "bipComponent": "Reinforce",
            "mechanism": "small_step_help_break_and_reinforcement",
            "function": "escape",
            "errorType": "partial_implementation"
          }
        },
        "C": {
          "text": "Say, “You know what to write about. Try it first, then I can help if it’s still hard.”",
          "score": 0,
          "consequence": "Jordan turns the page slightly away and puts the pencil down. The direct request did not produce help.",
          "feedback": "Requiring another independent attempt after Jordan asks for help misses the planned communication response.",
          "wizard": "Help is behind another hurdle.",
          "next": "daily_step5_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Reinforce",
            "mechanism": "Delay after help request",
            "function": "escape",
            "errorType": "missed help response"
          }
        }
      }
    },
    "daily_step4_escalated": {
      "text": "Jordan is still avoiding the writing, and the exchange has distracted a few classmates. The paper and pencil remain available, even if Jordan is turned away from them. You need to continue teaching the group while making a quiet, workable help-or-break option available to Jordan.",
      "hint": "A steady, private prompt may start recovery even if the task is not completed.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support",
        "sceneLabel": "Writing is on hold"
      },
      "choices": {
        "A": {
          "text": "Quietly offer, “Would you like help with one word or a short break first?” Stay nearby to honor the answer.",
          "score": 10,
          "consequence": "Jordan becomes quieter and turns toward the desk. They have not requested help or resumed writing yet.",
          "feedback": "You offered the documented alternatives and remained available to follow through.",
          "wizard": "An opening—not a miracle.",
          "next": "daily_step5_wobbly",
          "ending": null,
          "meta": {
            "bipComponent": "Reinforce",
            "mechanism": "small_step_help_break_and_reinforcement",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "Say softly, “We can talk when you’re calmer,” and return to instruction.",
          "score": 5,
          "consequence": "Jordan stops calling out but keeps distance from the writing materials. No return step has been offered.",
          "feedback": "Calmness helps, but waiting alone does not prompt the planned communication or return step.",
          "wizard": "The plan still needs a cue.",
          "next": "daily_step5_wobbly",
          "ending": null,
          "meta": {
            "bipComponent": "Reinforce",
            "mechanism": "small_step_help_break_and_reinforcement",
            "function": "escape",
            "errorType": "partial_implementation"
          }
        },
        "C": {
          "text": "Say, “We’re running out of writing time. Come back to the desk and try to finish before cleanup.”",
          "score": 0,
          "consequence": "Jordan says, “I can’t,” and turns away again. The full task is still the focus of the exchange.",
          "feedback": "A deadline and whole-task direction can increase pressure without offering the planned help or break route.",
          "wizard": "The clock doesn’t shrink the task.",
          "next": "daily_step5_escalated",
          "ending": null,
          "meta": {
            "bipComponent": "Reinforce",
            "mechanism": "Time pressure without support",
            "function": "escape",
            "errorType": "plan drift"
          }
        }
      }
    },
    "daily_step5_supported": {
      "text": "Writing time is ending. Jordan has made at least one supported writing move, though the sentence may still be unfinished. Other students are putting pencils away. You have one last chance to reinforce the useful communication or small start without turning the unfinished sentence into another confrontation.",
      "hint": "Keep the final step small and acknowledge useful communication or engagement.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support",
        "sceneLabel": "The last minute"
      },
      "choices": {
        "A": {
          "text": "Notice the specific help request or written word, and say, “That was a strong start. We’ll use the same step tomorrow.”",
          "score": 10,
          "consequence": "Jordan puts the pencil away after a specific acknowledgment of the help request or writing attempt. The sentence may remain unfinished.",
          "feedback": "You reinforced an observable plan-aligned response without claiming the assignment was completed.",
          "wizard": "A strong ending can be a beginning.",
          "next": null,
          "ending": "STRONG",
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "small_step_help_break_and_reinforcement",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "Say, “Good job today,” and begin collecting papers.",
          "score": 5,
          "consequence": "Jordan gives you the page and joins cleanup. The effort goes unnamed, though some writing happened.",
          "feedback": "General praise misses a chance to reinforce the specific replacement or re-engagement response.",
          "wizard": "Name the win next time.",
          "next": null,
          "ending": "MIXED",
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "small_step_help_break_and_reinforcement",
            "function": "escape",
            "errorType": "partial_implementation"
          }
        },
        "C": {
          "text": "Say, “You made a start, but next time let’s see if you can finish without stopping.”",
          "score": 0,
          "consequence": "Jordan glances at the unfinished sentence and looks away. The final message focuses on what remains.",
          "feedback": "Even after progress, this emphasizes completion rather than reinforcing the requested help or small writing effort.",
          "wizard": "Name the win before the next goal.",
          "next": null,
          "ending": "FRAGILE",
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "Outcome pressure",
            "function": "escape",
            "errorType": "missed reinforcement opportunity"
          }
        }
      }
    },
    "daily_step5_wobbly": {
      "text": "Cleanup has begun. Jordan is near the materials, but progress is uncertain: a request may still be unanswered, a first step may have stalled, or Jordan may only just be turning back. The last exchange can offer useful help without assuming the writing has been finished.",
      "hint": "A small beginning and an acknowledged request can still matter.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support",
        "sceneLabel": "One last opening"
      },
      "choices": {
        "A": {
          "text": "Offer help with one word, then say exactly what Jordan did well when they attempt it.",
          "score": 10,
          "consequence": "With brief help, Jordan tries a letter or word before putting the materials away. You identify that small attempt.",
          "feedback": "You paired feasible assistance with specific reinforcement at the available opportunity.",
          "wizard": "Small steps still count.",
          "next": null,
          "ending": "MIXED",
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "small_step_help_break_and_reinforcement",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "Say, “We’ll work on this tomorrow,” and start collecting materials.",
          "score": 5,
          "consequence": "Jordan puts the paper away without another attempt. The moment is calm, but the requested help or next step remains unresolved.",
          "feedback": "Postponing avoids pressure, yet the skill-building opportunity remains incomplete.",
          "wizard": "A quiet ending, not quite a win.",
          "next": null,
          "ending": "FRAGILE",
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "small_step_help_break_and_reinforcement",
            "function": "escape",
            "errorType": "partial_implementation"
          }
        },
        "C": {
          "text": "Say, “I’ll put this on top of your papers so you remember to finish it first tomorrow.”",
          "score": 0,
          "consequence": "Jordan pushes the paper to the bottom of the pile. No help or small return step is practiced.",
          "feedback": "A reminder about finishing does not address the help or first-step difficulty Jordan is communicating.",
          "wizard": "A reminder isn’t the missing step.",
          "next": null,
          "ending": "FRAGILE",
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "Finish reminder without support",
            "function": "escape",
            "errorType": "missed active ingredient"
          }
        }
      }
    },
    "daily_step5_escalated": {
      "text": "The class is transitioning, but Jordan is still away from the writing task. The paper remains unfinished, and the teacher must keep the next routine moving. A realistic final response can reduce pressure and preserve access to help without insisting on a completed sentence in the last seconds.",
      "hint": "Protect the next safe opportunity for appropriate communication and supported return.",
      "meta": {
        "fidelityTargetKey": "fictional_demo_writing_support",
        "sceneLabel": "Transition is coming"
      },
      "choices": {
        "A": {
          "text": "Quietly offer help or a brief planned break, and identify one small writing step for the next opportunity.",
          "score": 10,
          "consequence": "Jordan turns toward the materials and becomes quieter. A possible return has begun, but no writing attempt is established.",
          "feedback": "You kept the response aligned with the plan without pretending the whole episode resolved.",
          "wizard": "A path remains open.",
          "next": null,
          "ending": "MIXED",
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "small_step_help_break_and_reinforcement",
            "function": "escape",
            "errorType": "none"
          }
        },
        "B": {
          "text": "Say, “We’ll leave it for now,” and move the class into the next routine.",
          "score": 5,
          "consequence": "Jordan joins the transition without further argument. The writing difficulty and missing help routine remain unresolved.",
          "feedback": "Moving on preserves the routine but misses the planned communication and return instruction.",
          "wizard": "A pause isn’t a practiced skill.",
          "next": null,
          "ending": "FRAGILE",
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "small_step_help_break_and_reinforcement",
            "function": "escape",
            "errorType": "partial_implementation"
          }
        },
        "C": {
          "text": "Say, “You can start the next activity after you finish at least part of this sentence.”",
          "score": 0,
          "consequence": "Jordan says, “No,” and remains away from the page while classmates transition.",
          "feedback": "Making the next activity conditional on writing does not supply the planned help or break response during escalation.",
          "wizard": "Another hurdle won’t help here.",
          "next": null,
          "ending": "FRAGILE",
          "meta": {
            "bipComponent": "Respond",
            "mechanism": "Conditional access to next activity",
            "function": "escape",
            "errorType": "contingency mismatch"
          }
        }
      }
    }
  }
});
})();