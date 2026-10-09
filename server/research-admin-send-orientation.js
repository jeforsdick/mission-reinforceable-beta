'use strict';

// A separate, optional onboarding message. Sending does not create accounts,
// activate gameplay, advance study phase, or enable reminders.
const { authorize, json, methodGuard, normalizeEmail, supabaseFetch, UUID_PATTERN } = require('../api/research-admin-server');
const { configuration, formatOrientationEmail } = require('./game-login-email');

async function rows(path) {
  const result = await supabaseFetch(path);
  const data = await result.json().catch(() => null);
  if (!result.ok || !Array.isArray(data)) throw Object.assign(new Error('Orientation email prerequisites could not be checked.'), { status: 503 });
  return data;
}

module.exports = async function sendOrientation(request, response) {
  if (methodGuard(request, response)) return;
  try {
    await authorize(request);
    const body = request.body || {};
    const keys = Object.keys(body).sort();
    if (keys.length !== 3 || keys[0] !== 'action' || keys[1] !== 'case_id' || keys[2] !== 'request_id' ||
        body.action !== 'send_orientation' || !UUID_PATTERN.test(body.case_id || '') || !UUID_PATTERN.test(body.request_id || '')) {
      return json(response, 400, { error: 'Exactly action, case_id, and request_id are required.' });
    }
    const config = configuration();
    if (!config.enabled) return json(response, 503, { error: 'Mission: Reinforceable email delivery is not enabled.' });

    const cases = await rows('/rest/v1/cases?id=eq.' + encodeURIComponent(body.case_id) + '&select=id,archived_at&limit=2');
    if (cases.length !== 1 || cases[0].archived_at) return json(response, 409, { error: 'The case is unavailable.' });

    const participants = await rows('/rest/v1/participants?case_id=eq.' + encodeURIComponent(body.case_id) + '&select=id,auth_user_id,is_test&limit=2');
    if (participants.length !== 1 || !participants[0].auth_user_id) {
      return json(response, 409, { error: 'Create and link the teacher account before sending orientation.' });
    }
    const participant = participants[0];

    // A real study participant must not receive the game orientation during
    // baseline. QA participants may test the onboarding experience earlier.
    if (participant.is_test !== true) {
      const phases = await rows('/rest/v1/research_case_phase_events?case_id=eq.' + encodeURIComponent(body.case_id) +
        '&select=phase,effective_date,recorded_at,id&order=effective_date.desc,recorded_at.desc,id.desc&limit=1');
      if (phases[0]?.phase !== 'intervention') {
        return json(response, 409, { error: 'For study participants, the game orientation can only be sent during Intervention.' });
      }
    }

    const content = await rows('/rest/v1/case_game_content?case_id=eq.' + encodeURIComponent(body.case_id) + '&select=version&limit=2');
    if (content.length !== 1 || !Number.isInteger(content[0].version)) {
      return json(response, 409, { error: 'Publish the protected game before sending orientation.' });
    }
    const version = content[0].version;
    const signoffs = await rows('/rest/v1/case_protected_content_signoffs?case_id=eq.' + encodeURIComponent(body.case_id) +
      '&protected_content_version=eq.' + version + '&select=review_type');
    const approved = new Set(signoffs.map(row => row.review_type));
    if (!['resource_behavior_review', 'resource_privacy_review', 'resource_qa_preview'].every(value => approved.has(value))) {
      return json(response, 409, { error: 'Complete all three reviews for the currently published game first.' });
    }

    const profiles = await rows('/rest/v1/profiles?id=eq.' + encodeURIComponent(participant.auth_user_id) +
      '&select=id,email,display_name,role,active&limit=2');
    const profile = profiles[0];
    if (profiles.length !== 1 || profile.role !== 'teacher' || profile.active !== true || !normalizeEmail(profile.email)) {
      return json(response, 409, { error: 'The linked teacher profile is not ready.' });
    }
    const authResult = await supabaseFetch('/auth/v1/admin/users/' + encodeURIComponent(participant.auth_user_id));
    const authUser = await authResult.json().catch(() => null);
    if (!authResult.ok || authUser?.id !== profile.id || normalizeEmail(authUser.email) !== normalizeEmail(profile.email)) {
      return json(response, 409, { error: 'The linked teacher account identity could not be verified.' });
    }

    const message = formatOrientationEmail({ teacherName: profile.display_name, gameUrl: config.gameUrl });
    const resend = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json',
        'Idempotency-Key': 'teacher-orientation/' + body.request_id
      },
      body: JSON.stringify({ from: config.from, to: [normalizeEmail(profile.email)], ...message })
    });
    const provider = await resend.json().catch(() => null);
    if (!resend.ok || !provider?.id) return json(response, 502, { error: 'Resend did not accept the orientation email. Please try again.' });
    return json(response, 200, { delivered: true, sent_at: new Date().toISOString(), provider_id: provider.id });
  } catch (error) {
    return json(response, error.status || 502, { error: error.message || 'Orientation email could not be sent.' });
  }
};
