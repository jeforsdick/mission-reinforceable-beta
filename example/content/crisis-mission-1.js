/* crisis-mission-1.js
 * Mission: Reinforceable Example Content
 * Crisis Mission 1: Moving Toward the Door
 *
 * Purpose:
 * - Practice implementation of the Example BIP during a potential elopement/flight-risk moment.
 * - Primary function pressure: escape from task or overwhelming routine.
 * - Secondary function pressure: safety risk, adult attention, and possible flight escalation.
 * - Teacher skill: maintain line of sight, avoid chase/blocking, signal support, reinforce safe stopping and low-demand re-entry.
 *
 * Loading note:
 * - This file assumes the main engine has already created POOL.
 * - Later, the engine/html can load this file after the shared config and Example BIP file.
 * - For the current single-file version, paste this after POOL.crisis has been initialized.
 */

(function registerCrisisMission1() {
  if (typeof POOL === "undefined") {
    throw new Error("POOL must be defined before loading crisis-mission-1.js");
  }

  POOL.crisis = POOL.crisis || [];

  POOL.crisis.push({
    id: "crisis_1_moving_toward_the_door",
    title: "Crisis Drill: Moving Toward the Door",
    start: "step1",
    focus: "Leaving area; maintain line of sight, signal support, avoid chase/blocking, and reinforce safe stopping.",
    routine: "leaving area / potential elopement",
    functionPressure: ["escape", "safety risk", "adult attention"],
    bipTargets: ["Crisis Respond", "Respond", "Reinforce"],

    steps: {
      step1: {
        text: `BIP Briefing: When Student moves quickly toward the door, this becomes a safety moment before it is a teaching moment. The plan is to maintain line of sight, signal for support, reduce language, and avoid turning movement into a chase or doorway power struggle. Reinforce safe stopping or safe return as soon as it is appropriate.\n\nScene: During independent work, Student pushes the paper away and stands suddenly. His face is tight. He walks quickly toward the classroom door without responding when you say his name. The hallway is busy because another class is returning from specials. A few students in your room look up.\n\nYou need to protect safety without making Student run. What do you do first?`,
        choices: {
          A: {
            text: `Maintain line of sight, signal for support, and use one calm direction: "Stop by the door."`,
            score: 10,
            feedback: `High fidelity. You prioritized safety while avoiding chase, blocking, and extra language.`,
            wizard: `The Wizard moves like a shadow instead of a storm. Student is visible, support is coming, and your words are short enough to process. The doorway is still risky, but the moment has not become a race. In a safety moment, reduce stimulation and preserve line of sight before teaching.`,
            next: "step2_supported",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Prompting",
              errorType: "none",
              function: "escape plus safety risk"
            }
          },
          B: {
            text: `Follow closely behind Student and ask where he is going so you can understand what he needs.`,
            score: 5,
            feedback: `Developing fidelity. Line of sight helps, but close following and questions can increase flight risk.`,
            wizard: `The Wizard follows carefully, but the space between adult and Student shrinks. Student may feel pursued before he can hear the question. His feet prepare to move faster. During potential elopement, questions and close pursuit can function like pressure.`,
            next: "step2_wobble",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Adaptation",
              errorType: "close pursuit plus questioning",
              function: "escape plus adult attention"
            }
          },
          C: {
            text: `Move quickly to block the doorway and tell Student, "You cannot leave this room."`,
            score: 0,
            feedback: `Low fidelity. Blocking can increase panic, aggression, or bolting unless required by safety protocol.`,
            wizard: `The Wizard's warning flare lights the doorway. Student sees the exit closing and the adult body in the path. His safest route is no longer obvious, so his body may choose speed or force. Physical blocking can create a power struggle and increase crisis risk.`,
            next: "step2_escalated",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Adaptation",
              errorType: "doorway blocking",
              function: "escape plus safety risk"
            }
          }
        }
      },

      step2_supported: {
        text: `Student slows near the doorway. He is not calm, but he has paused. Support has been signaled, and the hallway is still busy.`,
        choices: {
          A: {
            text: `Offer two safe choices: "Stand here with space or walk with me to the calm spot."`,
            score: 10,
            feedback: `High fidelity. You gave predictable choices that both preserve safety.`,
            wizard: `The Wizard creates two safe paths at the doorway. Student does not have to invent an escape route. Both choices keep him supervised, reduce danger, and leave room for recovery. Safe choices reduce escalation while maintaining adult support and line of sight.`,
            next: "step3_strong",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Prompting",
              errorType: "none",
              function: "escape plus safety risk"
            }
          },
          B: {
            text: `Ask, "Do you need a break or do you want to tell me what happened?"`,
            score: 5,
            feedback: `Developing fidelity. The intent is supportive, but talking may be too much during activation.`,
            wizard: `The Wizard watches Student's breathing. The words are kind, but the question asks Student to explain while his body is still in motion. The doorway remains too important. When safety is active, use fewer words and clearer choices.`,
            next: "step3_mixed",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Adaptation",
              errorType: "too much language during activation",
              function: "adult attention plus escape"
            }
          },
          C: {
            text: `Tell Student he will lose his next preferred activity if he steps into the hallway.`,
            score: 0,
            feedback: `Low fidelity. Threats near the exit can increase flight or emotional escalation.`,
            wizard: `The Wizard's alarm echoes down the hallway. Student is already near the door, and now the doorway carries a threat. The pressure rises right where safety is most fragile. Threats can intensify escape behavior during crisis.`,
            next: "step3_risk",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Performance feedback",
              errorType: "threat near exit",
              function: "escape plus adult attention"
            }
          }
        }
      },

      step2_wobble: {
        text: `Student glances back and speeds up. Your close following is starting to feel like a chase, even though you are trying to help.`,
        choices: {
          A: {
            text: `Increase space, keep line of sight, reduce language, and signal support clearly.`,
            score: 10,
            feedback: `High fidelity repair. You reduced pursuit cues while maintaining safety.`,
            wizard: `The Wizard slows the scene down. More space makes your presence less threatening. Student can pause without feeling caught, and support has a clearer way to enter. Safety support should reduce chase energy, not increase it.`,
            next: "step3_recovered",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Adaptation",
              errorType: "none",
              function: "escape plus safety risk"
            }
          },
          B: {
            text: `Keep following and repeat, "Stop walking. You need to stop walking now."`,
            score: 5,
            feedback: `Developing fidelity. The safety intent is clear, but repeated prompts may increase flight.`,
            wizard: `The Wizard keeps pace uneasily. Each repeated prompt may sound like the chase is still on. Student's feet remain ready to move because the demand is following him. Repeated verbal demands can become pressure during flight-risk moments.`,
            next: "step3_mixed",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Prompting",
              errorType: "repeated verbal demand",
              function: "escape"
            }
          },
          C: {
            text: `Call loudly, "Stop before you get yourself in trouble."`,
            score: 0,
            feedback: `Low fidelity. Public intensity can increase speed, shame, or unsafe movement.`,
            wizard: `The Wizard's cloak snaps. The doorway turns into a stage. Student hears volume, urgency, and trouble, which can make running more likely. Public intensity can escalate unsafe movement.`,
            next: "step3_risk",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Performance feedback",
              errorType: "public intensity",
              function: "escape plus adult attention"
            }
          }
        }
      },

      step2_escalated: {
        text: `Student lunges around your position and reaches toward the door. The classroom goes quiet. The situation is now more dangerous because the doorway has become a contest.`,
        choices: {
          A: {
            text: `Back off the block, maintain sight, clear nearby peers, and wait for support.`,
            score: 10,
            feedback: `High fidelity repair. You reduced physical pressure and protected safety.`,
            wizard: `The Wizard opens space before the collision happens. The mission is tense, but the physical contest ends. Support can now help without a blocked-doorway battle. Removing pressure can de-escalate unsafe movement while preserving supervision.`,
            next: "step3_recovered",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Adaptation",
              errorType: "repair after blocking",
              function: "escape plus safety risk"
            }
          },
          B: {
            text: `Stand aside but continue telling Student he needs to make a safe choice.`,
            score: 5,
            feedback: `Developing fidelity. Stepping aside helps, but repeated language may keep activation high.`,
            wizard: `The Wizard watches the doorway. The physical pressure lowers somewhat, but Student is still hearing demands while his body is in alarm mode. When activation is high, fewer words are usually safer.`,
            next: "step3_mixed",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Prompting",
              errorType: "continued verbal pressure",
              function: "adult attention plus escape"
            }
          },
          C: {
            text: `Hold the doorway position and insist Student return to his desk first.`,
            score: 0,
            feedback: `Low fidelity. Continuing to block may escalate into aggression or bolting.`,
            wizard: `The Wizard sounds the red alarm. The doorway becomes a contest. Student's safest path is no longer obvious, and the risk climbs. Do not turn a safety support into a physical power struggle.`,
            next: "step3_risk",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Adaptation",
              errorType: "continued blocking",
              function: "escape plus safety risk"
            }
          }
        }
      },

      step3_strong: {
        text: `Student stops beside the door and chooses to stand with space. His hands are down. He is not ready for work yet, but he is no longer moving toward the hallway.`,
        choices: {
          A: {
            text: `Privately reinforce safe stopping and offer one low-demand return step.`,
            score: 10,
            feedback: `High fidelity. You reinforced safety and rebuilt a small path back to the routine.`,
            wizard: `The Wizard lights the return path. Student learns that stopping safely, not leaving, opens the next door. The return step is small enough that re-entry feels possible. Reinforcing safe recovery helps the crisis end with regulation and access, not escape.`,
            ending: "success",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Performance feedback",
              errorType: "none",
              function: "escape plus safety risk"
            }
          },
          B: {
            text: `Let Student stand there quietly until he decides he is ready to return.`,
            score: 5,
            feedback: `Developing fidelity. Safety is improved, but the return routine is vague.`,
            wizard: `The Wizard waits beside the doorway. Student is safer, but readiness becomes the rule. The classroom routine remains distant. Stabilization should be followed by a clear, low-demand re-entry step.`,
            ending: "mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "vague return criteria",
              function: "escape"
            }
          },
          C: {
            text: `Ask Student to explain why he tried to leave before he can come back.`,
            score: 0,
            feedback: `Low fidelity. Explanation demands can restart leaving or refusal during recovery.`,
            wizard: `The Wizard blocks the question. Student's body just stopped moving. Asking for reasons now may push him back toward escape. Reflection belongs after regulation, re-entry, and reinforcement.`,
            ending: "mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "processing too early",
              function: "adult attention plus escape"
            }
          }
        }
      },

      step3_recovered: {
        text: `Student slows with support nearby. He is still tense, but the chase energy has dropped and the hallway is no longer the only focus.`,
        choices: {
          A: {
            text: `Reinforce the safe slowdown and prompt one small step toward the calm spot or desk.`,
            score: 10,
            feedback: `High fidelity repair. You reinforced recovery and shaped safe re-entry.`,
            wizard: `The Wizard rebuilds the path one safe step at a time. Student does not have to jump from crisis to full work. He only has to take the next safe step. Low-demand re-entry preserves safety while preventing escape from becoming the final outcome.`,
            ending: "success",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Fluency building",
              errorType: "none",
              function: "escape plus safety risk"
            }
          },
          B: {
            text: `Keep line of sight and wait silently until support decides what to do next.`,
            score: 5,
            feedback: `Developing fidelity. This may preserve safety, but active recovery support is limited.`,
            wizard: `The Wizard stands guard. Safety is the priority, and you have protected it. But the replacement path remains faint until a small return step is prompted. Containment is sometimes necessary, but teaching resumes with safe re-entry.`,
            ending: "mixed",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Adaptation",
              errorType: "containment without re-entry",
              function: "escape"
            }
          },
          C: {
            text: `Tell Student he can only return after promising not to leave again.`,
            score: 0,
            feedback: `Low fidelity. Verbal contracts during activation can become another demand.`,
            wizard: `The Wizard's warning light returns. The promise becomes a hurdle. Student is asked to talk his way back before his body is ready. Recovery should begin with safe behavior, not a verbal performance.`,
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

      step3_mixed: {
        text: `Student is supervised and no longer moving quickly, but the doorway still has power. The current response has lowered risk without fully teaching a return path.`,
        choices: {
          A: {
            text: `Prompt one safe return step and reinforce immediately when Student takes it.`,
            score: 10,
            feedback: `High fidelity repair. You taught and reinforced the return behavior.`,
            wizard: `The Wizard turns the doorway into a bridge instead of a reward. One safe step back earns reinforcement, and the classroom routine becomes reachable again. Re-entry must contact reinforcement for safe return to become stronger than leaving.`,
            ending: "success",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Performance feedback",
              errorType: "none",
              function: "escape plus safety risk"
            }
          },
          B: {
            text: `Allow a longer doorway reset and plan to re-enter once the class is quiet.`,
            score: 5,
            feedback: `Developing fidelity. Calm may improve, but the doorway may remain valuable.`,
            wizard: `The Wizard watches the reset stretch. Calm improves, but the doorway is doing a lot of work. The routine needs a clearer return signal. Open-ended resets can become escape if re-entry is not planned.`,
            ending: "mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "open-ended reset",
              function: "escape"
            }
          },
          C: {
            text: `Use the calm moment to explain that leaving the room is unsafe and not allowed.`,
            score: 0,
            feedback: `Low fidelity. Processing too soon can restart the episode or add adult attention.`,
            wizard: `The Wizard raises both hands. The crisis was cooling, but the explanation warms it again. Student's attention moves from safe return to defending why he left. Safety teaching happens after regulation and successful re-entry.`,
            ending: "fail",
            meta: {
              bipComponent: "Respond",
              mechanism: "Performance feedback",
              errorType: "processing too early",
              function: "adult attention plus escape"
            }
          }
        }
      },

      step3_risk: {
        text: `Student is still near the exit, tense and reactive. The situation needs fewer words, more space, and support.`,
        choices: {
          A: {
            text: `Reduce language, keep line of sight, and let support help create a calm return path.`,
            score: 10,
            feedback: `High fidelity repair. You reduced escalation and preserved safety.`,
            wizard: `The Wizard steadies the doorway. The scene is not fully recovered, but it is safer. The chase energy drains away, and support can rebuild the path back. In crisis, the best repair may be reducing pressure and restoring safety before teaching.`,
            ending: "mixed",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Adaptation",
              errorType: "recovery repair",
              function: "escape plus safety risk"
            }
          },
          B: {
            text: `Monitor quietly while support arrives and delay the classroom return demand.`,
            score: 5,
            feedback: `Developing fidelity. This may reduce immediate danger, but teaching is limited.`,
            wizard: `The Wizard stands guard. Safety is the priority, but the replacement routine will need more practice later. Stabilization is useful, but the plan still needs a safe re-entry step when possible.`,
            ending: "mixed",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Adaptation",
              errorType: "stabilization without re-entry",
              function: "escape"
            }
          },
          C: {
            text: `Continue insisting Student return immediately so leaving does not work.`,
            score: 0,
            feedback: `Low fidelity. Immediate insistence can intensify flight or aggression.`,
            wizard: `The Wizard's alarm fills the doorway. The demand to return becomes another reason to flee. The crisis remains active because the pressure keeps rising. Crisis support should not become a contest over compliance.`,
            ending: "fail",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Performance feedback",
              errorType: "immediate insistence",
              function: "escape plus safety risk"
            }
          }
        }
      }
    },

    endings: {
      success: {
        title: `Crisis Managed - Safe Stop and Re-Entry`,
        text: `Student stopped safely and began returning toward the routine because line of sight, support, minimal language, and reinforcement protected safety.`
      },
      mixed: {
        title: `Crisis Stabilized - Return Path Still Fragile`,
        text: `Safety improved, but the return routine was delayed, vague, or not reinforced as clearly as it could have been.`
      },
      fail: {
        title: `Crisis Escalated - Flight Risk Increased`,
        text: `The response pattern increased pressure, adult attention, blocking, or escape, making unsafe movement more likely.`
      }
    }
  });
})();
