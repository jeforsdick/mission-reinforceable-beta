(function () {
  'use strict';

  const MR = window.MR = window.MR || {};
  const DEFAULT_CONFIG = {
    displayName: 'Mission: Reinforceable',
    classroomLabel: 'Participant Mission',
    studentAlias: 'Student',
    defaultHearts: 5,
    missionSteps: 5,
    shuffleChoices: true,
    growthFocus: 'Keep prompts brief, private, and tied to the next safe classroom step.',
    xpMax: 1000,
    xpMultiplier: 5,
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
    },
    feedback: {
      high: 'High fidelity. You recognized the function of the behavior, kept access to the routine available, prompted the replacement behavior, and reinforced the first plan-aligned response quickly enough to strengthen future implementation.',
      mid: 'Developing fidelity. Your response included supportive elements, but one active ingredient was missing or delayed. Tighten the next move by making the first step observable, prompting the replacement behavior earlier, or reinforcing re-entry faster.',
      low: 'Low fidelity. The response drifted from the BIP and may have increased escape, adult attention, peer attention, or escalation. Reset by reducing language, returning to the function-based plan, and reinforcing the first safe step back into the routine.',
      actionHigh: '<ul><li>Keep using private pre-correction before predictable triggers.</li><li>Prompt the replacement behavior before refusal becomes public.</li><li>Reinforce the first small step back into instruction, peers, or routines.</li></ul>',
      actionMid: '<ul><li>Shift from general encouragement to one observable first action.</li><li>Make sure breaks, help, or choices include a clear return-to-routine step.</li><li>Move reinforcement closer to the exact behavior the BIP is trying to build.</li></ul>',
      actionLow: '<ul><li>Reduce public correction, threats, and extended explanations during activation.</li><li>Do not remove the student from the task or peer routine unless safety requires it.</li><li>Return to the sequence: prevent, prompt replacement, reinforce re-entry, then problem solve later.</li></ul>'
    }
  };
  const LEGACY_CONFIG_FIELDS = ['missionFiles', 'resourcesFile', 'resultEndpoint'];

  function deepMerge(base, override) {
    const result = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    Object.entries(override || {}).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value) && base && typeof base[key] === 'object' && !Array.isArray(base[key])) {
        result[key] = deepMerge(base[key], value);
      } else result[key] = value;
    });
    return result;
  }

  MR.loadProtectedGameContent = async function loadProtectedGameContent(content, caseAssignment) {
    if (!content || typeof content !== 'object') throw new Error('Protected game content is missing or invalid. Please contact the research team.');
    const caseCode = String(caseAssignment && caseAssignment.case_code || '').trim();
    if (!caseCode) throw new Error('Protected game content requires a case identifier. Please contact the research team.');

    const rawConfig = Object.assign({}, content.config || {});
    LEGACY_CONFIG_FIELDS.forEach(field => delete rawConfig[field]);
    rawConfig.shuffleChoices = true;
    const config = deepMerge(DEFAULT_CONFIG, rawConfig);
    config.teacherId = caseCode;

    const daily = Array.isArray(content.daily_missions) ? content.daily_missions : [];
    const wild = Array.isArray(content.wildcard_missions) ? content.wildcard_missions : [];
    const crisis = Array.isArray(content.crisis_missions) ? content.crisis_missions : [];
    if (!daily.length && !wild.length && !crisis.length) throw new Error('No protected missions are configured for this case. Please contact the research team.');

    if (MR.telemetryContext) {
      const version = content.version == null || content.version === '' ? null : Number(content.version);
      MR.telemetryContext.gameContentVersion = Number.isInteger(version) ? version : null;
    }
    window.POOL = { daily, wild, crisis };
    window.MR_RESOURCES = content.resources || null;
    MR.teacherConfig = config;
    MR.pool = window.POOL;
    MR.resourcesData = window.MR_RESOURCES;
    window.GAME_CONFIG = {
      defaultStudent: config.studentAlias || 'Student',
      fidelityHigh: config.feedback.high,
      fidelityMid: config.feedback.mid,
      fidelityLow: config.feedback.low,
      actionHigh: config.feedback.actionHigh,
      actionMid: config.feedback.actionMid,
      actionLow: config.feedback.actionLow
    };
    return { config, pool: MR.pool };
  };

  MR.asset = function asset(name) {
    return MR.teacherConfig && MR.teacherConfig.assets ? MR.teacherConfig.assets[name] : DEFAULT_CONFIG.assets[name];
  };
})();
