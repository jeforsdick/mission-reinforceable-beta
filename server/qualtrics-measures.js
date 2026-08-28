'use strict';

const { qualtricsConfiguration } = require('./weekly-checkin-service');

const MEASURES = Object.freeze({
  tses_pre: { env: 'TSES_PRE_QUALTRICS_URL', coded: true },
  weekly_teacher_report: { env: 'WEEKLY_TEACHER_CHECKIN_QUALTRICS_URL', weekly: true },
  tses_post: { env: 'TSES_POST_QUALTRICS_URL', coded: true },
  urp_ir: { env: 'URP_IR_QUALTRICS_URL', coded: true },
  teacher_interview: { env: 'TEACHER_INTERVIEW_QUALTRICS_URL', coded: false }
});

function participantCodedUrl(configuredUrl, participantCode) {
  const config = qualtricsConfiguration(configuredUrl);
  if (!config.configured || !participantCode) return null;
  const url = new URL(config.url);
  url.search = '';
  url.hash = '';
  url.searchParams.set('participant_code', participantCode);
  return url.toString();
}

function measureConfiguration(participantCode, environment = process.env) {
  return Object.fromEntries(Object.entries(MEASURES).map(([key, definition]) => {
    const config = qualtricsConfiguration(environment[definition.env]);
    if (!config.configured) return [key, { configured: false }];
    if (definition.weekly) return [key, { configured: true }];
    if (!participantCode) return [key, { configured: true }];
    const url = definition.coded ? participantCodedUrl(environment[definition.env], participantCode) : new URL(config.url).toString();
    return [key, url ? { configured: true, url } : { configured: false }];
  }));
}

module.exports = { MEASURES, measureConfiguration, participantCodedUrl };
