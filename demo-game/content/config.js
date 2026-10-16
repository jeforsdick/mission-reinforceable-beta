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
  growthFocus: 'Catch the earliest opening: make writing smaller, prompt help or a short break, and reinforce the first return step.',
  bipBriefing: 'Jordan may avoid writing when the first step is unclear or the routine changes. Keep directions brief and private. Make the first step small, prompt a help or short-break request, then reinforce the request and a calm return to writing.',
  xpMax: 1000,
  xpMultiplier: 5,
  feedback: {
    high: "Strong Plan Alignment\n\nYou repeatedly made the plan work before refusal became the easiest path. Notice how your small first steps, helpful requests, and prompt reinforcement kept Jordan connected to writing—even when the classroom changed.",
    mid: "Mixed Plan Alignment\n\nSeveral choices helped Jordan, but some left the next step unclear or delayed the replacement response. Notice the moment when you could have prompted help, honored a short break, or reinforced a small return step sooner.",
    low: "Needs Review\n\nSome choices made escape from writing more efficient or made the interaction bigger. Try keeping your next cue private, making the task manageable, and teaching a help or break request that works better than refusal.",
    actionHigh: '<p>Keep practicing the sequence: small start → help or break request → prompt reinforcement → supported return.</p>',
    actionMid: '<p>Pick one missed timing opportunity: cue a request earlier, honor it promptly, or notice the first return step.</p>',
    actionLow: "<p>Visit the Resource Map. Start with Prevention Palace and Replacement Reservoir, then try a fresh route through the fictional mission.</p>"
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
