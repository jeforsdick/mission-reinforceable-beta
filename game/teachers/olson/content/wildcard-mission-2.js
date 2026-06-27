/* wildcard-mission-2.js
 * Mission: Reinforceable Example Content
 * Wildcard Mission 2: Guest in the Room
 *
 * Purpose:
 * - Practice implementation of the Example BIP when a visitor/observer becomes an audience cue.
 * - Primary function pressure: peer/adult attention during public routines.
 * - Secondary function pressure: escape from academic engagement when the audience cue appears.
 * - Teacher skill: keep the visitor boring, privately cue task engagement, reinforce quiet participation.
 *
 * Loading note:
 * - This file assumes the main engine has already created POOL.
 * - Later, the engine/html can load this file after the shared config and Example BIP file.
 * - For the current single-file version, paste this after POOL.wild has been initialized.
 */

(function registerWildcardMission2() {
  if (typeof POOL === "undefined") {
    throw new Error("POOL must be defined before loading wildcard-mission-2.js");
  }

  POOL.wild = POOL.wild || [];

  POOL.wild.push({
    id: "wild_2_guest_in_the_room",
    title: "Wildcard Mission: Guest in the Room",
    start: "step1",
    focus: "Visitor as audience cue; keep the visitor boring, prompt task engagement, and reinforce quiet participation.",
    routine: "guest or observer in classroom",
    functionPressure: ["adult attention", "peer attention", "escape"],
    bipTargets: ["Prevent", "Teach", "Reinforce", "Respond"],

    steps: {
      step1: {
        text: `BIP Briefing: Student may perform, narrate, or disrupt when a visitor enters because the visitor becomes a new audience cue. The plan is to keep the visitor boring, privately cue one task response, and reinforce quiet engagement quickly. Avoid comments that connect Student's behavior to the visitor or make the moment public.\n\nScene: A school psychologist quietly enters during independent math and sits near the back with a clipboard. Student notices immediately. He sits taller, looks toward two classmates, and says loudly, "I already know how to do this. This is easy." Then he taps his pencil like a drum and glances back to see whether the visitor noticed.\n\nThe class is still mostly working, but the visitor has become interesting. What do you do first?`,
        choices: {
          A: {
            text: `Privately move near Student and say, "Number one first. Point to the problem and start with your name."`,
            score: 10,
            feedback: `High fidelity. You kept the visitor boring and anchored Student in an observable task response.`,
            wizard: `The Wizard dims the visitor's clipboard until the math page glows brighter. Student gets a concrete action that competes with performing. The audience cue loses power because your response is private, brief, and task-focused. You reduced attention and prompted task engagement before the performance grew.`,
            next: "step2_supported",
            meta: {
              bipComponent: "Teach",
              mechanism: "Prompting",
              errorType: "none",
              function: "attention plus escape"
            }
          },
          B: {
            text: `Ignore the comment completely and continue helping another student nearby.`,
            score: 5,
            feedback: `Developing fidelity. Adult attention stays low, but Student still needs a replacement task cue.`,
            wizard: `The Wizard keeps your attention off the performance, which helps. But the pencil drum still has classmates and a visitor to play for. Student has not yet been shown what to do instead. Ignoring is incomplete when other attention sources remain available and task engagement is not prompted.`,
            next: "step2_wobble",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "ignoring without replacement prompt",
              function: "attention"
            }
          },
          C: {
            text: `Say, "Remember, we have a visitor today, so show them your best work."`,
            score: 0,
            feedback: `Low fidelity. This makes the visitor more important and increases the audience value.`,
            wizard: `The Wizard's spotlight snaps onto the clipboard. Student now knows the visitor matters, the class knows the visitor matters, and the math task becomes a stage. Naming the audience can strengthen audience-maintained behavior.`,
            next: "step2_escalated",
            meta: {
              bipComponent: "Respond",
              mechanism: "Performance feedback",
              errorType: "visitor spotlighted",
              function: "adult attention plus peer attention"
            }
          }
        }
      },

      step2_supported: {
        text: `Student points to number one and writes his name. He is still glancing toward the visitor, but his pencil is now connected to the task.`,
        choices: {
          A: {
            text: `Wait to reinforce until he completes several problems so the visitor does not become a bigger deal.`,
            score: 5,
            feedback: `Developing fidelity. The instinct to keep it small is good, but the first task response needs reinforcement.`,
            wizard: `The Wizard watches the first success cool on the page. Student did the hard part under audience pressure, but the consequence waits too long. Reinforcement can be private and brief while still happening immediately.`,
            next: "step3_mixed",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Performance feedback",
              errorType: "delayed reinforcement",
              function: "attention plus escape"
            }
          },
          B: {
            text: `Privately mark a Chart Move and say, "Started number one while the room changed. Nice focus."`,
            score: 10,
            feedback: `High fidelity. You reinforced task engagement under audience conditions without spotlighting the visitor.`,
            wizard: `The Wizard slips the reinforcement onto the page like a secret key. Student gets attention for working, not performing, and the visitor stays boring in the background. Immediate, private reinforcement strengthens task engagement when an audience cue appears.`,
            next: "step3_strong",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Performance feedback",
              errorType: "none",
              function: "attention plus escape"
            }
          },
          C: {
            text: `Say loudly, "Great job staying focused even with someone watching."`,
            score: 0,
            feedback: `Low fidelity. The praise is positive, but it makes the audience cue explicit.`,
            wizard: `The Wizard winces as the visitor's chair lights up again. The praise tells Student exactly what made the moment special: someone watching. The task becomes public performance instead of quiet engagement. Positive attention can still strengthen the wrong stimulus control.`,
            next: "step3_mixed",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Performance feedback",
              errorType: "public praise linked to visitor",
              function: "attention"
            }
          }
        }
      },

      step2_wobble: {
        text: `Student drums the pencil louder and says, "This is too easy," while looking toward the visitor. One classmate smiles. The performance is still small, but it is getting paid.`,
        choices: {
          A: {
            text: `Move closer, privately cue one task action, and reinforce the first quiet work response.`,
            score: 10,
            feedback: `High fidelity repair. You reduced the audience and gave Student a better way to access attention.`,
            wizard: `The Wizard steps between the pencil drum and the audience. Student gets a path back to the task before the performance becomes the routine. Prompting and reinforcing task engagement competes with attention-maintained disruption.`,
            next: "step3_recovered",
            meta: {
              bipComponent: "Teach",
              mechanism: "Prompting",
              errorType: "none",
              function: "attention plus escape"
            }
          },
          B: {
            text: `Remind the class not to react because Student is trying to get attention.`,
            score: 0,
            feedback: `Low fidelity. This publicly labels the behavior and organizes the audience.`,
            wizard: `The Wizard throws up his hands as the whole class learns the performance has a name. Student's behavior becomes the topic, and the clipboard grows brighter. Publicly describing the function can accidentally deliver the function.`,
            next: "step3_risk",
            meta: {
              bipComponent: "Respond",
              mechanism: "Performance feedback",
              errorType: "publicly labels function",
              function: "peer attention plus adult attention"
            }
          },
          C: {
            text: `Continue planned ignoring and hope the visitor and peers stop reacting quickly.`,
            score: 5,
            feedback: `Developing fidelity. Adult attention is low, but the peer and visitor cues are still active.`,
            wizard: `The Wizard watches the audience flicker. You are not feeding it directly, but the room still is. Student has not practiced an alternative response yet. Planned ignoring works best when reinforcement for the replacement behavior is also available.`,
            next: "step3_mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "ignoring without teaching",
              function: "attention"
            }
          }
        }
      },

      step2_escalated: {
        text: `Student grins and says, "I am doing my best work," loud enough for the visitor to hear. Several students look back at the observer. The visitor is now part of the classroom story.`,
        choices: {
          A: {
            text: `Drop the public exchange, move near Student, and privately cue one low-demand task response.`,
            score: 10,
            feedback: `High fidelity repair. You stopped feeding the audience and rebuilt task focus.`,
            wizard: `The Wizard cuts the stage lights. You do not argue about the visitor or the comment. The task becomes the path out of the spotlight. Repair means reducing attention and prompting a replacement response.`,
            next: "step3_recovered",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "none",
              function: "attention plus escape"
            }
          },
          B: {
            text: `Turn attention back to the lesson and plan to talk with Student after the visitor leaves.`,
            score: 5,
            feedback: `Developing fidelity. This reduces the exchange, but Student still needs a task cue now.`,
            wizard: `The Wizard redirects the camera to the lesson. That helps, but Student still holds a tiny microphone unless the task cue arrives soon. Delayed problem solving cannot replace in-the-moment replacement practice.`,
            next: "step3_mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "delayed re-entry",
              function: "attention"
            }
          },
          C: {
            text: `Tell Student the visitor is here to watch learning, not distracting behavior.`,
            score: 0,
            feedback: `Low fidelity. This increases the visitor's role as an audience and adds public correction.`,
            wizard: `The Wizard's alarm flashes around the clipboard. The visitor becomes part of the consequence, and the performance becomes more meaningful. Public correction linked to the audience can strengthen audience-maintained behavior.`,
            next: "step3_risk",
            meta: {
              bipComponent: "Respond",
              mechanism: "Performance feedback",
              errorType: "visitor-centered correction",
              function: "adult attention plus peer attention"
            }
          }
        }
      },

      step3_strong: {
        text: `Student completes the first problem with the visitor still in the room. He glances back once, then returns to the page. This is a strong generalization opportunity.`,
        choices: {
          A: {
            text: `Privately reinforce the completed first problem and preview the next small step.`,
            score: 10,
            feedback: `High fidelity. You reinforced coping under audience conditions and kept the routine moving.`,
            wizard: `The Wizard stores the win. Student learns that quiet work with a guest present earns reinforcement without becoming a show. The next problem is small enough to keep the page stronger than the audience. Reinforcement plus a clear next step supports fluency and generalization.`,
            ending: "success",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Fluency building",
              errorType: "none",
              function: "attention plus escape"
            }
          },
          B: {
            text: `Continue teaching and mention the success later after the visitor leaves.`,
            score: 5,
            feedback: `Developing fidelity. Delayed feedback is weaker for building the coping routine.`,
            wizard: `The Wizard nods, but the magic is faint. The success is real, yet the reinforcement arrives after the moment has cooled. The response should contact reinforcement while the audience cue is still present.`,
            ending: "mixed",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Performance feedback",
              errorType: "delayed reinforcement",
              function: "attention plus escape"
            }
          },
          C: {
            text: `Tell the visitor, "He is doing much better now than when you came in."`,
            score: 0,
            feedback: `Low fidelity. This brings the visitor back into Student's behavior story.`,
            wizard: `The Wizard blocks the clipboard too late. Student's behavior becomes visitor commentary again, and the audience cue regains power. Adult discussion about Student can function as attention even when it is positive.`,
            ending: "mixed",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Performance feedback",
              errorType: "adult commentary about student",
              function: "adult attention"
            }
          }
        }
      },

      step3_recovered: {
        text: `Student returns to the task after the private cue. The performance has faded, but it could restart if the spotlight comes back.`,
        choices: {
          A: {
            text: `Reinforce quiet task engagement and give the next short academic response.`,
            score: 10,
            feedback: `High fidelity. You reinforced the replacement behavior and moved forward.`,
            wizard: `The Wizard closes the curtain. Student gets a reward for working, then immediately gets a next step that keeps him in the routine. Re-entry plus immediate reinforcement weakens the performance pathway.`,
            ending: "success",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Performance feedback",
              errorType: "none",
              function: "attention plus escape"
            }
          },
          B: {
            text: `Let the calm continue and avoid adding any attention to the moment.`,
            score: 5,
            feedback: `Developing fidelity. The moment stays calm, but the replacement behavior is not strengthened.`,
            wizard: `The Wizard whispers. The moment survives, but the skill stays underpowered. Student may not know exactly what worked. Reinforcement can be quiet and still strengthen the behavior.`,
            ending: "mixed",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Performance feedback",
              errorType: "missed reinforcement",
              function: "attention plus escape"
            }
          },
          C: {
            text: `Use the calm moment to remind Student not to perform when visitors are in class.`,
            score: 0,
            feedback: `Low fidelity. This reintroduces the visitor as the focus and may restart the behavior.`,
            wizard: `The Wizard's curtain opens again. The visitor returns to the center of the story, and Student remembers the audience. Feedback should focus on the replacement behavior, not the audience trigger.`,
            ending: "mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Performance feedback",
              errorType: "reintroduces audience cue",
              function: "attention"
            }
          }
        }
      },

      step3_mixed: {
        text: `Student is quieter, but he is still glancing toward the visitor and nearby peers. The performance is smaller, not gone.`,
        choices: {
          A: {
            text: `Give one private task cue and reinforce the first quiet response immediately.`,
            score: 10,
            feedback: `High fidelity repair. You converted partial calm into reinforced engagement.`,
            wizard: `The Wizard points to the small opening. A private cue plus quick reinforcement gives Student a better way to access attention. The visitor fades into background scenery again. Reinforced replacement behavior competes with performance behavior.`,
            ending: "success",
            meta: {
              bipComponent: "Reinforce",
              mechanism: "Performance feedback",
              errorType: "none",
              function: "attention plus escape"
            }
          },
          B: {
            text: `Keep ignoring the visitor-related behavior and continue the lesson.`,
            score: 5,
            feedback: `Developing fidelity. This may prevent adult attention, but peer or visitor cues may still maintain it.`,
            wizard: `The Wizard watches the room carefully. Adult attention is low, but the peer audience may still be enough to keep the performance alive. Ignoring should be paired with prompting and reinforcing the replacement response.`,
            ending: "mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "ignoring without replacement practice",
              function: "attention"
            }
          },
          C: {
            text: `Tell Student he can take a break if he cannot handle having a visitor in class.`,
            score: 0,
            feedback: `Low fidelity. This may reinforce escape from guest-day routines.`,
            wizard: `The Wizard's alarm returns. The visitor now predicts escape from class expectations. Future observations may become even harder. Breaks should follow appropriate requests and include a planned return step.`,
            ending: "fail",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "escape from audience cue",
              function: "escape"
            }
          }
        }
      },

      step3_risk: {
        text: `The visitor has become a strong audience cue. Student is watching reactions more than the task, and peers are now part of the scene.`,
        choices: {
          A: {
            text: `Reduce the audience, cue a low-demand task response, and reinforce quiet re-entry.`,
            score: 10,
            feedback: `High fidelity repair. You lowered the performance value and rebuilt task focus.`,
            wizard: `The Wizard dims the room and lights the task. The performance loses power as Student gets a quieter route back to success. Repair means reducing maintaining consequences and reinforcing the first replacement response.`,
            ending: "mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "recovery repair",
              function: "attention plus escape"
            }
          },
          B: {
            text: `Let Student sit quietly without task demands until the visitor leaves.`,
            score: 5,
            feedback: `Developing fidelity. This may reduce disruption, but escape from task demands is likely reinforced.`,
            wizard: `The Wizard closes the book halfway. The performance stops, but so does the work. The visitor may now signal a way out of demands. Stabilization should be followed by low-demand re-entry.`,
            ending: "mixed",
            meta: {
              bipComponent: "Respond",
              mechanism: "Adaptation",
              errorType: "task removed until audience leaves",
              function: "escape"
            }
          },
          C: {
            text: `Ask the visitor to ignore Student while you explain the expected behavior again.`,
            score: 0,
            feedback: `Low fidelity. This keeps the visitor and behavior in the spotlight.`,
            wizard: `The Wizard's alarm lights the whole room. The visitor, the behavior, and the expectation all become public. The stage is fully built. Extended explanation and audience attention can maintain the very behavior you are trying to reduce.`,
            ending: "fail",
            meta: {
              bipComponent: "Respond",
              mechanism: "Performance feedback",
              errorType: "visitor-centered correction",
              function: "attention plus escape"
            }
          }
        }
      }
    },

    endings: {
      success: {
        title: `Success - Guest-Day Coping Reinforced`,
        text: `Student stayed engaged because the visitor was kept boring and quiet task engagement contacted immediate reinforcement.`
      },
      mixed: {
        title: `Mixed - Performance Reduced, Replacement Still Fragile`,
        text: `Student became quieter or partially re-entered, but task engagement was not reinforced as clearly as it could have been.`
      },
      fail: {
        title: `Fail - Visitor Became the Audience`,
        text: `The response pattern made the visitor, public attention, or escape more powerful than quiet task engagement.`
      }
    }
  });
})();
