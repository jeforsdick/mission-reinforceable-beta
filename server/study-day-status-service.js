'use strict';

const crypto = require('node:crypto');
// Legacy reasons remain database-readable, but new teacher capabilities have one purpose.
const REASONS = Object.freeze(['teacher_unavailable']);
const TIMEZONE = 'America/Denver';
const SUCCESS = Object.freeze({
  teacher_unavailable: { heading: '✓ Got it.', message: "You're excused from today's mission.", detail: "You don't need to complete Mission: Reinforceable today." }
});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function tokenHash(rawToken) { return crypto.createHash('sha256').update(rawToken, 'utf8').digest('hex'); }
function rawToken() { return crypto.randomBytes(32).toString('base64url'); }
function dateParts(value, timeZone = TIMEZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(value);
  const object = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${object.year}-${object.month}-${object.day}`;
}
function addDays(date, days) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}
// 06:00 on the morning after the intended Denver date gives a practical buffer.
// Iterating corrects the UTC guess across both MST and MDT transitions.
function expiresForStudyDate(studyDate) {
  const next = addDays(studyDate, 1);
  const [year, month, day] = next.split('-').map(Number);
  let guess = new Date(Date.UTC(year, month - 1, day, 12));
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  for (let index = 0; index < 2; index++) {
    const p = Object.fromEntries(formatter.formatToParts(guess).map(part => [part.type, part.value]));
    const represented = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour) % 24, Number(p.minute));
    const wanted = Date.UTC(year, month - 1, day, 6, 0);
    guess = new Date(guess.getTime() + wanted - represented);
  }
  return guess;
}
function serviceHeaders(key) { return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }; }
function configuration() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Status service unavailable');
  return { base: `${process.env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1`, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
}
function publicOrigin(value = process.env.PUBLIC_SITE_URL || process.env.TEACHER_GAME_URL) {
  const url = new URL(value);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('A secure PUBLIC_SITE_URL is required');
  return url.origin;
}
async function issueStatusUrls({ participantId, caseId, studyDate, origin }, dependencies = {}) {
  if (!UUID.test(participantId) || !UUID.test(caseId) || !DATE.test(studyDate)) throw new Error('Invalid status-link scope');
  // Reject impossible calendar dates and prevent issuing a date other than the requested Denver date.
  if (addDays(studyDate, 0) !== studyDate) throw new Error('Invalid study date');
  // Validate the destination before creating capabilities. QA callers pass their
  // authenticated request origin; scheduled-email callers retain the configured fallback.
  const site = publicOrigin(origin);
  const { base, key } = configuration();
  const fetchImpl = dependencies.fetch || global.fetch;
  const expiration = expiresForStudyDate(studyDate).toISOString();
  const issued = REASONS.map(reason => ({ reason, raw: rawToken() }));
  const rows = issued.map(item => ({ token_hash: tokenHash(item.raw), participant_id: participantId, case_id: caseId, study_date: studyDate, reason: item.reason, expires_at: expiration }));
  const result = await fetchImpl(`${base}/participant_study_day_status_tokens`, { method: 'POST', headers: { ...serviceHeaders(key), Prefer: 'return=minimal' }, body: JSON.stringify(rows) });
  if (!result.ok) throw new Error('Status links could not be issued');
  return Object.fromEntries(issued.map(item => [`${item.reason}_url`, `${site}/study-day-status/?token=${encodeURIComponent(item.raw)}`]));
}
async function recordToken(token, dependencies = {}) {
  if (typeof token !== 'string' || token.length < 40 || token.length > 100 || !/^[A-Za-z0-9_-]+$/.test(token)) return { status: 400, body: { error: 'invalid', message: 'This link is invalid.' } };
  const { base, key } = configuration();
  const response = await (dependencies.fetch || global.fetch)(`${base}/rpc/record_study_day_status_token`, { method: 'POST', headers: serviceHeaders(key), body: JSON.stringify({ target_token_hash: tokenHash(token) }) });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = String(body?.message || '');
    if (message.includes('expired_status_token')) return { status: 410, body: { error: 'expired', message: 'This link has expired.' } };
    if (message.includes('invalid_status_token')) return { status: 404, body: { error: 'invalid', message: 'This link is invalid.' } };
    return { status: 503, body: { error: 'unavailable', message: "We couldn't record today's status. Please try again." } };
  }
  const row = Array.isArray(body) ? body[0] : body;
  return { status: 200, body: { ok: true, ...SUCCESS[row.reason], already_recorded: row.already_recorded === true } };
}

module.exports = { REASONS, TIMEZONE, SUCCESS, tokenHash, dateParts, expiresForStudyDate, issueStatusUrls, recordToken };
