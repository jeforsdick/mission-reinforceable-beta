window.MR_TEACHER_CONFIG = {
  teacherId: 'olson',
  displayName: 'Beta Classroom',
  classroomLabel: 'Beta Classroom',
  studentAlias: 'Student',

  // GitHub Pages-safe privacy rule: use teacher IDs and student pseudonyms only.
  defaultHearts: 5,
  missionSteps: 5,
  shuffleChoices: true,

  // Optional: paste your Google Apps Script web app URL here when ready.
  // The base game always saves locally first, even if this is blank.
  resultEndpoint: 'https://script.google.com/macros/s/AKfycbyyjRozcfXiKtLNZ7XQciJjQJPOqpJGn3GYUnFi2ZpRL1rLAkM3JEztANQIAUyWgxtY/exec',

  growthFocus: 'Keep prompts brief, private, and tied to the next safe classroom step.',
  xpMax: 1000,
  xpMultiplier: 5,

  feedback: {
    high: "Strong Plan Alignment\n\nGreat work. Your choices mostly matched Jordan's plan. You helped Jordan by making the writing task smaller, staying calm and private, prompting help or break requests, and reinforcing small steps back toward writing.",
    mid: "Mixed Plan Alignment\n\nYou used some helpful responses, but a few choices missed important parts of Jordan's plan. Look for moments where Jordan needed a smaller first step, a prompt to ask for help, a short break with a return plan, or calm private support.",
    low: "Needs Review\n\nSome choices may have made the writing routine harder for Jordan. Responses that add pressure, make the situation public, remove support, or turn writing into a power struggle can make Jordan more likely to avoid the task.",
    actionHigh: "<p>Keep using the plan: help, break, small step, calm return.</p>",
    actionMid: "<p>Review the moments where Jordan needed a clearer path back to the plan.</p>",
    actionLow: "<p>Review Jordan's plan and focus on calm, private responses that help Jordan ask for help, ask for a short break, or return to one small writing step.</p>"
  },

  assets: {
    landingClassroom: '../assets/game/skin-v2/landing-page-classroom.png',
    sameDayClassroom: '../assets/game/skin-v2/same-day-return-page-classroom.png'
  },

  resourcesFile: 'content/resources.js',

  missionFiles: [
    'content/daily-mission-1.js',
    'content/wildcard-mission-1.js',
    'content/crisis-mission-1.js'
  ]
};
