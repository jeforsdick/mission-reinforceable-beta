'use strict';

const { authorize, json } = require('./research-admin-server');

module.exports = async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return json(response, 405, { error: 'Method not allowed' });
  }
  try {
    await authorize(request);
    return json(response, 200, {
      teacher_reminder_system_enabled: process.env.TEACHER_REMINDER_SYSTEM_ENABLED === 'true',
      game_login_email_enabled: false
    });
  } catch (error) {
    return json(response, error.status || 500, { error: error.message || 'Request failed' });
  }
};
