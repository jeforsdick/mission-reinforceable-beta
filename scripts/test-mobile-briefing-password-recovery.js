'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const auth = readFileSync(path.join(root, 'game/js/auth.js'), 'utf8');
const css = readFileSync(path.join(root, 'game/css/styles.css'), 'utf8');
const html = readFileSync(path.join(root, 'game/index.html'), 'utf8');
const start = auth.indexOf('  function wirePasswordRecovery(');
const end = auth.indexOf('  function waitForLogin(', start);
assert.ok(start >= 0 && end > start, 'self-service reset must be implemented on Teacher Login');
const handler = auth.slice(start, end);

function loginHarness(value='teacher@example.org', result={error:null}) {
  const callbacks = {};
  const nodes = {
    '#forgot-password-toggle': {
      attributes: {},
      addEventListener(event, callback){ callbacks['toggle:' + event]=callback; },
      setAttribute(name, content){ this.attributes[name]=content; }
    },
    '#password-recovery-panel':{ hidden:true },
    '#password-recovery-send':{
      disabled:false,
      addEventListener(event, callback){ callbacks['send:' + event]=callback; }
    },
    '#password-recovery-status':{textContent:''},
    '#login-email':{
      value,
      checkValidity(){return /.+@.+\..+/.test(this.value)},
      focus(){}
    }
  };
  let sent=0, request=null;
  const sdk={auth:{resetPasswordForEmail:async(email,options)=>{
    sent++;request={email,options};
    return result;
  }}};
  const wire=vm.runInNewContext(handler+'; wirePasswordRecovery;',{
    MR:{$:selector=>nodes[selector]},
    console:{warn:()=>{}}
  });
  wire(sdk);
  return { callbacks,nodes, get sent(){return sent}, get request(){return request} };
}

test('Forgot Password is visible only to someone who opens the recovery panel',()=>{
  assert.match(html,/id="forgot-password-toggle"[^>]*type="button"/);
  assert.match(html,/id="password-recovery-panel"[^>]*hidden/);
  const h=loginHarness();
  assert.equal(h.sent,0);
  h.callbacks['toggle:click']();
  assert.equal(h.nodes['#password-recovery-panel'].hidden,false);
  assert.equal(h.nodes['#forgot-password-toggle'].attributes['aria-expanded'],'true');
});

test('Reset requires an entered email and uses existing set-password route',async()=>{
  const h=loginHarness('teacher@example.org');
  await h.callbacks['send:click']();
  assert.equal(h.sent,1);
  assert.equal(h.request.email,'teacher@example.org');
  assert.equal(h.request.options.redirectTo,'https://www.missionreinforceable.com/set-password/');
  assert.match(h.nodes['#password-recovery-status'].textContent,/If this email has an account/);
  assert.equal(h.nodes['#password-recovery-send'].disabled,false);
});

test('Invalid email blocks reset; provider failure gives actionable generic message',async()=>{
  const invalid=loginHarness('');
  await invalid.callbacks['send:click']();
  assert.equal(invalid.sent,0);
  assert.match(invalid.nodes['#password-recovery-status'].textContent,/valid account email/);
  const failure=loginHarness('teacher@example.org',{error:{message:'Rate limited'}});
  await failure.callbacks['send:click']();
  assert.match(failure.nodes['#password-recovery-status'].textContent,/try again/);
  assert.doesNotMatch(failure.nodes['#password-recovery-status'].textContent,/Rate limited/);
});

test('iPhone briefing CTA never uses overlapping absolute position',()=>{
  assert.match(css,/On narrow phones, keep briefing content/);
  const i=css.lastIndexOf('@media (max-width: 700px)');
  assert.ok(i>0);
  const mobile=css.slice(i);
  assert.match(mobile,/\.wizard-modal\s*\{\s*z-index:\s*10020/);
  assert.match(mobile,/\.wizard-modal\[data-mode="briefing"\] \.wizard-modal-bubble h2,[\s\S]*?transform:\s*none/);
  assert.match(mobile,/\.wizard-modal\[data-mode="briefing"\] \.wizard-modal-bubble > p \{[\s\S]*?overflow-y:\s*auto/);
  assert.match(mobile,/\.wizard-modal\[data-mode="briefing"\] \.wizard-modal-bubble \.green-btn \{\s*position:\s*static/);
  assert.match(html,/css\/styles\.css\?v=20261009-mobile-briefing-and-password-1/);
});
