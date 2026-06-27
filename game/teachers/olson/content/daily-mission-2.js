/* daily-mission-2.js
 * Mission: Reinforceable Example Content
 * Daily Mission 2: Rug Audience Shift
 *
 * Purpose:
 * - Practice implementation of the Example BIP during whole-group rug instruction.
 * - Primary function pressure: peer attention during public routines.
 * - Secondary function pressure: escape from public academic participation.
 * - Teacher skill: reduce the audience, prompt quiet participation, reinforce re-entry privately.
 *
 * Loading note:
 * - This file assumes the main engine has already created POOL.
 * - Later, the engine/html can load this file after the shared config and Example BIP file.
 * - For the current single-file version, paste this after POOL.daily has been initialized.
 */

(function registerDailyMission2() {
  if (typeof POOL === "undefined") {
    throw new Error("POOL must be defined before loading daily-mission-2.js");
  }

  POOL.daily = POOL.daily || [];

  POOL.daily.push({
    id: "daily_2_rug_audience_shift",
    title: "Daily Mission: Rug Audience Shift",
    start: "step1",
    focus: "Peer attention during whole-group instruction; reduce audience, prompt participation, and reinforce quiet engagement.",
    routine: "whole-group rug instruction",
    functionPressure: ["peer attention", "escape"],
    bipTargets: ["Prevent", "Teach", "Reinforce", "Respond"],

    steps: {
      step1: {
        text: `BIP Briefing: During whole-group instruction, Student is most likely to disrupt when peers nearby laugh or react. The plan is to use private proximity, give a concrete participation action, and reinforce quiet engagement quickly. Public correction can accidentally make peer attention more powerful.\n\nScene: The class is on the rug for a seven-minute phonics review. Student is seated near two peers who often laugh when he performs. You hold up the first sound card. Student slides backward, taps a peer's shoe with his heel, and whispers, "This is baby work." One peer covers a laugh.\n\nYou can feel the class starting to notice. What do you do first?`,
        choices: {
          A: {
            text: `From the front, remind Student that respectful learners keep hands and feet to themselves.`,
            score: 0,
            feedback: `Low fidelity. Public correction increases the audience and may strengthen the behavior.`,
            wizard: `The Wizard's robe snaps as twenty faces turn. Student's whisper becomes the main event. The sound card disappears from the room's attention, and the peer laugh gets bigger. When peer attention is part of the pathway, public correction can function as reinforcement.`,
            next: "step2_escalated",
            meta: {
              bipComponent: "Respond",
              mechanism: "Performance feedback",
              errorType: "public correction",
              function: "peer attention"
            }
          },
          B: {
            text: `Keep teaching and ignore it because the comment was quiet and you do not want to feed it.`,
            score: 5,
            feedback: `Developing fidelity. Adult attention stays low, but peer attention is already starting.`,
            wizard: `The Wizard watches the tiny laugh land. Adult attention stays low, which helps, but the peer payoff is still alive. Student now has room to test whether a slightly bigger move gets a bigger reaction. Planned ignoring is weak when peers continue to reinforce the behavior.`,
            next: "step2_wobble",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "ignoring while peer attention continues",
              function: "peer attention"
            }
          },
          C: {
            text: `Move near Student, keep your voice low, and cue one action: "Point to the sound with me."`,
            score: 10,
            feedback: `High fidelity. You reduced the audience and gave an incompatible participation response.`,
            wizard: `The Wizard lowers the stage lights and places the sound card back in the center. Student has something to do with his body besides perform. The peer laugh has less oxygen because the response is private, brief, and task-focused. You prompted a replacement participation response before peer attention escalated.`,
            next: "step2_supported",
            meta: {
              bipComponent: "Teach",
              mechanism: "Prompting",
              errorType: "none",
              function: "peer attention"
            }
          }
        }
      },

      step2_supported: {
        text: `Student points to the sound card with you. He is not fully engaged, but his feet are still and the peer laugh has stopped. This is a quiet re-entry moment.`,
        choices: {
          A: {
            text: `Give a quiet Chart Move and say, "Pointing with the group. Nice re-entry."`,
            score: 10,
            feedback: `High fidelity. You reinforced the exact participation behavior the plan targets.`,
            wizard: `The Wizard stamps the moment before it fades. Student learns that quiet participation, not performing, earns the powerful consequence. The rug routine keeps moving, and the peer audience stays small. Immediate, private reinforcement strengthens access to instruction without feeding the audience.`,
            next: "step3_strong",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Performance feedback",
              errorType: "none",
              function: "peer attention"
            }
          },
          B: {
            text: `Wait to praise him until he participates for the rest of the lesson.`,
            score: 5,
            feedback: `Developing fidelity. The first re-entry response needs reinforcement now, not later.`,
            wizard: `The Wizard sees the moment cooling. Student did the hard part, but the signal is delayed. The plan's target behavior is quiet and fragile, so it needs to matter immediately. Reinforce re-entry before expecting sustained engagement.`,
            next: "step3_mixed",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Performance feedback",
              errorType: "delayed reinforcement",
              function: "peer attention"
            }
          },
          C: {
            text: `Tell the nearby peers, "Thank you for not laughing. That helps Student."`,
            score: 0,
            feedback: `Low fidelity. This brings the peer audience back into Student's behavior.`,
            wizard: `The Wizard winces as the audience returns by invitation. Student hears his name linked to peer reactions, and the routine becomes social again instead of instructional. Avoid making peers part of the consequence when peer attention is a maintaining variable.`,
            next: "step3_mixed",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Performance feedback",
              errorType: "peer audience named",
              function: "peer attention"
            }
          }
        }
      },

      step2_wobble: {
        text: `Student taps the peer's shoe again, a little harder. The peer whispers, "Stop," but smiles. The behavior is still small, but now it is paying off.`,
        choices: {
          A: {
            text: `Move closer, quietly shift Student to the edge spot, and give him a sound-card job.`,
            score: 10,
            feedback: `High fidelity repair. You reduced the peer payoff and gave Student a role within the routine.`,
            wizard: `The Wizard slides Student out of the spotlight and hands him a job card. The peer reaction gets harder to reach, and participation becomes the new way to get noticed. You changed the antecedent arrangement and prompted a replacement role.`,
            next: "step3_recovered",
            meta: {
              bipComponent: "Prevent",
              mechanism: "Prompting",
              errorType: "none",
              function: "peer attention"
            }
          },
          B: {
            text: `Pause the lesson and ask Student whether he needs a break from the rug.`,
            score: 0,
            feedback: `Low fidelity. The disruption may produce escape from whole-group instruction.`,
            wizard: `The Wizard sees the rug turn into a trapdoor. Student tapped a peer and the task opened into a break. The sound-card routine loses strength because disruption changed the demand. Breaks should follow appropriate requests, not peer disruption.`,
            next: "step3_risk",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "break after disruption",
              function: "escape plus peer attention"
            }
          },
          C: {
            text: `Continue teaching and monitor him closely for a few more seconds.`,
            score: 5,
            feedback: `Developing fidelity. The moment stays calm, but the peer-attention pathway is still available.`,
            wizard: `The Wizard keeps one eye on the peer. Nothing has exploded, but Student still has access to the reaction he was testing. The routine is surviving, not strengthening. Monitoring alone does not teach or reinforce the replacement behavior.`,
            next: "step3_mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "monitoring without replacement prompt",
              function: "peer attention"
            }
          }
        }
      },

      step2_escalated: {
        text: `Student says, "I wasn't doing anything," loud enough for the rug to hear. Several students look over. The lesson has now become a public exchange.`,
        choices: {
          A: {
            text: `Stop debating, reduce language, move near him, and cue one quiet participation action.`,
            score: 10,
            feedback: `High fidelity repair. You stopped feeding the audience and rebuilt task participation.`,
            wizard: `The Wizard cuts the microphone. The argument has nowhere to grow because you do not argue back. Student gets a small action that lets him rejoin without winning or losing publicly. Repair means removing attention and prompting the replacement response.`,
            next: "step3_recovered",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "none",
              function: "peer attention"
            }
          },
          B: {
            text: `Tell him you will talk after the lesson and continue from the front.`,
            score: 5,
            feedback: `Developing fidelity. This stops the public exchange, but does not prompt re-entry.`,
            wizard: `The Wizard turns the lesson forward, which helps. But Student is still loose at the edge of the routine. The peer audience may fade, or it may wait for the next spark. Stopping attention is useful, but the BIP also requires active re-entry.`,
            next: "step3_mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "delayed re-entry",
              function: "peer attention"
            }
          },
          C: {
            text: `Move him away from the rug until he is ready to participate appropriately.`,
            score: 0,
            feedback: `Low fidelity unless safety requires it. This may reinforce escape and public attention.`,
            wizard: `The Wizard's alarm rings as Student leaves with the whole class watching. The rug demand disappears, the audience is huge, and the disruption has purchased exactly what the BIP is trying to prevent. Removal can strengthen both escape and attention pathways.`,
            next: "step3_risk",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "removal from routine",
              function: "escape plus peer attention"
            }
          }
        }
      },

      step3_strong: {
        text: `Student stays on the rug and points to the next sound card. The class rhythm is back, and Student is participating without a spotlight.`,
        choices: {
          A: {
            text: `Keep the reinforcement private and fade back while the routine is stable.`,
            score: 10,
            feedback: `High fidelity. You reinforced and then faded attention without disrupting the routine.`,
            wizard: `The Wizard steps backward as the lesson carries itself. Student remains connected without needing a spotlight. The routine, not the disruption, becomes the place where reinforcement happens. Fade support after reinforcement to build independence.`,
            ending: "success",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Fluency building",
              errorType: "none",
              function: "peer attention"
            }
          },
          B: {
            text: `Give a loud class praise statement about how everyone is doing better now.`,
            score: 0,
            feedback: `Low fidelity. The classwide praise pulls attention back to the previous disruption.`,
            wizard: `The Wizard shields the sound card too late. The class hears that something has been repaired, and Student feels the spotlight flicker back on. Reinforcement should not recreate the audience cue.`,
            ending: "mixed",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Performance feedback",
              errorType: "public praise",
              function: "peer attention"
            }
          },
          C: {
            text: `Stay beside him for the whole lesson to make sure he does not start again.`,
            score: 5,
            feedback: `Developing fidelity. This may maintain calm, but it risks making adult proximity necessary.`,
            wizard: `The Wizard stands close, perhaps too close. Student stays quiet, but the adult support is doing more work than the routine itself. Support should fade as soon as the replacement response is stable.`,
            ending: "mixed",
            meta: {
              bipComponent: "Prevent",
              mechanism: "Adaptation",
              errorType: "over-support without fading",
              function: "adult attention"
            }
          }
        }
      },

      step3_recovered: {
        text: `Student accepts the cue and turns toward the card. The audience is smaller, but the repair is still delicate.`,
        choices: {
          A: {
            text: `Privately reinforce the re-entry and give one more brief participation action.`,
            score: 10,
            feedback: `High fidelity. You reinforced the behavior that returned Student to instruction.`,
            wizard: `The Wizard repairs the rug routine stitch by stitch. Student gets credit for returning, not for escalating. The next action keeps him in the lesson before the audience can reform. Re-entry is a replacement behavior worth reinforcing.`,
            ending: "success",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Performance feedback",
              errorType: "none",
              function: "peer attention"
            }
          },
          B: {
            text: `Let the moment pass without feedback so it does not become a bigger deal.`,
            score: 5,
            feedback: `Developing fidelity. The re-entry behavior happened, but it was not strengthened.`,
            wizard: `The Wizard whispers with you, and the room stays calm. But Student may not know which part worked: silence, waiting, or returning to the card. Low-key reinforcement can still be immediate and specific.`,
            ending: "mixed",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Performance feedback",
              errorType: "missed reinforcement",
              function: "peer attention"
            }
          },
          C: {
            text: `Quietly remind him that the next disruption means he will leave the rug.`,
            score: 0,
            feedback: `Low fidelity. Threats add attention and make the rug feel more aversive.`,
            wizard: `The Wizard's warning light darkens the rug. Student just re-entered, but now the routine carries a threat. The next card feels heavier than it needs to. Consequence threats do not teach the replacement response.`,
            ending: "fail",
            meta: {
              bipComponent: "Respond",
              mechanism: "Performance feedback",
              errorType: "threat of removal",
              function: "escape plus adult attention"
            }
          }
        }
      },

      step3_mixed: {
        text: `Student is quieter but still watching the peers. The lesson is moving, but his engagement is thin.`,
        choices: {
          A: {
            text: `Give one private task cue and reinforce the first quiet participation response.`,
            score: 10,
            feedback: `High fidelity repair. You turned fragile quiet into reinforced participation.`,
            wizard: `The Wizard points to the smallest spark of engagement and makes it matter. Student learns what earns attention without performing. Reinforce the alternative before the problem behavior returns.`,
            ending: "success",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Performance feedback",
              errorType: "none",
              function: "peer attention"
            }
          },
          B: {
            text: `Continue the lesson and hope the peer interest fades on its own.`,
            score: 5,
            feedback: `Developing fidelity. This may work briefly, but the replacement response is still weak.`,
            wizard: `The Wizard watches the peer audience dim but not disappear. The class survives the moment, but Student's participation pathway is still underbuilt. Absence of disruption is not the same as strengthened replacement behavior.`,
            ending: "mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "waiting without replacement practice",
              function: "peer attention"
            }
          },
          C: {
            text: `Ask the peers near him to move away so Student can make better choices.`,
            score: 0,
            feedback: `Low fidelity. This publicly centers Student and may increase social attention.`,
            wizard: `The Wizard sees the seating change become a public announcement. Student's behavior rearranges peers, space, and adult action. That is a powerful outcome. Environmental changes should be planned quietly, not delivered as a public consequence.`,
            ending: "fail",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "public peer movement",
              function: "peer attention"
            }
          }
        }
      },

      step3_risk: {
        text: `Student is now farther from instruction, and the peer audience has become part of the routine. The next move needs to repair access without adding more attention.`,
        choices: {
          A: {
            text: `Use minimal language, reduce the audience, and offer one quiet way back into participation.`,
            score: 10,
            feedback: `High fidelity repair. You reduced the maintaining consequences and rebuilt access.`,
            wizard: `The Wizard dims the stage and reopens the rug routine through a side door. Student can return without a public victory or public defeat. The repair protects access to instruction while reducing the attention payoff.`,
            ending: "mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "recovery repair",
              function: "peer attention plus escape"
            }
          },
          B: {
            text: `Have him sit out until he can explain how to participate safely.`,
            score: 0,
            feedback: `Low fidelity. This delays instruction and adds language after escalation.`,
            wizard: `The Wizard closes the lesson gate. Student escapes the hard part and receives an adult conversation instead. The sound-card routine loses more ground. Processing before regulation and re-entry can strengthen escape.`,
            ending: "fail",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "processing before re-entry",
              function: "escape plus adult attention"
            }
          },
          C: {
            text: `Wait quietly until the class attention returns to the lesson.`,
            score: 5,
            feedback: `Developing fidelity. This may reduce attention, but it does not actively teach re-entry.`,
            wizard: `The Wizard waits for the spotlight to fade. It may fade, but Student still lacks a clear path back to the card, the group, and the routine. Stabilization needs to be followed by replacement practice.`,
            ending: "mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "stabilization without re-entry",
              function: "peer attention"
            }
          }
        }
      }
    },

    endings: {
      success: {
        title: `Success - Rug Routine Protected`,
        text: `Student accessed instruction because peer attention was reduced, participation was prompted, and quiet engagement was reinforced.`
      },
      mixed: {
        title: `Mixed - Audience Reduced, Engagement Fragile`,
        text: `The lesson continued, but the replacement participation response was not reinforced as clearly as it could have been.`
      },
      fail: {
        title: `Fail - Audience Pathway Strengthened`,
        text: `The response pattern made peer or adult attention more valuable than quiet participation.`
      }
    }
  });
})();
