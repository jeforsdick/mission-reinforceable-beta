(function registerTemplateDailyMission() {
  if (typeof POOL === 'undefined') throw new Error('POOL must be defined before loading mission files.');
  POOL.daily = POOL.daily || [];

  POOL.daily.push({
    id: 'daily_1_replace_me',
    title: 'Daily Mission: Replace Me',
    start: 'step1',
    focus: 'Brief description of the BIP skill focus.',
    routine: 'classroom routine',
    functionPressure: ['escape', 'attention'],
    bipTargets: ['Prevent', 'Teach', 'Reinforce', 'Respond'],
    steps: {
      step1: {
        text: `Scene: Write the teacher-specific classroom setup here. Include the student pseudonym, setting event, routine, early signs, and the exact decision point.\n\nWhat do you do first?`,
        choices: {
          A: {
            text: 'Correct option with the same visual length as the others.',
            score: 10,
            feedback: 'Short correctness feedback.',
            wizard: 'Big narrative wizard feedback: show what happens to the student and classroom because of this choice.',
            next: 'step2'
          },
          B: {
            text: 'Neutral option with the same visual length as the others.',
            score: 5,
            feedback: 'Short neutral feedback.',
            wizard: 'Big narrative wizard feedback for the neutral choice.',
            next: 'step2'
          },
          C: {
            text: 'Incorrect option with the same visual length as the others.',
            score: 0,
            feedback: 'Short incorrect feedback.',
            wizard: 'Big narrative wizard feedback for the incorrect choice.',
            next: 'step2'
          }
        }
      },
      step2: {
        text: 'Scene: Continue the branch. Add at least one more step, or remove the next fields above to end after step 1.',
        choices: {
          A: { text: 'Correct recovery or maintenance move.', score: 10, feedback: 'Strong.', wizard: 'The Wizard narrates the improved outcome.' },
          B: { text: 'Neutral but incomplete move.', score: 5, feedback: 'Close.', wizard: 'The Wizard narrates the partial outcome.' },
          C: { text: 'Incorrect or plan-drifting move.', score: 0, feedback: 'Not aligned.', wizard: 'The Wizard narrates the consequence.' }
        }
      }
    }
  });
})();
