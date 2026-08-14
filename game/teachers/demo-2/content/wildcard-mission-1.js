/* MR-DEMO-2 Mystery Mission: The Crowded Transition */
(function registerDemo2WildcardMission() {
  if (typeof POOL === 'undefined') throw new Error('POOL must be defined before loading wildcard-mission-1.js');
  POOL.wild = POOL.wild || [];

  const meta = (component, mechanism, errorType = 'none') => ({ bipComponent: component, mechanism, errorType, function: 'escape' });

  POOL.wild.push({
    id: 'demo2-wild-crowded-transition',
    title: 'The Crowded Transition',
    expectedSteps: 5,
    start: 'w1_start',
    focus: "Use assigned position, class jobs, choices, and brief directions during a difficult transition.",
    routine: 'snack-to-whole-group transition',
    functionPressure: ['escape'],
    bipTargets: ['Assigned Position', 'Choice', 'Class Job', 'Precision Request'],

    steps: {
      w1_start: {
        meta: { fidelityTargetKey: 'proactive_01' },
        text: `Snack is ending and the class is moving to the rug for whole group. Kai usually does better when transitions are structured.\n\nToday, several students crowd around the sink and the usual end-of-row rug spot is blocked by a backpack. Kai stops moving and reaches toward another student's snack container.`,
        hint: `Reduce crowding and give Kai a clear role or position instead of only telling what not to do.`,
        choices: {
          A: { text: `Say, "Kai, carry the sanitizer basket to the rug, then sit at the end of the row or the side chair. You choose."`, score: 10, feedback: `This combines a preferred class job, assigned-position support, and two safe choices.`, wizard: `Excellent setup. The transition now has a job, a destination, and a choice.`, next: 'w2_supported', meta: meta('Prevent', 'Job plus assigned-position choice') },
          B: { text: `Say, "Come on, Kai. We are going to the rug now."`, score: 5, feedback: `The direction is brief, but it misses the known supports for crowding and choice.`, wizard: `Clear, but incomplete. Use the supports that make this transition easier.`, next: 'w2_wobbly', meta: meta('Prevent', 'Brief direction', 'missed choice and position') },
          C: { text: `Say, "No, don't touch that. Get to the rug."`, score: 0, feedback: `This uses an unpaired no/stop style response and does not provide an alternative action or position.`, wizard: `That closes one door without opening the safe one.`, next: 'w2_escalated', meta: meta('Respond', 'Unpaired no', 'no alternative') }
        }
      },

      w2_supported: {
        meta: { fidelityTargetKey: 'proactive_01' },
        text: `Kai takes the basket and moves toward the rug. The end spot is still partly crowded, and Kai says, "I want that spot," pointing to a seat between two peers.`,
        hint: `Hold the assigned-seating boundary while still offering two safe options.`,
        choices: {
          A: { text: `Say, "That spot is not available. You can sit at the end of the row or the side chair."`, score: 10, feedback: `You maintained the safety boundary and paired it with two manageable choices.`, wizard: `Perfect boundary spell: clear limit, safe choices.`, next: 'w3_supported', meta: meta('Prevent', 'Boundary plus two safe choices') },
          B: { text: `Say, "Let's find somewhere else that works."`, score: 5, feedback: `This stays collaborative, but the available options are not concrete enough.`, wizard: `Friendly, but fuzzy. Name the two safe spots.`, next: 'w3_wobbly', meta: meta('Prevent', 'Collaborative redirection', 'options unclear') },
          C: { text: `Say, "No. You know you cannot sit there."`, score: 0, feedback: `This repeats the no pattern without an immediate alternative.`, wizard: `The limit may be needed, but the plan says pair it with a choice.`, next: 'w3_escalated', meta: meta('Respond', 'No statement', 'choice omitted') }
        }
      },

      w2_wobbly: {
        text: `Kai starts toward the rug, but then pauses beside the cubbies and picks up a classmate's pencil box.`,
        hint: `Prompt an incompatible action that is useful and observable.`,
        choices: {
          A: { text: `Say, "Kai, I need you to put the pencil box on the cubby and carry the attendance folder to the rug."`, score: 10, feedback: `This gives two observable actions and shifts Kai into a productive class job.`, wizard: `Strong recovery. Busy hands can become helping hands.`, next: 'w3_supported', meta: meta('Respond', 'Incompatible class job') },
          B: { text: `Say, "Please leave other people's things alone."`, score: 5, feedback: `This identifies the problem but does not provide the next action.`, wizard: `Tell Kai what to do, not only what to stop.`, next: 'w3_wobbly', meta: meta('Respond', 'Rule reminder', 'no next action') },
          C: { text: `Take the pencil box away and say, "You are not making good choices today."`, score: 0, feedback: `This adds criticism without teaching the next response.`, wizard: `The object is safe, but the pathway is still missing.`, next: 'w3_escalated', meta: meta('Respond', 'Critical comment', 'criticism') }
        }
      },

      w2_escalated: {
        text: `Kai pushes past two students and moves away from the rug area. They say, "I'm not sitting there."`,
        hint: `Use a brief precision request and an action that is incompatible with continuing to move away.`,
        choices: {
          A: { text: `Move near Kai and say, "Kai, I need you to carry this folder to the side chair."`, score: 10, feedback: `This is brief, observable, and gives Kai an incompatible action connected to the safe location.`, wizard: `One clear mission objective. Good.`, next: 'w3_wobbly', meta: meta('Respond', 'Precision request plus safe location') },
          B: { text: `Say, "Come back when you're ready."`, score: 5, feedback: `This reduces confrontation, but it can allow escape from the transition without practicing the replacement response.`, wizard: `Low pressure helps, but do not lose the return path.`, next: 'w3_escalated', meta: meta('Respond', 'Wait', 'escape allowed without return') },
          C: { text: `Say loudly, "If you leave again, you will miss the next activity."`, score: 0, feedback: `A public threat adds pressure and does not use the planned supports.`, wizard: `That can turn the transition into a contest. Keep it brief and actionable.`, next: 'w3_escalated', meta: meta('Respond', 'Public threat', 'power struggle') }
        }
      },

      w3_supported: {
        text: `Kai reaches the selected seat and puts the class item down. They are standing beside the seat instead of sitting, but their hands are safe.`,
        hint: `Reinforce the successful transition step before asking for the next one.`,
        choices: {
          A: { text: `Say, "Nice job getting to your spot and keeping hands safe," mark a chart move, then say, "Sit in your spot."`, score: 10, feedback: `This reinforces the successful part immediately and then gives the next clear direction.`, wizard: `Catch the success first, then build the next step.`, next: 'w4_supported', meta: meta('Reinforce', 'Specific praise plus chart move') },
          B: { text: `Say, "Good. Now sit down."`, score: 5, feedback: `This gives praise and the next direction, but it misses the planned chart-move reinforcement.`, wizard: `Good sequence. Use the reinforcement system too.`, next: 'w4_wobbly', meta: meta('Reinforce', 'Praise plus direction', 'chart move omitted') },
          C: { text: `Say, "Finally. Sit down so we can start."`, score: 0, feedback: `The criticism weakens the reinforcement value of the successful transition.`, wizard: `Do not attach a sting to the success.`, next: 'w4_escalated', meta: meta('Respond', 'Criticism after compliance', 'negative attention') }
        }
      },

      w3_wobbly: {
        text: `Kai gets close to the safe seating area but begins rocking the chair with one hand while watching the group.`,
        hint: `Give a direction that is incompatible with rocking the chair and reinforce the first response.`,
        choices: {
          A: { text: `Say, "Kai, I need both chair legs on the floor and both hands on your lap," then praise the first part they do.`, score: 10, feedback: `This is specific and incompatible with the unsafe chair movement.`, wizard: `Clear body action, quick reinforcement. Strong plan use.`, next: 'w4_supported', meta: meta('Respond', 'Incompatible direction') },
          B: { text: `Say, "Be safe with the chair."`, score: 5, feedback: `This names the goal but not the exact behavior Kai should do.`, wizard: `Make safety observable.`, next: 'w4_wobbly', meta: meta('Respond', 'Safety reminder', 'vague direction') },
          C: { text: `Say, "Stop rocking that chair right now."`, score: 0, feedback: `This uses the stop pattern without a replacement action.`, wizard: `Swap "stop" for a body action Kai can follow.`, next: 'w4_escalated', meta: meta('Respond', 'Stop statement', 'no replacement action') }
        }
      },

      w3_escalated: {
        text: `Kai moves toward the classroom doorway while the group settles. They are still inside the classroom but are leaving the expected whole-group area.`,
        hint: `Keep the request brief and create a clear safe destination with a choice or job.`,
        choices: {
          A: { text: `Say, "Kai, I need you to bring the pointer to the side chair. You can sit there or at the end of the rug."`, score: 10, feedback: `This combines an incompatible job, a clear destination, and two safe choices.`, wizard: `The path back is concrete and worth taking.`, next: 'w4_wobbly', meta: meta('Respond', 'Job plus safe-seat choice') },
          B: { text: `Stand between Kai and the doorway and say, "It's time for group."`, score: 5, feedback: `Proximity may help, but the direction and replacement path are incomplete.`, wizard: `Be close, but also give Kai the route.`, next: 'w4_escalated', meta: meta('Respond', 'Proximity', 'unclear route') },
          C: { text: `Say, "If you go out that door, you will lose your break."`, score: 0, feedback: `Threatening an earned or planned break can increase escalation and weakens the replacement system.`, wizard: `Do not make the break the battleground.`, next: 'w4_escalated', meta: meta('Respond', 'Threatened break loss', 'punitive consequence') }
        }
      },

      w4_supported: {
        meta: { fidelityTargetKey: 'reinforcement_01' },
        text: `Kai is in the safe spot and group begins. After a few minutes, Kai raises a hand and says, "Can I sit somewhere else?"`,
        hint: `This is the planned alternative-seating request. Reinforce it and offer an appropriate option.`,
        choices: {
          A: { text: `Say, "Great job asking. You can move to the side chair," and mark a chart move for the appropriate request.`, score: 10, feedback: `This directly reinforces the replacement behavior and honors the appropriate seating request.`, wizard: `Replacement skill unlocked. Make it worth using.`, next: 'w5_supported', meta: meta('Reinforce', 'Alternative-seating request') },
          B: { text: `Say, "Yes, you can move," and continue teaching.`, score: 5, feedback: `Honoring the request is helpful, but the specific reinforcement is missed.`, wizard: `The skill worked—celebrate it briefly.`, next: 'w5_wobbly', meta: meta('Reinforce', 'Request honored', 'reinforcement omitted') },
          C: { text: `Say, "You already chose your spot. You need to stay there."`, score: 0, feedback: `This blocks the replacement behavior after Kai used it appropriately.`, wizard: `If the request does not work, Kai may stop using it.`, next: 'w5_escalated', meta: meta('Respond', 'Replacement request denied', 'request blocked') }
        }
      },

      w4_wobbly: {
        text: `Kai stays in the group area but begins looking away and fidgeting with classroom materials nearby.`,
        hint: `Use a small productive job or participation choice to sustain the routine.`,
        choices: {
          A: { text: `Offer, "You can hold the pointer for the next question or pass out the picture cards. Pick one."`, score: 10, feedback: `This uses two productive choices and a helping role to support participation.`, wizard: `Turn fading attention into a meaningful job.`, next: 'w5_supported', meta: meta('Prevent', 'Productive participation choice') },
          B: { text: `Quietly remind Kai, "Keep paying attention."`, score: 5, feedback: `This is private but not specific enough to create active participation.`, wizard: `A reminder is weaker than a job Kai can do.`, next: 'w5_wobbly', meta: meta('Prevent', 'Attention reminder', 'vague participation') },
          C: { text: `Call on Kai repeatedly until they answer correctly.`, score: 0, feedback: `Increasing public demand can add escape pressure during an already difficult routine.`, wizard: `More pressure is not the same as more engagement.`, next: 'w5_escalated', meta: meta('Respond', 'Public demand', 'increased pressure') }
        }
      },

      w4_escalated: {
        text: `Kai remains near the edge of the group and is still struggling to enter the routine.`,
        hint: `Reset with one clear direction and an achievable role, then reinforce the first success.`,
        choices: {
          A: { text: `Say, "Kai, I need you to put these three cards on the board," then praise the first card placed.`, score: 10, feedback: `This creates a small incompatible class job and a fast success to reinforce.`, wizard: `A small useful job can reopen the routine.`, next: 'w5_wobbly', meta: meta('Respond', 'Small class job plus reinforcement') },
          B: { text: `Allow Kai to sit nearby without participating for the rest of group.`, score: 5, feedback: `This may reduce escalation, but it does not actively teach re-entry or the replacement behavior.`, wizard: `Calm is valuable, but the next skill still needs a doorway.`, next: 'w5_wobbly', meta: meta('Respond', 'Reduced demand', 're-entry not taught') },
          C: { text: `Tell Kai they will complete the group lesson alone later.`, score: 0, feedback: `This shifts the interaction toward punishment and may strengthen escape from the group routine.`, wizard: `Do not turn escape into a bigger future demand.`, next: 'w5_escalated', meta: meta('Respond', 'Make-up demand', 'punitive extra work') }
        }
      },

      w5_supported: {
        text: `Kai participates in the next part of group from the supported seat or class job.`,
        hint: `End by reinforcing the participation and successful use of the plan.`,
        choices: {
          A: { text: `Give specific praise and mark a chart move for participating appropriately in group.`, score: 10, feedback: `This strengthens the exact behavior the plan is designed to build.`, wizard: `Quest complete. The successful routine ends with reinforcement.`, meta: meta('Reinforce', 'Participation reinforcement') },
          B: { text: `Smile and give a thumbs up.`, score: 5, feedback: `A small reinforcer is helpful, but the chart-move system is missed.`, wizard: `Good spark—add the planned reinforcement too.`, meta: meta('Reinforce', 'Small reinforcer', 'chart move omitted') },
          C: { text: `Say, "See how much easier that was when you listened?"`, score: 0, feedback: `This adds a lecture to the success instead of reinforcing it cleanly.`, wizard: `Let success be success.`, meta: meta('Respond', 'Lecture after success', 'criticism') }
        }
      },

      w5_wobbly: {
        text: `Kai makes it through the transition and part of group with some support.`,
        hint: `Reinforce the successful pieces rather than waiting for a perfect routine.`,
        choices: {
          A: { text: `Mark a chart move for the safe transition or appropriate request and name exactly what Kai did well.`, score: 10, feedback: `This reinforces progress and keeps the plan active.`, wizard: `Reinforce the piece you want to see again.`, meta: meta('Reinforce', 'Progress reinforcement') },
          B: { text: `Wait until the next transition to see if Kai can repeat it before reinforcing.`, score: 5, feedback: `Delayed reinforcement weakens the connection to the successful behavior.`, wizard: `Catch it now.`, meta: meta('Reinforce', 'Delayed reinforcement', 'delay') },
          C: { text: `Remind Kai how difficult the transition was before giving praise.`, score: 0, feedback: `Mixing criticism into reinforcement can reduce its value.`, wizard: `Keep the reinforcement clean.`, meta: meta('Respond', 'Criticism mixed with praise', 'mixed message') }
        }
      },

      w5_escalated: {
        text: `Group time ends with Kai still needing support. The next transition is about to begin.`,
        hint: `Use the next routine as a fresh chance to structure success.`,
        choices: {
          A: { text: `Assign a clear transition job, offer the planned safe position, and reinforce the first step Kai follows.`, score: 10, feedback: `This resets to the plan instead of carrying the escalation forward.`, wizard: `New transition, new chance to cast the right spell.`, meta: meta('Prevent', 'Structured reset') },
          B: { text: `Keep Kai beside you and give frequent reminders during the next transition.`, score: 5, feedback: `Proximity may help, but a specific job or choice would be stronger.`, wizard: `Close support helps; structure it.`, meta: meta('Prevent', 'Proximity', 'specific support omitted') },
          C: { text: `Remove Kai from the next preferred classroom role because group was difficult.`, score: 0, feedback: `Removing a helpful role takes away a support that can promote successful participation.`, wizard: `Do not remove one of the tools that helps Kai succeed.`, meta: meta('Respond', 'Preferred role removed', 'support removed') }
        }
      }
    }
  });
})();
