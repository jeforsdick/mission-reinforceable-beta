/* Dedicated fictional public-demo configuration.
 * This fixture is browser-local and has no authentication or remote result endpoint.
 */
window.MR_PUBLIC_DEMO_CONFIG = {
  fixtureId: 'fictional-public-demo',
  fictional: true,
  displayName: 'Demo Classroom',
  classroomLabel: 'Demo Classroom',
  studentAlias: 'Jordan',
  defaultHearts: 5,
  missionSteps: 5,
  shuffleChoices: true,
  resultEndpoint: '',
  growthFocus: 'Keep prompts brief, private, and tied to the next safe classroom step.',
  xpMax: 1000,
  xpMultiplier: 5,
  feedback: {
    high: "Strong Plan Alignment\n\nGreat work. Your choices mostly matched Jordan's plan. You helped Jordan by making the writing task smaller, staying calm and private, prompting help or break requests, and reinforcing small steps back toward writing.",
    mid: "Mixed Plan Alignment\n\nYou used some helpful responses, but a few choices missed important parts of Jordan's plan. Look for moments where Jordan needed a smaller first step, a prompt to ask for help, a short break with a return plan, or calm private support.",
    low: "Needs Review\n\nSome choices may have made the writing routine harder for Jordan. Responses that add pressure, make the situation public, remove support, or turn writing into a power struggle can make Jordan more likely to avoid the task.",
    actionHigh: '<p>Keep using the plan: help, break, small step, calm return.</p>',
    actionMid: '<p>Review the moments where Jordan needed a clearer path back to the plan.</p>',
    actionLow: "<p>Review Jordan's plan and focus on calm, private responses that help Jordan ask for help, ask for a short break, or return to one small writing step.</p>"
  },
  assets: {
    title: '../assets/game/skin-v2/mission-reinforceable-title.png',
    landingClassroom: '../assets/game/skin-v2/landing-page-classroom.png',
    sameDayClassroom: '../assets/game/skin-v2/same-day-return-page-classroom.png',
    dailyIcon: '../assets/game/skin-v2/daily-mission-icon.png',
    mysteryIcon: '../assets/game/skin-v2/mystery-mission-icon.png',
    crisisIcon: '../assets/game/skin-v2/crisis-mission-icon.png',
    wizardGuide: '../assets/game/skin-v2/wizard-guide.png',
    wizardThink: '../assets/game/skin-v2/wizard-think.png',
    wizardMeh: '../assets/game/skin-v2/wizard-meh.png',
    wizardSuccess: '../assets/game/skin-v2/wizard-success.png',
    wizardDead: '../assets/game/skin-v2/wizard-dead.png',
    wizardStart: '../assets/game/skin-v2/wizard-start.png',
    heart: '../assets/game/skin-v2/heart-icon.png',
    startOverIcon: '../assets/game/skin-v2/bottom-bar-start-over-icon.png',
    progressIcon: '../assets/game/skin-v2/bottom-bar-my-progress-icon.png',
    resourcesIcon: '../assets/game/skin-v2/bottom-bar-resources-icon.png'
  }
};
