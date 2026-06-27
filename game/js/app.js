(function () {
  'use strict';

  const MR = window.MR = window.MR || {};
  let welcomeShownThisLoad = false;
  const WELCOME_STORAGE_KEY = 'mission-reinforceable:betaWelcomeShown';

  function applyAssets() {
    MR.$$('[data-asset]').forEach(el => {
      const key = el.dataset.asset;
      const src = MR.asset(key);
      if (src) el.setAttribute('src', src);
    });
  }

  function renderHome() {
    const config = MR.teacherConfig;
    MR.$('#home-classroom-label').textContent = config.classroomLabel || `${config.displayName}'s Classroom`;
    const hasDaily = MR.engine.hasDailyRunToday();
    const classroomPath = hasDaily ? (config.assets.sameDayClassroom || config.assets.landingClassroom) : config.assets.landingClassroom;
    MR.$('#home-classroom-img').src = classroomPath;
    MR.$('#home-screen').classList.toggle('home-return', hasDaily);
    MR.$('#home-primary-btn').textContent = hasDaily ? 'Play Daily Again' : 'Start Your Daily Mission';
  }

  function showWelcomeOnce() {
    if (welcomeShownThisLoad) return;
    let alreadyShown = false;
    try {
      alreadyShown = sessionStorage.getItem(WELCOME_STORAGE_KEY) === 'true';
      if (!alreadyShown) sessionStorage.setItem(WELCOME_STORAGE_KEY, 'true');
    } catch (error) {
      alreadyShown = welcomeShownThisLoad;
    }
    if (alreadyShown) return;
    welcomeShownThisLoad = true;
    if (MR.engine && MR.engine.showWelcomePopup) MR.engine.showWelcomePopup();
  }

  function wireEvents() {
    MR.$('#home-primary-btn').addEventListener('click', () => MR.engine.start('daily'));
    MR.$$('[data-start-mode]').forEach(button => {
      button.addEventListener('click', () => MR.engine.start(button.dataset.startMode));
    });

    MR.$('#nav-home').addEventListener('click', () => {
      renderHome();
      MR.setScreen('home');
    });
    MR.$('#nav-progress').addEventListener('click', () => {
      MR.dashboard.render();
      MR.setScreen('progress');
    });
    MR.$('#nav-resources').addEventListener('click', () => {
      MR.resources.render();
      MR.setScreen('resources');
    });

    MR.$('#wizard-modal-continue').addEventListener('click', () => MR.engine.continueAfterFeedback());
    MR.$('#wizard-modal-img').addEventListener('click', () => {
      if (!window.matchMedia('(max-width: 700px)').matches) return;
      if (MR.$('#wizard-modal').hidden) return;
      MR.engine.continueAfterFeedback();
    });
    const saveReminder = MR.$('#save-reminder-btn');
    if (saveReminder) {
      saveReminder.addEventListener('click', async () => {
        const status = await MR.reminders.save(MR.$('#reminder-time').value);
        MR.$('#reminder-status').textContent = status;
      });
    }
  }

  async function init() {
    try {
      MR.setScreen('loading');
      const teacherId = MR.getTeacherIdFromURL();
      await MR.loadTeacher(teacherId);
      applyAssets();
      wireEvents();
      MR.reminders.hydrateControls();
      MR.resources.render();
      renderHome();
      MR.setScreen('home');
      showWelcomeOnce();
      console.info('Mission: Reinforceable loaded', { teacher: MR.teacherConfig, pool: MR.pool });
    } catch (error) {
      console.error(error);
      const loading = MR.$('#loading-screen .loading-card');
      loading.innerHTML = `
        <h1>Mission failed to load</h1>
        <p>${MR.escapeHTML(error.message || error)}</p>
        <p>Check the teacher folder name, config.js, and missionFiles list.</p>
      `;
      MR.setScreen('loading');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
