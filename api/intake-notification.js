'use strict';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DOMAIN_ORDER = ['proactive', 'teaching', 'reinforcement', 'response', 'crisis'];
const DOMAIN_LABELS = {
  proactive: 'Proactive / Prevention',
  teaching: 'Teaching',
  reinforcement: 'Reinforcement',
  response: 'Response',
  crisis: 'Crisis / Safety'
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function present(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function formatEmail(row) {
  const subject = `New Mission: Reinforceable Intake — ${row.teacher_name} / ${row.student_initials}`;
  const sections = [
    ['Request', [['Request ID', row.request_id]]],
    ['Practitioners', [
      ['Teacher name', row.teacher_name], ['Teacher email', row.teacher_email],
      ['Coach name', row.coach_name], ['Coach email', row.coach_email]
    ]],
    ['Student', [['Student initials', row.student_initials], ['Grade', row.grade_level]]],
    ['Behavior and support plan', [
      ['Target behavior', row.target_behavior], ['Behavior topography', row.behavior_topography],
      ['Primary function', row.primary_function], ['Replacement behavior', row.replacement_behavior],
      ['Desired behavior', row.desired_behavior], ['Prevention strategies', row.prevention_strategies],
      ['Teaching strategies', row.teaching_strategies], ['Reinforcement system', row.reinforcement_system],
      ['Response strategy', row.response_strategy]
    ]],
    ['Classroom and context', [
      ['Typical settings', row.typical_settings], ['Common triggers', row.common_triggers],
      ['Typical antecedents', row.typical_antecedents], ['Typical consequences', row.typical_consequences],
      ['Current staff responses', row.current_staff_responses], ['Requested scenarios', row.requested_scenarios],
      ['Additional context', row.additional_context]
    ]]
  ];

  if (row.has_crisis_plan === true) sections.push(['Crisis / safety', [['Crisis plan', row.crisis_plan]]]);

  const targets = Array.isArray(row.fidelity_targets) ? row.fidelity_targets : [];
  const targetGroups = DOMAIN_ORDER.map(domain => [domain, targets
    .filter(target => target && target.domain === domain && present(target.description))
    .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))])
    .filter(([domain, items]) => items.length && (domain !== 'crisis' || row.has_crisis_plan === true));

  const htmlSections = sections.map(([heading, fields]) => {
    const rows = fields.filter(([, value]) => present(value));
    if (!rows.length) return '';
    return `<h2>${escapeHtml(heading)}</h2><dl>${rows.map(([label, value]) => `<dt><strong>${escapeHtml(label)}</strong></dt><dd>${escapeHtml(value)}</dd>`).join('')}</dl>`;
  }).join('');
  const textSections = sections.map(([heading, fields]) => {
    const rows = fields.filter(([, value]) => present(value));
    return rows.length ? `${heading}\n${rows.map(([label, value]) => `${label}: ${value}`).join('\n')}` : '';
  }).filter(Boolean).join('\n\n');

  const htmlTargets = targetGroups.length ? `<h2>Fidelity targets</h2>${targetGroups.map(([domain, items]) => `<h3>${escapeHtml(DOMAIN_LABELS[domain])}</h3><ol>${items.map(item => `<li>${escapeHtml(item.description)}</li>`).join('')}</ol>`).join('')}` : '';
  const textTargets = targetGroups.length ? `\n\nFidelity targets\n${targetGroups.map(([domain, items]) => `${DOMAIN_LABELS[domain]}\n${items.map((item, index) => `${index + 1}. ${item.description}`).join('\n')}`).join('\n\n')}` : '';

  return { subject, html: `<!doctype html><html><body><h1>New intake request</h1>${htmlSections}${htmlTargets}</body></html>`, text: `${textSections}${textTargets}` };
}

function sendJson(response, status, body) {
  response.status(status).json(body);
}

async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return sendJson(response, 405, { error: 'Method not allowed' });
  }
  const requestId = request.body && request.body.request_id;
  if (!UUID_PATTERN.test(requestId || '') || Object.keys(request.body || {}).some(key => key !== 'request_id')) {
    return sendJson(response, 400, { error: 'Invalid request' });
  }

  const requiredEnvironment = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY', 'INTAKE_NOTIFICATION_EMAIL', 'INTAKE_NOTIFICATION_FROM_EMAIL'];
  if (requiredEnvironment.some(name => !process.env[name])) {
    console.error('Intake notification configuration is incomplete.');
    return sendJson(response, 500, { error: 'Notification unavailable' });
  }

  try {
    const queryUrl = `${process.env.SUPABASE_URL}/rest/v1/intake_requests?request_id=eq.${encodeURIComponent(requestId)}&limit=1`;
    const intakeResponse = await fetch(queryUrl, { headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    } });
    if (!intakeResponse.ok) throw new Error(`Supabase lookup returned ${intakeResponse.status}`);
    const rows = await intakeResponse.json();
    if (!Array.isArray(rows) || rows.length !== 1) return sendJson(response, 404, { error: 'Request not found' });

    const email = formatEmail(rows[0]);
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `intake-request/${requestId}`
      },
      body: JSON.stringify({
        from: process.env.INTAKE_NOTIFICATION_FROM_EMAIL,
        to: [process.env.INTAKE_NOTIFICATION_EMAIL],
        subject: email.subject,
        html: email.html,
        text: email.text
      })
    });
    if (!resendResponse.ok) throw new Error(`Resend returned ${resendResponse.status}`);
    return sendJson(response, 200, { delivered: true });
  } catch (error) {
    console.error('Intake notification delivery failed.', { requestId, error: error.message });
    return sendJson(response, 502, { error: 'Notification delivery failed' });
  }
}

module.exports = handler;
module.exports.escapeHtml = escapeHtml;
module.exports.formatEmail = formatEmail;
