'use strict';

const weeklyCheckin = require('../server/weekly-checkin-service');
const { denverDate } = require('../server/weekly-recap-service');

module.exports = async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }
  return response.status(200).json({ enabled: false, study_date: denverDate(new Date()), qualtrics_configured: weeklyCheckin.qualtricsConfiguration().configured });
};
