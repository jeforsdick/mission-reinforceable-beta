'use strict';
const { recordToken } = require('../server/study-day-status-service');
const { hashToken } = require('../server/weekly-checkin-service');
const server = require('./research-admin-server');
module.exports = async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'method_not_allowed' });
  }
  const keys = Object.keys(request.body || {});
  if (request.body?.type === 'weekly_checkin') {
    if (keys.length !== 2 || !keys.includes('token') || !/^[A-Za-z0-9_-]{40,100}$/.test(request.body.token || '')) return response.status(400).json({ error: 'invalid', message: 'This completion link is invalid.' });
    try {
      const result = await server.supabaseFetch('/rest/v1/rpc/complete_weekly_checkin', { method: 'POST', body: JSON.stringify({ submitted_token_hash: hashToken(request.body.token) }) });
      if (!result.ok) {
        let failure = {}; try { failure = await result.json(); } catch {}
        const invalid = result.status === 404 || failure.code === 'P0002';
        return response.status(invalid ? 404 : 503).json({ error: invalid ? 'invalid' : 'unavailable' });
      }
      return response.status(200).json({ complete: true });
    } catch (error) { console.error('Weekly check-in completion failed.', { error: error.message }); return response.status(503).json({ error: 'unavailable' }); }
  }
  if (keys.length !== 1 || keys[0] !== 'token') return response.status(400).json({ error: 'invalid', message: 'This link is invalid.' });
  try {
    const result = await recordToken(request.body.token);
    return response.status(result.status).json(result.body);
  } catch (error) {
    console.error('Study-day status recording failed.', { error: error.message });
    return response.status(503).json({ error: 'unavailable', message: "We couldn't record today's status. Please try again." });
  }
};
