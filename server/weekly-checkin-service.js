'use strict';
const crypto = require('node:crypto');
const TOKEN_PARAMETER = 'mr_weekly_token';
const EMAIL_SUBJECT = 'Quick Mission: Reinforceable weekly check-in';
function createRawToken() { return crypto.randomBytes(32).toString('base64url'); }
function hashToken(token) { return crypto.createHash('sha256').update(String(token), 'utf8').digest('hex'); }
function buildQualtricsUrl(rawToken, configuredUrl = process.env.WEEKLY_TEACHER_CHECKIN_QUALTRICS_URL) {
  if (!configuredUrl) return null;
  const url = new URL(configuredUrl);
  url.search = '';
  url.hash = '';
  url.searchParams.set(TOKEN_PARAMETER, rawToken);
  return url.toString();
}
function completionUrl(rawToken, origin) {
  const url = new URL('/weekly-checkin-complete/', origin);
  url.searchParams.set('token', rawToken);
  return url.toString();
}
function weeklyEmail({ teacherFirstName, checkinUrl }) {
  return { subject: EMAIL_SUBJECT, text: `Hi ${teacherFirstName},\n\nBefore you wrap up the week, please complete this quick check-in about how things went this week. It should take about 1–2 minutes.\n\nComplete Weekly Check-In: ${checkinUrl}\n\nThank you!\n\nJess` };
}
function interventionWeeks(start, end) {
  const parse = value => { const [y,m,d]=value.split('-').map(Number); return new Date(Date.UTC(y,m-1,d)); };
  const iso = date => date.toISOString().slice(0,10);
  const first=parse(start), last=parse(end); if(first>last)return [];
  const monday=new Date(first); const day=monday.getUTCDay()||7; monday.setUTCDate(monday.getUTCDate()-(day-1));
  const weeks=[];
  for(const cursor=new Date(monday);cursor<=last;cursor.setUTCDate(cursor.getUTCDate()+7)){
    const friday=new Date(cursor);friday.setUTCDate(friday.getUTCDate()+4);
    if(friday>=first) weeks.push({week_start:iso(cursor),week_end:iso(friday)});
  }
  return weeks;
}
module.exports={TOKEN_PARAMETER,EMAIL_SUBJECT,createRawToken,hashToken,buildQualtricsUrl,completionUrl,weeklyEmail,interventionWeeks};
