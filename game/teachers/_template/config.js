window.MR_TEACHER_CONFIG = {
  teacherId: 'replace-with-teacher-id',
  displayName: 'Teacher Name',
  classroomLabel: "Teacher Name's Classroom",
  studentAlias: 'Student',
  defaultHearts: 5,
  missionSteps: 5,
  shuffleChoices: false,
  resultEndpoint: 'PASTE_GOOGLE_APPS_SCRIPT_URL_HERE_OR_LEAVE_BLANK',
  growthFocus: 'Write the one teacher-specific growth focus here.',

  assets: {
    // These can point to shared assets or to this teacher folder, e.g. game/teachers/teacher-a/assets/classroom.png
    landingClassroom: '../assets/game/skin-v2/landing-page-classroom.png',
    sameDayClassroom: '../assets/game/skin-v2/same-day-return-page-classroom.png'
  },

  feedback: {
    high: 'Teacher-specific high-fidelity summary.',
    mid: 'Teacher-specific developing-fidelity summary.',
    low: 'Teacher-specific low-fidelity summary.',
    actionHigh: '<ul><li>High score action step.</li></ul>',
    actionMid: '<ul><li>Middle score action step.</li></ul>',
    actionLow: '<ul><li>Low score action step.</li></ul>'
  },

  missionFiles: [
    'content/daily-mission-1.js'
  ]
};
