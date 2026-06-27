/* crisis-mission-3.js
 * Mission: Reinforceable Example Content
 * Crisis Mission 3: Writing Refusal Escalates
 *
 * Purpose:
 * - Practice implementation of the Example BIP when academic refusal escalates toward crisis.
 * - Primary function pressure: escape from difficult writing.
 * - Secondary function pressure: adult attention, peer attention, and emotional escalation.
 * - Teacher skill: reduce demand, use minimal language, offer a brief planned reset, and reinforce low-demand re-entry.
 *
 * Loading note:
 * - This file assumes the main engine has already created POOL.
 * - Later, the engine/html can load this file after the shared config and Example BIP file.
 * - For the current single-file version, paste this after POOL.crisis has been initialized.
 */

(function registerCrisisMission3() {
  if (typeof POOL === "undefined") {
    throw new Error("POOL must be defined before loading crisis-mission-3.js");
  }

  POOL.crisis = POOL.crisis || [];

  POOL.crisis.push({
    id: "crisis_3_writing_refusal_escalates",
    title: "Crisis Drill: Writing Refusal Escalates",
    start: "step1",
    focus: "Escalating writing refusal; reduce demand, use a brief reset, and reinforce re-entry.",
    routine: "independent writing escalation",
    functionPressure: ["escape", "adult attention", "peer attention", "emotional escalation"],
    bipTargets: ["Respond", "Crisis Respond", "Reinforce"],

    steps: {
      step1: {
        text: `BIP Briefing: When writing refusal escalates, the plan is to reduce language, lower the immediate response effort, and preserve a clear path back to the writing routine. A brief reset can be used if it has a timer and a return step. Avoid threats, lectures, removing the task indefinitely, or asking Student to explain while he is still activated.\n\nScene: Student has been staring at a writing page for several minutes. The class is working quietly, but Student's breathing is louder now. He pushes the paper away, raises his voice, and says, "I am not doing this." His chair scrapes backward. A nearby peer looks up.\n\nThis is moving from avoidance into escalation. What is your first move?`,
        choices: {
          A: {
            text: `Reduce language and offer, "Two-minute reset or first word with me. Then one mark on the page."`,
            score: 10,
            feedback: `High fidelity. You reduced pressure while preserving a clear route back to writing.`,
            wizard: `The Wizard lowers the heat in the room. The writing task is no longer a mountain, but it also does not disappear. Student gets two safe paths, and both lead back to one small mark. A planned reset or reduced first step can interrupt escape while preserving re-entry.`,
            next: "step2_supported",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Tell Student the work is important and encourage him to try one sentence before taking a break.`,
            score: 5,
            feedback: `Developing fidelity. The tone is supportive, but the demand is still too large during escalation.`,
            wizard: `The Wizard hears the kindness, but Student hears the whole sentence. His pencil does not move. The writing task still feels too big, and the peer is now watching the struggle. During escalation, the first response must be very small and observable.`,
            next: "step2_wobble",
            meta: {
              bipComponent: "Respond",
              mechanism: "Prompting",
              errorType: "demand too large during escalation",
              function: "escape"
            }
          },
          C: {
            text: `Tell Student he cannot leave the task until the writing is finished.`,
            score: 0,
            feedback: `Low fidelity. Blocking escape verbally can intensify refusal and make writing more aversive.`,
            wizard: `The Wizard's warning flame rises. The page becomes a locked gate. Student pushes back harder because the only escape route now appears to be escalation. High-pressure language can strengthen escape-maintained refusal.`,
            next: "step2_escalated",
            meta: {
              bipComponent: "Respond",
              mechanism: "Performance feedback",
              errorType: "verbal blocking",
              function: "escape plus adult attention"
            }
          }
        }
      },

      step2_supported: {
        text: `Student chooses the two-minute reset. He moves to the calm spot with the writing page still visible on his desk. His voice lowers, but his body is still tense.`,
        choices: {
          A: {
            text: `Honor the reset briefly, set the timer, and preview, "When it rings, first word with me."`,
            score: 10,
            feedback: `High fidelity. You supported regulation and kept re-entry predictable.`,
            wizard: `The Wizard starts the timer like a bridge, not a tunnel. Student can breathe, but the writing path remains visible. The reset becomes part of the plan instead of a full escape. Breaks are strongest when brief, predictable, and tied to re-entry.`,
            next: "step3_strong",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Let Student reset as long as needed and check back after the rest of the class is working.`,
            score: 5,
            feedback: `Developing fidelity. This may reduce conflict, but the re-entry plan is too loose.`,
            wizard: `The Wizard watches the bridge stretch too far. Student calms, but the writing task drifts away. Without a clear return point, reset can become avoidance. Open-ended breaks can strengthen escape if re-entry is not planned.`,
            next: "step3_mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "open-ended reset",
              function: "escape"
            }
          },
          C: {
            text: `Use the reset time to explain why refusing work makes the task take longer.`,
            score: 0,
            feedback: `Low fidelity. Teaching during reset can restart escalation and add adult attention.`,
            wizard: `The Wizard's timer cracks. The reset stops feeling like regulation and starts feeling like a lecture. Student's shoulders rise again. Process later, after regulation and successful re-entry.`,
            next: "step3_risk",
            meta: {
              bipComponent: "Respond",
              mechanism: "Performance feedback",
              errorType: "processing during reset",
              function: "adult attention plus escape"
            }
          }
        }
      },

      step2_wobble: {
        text: `Student says, "You do it then," and slides the pencil away. He is not yelling now, but the writing task is still rejected. The peer nearby is still watching.`,
        choices: {
          A: {
            text: `Shift to one concrete action: "Point to your first word or write your name. I will mark the first step."`,
            score: 10,
            feedback: `High fidelity repair. You moved from encouragement to an actionable first step.`,
            wizard: `The Wizard points to the pencil and shrinks the assignment. Student can start with action instead of arguing about the whole page. A small observable response competes with escape better than general encouragement.`,
            next: "step3_recovered",
            meta: {
              bipComponent: "Teach",
              mechanism: "Prompting",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Give Student a little space and say you will come back when he is ready.`,
            score: 5,
            feedback: `Developing fidelity. Calm space may reduce adult attention, but it can allow avoidance to continue.`,
            wizard: `The Wizard steps back with you. The conflict lowers, but the page remains untouched. Student may calm, or he may learn that waiting makes writing disappear. Space should include a return step when escape is the likely function.`,
            next: "step3_mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "space without return step",
              function: "escape"
            }
          },
          C: {
            text: `Remind Student that refusing now means missing a preferred activity later.`,
            score: 0,
            feedback: `Low fidelity. Threats can increase emotional responding around the task.`,
            wizard: `The Wizard darkens the page. Writing now predicts losing something later. The task becomes heavier, and Student's refusal gains emotional fuel. Threats add aversiveness without teaching task re-entry.`,
            next: "step3_risk",
            meta: {
              bipComponent: "Respond",
              mechanism: "Performance feedback",
              errorType: "threat of loss",
              function: "escape plus adult attention"
            }
          }
        }
      },

      step2_escalated: {
        text: `Student pushes the chair back farther and says, "I hate this class." Several peers are now watching. The writing demand has become public.`,
        choices: {
          A: {
            text: `Stop the debate, reduce words, and offer a brief reset with a specific return step.`,
            score: 10,
            feedback: `High fidelity repair. You reduced attention while preserving a route back to writing.`,
            wizard: `The Wizard pulls the spotlight down. You do not argue with the statement. The reset gives Student an off-ramp while the page remains part of the mission path. Reducing language and preserving re-entry helps interrupt escalation without reinforcing full escape.`,
            next: "step3_recovered",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "none",
              function: "escape plus adult attention"
            }
          },
          B: {
            text: `Move the paper aside and wait quietly until Student stops talking.`,
            score: 5,
            feedback: `Developing fidelity. This may lower the exchange, but the writing routine is not repaired yet.`,
            wizard: `The Wizard sees the room quieting, but the page has vanished from the immediate routine. Calm may return, yet writing has not been rebuilt. Reducing interaction should be followed by low-demand re-entry.`,
            next: "step3_mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "task removed without return step",
              function: "escape"
            }
          },
          C: {
            text: `Tell Student the comment was disrespectful and must be fixed before work continues.`,
            score: 0,
            feedback: `Low fidelity. This adds social pressure and verbal load during escalation.`,
            wizard: `The Wizard's alarm rings. The mission shifts from writing to disrespect. Student now has a bigger conflict to escape, and peers are still watching. Address respect later, after regulation and re-entry are stable.`,
            next: "step3_risk",
            meta: {
              bipComponent: "Respond",
              mechanism: "Performance feedback",
              errorType: "respect correction during escalation",
              function: "adult attention plus peer attention"
            }
          }
        }
      },

      step3_strong: {
        text: `The timer rings. Student is quieter and returns near the desk. He has not started writing yet, but he is close enough to the task that re-entry is possible.`,
        choices: {
          A: {
            text: `Prompt one tiny writing action and reinforce immediately when Student completes it.`,
            score: 10,
            feedback: `High fidelity. You reinforced re-entry and task initiation after the reset.`,
            wizard: `The Wizard lights the first word. Student does something small and successful. The refusal loses power because re-entry is now the behavior that gets reinforced. Planned resets should end with a reinforced replacement response.`,
            ending: "success",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Performance feedback",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Let Student stay calm a bit longer before bringing the writing demand back.`,
            score: 5,
            feedback: `Developing fidelity. Calm is useful, but re-entry may become delayed or unclear.`,
            wizard: `The Wizard waits beside the desk. Calm is valuable, but the task bridge is fading. The longer writing stays away, the harder it may be to return. Regulation should lead into a predictable, low-demand task step.`,
            ending: "mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "delayed re-entry after reset",
              function: "escape"
            }
          },
          C: {
            text: `Ask Student to explain what made the task feel so frustrating before restarting.`,
            score: 0,
            feedback: `Low fidelity. Too much verbal processing too soon can restart avoidance.`,
            wizard: `The Wizard raises a hand. Student was almost back. The explanation demand pulls him into talking about the task instead of starting it. Reflection comes after re-entry and reinforcement, not before.`,
            ending: "mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "processing before task re-entry",
              function: "adult attention plus escape"
            }
          }
        }
      },

      step3_recovered: {
        text: `Student's voice is lower. The page is nearby again. He is still tense, but the episode is no longer growing.`,
        choices: {
          A: {
            text: `Reinforce the calm return, prompt one first mark, and keep the next demand small.`,
            score: 10,
            feedback: `High fidelity repair. You reinforced recovery and rebuilt the writing path.`,
            wizard: `The Wizard repairs the page one mark at a time. Student gets credit for returning, then receives a step small enough to contact success. Re-entry should be reinforced before increasing task expectations.`,
            ending: "success",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Fluency building",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Let Student sit quietly with the paper until he decides what he wants to write.`,
            score: 5,
            feedback: `Developing fidelity. The task is nearby, but the replacement response is not actively taught.`,
            wizard: `The Wizard waits by the paper. The storm is smaller, but the skill is still thin. Student has proximity to writing, not a reinforced writing response. Quiet is not the same as re-entry.`,
            ending: "mixed",
            meta: {
              bipComponent: "Teach",
              mechanism: "Prompting",
              errorType: "missed first-action prompt",
              function: "escape"
            }
          },
          C: {
            text: `Use the calm moment to remind him that refusal makes writing take longer.`,
            score: 0,
            feedback: `Low fidelity. The explanation may pull Student back into the refusal loop.`,
            wizard: `The Wizard sees the old doorway reopen. Student was near the page, but now the conversation becomes the task. The pencil waits again. Teach through reinforced action first, then problem solve later.`,
            ending: "mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Performance feedback",
              errorType: "processing too early",
              function: "adult attention plus escape"
            }
          }
        }
      },

      step3_mixed: {
        text: `Student is calmer, but the writing task has not restarted. The class is working again, and you have a chance to recover the routine.`,
        choices: {
          A: {
            text: `Return with one supported start option and reinforce the first mark on the page.`,
            score: 10,
            feedback: `High fidelity repair. You rebuilt the task-initiation path.`,
            wizard: `The Wizard places the pencil back in the story. The first mark matters. Student learns that calm return to work, not refusal, changes the outcome. Repair is strongest when re-entry contacts immediate reinforcement.`,
            ending: "success",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Performance feedback",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Let Student observe quietly and try the writing again during the next work period.`,
            score: 5,
            feedback: `Developing fidelity. This may stay calm, but the current avoidance sequence is only partly repaired.`,
            wizard: `The Wizard closes the notebook halfway. The crisis is quieter, but the assignment escaped the moment. Tomorrow may bring the same battle. Re-entry should happen in the current routine when safe and feasible.`,
            ending: "mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "delayed task re-entry",
              function: "escape"
            }
          },
          C: {
            text: `Tell Student he can rejoin after he agrees not to refuse the assignment again.`,
            score: 0,
            feedback: `Low fidelity. Requiring verbal agreement can restart the power struggle.`,
            wizard: `The Wizard's warning light returns. The task has become a promise Student must make under pressure. The refusal story comes back to life. Recovery should focus on safe action, not verbal compliance.`,
            ending: "fail",
            meta: {
              bipComponent: "Respond",
              mechanism: "Performance feedback",
              errorType: "verbal contract demand",
              function: "adult attention plus escape"
            }
          }
        }
      },

      step3_risk: {
        text: `Student is still activated. The page is aversive, adult attention is high, and the next move could either lower the pressure or extend the episode.`,
        choices: {
          A: {
            text: `Use minimal language, offer a brief reset, and return later with one tiny writing action.`,
            score: 10,
            feedback: `High fidelity repair. You reduced pressure and preserved a planned re-entry path.`,
            wizard: `The Wizard pulls the mission away from the cliff. It is not a clean win, but the episode stops growing. A small re-entry path remains possible. In crisis recovery, lowering pressure while preserving re-entry is better than forcing compliance.`,
            ending: "mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "recovery repair",
              function: "escape plus adult attention"
            }
          },
          B: {
            text: `Stop talking and wait nearby until Student's body is calm enough to continue.`,
            score: 5,
            feedback: `Developing fidelity. This may reduce escalation, but replacement behavior is not yet taught.`,
            wizard: `The Wizard stands quietly. Waiting may prevent more damage, but the routine remains unfinished. Student is contained more than coached. Stabilization is useful, but the plan still needs low-demand re-entry when possible.`,
            ending: "mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "stabilization without re-entry",
              function: "escape"
            }
          },
          C: {
            text: `Continue explaining the expectation so Student understands that refusal is not an option.`,
            score: 0,
            feedback: `Low fidelity. Continued explanation can maintain the escalation cycle.`,
            wizard: `The Wizard's alarm grows louder. The explanation becomes the new demand. Student argues, the task stays gone, and the cycle strengthens. Extended language can function as adult attention and escape from writing.`,
            ending: "fail",
            meta: {
              bipComponent: "Respond",
              mechanism: "Performance feedback",
              errorType: "extended explanation during escalation",
              function: "adult attention plus escape"
            }
          }
        }
      }
    },

    endings: {
      success: {
        title: `Crisis De-escalated - Re-Entry Built`,
        text: `Student recovered because the task was reduced, language stayed brief, and task initiation contacted reinforcement after escalation.`
      },
      mixed: {
        title: `Crisis Stabilized - Re-Entry Was Weak`,
        text: `Student became calmer, but the path back to writing was delayed, vague, or not reinforced as clearly as it could have been.`
      },
      fail: {
        title: `Crisis Maintained - Refusal Strengthened`,
        text: `The response pattern increased task pressure, adult attention, escape, or emotional escalation around writing.`
      }
    }
  });
})();
