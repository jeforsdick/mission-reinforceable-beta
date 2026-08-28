import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { completeWeeklyCheckin } from './completion.js';

const token = 'A'.repeat(43);
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const source = fs.readFileSync(new URL('./completion.js', import.meta.url), 'utf8');

test('completion page starts neutral inside the public site shell', () => {
  assert.match(html, /class="site-shell completion-page"/);
  assert.match(html, /class="site-header"/);
  assert.match(html, /Finishing your weekly check-in/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /src="\/assets\/site\/site-nav\.js"/);
  assert.match(html, /class="site-footer"/);
  assert.doesNotMatch(html, />Weekly Check-In Complete<\/h1>/);
});

test('completion posts only the weekly type and raw token', async () => {
  let request;
  await completeWeeklyCheckin({
    token,
    fetchImpl: async (...args) => { request = args; return { ok: true, status: 200 }; },
  });
  assert.equal(request[0], '/api/study-day-status');
  assert.equal(request[1].method, 'POST');
  assert.deepEqual(JSON.parse(request[1].body), { type: 'weekly_checkin', token });
});

test('success UI state occurs only after a successful POST and does not redirect', async () => {
  const states = [];
  await completeWeeklyCheckin({ token, fetchImpl: async () => ({ ok: true, status: 200 }), onState: value => states.push(value) });
  assert.deepEqual(states, ['finishing', 'success']);
  assert.match(source, /Weekly Check-In Complete/);
  assert.match(source, /Thanks! Your weekly Mission: Reinforceable check-in has been recorded\./);
  assert.doesNotMatch(source, /location\.(?:assign|replace|href)\s*=?.*\/game\//);
});

test('invalid or expired completion never enters success state', async () => {
  for (const status of [400, 404, 410]) {
    const states = [];
    await completeWeeklyCheckin({ token, fetchImpl: async () => ({ ok: false, status }), onState: value => states.push(value) });
    assert.deepEqual(states, ['finishing', 'invalid']);
    assert.ok(!states.includes('success'));
  }
});

test('failed POST exposes retry state and the Retry button runs the same request again', async () => {
  const states = [];
  await completeWeeklyCheckin({ token, fetchImpl: async () => { throw new Error('offline'); }, onState: value => states.push(value) });
  assert.deepEqual(states, ['finishing', 'retry']);
  assert.match(html, /id="completion-retry"[^>]*>Retry<\/button>/);
  assert.match(source, /retry\.hidden = state !== 'retry'/);
  assert.match(source, /retry\.addEventListener\('click', run\)/);
});

test('the raw token is removed from the visible URL after the completion attempt', () => {
  assert.match(source, /run\(\)\.finally\(\(\) => history\.replaceState\(\{\}, '', location\.pathname\)\)/);
});
