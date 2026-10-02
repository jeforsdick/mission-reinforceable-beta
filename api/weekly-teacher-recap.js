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
