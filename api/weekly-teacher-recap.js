'use strict';

const crypto = require('node:crypto');
const { supabaseFetch } = require('./research-admin-server');
const weeklyCheckin = require('../server/weekly-checkin-service');
const { denverDate, loadWeeklySummary } = require('../server/weekly-recap-service');
const { buildWeeklyRecapEmail } = require('../server/weekly-recap-email');

function authorized(request) {
  const header = String(request.headers?.authorization || '');
  const secret = process.env.CRON_SECRET || '';
  if (!secret || !header.startsWith('Bearer ')) return false;
  const supplied = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

async function parseJson(response) {
  return response.json().catch(() => null);
}

async function db(path, options = {}) {
  const response = await supabaseFetch(path, options);
  const value = await parseJson(response);
  if (!response.ok) throw new Error('Weekly recap database request failed');
  return value;
}

async function phaseHistory(caseId) {
  return db('/rest/v1/research_case_phase_events?case_id=eq.' + encodeURIComponent(caseId) +
    '&select=id,phase,effective_date,recorded_at&order=effective_date.asc,recorded_at.asc,id.asc');
}

async function claim(candidate, weekEnd) {
  const result = await db('/rest/v1/rpc/claim_teacher_reminder_event', {
    method: 'POST',
    body: JSON.stringify({
      target_participant_id: candidate.participant_id,
      target_case_id: candidate.case_id,
      target_reminder_type: 'weekly_recap',
      target_study_date: weekEnd,
      retry_reclamation: false
    })
  });
  return result?.[0] || null;
}

async function issueUrl(candidate, context) {
  const rawToken = weeklyCheckin.createRawToken();
  await db('/rest/v1/rpc/research_admin_generate_weekly_checkin', {
    method: 'POST',
    body: JSON.stringify({
      target_participant_id: candidate.participant_id,
      target_case_id: candidate.case_id,
      target_week_start: context.week_start,
      target_token_hash: weeklyCheckin.hashToken(rawToken)
    })
  });
  return weeklyCheckin.buildQualtricsUrl(rawToken, candidate.participant_code, context.week_number);
}

async function patchEvent(id, values) {
  const response = await supabaseFetch('/rest/v1/teacher_reminder_events?id=eq.' + encodeURIComponent(id), {
    method: 'PATCH',
    body: JSON.stringify({ ...values, updated_at: new Date().toISOString() })
  });
  if (!response.ok) throw new Error('Weekly recap audit update failed');
}

function configurationReady() {
  return process.env.WEEKLY_RECAP_SYSTEM_ENABLED === 'true'
    && Boolean(process.env.RESEND_API_KEY)
    && Boolean(process.env.TEACHER_GAME_URL)
    && weeklyCheckin.qualtricsConfiguration().configured;
}

module.exports = async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }
  if (!authorized(request)) return response.status(401).json({ error: 'Unauthorized' });
  if (!configurationReady()) return response.status(200).json({ enabled: false, sent: 0, skipped: 0, failed: 0 });

  const today = denverDate(new Date());
  if (new Date(today + 'T12:00:00Z').getUTCDay() !== 5) {
    return response.status(200).json({ enabled: true, study_date: today, sent: 0, skipped: 0, failed: 0, reason: 'not_friday' });
  }

  return response.status(200).json({ enabled: true, study_date: today, sent: 0, skipped: 0, failed: 0 });
};
