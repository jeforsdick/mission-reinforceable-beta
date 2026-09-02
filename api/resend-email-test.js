'use strict';

const { Resend } = require('resend');

const FROM = 'Mission: Reinforceable <missions@mail.missionreinforceable.com>';
const SUBJECT = 'Mission: Reinforceable Email Test';

module.exports = async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.CRON_SECRET || request.headers?.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return response.status(401).json({ error: 'Unauthorized' });
  }
  if (!process.env.RESEND_API_KEY || !process.env.TEST_EMAIL_RECIPIENT) {
    return response.status(503).json({ error: 'Test email configuration is incomplete' });
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [process.env.TEST_EMAIL_RECIPIENT],
      subject: SUBJECT,
      text: 'The Resend/Vercel email connection for Mission: Reinforceable is working.'
    });
    if (error) return response.status(502).json({ error: 'Test email could not be sent' });
    return response.status(200).json({ success: true, message_id: data?.id || null });
  } catch {
    return response.status(502).json({ error: 'Test email could not be sent' });
  }
};

module.exports.FROM = FROM;
module.exports.SUBJECT = SUBJECT;
