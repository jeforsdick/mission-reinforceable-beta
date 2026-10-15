(function () {
  'use strict';

  const MR = window.MR = window.MR || {};

  let startedAt = null;
  let endedAt = null;
  let activeStartedAt = null;
  let activeMs = 0;
  let running = false;

  function now() {
    return Date.now();
  }

  function formatSeconds(totalSeconds) {
    const seconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  function start() {
    startedAt = now();
    endedAt = null;
    activeStartedAt = null;
    activeMs = 0;
    running = true;

    if (!document.hidden) {
      activeStartedAt = now();
    }
  }

  function pauseActive() {
    if (!running || !activeStartedAt) return;
    activeMs += now() - activeStartedAt;
    activeStartedAt = null;
  }

  function resumeActive() {
    if (!running || activeStartedAt || document.hidden) return;
    activeStartedAt = now();
  }

  function snapshot() {
    if (!running || !startedAt) return null;
    const totalActiveMs = activeMs + (activeStartedAt ? Math.max(0, now() - activeStartedAt) : 0);
    return { startedAt: new Date(startedAt).toISOString(), activeMs: totalActiveMs };
  }

  function restore(saved) {
    const value = Date.parse(saved && saved.startedAt);
    if (!Number.isFinite(value) || !Number.isFinite(saved.activeMs) || saved.activeMs < 0) return false;
    startedAt = value;
    endedAt = null;
    activeMs = saved.activeMs;
    activeStartedAt = document.hidden ? null : now();
    running = true;
    return true;
  }

  function stop() {
    if (!running || !startedAt) return null;

    pauseActive();
    endedAt = now();
    running = false;

    const durationSeconds = Math.round((endedAt - startedAt) / 1000);
    const activeDurationSeconds = Math.round(activeMs / 1000);

    return {
      sessionStartedAt: new Date(startedAt).toISOString(),
      sessionEndedAt: new Date(endedAt).toISOString(),
      durationSeconds,
      activeDurationSeconds,
      durationFormatted: formatSeconds(activeDurationSeconds)
    };
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pauseActive();
    } else {
      resumeActive();
    }
  });

  MR.SessionTimer = {
    start,
    stop,
    snapshot,
    restore,
    pause: pauseActive,
    resume: resumeActive,
    formatSeconds
  };
})();
