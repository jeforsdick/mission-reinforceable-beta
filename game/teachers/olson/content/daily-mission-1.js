/* daily-mission-1.js
 * Mission: Reinforceable Beta Content
 * Daily Mission: The Blank Page
 *
 * Purpose:
 * - Help beta testers practice applying Jordan's simple behavior plan.
 * - Routine: independent writing.
 * - Plan focus: help, break, small step, calm return.
 */

(function registerDailyMission1() {
  if (typeof POOL === "undefined") {
    throw new Error("POOL must be defined before loading daily-mission-1.js");
  }

  POOL.daily = POOL.daily || [];

  POOL.daily.push({
    id: "daily-blank-page-beta",
    title: "The Blank Page",
    expectedSteps: 5,
    start: "daily_step1_start",
    focus: "Practice Jordan's writing plan with help, break, small step, and calm return.",
    routine: "independent writing",
    functionPressure: ["escape"],
    bipTargets: ["Help", "Break", "Small Step", "Calm Return"],

    steps: {
      daily_step1_start: {
        text: `Writing time is about to begin.

The class just finished talking about favorite animals. Now everyone is supposed to write one sentence about an animal they like.

Jordan sits at their desk and looks at the blank paper. Their pencil is still on the table. They are quiet, but their shoulders look tense.

The plan says Jordan does best when the first step is small and clear.`,
        choices: {
          A: {
            text: `Quietly point to the sentence starter and say, "First, write one animal. You can ask for help if you get stuck."`,
            score: 10,
            feedback: `This follows the plan. You made the writing task smaller and gave Jordan a clear first step before refusal started.`,
            wizard: `Excellent spellwork. You made the blank page feel less powerful by giving Jordan one clear move.`,
            next: "daily_step2_supported",
            meta: {
              bipComponent: "Prevent",
              mechanism: "Small first step",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Tell Jordan, "You have lots of good ideas. Just write whatever you want about animals."`,
            score: 5,
            feedback: `This is encouraging, but it still leaves the task open-ended. Jordan may need a smaller first step or a way to ask for help.`,
            wizard: `A kind thought, but the path is still foggy. Jordan needs a clearer doorway into the writing task.`,
            next: "daily_step2_wobbly",
            meta: {
              bipComponent: "Prevent",
              mechanism: "Encouragement",
              errorType: "open-ended prompt",
              function: "escape"
            }
          },
          C: {
            text: `Say to the class, "Everyone should already know how to write one sentence by now."`,
            score: 0,
            feedback: `This adds public pressure and does not give Jordan a usable first step. It may make the writing task feel more stressful.`,
            wizard: `Oof. The room grows tense, and the blank page feels even bigger to Jordan.`,
            next: "daily_step2_escalated",
            meta: {
              bipComponent: "Respond",
              mechanism: "Public pressure",
              errorType: "public correction",
              function: "escape"
            }
          }
        }
      },

      daily_step2_supported: {
        text: `Jordan looks at the sentence starter and touches the pencil. They are not writing yet, but they are still looking at the paper.

After a few seconds, Jordan whispers, "What animal should I pick?"

This is a chance to prompt Jordan to ask for help and take one small step.`,
        choices: {
          A: {
            text: `Say, "You can ask for help. Try saying, 'Can you help me pick one animal?'"`,
            score: 10,
            feedback: `This follows the plan. You prompted Jordan to ask for help instead of getting stuck or refusing.`,
            wizard: `Strong choice. You turned a stuck moment into a help request Jordan can use again.`,
            next: "daily_step3_supported",
            meta: {
              bipComponent: "Teach",
              mechanism: "Help request",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "Think about the animals we talked about. I will give you a little more time."`,
            score: 5,
            feedback: `This gives Jordan time, but it does not clearly teach what to do next. Jordan still may not know how to ask for help or start.`,
            wizard: `The spell flickers. Time can help, but Jordan still needs a clear next step.`,
            next: "daily_step3_wobbly",
            meta: {
              bipComponent: "Teach",
              mechanism: "Wait time",
              errorType: "unclear next step",
              function: "escape"
            }
          },
          C: {
            text: `Say, "You need to choose by yourself. I already explained the assignment."`,
            score: 0,
            feedback: `This does not match the plan. It removes support when Jordan is showing they need help getting started.`,
            wizard: `Careful. Jordan reached toward support, but the bridge disappeared.`,
            next: "daily_step3_escalated",
            meta: {
              bipComponent: "Teach",
              mechanism: "Withheld support",
              errorType: "blocked help request",
              function: "escape"
            }
          }
        }
      },

      daily_step2_wobbly: {
        text: `Jordan looks at the paper, then looks around the room. A few students have already started writing.

Jordan taps the pencil and says quietly, "I don't know what to write."

Jordan is not refusing yet, but the task still feels too big.`,
        choices: {
          A: {
            text: `Move close and say, "You can write 'My animal is...' or ask me for help picking one."`,
            score: 10,
            feedback: `This follows the plan. You made the task smaller and gave Jordan a clear way to ask for help.`,
            wizard: `Nicely done. You turned the foggy path into two clear stepping stones.`,
            next: "daily_step3_supported",
            meta: {
              bipComponent: "Prevent",
              mechanism: "Small first step",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "It is okay to think for a minute. I will check back after I help the next table."`,
            score: 5,
            feedback: `This stays calm, which is helpful. But it does not prompt the help request or give Jordan a small writing step.`,
            wizard: `A calm pause can help, but Jordan may still be standing at the edge of the maze.`,
            next: "daily_step3_wobbly",
            meta: {
              bipComponent: "Prevent",
              mechanism: "Wait time",
              errorType: "missed prompt",
              function: "escape"
            }
          },
          C: {
            text: `Say, "You need to stop wasting time and start writing like everyone else."`,
            score: 0,
            feedback: `This adds pressure and comparison. It may increase Jordan's frustration instead of helping them use the plan.`,
            wizard: `Storm clouds gather. Jordan hears the pressure, but still does not have a way to start.`,
            next: "daily_step3_escalated",
            meta: {
              bipComponent: "Respond",
              mechanism: "Pressure",
              errorType: "comparison",
              function: "escape"
            }
          }
        }
      },

      daily_step2_escalated: {
        text: `Jordan pushes the paper a few inches away and sinks lower in the chair. A nearby student looks over.

Jordan mutters, "I'm not doing this."

The writing task is starting to feel public and stressful.`,
        choices: {
          A: {
            text: `Move close, keep your voice quiet, and say, "You can ask for help or take a short break."`,
            score: 10,
            feedback: `This follows the plan. You stayed calm and private while reminding Jordan of the planned help and break options.`,
            wizard: `Steady magic. You lowered the volume of the moment and showed Jordan a safer path.`,
            next: "daily_step3_wobbly",
            meta: {
              bipComponent: "Respond",
              mechanism: "Help or break",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "Take a minute, then we will try again," and let Jordan put their head down.`,
            score: 5,
            feedback: `This may reduce pressure briefly, but it does not clearly prompt Jordan to ask for a break or return to one small step.`,
            wizard: `A pause can help, but without a return path, Jordan may drift farther from writing.`,
            next: "daily_step3_escalated",
            meta: {
              bipComponent: "Respond",
              mechanism: "Pause",
              errorType: "unclear return path",
              function: "escape"
            }
          },
          C: {
            text: `Say, "If you do not write now, you will finish it during recess."`,
            score: 0,
            feedback: `This adds a threat and may turn writing into a power struggle. It does not help Jordan ask for help or a break.`,
            wizard: `The dragon wakes. Jordan may now fight the consequence instead of practicing the plan.`,
            next: "daily_step3_escalated",
            meta: {
              bipComponent: "Respond",
              mechanism: "Threat",
              errorType: "power struggle",
              function: "escape"
            }
          }
        }
      },

      daily_step3_supported: {
        text: `Jordan says, "Can you help me pick one animal?"

They are still not writing, but they used the help request from the plan. Their pencil is in their hand.

Now the response should reinforce the help request and keep the next step small.`,
        choices: {
          A: {
            text: `Say, "Great job asking for help. Pick dog or shark, then write just that first word."`,
            score: 10,
            feedback: `This follows the plan. You reinforced the help request and gave Jordan one small step back into writing.`,
            wizard: `Victory spark! Jordan used the skill, and you helped turn it into action.`,
            next: "daily_step4_supported",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Help request",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "Sure. You could write about dogs, sharks, birds, cats, frogs, or snakes."`,
            score: 5,
            feedback: `This is helpful, but too many choices may make the task feel big again. Jordan needs one small next step.`,
            wizard: `Helpful, but too many doors opened at once. Jordan needs the easiest doorway back in.`,
            next: "daily_step4_wobbly",
            meta: {
              bipComponent: "Teach",
              mechanism: "Choice making",
              errorType: "too many choices",
              function: "escape"
            }
          },
          C: {
            text: `Say, "See, that was easy. You should have just asked me the first time."`,
            score: 0,
            feedback: `This may punish the help request. Jordan used the plan, and the adult response should make that skill more likely next time.`,
            wizard: `Careful. The skill appeared, but that comment may scare it away next time.`,
            next: "daily_step4_wobbly",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Help request",
              errorType: "punished replacement behavior",
              function: "escape"
            }
          }
        }
      },

      daily_step3_wobbly: {
        text: `Jordan is still seated, but their paper is blank. They press the pencil hard into the desk and say, "I can't do it."

They have not fully refused, but they are getting closer.`,
        choices: {
          A: {
            text: `Say, "You can ask for help. Try, 'Can you help me start with one word?'"`,
            score: 10,
            feedback: `This follows the plan. You prompted a help request and focused on one small writing step.`,
            wizard: `Strong recovery. You gave Jordan words to use before frustration took over.`,
            next: "daily_step4_supported",
            meta: {
              bipComponent: "Teach",
              mechanism: "Help request",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "You are a good writer. Take a deep breath and try your best."`,
            score: 5,
            feedback: `This is kind, but it does not make the task smaller or prompt the planned help or break response.`,
            wizard: `A warm breeze, but not quite enough magic. Jordan still needs a concrete next step.`,
            next: "daily_step4_wobbly",
            meta: {
              bipComponent: "Prevent",
              mechanism: "Encouragement",
              errorType: "vague support",
              function: "escape"
            }
          },
          C: {
            text: `Take the pencil and write the first sentence for Jordan so the paper is no longer blank.`,
            score: 0,
            feedback: `This removes the hard part instead of helping Jordan practice the plan. Jordan may learn that waiting leads adults to do the writing.`,
            wizard: `The pencil moves, but the skill does not grow. Jordan escaped the task without learning the next step.`,
            next: "daily_step4_escalated",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adult completes task",
              errorType: "escape reinforced",
              function: "escape"
            }
          }
        }
      },

      daily_step3_escalated: {
        text: `Jordan puts their head down on the desk. The paper is pushed away. Another student whispers, "Jordan is not doing it."

Jordan says, "Leave me alone."

This is a high-risk moment for a power struggle.`,
        choices: {
          A: {
            text: `Quietly say, "You can take a short break. Then we will come back and write one word."`,
            score: 10,
            feedback: `This follows the plan. You stayed calm, avoided public correction, and gave Jordan a break with a clear return to writing.`,
            wizard: `Steady shield. You protected the routine without turning it into a public battle.`,
            next: "daily_step4_wobbly",
            meta: {
              bipComponent: "Respond",
              mechanism: "Break with return",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "I can see you are frustrated. I will give you space for a few minutes."`,
            score: 5,
            feedback: `This acknowledges frustration, which can help. But it does not include the planned break request or a clear return to one small writing step.`,
            wizard: `You softened the moment, but the return path is missing from the map.`,
            next: "daily_step4_escalated",
            meta: {
              bipComponent: "Respond",
              mechanism: "Space",
              errorType: "missing return path",
              function: "escape"
            }
          },
          C: {
            text: `Say, "Pick your head up. The class is waiting for you to make a better choice."`,
            score: 0,
            feedback: `This adds public pressure and may increase embarrassment. It does not help Jordan use the help or break option.`,
            wizard: `The spotlight grows too bright. Jordan may now work harder to escape the attention.`,
            next: "daily_step4_escalated",
            meta: {
              bipComponent: "Respond",
              mechanism: "Public pressure",
              errorType: "public correction",
              function: "escape"
            }
          }
        }
      },

      daily_step4_supported: {
        text: `Jordan chooses "shark" and writes the word "shark" on the paper. It is only one word, but it is the first step.

Jordan looks up as if checking whether this counts.

This is the moment to reinforce the small step and keep momentum going.`,
        choices: {
          A: {
            text: `Say, "You wrote the first word. That is the start. Now add 'is cool' or ask for help."`,
            score: 10,
            feedback: `This follows the plan. You reinforced the first small step and gave Jordan a simple next move.`,
            wizard: `Bright spark! One word became the bridge to the next part of the sentence.`,
            next: "daily_step5_supported",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Small first step",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "Good, now finish the whole sentence while I help someone else."`,
            score: 5,
            feedback: `This praises Jordan, but it makes the task big again too quickly. Jordan may still need one small next step.`,
            wizard: `The bridge appeared, but then stretched too far. Keep the next step small.`,
            next: "daily_step5_wobbly",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Praise",
              errorType: "demand too large",
              function: "escape"
            }
          },
          C: {
            text: `Say, "Finally. That took way too long, but at least you wrote something."`,
            score: 0,
            feedback: `This may discourage the small step. The plan says to reinforce progress so Jordan is more likely to try again.`,
            wizard: `Ouch. The tiny spark dims when progress is met with criticism.`,
            next: "daily_step5_wobbly",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Criticism",
              errorType: "punished progress",
              function: "escape"
            }
          }
        }
      },

      daily_step4_wobbly: {
        text: `Jordan is still near the task, but they are unsure. They write one letter, erase it, and then stop.

Jordan says, "I don't know if this is right."

The next choice can either build confidence or make writing feel risky again.`,
        choices: {
          A: {
            text: `Say, "Starting is what matters. Write one word first, and I can help with the sentence."`,
            score: 10,
            feedback: `This follows the plan. You reduced the pressure to be perfect and brought Jordan back to one small step.`,
            wizard: `Good recovery. You made the task safe enough for Jordan to try again.`,
            next: "daily_step5_supported",
            meta: {
              bipComponent: "Teach",
              mechanism: "Small first step",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "It is okay if it is not perfect. Just keep thinking and do your best."`,
            score: 5,
            feedback: `This lowers pressure, but it still does not give Jordan a concrete next step or prompt a help request.`,
            wizard: `The message is kind, but the next step is still hiding in the mist.`,
            next: "daily_step5_wobbly",
            meta: {
              bipComponent: "Teach",
              mechanism: "Encouragement",
              errorType: "vague support",
              function: "escape"
            }
          },
          C: {
            text: `Say, "You erased it again. You need to stop making this harder than it is."`,
            score: 0,
            feedback: `This adds criticism and may make Jordan more avoidant. It does not help Jordan use the plan.`,
            wizard: `The spell backfires. Jordan may now worry more about being wrong than about starting.`,
            next: "daily_step5_escalated",
            meta: {
              bipComponent: "Respond",
              mechanism: "Criticism",
              errorType: "increased pressure",
              function: "escape"
            }
          }
        }
      },

      daily_step4_escalated: {
        text: `Jordan leaves the writing area and stands near the bookshelf. The paper is still on the desk.

A few students are watching. Jordan says, "I'm not writing."

The plan says to stay calm, avoid public correction, and redirect to help or a short break.`,
        choices: {
          A: {
            text: `Walk nearby and quietly say, "You can take a short break here, then come back for one word."`,
            score: 10,
            feedback: `This follows the plan. You stayed private, allowed a short break, and kept the return expectation small and clear.`,
            wizard: `Calm footsteps. You brought the path to Jordan without chasing or arguing.`,
            next: "daily_step5_wobbly",
            meta: {
              bipComponent: "Respond",
              mechanism: "Break with return",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "I will give you space, but you still need to finish your writing later."`,
            score: 5,
            feedback: `This avoids arguing, but it does not teach Jordan what to do next or how to return to the task now.`,
            wizard: `The battle paused, but the mission is still unresolved.`,
            next: "daily_step5_escalated",
            meta: {
              bipComponent: "Respond",
              mechanism: "Space",
              errorType: "delayed re-entry",
              function: "escape"
            }
          },
          C: {
            text: `Say loudly, "Jordan, get back to your seat now. You are disrupting writing time."`,
            score: 0,
            feedback: `This makes the situation public and may increase refusal. It does not follow the calm, private response in the plan.`,
            wizard: `The spotlight flashes. Jordan may now defend against attention instead of returning to writing.`,
            next: "daily_step5_escalated",
            meta: {
              bipComponent: "Respond",
              mechanism: "Public correction",
              errorType: "public pressure",
              function: "escape"
            }
          }
        }
      },

      daily_step5_supported: {
        text: `Jordan has written one word and is looking at the sentence starter. They quietly say, "Can you help me finish it?"

Jordan is using the plan and is still connected to writing.

This is the final decision of the mission.`,
        choices: {
          A: {
            text: `Say, "Yes. Great asking for help. Add two words, then you are done with this sentence."`,
            score: 10,
            feedback: `This follows the plan. You reinforced the help request and kept the final writing step small and clear.`,
            wizard: `Mission magic! Jordan asked for help, stayed with the task, and had a clear finish line.`,
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Help request",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "Yes, I can help. Let's think of three different ways to make the sentence better."`,
            score: 5,
            feedback: `This is supportive, but it may make the task bigger than needed. Jordan needs a simple finish, not a more complicated writing task.`,
            wizard: `Helpful energy, but too many sparkles at once. Keep the finish line simple.`,
            meta: {
              bipComponent: "Teach",
              mechanism: "Help request",
              errorType: "task expanded",
              function: "escape"
            }
          },
          C: {
            text: `Say, "No, you need to finish the rest independently since I already helped you start."`,
            score: 0,
            feedback: `This may discourage Jordan from asking for help. The plan says help requests should be reinforced and shaped into small steps.`,
            wizard: `The door closes just as Jordan knocks. Next time, they may not ask.`,
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Help request",
              errorType: "blocked help request",
              function: "escape"
            }
          }
        }
      },

      daily_step5_wobbly: {
        text: `Jordan is back near the paper, but progress is fragile. They have either written one word, asked for help, or returned from a short break.

Jordan says, "Do I have to write the whole thing?"

This is the final decision of the mission.`,
        choices: {
          A: {
            text: `Say, "First write one word. Then I will help you add two more words."`,
            score: 10,
            feedback: `This follows the plan. You kept the demand small and gave Jordan a supported path back to writing.`,
            wizard: `A strong landing. You made the final step feel possible instead of overwhelming.`,
            meta: {
              bipComponent: "Teach",
              mechanism: "Small first step",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "Just do as much as you can before the timer goes off."`,
            score: 5,
            feedback: `This reduces pressure, but it is still unclear. Jordan may need a specific first step or help request.`,
            wizard: `The pressure drops, but the target is blurry. Jordan still needs a clear mark to aim for.`,
            meta: {
              bipComponent: "Prevent",
              mechanism: "Reduced pressure",
              errorType: "unclear target",
              function: "escape"
            }
          },
          C: {
            text: `Say, "Yes. Everyone else is writing a full sentence, so you need to do it too."`,
            score: 0,
            feedback: `This brings back comparison and pressure. It may make Jordan focus on escape instead of using the plan.`,
            wizard: `The mountain grows again. Jordan may see the whole sentence as too much to climb.`,
            meta: {
              bipComponent: "Respond",
              mechanism: "Comparison",
              errorType: "public pressure",
              function: "escape"
            }
          }
        }
      },

      daily_step5_escalated: {
        text: `Jordan is away from the writing task or has their head down. The paper is still mostly blank.

The class is moving on soon, and the adult feels pressure to get Jordan to comply quickly.

This is the final decision of the mission.`,
        choices: {
          A: {
            text: `Quietly say, "Take a short break. Then come back and write one word with help."`,
            score: 10,
            feedback: `This follows the plan. Even during escalation, you stayed calm, kept it private, and gave Jordan a small way back.`,
            wizard: `A calm shield at the finish. You did not win by force; you kept the path open.`,
            meta: {
              bipComponent: "Respond",
              mechanism: "Break with return",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "We can talk about this later. For now, sit quietly so writing time can end."`,
            score: 5,
            feedback: `This may reduce disruption, but it lets Jordan avoid writing without practicing the help, break, or return routine.`,
            wizard: `The room gets quieter, but the skill stays unpracticed.`,
            meta: {
              bipComponent: "Respond",
              mechanism: "Delay",
              errorType: "avoidance without practice",
              function: "escape"
            }
          },
          C: {
            text: `Say, "You lost your chance. Now the writing has to be finished during recess."`,
            score: 0,
            feedback: `This adds a consequence after escalation and may strengthen the power struggle. It does not teach Jordan how to return to writing.`,
            wizard: `The dragon claims the treasure. Jordan may remember the battle more than the writing plan.`,
            meta: {
              bipComponent: "Respond",
              mechanism: "Consequence",
              errorType: "power struggle",
              function: "escape"
            }
          }
        }
      }
    }
  });
})();
