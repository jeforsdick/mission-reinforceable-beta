/* crisis-mission-2.js
 * Mission: Reinforceable Example Content
 * Crisis Mission 2: Peer Safety in Line
 *
 * Purpose:
 * - Practice implementation of the Example BIP during an unsafe peer moment in a line transition.
 * - Primary function pressure: peer attention and escape from a crowded/noisy transition.
 * - Secondary function pressure: safety risk, adult attention, and public escalation.
 * - Teacher skill: clear peers, create space, use minimal language, signal support, reinforce safe recovery.
 *
 * Loading note:
 * - This file assumes the main engine has already created POOL.
 * - Later, the engine/html can load this file after the shared config and Example BIP file.
 * - For the current single-file version, paste this after POOL.crisis has been initialized.
 */

(function registerCrisisMission2() {
  if (typeof POOL === "undefined") {
    throw new Error("POOL must be defined before loading crisis-mission-2.js");
  }

  POOL.crisis = POOL.crisis || [];

  POOL.crisis.push({
    id: "crisis_2_peer_safety_in_line",
    title: "Crisis Drill: Peer Safety in Line",
    start: "step1",
    focus: "Unsafe peer moment; clear peers, create space, use minimal language, and reinforce safe recovery.",
    routine: "line transition / peer safety",
    functionPressure: ["peer attention", "escape", "safety risk", "adult attention"],
    bipTargets: ["Crisis Respond", "Respond", "Reinforce"],

    steps: {
      step1: {
        text: `BIP Briefing: When Student uses unsafe body movements near peers, safety comes before teaching or processing. The plan is to create space, move peers away, use one brief safety directive, and signal for support if needed. Avoid asking what happened, assigning blame, requiring an apology, or giving a long explanation while Student is still activated.\n\nScene: The class is lining up after a noisy indoor recess. Bodies are close, backpacks brush shoulders, and Student is already breathing fast. A peer accidentally bumps Student while reaching for a jacket. Student kicks toward the peer and swings an arm as several students gasp.\n\nThis is no longer a teaching moment first. It is a safety moment. What do you do first?`,
        choices: {
          A: {
            text: `Create space, move nearby peers back, use one brief safety directive, and signal for support.`,
            score: 10,
            feedback: `High fidelity. You prioritized safety, space, minimal language, and support.`,
            wizard: `The Wizard throws a shield between Student and the line. Peers move out of reach, the audience shrinks, and your words stay short enough for Student to process. The crisis has a chance to slow down. During immediate safety risk, reduce access to unsafe contact and lower stimulation before teaching.`,
            next: "step2_supported",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Prompting",
              errorType: "none",
              function: "peer attention plus safety risk"
            }
          },
          B: {
            text: `Stand close, ask what happened, and remind Student that kicking is unsafe.`,
            score: 5,
            feedback: `Developing fidelity. The concern is valid, but the language and proximity are too much during immediate risk.`,
            wizard: `The Wizard stiffens. Your intent is supportive, but the questions arrive while Student is still activated. The peer is still close, and Student's body is not ready for a conversation. Safety moments call for fewer words and more space.`,
            next: "step2_wobble",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Adaptation",
              errorType: "questioning during crisis",
              function: "adult attention plus safety risk"
            }
          },
          C: {
            text: `Tell Student to stop immediately and direct the line to keep moving around him.`,
            score: 0,
            feedback: `Low fidelity. Moving the line around Student may increase crowding, audience, and risk.`,
            wizard: `The Wizard's alarm flashes down the hallway. Peers are still moving near Student, the audience is larger, and the unsafe moment now has more bodies in motion. Safety requires clearing space, not adding movement around the crisis.`,
            next: "step2_escalated",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Adaptation",
              errorType: "kept peers moving nearby",
              function: "safety risk plus peer attention"
            }
          }
        }
      },

      step2_supported: {
        text: `Peers step back. Student is still tense, but the immediate strike zone is clear. Support has been signaled, and the hallway is quieter.`,
        choices: {
          A: {
            text: `Repeat one brief directive: "Hands down. Space." Then guide toward the reset area with distance.`,
            score: 10,
            feedback: `High fidelity. You kept language low and shifted toward de-escalation.`,
            wizard: `The Wizard lowers the volume of the scene. Student hears one direction, not a lecture. The reset area becomes the next safe destination without turning the line into a courtroom. Minimal directives and space help move from safety risk to recovery.`,
            next: "step3_strong",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Prompting",
              errorType: "none",
              function: "safety risk"
            }
          },
          B: {
            text: `Tell Student he is safe now and ask him to explain what he needs.`,
            score: 5,
            feedback: `Developing fidelity. The statement is supportive, but explanation may be too demanding during activation.`,
            wizard: `The Wizard watches Student's breathing. The words are kind, but the expectation to explain may come too early. Regulation is still the first job. Replacement language is easier after the body has returned to safety.`,
            next: "step3_mixed",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Adaptation",
              errorType: "explanation demand during activation",
              function: "adult attention"
            }
          },
          C: {
            text: `Tell Student the line cannot move until he shows everyone calm behavior.`,
            score: 0,
            feedback: `Low fidelity. This makes Student responsible for the whole group's waiting.`,
            wizard: `The Wizard points to the watching class. The pressure grows. Student can feel every peer waiting on him, and that audience can fuel the next burst. Public pressure can strengthen peer attention and escalation.`,
            next: "step3_risk",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Performance feedback",
              errorType: "public pressure",
              function: "peer attention plus escape"
            }
          }
        }
      },

      step2_wobble: {
        text: `Student yells, "He hit me first!" and steps toward the peer again. The line tightens, and students are watching.`,
        choices: {
          A: {
            text: `Stop the discussion, clear peers away, use one safety directive, and call support.`,
            score: 10,
            feedback: `High fidelity repair. You returned to safety instead of continuing the conversation.`,
            wizard: `The Wizard snaps the shield back up. The story of blame can wait. Bodies move apart, language shrinks, and the crisis loses some fuel. Safety is restored by reducing access, audience, and verbal load.`,
            next: "step3_recovered",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Adaptation",
              errorType: "none",
              function: "safety risk plus peer attention"
            }
          },
          B: {
            text: `Tell both students you will solve it after they each calm their bodies.`,
            score: 5,
            feedback: `Developing fidelity. The timing is reasonable, but peer separation still needs to happen immediately.`,
            wizard: `The Wizard sees the missing piece. The words are reasonable, but the peer is still too close. Safety needs more than a future promise. Calm language helps, but immediate space is the active safety ingredient.`,
            next: "step3_mixed",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Adaptation",
              errorType: "delayed peer separation",
              function: "safety risk"
            }
          },
          C: {
            text: `Tell Student he is making it worse and needs to take responsibility now.`,
            score: 0,
            feedback: `Low fidelity. Blame language can intensify crisis behavior.`,
            wizard: `The Wizard's warning bell rings. Student's face tightens. The crisis shifts from safety to shame, and aggression risk rises again. Accountability conversations belong after safety, regulation, and re-entry.`,
            next: "step3_risk",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Performance feedback",
              errorType: "blame language",
              function: "adult attention plus escape"
            }
          }
        }
      },

      step2_escalated: {
        text: `The line keeps shifting. Student swings again as another backpack brushes his arm. A few peers step back on their own, but the scene is disorganized.`,
        choices: {
          A: {
            text: `Stop the moving line, clear space around Student, reduce language, and wait for support.`,
            score: 10,
            feedback: `High fidelity repair. You reduced movement, crowding, and stimulation.`,
            wizard: `The Wizard freezes the hallway traffic and opens space around Student. The mission is risky, but removing motion slows the spiral. Support can enter a less chaotic scene. Crisis repair often starts by changing the environment, not increasing demands.`,
            next: "step3_recovered",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Adaptation",
              errorType: "recovery repair",
              function: "safety risk"
            }
          },
          B: {
            text: `Stand between Student and peers while repeating that everyone needs to stay calm.`,
            score: 5,
            feedback: `Developing fidelity. You are trying to protect peers, but repeated language may keep activation high.`,
            wizard: `The Wizard holds the line with effort. Peers are safer, but Student keeps hearing words while his body is still in alarm mode. Physical positioning may help, but language should shrink as activation rises.`,
            next: "step3_mixed",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Prompting",
              errorType: "repeated language during crisis",
              function: "adult attention"
            }
          },
          C: {
            text: `Insist Student walk with you immediately before anyone else moves.`,
            score: 0,
            feedback: `Low fidelity. Insistence during high activation can increase aggression or flight.`,
            wizard: `The Wizard's red signal flashes. Student sees no exit except escalation. The demand to move now becomes another trigger while his body is still unsafe. Immediate compliance demands can intensify crisis behavior.`,
            next: "step3_risk",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Performance feedback",
              errorType: "immediate compliance demand",
              function: "escape plus safety risk"
            }
          }
        }
      },

      step3_strong: {
        text: `Student reaches the reset area with space from peers. His breathing is still heavy, but his hands are down. This is the recovery window.`,
        choices: {
          A: {
            text: `Reinforce safe body quietly and offer one low-demand re-entry plan.`,
            score: 10,
            feedback: `High fidelity. You reinforced recovery and planned a safe return.`,
            wizard: `The Wizard's shield fades into a doorway. Student learns that calm recovery, not aggression, opens the path back. The next step is small enough to be safe. Reinforcing safe recovery helps the crisis end with regulation and access.`,
            ending: "success",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Performance feedback",
              errorType: "none",
              function: "safety risk plus peer attention"
            }
          },
          B: {
            text: `Let Student rest quietly and return him once the line has already left.`,
            score: 5,
            feedback: `Developing fidelity. This may preserve safety, but recovery is not clearly reinforced or taught.`,
            wizard: `The Wizard nods cautiously. The crisis ends, but the recovery skill is quiet and unmarked. Student may calm, yet the plan did not fully teach what worked. Safe body and re-entry should contact reinforcement when possible.`,
            ending: "mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "missed recovery reinforcement",
              function: "escape"
            }
          },
          C: {
            text: `Process the kick immediately so Student understands why the reset happened.`,
            score: 0,
            feedback: `Low fidelity. Processing during recovery can reignite escalation.`,
            wizard: `The Wizard raises both hands. Student's calm is still thin. The discussion pulls him back toward the hot moment before his body is ready. Processing belongs after regulation and successful re-entry.`,
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

      step3_recovered: {
        text: `Student is separated from peers and the immediate danger is lower. He is still activated, but the crisis is no longer growing.`,
        choices: {
          A: {
            text: `Use one calm directive, reinforce the first safe response, and preview a low-demand return.`,
            score: 10,
            feedback: `High fidelity repair. You moved from stabilization to recovery and re-entry.`,
            wizard: `The Wizard guides the scene toward safety. One calm response becomes the new target, and reinforcement gives Student a reason to stay there. Crisis repair strengthens the first safe behavior that replaces escalation.`,
            ending: "success",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Fluency building",
              errorType: "none",
              function: "safety risk plus peer attention"
            }
          },
          B: {
            text: `Maintain space and wait for support without adding more directions.`,
            score: 5,
            feedback: `Developing fidelity. This is safe but incomplete if recovery behavior is not strengthened.`,
            wizard: `The Wizard stands watch. The scene may stay safe, but Student is not learning the next replacement step yet. Waiting can protect safety, but re-entry still needs a plan.`,
            ending: "mixed",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Adaptation",
              errorType: "containment without teaching",
              function: "safety risk"
            }
          },
          C: {
            text: `Tell Student he must apologize before returning to any group activity.`,
            score: 0,
            feedback: `Low fidelity. Social demands can restart escalation during crisis recovery.`,
            wizard: `The Wizard blocks the apology demand. Student's body is barely regulated, and the social pressure risks lighting the crisis again. Restorative steps come after safety, regulation, and re-entry are stable.`,
            ending: "fail",
            meta: {
              bipComponent: "Respond",
              mechanism: "Performance feedback",
              errorType: "apology demand too early",
              function: "peer attention plus escape"
            }
          }
        }
      },

      step3_mixed: {
        text: `The immediate danger is lower, but Student is still activated. Peers are somewhat separated, and you need to avoid restarting the crisis.`,
        choices: {
          A: {
            text: `Prompt one visible safe response and reinforce it immediately when it happens.`,
            score: 10,
            feedback: `High fidelity repair. You turned stabilization into reinforced recovery.`,
            wizard: `The Wizard points to the first safe spark. Hands down, body still, or one step with space becomes the behavior that matters now. Reinforce safety before increasing demands.`,
            ending: "success",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Performance feedback",
              errorType: "none",
              function: "safety risk"
            }
          },
          B: {
            text: `Keep monitoring and wait until Student appears fully calm before doing anything else.`,
            score: 5,
            feedback: `Developing fidelity. This may keep safety, but the recovery routine remains vague.`,
            wizard: `The Wizard waits beside the reset area. The danger may keep fading, but Student may not know which safe response worked. Recovery behaviors should be named and reinforced when possible.`,
            ending: "mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "waiting without reinforcement",
              function: "escape"
            }
          },
          C: {
            text: `Explain that the peer did not mean to bump him and he needs to let it go.`,
            score: 0,
            feedback: `Low fidelity. Reasoning about blame can pull Student back into the conflict.`,
            wizard: `The Wizard hears the peer story reopen. Student's body tightens as the original trigger returns to center stage. Explanation during activation can re-evoke the crisis context.`,
            ending: "fail",
            meta: {
              bipComponent: "Respond",
              mechanism: "Performance feedback",
              errorType: "blame processing during activation",
              function: "adult attention plus peer attention"
            }
          }
        }
      },

      step3_risk: {
        text: `Student remains tense and the peer audience is still part of the scene. A poor next move could trigger another unsafe response.`,
        choices: {
          A: {
            text: `Stop all discussion, clear more space, and wait for support while using minimal prompts.`,
            score: 10,
            feedback: `High fidelity repair. You reduced stimulation and protected safety.`,
            wizard: `The Wizard pulls the mission back from danger. Fewer words and more space remove the fuel. It is not elegant, but it is safer. In crisis, reducing risk is the immediate goal before teaching resumes.`,
            ending: "mixed",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Adaptation",
              errorType: "recovery repair",
              function: "safety risk plus peer attention"
            }
          },
          B: {
            text: `Keep Student away from peers and monitor quietly until the group transitions.`,
            score: 5,
            feedback: `Developing fidelity. Safety may be preserved, but active recovery support is limited.`,
            wizard: `The Wizard keeps one eye on the line. The risk lowers, but Student is mostly contained rather than taught a recovery path. Containment may be necessary, but the BIP still needs safe recovery and re-entry later.`,
            ending: "mixed",
            meta: {
              bipComponent: "Crisis Respond",
              mechanism: "Adaptation",
              errorType: "containment without re-entry",
              function: "safety risk"
            }
          },
          C: {
            text: `Continue explaining the safety concern until Student acknowledges what happened.`,
            score: 0,
            feedback: `Low fidelity. Extended language can prolong or restart crisis behavior.`,
            wizard: `The Wizard sounds the final alarm. The explanation becomes another demand. Student's breathing spikes, and the crisis remains alive. Acknowledgment is not the priority while safety and regulation are still fragile.`,
            ending: "fail",
            meta: {
              bipComponent: "Respond",
              mechanism: "Performance feedback",
              errorType: "extended explanation during crisis",
              function: "adult attention plus escape"
            }
          }
        }
      }
    },

    endings: {
      success: {
        title: `Crisis Managed - Safety and Recovery`,
        text: `Peers were protected, language stayed low, and Student contacted reinforcement for safe recovery rather than unsafe body movements.`
      },
      mixed: {
        title: `Crisis Stabilized - Teaching Was Limited`,
        text: `Safety improved, but the recovery behavior or re-entry path was not strengthened as clearly as it could have been.`
      },
      fail: {
        title: `Crisis Escalated - Risk Increased`,
        text: `The response pattern increased audience, pressure, blame, or unsafe proximity, making renewed crisis behavior more likely.`
      }
    }
  });
})();
