(function () {
  'use strict';

  const MR = window.MR = window.MR || {};
  let welcomeShownThisLoad = false;
  const WELCOME_STORAGE_KEY = 'mission-reinforceable:betaWelcomeShown';
  const SOUND_STORAGE_KEY = 'mrSoundEnabled';
  const BGM_VOLUME = 0.063;
  const SFX_VOLUME = 0.32;
  const AUDIO_PATHS = {
    bgm: '../assets/game/audio/bgm-loop.mp3',
    click: '../assets/game/audio/magic-click.mp3',
    missionStart: '../assets/game/audio/mission-start.mp3',
    correct: '../assets/game/audio/correct-fanfare.mp3',
    neutral: '../assets/game/audio/neutral-drum.mp3',
    incorrect: '../assets/game/audio/incorrect-sad.mp3'
  };
  let soundEnabled = false;
  let bgm = null;
  let audioReady = false;
  const sfx = {};
  const activeSfx = new Set();

  function savedSoundPreference() {
    try {
      return localStorage.getItem(SOUND_STORAGE_KEY) === 'true';
    } catch (error) {
      return false;
    }
  }

  function saveSoundPreference(enabled) {
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, enabled ? 'true' : 'false');
    } catch (error) {
      // Sound is optional; private browsing/storage errors should not affect gameplay.
    }
  }

  function createAudio(src, volume, loop = false) {
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.volume = volume;
    audio.loop = loop;
    return audio;
  }

  function ensureAudio() {
    if (audioReady) return;
    bgm = createAudio(AUDIO_PATHS.bgm, BGM_VOLUME, true);
    Object.entries(AUDIO_PATHS).forEach(([name, src]) => {
      if (name === 'bgm') return;
      sfx[name] = createAudio(src, SFX_VOLUME, false);
    });
    audioReady = true;
  }

  function updateSoundToggle() {
    const toggle = MR.$('#sound-toggle');
    if (!toggle) return;
    const state = MR.$('.sound-toggle__state', toggle);
    toggle.setAttribute('aria-pressed', soundEnabled ? 'true' : 'false');
    toggle.setAttribute('aria-label', soundEnabled ? 'Turn sound off' : 'Turn sound on');
    if (state) state.textContent = soundEnabled ? 'ON' : 'OFF';
  }

  function startBgm() {
    if (!soundEnabled) return;
    ensureAudio();
    if (!bgm || !bgm.paused) return;
    bgm.volume = BGM_VOLUME;
    bgm.play().catch(() => {
      // Browsers may block playback until a direct user gesture; the next gesture can try again.
    });
  }

  function stopBgm() {
    if (!bgm) return;
    bgm.pause();
  }

  function stopSfx() {
    activeSfx.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    activeSfx.clear();
  }

  function playSfx(name, volume = SFX_VOLUME) {
    if (!soundEnabled) return;
    ensureAudio();
    startBgm();
    const source = sfx[name];
    if (!source) return;
    const audio = source.cloneNode(true);
    audio.volume = volume;
    activeSfx.add(audio);
    audio.addEventListener('ended', () => activeSfx.delete(audio), { once: true });
    audio.play().catch(() => {
      activeSfx.delete(audio);
      // Missing files or browser restrictions should never interrupt gameplay.
    });
  }

  function setSoundEnabled(enabled, options = {}) {
    soundEnabled = Boolean(enabled);
    saveSoundPreference(soundEnabled);
    updateSoundToggle();
    if (soundEnabled) {
      ensureAudio();
      if (options.playClick) playSfx('click', 0.26);
      startBgm();
    } else {
      stopBgm();
      stopSfx();
    }
  }

  function initAudio() {
    soundEnabled = savedSoundPreference();
    updateSoundToggle();
    MR.audio = {
      isEnabled: () => soundEnabled,
      setSoundEnabled,
      startBgm,
      stopBgm,
      playSfx
    };
  }

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
    MR.$('#home-primary-btn').addEventListener('click', () => {
      MR.audio.playSfx('click', 0.26);
      MR.engine.start('daily');
    });
    MR.$$('[data-start-mode]').forEach(button => {
      button.addEventListener('click', () => {
        MR.audio.playSfx('click', 0.26);
        MR.engine.start(button.dataset.startMode);
      });
    });

    MR.$('#nav-home').addEventListener('click', () => {
      MR.audio.playSfx('click', 0.24);
      renderHome();
      MR.setScreen('home');
    });
    MR.$('#nav-progress').addEventListener('click', () => {
      MR.audio.playSfx('click', 0.24);
      MR.dashboard.render();
      MR.setScreen('progress');
    });
    MR.$('#nav-resources').addEventListener('click', () => {
      MR.audio.playSfx('click', 0.24);
      MR.resources.render();
      MR.setScreen('resources');
    });

    MR.$('#wizard-modal-continue').addEventListener('click', () => {
      MR.audio.playSfx('click', 0.24);
      MR.engine.continueAfterFeedback();
    });
    MR.$('#wizard-modal-img').addEventListener('click', () => {
      if (!window.matchMedia('(max-width: 700px)').matches) return;
      if (MR.$('#wizard-modal').hidden) return;
      MR.audio.playSfx('click', 0.24);
      MR.engine.continueAfterFeedback();
    });
    const soundToggle = MR.$('#sound-toggle');
    if (soundToggle) {
      soundToggle.addEventListener('click', () => setSoundEnabled(!soundEnabled, { playClick: true }));
    }
    const saveReminder = MR.$('#save-reminder-btn');
    if (saveReminder) {
      saveReminder.addEventListener('click', async () => {
        MR.audio.playSfx('click', 0.24);
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
      initAudio();
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
