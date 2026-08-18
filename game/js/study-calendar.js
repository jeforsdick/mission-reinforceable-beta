(function () {
  'use strict';

  const MR = window.MR = window.MR || {};
  const START_DATE = '2026-08-12';
  const END_DATE = '2027-05-26';
  const INELIGIBLE_DATES = new Set([
    '2026-09-07',
    '2026-09-18',
    '2026-10-15', '2026-10-16',
    '2026-10-19', '2026-10-20',
    '2026-11-25', '2026-11-26', '2026-11-27',
    '2026-12-21', '2026-12-22', '2026-12-23', '2026-12-24', '2026-12-25',
    '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01',
    '2027-01-04',
    '2027-01-18',
    '2027-02-12', '2027-02-15', '2027-02-16',
    '2027-03-12', '2027-03-15',
    '2027-03-29', '2027-03-30', '2027-03-31', '2027-04-01', '2027-04-02',
    '2027-04-05'
  ]);

  function studyDateKey(dateOrDateKey = new Date()) {
    if (typeof dateOrDateKey === 'string') return /^\d{4}-\d{2}-\d{2}$/.test(dateOrDateKey) ? dateOrDateKey : null;
    if (!MR.studyDate || typeof MR.studyDate.dateKey !== 'function') return null;
    const date = dateOrDateKey instanceof Date ? dateOrDateKey : new Date(dateOrDateKey);
    return Number.isNaN(date.getTime()) ? null : MR.studyDate.dateKey(date);
  }

  function isEligibleStudyDay(dateOrDateKey) {
    const key = studyDateKey(dateOrDateKey);
    if (!key || key < START_DATE || key > END_DATE || INELIGIBLE_DATES.has(key)) return false;
    const weekday = new Date(`${key}T00:00:00Z`).getUTCDay();
    return weekday >= 1 && weekday <= 5;
  }

  function addDays(key, days) {
    const date = new Date(`${key}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function weekStart(dateOrDateKey = new Date()) {
    const key = studyDateKey(dateOrDateKey);
    if (!key) return null;
    const weekday = new Date(`${key}T00:00:00Z`).getUTCDay();
    return addDays(key, -(weekday === 0 ? 6 : weekday - 1));
  }

  function eligibleStudyDatesForWeek(dateOrDateKey = new Date()) {
    const monday = weekStart(dateOrDateKey);
    if (!monday) return [];
    return Array.from({ length: 5 }, (_, offset) => addDays(monday, offset)).filter(isEligibleStudyDay);
  }

  function lastEligibleStudyDayForWeek(dateOrDateKey = new Date()) {
    return eligibleStudyDatesForWeek(dateOrDateKey).at(-1) || null;
  }

  function weeklyCheckinWindow(dateOrDateKey = new Date()) {
    const today = studyDateKey(dateOrDateKey);
    const monday = weekStart(today);
    if (!today || !monday) return null;
    const eligibleDates = eligibleStudyDatesForWeek(monday);
    if (!eligibleDates.length) return null;
    const availableOn = eligibleDates.at(-1);
    const closesOn = addDays(monday, 7);
    return {
      weekStart: monday,
      weekEnd: addDays(monday, 4),
      availableOn,
      closesOn,
      scheduledStudyDays: eligibleDates.length,
      eligibleDates,
      isAvailable: today >= availableOn && today < closesOn
    };
  }

  MR.studyCalendar = {
    timeZone: MR.studyDate && MR.studyDate.timeZone,
    startDate: START_DATE,
    endDate: END_DATE,
    isEligibleStudyDay,
    eligibleStudyDatesForWeek,
    lastEligibleStudyDayForWeek,
    weeklyCheckinWindow
  };
})();
