'use strict';

const { isEligibleStudyDay } = require('./granite-study-calendar');

const TIMEZONE = 'America/Denver';
const QUALTRICS_HOST = 'educationutah.co1.qualtrics.com';

function validateWeeklyQualtricsUrl(value) {
  if (value == null || String(value).trim() === '') return { valid: true, configured: false, url: null };
  try {
    const original = String(value).trim();
    const url = new URL(original);
    const valid = url.protocol === 'https:' && url.hostname === QUALTRICS_HOST && !url.username && !url.password;
    return { valid, configured: valid, url: valid ? original : null };
  } catch { return { valid: false, configured: false, url: null }; }
}

function denverDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDate(dateKey, days) {
  const value = new Date(`${dateKey}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function currentStudyWeek(now = new Date()) {
  const today = denverDate(now);
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const monday = shiftDate(today, -(weekday === 0 ? 6 : weekday - 1));
  return { week_start: monday, week_end: shiftDate(monday, 4), timezone: TIMEZONE };
}

function eligibleStudyDays(window) {
  let date = window.week_start;
  let count = 0;
  while (date <= window.week_end) {
    if (isEligibleStudyDay(date)) count++;
    date = shiftDate(date, 1);
  }
  return count;
}

function summarizeSessions(sessions, content, window) {
  const pools = {
    daily: new Set((content.daily_missions || []).map(item => item.id)),
    mystery: new Set((content.wildcard_missions || []).map(item => item.id)),
    crisis: new Set((content.crisis_missions || []).map(item => item.id))
  };
  const valid = sessions.filter(row => row.participant_id === content.participant_id && row.case_id === content.case_id && row.status === 'completed' && row.qa_mode === false && pools[row.mode]?.has(row.mission_id) && row.game_content_version === content.version && row.study_date >= window.week_start && row.study_date <= window.week_end && isEligibleStudyDay(row.study_date));
  const mix = { daily: 0, mystery: 0, crisis: 0 };
  valid.forEach(row => { mix[row.mode]++; });
  return {
    week_start: window.week_start,
    week_end: window.week_end,
    timezone: TIMEZONE,
    missions_completed: valid.length,
    days_practiced: new Set(valid.map(row => row.study_date)).size,
    eligible_study_days: eligibleStudyDays(window),
    mission_mix: mix,
    behavior_plan_xp: null,
    xp_available: false
  };
}

async function loadWeeklySummary(caseId, supabaseFetch, now = new Date()) {
  const period = currentStudyWeek(now);
  const response = await supabaseFetch('/rest/v1/rpc/research_admin_weekly_game_summary', { method: 'POST', body: JSON.stringify({ target_case_id: caseId, target_week_start: period.week_start }) });
  if (!response.ok) throw new Error('Weekly summary could not be calculated');
  const summary = await response.json();
  return { ...summary, eligible_study_days: eligibleStudyDays(period) };
}

module.exports = { TIMEZONE, QUALTRICS_HOST, validateWeeklyQualtricsUrl, denverDate, currentStudyWeek, eligibleStudyDays, summarizeSessions, loadWeeklySummary };
