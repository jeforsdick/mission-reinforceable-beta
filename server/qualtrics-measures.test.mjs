import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { MEASURES, measureConfiguration, participantCodedUrl } = require('./qualtrics-measures');

const valid = 'https://educationutah.co1.qualtrics.com/jfe/form/SV_example';

test('every external measure configuration fails closed', () => {
  assert.deepEqual(Object.keys(MEASURES), ['tses_pre','weekly_teacher_report','tses_post','urp_ir','teacher_interview']);
  for (const value of [undefined, 'not a URL', 'http://x.qualtrics.com/jfe/form/SV_x', 'https://x.example.com/jfe/form/SV_x', 'https://user:pass@x.qualtrics.com/jfe/form/SV_x', 'https://x.qualtrics.com/not-a-survey']) {
    const environment = Object.fromEntries(Object.values(MEASURES).map(({ env }) => [env, value]));
    for (const result of Object.values(measureConfiguration('MR-001', environment))) assert.equal(result.configured, false, String(value));
  }
});

test('valid measure URLs are configured while only teacher measures receive authoritative code', () => {
  const environment = Object.fromEntries(Object.values(MEASURES).map(({ env }) => [env, valid]));
  const result = measureConfiguration('MR-001', environment);
  for (const key of Object.keys(MEASURES)) assert.equal(result[key].configured, true, key);
  for (const key of ['tses_pre','tses_post','urp_ir']) {
    const url = new URL(result[key].url);
    assert.deepEqual([...url.searchParams.keys()], ['participant_code']);
    assert.equal(url.searchParams.get('participant_code'), 'MR-001');
    for (const forbidden of ['teacher','student','case_id','diagnosis','target_behavior','routine','note']) assert.doesNotMatch(url.href, new RegExp(forbidden, 'i'));
  }
  assert.equal(new URL(result.teacher_interview.url).searchParams.has('participant_code'), false);
  assert.equal('url' in result.weekly_teacher_report, false, 'weekly configuration cannot bypass opaque-token generation');
});

test('participant code is URL encoded by the URL API', () => {
  const url = participantCodedUrl(valid, 'MR 001/+');
  assert.match(url, /participant_code=MR\+001%2F%2B/);
  assert.equal(new URL(url).searchParams.get('participant_code'), 'MR 001/+');
});
