/* daily-mission-3.js
 * Mission: Reinforceable Example Content
 * Daily Mission 3: Partner Role Bridge
 *
 * Purpose:
 * - Practice implementation of the Example BIP during partner-work transitions.
 * - Primary function pressure: escape from uncertain or difficult peer routines.
 * - Secondary function pressure: peer/adult attention during public refusal.
 * - Teacher skill: offer role choice, prompt one visible partner-work action, reinforce flexible joining.
 *
 * Loading note:
 * - This file assumes the main engine has already created POOL.
 * - Later, the engine/html can load this file after the shared config and Example BIP file.
 * - For the current single-file version, paste this after POOL.daily has been initialized.
 */

(function registerDailyMission3() {
  if (typeof POOL === "undefined") {
    throw new Error("POOL must be defined before loading daily-mission-3.js");
  }

  POOL.daily = POOL.daily || [];

  POOL.daily.push({
    id: "daily_3_partner_role_bridge",
    title: "Daily Mission: Partner Role Bridge",
    start: "step1",
    focus: "Partner-work transition; use role clarity and choice to prevent refusal and reinforce flexible joining.",
    routine: "partner work transition",
    functionPressure: ["escape", "peer attention", "uncertainty"],
    bipTargets: ["Prevent", "Teach", "Reinforce", "Respond"],

    steps: {
      step1: {
        text: `BIP Briefing: Student often refuses partner work when roles are unclear, peers are watching, or the task feels hard. The plan is to privately offer two role choices that both keep Student in the partner routine, prompt one clear first action, and reinforce flexible joining. Avoid removing partner work unless safety requires it.\n\nScene: You are moving from mini-lesson to partner practice. The room gets louder as chairs scrape and students look for their materials. Student notices that his usual partner is absent. He crosses his arms and says, "I'm not working with anybody today." A few nearby students pause to see what you will do.\n\nThe transition can still become flexible practice instead of refusal. What is your first move?`,
        choices: {
          A: {
            text: `Tell Student, "Everyone has a partner today. Pick someone quickly so we can start."`,
            score: 5,
            feedback: `Developing fidelity. The expectation is clear, but the support is not specific enough for this routine.`,
            wizard: `The Wizard hears the clock ticking. Partner work remains the goal, but Student still has to solve the hardest parts: who to join, what role to take, and how to begin. Peers keep watching the delay. Expectations need to be paired with a replacement response and first action.`,
            next: "step2_wobble",
            meta: {
              bipComponent: "Prevent",
              mechanism: "Prompting",
              errorType: "clear expectation without support",
              function: "escape plus peer attention"
            }
          },
          B: {
            text: `Privately offer, "Reader or checker? Choose your role, then sit beside the table partner with the card."`,
            score: 10,
            feedback: `High fidelity. You gave control within the expected routine and made the first action visible.`,
            wizard: `The Wizard lays two role cards on the table like safe paths. Student does not have to escape partner work to gain control. He can choose how to enter it. Role choice reduces uncertainty while preserving access to peer instruction.`,
            next: "step2_supported",
            meta: {
              bipComponent: "Prevent",
              mechanism: "Prompting",
              errorType: "none",
              function: "escape from uncertainty"
            }
          },
          C: {
            text: `Let Student work alone today so the rest of the class can begin partner practice smoothly.`,
            score: 0,
            feedback: `Low fidelity. This may reinforce refusal by removing the partner-work demand.`,
            wizard: `The Wizard watches the partner bridge vanish. Student refused, and the peer routine disappeared. The class may start smoothly, but Student's escape pathway just got stronger. Adaptations should preserve the function-based goal whenever possible.`,
            next: "step2_escape_opened",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "removed peer routine",
              function: "escape"
            }
          }
        }
      },

      step2_supported: {
        text: `Student takes the checker card but stays standing. The table partner looks at the materials and waits. Student is close to joining, but he is not yet in the routine.`,
        choices: {
          A: {
            text: `Point to the seat and say, "Sit beside your partner and check number one with your finger."`,
            score: 10,
            feedback: `High fidelity. You turned the role choice into an observable partner-work response.`,
            wizard: `The Wizard anchors the role card to a real action. Student has a place, a peer, and a first move. The transition becomes physical and doable instead of social and vague. Prompting the first role action builds fluency with the replacement routine.`,
            next: "step3_strong",
            meta: {
              bipComponent: "Teach",
              mechanism: "Fluency building",
              errorType: "none",
              function: "escape from uncertainty"
            }
          },
          B: {
            text: `Give him a moment because he accepted the role and may sit when he is ready.`,
            score: 5,
            feedback: `Developing fidelity. The role was accepted, but the entry response still needs support.`,
            wizard: `The Wizard watches Student hover between refusal and participation. The role card is helpful, but it is not yet behavior in the routine. Reinforce and shape the first movement into partner work.`,
            next: "step3_mixed",
            meta: {
              bipComponent: "Teach",
              mechanism: "Prompting",
              errorType: "missed first action prompt",
              function: "escape"
            }
          },
          C: {
            text: `Tell him, "You picked checker, so now you need to stop delaying."`,
            score: 0,
            feedback: `Low fidelity. This adds pressure after a successful choice and may restart refusal.`,
            wizard: `The Wizard sees the safe path turn sharp. Student's role choice starts to feel like a trap, and the peer audience flickers back to life. Avoid turning replacement behavior into a new demand conflict.`,
            next: "step3_mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Performance feedback",
              errorType: "pressure after replacement response",
              function: "escape plus adult attention"
            }
          }
        }
      },

      step2_wobble: {
        text: `Student says, "I don't care," and stands between his desk and the partner area. The class is mostly moving, but several peers are still watching.`,
        choices: {
          A: {
            text: `Ask him why he is refusing partner work today so you can solve the real problem.`,
            score: 0,
            feedback: `Low fidelity in the moment. Public problem solving increases attention and delays re-entry.`,
            wizard: `The Wizard watches the transition turn into an interview. Student now has words, attention, and an audience instead of a role and first step. Problem solving belongs later, after the routine is stabilized.`,
            next: "step3_risk",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "processing too early",
              function: "adult attention plus peer attention"
            }
          },
          B: {
            text: `Offer two role choices quietly and point to the exact seat where he can start.`,
            score: 10,
            feedback: `High fidelity repair. You added privacy, role clarity, and a first action.`,
            wizard: `The Wizard narrows the noisy room into one seat and two roles. Student can stop performing and enter the routine through a choice that still leads to partner work. Antecedent support reduces uncertainty and prevents escape.`,
            next: "step3_recovered",
            meta: {
              bipComponent: "Prevent",
              mechanism: "Prompting",
              errorType: "none",
              function: "escape from uncertainty"
            }
          },
          C: {
            text: `Tell him you will come back in one minute and continue organizing the other partners.`,
            score: 5,
            feedback: `Developing fidelity. This reduces adult attention, but it delays active support for joining.`,
            wizard: `The Wizard lets the room move on. The audience shrinks, which helps, but Student remains outside the routine. A minute can become a quiet escape window. Low attention is helpful only if re-entry is still prompted.`,
            next: "step3_mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "delayed re-entry",
              function: "escape"
            }
          }
        }
      },

      step2_escape_opened: {
        text: `Student sits alone with a copy of the partner task. He looks relieved. The table partner starts with another student. Student is quiet, but he is no longer practicing the peer routine.`,
        choices: {
          A: {
            text: `Let him work alone today and plan to practice partner roles tomorrow.`,
            score: 5,
            feedback: `Developing fidelity. The class is calm, but the refusal sequence ended with escape from partner work.`,
            wizard: `The Wizard closes today's partner bridge. The room is quiet, but Student avoided the exact routine the BIP is trying to protect. Tomorrow's partner transition may be harder. Delayed practice rarely competes with immediate escape.`,
            next: "step3_mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "practice delayed after refusal",
              function: "escape"
            }
          },
          B: {
            text: `Bring a role card over and say, "Check number one here, then join the partner for number two."`,
            score: 10,
            feedback: `High fidelity repair. You made a temporary adaptation while preserving re-entry to partner work.`,
            wizard: `The Wizard rebuilds the bridge in two steps. Student gets a lower-demand start, but the path still leads back to the peer routine. Adaptation should preserve the function-based goal and include a return plan.`,
            next: "step3_recovered",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "none",
              function: "escape from uncertainty"
            }
          },
          C: {
            text: `Tell him working alone is not fair because everyone else has to work with a partner.`,
            score: 0,
            feedback: `Low fidelity. This adds social pressure and may restart refusal.`,
            wizard: `The Wizard's warning light glows over the empty seat. Student hears fairness, but his body hears pressure. The partner routine becomes heavier, not safer. Social comparison does not teach the replacement behavior.`,
            next: "step3_risk",
            meta: {
              bipComponent: "Respond",
              mechanism: "Performance feedback",
              errorType: "social pressure",
              function: "escape plus adult attention"
            }
          }
        }
      },

      step3_strong: {
        text: `Student sits beside the partner and touches number one with the checker card. This is the exact flexible joining behavior the plan is trying to build.`,
        choices: {
          A: {
            text: `Mark a Chart Move and say privately, "Flexible joining. You are checking number one."`,
            score: 10,
            feedback: `High fidelity. You reinforced flexible entry into the partner routine immediately.`,
            wizard: `The Wizard stamps the role card before the moment cools. Student learns that joining the peer routine, not refusing it, changes the outcome. The partner task now has a first step and a payoff. Immediate, specific reinforcement strengthens flexible participation.`,
            ending: "success",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Performance feedback",
              errorType: "none",
              function: "escape from uncertainty"
            }
          },
          B: {
            text: `Let the pair begin and save praise until Student completes the first partner item.`,
            score: 5,
            feedback: `Developing fidelity. Completion matters, but flexible joining was the fragile target behavior.`,
            wizard: `The Wizard watches the first success pass quietly. Student joined, which was the hard part, but the consequence waits for a later behavior. Reinforce the response you most need to see again.`,
            ending: "mixed",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Performance feedback",
              errorType: "delayed reinforcement",
              function: "escape"
            }
          },
          C: {
            text: `Tell the partner, "Thanks for helping Student join even though it was hard."`,
            score: 0,
            feedback: `Low fidelity. This makes Student's difficulty public and shifts attention to the peer.`,
            wizard: `The Wizard winces as the peer becomes part of the consequence. Student joined, but now the routine feels like a public rescue story. Reinforcement should name Student's replacement behavior without rebuilding the audience.`,
            ending: "mixed",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Performance feedback",
              errorType: "public peer attention",
              function: "peer attention"
            }
          }
        }
      },

      step3_recovered: {
        text: `Student moves toward the partner space after hesitation. He is still tense, but the peer routine is available again.`,
        choices: {
          A: {
            text: `Review the refusal privately before he starts so he understands the expectation.`,
            score: 0,
            feedback: `Low fidelity. Processing before re-entry can restart resistance and delay the routine.`,
            wizard: `The Wizard sees the bridge pause just before Student crosses it. The refusal story returns, and the partner task waits in the background. Process later, after regulation and successful re-entry.`,
            ending: "mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "processing before re-entry",
              function: "adult attention plus escape"
            }
          },
          B: {
            text: `Let him join silently so the moment stays small and does not become a spotlight.`,
            score: 5,
            feedback: `Developing fidelity. The low-attention approach helps, but flexible joining is not reinforced.`,
            wizard: `The Wizard keeps the room quiet, and that matters. But Student's successful return slips by without a clear signal. Reinforcement can stay private and still be immediate.`,
            ending: "mixed",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Performance feedback",
              errorType: "missed reinforcement",
              function: "escape"
            }
          },
          C: {
            text: `Reinforce the move toward the partner, then prompt one low-demand role action.`,
            score: 10,
            feedback: `High fidelity. You reinforced re-entry and shaped the next partner-work response.`,
            wizard: `The Wizard lights the bridge one plank at a time. Student gets credit for moving toward the routine, then receives a small action that makes joining possible. Re-entry plus low-demand action builds fluency after hesitation.`,
            ending: "success",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Fluency building",
              errorType: "none",
              function: "escape from uncertainty"
            }
          }
        }
      },

      step3_mixed: {
        text: `Student is calm, but he is only loosely connected to the partner routine. The class is working, and this could still become practice or quiet avoidance.`,
        choices: {
          A: {
            text: `Prompt one role-based action and reinforce it immediately when Student starts.`,
            score: 10,
            feedback: `High fidelity repair. You converted partial presence into reinforced participation.`,
            wizard: `The Wizard points to the role card again. Student finally has a concrete job, and the Chart Move makes that job matter. The partner routine becomes more than sitting near someone. Participation must be observable before it can become fluent.`,
            ending: "success",
            meta: {
              bipComponent: "Teach",
              mechanism: "Fluency building",
              errorType: "none",
              function: "escape"
            }
          },
          B: {
            text: `Keep the room calm and wait to see whether Student joins more fully on his own.`,
            score: 5,
            feedback: `Developing fidelity. Calm is useful, but the replacement routine remains weak.`,
            wizard: `The Wizard watches the partner routine wobble forward. Nothing is getting worse, but Student's role is still blurry. Waiting may preserve calm, but it does not build the replacement response.`,
            ending: "mixed",
            meta: {
              bipComponent: "Teach",
              mechanism: "Prompting",
              errorType: "waiting without replacement practice",
              function: "escape"
            }
          },
          C: {
            text: `Tell Student that if he refuses partner work again, he will lose the next choice activity.`,
            score: 0,
            feedback: `Low fidelity. Threats make partner work more aversive and do not teach the replacement response.`,
            wizard: `The Wizard darkens the partner card. Student may comply for the moment, but the routine now predicts future loss. The next partner transition just became heavier. Consequence threats add pressure without building fluency.`,
            ending: "fail",
            meta: {
              bipComponent: "Respond",
              mechanism: "Performance feedback",
              errorType: "threat of loss",
              function: "escape plus adult attention"
            }
          }
        }
      },

      step3_risk: {
        text: `Student is now more focused on the adult interaction than the partner task. Peers are aware of the delay, and the routine is becoming socially loaded.`,
        choices: {
          A: {
            text: `Reduce language, shrink the audience, and offer one quiet role action that leads back to the partner.`,
            score: 10,
            feedback: `High fidelity repair. You reduced attention and rebuilt a small path back into the routine.`,
            wizard: `The Wizard lowers the noise around the table. The argument, fairness talk, and peer watching fade behind one role action. Student can return without needing a public win or a public apology. Repair means reducing maintaining consequences and prompting re-entry.`,
            ending: "mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "recovery repair",
              function: "escape plus attention"
            }
          },
          B: {
            text: `Have Student work away from the group until he can explain how partner work should look.`,
            score: 0,
            feedback: `Low fidelity. This removes access and adds a language demand after escalation.`,
            wizard: `The Wizard closes the peer routine and opens an adult conversation instead. Student escapes partner work and now has to talk his way back before he can practice. Exclusion plus processing can strengthen escape from peer routines.`,
            ending: "fail",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "removal plus processing",
              function: "escape plus adult attention"
            }
          },
          C: {
            text: `Wait quietly until the class is settled, then decide whether to invite him back.`,
            score: 5,
            feedback: `Developing fidelity. This may reduce escalation, but the return path is still unclear.`,
            wizard: `The Wizard lets the storm pass, but the bridge remains unfinished. Student may calm down, yet the partner routine has not been practiced or reinforced. Stabilization should be followed by a low-demand re-entry step.`,
            ending: "mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "stabilization without re-entry",
              function: "escape"
            }
          }
        }
      }
    },

    endings: {
      success: {
        title: `Success - Partner Routine Protected`,
        text: `Student accessed the peer routine because role choice, a clear first action, and immediate reinforcement made flexible joining possible.`
      },
      mixed: {
        title: `Mixed - Partner Work Survived, Flexibility Still Fragile`,
        text: `Student moved closer to the routine, but role-based participation or reinforcement was delayed, vague, or incomplete.`
      },
      fail: {
        title: `Fail - Partner Refusal Strengthened`,
        text: `The response pattern made escape, adult attention, or peer attention more valuable than flexible participation.`
      }
    }
  });
})();
