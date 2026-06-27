(function () {
  'use strict';

  const MR = window.MR = window.MR || {};

  const DEFAULT_CONFIG = {
    teacherId: 'olson',
    displayName: 'Beta Classroom',
    classroomLabel: 'Beta Classroom',
    studentAlias: 'Student',
    defaultHearts: 5,
    missionSteps: 5,
    shuffleChoices: false,
    resultEndpoint: '',
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
    },
    resourcesFile: '',
    missionFiles: []
  };

  function deepMerge(base, override) {
    const result = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    Object.entries(override || {}).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value) && base && typeof base[key] === 'object' && !Array.isArray(base[key])) {
        result[key] = deepMerge(base[key], value);
      } else {
        result[key] = value;
      }
    });
    return result;
  }

  MR.getTeacherIdFromURL = function getTeacherIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('teacher');
    if (fromQuery) return MR.slug(fromQuery);
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const teacherIndex = pathParts.indexOf('teachers');
    if (teacherIndex >= 0 && pathParts[teacherIndex + 1]) return MR.slug(pathParts[teacherIndex + 1]);
    return 'olson';
  };

  MR.loadTeacher = async function loadTeacher(teacherId) {
    window.POOL = { daily: [], wild: [], crisis: [] };
    window.GAME_CONFIG = {};
    window.MR_TEACHER_CONFIG = null;

    const folder = `teachers/${teacherId}`;
    await MR.loadScript(`${folder}/config.js`);

    const teacherConfig = deepMerge(DEFAULT_CONFIG, window.MR_TEACHER_CONFIG || {});
    teacherConfig.teacherId = teacherConfig.teacherId || teacherId;
    teacherConfig.folder = folder;
    MR.teacherConfig = teacherConfig;

    // Backward compatibility for the original content files.
    window.GAME_CONFIG = Object.assign(window.GAME_CONFIG || {}, {
      resultEndpoint: teacherConfig.resultEndpoint || '',
      defaultStudent: teacherConfig.studentAlias || 'Student',
      fidelityHigh: teacherConfig.feedback.high,
      fidelityMid: teacherConfig.feedback.mid,
      fidelityLow: teacherConfig.feedback.low,
      actionHigh: teacherConfig.feedback.actionHigh,
      actionMid: teacherConfig.feedback.actionMid,
      actionLow: teacherConfig.feedback.actionLow
    });

    for (const file of teacherConfig.missionFiles || []) {
      const src = file.startsWith('http') || file.startsWith('/') ? file : `${folder}/${file}`;
      await MR.loadScript(src);
    }

    if (teacherConfig.resourcesFile) {
      const src = teacherConfig.resourcesFile.startsWith('http') || teacherConfig.resourcesFile.startsWith('/')
        ? teacherConfig.resourcesFile
        : `${folder}/${teacherConfig.resourcesFile}`;
      await MR.loadScript(src);
    }

    MR.pool = window.POOL || { daily: [], wild: [], crisis: [] };
    MR.resourcesData = window.MR_RESOURCES || null;
    return { config: teacherConfig, pool: MR.pool };
  };

  MR.asset = function asset(name) {
    return MR.teacherConfig && MR.teacherConfig.assets ? MR.teacherConfig.assets[name] : DEFAULT_CONFIG.assets[name];
  };
})();
