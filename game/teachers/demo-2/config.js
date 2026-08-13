window.MR_TEACHER_CONFIG = {
  teacherId: 'demo-2',
  displayName: 'Demo Classroom 2',
  classroomLabel: 'Demo Classroom 2',
  studentAlias: 'Kai',

  defaultHearts: 5,
  missionSteps: 5,
  shuffleChoices: true,

  resultEndpoint: 'https://script.google.com/macros/s/AKfycbwF2bFu7_NKzgQGEpIhfcJ9MsXa3UiE_y3BtYakx_vAHPHR-17iyg9-w0fKbvc17zCH/exec',

  growthFocus: 'Offer two safe choices, prompt the replacement response early, and reinforce the first appropriate step.',
  xpMax: 1000,
  xpMultiplier: 5,

  feedback: {
    high: "Strong Plan Alignment\n\nGreat work. Your choices consistently matched Kai's plan by using clear choices, brief precision requests, planned breaks or alternate seating, and immediate reinforcement for appropriate responding.",
    mid: "Mixed Plan Alignment\n\nYou used some helpful responses, but a few choices missed important parts of Kai's plan. Look for moments to offer two manageable choices, prompt a break or seating request, use an incompatible direction, or reinforce direction following right away.",
    low: "Needs Review\n\nSome choices moved away from Kai's plan and may have increased escape or escalation. Reset by keeping directions brief, avoiding unnecessary 'no' statements, offering two safe choices, and reinforcing the first appropriate response.",
    actionHigh: "<p>Keep using the plan: choice, brief direction, replacement request, immediate reinforcement.</p>",
    actionMid: "<p>Review where a clearer choice, replacement prompt, or faster reinforcement would have strengthened the response.</p>",
    actionLow: "<p>Return to the core sequence: reduce unnecessary confrontation, give one clear direction or two safe choices, prompt the replacement response, and reinforce the first successful step.</p>"
  },

  assets: {
    landingClassroom: '../assets/game/skin-v2/landing-page-classroom.png',
    sameDayClassroom: '../assets/game/skin-v2/same-day-return-page-classroom.png'
  },

  resourcesFile: 'content/resources.js',

  missionFiles: [
    'content/daily-mission-1.js',
    'content/wildcard-mission-1.js',
    'content/crisis-mission-1.js',
    'content/bip-briefing.js'
  ]
};
