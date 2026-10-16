/* daily-mission-1.js
 * Mission: Reinforceable Fictional Public Demo Content
 * Daily Mission: The Blank Page
 *
 * Purpose:
 * - Help public demo players practice applying Jordan's simple behavior plan.
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
    focus: "Help Jordan turn a blank-page stall into a doable first writing step without making refusal the shortcut.",
    routine: "independent writing",
    functionPressure: ["escape"],
    bipTargets: ["Help", "Break", "Small Step", "Calm Return"],

    endings: {
        "STRONG": {
            "text": "The page is no longer an all-or-nothing challenge. Jordan has asked for help or taken a meaningful first step, and you have reinforced that route. Other students continue writing while Jordan has an achievable next move. The sentence may still need finishing, but the plan is working: communication and re-engagement are becoming easier than refusal.",
            "wizard": "Quest cleared: not a perfect paragraph, but a stronger pathway! You made the first step worth taking."
        },
        "MIXED": {
            "text": "Jordan is quieter and nearer to the materials, but the path back is still delicate. Some support helped; one important prompt or reinforcement moment was delayed or left too vague. The next real opportunity would be to name the tiny first step and respond when Jordan requests help. The classroom can recover from this point.",
            "wizard": "The spell is half-lit! One precise cue and one timely response can turn this into real momentum."
        },
        "FRAGILE": {
            "text": "Writing time is nearly over and Jordan is still avoiding much of the task. The exchange did not establish a reliable help-or-break route or a small return step. That is not a prediction about a real student; it is feedback about this simulated decision path. Next time, make the first move smaller and the replacement response more effective.",
            "wizard": "The page won this round, not the quest. Review the map, then try opening a smaller door."
        }
    },

    steps: {
      daily_step1_start: {
        text: `It's independent writing time, five minutes after a lively conversation about favorite animals. Pencils tap across the room while you answer a question from another table. Jordan has plenty to say about sea creatures, but the paper in front of them is completely blank. The task is to write a sentence, and no one has shown Jordan where to begin. Jordan looks at the page, then at you, and starts sliding the paper toward the edge of the desk. Your group is waiting. What do you do first?`,
        hint: `Jordan does best when the first writing step is small, clear, and paired with help if needed.`,
        choices: {
          A: {
            text: `Quietly point to the sentence starter and say, "First, write one animal. You can ask for help if you get stuck."`,
            score: 10,
            consequence: "Jordan keeps the paper close, touches the pencil, and looks toward the starter. The work has not started yet, but the path into it is clearer.",
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
            consequence: "Jordan stays seated and quiet, yet keeps scanning the blank page. Without a specific first move, hesitation continues.",
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
            consequence: "Jordan pushes the page away and says they are not writing. The interaction has grown louder, and a classmate turns to look.",
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
        text: `Jordan draws the page closer and studies the sentence starter. The pencil is in hand, but the first word has not appeared. From the nearby reading table, someone asks you to find a missing book. Jordan whispers, “Could you help me choose an animal?” The request is quiet enough that you could miss it while helping the other group. This is a chance to show whether asking for help gets Jordan a useful response.`,
        hint: `Prompt Jordan to use the replacement skill: asking for help, then taking one small writing step.`,
        choices: {
          A: {
            text: `Say, "You can ask for help. Try saying, 'Can you help me pick one animal?'"`,
            score: 10,
            consequence: "Jordan turns toward you and makes a specific help request. The pencil stays near the page while the request is waiting to be answered.",
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
            consequence: "Jordan stops pushing the page away but still cannot name a first step. The calm is real; the replacement skill has not quite taken hold.",
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
            consequence: "Jordan lowers their head and stops looking at the work. Their refusal has become a more effective way to pause writing than asking for help.",
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
        text: `Jordan nods at your reassurance but does not begin. Two classmates are already on their second sentences. Jordan scans their papers, presses the pencil against the desk, and murmurs, “I don't know what to put.” The interaction stayed calm, yet the first action is still vague. You have a few seconds before the group at the next table needs you again.`,
        hint: `This is still a prevention moment. Make the task smaller or prompt Jordan to ask for help before refusal grows.`,
        choices: {
          A: {
            text: `Move close and say, "You can write 'My animal is...' or ask me for help picking one."`,
            score: 10,
            consequence: "Jordan turns toward you and makes a specific help request. The pencil stays near the page while the request is waiting to be answered.",
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
            consequence: "Jordan stops pushing the page away but still cannot name a first step. The calm is real; the replacement skill has not quite taken hold.",
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
            consequence: "Jordan lowers their head and stops looking at the work. Their refusal has become a more effective way to pause writing than asking for help.",
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
        text: `Jordan pulls the page out of reach and leans back. “I'm not writing that,” they say, loud enough for the closest student to turn. The other group's question is still waiting and the class is starting to notice. Jordan is no longer considering the sentence starter. You need to lower the pressure without letting refusal become the easiest way to remove the whole writing task.`,
        hint: `Keep it private and low-pressure. Offer the planned help or break option instead of adding attention.`,
        choices: {
          A: {
            text: `Move close, keep your voice quiet, and say, "You can ask for help or take a short break."`,
            score: 10,
            consequence: "Jordan stops pushing the page away but still cannot name a first step. The calm is real; the replacement skill has not quite taken hold.",
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
            consequence: "Jordan lowers their head and stops looking at the work. Their refusal has become a more effective way to pause writing than asking for help.",
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
            consequence: "Jordan lowers their head and stops looking at the work. Their refusal has become a more effective way to pause writing than asking for help.",
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
        text: `Jordan has now used a help request instead of pushing the page away. You give a brief cue and Jordan says, “Sharks. I know about sharks.” Their pencil pauses over the paper while a student at the next table waves for your help. Jordan has the idea; what happens next depends on whether that small move is noticed and made doable.`,
        hint: `Reinforce the help request right away, then keep the next writing move small and doable.`,
        choices: {
          A: {
            text: `Say, "Great job asking for help. Pick dog or shark, then write just that first word."`,
            score: 10,
            consequence: "Jordan writes an animal name and keeps the paper in front of them. A small successful response is now available to reinforce.",
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
            consequence: "Jordan tries a letter and erases it, then looks to you for direction. They are near the task, but unsure what will count.",
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
            consequence: "Jordan tries a letter and erases it, then looks to you for direction. They are near the task, but unsure what will count.",
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
        text: `Jordan is still seated and has turned back toward the task, but there is no word on the page. “I can't make a whole sentence,” Jordan says, rubbing out a faint pencil mark. Their voice is not raised; they are hovering between a request and another shutdown. The difficult part is distinguishing a tiny first-step opportunity from an invitation to negotiate the whole assignment.`,
        hint: `Prompt a help request and one small writing step before frustration turns into full refusal.`,
        choices: {
          A: {
            text: `Say, "You can ask for help. Try, 'Can you help me start with one word?'"`,
            score: 10,
            consequence: "Jordan writes an animal name and keeps the paper in front of them. A small successful response is now available to reinforce.",
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
            consequence: "Jordan tries a letter and erases it, then looks to you for direction. They are near the task, but unsure what will count.",
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
            consequence: "Jordan stands by the bookshelf and the paper remains on the desk. Distance from the assignment is increasing while attention shifts toward the disruption.",
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
        text: `Jordan puts their head down and pushes the page farther away. A nearby classmate whispers about the interruption, and Jordan says, “Stop looking at me.” The audience is becoming part of the problem. Nothing unsafe has happened, but Jordan is not using a help or break request. You have an opportunity to reopen a private, manageable path to the task.`,
        hint: `Avoid a public power struggle. Stay calm, offer a short break, and include a clear return to one small writing step.`,
        choices: {
          A: {
            text: `Quietly say, "You can take a short break. Then we will come back and write one word."`,
            score: 10,
            consequence: "Jordan tries a letter and erases it, then looks to you for direction. They are near the task, but unsure what will count.",
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
            consequence: "Jordan stands by the bookshelf and the paper remains on the desk. Distance from the assignment is increasing while attention shifts toward the disruption.",
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
            consequence: "Jordan stands by the bookshelf and the paper remains on the desk. Distance from the assignment is increasing while attention shifts toward the disruption.",
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
        text: `Jordan writes “shark,” then looks up. One word is on the paper—much less than the class assignment, but it is a real entry into the work. Jordan asks, “Does that count?” Another student needs a quick answer from you. The next choice could reinforce Jordan's initiation or accidentally raise the demand again before it has a chance to grow.`,
        hint: `Reinforce the first small step, then give one simple next move or a way to ask for help.`,
        choices: {
          A: {
            text: `Say, "You wrote the first word. That is the start. Now add 'is cool' or ask for help."`,
            score: 10,
            consequence: "Jordan points to a starter and asks for the next bit of help. The work is still incomplete, but they are using the plan to stay with it.",
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
            consequence: "Jordan returns to the paper and considers a single word. The opening is small and could close if the next direction grows too quickly.",
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
            consequence: "Jordan returns to the paper and considers a single word. The opening is small and could close if the next direction grows too quickly.",
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
        text: `Jordan has made a partial attempt and stopped. The eraser is rubbing a small gray hole into the page. “I'm probably doing this wrong,” they say. They have not abandoned the task, but they are watching for your response. A precise prompt and timely encouragement could still move the writing forward; a vague direction could leave Jordan stalled.`,
        hint: `Reduce perfection pressure. Bring Jordan back to one small step and make help available.`,
        choices: {
          A: {
            text: `Say, "Starting is what matters. Write one word first, and I can help with the sentence."`,
            score: 10,
            consequence: "Jordan points to a starter and asks for the next bit of help. The work is still incomplete, but they are using the plan to stay with it.",
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
            consequence: "Jordan returns to the paper and considers a single word. The opening is small and could close if the next direction grows too quickly.",
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
            consequence: "Jordan turns away again and the last writing minutes slip past. The teacher has to decide whether to preserve a return step or let the task disappear.",
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
        text: `Jordan is by the bookshelf rather than the desk. The page remains blank and the class is midway through writing. Jordan's voice is quieter now, but distance from the task is doing the work of escape. A peer watches from the next row. You need to handle this privately and make the return step small, rather than trading calm for complete removal of the assignment.`,
        hint: `Stay calm and private. Redirect to the planned help or break option with a small return step.`,
        choices: {
          A: {
            text: `Walk nearby and quietly say, "You can take a short break here, then come back for one word."`,
            score: 10,
            consequence: "Jordan returns to the paper and considers a single word. The opening is small and could close if the next direction grows too quickly.",
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
            consequence: "Jordan turns away again and the last writing minutes slip past. The teacher has to decide whether to preserve a return step or let the task disappear.",
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
            consequence: "Jordan turns away again and the last writing minutes slip past. The teacher has to decide whether to preserve a return step or let the task disappear.",
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
        text: `Jordan has a first word and looks ready to use the sentence starter. “Can you help with the next part?” they ask. The group at the other table is calling for you again. Jordan has already practiced the replacement skill, and this final moment tests whether help and specific reinforcement arrive while engagement is still available.`,
        hint: `This is a replacement behavior success. Reinforce asking for help and keep the finish line simple.`,
        choices: {
          A: {
            text: `Say, "Yes. Great asking for help. Add two words, then you are done with this sentence."`,
            score: 10,
            ending: "STRONG",
            consequence: "Jordan accepts the brief help or return cue and orients back to the writing page. The next manageable response is available even if the sentence is not finished.",
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
            ending: "MIXED",
            consequence: "Jordan stays near the materials, but the exact help or return step is still fuzzy. Progress is possible; another precise prompt would make it more reliable.",
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
            ending: "FRAGILE",
            consequence: "Jordan remains disconnected from writing and the routine moves on. The modeled branch shows how the task may be avoided without a successful replacement request.",
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
        text: `Jordan is close to rejoining writing, but the attempt is fragile. The paper is nearby and they have either selected a topic, used a help request, or returned after a brief pause. “Just one word?” they ask, checking how much is expected. The class is approaching the end of the routine. Your next response could make the small step count or make the demand feel too large again.`,
        hint: `Keep the demand small and specific. A clear first word with help is more plan-aligned than a vague reduced demand.`,
        choices: {
          A: {
            text: `Say, "First write one word. Then I will help you add two more words."`,
            score: 10,
            ending: "STRONG",
            consequence: "Jordan accepts the brief help or return cue and orients back to the writing page. The next manageable response is available even if the sentence is not finished.",
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
            ending: "MIXED",
            consequence: "Jordan stays near the materials, but the exact help or return step is still fuzzy. Progress is possible; another precise prompt would make it more reliable.",
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
            ending: "FRAGILE",
            consequence: "Jordan remains disconnected from writing and the routine moves on. The modeled branch shows how the task may be avoided without a successful replacement request.",
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
        text: `Jordan is not yet writing. They may be near the bookshelf or seated with their head down; the page is still mostly blank. Your class is moving toward the next activity. The rush creates pressure to obtain compliance quickly, but the fictional plan does not call for an argument or a penalty. The last decision is about keeping a workable return path alive.`,
        hint: `Even near the end, avoid pressure. Offer a calm break-and-return path with one small writing step.`,
        choices: {
          A: {
            text: `Quietly say, "Take a short break. Then come back and write one word with help."`,
            score: 10,
            ending: "MIXED",
            consequence: "Jordan accepts the brief help or return cue and orients back to the writing page. The next manageable response is available even if the sentence is not finished.",
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
            ending: "FRAGILE",
            consequence: "Jordan stays near the materials, but the exact help or return step is still fuzzy. Progress is possible; another precise prompt would make it more reliable.",
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
            ending: "FRAGILE",
            consequence: "Jordan remains disconnected from writing and the routine moves on. The modeled branch shows how the task may be avoided without a successful replacement request.",
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
