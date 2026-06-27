/* wildcard-mission-3.js
 * Mission: Reinforceable Example Content
 * Wildcard Mission 3: Open Ten Minutes
 *
 * Purpose:
 * - Practice implementation of the Example BIP during unexpected unstructured time.
 * - Primary function pressure: peer attention and stimulation during low-structure routines.
 * - Secondary function pressure: adult attention and escape from academic expectations.
 * - Teacher skill: add structure quickly, define location and activity choices, reinforce safe engagement.
 *
 * Loading note:
 * - This file assumes the main engine has already created POOL.
 * - Later, the engine/html can load this file after the shared config and Example BIP file.
 * - For the current single-file version, paste this after POOL.wild has been initialized.
 */

(function registerWildcardMission3() {
  if (typeof POOL === "undefined") {
    throw new Error("POOL must be defined before loading wildcard-mission-3.js");
  }

  POOL.wild = POOL.wild || [];

  POOL.wild.push({
    id: "wild_3_open_ten_minutes",
    title: "Wildcard Mission: Open Ten Minutes",
    start: "step1",
    focus: "Unexpected unstructured time; add structure, reduce peer payoff, and reinforce safe engagement.",
    routine: "unstructured time",
    functionPressure: ["peer attention", "stimulation", "adult attention"],
    bipTargets: ["Prevent", "Teach", "Reinforce", "Respond"],

    steps: {
      step1: {
        text: `BIP Briefing: Unstructured time is a known trigger for Student because expectations are less clear, peers are available, and small disruptions can produce quick reactions. The plan is to add structure immediately with two activity choices, a clear location, and a hands-to-self boundary. Reinforce safe engagement quickly. Avoid waiting to see what happens or publicly correcting peer behavior after it starts.\n\nScene: Your science activity ends ten minutes earlier than planned. Lunch is not ready yet, and the class suddenly has open time. Students begin talking, sharpening pencils, and moving around the room. Student drifts toward a nearby peer, lightly bumps shoulders, and laughs when the peer reacts. The peer says, "Stop," but smiles.\n\nThe room is still safe, but the open time is starting to organize around peer reactions. What do you do first?`,
        choices: {
          A: {
            text: `Add structure quickly: "Choose drawing at the back table or book bin by the rug. Hands stay to self."`,
            score: 10,
            feedback: `High fidelity. You reduced ambiguity and gave Student two safe ways to access open time.`,
            wizard: `The Wizard drops a game board onto the chaos. Open time now has locations, choices, and a body boundary. Student can still access something interesting, but the peer reaction is no longer the easiest path. Structure changes the antecedent conditions before peer attention becomes the routine.`,
            next: "step2_supported",
            meta: {
              bipComponent: "Prevent",
              mechanism: "Prompting",
              errorType: "none",
              function: "peer attention plus stimulation"
            }
          },
          B: {
            text: `Remind the class to be kind and make good choices while you organize the next materials.`,
            score: 5,
            feedback: `Developing fidelity. The reminder is appropriate, but it is not structured enough for a known trigger.`,
            wizard: `The Wizard hears the reminder float across the room like mist. It is not wrong, but it does not give Student a place, activity, or replacement response. The peer smile is still more concrete than the expectation. General expectations are weaker than specific choices and boundaries during unstructured time.`,
            next: "step2_wobble",
            meta: {
              bipComponent: "Prevent",
              mechanism: "Prompting",
              errorType: "general reminder",
              function: "peer attention"
            }
          },
          C: {
            text: `Call Student over and say, "Stop bothering people. You need to stay away from that peer."`,
            score: 0,
            feedback: `Low fidelity. Public correction may increase adult attention and make the peer interaction more powerful.`,
            wizard: `The Wizard's alarm flashes over the peer pair. Student got adult attention, the peer is now named as important, and open time has a new stage. Public correction can strengthen the attention pathway when peer reactions are part of the function.`,
            next: "step2_escalated",
            meta: {
              bipComponent: "Respond",
              mechanism: "Performance feedback",
              errorType: "public correction",
              function: "peer attention plus adult attention"
            }
          }
        }
      },

      step2_supported: {
        text: `Student chooses drawing but hovers near the peer instead of moving fully to the back table. He has chosen an activity, but his body is still near the peer payoff.`,
        choices: {
          A: {
            text: `Point to the exact drawing spot and reinforce when Student moves there safely.`,
            score: 10,
            feedback: `High fidelity. You turned the activity choice into a safe location response.`,
            wizard: `The Wizard marks the landing zone with a glowing circle. Student now knows where his body should go, not just what activity exists. When safe movement earns reinforcement, the peer bump loses power. Choice becomes effective when it leads to an observable response that contacts reinforcement.`,
            next: "step3_strong",
            meta: {
              bipComponent: "Teach",
              mechanism: "Fluency building",
              errorType: "none",
              function: "peer attention plus stimulation"
            }
          },
          B: {
            text: `Let Student transition independently because he already picked an activity.`,
            score: 5,
            feedback: `Developing fidelity. The choice helped, but the location response is still weak.`,
            wizard: `The Wizard watches Student hover. The activity choice opened the door, but the peer is still pulling like a magnet. Without a location prompt, the choice may not become safe engagement. During known trigger routines, independence may need to be shaped after a reinforced first step.`,
            next: "step3_mixed",
            meta: {
              bipComponent: "Teach",
              mechanism: "Prompting",
              errorType: "missed location prompt",
              function: "peer attention"
            }
          },
          C: {
            text: `Tell Student, "You chose drawing, so stop wandering and go do it."`,
            score: 0,
            feedback: `Low fidelity. This adds adult attention without teaching the next response.`,
            wizard: `The Wizard winces as the correction keeps wandering in the spotlight. Student hears pressure before he has a clear landing place. The peer interaction still glows nearby. Corrective language does not replace a prompted, reinforced location response.`,
            next: "step3_mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Performance feedback",
              errorType: "pressure after choice",
              function: "adult attention plus peer attention"
            }
          }
        }
      },

      step2_wobble: {
        text: `Student bumps the peer again, softer this time. The peer says, "Stop," but laughs. A few students nearby look over. The behavior is starting to pay off.`,
        choices: {
          A: {
            text: `Move closer, structure the space, and prompt Student to choose a defined activity spot.`,
            score: 10,
            feedback: `High fidelity repair. You added structure and reduced the peer payoff.`,
            wizard: `The Wizard pulls the peer audience out of the center and draws two activity paths on the floor. Student gets a defined spot before the bumping becomes the main event. Adding structure interrupts peer-maintained behavior and prompts a replacement routine.`,
            next: "step3_recovered",
            meta: {
              bipComponent: "Prevent",
              mechanism: "Prompting",
              errorType: "none",
              function: "peer attention plus stimulation"
            }
          },
          B: {
            text: `Tell the peer to ignore it and remind Student to keep his body calm.`,
            score: 5,
            feedback: `Developing fidelity. Ignoring may help, but the routine still lacks structure.`,
            wizard: `The Wizard sees the peer trying, but the room is still loose. Ignoring helps only if Student has something better to do with his body and attention. Reducing attention should be paired with a replacement activity and reinforcement.`,
            next: "step3_mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "ignore without structure",
              function: "peer attention"
            }
          },
          C: {
            text: `Warn Student that one more bump means he loses open-time choice.`,
            score: 0,
            feedback: `Low fidelity. Threats add attention and can make the moment more dramatic.`,
            wizard: `The Wizard's red light glows over the open-time choices. The behavior now controls the stakes of the room. Student may push once more just to test the boundary. Threats can increase adult attention without teaching safe engagement.`,
            next: "step3_risk",
            meta: {
              bipComponent: "Respond",
              mechanism: "Performance feedback",
              errorType: "threat of loss",
              function: "adult attention plus peer attention"
            }
          }
        }
      },

      step2_escalated: {
        text: `Student says, "I didn't do anything," and bumps the peer again while looking toward you. More students are watching now. The peer interaction has become the center of open time.`,
        choices: {
          A: {
            text: `Reduce the audience, move near Student, and offer a structured activity away from the peer.`,
            score: 10,
            feedback: `High fidelity repair. You reduced attention and added a safer alternative.`,
            wizard: `The Wizard sweeps the spotlight away from the peer. Student gets a route to something else before the performance becomes the whole open-time routine. Repair means reducing maintaining consequences and prompting safe engagement.`,
            next: "step3_recovered",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "none",
              function: "peer attention plus stimulation"
            }
          },
          B: {
            text: `Separate Student from the peer and wait silently until the group settles.`,
            score: 5,
            feedback: `Developing fidelity. Safety may improve, but replacement behavior is not taught clearly.`,
            wizard: `The Wizard steadies the room. The bumping may stop, but Student has not learned what to do during open time instead. Separation can reduce immediate risk, but it needs a re-entry or replacement activity.`,
            next: "step3_mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "separation without replacement",
              function: "peer attention"
            }
          },
          C: {
            text: `Explain publicly that bumping is unsafe and Student needs to apologize now.`,
            score: 0,
            feedback: `Low fidelity. Public processing can intensify peer-maintained behavior.`,
            wizard: `The Wizard's alarm rings. The whole room is now part of the consequence. Student has more audience than before, and the peer conflict grows. Apology and processing demands should wait until regulation and re-entry are stable.`,
            next: "step3_risk",
            meta: {
              bipComponent: "Respond",
              mechanism: "Performance feedback",
              errorType: "public processing",
              function: "peer attention plus adult attention"
            }
          }
        }
      },

      step3_strong: {
        text: `Student moves to the drawing spot and starts using the materials. The room is still busy, but he is no longer using peers for stimulation.`,
        choices: {
          A: {
            text: `Mark a Chart Move for safe engagement and preview the upcoming lunch transition.`,
            score: 10,
            feedback: `High fidelity. You reinforced safe unstructured behavior and prepared the next transition.`,
            wizard: `The Wizard places a bright marker on the map. Student learns that safe engagement during loose time works. The lunch transition is now less likely to surprise him because you previewed what comes next. Reinforcement plus predictability builds fluency across routines.`,
            ending: "success",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Fluency building",
              errorType: "none",
              function: "peer attention plus stimulation"
            }
          },
          B: {
            text: `Let Student draw quietly and avoid interrupting the calm moment with reinforcement.`,
            score: 5,
            feedback: `Developing fidelity. Calm is good, but the safe behavior is not strengthened.`,
            wizard: `The Wizard whispers, almost. The quiet is good, but the plan needs the safe behavior to be noticed before it fades into the room's noise. Reinforcement can be brief and private without disrupting calm.`,
            ending: "mixed",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Performance feedback",
              errorType: "missed reinforcement",
              function: "peer attention"
            }
          },
          C: {
            text: `Tell nearby peers to notice that Student is finally making a better choice.`,
            score: 0,
            feedback: `Low fidelity. This returns peer attention to Student's behavior.`,
            wizard: `The Wizard blocks the spotlight, but too late. Peers look over again. The safe choice becomes a performance instead of a routine. Reinforcement should not rebuild the peer audience.`,
            ending: "mixed",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Performance feedback",
              errorType: "public peer praise",
              function: "peer attention"
            }
          }
        }
      },

      step3_recovered: {
        text: `Student accepts the structured spot after some hesitation. He is calmer, but the peer interaction was already reinforced once.`,
        choices: {
          A: {
            text: `Reinforce safe body and engagement, then stay nearby through the next transition.`,
            score: 10,
            feedback: `High fidelity. You reinforced the replacement and planned for the next risk point.`,
            wizard: `The Wizard repairs the open-time routine. Student gets credit for moving away and engaging safely. The next transition is guarded before it becomes another trigger. Reinforcing recovery helps ensure the episode ends with safe engagement, not peer disruption.`,
            ending: "success",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Performance feedback",
              errorType: "none",
              function: "peer attention plus stimulation"
            }
          },
          B: {
            text: `Let Student continue the activity and monitor from across the room.`,
            score: 5,
            feedback: `Developing fidelity. The activity is safer, but support fades before the routine is strong.`,
            wizard: `The Wizard watches from a distance. Student is safer, but the peer magnet is still in the room. The routine may hold, or it may wobble again. Fade support after the replacement behavior contacts reinforcement.`,
            ending: "mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "support faded before reinforcement",
              function: "peer attention"
            }
          },
          C: {
            text: `Use the calm moment to explain why bumping peers causes problems.`,
            score: 0,
            feedback: `Low fidelity. Processing may pull attention back to the peer behavior.`,
            wizard: `The Wizard raises a warning hand. Student was almost out of the peer loop. The explanation brings the bumping story back to center stage. Process later, after safe engagement and re-entry are stable.`,
            ending: "mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Performance feedback",
              errorType: "processing too early",
              function: "adult attention plus peer attention"
            }
          }
        }
      },

      step3_mixed: {
        text: `Student is no longer bumping, but he is only loosely engaged. Open time still feels fragile.`,
        choices: {
          A: {
            text: `Prompt one specific activity action and reinforce safe engagement immediately.`,
            score: 10,
            feedback: `High fidelity repair. You turned loose time into reinforced engagement.`,
            wizard: `The Wizard locks a piece into place. Student has a concrete action, and the safe engagement finally has a payoff. The peer reaction fades because something better is available. Replacement behavior needs to be observable and reinforced.`,
            ending: "success",
            meta: {
              bipComponent: "Teach",
              mechanism: "Fluency building",
              errorType: "none",
              function: "peer attention plus stimulation"
            }
          },
          B: {
            text: `Keep the room calm and wait to see whether Student stays settled.`,
            score: 5,
            feedback: `Developing fidelity. This may preserve calm, but the replacement routine remains weak.`,
            wizard: `The Wizard waits with the room. Nothing explodes, but the skill is still thin. Open time may be hard again tomorrow. Waiting is not the same as teaching safe engagement.`,
            ending: "mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "waiting without replacement practice",
              function: "peer attention"
            }
          },
          C: {
            text: `Tell Student the next open time will be removed if this happens again.`,
            score: 0,
            feedback: `Low fidelity. Threats may make unstructured time more aversive and do not teach replacement behavior.`,
            wizard: `The Wizard darkens the open-time card. The routine now predicts future loss, not supported success. Student may comply briefly, but the next open time becomes more loaded. Threats add pressure without building safe engagement fluency.`,
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
        text: `The peer interaction has become the center of the room. Student is activated by the audience, and the unstructured time is slipping away.`,
        choices: {
          A: {
            text: `Create a brief reset, remove the audience, and return with one structured activity choice.`,
            score: 10,
            feedback: `High fidelity repair. You reduced attention and rebuilt structure.`,
            wizard: `The Wizard sweeps the stage clean. The audience fades, the reset cools the moment, and Student gets a safer route back into open time. Repair means reducing the maintaining consequence and prompting a replacement routine.`,
            ending: "mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "recovery repair",
              function: "peer attention plus stimulation"
            }
          },
          B: {
            text: `Separate Student and wait quietly until the lunch transition begins.`,
            score: 5,
            feedback: `Developing fidelity. This may prevent more conflict, but replacement behavior is not practiced.`,
            wizard: `The Wizard contains the scene. It may prevent more bumping, but open time became something to survive rather than something to learn. Stabilization should be followed by low-demand re-entry.`,
            ending: "mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "separation without replacement",
              function: "peer attention"
            }
          },
          C: {
            text: `Require Student to apologize to the peer before he can do another activity.`,
            score: 0,
            feedback: `Low fidelity during activation. Social demands can prolong the performance.`,
            wizard: `The Wizard's alarm returns. The peer is now even more central. Student is pulled deeper into the social conflict instead of toward safe engagement. Apology and reflection should wait until regulation and re-entry are stable.`,
            ending: "fail",
            meta: {
              bipComponent: "Respond",
              mechanism: "Performance feedback",
              errorType: "apology demand too early",
              function: "peer attention plus adult attention"
            }
          }
        }
      }
    },

    endings: {
      success: {
        title: `Success - Open Time Structured`,
        text: `Student used a safe activity because open time became predictable, reinforced, and connected to the next transition.`
      },
      mixed: {
        title: `Mixed - Conflict Reduced, Routine Still Weak`,
        text: `The moment stabilized, but safe engagement was not reinforced or practiced as clearly as it could have been.`
      },
      fail: {
        title: `Fail - Peer Attention Took Over`,
        text: `Public attention, threats, or peer processing allowed the interaction to become more reinforcing than safe engagement.`
      }
    }
  });
})();
