(function () {
  'use strict';
  const MR = window.MR = window.MR || {};
  const STUDY_TIME_ZONE = 'America/Denver';

  function dateKey(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: STUDY_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date);
    const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${value.year}-${value.month}-${value.day}`;
  }

  function dailySeed(date = new Date()) {
    return Number(dateKey(date).replaceAll('-', ''));
  }

  MR.studyDate = { timeZone: STUDY_TIME_ZONE, dateKey, dailySeed };
})();
