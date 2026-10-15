(function () {
  'use strict';

  const MR = window.MR = window.MR || {};
  const KEY = 'unfinished-mission';
  const MODES = new Set(['daily', 'wild', 'crisis']);
  const STAGES = new Set(['question', 'feedback', 'outcome']);

  function clear() {
    if (MR.storage && MR.storage.remove) MR.storage.remove(KEY);
  }

  function read() {
    if (!MR.storage || !MR.telemetryContext || !MR.studyDate) return null;
    const value = MR.storage.get(KEY);
    if (!value || typeof value !== 'object') return null;
    const context = MR.telemetryContext;
    const pool = MR.pool && MR.pool[value.mode];
    const valid = value.schemaVersion === 1
      && value.studyDate === MR.studyDate.dateKey()
      && value.caseId === context.caseId
      && value.participantId === context.participantId
      && value.gameContentVersion === context.gameContentVersion
      && MODES.has(value.mode) && STAGES.has(value.stage)
      && typeof value.sessionId === 'string'
      && typeof value.telemetryStartedAt === 'string'
      && Array.isArray(value.answers) && value.answers.length <= 5
      && Array.isArray(pool)
      && pool.some(item => item.id === value.missionId);
    if (!valid || (!context.qaMode && MR.dailyMissionCompleted === true)) {
      clear();
      return null;
    }
    return value;
  }

  function save(value) {
    if (!MR.storage || !MR.telemetryContext || !MR.studyDate || !value) return false;
    return MR.storage.set(KEY, {
      ...value,
      schemaVersion: 1,
      caseId: MR.telemetryContext.caseId,
      participantId: MR.telemetryContext.participantId,
      gameContentVersion: MR.telemetryContext.gameContentVersion,
      studyDate: MR.studyDate.dateKey()
    });
  }

  MR.missionResume = { read, save, clear };
})();
