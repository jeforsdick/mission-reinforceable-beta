'use strict';

const { authorize, json, methodGuard, normalizeEmail, supabaseFetch, UUID_PATTERN } = require('../api/research-admin-server');
const { configuration, formatAccountSetupEmail, formatGameLoginEmail } = require('./game-login-email');
const { passwordSetupLandingLink } = require('./password-setup-link');

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
  let mode = 'login';
  try {
    const actor = await authorize(request), body = request.body || {}, keys = Object.keys(body).sort();
    const validAction = body.action === 'send_game_login' || body.action === 'send_account_setup';
    if (keys.length !== 3 || keys[0] !== 'action' || keys[1] !== 'case_id' || keys[2] !== 'request_id' || !validAction || !UUID_PATTERN.test(body.case_id) || !UUID_PATTERN.test(body.request_id)) {
      return json(response, 400, { error: 'Exactly action, case_id, and request_id are required.' });
    }
    mode = body.action === 'send_account_setup' ? 'setup' : 'login';
    const config = configuration();
    if (!config.enabled) return json(response, 503, { error: 'Teacher account email delivery has not been enabled.' });

    const attemptedAction = mode === 'setup' ? 'account_setup_email_attempted' : 'game_login_email_attempted';
    const sentAction = mode === 'setup' ? 'account_setup_email_sent' : 'game_login_email_sent';
    const failedAction = mode === 'setup' ? 'account_setup_email_failed' : 'game_login_email_failed';

    const previous = await rows(`/rest/v1/research_intervention_launch_events?attempt_id=eq.${body.request_id}&select=action,recorded_at,provider_message_id,failure_classification`);
    const sent = previous.find(event => event.action === sentAction);
    if (sent) return json(response, 200, { delivered: true, sent_at: sent.recorded_at, duplicate: true, mode });
    if (previous.length) return json(response, 409, { error: 'This send attempt is already complete. Use a new deliberate send attempt.' });

    const participantRows = await rows(`/rest/v1/participants?case_id=eq.${encodeURIComponent(body.case_id)}&select=id,auth_user_id,active,is_test&limit=2`);
    if (participantRows.length !== 1) return json(response, 409, { error: 'Exactly one participant must be linked to this case.' });
    const participant = participantRows[0];
    if (!participant.auth_user_id) return json(response, 409, { error: 'Create the teacher account before sending account setup.' });

    const cases = await rows(`/rest/v1/cases?id=eq.${encodeURIComponent(body.case_id)}&select=id,active,archived_at&limit=1`);
    if (cases.length !== 1 || cases[0].archived_at) return json(response, 409, { error: 'The case is unavailable.' });

    let version = null;
    if (mode === 'login') {
      const readyResponse = await supabaseFetch('/rest/v1/rpc/research_admin_assert_intervention_launch_ready', {
        method: 'POST',
        body: JSON.stringify({ target_case_id: body.case_id, target_actor_id: actor.id })
      });
      const ready = await readyResponse.json().catch(() => null);
      if (!readyResponse.ok || !Array.isArray(ready) || ready.length !== 1) {
        return json(response, readyResponse.status || 409, { error: ready?.message || 'Intervention launch requirements are not complete.' });
      }
      version = ready[0].protected_content_version;
      if (!cases[0].active || !participant.active) return json(response, 409, { error: 'Game Access must be active before sending login instructions.' });
    } else {
      const phaseRows = await rows(`/rest/v1/research_case_phase_events?case_id=eq.${encodeURIComponent(body.case_id)}&select=phase,effective_date,recorded_at,id&order=effective_date.desc,recorded_at.desc,id.desc&limit=1`);
      const phase = phaseRows[0]?.phase || 'prebaseline';
      if (phase === 'intervention' || phase === 'maintenance' || phase === 'complete') {
        return json(response, 409, { error: 'Pre-launch account setup is only available before Intervention.' });
      }
      if (cases[0].active || participant.active) {
        return json(response, 409, { error: 'Pre-launch account setup requires game access to remain locked.' });
      }
    }

    const profiles = await rows(`/rest/v1/profiles?id=eq.${participant.auth_user_id}&select=id,email,display_name,role,active`);
    const authResponse = await supabaseFetch(`/auth/v1/admin/users/${encodeURIComponent(participant.auth_user_id)}`);
    const authUser = await authResponse.json().catch(() => null);
    const profile = profiles[0], email = normalizeEmail(profile?.email);
    if (profiles.length !== 1 || profile.role !== 'teacher' || !profile.active || !authResponse.ok || authUser.id !== profile.id || !email || normalizeEmail(authUser.email) !== email) {
      return json(response, 409, { error: 'The linked teacher account identity could not be verified.' });
    }

    context = {
      case_id: body.case_id,
      participant_id: participant.id,
      actor: actor.id,
      protected_content_version: version,
      attempt_id: body.request_id
    };
    await record({ ...context, action: attemptedAction });

    const linkResponse = await supabaseFetch('/auth/v1/admin/generate_link', {
      method: 'POST',
      body: JSON.stringify({ type: 'recovery', email, redirect_to: config.setupUrl })
    });
    const link = await linkResponse.json().catch(() => null);
    if (!linkResponse.ok || !link?.action_link) throw Object.assign(new Error('Password setup link generation failed.'), { failure: 'auth_link_generation_failed' });
    const actionLink = passwordSetupLandingLink(link, config.setupUrl, process.env.SUPABASE_URL);

    const message = mode === 'setup'
      ? formatAccountSetupEmail({ teacherName: profile.display_name, teacherEmail: email, actionLink })
      : formatGameLoginEmail({ teacherName: profile.display_name, teacherEmail: email, actionLink, gameUrl: config.gameUrl });

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `${mode === 'setup' ? 'account-setup' : 'game-login'}/${body.request_id}`
      },
      body: JSON.stringify({ from: config.from, to: [email], ...message })
    });
    const provider = await resendResponse.json().catch(() => null);
    if (!resendResponse.ok || !provider?.id) throw Object.assign(new Error('Email provider delivery failed.'), { failure: safeFailure(resendResponse.status) });

    const recordedAt = new Date().toISOString();
    await record({ ...context, action: sentAction, recorded_at: recordedAt, provider_message_id: provider.id });
    return json(response, 200, { delivered: true, sent_at: recordedAt, mode });
  } catch (error) {
    if (context) {
      const failedAction = mode === 'setup' ? 'account_setup_email_failed' : 'game_login_email_failed';
      try { await record({ ...context, action: failedAction, failure_classification: error.failure || 'internal_delivery_error' }); } catch {}
    }
    const fallback = mode === 'setup'
      ? 'Account setup email was not delivered. Study access remains locked; retry with a new deliberate send.'
      : 'Login email was not delivered. Game Access remains active; retry with a new deliberate send.';
    return json(response, error.status || 502, { error: context ? fallback : (error.message || 'Request failed') });
  }
};
