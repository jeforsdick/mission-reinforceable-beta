/* MR-DEMO-2 Daily Mission: The Long Center */
(function registerDemo2DailyMission() {
  if (typeof POOL === 'undefined') throw new Error('POOL must be defined before loading daily-mission-1.js');
  POOL.daily = POOL.daily || [];

  const meta = (component, mechanism, errorType = 'none') => ({
    bipComponent: component,
    mechanism,
    errorType,
    function: 'escape'
  });

  POOL.daily.push({
    id: 'demo2-daily-long-center',
    title: 'The Long Center',
    expectedSteps: 5,
    start: 'd1_start',
    focus: "Use Kai's choices, replacement requests, brief directions, and reinforcement during a long center routine.",
    routine: 'literacy centers',
    functionPressure: ['escape'],
    bipTargets: ['Choice', 'Replacement Request', 'Precision Request', 'Reinforcement'],

    steps: {
      d1_start: {
        text: `Centers have been running for about 15 minutes. Kai finished the first activity and is now at a table with a sorting task.\n\nKai starts sliding the cards into a pile instead of sorting them. They glance toward the classroom jobs board and then toward the door.`,
        hint: `This is a good prevention moment. Make the next step clear and offer two manageable options before refusal grows.`,
        choices: {
          A: {
            text: `Move close and say, "You can sort five cards here, or sort five at the side table. You choose."`,
            score: 10,
            feedback: `This matches the plan. You kept the task available, made the expectation small, and offered two safe choices.`,
            wizard: `Strong move. Two clear paths make the next step easier to choose than escape.`,
            next: 'd2_supported',
            meta: meta('Prevent', 'Two safe choices')
          },
          B: {
            text: `Say, "You are almost done. Keep working and then we can move on."`,
            score: 5,
            feedback: `This is calm and encouraging, but it does not give Kai a concrete next action or a choice.`,
            wizard: `Gentle, but vague. The plan works best when Kai can see exactly what to do next.`,
            next: 'd2_wobbly',
            meta: meta('Prevent', 'General encouragement', 'unclear next step')
          },
          C: {
            text: `Say, "No. Stop playing with the cards and finish the center."`,
            score: 0,
            feedback: `This adds a direct no/stop statement without a safe alternative. That pattern is more likely to increase escape or escalation.`,
            wizard: `Careful. The door to a power struggle just opened. Pair the limit with a clear action or choice.`,
            next: 'd2_escalated',
            meta: meta('Respond', 'Limit statement', 'unpaired no/stop')
          }
        }
      },

      d2_supported: {
        text: `Kai points to the side table and carries the cards over. They sort two correctly, then pause and say, "Can I be done?"`,
        hint: `Prompt the replacement response. Kai can ask for a short break or alternate work.`,
        choices: {
          A: {
            text: `Say, "You can ask for a short break or alternate work. Which do you need?"`,
            score: 10,
            feedback: `This directly teaches the planned replacement response instead of waiting for refusal.`,
            wizard: `Excellent. You turned "Can I be done?" into a skill Kai can use again.`,
            next: 'd3_supported',
            meta: meta('Teach', 'Break or alternate-work request')
          },
          B: {
            text: `Say, "Finish three more cards and then we can talk about a break."`,
            score: 5,
            feedback: `This gives a clear amount of work, but it delays prompting the replacement request that the plan is trying to build.`,
            wizard: `Not bad, but the replacement skill is still hiding. Prompt the request while the moment is calm.`,
            next: 'd3_wobbly',
            meta: meta('Teach', 'Small task', 'missed replacement prompt')
          },
          C: {
            text: `Say, "You already moved tables, so now you need to finish."`,
            score: 0,
            feedback: `This turns the earlier choice into leverage and blocks the planned request. It may make escape more likely.`,
            wizard: `The choice should stay supportive, not become a trap. Prompt the skill instead.`,
            next: 'd3_escalated',
            meta: meta('Respond', 'Blocked request', 'power struggle')
          }
        }
      },

      d2_wobbly: {
        text: `Kai sorts one card, then starts tapping the stack against the table. They say, "This is taking forever."`,
        hint: `Make the next response concrete: a safe choice, a short request, or a small task.`,
        choices: {
          A: {
            text: `Say, "You can do five here or five at the side table. After that, you can ask for a break."`,
            score: 10,
            feedback: `This restores the plan by combining a manageable choice with the replacement break request.`,
            wizard: `Nice recovery. The path is visible again.`,
            next: 'd3_supported',
            meta: meta('Prevent', 'Choice plus break request')
          },
          B: {
            text: `Say, "I know it feels long. Keep going for another minute."`,
            score: 5,
            feedback: `This acknowledges the difficulty, but the next action is still vague and the replacement request is not prompted.`,
            wizard: `Supportive words help, but Kai still needs a concrete move.`,
            next: 'd3_wobbly',
            meta: meta('Prevent', 'Acknowledgment', 'unclear next step')
          },
          C: {
            text: `Say, "Everyone else is still working, so you need to keep going too."`,
            score: 0,
            feedback: `Peer comparison adds pressure without teaching the plan.`,
            wizard: `Comparing Kai to peers can make escape feel even more valuable.`,
            next: 'd3_escalated',
            meta: meta('Respond', 'Peer comparison', 'public pressure')
          }
        }
      },

      d2_escalated: {
        text: `Kai sweeps several cards onto the floor and pushes the chair back. A nearby student turns to look.`,
        hint: `Keep language brief. Use a precision request or an incompatible action and reinforce the first step of following it.`,
        choices: {
          A: {
            text: `Move close and say, "Kai, I need you to pick up the five cards by your chair."`,
            score: 10,
            feedback: `This is a brief, observable direction that is incompatible with continuing to scatter the materials.`,
            wizard: `Clear and concrete. Now watch for the first step to reinforce.`,
            next: 'd3_wobbly',
            meta: meta('Respond', 'Precision request and incompatible action')
          },
          B: {
            text: `Say, "Please calm down and make a better choice."`,
            score: 5,
            feedback: `The tone is calm, but the direction is not observable enough to guide Kai's next action.`,
            wizard: `Calm is good. Now make the action specific.`,
            next: 'd3_escalated',
            meta: meta('Respond', 'General correction', 'vague direction')
          },
          C: {
            text: `Say loudly, "Stop throwing things. You are losing your center choice."`,
            score: 0,
            feedback: `This adds public attention, a no/stop pattern, and loss language during escalation.`,
            wizard: `That may feed the storm. Keep the direction private, brief, and doable.`,
            next: 'd3_escalated',
            meta: meta('Respond', 'Public consequence', 'public correction')
          }
        }
      },

      d3_supported: {
        text: `Kai says, "Can I take a short break?" They are still seated and the materials are safe.`,
        hint: `Reinforce the replacement request right away and make the return path predictable.`,
        choices: {
          A: {
            text: `Say, "Great job asking. Yes—take your short break, then come back and finish five cards."`,
            score: 10,
            feedback: `This reinforces the replacement request and keeps the return expectation clear.`,
            wizard: `Perfect timing. The skill worked, so you made it worth using again.`,
            next: 'd4_supported',
            meta: meta('Reinforce', 'Break request plus return')
          },
          B: {
            text: `Say, "Okay, take a break."`,
            score: 5,
            feedback: `Honoring the request is helpful, but the return step is not defined.`,
            wizard: `The break is there, but the trail back needs a marker.`,
            next: 'd4_wobbly',
            meta: meta('Reinforce', 'Break request', 'unclear return')
          },
          C: {
            text: `Say, "Not yet. You need to show me you can work first."`,
            score: 0,
            feedback: `This blocks the replacement response after Kai used it appropriately.`,
            wizard: `If the skill does not work, escape behavior may become more powerful again.`,
            next: 'd4_escalated',
            meta: meta('Respond', 'Blocked replacement', 'break request denied')
          }
        }
      },

      d3_wobbly: {
        text: `Kai begins following the direction, but slowly. They pick up two items and then look away from the task.`,
        hint: `Praise direction following immediately—even if the whole routine is not perfect yet.`,
        choices: {
          A: {
            text: `Say, "Thank you for picking those up," and mark a chart move for following the direction.`,
            score: 10,
            feedback: `This matches the plan: reinforce the first appropriate response quickly.`,
            wizard: `There it is—the first successful step. Catch it fast.`,
            next: 'd4_supported',
            meta: meta('Reinforce', 'Immediate praise and chart move')
          },
          B: {
            text: `Wait until all the materials are picked up before giving praise.`,
            score: 5,
            feedback: `Waiting for full completion misses an opportunity to strengthen the first step of compliance.`,
            wizard: `Do not wait for perfect. Reinforce the first move in the right direction.`,
            next: 'd4_wobbly',
            meta: meta('Reinforce', 'Delayed praise', 'reinforcement delayed')
          },
          C: {
            text: `Say, "See? You could have done that the first time."`,
            score: 0,
            feedback: `This adds criticism after compliance instead of reinforcing it.`,
            wizard: `The right behavior appeared—do not punish it with a lecture.`,
            next: 'd4_escalated',
            meta: meta('Respond', 'Corrective lecture', 'criticism after compliance')
          }
        }
      },

      d3_escalated: {
        text: `Kai moves farther from the table and starts touching materials from another group's center.`,
        hint: `Use an incompatible, observable direction and keep the response private.`,
        choices: {
          A: {
            text: `Say quietly, "Kai, I need you to carry this basket to the supply shelf."`,
            score: 10,
            feedback: `This uses a concrete, helpful action that is incompatible with touching the other group's materials.`,
            wizard: `A productive job can interrupt the unsafe pattern and create a success to reinforce.`,
            next: 'd4_wobbly',
            meta: meta('Respond', 'Incompatible class job')
          },
          B: {
            text: `Stand nearby and say, "Let's get back on track."`,
            score: 5,
            feedback: `Staying close is helpful, but the direction is too general to guide a specific response.`,
            wizard: `Close support helps. Now give Kai one observable action.`,
            next: 'd4_escalated',
            meta: meta('Respond', 'Proximity', 'vague direction')
          },
          C: {
            text: `Tell the other students, "Please ignore Kai until Kai is ready to follow directions."`,
            score: 0,
            feedback: `This publicly identifies Kai's behavior and increases peer attention to the situation.`,
            wizard: `Keep Kai's correction private. The class does not need to become part of the consequence.`,
            next: 'd4_escalated',
            meta: meta('Respond', 'Public attention', 'public callout')
          }
        }
      },

      d4_supported: {
        text: `After the break or brief support, Kai returns to the center area. They sit down but look tired and glance toward the jobs board again.`,
        hint: `Use a preferred productive role and a clear amount of work to support re-entry.`,
        choices: {
          A: {
            text: `Say, "Finish five cards, then you can collect the center bins for me."`,
            score: 10,
            feedback: `This pairs a clear amount of work with a meaningful class job Kai values.`,
            wizard: `Nice. The return path ends with something worth reaching.`,
            next: 'd5_supported',
            meta: meta('Prevent', 'Clear work amount plus class job')
          },
          B: {
            text: `Say, "Let's see how much you can finish before the timer goes off."`,
            score: 5,
            feedback: `This creates structure, but it does not use the known job preference or a clear completion target.`,
            wizard: `Structure helps. A specific amount and preferred job would make it stronger.`,
            next: 'd5_wobbly',
            meta: meta('Prevent', 'Timer', 'missed preferred support')
          },
          C: {
            text: `Say, "You lost a lot of time, so now you need to finish the whole stack."`,
            score: 0,
            feedback: `Increasing the demand after difficulty makes escape more valuable and moves away from the plan.`,
            wizard: `Do not make the mountain bigger after Kai just came back to the trail.`,
            next: 'd5_escalated',
            meta: meta('Respond', 'Increased demand', 'response cost through extra work')
          }
        }
      },

      d4_wobbly: {
        text: `Kai is back near the center, but participation is fragile. They touch the task, then pull their hands back.`,
        hint: `Give one clear choice and reinforce the first successful action.`,
        choices: {
          A: {
            text: `Say, "Do five cards with the red bin or the blue bin," then praise the first card completed.`,
            score: 10,
            feedback: `This combines choice, a manageable response, and immediate reinforcement.`,
            wizard: `Three plan pieces in one clean move.`,
            next: 'd5_supported',
            meta: meta('Prevent', 'Choice plus immediate reinforcement')
          },
          B: {
            text: `Say, "Just try your best for the last few minutes."`,
            score: 5,
            feedback: `The tone is supportive, but the expectation is not concrete.`,
            wizard: `Kind words, fuzzy path. Make the next action visible.`,
            next: 'd5_wobbly',
            meta: meta('Prevent', 'Encouragement', 'vague expectation')
          },
          C: {
            text: `Say, "No more breaks. We are finishing now."`,
            score: 0,
            feedback: `This returns to an unpaired no statement and removes the planned support.`,
            wizard: `That closes the replacement path when you need it most.`,
            next: 'd5_escalated',
            meta: meta('Respond', 'No statement', 'support removed')
          }
        }
      },

      d4_escalated: {
        text: `Kai is still avoiding the center and watching the doorway. The rest of the group is beginning to transition.`,
        hint: `Use the transition itself as a structured opportunity: clear job, assigned position, and reinforcement.`,
        choices: {
          A: {
            text: `Say, "Kai, I need you to carry the center clipboard to the front of the line," then praise the first step toward the job.`,
            score: 10,
            feedback: `This gives an incompatible class job, structures the transition, and creates a fast opportunity to reinforce compliance.`,
            wizard: `Excellent recovery. The transition becomes a job instead of another battle.`,
            next: 'd5_wobbly',
            meta: meta('Respond', 'Class job and transition support')
          },
          B: {
            text: `Let Kai wait until everyone else has lined up, then ask them to join.`,
            score: 5,
            feedback: `Reducing crowding may help, but the plan's assigned transition position and active direction would be stronger.`,
            wizard: `Less crowding helps. A clear job or assigned position would make the route even safer.`,
            next: 'd5_wobbly',
            meta: meta('Prevent', 'Reduced crowding', 'missed assigned position')
          },
          C: {
            text: `Tell Kai they cannot join the next activity until the center is completely finished.`,
            score: 0,
            feedback: `This can create a prolonged escape-and-demand struggle instead of supporting a successful transition.`,
            wizard: `The mission is to build the next successful response, not extend the standoff.`,
            next: 'd5_escalated',
            meta: meta('Respond', 'Activity exclusion', 'extended power struggle')
          }
        }
      },

      d5_supported: {
        text: `Kai completes the small task and starts the class job. The transition bell rings.`,
        hint: `Finish by reinforcing the successful transition and participation.`,
        choices: {
          A: { text: `Mark a chart move and say, "You finished your job and transitioned safely. Nice work."`, score: 10, feedback: `This directly reinforces the behaviors the plan is designed to strengthen.`, wizard: `Quest complete. You made the successful behavior visible and valuable.`, meta: meta('Reinforce', 'Chart move and specific praise') },
          B: { text: `Say, "Thanks," and move on to the next activity.`, score: 5, feedback: `Brief praise is helpful, but this misses the planned chart-move reinforcement.`, wizard: `A little reinforcement is better than none, but use the system that is already built for Kai.`, meta: meta('Reinforce', 'Brief praise', 'chart move omitted') },
          C: { text: `Say, "That was much better than how you started centers."`, score: 0, feedback: `This compares the success to earlier problem behavior instead of reinforcing the behavior itself.`, wizard: `End on the success, not the mistake that came before it.`, meta: meta('Respond', 'Comparison to prior behavior', 'criticism mixed with praise') }
        }
      },

      d5_wobbly: {
        text: `Kai participates enough to rejoin the transition, but the routine still feels effortful.`,
        hint: `Reinforce the part that went right, even if the whole routine was not perfect.`,
        choices: {
          A: { text: `Mark a chart move for the successful transition and give specific praise for following the direction.`, score: 10, feedback: `This follows the plan by reinforcing the successful piece immediately.`, wizard: `Exactly. Reinforce progress, not perfection.`, meta: meta('Reinforce', 'Partial-success reinforcement') },
          B: { text: `Wait to see how Kai does in the next activity before giving reinforcement.`, score: 5, feedback: `Waiting weakens the connection between the successful transition and reinforcement.`, wizard: `Catch the success while it is still warm.`, meta: meta('Reinforce', 'Delayed reinforcement', 'reinforcement delayed') },
          C: { text: `Tell Kai they can earn the chart move back later if the next activity goes well.`, score: 0, feedback: `The plan is to award chart moves for successful behavior, not withhold an earned move as leverage.`, wizard: `Do not turn earned reinforcement into a debt.`, meta: meta('Respond', 'Withheld earned reinforcement', 'response cost') }
        }
      },

      d5_escalated: {
        text: `The center ends with Kai still needing support to transition. You have one last chance to set up the next routine successfully.`,
        hint: `Use a clear transition position or job and reinforce the first step.`,
        choices: {
          A: { text: `Give Kai a specific transition job and assigned place, then praise the first step of following it.`, score: 10, feedback: `This returns to the plan and creates a concrete success at the next transition.`, wizard: `Strong reset. A new routine is a new chance to follow the plan.`, meta: meta('Respond', 'Transition job and assigned position') },
          B: { text: `Keep Kai beside you during the transition and remind them to make good choices.`, score: 5, feedback: `Proximity can help, but the direction and reinforcement plan are still too general.`, wizard: `Stay close, but give Kai something specific to do.`, meta: meta('Prevent', 'Proximity', 'vague direction') },
          C: { text: `Tell Kai they have lost the next preferred activity because centers were difficult.`, score: 0, feedback: `Removing a preferred activity after escalation does not teach the replacement response and may increase escape pressure.`, wizard: `Reset the skill pathway instead of adding another battle.`, meta: meta('Respond', 'Loss of preferred activity', 'punitive consequence') }
        }
      }
    }
  });
})();
