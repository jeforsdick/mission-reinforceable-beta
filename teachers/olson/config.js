window.MR_TEACHER_CONFIG = {
  teacherId: 'olson',
  displayName: 'Beta Classroom',
  classroomLabel: 'Beta Classroom',
  studentAlias: 'Student',

  // GitHub Pages-safe privacy rule: use teacher IDs and student pseudonyms only.
  defaultHearts: 5,
  missionSteps: 5,
  shuffleChoices: false,

  // Optional: paste your Google Apps Script web app URL here when ready.
  // The base game always saves locally first, even if this is blank.
  resultEndpoint: 'https://script.google.com/macros/s/AKfycbw4DsAMLija2_VVkk_8A8NOvWidCoyqPVgaY00pNi6jRkjmhfUySkQToYXqQTwigzS7/exec',

  growthFocus: 'Keep prompts brief, private, and tied to the next safe classroom step.',
  xpMax: 1000,
  xpMultiplier: 5,

  feedback: {
    high: "High fidelity. You recognized the function of Student's behavior, kept access to the routine available, prompted the replacement behavior, and reinforced the first plan-aligned response quickly enough to strengthen future implementation.",
    mid: "Developing fidelity. Your response included supportive elements, but one active ingredient was missing or delayed. Tighten the next move by making the first step observable, prompting the replacement behavior earlier, or reinforcing re-entry faster.",
    low: "Low fidelity. The response drifted from the BIP and may have increased escape, adult attention, peer attention, or escalation. Reset by reducing language, returning to the function-based plan, and reinforcing the first safe step back into the routine.",
    actionHigh: '<ul><li>Keep using private pre-correction before predictable triggers.</li><li>Prompt Student\'s replacement behavior before refusal becomes public.</li><li>Reinforce the first small step back into instruction, peers, or routines.</li></ul>',
    actionMid: '<ul><li>Shift from general encouragement to one observable first action.</li><li>Make sure breaks, help, or choices include a clear return-to-routine step.</li><li>Move reinforcement closer to the exact behavior the BIP is trying to build.</li></ul>',
    actionLow: '<ul><li>Reduce public correction, threats, and extended explanations during activation.</li><li>Do not remove Student from the task or peer routine unless safety requires it.</li><li>Return to the sequence: prevent, prompt replacement, reinforce re-entry, then problem solve later.</li></ul>'
  },

  assets: {
    landingClassroom: 'assets/skin-v2/landing-page-classroom.png',
    sameDayClassroom: 'assets/skin-v2/same-day-return-page-classroom.png'
  },

  resourcesFile: 'content/resources.js',

  missionFiles: [
    'content/daily-mission-1.js',
    'content/wildcard-mission-1.js',
    'content/crisis-mission-1.js',
    'content/crisis-mission-2.js',
    'content/crisis-mission-3.js'
  ]
};
