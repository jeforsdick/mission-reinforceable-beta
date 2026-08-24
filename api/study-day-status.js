'use strict';
const { recordToken } = require('../server/study-day-status-service');
module.exports = async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'method_not_allowed' });
  }
  const keys = Object.keys(request.body || {});
  if (keys.length !== 1 || keys[0] !== 'token') return response.status(400).json({ error: 'invalid', message: 'This link is invalid.' });
  try {
    const result = await recordToken(request.body.token);
    return response.status(result.status).json(result.body);
  } catch (error) {
    console.error('Study-day status recording failed.', { error: error.message });
    return response.status(503).json({ error: 'unavailable', message: "We couldn't record today's status. Please try again." });
  }
};
