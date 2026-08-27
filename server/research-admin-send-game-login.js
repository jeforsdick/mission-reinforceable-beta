'use strict';

const { authorize, json, methodGuard, normalizeEmail, supabaseFetch, UUID_PATTERN } = require('../api/research-admin-server');
const { configuration, formatGameLoginEmail } = require('./game-login-email');

async function rows(path) {
  const response = await supabaseFetch(path);
  const body = await response.json().catch(() => []);
  if (!response.ok) throw Object.assign(new Error('Account readiness could not be verified.'), { status: 503 });
  return body;
}
async function record(event) {
  const response = await supabaseFetch('/rest/v1/research_intervention_launch_events', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(event) });
  if (!response.ok) throw Object.assign(new Error('The email attempt could not be audited.'), { status: 503 });
}
function safeFailure(status) { return status === 429 ? 'provider_rate_limited' : status >= 500 ? 'provider_unavailable' : 'provider_rejected'; }

module.exports = async function handler(request, response) {
  if (methodGuard(request, response)) return;
  let context;
  try {
    const actor = await authorize(request), body = request.body || {}, keys = Object.keys(body).sort();
    if (keys.length !== 3 || keys[0] !== 'action' || keys[1] !== 'case_id' || keys[2] !== 'request_id' || body.action !== 'send_game_login' || !UUID_PATTERN.test(body.case_id) || !UUID_PATTERN.test(body.request_id)) return json(response, 400, { error: 'Exactly action, case_id, and request_id are required.' });
    const config = configuration();
    if (!config.enabled) return json(response, 503, { error: 'Production game-login email delivery has not been enabled.' });

    const previous = await rows(`/rest/v1/research_intervention_launch_events?attempt_id=eq.${body.request_id}&select=action,recorded_at,provider_message_id,failure_classification`);
    const sent = previous.find(event => event.action === 'game_login_email_sent');
    if (sent) return json(response, 200, { delivered: true, sent_at: sent.recorded_at, duplicate: true });
    if (previous.length) return json(response, 409, { error: 'This send attempt is already complete. Choose Resend Login Email to make a deliberate new attempt.' });

    const readyResponse = await supabaseFetch('/rest/v1/rpc/research_admin_assert_intervention_launch_ready', { method: 'POST', body: JSON.stringify({ target_case_id: body.case_id, target_actor_id: actor.id }) });
    const ready = await readyResponse.json().catch(() => null);
    if (!readyResponse.ok || !Array.isArray(ready) || ready.length !== 1) return json(response, readyResponse.status || 409, { error: ready?.message || 'Intervention launch requirements are not complete.' });
    const participantId = ready[0].participant_id, version = ready[0].protected_content_version;
    const cases = await rows(`/rest/v1/cases?id=eq.${body.case_id}&select=id,active,archived_at`);
    const participants = await rows(`/rest/v1/participants?id=eq.${participantId}&case_id=eq.${body.case_id}&select=id,auth_user_id,active`);
    if (cases.length !== 1 || cases[0].archived_at) return json(response, 409, { error: 'The case is unavailable.' });
    if (participants.length !== 1 || !cases[0].active || !participants[0].active) return json(response, 409, { error: 'Game Access must be active before sending login instructions.' });
    const participant = participants[0];
    const profiles = await rows(`/rest/v1/profiles?id=eq.${participant.auth_user_id}&select=id,email,display_name,role,active`);
    const authResponse = await supabaseFetch(`/auth/v1/admin/users/${encodeURIComponent(participant.auth_user_id)}`), authUser = await authResponse.json().catch(() => null);
    const profile = profiles[0], email = normalizeEmail(profile?.email);
    if (profiles.length !== 1 || profile.role !== 'teacher' || !profile.active || !authResponse.ok || authUser.id !== profile.id || !email || normalizeEmail(authUser.email) !== email) return json(response, 409, { error: 'The linked teacher account identity could not be verified.' });
    context = { case_id: body.case_id, participant_id: participantId, actor: actor.id, protected_content_version: version, attempt_id: body.request_id };
    await record({ ...context, action: 'game_login_email_attempted' });

    const linkResponse = await supabaseFetch('/auth/v1/admin/generate_link', { method: 'POST', body: JSON.stringify({ type: 'recovery', email, redirect_to: config.setupUrl }) });
    const link = await linkResponse.json().catch(() => null), actionLink = link?.action_link;
    if (!linkResponse.ok || !actionLink) throw Object.assign(new Error('Password setup link generation failed.'), { failure: 'auth_link_generation_failed' });
    const message = formatGameLoginEmail({ teacherName: profile.display_name, teacherEmail: email, actionLink, gameUrl: config.gameUrl });
    const resendResponse = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `game-login/${body.request_id}` }, body: JSON.stringify({ from: config.from, to: [email], ...message }) });
    const provider = await resendResponse.json().catch(() => null);
    if (!resendResponse.ok || !provider?.id) throw Object.assign(new Error('Email provider delivery failed.'), { failure: safeFailure(resendResponse.status) });
    const recordedAt = new Date().toISOString();
    await record({ ...context, action: 'game_login_email_sent', recorded_at: recordedAt, provider_message_id: provider.id });
    return json(response, 200, { delivered: true, sent_at: recordedAt });
  } catch (error) {
    if (context) try { await record({ ...context, action: 'game_login_email_failed', failure_classification: error.failure || 'internal_delivery_error' }); } catch {}
    return json(response, error.status || 502, { error: context ? 'Login email was not delivered. Game Access remains active; retry with a new deliberate send.' : (error.message || 'Request failed') });
  }
};
