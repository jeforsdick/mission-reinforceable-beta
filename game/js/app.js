(function () {
  'use strict';

  const MR = window.MR = window.MR || {};
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
  let sessionEventsWired = false;

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
    const calendarBlocked = Boolean(MR.telemetryContext
      && !MR.telemetryContext.qaMode
      && !MR.telemetryContext.demoCalendarBypass
      && !MR.studyCalendar.isEligibleStudyDay());
    const classroomPath = hasDaily ? (config.assets.sameDayClassroom || config.assets.landingClassroom) : config.assets.landingClassroom;
    MR.$('#home-classroom-img').src = classroomPath;
    MR.$('#home-screen').classList.toggle('home-return', hasDaily);
    const participantLocked = hasDaily && MR.telemetryContext && !MR.telemetryContext.qaMode;
    MR.$('#home-primary-btn').hidden = participantLocked || calendarBlocked;
    MR.$('#same-day-return-message').hidden = !participantLocked;
    MR.$('#no-mission-message').hidden = !calendarBlocked;
    MR.$('#home-primary-btn').textContent = hasDaily ? 'Play Daily Again' : 'Start Your Daily Mission';
    MR.$('#daily-completion-message').hidden = !participantLocked;
    MR.$$('.mission-menu [data-start-mode]').forEach(button => { button.hidden = participantLocked || calendarBlocked; });
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
      MR.auth.recordResourceEvent('resources_opened').catch(error => {
        console.warn('Resource Map usage telemetry could not be saved.', error);
      });
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

  function wireSessionEvents() {
    if (sessionEventsWired) return;
    const logoutButton = MR.$('#logout-btn');
    if (!logoutButton) return;
    sessionEventsWired = true;
    logoutButton.addEventListener('click', async () => {
      logoutButton.disabled = true;
      const originalText = logoutButton.textContent;
      logoutButton.textContent = 'Logging Out...';
      try {
        await MR.auth.signOut();
        window.location.reload();
      } catch (error) {
        console.error(error);
        logoutButton.disabled = false;
        logoutButton.textContent = originalText;
      }
    });
  }

  async function loadAssignedGame(assignment) {
    const protectedContent = assignment.fullDraftQa
      ? await MR.auth.getFullDraftGameContent(assignment)
      : assignment.qaDraft
      ? await MR.auth.getDraftGameContent(assignment)
      : await MR.auth.getGameContent(assignment.case.id);
    if (protectedContent) return MR.loadProtectedGameContent(protectedContent, assignment.case);
    throw new Error('Protected game content is not configured for this participant. Please contact the research team.');
  }

  async function loadFidelityTargetLookup(caseId) {
    try {
      const targets = await MR.auth.getFidelityTargets(caseId);
      return targets.reduce((lookup, target) => {
        if (target.case_id === caseId && target.target_key) {
          lookup[target.target_key] = { id: target.id, domain: target.domain };
        }
        return lookup;
      }, {});
    } catch (error) {
      console.warn('Fidelity targets could not be loaded; domain-only telemetry will continue.', error);
      return {};
    }
  }

  async function init() {
    wireSessionEvents();
    try {
      const assignment = await MR.auth.getAssignment();
      if (!assignment.qaMode) MR.auth.watchDailySession(assignment.user);
      MR.participantCode = assignment.participant.participant_code;
      MR.telemetryContext = {
        participantId: assignment.participant.id,
        caseId: assignment.case.id,
        qaMode: assignment.qaMode === true,
        demoCalendarBypass: assignment.demoCalendarBypass === true,
        draftQa: Boolean(assignment.qaDraft || assignment.fullDraftQa),
        fullDraftQa: assignment.fullDraftQa === true,
        gameContentVersion: null,
        fidelityTargets: {}
      };
      MR.dailyMissionCompleted = assignment.qaMode ? false : await MR.auth.hasCompletedMissionToday();
      MR.onDailyMissionCompleted = () => {
        renderHome();
        MR.setScreen('home');
      };
      MR.onTelemetrySaveFailed = () => {
        renderHome();
        MR.setScreen('home');
      };
      MR.onStudyCalendarBlocked = () => {
        renderHome();
        MR.setScreen('home');
      };
      MR.$('#study-id').textContent = `Study ID: ${MR.participantCode}`;
      document.body.classList.toggle('qa-preview', assignment.qaMode === true);
      MR.$('#qa-preview-banner').hidden = assignment.qaMode !== true;
      const draftBanner = MR.$('#draft-qa-preview-banner');
      draftBanner.hidden = !(assignment.qaDraft || assignment.fullDraftQa);
      if (assignment.qaDraft) {
        const label = assignment.qaDraft.type === 'wild' ? 'Mystery' : `${assignment.qaDraft.type[0].toUpperCase()}${assignment.qaDraft.type.slice(1)}`;
        draftBanner.textContent = `DRAFT QA PREVIEW — ${label} ${assignment.qaDraft.slot} · Not published`;
      }
      if (assignment.fullDraftQa) draftBanner.textContent = 'FULL DRAFT QA PREVIEW · Not published';
      MR.$('#back-to-research-admin').hidden = assignment.qaMode !== true;
      MR.setScreen('loading');
      MR.telemetryContext.fidelityTargets = await loadFidelityTargetLookup(assignment.case.id);
      await loadAssignedGame(assignment);
      applyAssets();
      initAudio();
      wireEvents();
      if (!assignment.qaMode) MR.reminders.hydrateControls();
      MR.resources.render();
      renderHome();
      MR.setScreen('home');
      if (assignment.qaMode === true && assignment.qaDraft) MR.engine.start(assignment.qaDraft.type);
      console.info('Mission: Reinforceable loaded', {
        teacher: MR.teacherConfig,
        pool: MR.pool,
        protectedContent: !MR.teacherConfig.folder
      });
    } catch (error) {
      console.error(error);
      const loading = MR.$('#loading-screen .loading-card');
      loading.innerHTML = `
        <h1>Mission failed to load</h1>
        <p>${MR.escapeHTML(error.message || error)}</p>
      `;
      MR.setScreen('loading');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
