import assert from 'node:assert/strict';
import fs from 'node:fs';

const loginEmail=fs.readFileSync(new URL('../server/game-login-email.js',import.meta.url),'utf8');
assert.match(loginEmail,/SETUP_SUBJECT = 'Mission: Reinforceable — Set Up Your Account'/);
assert.match(loginEmail,/Creating your password does not begin Mission: Reinforceable/);
assert.match(loginEmail,/Access begins during your scheduled intervention orientation/);

const sendService=fs.readFileSync(new URL('../server/research-admin-send-game-login.js',import.meta.url),'utf8');
assert.match(sendService,/body\.action === 'send_account_setup'/);
assert.match(sendService,/Pre-launch account setup is only available before Intervention/);
assert.match(sendService,/Pre-launch account setup requires game access to remain locked/);
assert.match(sendService,/formatAccountSetupEmail/);
assert.match(sendService,/account_setup_email_attempted/);
assert.match(sendService,/account_setup_email_sent/);
assert.match(sendService,/account_setup_email_failed/);

const communication=fs.readFileSync(new URL('../api/research-admin-communication-readiness.js',import.meta.url),'utf8');
assert.match(communication,/\['send_game_login','send_account_setup'\]/);
assert.match(communication,/account_setup_email_status/);

const password=fs.readFileSync(new URL('../set-password/set-password.js',import.meta.url),'utf8');
assert.match(password,/participant && participant\.active!==true/);
assert.match(password,/ready for your Mission: Reinforceable orientation/);
assert.match(password,/Study missions will stay locked until the research team starts your intervention/);

const admin=fs.readFileSync(new URL('./admin.js',import.meta.url),'utf8');
assert.match(admin,/send-account-setup/);
assert.match(admin,/action:'send_account_setup'/);
assert.match(admin,/accountSetupEmailStatus/);

const ui=fs.readFileSync(new URL('./operations-ui.mjs',import.meta.url),'utf8');
assert.match(ui,/PRE-LAUNCH ACCOUNT SETUP/);
assert.match(ui,/does <strong>not<\/strong> activate Mission: Reinforceable or start Intervention/);
assert.match(ui,/use the reviewed preview to demonstrate the platform at the scheduled Intervention start/);

const migration=fs.readFileSync(new URL('../supabase/migrations/20261006070000_teacher_prelaunch_account_setup.sql',import.meta.url),'utf8');
for(const action of ['account_setup_email_attempted','account_setup_email_sent','account_setup_email_failed']) assert.match(migration,new RegExp(action));
assert.match(migration,/intervention_email_audit_shape/);

console.log('Teacher launch/onboarding QA safeguards passed.');
