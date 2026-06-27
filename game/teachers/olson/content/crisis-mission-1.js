/* crisis-mission-1.js
 * Mission: Reinforceable Beta Content
 * Crisis Mission: The Writing Meltdown
 *
 * Purpose:
 * - Help beta testers practice applying Jordan's behavior plan when writing refusal escalates quickly.
 * - Routine: independent writing.
 * - Plan focus: help, break, small step, calm return.
 */

(function registerCrisisMission1() {
  if (typeof POOL === "undefined") {
    throw new Error("POOL must be defined before loading crisis-mission-1.js");
  }

  POOL.crisis = POOL.crisis || [];

  POOL.crisis.push({
    id: "crisis-writing-meltdown-beta",
    title: "The Writing Meltdown",
    expectedSteps: 5,
    start: "crisis_step1_start",
    focus: "Practice Jordan's writing plan when refusal escalates quickly.",
    routine: "independent writing",
    functionPressure: ["escape", "public attention"],
    bipTargets: ["Help", "Break", "Small Step", "Calm Return"],

    steps: {
      crisis_step1_start: {
        text: `Writing time has just started.

The class is supposed to write one sentence about an animal they like. Most students are opening their folders.

Jordan looks at the blank paper, pushes it away, and says loudly, "No. I'm not doing this."

A few students turn to look.

The plan says to stay calm and private, avoid public correction, and redirect Jordan to help, a short break, or one small writing step.`,
        choices: {
          A: {
            text: `Move closer and quietly say, "You can ask for help or take a short break, then we will start with one word."`,
            score: 10,
            feedback: `This follows the plan. You stayed calm and private while giving Jordan the planned help and break options.`,
            wizard: `Steady shield. You lowered the heat of the moment and kept the path back to writing open.`,
            next: "crisis_step2_supported",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Help or break",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "Take a minute to calm down, and then we will talk about writing."`,
            score: 5,
            feedback: `This may reduce pressure, but it does not clearly prompt Jordan to ask for a break or return to one small writing step.`,
            wizard: `A pause can help, but the return path is still missing from the map.`,
            next: "crisis_step2_wobbly",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Pause",
              errorType: "missing return path",
              function: "escape"
            }
          },
          C: {
            text: `Say, "That is not how we talk during writing. You need to fix your attitude and start."`,
            score: 0,
            feedback: `This adds public correction and pressure. It may turn the writing task into a power struggle.`,
            wizard: `The dragon wakes. Jordan now has two battles: the writing task and the correction.`,
            next: "crisis_step2_escalated",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Public correction",
              errorType: "power struggle",
              function: "escape"
            }
          }
        }
      },

      crisis_step2_supported: {
        text: `Jordan is still upset, but their voice gets quieter.

They say, "I hate writing." Their paper is pushed away, but they are still seated.

The plan says to help Jordan use a replacement response instead of refusing.`,
        choices: {
          A: {
            text: `Say, "You can say, 'Can I take a break?' Then we will come back and write one word."`,
            score: 10,
            feedback: `This follows the plan. You gave Jordan the words for a break request and included a small return step.`,
            wizard: `Good crisis magic. You turned refusal into a skill Jordan can practice.`,
            next: "crisis_step3_supported",
            meta: {
              bipComponent: "Teach",
              mechanism: "Break request",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "I know writing is hard. Sit quietly for a minute and we will try again soon."`,
            score: 5,
            feedback: `This is calm and validating, but it does not teach Jordan how to ask for a break or help.`,
            wizard: `The flames lower, but the plan spell is only half-cast.`,
            next: "crisis_step3_wobbly",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Validation",
              errorType: "missing replacement prompt",
              function: "escape"
            }
          },
          C: {
            text: `Say, "You do not have to like writing, but you do have to finish the whole sentence."`,
            score: 0,
            feedback: `This makes the task feel bigger during an already escalated moment. It may increase refusal.`,
            wizard: `The mountain grows taller. Jordan may focus on escape instead of one small step.`,
            next: "crisis_step3_escalated",
            meta: {
              bipComponent: "Respond",
              mechanism: "Demand",
              errorType: "demand too large",
              function: "escape"
            }
          }
        }
      },

      crisis_step2_wobbly: {
        text: `Jordan puts their head down on the desk.

They are quieter now, but they are not connected to writing. The paper is still pushed away.

A nearby student whispers, "Jordan is mad."

This is a moment to avoid making the situation more public.`,
        choices: {
          A: {
            text: `Quietly say, "You can take a short break. Then come back and write one animal with help."`,
            score: 10,
            feedback: `This follows the plan. You kept the response private and gave Jordan a planned break with a clear return step.`,
            wizard: `Steady and quiet. You kept the spotlight small and the path back visible.`,
            next: "crisis_step3_supported",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Break with return",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "I will give you space for a few minutes so you can calm down."`,
            score: 5,
            feedback: `This may calm the moment, but it does not include the planned break request or a return to writing.`,
            wizard: `Space can help, but without a return bridge, Jordan may stay away from the task.`,
            next: "crisis_step3_wobbly",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Space",
              errorType: "missing return path",
              function: "escape"
            }
          },
          C: {
            text: `Say, "Please pick your head up. Everyone is trying to work."`,
            score: 0,
            feedback: `This makes the moment public and may increase embarrassment. It does not help Jordan use the plan.`,
            wizard: `The spotlight grows brighter. Jordan may now try harder to disappear from the task.`,
            next: "crisis_step3_escalated",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Public correction",
              errorType: "public pressure",
              function: "escape"
            }
          }
        }
      },

      crisis_step2_escalated: {
        text: `Jordan shoves the paper farther away. The pencil rolls off the desk.

Jordan says, "I said no!" and turns away from the writing area.

Several students are watching now.

The adult needs to avoid arguing and return to the planned help or break routine.`,
        choices: {
          A: {
            text: `Move nearby and quietly say, "You can take a short break, then come back for one word with help."`,
            score: 10,
            feedback: `This follows the plan. You avoided arguing and gave Jordan a calm, small way back to the routine.`,
            wizard: `Crisis shield raised. You did not chase the argument; you pointed back to the plan.`,
            next: "crisis_step3_wobbly",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Break with return",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "I can see this is too much right now. Sit quietly and we will pause writing."`,
            score: 5,
            feedback: `This may reduce the immediate conflict, but it lets Jordan avoid writing without practicing the break-and-return routine.`,
            wizard: `The storm quiets, but the skill does not grow stronger.`,
            next: "crisis_step3_escalated",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Pause writing",
              errorType: "escape without practice",
              function: "escape"
            }
          },
          C: {
            text: `Say, "If you throw materials again, you will lose recess and call home."`,
            score: 0,
            feedback: `This adds a threat and may escalate the power struggle. It does not help Jordan ask for help, ask for a break, or return to one small step.`,
            wizard: `The dragon breathes fire. Jordan may now fight the consequence instead of the writing task.`,
            next: "crisis_step3_escalated",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Threat",
              errorType: "power struggle",
              function: "escape"
            }
          }
        }
      },

      crisis_step3_supported: {
        text: `Jordan quietly says, "Can I take a break?"

They are still upset, but they used the break request from the plan.

The next response should reinforce the break request and keep the return step clear.`,
        choices: {
          A: {
            text: `Say, "Yes. Good asking for a break. Two minutes, then we come back for one word."`,
            score: 10,
            feedback: `This follows the plan. You reinforced the break request and clearly connected the break to returning to writing.`,
            wizard: `Victory spark in the storm. Jordan used the plan, and you honored it with a clear return.`,
            next: "crisis_step4_supported",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Break request",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "Yes. Take a break until you feel ready to write."`,
            score: 5,
            feedback: `This honors the break request, but it does not give a clear return time or small writing step.`,
            wizard: `The break door opens, but the path back is still a little blurry.`,
            next: "crisis_step4_wobbly",
            meta: {
              bipComponent: "Respond",
              mechanism: "Break",
              errorType: "unclear return path",
              function: "escape"
            }
          },
          C: {
            text: `Say, "No, you already wasted time. Breaks are for students who try first."`,
            score: 0,
            feedback: `This may punish the replacement behavior. Jordan asked for a break, and the plan says that skill should be reinforced and shaped.`,
            wizard: `The door slams shut. Jordan may not ask for the planned break next time.`,
            next: "crisis_step4_escalated",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Break request",
              errorType: "punished replacement behavior",
              function: "escape"
            }
          }
        }
      },

      crisis_step3_wobbly: {
        text: `Jordan is quieter but still not writing.

They pick up the pencil, then put it down. They say, "I don't know what to write, and I don't want to."

The crisis is cooling, but Jordan still needs a small, supported step.`,
        choices: {
          A: {
            text: `Say, "You can ask for help. Try, 'Can you help me pick one animal?'"`,
            score: 10,
            feedback: `This follows the plan. You prompted a help request and made the next step specific.`,
            wizard: `Good recovery. You turned the cooled-down moment into a chance to practice the skill.`,
            next: "crisis_step4_supported",
            meta: {
              bipComponent: "Teach",
              mechanism: "Help request",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "I know you do not want to. Just write anything, and it does not have to be perfect."`,
            score: 5,
            feedback: `This lowers pressure, but "anything" may still feel too open-ended. Jordan needs one small first step.`,
            wizard: `Kind words, but the target is still cloudy.`,
            next: "crisis_step4_wobbly",
            meta: {
              bipComponent: "Teach",
              mechanism: "Encouragement",
              errorType: "open-ended prompt",
              function: "escape"
            }
          },
          C: {
            text: `Say, "You are making this much harder than it needs to be."`,
            score: 0,
            feedback: `This adds criticism and may bring the escalation back. It does not help Jordan use the plan.`,
            wizard: `The embers flare. Jordan may now defend against the comment instead of starting.`,
            next: "crisis_step4_escalated",
            meta: {
              bipComponent: "Respond",
              mechanism: "Criticism",
              errorType: "re-escalation risk",
              function: "escape"
            }
          }
        }
      },

      crisis_step3_escalated: {
        text: `Jordan gets up and walks toward the classroom library.

They are not running, but they have left the writing area. Their paper is still blank.

A few students watch to see what the adult will do.

The plan says to stay calm, avoid public correction, and redirect to a short break with a return step.`,
        choices: {
          A: {
            text: `Walk nearby and quietly say, "You can take your break here, then come back for one word with help."`,
            score: 10,
            feedback: `This follows the plan. You treated the movement as a break opportunity and kept the return to writing small and clear.`,
            wizard: `Calm footsteps. You followed with the plan, not with a power struggle.`,
            next: "crisis_step4_wobbly",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Break with return",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "You can stay by the library until you are calm enough to come back."`,
            score: 5,
            feedback: `This gives space, but it does not include a clear return step or prompt Jordan to use the planned break request.`,
            wizard: `The storm has space to settle, but the bridge back is still unfinished.`,
            next: "crisis_step4_escalated",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Space",
              errorType: "missing return step",
              function: "escape"
            }
          },
          C: {
            text: `Say loudly, "Jordan, return to your desk right now. You are refusing to work."`,
            score: 0,
            feedback: `This makes the refusal public and may increase escape behavior. It does not follow the calm, private response in the plan.`,
            wizard: `The spotlight burns. Jordan may now resist the attention as much as the writing.`,
            next: "crisis_step4_escalated",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Public correction",
              errorType: "public pressure",
              function: "escape"
            }
          }
        }
      },

      crisis_step4_supported: {
        text: `Jordan takes the short break and returns to the desk.

They are still cautious, but they say, "Can you help me pick one?"

Jordan used the plan after a difficult start.`,
        choices: {
          A: {
            text: `Say, "Great asking for help. Pick dog or shark, then write just the first word."`,
            score: 10,
            feedback: `This follows the plan. You reinforced the help request and gave Jordan one small step into writing.`,
            wizard: `Crisis breakthrough! The plan held, and Jordan found the doorway back.`,
            next: "crisis_step5_supported",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Help request",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "Sure. Let's talk through a few different animal ideas together."`,
            score: 5,
            feedback: `This is supportive, but it may make the task bigger again. Jordan needs a simple first choice and one small step.`,
            wizard: `Helpful, but the doorway widened too much. Keep the return step tiny.`,
            next: "crisis_step5_wobbly",
            meta: {
              bipComponent: "Teach",
              mechanism: "Choice making",
              errorType: "too many choices",
              function: "escape"
            }
          },
          C: {
            text: `Say, "I will help this time, but next time you need to do it without all this drama."`,
            score: 0,
            feedback: `This may shame the return to the task. Jordan used the plan and needs that effort reinforced.`,
            wizard: `The bridge shakes. Jordan came back, but the comment makes the path feel risky.`,
            next: "crisis_step5_wobbly",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Help request",
              errorType: "shamed re-entry",
              function: "escape"
            }
          }
        }
      },

      crisis_step4_wobbly: {
        text: `Jordan is back near the writing task, but they are still fragile.

They look at the paper and say, "Only one word?"

They seem willing, but they need the adult to keep the step small.`,
        choices: {
          A: {
            text: `Say, "Yes. One word first. Then I can help you add two more words."`,
            score: 10,
            feedback: `This follows the plan. You confirmed the small step and offered help for what comes next.`,
            wizard: `Strong landing. You kept the task small enough for Jordan to approach.`,
            next: "crisis_step5_supported",
            meta: {
              bipComponent: "Teach",
              mechanism: "Small first step",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "Start with one word, and then we will see how much more you can do."`,
            score: 5,
            feedback: `This starts small, but the next expectation is unclear. Jordan may worry the task will grow again.`,
            wizard: `The first step is there, but the finish line is still moving.`,
            next: "crisis_step5_wobbly",
            meta: {
              bipComponent: "Teach",
              mechanism: "Small first step",
              errorType: "unclear finish line",
              function: "escape"
            }
          },
          C: {
            text: `Say, "One word is not enough. You still need to write the full sentence."`,
            score: 0,
            feedback: `This makes the task bigger right when Jordan is considering re-entry. It may increase refusal again.`,
            wizard: `The doorway shrinks. Jordan was almost in, but the task suddenly grew.`,
            next: "crisis_step5_escalated",
            meta: {
              bipComponent: "Respond",
              mechanism: "Demand",
              errorType: "demand too large",
              function: "escape"
            }
          }
        }
      },

      crisis_step4_escalated: {
        text: `Jordan is away from the desk or has their head down.

The paper is blank. The class is still writing, but several students are distracted by what is happening.

The adult feels pressure to end the disruption quickly.`,
        choices: {
          A: {
            text: `Quietly say, "Take a short break. Then come back and write one word with help."`,
            score: 10,
            feedback: `This follows the plan. You stayed private, gave Jordan a break, and kept the return step small.`,
            wizard: `A calm shield in a hard moment. You kept the path open without forcing the gate.`,
            next: "crisis_step5_wobbly",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Break with return",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "You can sit quietly for now, but we will need to solve this later."`,
            score: 5,
            feedback: `This may reduce disruption, but it does not help Jordan practice the help, break, or return routine during the moment.`,
            wizard: `The room quiets, but the skill waits outside the door.`,
            next: "crisis_step5_escalated",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Pause",
              errorType: "skill not practiced",
              function: "escape"
            }
          },
          C: {
            text: `Say, "You are choosing not to work, so you are choosing to miss the next activity."`,
            score: 0,
            feedback: `This adds a consequence during escalation and may strengthen the power struggle. It does not teach Jordan how to return to writing.`,
            wizard: `The battle banner rises. Jordan may fight the consequence instead of practicing the plan.`,
            next: "crisis_step5_escalated",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Consequence",
              errorType: "power struggle",
              function: "escape"
            }
          }
        }
      },

      crisis_step5_supported: {
        text: `Jordan writes the word "dog" on the paper.

They look tired but calmer. They ask, "Can you help me finish?"

This is the final decision of the mission.`,
        choices: {
          A: {
            text: `Say, "Yes. Great asking for help. Add two words with me, and this sentence is done."`,
            score: 10,
            feedback: `This follows the plan. You reinforced the help request and gave Jordan a clear, small finish.`,
            wizard: `Crisis transformed. Jordan moved from refusal to help, then from help to writing.`,
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Help request",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "Yes. Let's make this sentence even better before you turn it in."`,
            score: 5,
            feedback: `This is supportive, but it may make the task bigger than needed after a difficult moment.`,
            wizard: `Helpful energy, but the finish line sparkles a little too far away.`,
            meta: {
              bipComponent: "Teach",
              mechanism: "Expanded task",
              errorType: "task expanded",
              function: "escape"
            }
          },
          C: {
            text: `Say, "No, now that you started, you need to finish the sentence alone."`,
            score: 0,
            feedback: `This may discourage help requests. The plan says to reinforce asking for help and shape it into small steps.`,
            wizard: `The door closes just as Jordan uses the key. Next time, they may not ask.`,
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Help request",
              errorType: "blocked help request",
              function: "escape"
            }
          }
        }
      },

      crisis_step5_wobbly: {
        text: `Jordan is near the writing task again.

They have either returned from a break, picked an animal, or agreed to try one word. The progress is real, but fragile.

Jordan says, "I'll do one word, but not the whole thing."

This is the final decision of the mission.`,
        choices: {
          A: {
            text: `Say, "One word is the first step. Write that, and I will help you add two more."`,
            score: 10,
            feedback: `This follows the plan. You accepted the small step and connected it to supported progress.`,
            wizard: `Strong finish. You used the tiny step as a bridge, not a battle line.`,
            meta: {
              bipComponent: "Teach",
              mechanism: "Small first step",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "Okay, one word is better than nothing. Try that for now."`,
            score: 5,
            feedback: `This accepts a small step, but it does not clearly reinforce the plan or guide Jordan toward the next supported step.`,
            wizard: `The spark is there, but it needs a little more fuel to become a routine.`,
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Small first step",
              errorType: "weak reinforcement",
              function: "escape"
            }
          },
          C: {
            text: `Say, "No, you cannot bargain. The assignment is one full sentence."`,
            score: 0,
            feedback: `This may turn re-entry into another power struggle. Jordan needs the task kept small enough to start.`,
            wizard: `The bridge becomes a wall. Jordan was approaching the task, but the demand grew again.`,
            meta: {
              bipComponent: "Respond",
              mechanism: "Demand",
              errorType: "power struggle",
              function: "escape"
            }
          }
        }
      },

      crisis_step5_escalated: {
        text: `Jordan is still refusing or avoiding the writing task.

The paper is blank or nearly blank. The class is close to moving on, and the adult feels pressure to make something happen quickly.

This is the final decision of the mission.`,
        choices: {
          A: {
            text: `Quietly say, "Take a short break. Then come back and write one word with help before we move on."`,
            score: 10,
            feedback: `This follows the plan. Even late in the crisis, you kept the response calm, private, and focused on one small return step.`,
            wizard: `The path stays open. You did not force the ending; you protected the next possible step.`,
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Break with return",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Say, "We will stop writing for now, but we need to try again later today."`,
            score: 5,
            feedback: `This may end the immediate disruption, but it allows escape without practicing the planned help, break, or return routine.`,
            wizard: `The storm quiets, but the mission remains unfinished.`,
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Stop writing",
              errorType: "escape without practice",
              function: "escape"
            }
          },
          C: {
            text: `Say, "You lost writing time, so now you will finish this during your preferred activity."`,
            score: 0,
            feedback: `This adds a consequence after escalation and may make the writing routine feel even more aversive next time.`,
            wizard: `The dragon stores the memory. Next time, the blank page may look even more dangerous.`,
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Consequence",
              errorType: "aversive consequence",
              function: "escape"
            }
          }
        }
      }
    }
  });
})();
