'use strict';

const { createHandler, TYPES } = require('../server/teacher-reminder-service');
const weeklyRecap = require('../server/weekly-recap-delivery');

const dailyRetry = createHandler(TYPES.DAILY, { retry: true });

module.exports = async function handler(request, response) {
  if (request.headers?.['x-vercel-cron-schedule'] === '0 23 * * 5') {
    return weeklyRecap(request, response);
  }
  return dailyRetry(request, response);
};
