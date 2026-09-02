'use strict';

const crypto = require('node:crypto');
const { isEligibleStudyDay } = require('./granite-study-calendar');

const TYPES = Object.freeze({ DAILY: 'daily_prompt', FOLLOWUP: 'followup_reminder' });
const SUBJECTS = Object.freeze({
  [TYPES.DAILY]: 'Mission: Reinforceable — Today’s Mission Is Ready',
  [TYPES.FOLLOWUP]: 'Today’s Mission: Reinforceable Is Still Waiting'
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function emailFor(type, teacherName, gameUrl) {
  const safeUrl = escapeHtml(gameUrl);
  const linkText = `Start Today’s Mission: ${gameUrl}`;
  if (type === TYPES.FOLLOWUP) {
    const greeting = `Hello ${teacherName || 'Teacher'},`;
    return {
      subject: SUBJECTS[type],
      text: `${greeting}\n\nThis is a brief reminder to complete today’s Mission: Reinforceable activity when you have a few minutes.\n\n${linkText}\n\nIf you are unable to complete the mission today, please continue implementing the student’s behavior support plan as usual.\n\nThank you,\n\nJess`,
      html: `<!doctype html><html><body><p>${escapeHtml(greeting)}</p><p>This is a brief reminder to complete today’s Mission: Reinforceable activity when you have a few minutes.</p><p><a href="${safeUrl}">${escapeHtml(linkText)}</a></p><p>If you are unable to complete the mission today, please continue implementing the student’s behavior support plan as usual.</p><p>Thank you,</p><p>Jess</p></body></html>`
    };
  }
  return {
    subject: SUBJECTS[type],
    text: `Your Mission: Reinforceable activity for today is ready. Please complete this brief mission when you have a few minutes, ideally before the classroom routine in which you typically implement the behavior support plan. Today’s mission should take approximately 5 minutes to complete.\n\n${linkText}\n\nAs a reminder, the mission is designed to help you review and practice plan-aligned responses connected to the behavior support plan you are already implementing. Please continue to follow the behavior support plan and any school or district procedures currently in place.\n\nIf you have difficulty accessing the mission, please contact Jess at jess.olson@utah.edu. If the mission is unavailable or you are unable to complete it, please continue implementing the student’s behavior support plan as usual.\n\nThank you,\n\nJess`,
    html: `<!doctype html><html><body><p>Your Mission: Reinforceable activity for today is ready. Please complete this brief mission when you have a few minutes, ideally before the classroom routine in which you typically implement the behavior support plan. Today’s mission should take approximately 5 minutes to complete.</p><p><a href="${safeUrl}">${escapeHtml(linkText)}</a></p><p>As a reminder, the mission is designed to help you review and practice plan-aligned responses connected to the behavior support plan you are already implementing. Please continue to follow the behavior support plan and any school or district procedures currently in place.</p><p>If you have difficulty accessing the mission, please contact Jess at jess.olson@utah.edu. If the mission is unavailable or you are unable to complete it, please continue implementing the student’s behavior support plan as usual.</p><p>Thank you,</p><p>Jess</p></body></html>`
  };
}

function studyDate(now, timezone) {
  if (!timezone) throw new Error('TEACHER_REMINDER_TIMEZONE is required');
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(now);
    const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${value.year}-${value.month}-${value.day}`;
  } catch {
    throw new Error('TEACHER_REMINDER_TIMEZONE is invalid');
  }
}

function idempotencyKey(participantId, date, type) {
  return `teacher-reminder/${participantId}/${date}/${type}`;
}

function authorized(header, secret) {
  if (!secret || typeof header !== 'string' || !header.startsWith('Bearer ')) return false;
  const supplied = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

function validateConfiguration(names) {
  if (names.some(name => !process.env[name])) throw new Error('Teacher reminder configuration is incomplete');
  if (process.env.TEACHER_REMINDER_TIMEZONE !== 'America/Denver') throw new Error('TEACHER_REMINDER_TIMEZONE must be America/Denver');
  let gameUrl;
  try { gameUrl = new URL(process.env.TEACHER_GAME_URL); } catch { throw new Error('TEACHER_GAME_URL is invalid'); }
  if (gameUrl.protocol !== 'https:' || gameUrl.pathname !== '/game/' || gameUrl.search || gameUrl.hash || gameUrl.username || gameUrl.password) {
    throw new Error('TEACHER_GAME_URL must be an authenticated /game/ URL without query data');
  }
}

function createHandler(type, dependencies = {}) {
  const fetchImpl = dependencies.fetch || global.fetch;
  return async function handler(request, response) {
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      return response.status(405).json({ error: 'Method not allowed' });
    }
    if (!authorized(request.headers && request.headers.authorization, process.env.CRON_SECRET)) {
      return response.status(401).json({ error: 'Unauthorized' });
    }
    if (process.env.TEACHER_REMINDER_SYSTEM_ENABLED !== 'true') {
      return response.status(200).json({ enabled: false, sent: 0, skipped: 0, failed: 0 });
    }
    const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY', 'TEACHER_REMINDER_FROM_EMAIL', 'TEACHER_GAME_URL', 'TEACHER_REMINDER_TIMEZONE'];
    try { validateConfiguration(required); } catch (error) {
      console.error('Teacher reminder configuration is invalid.', { error: error.message });
      return response.status(500).json({ error: 'Reminder job unavailable' });
    }
    let date;
    try { date = studyDate(dependencies.now ? dependencies.now() : new Date(), process.env.TEACHER_REMINDER_TIMEZONE); } catch (error) {
      console.error('Teacher reminder timezone is invalid.', { error: error.message });
      return response.status(500).json({ error: 'Reminder job unavailable' });
    }

    const headers = { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' };
    const base = `${process.env.SUPABASE_URL}/rest/v1`;
    const summary = { study_date: date, eligible_study_day: isEligibleStudyDay(date), sent: 0, skipped: 0, failed: 0 };
    if (!summary.eligible_study_day) return response.status(200).json(summary);
    try {
      const candidatesResponse = await fetchImpl(`${base}/rpc/eligible_teacher_reminders`, { method: 'POST', headers, body: JSON.stringify({ require_followup: type === TYPES.FOLLOWUP }) });
      if (!candidatesResponse.ok) throw new Error(`Candidate lookup returned ${candidatesResponse.status}`);
      const candidates = await candidatesResponse.json();
      for (const candidate of candidates) {
        if (type === TYPES.FOLLOWUP) {
          const completionResponse = await fetchImpl(`${base}/rpc/has_completed_mission_on_study_date`, { method: 'POST', headers, body: JSON.stringify({ target_participant_id: candidate.participant_id, target_study_date: date, study_timezone: process.env.TEACHER_REMINDER_TIMEZONE }) });
          if (!completionResponse.ok) { summary.failed++; continue; }
          if (await completionResponse.json()) { summary.skipped++; continue; }
        }
        const claimResponse = await fetchImpl(`${base}/rpc/claim_teacher_reminder_event`, { method: 'POST', headers, body: JSON.stringify({ target_participant_id: candidate.participant_id, target_case_id: candidate.case_id, target_reminder_type: type, target_study_date: date }) });
        if (!claimResponse.ok) { summary.failed++; continue; }
        const [claim] = await claimResponse.json();
        if (!claim || !claim.claimed) { summary.skipped++; continue; }
        const email = emailFor(type, candidate.teacher_name, process.env.TEACHER_GAME_URL);
        let provider;
        try {
          const sendResponse = await fetchImpl('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey(candidate.participant_id, date, type) }, body: JSON.stringify({ from: process.env.TEACHER_REMINDER_FROM_EMAIL, to: [candidate.teacher_email], subject: email.subject, html: email.html, text: email.text }) });
          if (!sendResponse.ok) throw new Error(`Resend returned ${sendResponse.status}`);
          provider = await sendResponse.json();
        } catch (error) {
          summary.failed++;
          try {
            const failedPatch = await fetchImpl(`${base}/teacher_reminder_events?id=eq.${encodeURIComponent(claim.event_id)}`, { method: 'PATCH', headers, body: JSON.stringify({ status: 'failed' }) });
            if (!failedPatch.ok) console.error('Teacher reminder failure status could not be recorded.', { eventId: claim.event_id, status: failedPatch.status });
          } catch (patchError) {
            console.error('Teacher reminder failure status update threw an error.', { eventId: claim.event_id, error: patchError.message });
          }
          console.error('Teacher reminder delivery failed.', { participantId: candidate.participant_id, type, date, error: error.message });
          continue;
        }
        try {
          const sentPatch = await fetchImpl(`${base}/teacher_reminder_events?id=eq.${encodeURIComponent(claim.event_id)}`, { method: 'PATCH', headers, body: JSON.stringify({ status: 'sent', provider_message_id: provider.id || null }) });
          if (!sentPatch.ok) throw new Error(`Event update returned ${sentPatch.status}`);
          summary.sent++;
        } catch (error) {
          summary.failed++;
          console.error('Teacher reminder provider succeeded but event update failed; stale-pending recovery is required.', { participantId: candidate.participant_id, type, date, eventId: claim.event_id, error: error.message });
        }
      }
      return response.status(summary.failed ? 502 : 200).json(summary);
    } catch (error) {
      console.error('Teacher reminder job failed.', { type, date, error: error.message });
      return response.status(502).json({ error: 'Reminder job failed' });
    }
  };
}

function createSmokeTestHandler(dependencies = {}) {
  const fetchImpl = dependencies.fetch || global.fetch;
  return async function handler(request, response) {
    const emailPathTest = request.query && request.query.action === 'resend-email-test';
    const expectedMethod = emailPathTest ? 'POST' : 'GET';
    if (emailPathTest) response.setHeader('Cache-Control', 'no-store');
    if (request.method !== expectedMethod) {
      response.setHeader('Allow', expectedMethod);
      return response.status(405).json({ error: 'Method not allowed' });
    }
    if (!authorized(request.headers && request.headers.authorization, process.env.CRON_SECRET)) return response.status(401).json({ error: 'Unauthorized' });
    if (emailPathTest) {
      if (!process.env.RESEND_API_KEY || !process.env.TEST_EMAIL_RECIPIENT) {
        return response.status(503).json({ error: 'Test email configuration is incomplete' });
      }
      try {
        const send = await fetchImpl('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Mission: Reinforceable <missions@mail.missionreinforceable.com>',
            to: [process.env.TEST_EMAIL_RECIPIENT],
            subject: 'Mission: Reinforceable Email Test',
            text: 'The Resend/Vercel email connection for Mission: Reinforceable is working.'
          })
        });
        if (!send.ok) return response.status(502).json({ error: 'Test email could not be sent' });
        const provider = await send.json();
        return response.status(200).json({ success: true, message_id: provider.id || null });
      } catch {
        return response.status(502).json({ error: 'Test email could not be sent' });
      }
    }
    try {
      validateConfiguration(['RESEND_API_KEY', 'TEACHER_REMINDER_FROM_EMAIL', 'TEACHER_GAME_URL', 'TEACHER_REMINDER_TIMEZONE', 'TEACHER_REMINDER_TEST_EMAIL']);
      const email = emailFor(TYPES.DAILY, null, process.env.TEACHER_GAME_URL);
      const send = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': 'teacher-reminder-smoke-test/daily-prompt-production-v1' },
        body: JSON.stringify({ from: process.env.TEACHER_REMINDER_FROM_EMAIL, to: [process.env.TEACHER_REMINDER_TEST_EMAIL], subject: email.subject, html: email.html, text: email.text })
      });
      if (!send.ok) throw new Error(`Resend returned ${send.status}`);
      const provider = await send.json();
      return response.status(200).json({ sent: true, provider_message_id: provider.id || null });
    } catch (error) {
      console.error('Teacher reminder smoke test failed.', { error: error.message });
      return response.status(502).json({ sent: false });
    }
  };
}

module.exports = { TYPES, SUBJECTS, emailFor, studyDate, idempotencyKey, authorized, validateConfiguration, createHandler, createSmokeTestHandler };
