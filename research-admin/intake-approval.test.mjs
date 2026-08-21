import assert from 'node:assert/strict';
import fs from 'node:fs';

const js = fs.readFileSync(new URL('admin.js', import.meta.url), 'utf8');
const setStatus = js.slice(js.indexOf('async function setStatus'), js.indexOf('async function loadIntakes'));
const approval = setStatus.slice(setStatus.indexOf("if (status === 'approved')"), setStatus.indexOf('state.selected.status = status'));

// Approval updates only the intake status, then refreshes the authoritative row and
// reopens the same intake workspace rather than navigating through the home screen.
assert.match(setStatus, /research_admin_set_intake_status'[\s\S]*target_request_id: requestId, target_status: status/);
assert.match(setStatus, /status === 'approved'/);
assert.match(approval, /await loadIntakes\(\)/);
assert.match(approval, /state\.intakeDecisionMessage = 'Intake approved\.'/);
assert.match(approval, /await openDetail\(requestId, 'intake'\)/);
assert.doesNotMatch(approval, /renderHome\(/);

// The refreshed approved detail makes the next manual setup step and result clear.
assert.match(js, /Current status: <strong>\$\{escapeHtml\(row\.status\)\}<\/strong>/);
assert.match(js, /row\.status !== 'approved'[\s\S]*<h2>Set Up Study Case<\/h2>/);
assert.match(js, /id="action-message" class="success-message" role="status">\$\{escapeHtml\(state\.intakeDecisionMessage \|\| ''\)\}/);

// Decline keeps its existing home navigation, while approval itself performs no
// provisioning or account, content, participant, game, or reminder creation.
assert.match(setStatus, /state\.selected\.status = status;\s*renderHome\(\)/);
for (const operation of [
  'provision_intake_case', 'create_teacher', 'create_coach', 'create_account',
  'create_case', 'create_participant', 'case_game_content', 'game_content', 'reminder'
]) assert.doesNotMatch(approval, new RegExp(operation, 'i'));

console.log('Research Admin intake approval refresh and navigation checks passed.');
