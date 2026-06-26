/* wildcard-mission-1.js
 * Mission: Reinforceable Beta Content
 * Mystery Mission: The Schedule Switch
 *
 * Purpose:
 * - Help beta testers practice applying Jordan's behavior plan when the writing routine changes.
 * - Routine: independent writing after a schedule switch.
 * - Plan focus: help, break, small step, calm return.
 */

(function registerWildcardMission1() {
  if (typeof POOL === "undefined") {
    throw new Error("POOL must be defined before loading wildcard-mission-1.js");
  }

  POOL.wild = POOL.wild || [];

  POOL.wild.push({
    id: "mystery-schedule-switch-beta",
    title: "The Schedule Switch",
    expectedSteps: 5,
    start: "mystery_step1_start",
    focus: "Practice Jordan's writing plan when the routine does not go as expected.",
    routine: "independent writing after a schedule switch",
    functionPressure: ["escape", "uncertainty"],
    bipTargets: ["Help", "Break", "Small Step", "Calm Return"],

    steps: {
      mystery_step1_start: {
        text: `Today's schedule changed.

The class had an assembly in the morning, so independent writing is happening right after lunch instead of at the usual time.

Jordan walks in, sees writing folders on the desks, and stops near their chair. They frown and say, "I thought we already did work today."

The plan says Jordan does best when the first step is small, clear, and predictable.`,
        choices: {
          A: {
            text: `Quietly say, "The schedule changed. First, write one animal. You can ask for help if you get stuck."`,
            score: 10,
            feedback: `This follows the plan. You explained the change briefly and gave Jordan a small, clear first step.`,
            wizard: `Mystery managed. You named the schedule switch without making it a battle, then showed Jordan the first step.`,
            next: "mystery_step2_supported",
            meta: {
              bipComponent: "Prevent",
              mechanism: "Small first step",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "I know the schedule is different, but writing will only take a few minutes."`,
            score: 5,
            feedback: `This acknowledges the change, which helps. But Jordan still needs a concrete first step or a way to ask for help.`,
            wizard: `A helpful clue, but the map is incomplete. Jordan knows writing is happening, but not how to begin.`,
            next: "mystery_step2_wobbly",
            meta: {
              bipComponent: "Prevent",
              mechanism: "Schedule preview",
              errorType: "missing first step",
              function: "escape"
            }
          },
          C: {
            text: `Say, "The schedule changed for everyone. Please stop complaining and sit down."`,
            score: 0,
            feedback: `This adds pressure and may make the change feel more stressful. It does not help Jordan start or use the plan.`,
            wizard: `The mystery fog thickens. Jordan now has the schedule change and the correction to escape from.`,
            next: "mystery_step2_escalated",
            meta: {
              bipComponent: "Respond",
              mechanism: "Correction",
              errorType: "increased pressure",
              function: "escape"
            }
          }
        }
      },

      mystery_step2_supported: {
        text: `Jordan sits down and looks at the writing folder.

Usually, Jordan uses a sentence starter card, but today the card is missing from the desk. Jordan looks under the folder and whispers, "Where is my card?"

Jordan is still calm, but the missing support could make the task feel too hard.`,
        choices: {
          A: {
            text: `Say, "Good noticing. I can write the starter here: 'My animal is...' Then you pick one animal."`,
            score: 10,
            feedback: `This follows the plan. You replaced the missing support and kept the next step small.`,
            wizard: `Resourceful magic. When the tool vanished, you rebuilt the bridge.`,
            next: "mystery_step3_supported",
            meta: {
              bipComponent: "Prevent",
              mechanism: "Restore support",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "I will look for the card in a minute. Try to think of your animal while I check."`,
            score: 5,
            feedback: `This is calm, but it delays the support Jordan needs. Jordan may stay stuck while waiting.`,
            wizard: `The search begins, but Jordan is still facing the blank page without the missing key.`,
            next: "mystery_step3_wobbly",
            meta: {
              bipComponent: "Prevent",
              mechanism: "Delayed support",
              errorType: "support delayed",
              function: "escape"
            }
          },
          C: {
            text: `Say, "You do not need the card today. Just write the sentence without it."`,
            score: 0,
            feedback: `This removes a planned support during a changed routine. Jordan may feel less able to start.`,
            wizard: `The bridge disappears. Jordan expected a support, and now the task looks wider.`,
            next: "mystery_step3_escalated",
            meta: {
              bipComponent: "Prevent",
              mechanism: "Removed support",
              errorType: "missing support",
              function: "escape"
            }
          }
        }
      },

      mystery_step2_wobbly: {
        text: `Jordan sits halfway in the chair but does not open the writing folder.

They say, "I don't like when the schedule changes." A few other students are already writing.

Jordan is not refusing yet, but the changed routine is making the task feel uncertain.`,
        choices: {
          A: {
            text: `Say, "Changes can feel hard. First, pick one animal, then you can ask for help with the sentence."`,
            score: 10,
            feedback: `This follows the plan. You acknowledged the change and brought Jordan back to one small writing step.`,
            wizard: `Nice recovery. You named the wobble, then gave Jordan a clear next move.`,
            next: "mystery_step3_supported",
            meta: {
              bipComponent: "Prevent",
              mechanism: "Small first step",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "I understand. Take a minute to get used to the change, then try your writing."`,
            score: 5,
            feedback: `This is understanding, but it does not provide a specific first step or prompt Jordan to ask for help.`,
            wizard: `A gentle pause, but the path back to writing is still hidden.`,
            next: "mystery_step3_wobbly",
            meta: {
              bipComponent: "Prevent",
              mechanism: "Pause",
              errorType: "unclear first step",
              function: "escape"
            }
          },
          C: {
            text: `Say, "Schedules change all the time. You need to learn to deal with it."`,
            score: 0,
            feedback: `This may increase frustration and does not help Jordan use the writing plan.`,
            wizard: `The spell turns sharp. Jordan may focus on the unfairness instead of the first step.`,
            next: "mystery_step3_escalated",
            meta: {
              bipComponent: "Respond",
              mechanism: "Correction",
              errorType: "invalidating change",
              function: "escape"
            }
          }
        }
      },

      mystery_step2_escalated: {
        text: `Jordan drops into the chair but does not touch the folder.

They say, "No. I'm not doing writing after lunch." Their voice is louder now, and two students look over.

The schedule change has become public and stressful.`,
        choices: {
          A: {
            text: `Move closer and quietly say, "You can take a short break, then come back and write one animal."`,
            score: 10,
            feedback: `This follows the plan. You stayed calm and private while giving Jordan a planned break and a small return step.`,
            wizard: `Steady shield. You made the mystery smaller instead of louder.`,
            next: "mystery_step3_wobbly",
            meta: {
              bipComponent: "Respond",
              mechanism: "Break with return",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "I know this is frustrating. Sit quietly for now and we will talk in a few minutes."`,
            score: 5,
            feedback: `This may calm the moment, but it does not clearly prompt a break request or a return to one small writing step.`,
            wizard: `The noise settles, but the mission path is still unfinished.`,
            next: "mystery_step3_escalated",
            meta: {
              bipComponent: "Respond",
              mechanism: "Pause",
              errorType: "missing return path",
              function: "escape"
            }
          },
          C: {
            text: `Say, "You are not skipping writing just because lunch is over. Open your folder now."`,
            score: 0,
            feedback: `This increases pressure and may turn the schedule change into a power struggle.`,
            wizard: `The lock clicks shut. Jordan may now fight the demand instead of using the plan.`,
            next: "mystery_step3_escalated",
            meta: {
              bipComponent: "Respond",
              mechanism: "Demand",
              errorType: "power struggle",
              function: "escape"
            }
          }
        }
      },

      mystery_step3_supported: {
        text: `Jordan picks "shark" and looks at the sentence starter.

Just then, a nearby student says, "Sharks are boring. Everyone writes about sharks."

Jordan freezes and pulls the pencil back.

The plan says to keep writing safe, private, and small.`,
        choices: {
          A: {
            text: `Quietly say, "Shark is your choice. Write 'shark' first, and I will help with the rest."`,
            score: 10,
            feedback: `This follows the plan. You protected Jordan's small step and kept the focus on starting.`,
            wizard: `Protective magic. You kept the peer comment from knocking Jordan off the bridge.`,
            next: "mystery_step4_supported",
            meta: {
              bipComponent: "Respond",
              mechanism: "Private support",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "You can pick a different animal if you want. There are lots of good choices."`,
            score: 5,
            feedback: `This gives Jordan a choice, but it may reopen the decision and make the task feel bigger again.`,
            wizard: `Kind, but the doorway widened too much. Jordan may get stuck choosing all over again.`,
            next: "mystery_step4_wobbly",
            meta: {
              bipComponent: "Teach",
              mechanism: "Choice making",
              errorType: "choice reopened",
              function: "escape"
            }
          },
          C: {
            text: `Say to the nearby student, "Stop being rude. Now Jordan feels bad because of you."`,
            score: 0,
            feedback: `This makes the moment more public. Jordan may feel more embarrassed and less likely to keep writing.`,
            wizard: `The spotlight flashes. The peer comment has become a classroom event.`,
            next: "mystery_step4_escalated",
            meta: {
              bipComponent: "Respond",
              mechanism: "Public correction",
              errorType: "peer attention",
              function: "escape"
            }
          }
        }
      },

      mystery_step3_wobbly: {
        text: `Jordan is still seated, but their folder is only half open.

They say, "I can't find my sentence starter." Then they push the folder away a little.

The missing support is making the changed routine harder.`,
        choices: {
          A: {
            text: `Say, "I can help. Let's write the starter together: 'My animal is...' Then pick one animal."`,
            score: 10,
            feedback: `This follows the plan. You restored the support and gave Jordan one small next step.`,
            wizard: `Good recovery. You found the missing piece and placed it back on the path.`,
            next: "mystery_step4_supported",
            meta: {
              bipComponent: "Teach",
              mechanism: "Restore support",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "Look carefully in your folder. It is probably in there somewhere."`,
            score: 5,
            feedback: `This may help Jordan search, but it does not reduce the writing demand or prompt a help request.`,
            wizard: `The search spell may work, but Jordan still needs support to begin writing.`,
            next: "mystery_step4_wobbly",
            meta: {
              bipComponent: "Teach",
              mechanism: "Search prompt",
              errorType: "missed help prompt",
              function: "escape"
            }
          },
          C: {
            text: `Say, "You lost the card, so today you will need to write without it."`,
            score: 0,
            feedback: `This adds blame and removes support. It may increase avoidance instead of helping Jordan start.`,
            wizard: `The missing card becomes a punishment. Jordan's path back to writing grows rocky.`,
            next: "mystery_step4_escalated",
            meta: {
              bipComponent: "Respond",
              mechanism: "Blame",
              errorType: "support removed",
              function: "escape"
            }
          }
        }
      },

      mystery_step3_escalated: {
        text: `Jordan pushes the folder away and says, "This is not fair. I'm not writing."

They turn their body away from the desk. The changed schedule, missing support, and attention from peers are piling up.

The plan says to stay brief, calm, private, and return to help or a short break.`,
        choices: {
          A: {
            text: `Quietly say, "You can take a short break, then I will help you write one word."`,
            score: 10,
            feedback: `This follows the plan. You did not argue about fairness; you gave Jordan a calm break and a small return step.`,
            wizard: `Wise move. You stepped around the argument and reopened the path to writing.`,
            next: "mystery_step4_wobbly",
            meta: {
              bipComponent: "Respond",
              mechanism: "Break with return",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "I hear you. This schedule is different. Take some space for now."`,
            score: 5,
            feedback: `This validates Jordan's frustration, but it does not include the planned return to one small writing step.`,
            wizard: `The feeling is named, but the next step is still missing from the spellbook.`,
            next: "mystery_step4_escalated",
            meta: {
              bipComponent: "Respond",
              mechanism: "Space",
              errorType: "missing return step",
              function: "escape"
            }
          },
          C: {
            text: `Say, "Fair or not, the class is writing. You need to do the same assignment."`,
            score: 0,
            feedback: `This adds pressure and comparison. It may make Jordan focus on escaping the demand.`,
            wizard: `The mountain grows. Jordan may now see writing as something to resist, not rejoin.`,
            next: "mystery_step4_escalated",
            meta: {
              bipComponent: "Respond",
              mechanism: "Comparison",
              errorType: "power struggle",
              function: "escape"
            }
          }
        }
      },

      mystery_step4_supported: {
        text: `Jordan writes the word "shark" after the sentence starter.

The class is a little noisy because students are putting lunch boxes away. Jordan covers one ear and stops writing.

Jordan says, "It's too loud."

The routine is still disrupted, but Jordan has started.`,
        choices: {
          A: {
            text: `Say, "You started. Nice work. Take one quiet breath, then add two words with my help."`,
            score: 10,
            feedback: `This follows the plan. You reinforced the start, acknowledged the barrier, and kept the next step small.`,
            wizard: `Calm focus spell. You noticed the noise without letting it erase Jordan's progress.`,
            next: "mystery_step5_supported",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Small next step",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "The room will quiet down soon. Wait a minute, then keep writing."`,
            score: 5,
            feedback: `This may be true, but it does not reinforce Jordan's progress or give a clear next writing step.`,
            wizard: `Waiting may help, but the thread of momentum is getting thin.`,
            next: "mystery_step5_wobbly",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Wait time",
              errorType: "missed reinforcement",
              function: "escape"
            }
          },
          C: {
            text: `Say, "The room is not that loud. You need to stop getting distracted."`,
            score: 0,
            feedback: `This dismisses Jordan's concern and adds pressure. It may make Jordan more likely to avoid the task.`,
            wizard: `The noise goblin grows. Jordan's concern was brushed aside instead of supported.`,
            next: "mystery_step5_wobbly",
            meta: {
              bipComponent: "Respond",
              mechanism: "Dismissal",
              errorType: "invalidated barrier",
              function: "escape"
            }
          }
        }
      },

      mystery_step4_wobbly: {
        text: `Jordan is near the task but still uncertain.

They touch the pencil, then put it down. They say, "Can I just do it later?"

The schedule change has made writing feel optional to Jordan.`,
        choices: {
          A: {
            text: `Say, "First write one word with help. Then you can be done with this first step."`,
            score: 10,
            feedback: `This follows the plan. You kept the expectation small and helped Jordan return to writing now.`,
            wizard: `Good anchor. You kept the mission from floating away into "later."`,
            next: "mystery_step5_supported",
            meta: {
              bipComponent: "Teach",
              mechanism: "Small first step",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "Maybe later, but try to get something down before we move on."`,
            score: 5,
            feedback: `This keeps writing on the table, but it is still vague. Jordan needs a clear first step or help request.`,
            wizard: `The goal is nearby, but the target is blurry.`,
            next: "mystery_step5_wobbly",
            meta: {
              bipComponent: "Teach",
              mechanism: "Encouragement",
              errorType: "unclear target",
              function: "escape"
            }
          },
          C: {
            text: `Say, "No, you had your chance earlier. Now you need to finish it all."`,
            score: 0,
            feedback: `This increases pressure and makes the task bigger. It does not match the plan's small-step approach.`,
            wizard: `The path turns steep. Jordan asked for escape, and the response made the climb bigger.`,
            next: "mystery_step5_escalated",
            meta: {
              bipComponent: "Respond",
              mechanism: "Demand",
              errorType: "demand too large",
              function: "escape"
            }
          }
        }
      },

      mystery_step4_escalated: {
        text: `Jordan leaves the desk and stands near the cubbies.

They say, "I'm done. I'm not writing after lunch." A few students are now watching.

The adult needs to respond without making the schedule change more public.`,
        choices: {
          A: {
            text: `Walk nearby and quietly say, "Take a short break here, then come back for one word with help."`,
            score: 10,
            feedback: `This follows the plan. You stayed private, allowed a short break, and gave Jordan a small return step.`,
            wizard: `Calm footsteps through the chaos. You brought the plan to Jordan without chasing the argument.`,
            next: "mystery_step5_wobbly",
            meta: {
              bipComponent: "Respond",
              mechanism: "Break with return",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "You can stand there quietly, but writing still needs to happen sometime today."`,
            score: 5,
            feedback: `This may prevent more disruption, but it does not teach Jordan how to return to the task now.`,
            wizard: `The moment pauses, but the plan has not fully appeared.`,
            next: "mystery_step5_escalated",
            meta: {
              bipComponent: "Respond",
              mechanism: "Delay",
              errorType: "delayed re-entry",
              function: "escape"
            }
          },
          C: {
            text: `Say loudly, "Jordan, return to your seat. You are making this harder for everyone."`,
            score: 0,
            feedback: `This makes the situation public and may increase embarrassment or refusal.`,
            wizard: `The spotlight burns brighter. Jordan may now work harder to escape the attention.`,
            next: "mystery_step5_escalated",
            meta: {
              bipComponent: "Respond",
              mechanism: "Public correction",
              errorType: "public pressure",
              function: "escape"
            }
          }
        }
      },

      mystery_step5_supported: {
        text: `Jordan has written the first word and is back in the writing routine.

They say, "Can you help me finish before we go to centers?"

There is not much time left, but Jordan is asking for help.

This is the final decision of the mission.`,
        choices: {
          A: {
            text: `Say, "Yes. Great asking for help. Add two words, and that will finish this sentence."`,
            score: 10,
            feedback: `This follows the plan. You reinforced the help request and gave Jordan a simple finish line.`,
            wizard: `Mystery solved. Jordan used the plan even when the schedule changed.`,
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Help request",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "Yes. Let's make it your best sentence before centers start."`,
            score: 5,
            feedback: `This is supportive, but it may make the task bigger than needed. Jordan needs a small, clear finish.`,
            wizard: `A shiny goal, but maybe too shiny. Keep the ending simple.`,
            meta: {
              bipComponent: "Teach",
              mechanism: "Expanded task",
              errorType: "task expanded",
              function: "escape"
            }
          },
          C: {
            text: `Say, "No, we are out of time because you waited too long to start."`,
            score: 0,
            feedback: `This may punish the help request. Jordan used the plan, and the response should make that skill more likely next time.`,
            wizard: `The door closes at the finish line. Jordan may not ask for help next time.`,
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Help request",
              errorType: "punished replacement behavior",
              function: "escape"
            }
          }
        }
      },

      mystery_step5_wobbly: {
        text: `Jordan is back near the paper, but the routine still feels unsettled.

They say, "I don't like doing writing at this time."

They are not fully refusing, but they are not writing yet either.

This is the final decision of the mission.`,
        choices: {
          A: {
            text: `Say, "The time changed, but the first step is the same: one word, with help if you need it."`,
            score: 10,
            feedback: `This follows the plan. You acknowledged the schedule change and returned Jordan to one small, familiar step.`,
            wizard: `A strong landing. The schedule changed, but the plan stayed steady.`,
            meta: {
              bipComponent: "Teach",
              mechanism: "Small first step",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "I know. Let's just try to do a little bit before the next activity."`,
            score: 5,
            feedback: `This is calm, but "a little bit" may still be unclear. Jordan needs a specific first step.`,
            wizard: `Gentle words, but the target is still cloudy.`,
            meta: {
              bipComponent: "Teach",
              mechanism: "Encouragement",
              errorType: "unclear target",
              function: "escape"
            }
          },
          C: {
            text: `Say, "You do not get to choose when writing happens. Start now."`,
            score: 0,
            feedback: `This adds pressure and may make Jordan focus on control instead of returning to writing.`,
            wizard: `The control battle appears. Jordan may fight the schedule instead of using the plan.`,
            meta: {
              bipComponent: "Respond",
              mechanism: "Demand",
              errorType: "control battle",
              function: "escape"
            }
          }
        }
      },

      mystery_step5_escalated: {
        text: `Jordan is away from the desk or has shut down at the desk.

The writing folder is still open, but the page is mostly blank. The class is almost ready to move to the next activity.

The adult feels pressure to make Jordan finish quickly.

This is the final decision of the mission.`,
        choices: {
          A: {
            text: `Quietly say, "Take a short break. Then write one word with help before we move on."`,
            score: 10,
            feedback: `This follows the plan. Even late in the routine, you kept the response calm, private, and focused on one small step.`,
            wizard: `A calm shield at the edge of the mystery. You kept the path open without forcing the gate.`,
            meta: {
              bipComponent: "Respond",
              mechanism: "Break with return",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "You can skip this sentence today, but tomorrow you need to start right away."`,
            score: 5,
            feedback: `This may end the conflict, but it lets Jordan escape the task without practicing the help, break, or return routine.`,
            wizard: `The room quiets, but the skill does not get stronger.`,
            meta: {
              bipComponent: "Respond",
              mechanism: "Skip task",
              errorType: "escape without practice",
              function: "escape"
            }
          },
          C: {
            text: `Say, "You lost your chance. You will finish this instead of going to centers."`,
            score: 0,
            feedback: `This adds a consequence after escalation and may strengthen the power struggle. It does not teach Jordan how to return to writing.`,
            wizard: `The mystery becomes a battle. Jordan may remember the consequence more than the plan.`,
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
