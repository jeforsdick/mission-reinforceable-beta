import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const Module = require('node:module');
const originalLoad = Module._load;
let sendResult;
let sendArguments;
let apiKey;

Module._load = function (request, parent, isMain) {
  if (request === 'resend') return {
    Resend: class {
      constructor(value) { apiKey = value; }
      emails = { send: async value => { sendArguments = value; return sendResult; } };
    }
  };
  return originalLoad.call(this, request, parent, isMain);
};
const handler = require('./resend-email-test.js');
Module._load = originalLoad;

function response() {
  return {
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; }
  };
}
function request(method = 'POST', token = 'test-secret') {
  return { method, headers: { authorization: `Bearer ${token}` } };
}

test.beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret';
  process.env.RESEND_API_KEY = 'resend-secret';
  process.env.TEST_EMAIL_RECIPIENT = 'recipient@example.com';
  sendResult = { data: { id: 'email-id' }, error: null };
  sendArguments = undefined;
  apiKey = undefined;
});
test.after(() => {
  delete process.env.CRON_SECRET;
  delete process.env.RESEND_API_KEY;
  delete process.env.TEST_EMAIL_RECIPIENT;
});

test('requires POST and the existing server-side cron secret', async () => {
  let result = response();
  await handler(request('GET'), result);
  assert.equal(result.statusCode, 405);
  assert.equal(result.headers.Allow, 'POST');
  result = response();
  await handler(request('POST', 'wrong'), result);
  assert.equal(result.statusCode, 401);
  assert.equal(sendArguments, undefined);
});

test('sends the configured test message and returns the Resend id', async () => {
  const result = response();
  await handler(request(), result);
  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body, { success: true, message_id: 'email-id' });
  assert.equal(apiKey, 'resend-secret');
  assert.deepEqual(sendArguments, {
    from: handler.FROM,
    to: ['recipient@example.com'],
    subject: handler.SUBJECT,
    text: 'The Resend/Vercel email connection for Mission: Reinforceable is working.'
  });
});

test('returns safe configuration and provider errors', async () => {
  delete process.env.TEST_EMAIL_RECIPIENT;
  let result = response();
  await handler(request(), result);
  assert.equal(result.statusCode, 503);
  assert.deepEqual(result.body, { error: 'Test email configuration is incomplete' });
  process.env.TEST_EMAIL_RECIPIENT = 'recipient@example.com';
  sendResult = { data: null, error: { message: 'provider details', key: 'resend-secret' } };
  result = response();
  await handler(request(), result);
  assert.equal(result.statusCode, 502);
  assert.deepEqual(result.body, { error: 'Test email could not be sent' });
  assert.doesNotMatch(JSON.stringify(result.body), /provider details|resend-secret/);
});
