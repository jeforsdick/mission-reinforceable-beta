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

Jordan sits at their desk and looks at the blank paper. Their pencil is still on the table. They are quiet, but their shoulders look tense.`,
        hint: `Jordan does best when the first writing step is small, clear, and paired with help if needed.`,
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
            text: `Say quietly, "Think about an animal you like. I will check back in a minute."`,
            score: 5,
            feedback: `This is calm and gives Jordan space, which may lower pressure. The missing piece is a clear first writing move or a prompt to ask for help. A stronger move would be to offer one small starter step and remind Jordan help is available.`,
            wizard: `Hmm... the spell is gentle, but it does not fully land. Giving Jordan a minute may feel supportive, but the blank page is still too big. A stronger move would make the first step tiny and give Jordan a way to ask for help.`,
            next: "daily_step2_wobbly",
            meta: {
              bipComponent: "Prevent",
              mechanism: "Encouragement",
              errorType: "open-ended prompt",
              function: "escape"
            }
          },
          C: {
            text: `Say, "The directions are on the board. Start your sentence when you are ready."`,
            score: 0,
            feedback: `This sounds neutral, but it leaves Jordan alone with the hard part of writing. If the function is escape from difficult writing, waiting without support can let avoidance grow. A stronger move would be to give one clear first step and prompt help if Jordan is stuck.`,
            wizard: `Careful... the blank-page fog gets thicker here. Jordan may stay quiet, but they still do not have a bridge into writing. A stronger spell would shrink the task and point to help before refusal starts.`,
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

After a few seconds, Jordan whispers, "What animal should I pick?"`,
        hint: `Prompt Jordan to use the replacement skill: asking for help, then taking one small writing step.`,
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
            text: `Say, "Take a moment and pick from the animals we named together."`,
            score: 5,
            feedback: `This is understandable because it narrows the topic a little. It still does not teach Jordan what to do when stuck or prompt the help request. A stronger move would be to model asking for help and then guide Jordan to pick one animal.`,
            wizard: `The spell flickers. A smaller topic helps, but Jordan still has to figure out the help move alone. A stronger spell would give Jordan the words to ask for help and then one small choice.`,
            next: "daily_step3_wobbly",
            meta: {
              bipComponent: "Teach",
              mechanism: "Wait time",
              errorType: "unclear next step",
              function: "escape"
            }
          },
          C: {
            text: `Say, "I already gave examples, so choose one and start on your own."`,
            score: 0,
            feedback: `This may look like encouraging independence, but it removes support right when Jordan is asking for it. Jordan may learn that asking does not help and return to avoidance. A stronger move would be to reinforce the ask and help Jordan take one small step.`,
            wizard: `Careful. Jordan reached for a bridge, and this pulls the bridge away. That can make help-seeking feel less useful next time. A stronger spell would honor the ask, then guide one tiny writing move.`,
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

Jordan taps the pencil and says quietly, "I don't know what to write."`,
        hint: `This is still a prevention moment. Make the task smaller or prompt Jordan to ask for help before refusal grows.`,
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
            text: `Say, "That's okay. Keep thinking while I help the next table."`,
            score: 5,
            feedback: `This stays calm and does not add pressure, which is helpful. The missing piece is teaching Jordan what to do instead of staying stuck. A stronger move would prompt a help request or give one sentence-starter step before walking away.`,
            wizard: `A calm pause can help, but Jordan is still at the edge of the maze. The spell needs a doorway, not only extra time. A stronger move would prompt help or one small writing step before you leave.`,
            next: "daily_step3_wobbly",
            meta: {
              bipComponent: "Prevent",
              mechanism: "Wait time",
              errorType: "missed prompt",
              function: "escape"
            }
          },
          C: {
            text: `Say, "Everyone has started, so open your paper and begin now."`,
            score: 0,
            feedback: `This repeats the demand but does not make writing clearer or smaller. The peer comparison may add pressure and strengthen escape from writing. A stronger move would be to move close, offer a starter, and prompt Jordan to ask for help if needed.`,
            wizard: `Storm clouds gather. Jordan hears the demand, but the path into writing is still hidden. A stronger spell would shrink the task and give Jordan a help request to use.`,
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

Jordan mutters, "I'm not doing this."`,
        hint: `Keep it private and low-pressure. Offer the planned help or break option instead of adding attention.`,
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
            text: `Say, "Take a minute to calm down, and then we will come back to writing."`,
            score: 5,
            feedback: `This may reduce pressure briefly, so it is understandable. The missing piece is a specific break-and-return routine or a small next writing step. A stronger move would name the short break and the exact first step Jordan will return to.`,
            wizard: `A pause can help, but the trail fades if there is no return marker. Jordan may drift farther from writing. A stronger spell would pair the break with one small step back.`,
            next: "daily_step3_escalated",
            meta: {
              bipComponent: "Respond",
              mechanism: "Pause",
              errorType: "unclear return path",
              function: "escape"
            }
          },
          C: {
            text: `Say, "Writing still has to get done, so you can finish this during recess if needed."`,
            score: 0,
            feedback: `This may feel practical, but it shifts the moment toward consequence instead of skill practice. Jordan may focus on escaping the consequence rather than asking for help or returning to writing. A stronger move would stay private, offer help or a short break, and set one small return step.`,
            wizard: `Careful... that move may wake the escape dragon. Jordan may battle the consequence instead of practicing the support routine. A stronger spell would keep the demand small, private, and paired with help or a break.`,
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

They are still not writing, but they asked for help. Their pencil is in their hand.`,
        hint: `Reinforce the help request right away, then keep the next writing move small and doable.`,
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
            text: `Say, "Sure. You could pick a dog, shark, bird, cat, frog, or snake."`,
            score: 5,
            feedback: `This responds to Jordan's help request, which is a good start. The list may be too broad and can make the decision feel big again. A stronger move would offer two choices and immediately connect the choice to one first word.`,
            wizard: `Helpful magic, but too many doors open at once. Jordan asked for help, and the support should stay small. A stronger spell would offer two choices, then turn one choice into the first word.`,
            next: "daily_step4_wobbly",
            meta: {
              bipComponent: "Teach",
              mechanism: "Choice making",
              errorType: "too many choices",
              function: "escape"
            }
          },
          C: {
            text: `Say, "See, once you ask, this is easy. Next time try that sooner."`,
            score: 0,
            feedback: `This tries to teach a lesson, but it may make the help request feel criticized. If asking for help feels uncomfortable, Jordan may avoid both writing and support next time. A stronger move would praise the ask and guide one small writing step.`,
            wizard: `Careful. The skill appeared, but the comment may scare it back into hiding. A stronger spell would celebrate the help request and use it to start one small word.`,
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
        hint: `Prompt a help request and one small writing step before frustration turns into full refusal.`,
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
            text: `Say, "Take a breath. You have good ideas, and you can try one small part."`,
            score: 5,
            feedback: `This is warm and may lower emotion, which matters. It still leaves Jordan without the exact words or action to use next. A stronger move would prompt Jordan to ask for help or write one word with support.`,
            wizard: `A warm breeze, but the magic needs a target. Jordan still needs a concrete move, not only reassurance. A stronger spell would give the help-request words or the one-word starting step.`,
            next: "daily_step4_wobbly",
            meta: {
              bipComponent: "Prevent",
              mechanism: "Encouragement",
              errorType: "vague support",
              function: "escape"
            }
          },
          C: {
            text: `Write a sentence starter on Jordan's paper and tell them to copy the rest when ready.`,
            score: 0,
            feedback: `This gives a lot of adult help, so it may look supportive. The risk is that Jordan escapes the hard part without practicing asking, choosing, or writing a small response. A stronger move would prompt the support request and have Jordan complete one small part.`,
            wizard: `The pencil moves, but Jordan's skill does not grow much. Too much adult rescue can feed the escape dragon. A stronger spell would help Jordan practice one small response themselves.`,
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

Jordan says, "Leave me alone."`,
        hint: `Avoid a public power struggle. Stay calm, offer a short break, and include a clear return to one small writing step.`,
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
            text: `Say, "I can see this is frustrating. Take a little space and we can talk soon."`,
            score: 5,
            feedback: `This validates Jordan and may help the moment cool down. The missing piece is a planned return to writing or a replacement response to practice. A stronger move would offer a short break and name the one small step Jordan will come back to.`,
            wizard: `You softened the moment, but the return path is missing from the map. Space without a next step can turn into escape. A stronger spell would include a short break and one small writing step after it.`,
            next: "daily_step4_escalated",
            meta: {
              bipComponent: "Respond",
              mechanism: "Space",
              errorType: "missing return path",
              function: "escape"
            }
          },
          C: {
            text: `Say, "Please sit up so we can finish this and keep the class moving."`,
            score: 0,
            feedback: `This is a common classroom move, but it puts attention on compliance instead of support. Public pressure can make escape from writing more valuable for Jordan. A stronger move would reduce the audience, offer help or a short break, and return to one small step.`,
            wizard: `The spotlight grows too bright. Jordan may work harder to escape the attention, not just the writing. A stronger spell would lower the audience and offer the planned support path.`,
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

Jordan looks up as if checking whether this counts.`,
        hint: `Reinforce the first small step, then give one simple next move or a way to ask for help.`,
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
            text: `Say, "Good start. Keep going while I check on another student."`,
            score: 5,
            feedback: `This gives praise, which is helpful. It also removes support before Jordan has a clear next step, so the task may feel big again. A stronger move would reinforce the first word and give one simple next phrase or help option.`,
            wizard: `The bridge appeared, but then stretched a little too far. Jordan may still need one more stepping stone. A stronger spell would praise the first word and give one simple next phrase.`,
            next: "daily_step5_wobbly",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Praise",
              errorType: "demand too large",
              function: "escape"
            }
          },
          C: {
            text: `Say, "Okay, that's something. Now try to make it a real sentence."`,
            score: 0,
            feedback: `This acknowledges the work, but the tone may make the small step feel insufficient. If progress contacts criticism, Jordan may avoid trying again. A stronger move would clearly reinforce the first word and keep the next step small.`,
            wizard: `Ouch. The tiny spark dims when progress meets criticism. Jordan may decide the first step was not worth trying. A stronger spell would reinforce the start and offer a small next move.`,
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

Jordan says, "I don't know if this is right."`,
        hint: `Reduce perfection pressure. Bring Jordan back to one small step and make help available.`,
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
            text: `Say, "It doesn't have to be perfect. Think for a moment and try again."`,
            score: 5,
            feedback: `This lowers perfection pressure, which is useful. It still leaves the next action unclear and does not prompt help. A stronger move would pair reassurance with one word to write or a help request to use.`,
            wizard: `The message is kind, but the next step is still hiding in the mist. Jordan needs a tiny target. A stronger spell would say what to write first or how to ask for help.`,
            next: "daily_step5_wobbly",
            meta: {
              bipComponent: "Teach",
              mechanism: "Encouragement",
              errorType: "vague support",
              function: "escape"
            }
          },
          C: {
            text: `Say, "You had a word started, so stop erasing and just finish it."`,
            score: 0,
            feedback: `This may be meant to encourage follow-through, but it adds criticism when Jordan is already unsure. That can make writing feel riskier and increase avoidance. A stronger move would reduce the pressure and guide Jordan back to one small word with help available.`,
            wizard: `The spell backfires. Jordan may worry more about mistakes than about starting. A stronger spell would make the next attempt feel safe and small.`,
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

A few students are watching. Jordan says, "I'm not writing."`,
        hint: `Stay calm and private. Redirect to the planned help or break option with a small return step.`,
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
            text: `Say, "Take some space by the shelf, and we will try writing again later."`,
            score: 5,
            feedback: `This avoids arguing, which can keep the room calmer. The missing piece is practicing the replacement response or returning to one small writing step. A stronger move would make the break short and connect it to a specific return step.`,
            wizard: `The battle paused, but the mission is still unresolved. Space can become escape if there is no return path. A stronger spell would pair the break with one small writing move afterward.`,
            next: "daily_step5_escalated",
            meta: {
              bipComponent: "Respond",
              mechanism: "Space",
              errorType: "delayed re-entry",
              function: "escape"
            }
          },
          C: {
            text: `From across the room, say, "Jordan, come back so we can finish writing."`,
            score: 0,
            feedback: `This may feel efficient, but it makes the interaction public. Attention and pressure can increase Jordan's need to escape the writing task. A stronger move would approach privately and offer a short break with a clear return to one word.`,
            wizard: `The spotlight flashes. Jordan may now defend against the attention instead of returning to writing. A stronger spell would move close, stay private, and offer the small return step.`,
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

Jordan is still connected to writing and waiting for your response.`,
        hint: `This is a replacement behavior success. Reinforce asking for help and keep the finish line simple.`,
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
            text: `Say, "Yes, I can help. Let's think of a few ways to make the sentence stronger."`,
            score: 5,
            feedback: `This honors the help request, which is positive. It also expands the writing task when Jordan needs a simple finish. A stronger move would reinforce asking for help and give one small completion step.`,
            wizard: `Helpful energy, but too many sparkles at the finish line. Jordan asked for help, not a bigger writing challenge. A stronger spell would praise the ask and give one simple ending step.`,
            meta: {
              bipComponent: "Teach",
              mechanism: "Help request",
              errorType: "task expanded",
              function: "escape"
            }
          },
          C: {
            text: `Say, "I helped you start, so now try to finish the rest independently."`,
            score: 0,
            feedback: `This sounds like building independence, but it may punish the help request. If asking for help leads to less support, Jordan may avoid asking and avoid writing. A stronger move would reinforce the request and shape independence through one small supported step.`,
            wizard: `The door closes just as Jordan knocks. Next time, they may not ask. A stronger spell would reward the help request and fade support one tiny step at a time.`,
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

Jordan says, "Do I have to write the whole thing?"`,
        hint: `Keep the demand small and specific. A clear first word with help is more plan-aligned than a vague reduced demand.`,
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
            text: `Say, "Just do what you can before the timer ends, and we will call it progress."`,
            score: 5,
            feedback: `This lowers pressure and sounds supportive. The target is still blurry, so Jordan may not know what response will count. A stronger move would define one small writing step and offer help to complete it.`,
            wizard: `The pressure drops, but the target is blurry. Jordan still needs a clear mark to aim for. A stronger spell would name the one small step and offer help getting there.`,
            meta: {
              bipComponent: "Prevent",
              mechanism: "Reduced pressure",
              errorType: "unclear target",
              function: "escape"
            }
          },
          C: {
            text: `Say, "Yes, the assignment is still one full sentence like everyone else."`,
            score: 0,
            feedback: `This restates the expectation, but it brings back the full demand without support. For Jordan, that can make escape from writing more valuable. A stronger move would keep the expectation small enough to start and reinforce the first step.`,
            wizard: `The mountain grows again. Jordan may see the whole sentence as too much to climb. A stronger spell would shrink the climb to one word and reinforce that step.`,
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

The class is moving on soon, and the adult feels pressure to get Jordan to comply quickly.`,
        hint: `Even near the end, avoid pressure. Offer a calm break-and-return path with one small writing step.`,
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
            text: `Say, "Sit quietly for now, and we will problem-solve writing later."`,
            score: 5,
            feedback: `This may reduce disruption in the moment, which is understandable. It also lets writing end without practicing help, a break request, or a small return step. A stronger move would keep things calm while still asking for one tiny response before moving on.`,
            wizard: `The room gets quieter, but the skill stays unpracticed. The escape dragon gets a small snack. A stronger spell would keep calm and still practice one tiny return step.`,
            meta: {
              bipComponent: "Respond",
              mechanism: "Delay",
              errorType: "avoidance without practice",
              function: "escape"
            }
          },
          C: {
            text: `Say, "Since writing did not get done, we will use recess time to finish it."`,
            score: 0,
            feedback: `This may seem like a logical consequence, but after escalation it can strengthen the power struggle. Jordan still does not practice asking for help, taking a short break, or returning to one small writing step. A stronger move would keep the return path small and reinforce any movement back toward writing.`,
            wizard: `The dragon claims the treasure. Jordan may remember the battle more than the writing plan. A stronger spell would keep the return path tiny and reinforce the next step toward writing.`,
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
