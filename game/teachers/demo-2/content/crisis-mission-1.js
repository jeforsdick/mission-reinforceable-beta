/* MR-DEMO-2 Crisis Mission: The Delayed Break */
(function registerDemo2CrisisMission() {
  if (typeof POOL === 'undefined') throw new Error('POOL must be defined before loading crisis-mission-1.js');
  POOL.crisis = POOL.crisis || [];

  const meta = (component, mechanism, errorType = 'none') => ({ bipComponent: component, mechanism, errorType, function: 'escape' });

  POOL.crisis.push({
    id: 'demo2-crisis-delayed-break',
    title: 'The Delayed Break',
    expectedSteps: 5,
    start: 'c1_start',
    focus: "Respond to escalation around a delayed break or reinforcer without abandoning the plan.",
    routine: 'earned-break transition',
    functionPressure: ['escape'],
    bipTargets: ['Replacement Request', 'Precision Request', 'Incompatible Action', 'Reinforcement'],

    steps: {
      c1_start: {
        text: `Kai has been working through the afternoon and has earned a planned classroom break. Just as break time begins, another adult asks the class to finish a two-minute clean-up first.\n\nKai looks at the break area, then at the clean-up materials, and says loudly, "No! I earned my break!"`,
        hint: `Acknowledge the earned break, keep the delay predictable, and give one clear action or safe choice.`,
        choices: {
          A: { text: `Say quietly, "You did earn your break. First put these three bins on the shelf, then your break starts. You can carry the red bins or the blue bins."`, score: 10, feedback: `This preserves the earned break, gives a tiny clear task, and offers two safe choices.`, wizard: `Strong crisis prevention. The break is still real, and the path to it is short and clear.`, next: 'c2_supported', meta: meta('Prevent', 'Preserve earned break plus choice') },
          B: { text: `Say, "I know you're upset. We just need to clean up first."`, score: 5, feedback: `This acknowledges the frustration, but the amount of work and the return to the earned break are not concrete enough.`, wizard: `The tone is good. Make the delay small and visible.`, next: 'c2_wobbly', meta: meta('Prevent', 'Acknowledgment', 'delay unclear') },
          C: { text: `Say, "No break until you calm down and help clean."`, score: 0, feedback: `This changes an earned break into a consequence and uses the no pattern during escalation.`, wizard: `The break just became the battleground. Keep earned reinforcement predictable.`, next: 'c2_escalated', meta: meta('Respond', 'Earned break withheld', 'punitive withholding') }
        }
      },

      c2_supported: {
        text: `Kai grabs the red bins but puts them down hard. They say, "I want my break now," while looking toward the door.`,
        hint: `Prompt the replacement request and reinforce the first step of following the direction.`,
        choices: {
          A: { text: `Say, "You can ask, 'Can I take my break after these bins?' Thank you for picking them up."`, score: 10, feedback: `This prompts the replacement language and reinforces direction following immediately.`, wizard: `Excellent. You are teaching the skill while the break remains available.`, next: 'c3_supported', meta: meta('Teach', 'Break request plus praise') },
          B: { text: `Say, "You're almost there. Just finish."`, score: 5, feedback: `This is brief and encouraging, but it misses the planned replacement request.`, wizard: `Close, but do not skip the skill.`, next: 'c3_wobbly', meta: meta('Teach', 'Encouragement', 'replacement prompt omitted') },
          C: { text: `Say, "If you keep arguing, the break gets shorter."`, score: 0, feedback: `Threatening to reduce the earned break can intensify the power struggle.`, wizard: `Do not shrink the reinforcer during the storm.`, next: 'c3_escalated', meta: meta('Respond', 'Threatened reinforcer loss', 'response cost') }
        }
      },

      c2_wobbly: {
        text: `Kai begins pushing a chair with one foot and repeats, "I already earned it."`,
        hint: `Use an incompatible, observable direction and reinforce any compliance immediately.`,
        choices: {
          A: { text: `Say, "Kai, I need both feet on the floor and both hands on this bin."`, score: 10, feedback: `This gives an action incompatible with pushing the chair and creates a clear success to reinforce.`, wizard: `Good. Make the safe action easier to do than the unsafe one.`, next: 'c3_supported', meta: meta('Respond', 'Incompatible direction') },
          B: { text: `Say, "Please be safe with the chair."`, score: 5, feedback: `This names the goal but not the exact action Kai should do.`, wizard: `Make safety specific.`, next: 'c3_wobbly', meta: meta('Respond', 'Safety reminder', 'vague direction') },
          C: { text: `Say, "Stop kicking the chair or you lose your break."`, score: 0, feedback: `This combines the stop pattern with threatened loss of the earned break.`, wizard: `That can make escape and escalation more valuable.`, next: 'c3_escalated', meta: meta('Respond', 'Stop plus threatened loss', 'power struggle') }
        }
      },

      c2_escalated: {
        text: `Kai pushes the chair farther and knocks a lightweight classroom cart sideways. Several students turn to look. Kai takes two steps toward the classroom doorway.`,
        hint: `Keep the response private and concrete. Use one brief direction or a useful incompatible action.`,
        choices: {
          A: { text: `Move close and say, "Kai, I need you to put this folder on the break table."`, score: 10, feedback: `This gives a simple action toward the safe area and is incompatible with continuing toward the doorway.`, wizard: `One clear mission objective. Good crisis responding.`, next: 'c3_wobbly', meta: meta('Respond', 'Precision request toward safe area') },
          B: { text: `Say, "Come back over here so we can talk."`, score: 5, feedback: `This is calm, but the action is less specific and may invite a longer verbal interaction.`, wizard: `Shorter and more concrete will be stronger.`, next: 'c3_escalated', meta: meta('Respond', 'General return request', 'too much verbal processing') },
          C: { text: `Say loudly, "Everyone move away. Kai is losing control."`, score: 0, feedback: `Publicly labeling the escalation increases attention and does not teach a replacement response.`, wizard: `Keep Kai's correction private whenever safety allows.`, next: 'c3_escalated', meta: meta('Respond', 'Public callout', 'public attention') }
        }
      },

      c3_supported: {
        text: `Kai follows the direction and says, "Can I have my break after this?" Their voice is still tense, but their body is safer.`,
        hint: `Honor and reinforce the replacement request while keeping the remaining requirement small.`,
        choices: {
          A: { text: `Say, "Yes. Great job asking. Put the last bin on the shelf, then your break starts," and mark a chart move for following the direction.`, score: 10, feedback: `This reinforces the replacement request, preserves the earned break, and strengthens direction following.`, wizard: `Perfect. The safer response works and pays off.`, next: 'c4_supported', meta: meta('Reinforce', 'Request honored plus chart move') },
          B: { text: `Say, "Yes, after clean-up," and point to the remaining materials.`, score: 5, feedback: `The request is honored, but the exact remaining amount and reinforcement are less clear.`, wizard: `Good direction. Make the finish line smaller and clearer.`, next: 'c4_wobbly', meta: meta('Reinforce', 'Request honored', 'finish line vague') },
          C: { text: `Say, "We'll see. Show me you can handle it first."`, score: 0, feedback: `This makes access to the earned break uncertain after Kai used the replacement response.`, wizard: `Uncertainty can reignite the battle.`, next: 'c4_escalated', meta: meta('Respond', 'Earned break made uncertain', 'replacement not honored') }
        }
      },

      c3_wobbly: {
        text: `Kai stops moving toward the doorway but remains tense. They pick up one item from the floor and then pause.`,
        hint: `Reinforce the first safe step immediately instead of waiting for full calm or completion.`,
        choices: {
          A: { text: `Say, "Thank you for picking that up and staying in the classroom," then mark a chart move.`, score: 10, feedback: `This reinforces the first successful behavior even though the situation is not fully resolved.`, wizard: `Catch progress, not perfection.`, next: 'c4_supported', meta: meta('Reinforce', 'Immediate partial-success reinforcement') },
          B: { text: `Wait silently until Kai finishes picking everything up.`, score: 5, feedback: `Reducing language may help, but waiting misses a chance to reinforce the first safe response.`, wizard: `Silence can be useful, but reinforce the good move when it appears.`, next: 'c4_wobbly', meta: meta('Reinforce', 'Wait', 'reinforcement delayed') },
          C: { text: `Say, "You made this much harder than it needed to be."`, score: 0, feedback: `Criticism after a safer response can weaken re-entry and increase escalation.`, wizard: `Do not punish the recovery.`, next: 'c4_escalated', meta: meta('Respond', 'Criticism during recovery', 'negative attention') }
        }
      },

      c3_escalated: {
        text: `Kai remains near the edge of the classroom and is watching the door. Their hands are not on anyone, but they are still highly upset.`,
        hint: `Reduce language, give one safe action, and keep the earned break visible as part of the plan.`,
        choices: {
          A: { text: `Say, "Kai, put the folder on the break table. Then sit in the break chair."`, score: 10, feedback: `This gives a brief two-step action toward the planned safe break routine.`, wizard: `Clear, calm, and connected to the plan.`, next: 'c4_wobbly', meta: meta('Respond', 'Brief safe-action sequence') },
          B: { text: `Say, "Take a minute and calm your body."`, score: 5, feedback: `This may lower pressure, but the action and destination are not concrete.`, wizard: `A pause can help, but the safe destination should be explicit.`, next: 'c4_wobbly', meta: meta('Respond', 'Calm prompt', 'destination unclear') },
          C: { text: `Tell Kai the break is cancelled and direct them back to the full class task.`, score: 0, feedback: `Cancelling the earned break and restoring the full demand can intensify escape-related escalation.`, wizard: `That makes the mountain taller at the worst time.`, next: 'c4_escalated', meta: meta('Respond', 'Break cancelled and demand increased', 'escalating consequence') }
        }
      },

      c4_supported: {
        text: `Kai begins the planned break. After several minutes, the break timer is almost finished.`,
        hint: `Prepare the return with two manageable choices or a clear small task.`,
        choices: {
          A: { text: `Say, "When the timer ends, you can return to the rug seat or the side chair. Pick one."`, score: 10, feedback: `This makes the return predictable and gives two safe options.`, wizard: `Excellent return spell. Choice keeps the re-entry manageable.`, next: 'c5_supported', meta: meta('Prevent', 'Return choice') },
          B: { text: `Say, "Break is almost done. Get ready to come back."`, score: 5, feedback: `This prepares Kai, but it does not use the planned choice or define the return location.`, wizard: `Helpful warning. Add the two safe destinations.`, next: 'c5_wobbly', meta: meta('Prevent', 'Transition warning', 'choice omitted') },
          C: { text: `Say, "Your break is over. No more arguing—back to the group."`, score: 0, feedback: `This combines a no/stop-style statement with confrontation during re-entry.`, wizard: `The return can be calm and structured instead.`, next: 'c5_escalated', meta: meta('Respond', 'Confrontational return', 'unpaired no') }
        }
      },

      c4_wobbly: {
        text: `Kai is calmer but still hesitant about returning. They ask, "Can I sit somewhere else?"`,
        hint: `This is the planned alternative-seating request. Reinforce it and offer an appropriate location.`,
        choices: {
          A: { text: `Say, "Yes. Great job asking. You can use the side chair," and mark a chart move for the appropriate request.`, score: 10, feedback: `This honors and reinforces the replacement request.`, wizard: `The skill appeared—make it work.`, next: 'c5_supported', meta: meta('Reinforce', 'Alternative-seating request') },
          B: { text: `Say, "Yes, you can sit there," and continue the transition.`, score: 5, feedback: `Honoring the request is helpful, but the specific reinforcement is missed.`, wizard: `Good. Add a quick reinforcement to strengthen the skill.`, next: 'c5_wobbly', meta: meta('Reinforce', 'Request honored', 'reinforcement omitted') },
          C: { text: `Say, "No, you need to go back to your normal spot today."`, score: 0, feedback: `This blocks the replacement behavior and returns to the no pattern during re-entry.`, wizard: `If the replacement request does not work, it will not compete well with escape.`, next: 'c5_escalated', meta: meta('Respond', 'Alternative-seating request denied', 'request blocked') }
        }
      },

      c4_escalated: {
        text: `Kai is not yet ready to rejoin the full routine. The class is moving on, and you need a safe, plan-aligned next step.`,
        hint: `Use a smaller alternative task or location that still teaches an appropriate request and return.`,
        choices: {
          A: { text: `Offer, "You can ask for alternate work at the side table or return to the group. Which one?"`, score: 10, feedback: `This uses the planned alternate-work request and provides two manageable paths.`, wizard: `Strong reset. Both choices stay inside the plan.`, next: 'c5_wobbly', meta: meta('Teach', 'Alternate-work choice') },
          B: { text: `Let Kai stay out of the routine until they independently decide to return.`, score: 5, feedback: `This may avoid escalation, but it does not actively teach the replacement response or return path.`, wizard: `Calm matters, but the skill still needs practice.`, next: 'c5_wobbly', meta: meta('Respond', 'Unstructured pause', 'replacement not taught') },
          C: { text: `Tell Kai they will have to make up the missed routine during a preferred time later.`, score: 0, feedback: `This adds a future consequence and may strengthen escape rather than teach re-entry.`, wizard: `Do not carry the crisis forward as another demand battle.`, next: 'c5_escalated', meta: meta('Respond', 'Make-up consequence', 'future power struggle') }
        }
      },

      c5_supported: {
        text: `Kai returns using the supported seat or alternate-work option. The crisis has de-escalated and the class routine continues.`,
        hint: `End by reinforcing the safe return and use of the replacement response.`,
        choices: {
          A: { text: `Give specific praise and a chart move for returning safely and using the appropriate request.`, score: 10, feedback: `This reinforces the exact recovery skills the plan is designed to build.`, wizard: `Quest complete. Safe return becomes the behavior worth repeating.`, meta: meta('Reinforce', 'Safe-return reinforcement') },
          B: { text: `Say, "Thank you," and move on.`, score: 5, feedback: `Brief praise is helpful, but it misses the planned chart-move reinforcement.`, wizard: `Good spark—use the full reinforcement system.`, meta: meta('Reinforce', 'Brief praise', 'chart move omitted') },
          C: { text: `Say, "Next time, don't make such a big deal about your break."`, score: 0, feedback: `This adds criticism after recovery and may weaken future help-seeking.`, wizard: `Do not attach a lecture to the recovery.`, meta: meta('Respond', 'Criticism after recovery', 'negative attention') }
        }
      },

      c5_wobbly: {
        text: `Kai re-enters the routine with support, though the return is not completely smooth.`,
        hint: `Reinforce the successful piece now rather than waiting for perfect behavior.`,
        choices: {
          A: { text: `Mark a chart move for the safe return or appropriate request and give specific praise for that behavior.`, score: 10, feedback: `This follows the plan by reinforcing meaningful progress immediately.`, wizard: `Recovery does not have to be perfect to be reinforced.`, meta: meta('Reinforce', 'Recovery reinforcement') },
          B: { text: `Wait until the end of the activity to decide whether the return deserves reinforcement.`, score: 5, feedback: `Delaying reinforcement weakens its connection to the successful return.`, wizard: `Catch the recovery while it is happening.`, meta: meta('Reinforce', 'Delayed reinforcement', 'delay') },
          C: { text: `Withhold the chart move because the earlier crisis was too significant.`, score: 0, feedback: `The plan awards reinforcement for successful behavior; earlier escalation should not erase a later earned success.`, wizard: `Do not make the recovery impossible to earn.`, meta: meta('Respond', 'Earned reinforcement withheld', 'response cost') }
        }
      },

      c5_escalated: {
        text: `Kai still needs substantial support as the class moves into the next routine.`,
        hint: `Reset to a clear choice, productive role, or replacement request rather than escalating consequences.`,
        choices: {
          A: { text: `Offer one small class job or alternate-work choice, prompt the appropriate request, and reinforce the first safe response.`, score: 10, feedback: `This returns to the plan and creates a new opportunity for success.`, wizard: `Strong reset. The next routine can start with the right pathway.`, meta: meta('Respond', 'Structured reset') },
          B: { text: `Keep Kai near an adult and reduce the task while waiting for a calmer moment.`, score: 5, feedback: `Reduced demand and proximity may help, but the replacement response still needs to be prompted and reinforced.`, wizard: `Stabilize first, then teach the next move.`, meta: meta('Respond', 'Reduced demand and proximity', 'replacement omitted') },
          C: { text: `Remove all preferred jobs and breaks for the rest of the afternoon.`, score: 0, feedback: `Removing supports and reinforcers can increase escape pressure and takes away tools used to build appropriate behavior.`, wizard: `Do not remove the tools that help Kai succeed.`, meta: meta('Respond', 'Global loss of supports', 'punitive consequence') }
        }
      }
    }
  });
})();
