import { checklistStatuses, denverToday } from './operations-model.mjs';

const TYPES = [
  { type: 'daily', label: 'Daily', count: 10, code: 'D' },
  { type: 'wild', label: 'Mystery', count: 5, code: 'M' },
  { type: 'crisis', label: 'Crisis', count: 5, code: 'C' },
];
export const TRAJECTORIES = ['supported', 'wobbly', 'escalated'];
export const COMPONENTS = ['Prevent', 'Teach', 'Reinforce', 'Respond', 'Crisis'];
export const FUNCTIONS = [
  { value: 'attention', label: 'Attention' },
  { value: 'escape', label: 'Escape / Avoidance' },
  { value: 'tangible', label: 'Tangible / Access' },
  { value: 'automatic', label: 'Automatic / Sensory' },
  { value: 'multiple', label: 'Multiple' },
  { value: 'unclear', label: 'Unclear / Still Being Assessed' },
];
export const DECISIONS = ['The Setup', 'The Pressure', 'The Pivot', 'The Consequence', 'The Finish'];
const RATINGS = [{ key: 'A', score: 10, label: 'PLAN ALIGNED' }, { key: 'B', score: 5, label: 'WORKABLE / REFINE' }, { key: 'C', score: 0, label: 'PLAN DRIFT' }];
const ENDINGS = ['STRONG', 'MIXED', 'FRAGILE'];
const canonicalFunction = value => FUNCTIONS.find(option => option.value === value || option.label === value)?.value || value || '';

export function resetMissionAuthoringState(authoringState) {
  authoringState.authoringWorkspace = null;
  authoringState.authoringLoadError = '';
  authoringState.missionSelection = null;
  authoringState.missionDraft = null;
  authoringState.missionNav = { decision: 1, branch: 'supported' };
  authoringState.missionMessage = '';
}

export function stepId(decision, trajectory = 'supported') {
  if (decision === 1) return 'd1_start';
  return `d${decision}_${trajectory}`;
}
export function nextStepId(decision, trajectory) {
  if (decision < 1 || decision > 4 || !TRAJECTORIES.includes(trajectory)) return null;
  return stepId(decision + 1, trajectory);
}
const choice = score => ({ text: '', consequence: '', wizard: '', feedback: '', score, next: score === 10 ? 'd2_supported' : score === 5 ? 'd2_wobbly' : 'd2_escalated', meta: { bipComponent: '', mechanism: '', errorType: '', function: '' } });
const scene = decision => ({ text: '', hint: '', meta: {}, choices: Object.fromEntries(RATINGS.map(({ key, score }) => [key, { ...choice(score), next: decision === 5 ? null : undefined, ending: decision === 5 ? (score === 10 ? 'STRONG' : score === 5 ? 'MIXED' : 'FRAGILE') : undefined }])) });

export function defaultMissionId(caseCode, type, slot) {
  const clean = String(caseCode || 'CASE').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'CASE';
  const code = TYPES.find(item => item.type === type)?.code || 'D';
  return `${clean}_${code}${String(slot).padStart(2, '0')}`;
}
export function blankMission(caseCode, type, slot) {
  const steps = { d1_start: scene(1) };
  for (let decision = 2; decision <= 5; decision += 1) for (const branch of TRAJECTORIES) steps[stepId(decision, branch)] = scene(decision);
  for (let decision = 1; decision <= 4; decision += 1) {
    const ids = decision === 1 ? ['d1_start'] : TRAJECTORIES.map(branch => stepId(decision, branch));
    for (const id of ids) RATINGS.forEach(({ key }, index) => { steps[id].choices[key].next = nextStepId(decision, TRAJECTORIES[index]); delete steps[id].choices[key].ending; });
  }
  return { id: defaultMissionId(caseCode, type, slot), title: '', expectedSteps: 5, start: 'd1_start', focus: '', routine: '', functionPressure: [], bipTargets: [], authoringMeta: { centralTension: '', activeBipComponents: [] }, endings: Object.fromEntries(ENDINGS.map(key => [key, { text: '', wizard: '' }])), steps };
}
export function normalizeMission(value, caseCode, type, slot) {
  const base = blankMission(caseCode, type, slot);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return base;
  const mission = { ...base, ...structuredClone(value), authoringMeta: { ...base.authoringMeta, ...(value.authoringMeta || {}), centralTension: value.authoringMeta?.centralTension ?? value.centralTension ?? '', activeBipComponents: value.authoringMeta?.activeBipComponents ?? value.activeBipComponents ?? [] }, endings: { ...base.endings, ...(value.endings || {}) }, steps: { ...base.steps } };
  delete mission.centralTension; delete mission.activeBipComponents;
  mission.functionPressure = (value.functionPressure || []).map(canonicalFunction);
  for (const [id, template] of Object.entries(base.steps)) {
    const incoming = value.steps?.[id] || {}, incomingChoices = incoming.choices || {};
    const normalizedChoices = Object.fromEntries(RATINGS.map(({ key, score }, index) => {
      const old = Array.isArray(incomingChoices) ? incomingChoices[index] || {} : incomingChoices[key] || {};
      const meta = { ...template.choices[key].meta, ...(old.meta || {}), bipComponent: old.meta?.bipComponent ?? old.bipComponent ?? '', mechanism: old.meta?.mechanism ?? old.mechanism ?? '', errorType: old.meta?.errorType ?? old.errorType ?? '', function: canonicalFunction(old.meta?.function ?? old.function) };
      const normalized = { ...template.choices[key], ...old, feedback: old.feedback ?? old.explanation ?? '', score, meta };
      delete normalized.explanation; delete normalized.bipComponent; delete normalized.mechanism; delete normalized.errorType; delete normalized.function;
      return [key, normalized];
    }));
    mission.steps[id] = { ...template, ...incoming, text: incoming.text ?? incoming.scene ?? '', meta: { ...template.meta, ...(incoming.meta || {}) }, choices: normalizedChoices };
    delete mission.steps[id].scene;
  }
  mission.expectedSteps = 5; mission.start = 'd1_start';
  return mission;
}
export function latestDraft(workspace, type, slot) {
  return (workspace?.mission_drafts || workspace?.latest_mission_drafts || []).find(row => row.mission_type === type && Number(row.slot_number) === Number(slot));
}
export function missionFromDraft(row) { return row?.mission || row?.mission_json || row?.draft || row?.content || null; }
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const selected = (a, b) => a === b ? ' selected' : '';
const checked = value => value ? ' checked' : '';
const targetKey = target => target.target_key || target.key;
const targets = workspace => workspace?.active_fidelity_targets || workspace?.fidelity_targets || [];
const dateLabel = value => value ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value)) : '';
const isStarted = step => Boolean(step?.text || step?.hint || step?.meta?.fidelityTargetKey || Object.values(step?.choices || {}).some(item => item.text || item.consequence || item.wizard || item.feedback || Object.values(item.meta || {}).some(Boolean)));

export function renderMissionBank(workspace, selection) {
  return `<section class="mission-bank" aria-labelledby="mission-bank-title"><h2 id="mission-bank-title">MISSION BANK</h2>${TYPES.map(group => `<section class="mission-bank-group"><h3>${group.label} Missions</h3>${group.type === 'crisis' && !workspace.has_crisis_plan ? '<p class="crisis-label"><strong>Formal crisis plan not present.</strong><br>Do not author crisis procedures that are not in the approved plan. Elevated, safe scenarios may be drafted only within the Mission Authoring Standard.</p>' : ''}<div class="mission-slots">${Array.from({ length: group.count }, (_, index) => { const slot = index + 1, row = latestDraft(workspace, group.type, slot), mission = missionFromDraft(row), active = selection?.mission_type === group.type && selection?.slot_number === slot; return `<button type="button" class="mission-slot${active ? ' selected' : ''}" data-mission-type="${group.type}" data-slot-number="${slot}" aria-pressed="${active}"><strong>${group.label} ${slot}</strong>${mission?.title ? `<span>${esc(mission.title)}</span>` : ''}<small>${row ? `Draft${row.created_at ? ` · saved ${esc(dateLabel(row.created_at))}` : ''}` : 'Not started'}</small></button>`; }).join('')}</div></section>`).join('')}</section>`;
}
const textField = (label, name, value, extra = '') => `<label>${label}<input ${extra} name="${name}" value="${esc(value)}"></label>`;
const selectOptions = (values, value, empty = 'Select…') => `<option value="">${empty}</option>${values.map(item => { const option = typeof item === 'string' ? { value: item, label: item } : item; return `<option value="${esc(option.value)}"${selected(option.value, value)}>${esc(option.label)}</option>`; }).join('')}`;
function choiceCard(item, index, decision) {
  const rating = RATINGS[index];
  return `<fieldset class="choice-card" data-choice="${rating.key}"><legend><strong>${rating.score}</strong> — ${rating.label}</legend><input type="hidden" name="score" value="${rating.score}">${textField('TEACHER ACTION', 'text', item.text)}${textField('IMMEDIATE MODELED CONSEQUENCE', 'consequence', item.consequence)}${textField('WIZARD', 'wizard', item.wizard)}<label>BEHAVIORAL EXPLANATION<textarea name="feedback">${esc(item.feedback)}</textarea></label><label>BIP COMPONENT<select name="bipComponent">${selectOptions(COMPONENTS, item.meta.bipComponent)}</select></label>${textField('MECHANISM', 'mechanism', item.meta.mechanism)}${textField('ERROR TYPE', 'errorType', item.meta.errorType)}<label>FUNCTION<select name="function">${selectOptions(FUNCTIONS, item.meta.function)}</select></label>${decision < 5 ? `<label>NEXT STATE<select name="trajectory">${TRAJECTORIES.map(branch => `<option value="${branch}"${selected(nextStepId(decision, branch), item.next)}>${branch[0].toUpperCase() + branch.slice(1)}</option>`).join('')}</select></label>` : `<label>ENDING<select name="ending">${ENDINGS.map(key => `<option value="${key}"${selected(key, item.ending)}>${key[0] + key.slice(1).toLowerCase()}</option>`).join('')}</select></label>`}</fieldset>`;
}
export function renderMissionBuilder(workspace, selection, mission, nav = { decision: 1, branch: 'supported' }, message = '') {
  if (!selection || !mission) return '<section class="mission-builder-empty"><h2>Mission Builder</h2><p>Select a mission slot to begin.</p></section>';
  const group = TYPES.find(item => item.type === selection.mission_type), decision = nav.decision, id = stepId(decision, nav.branch), step = mission.steps[id], fidelity = targets(workspace);
  return `<section class="mission-builder" data-case-id="${esc(workspace.case_id || workspace.id)}"><header><div><p class="eyebrow">MISSION BUILDER</p><h2>${group.label} ${selection.slot_number}</h2></div><div class="authoring-links"><a href="../docs/MISSION_AUTHORING_STANDARD.md" target="_blank" rel="noopener">Mission Authoring Standard</a><a href="../docs/examples/FICTIONAL_CASE_AUTHORING_EXAMPLE.md" target="_blank" rel="noopener">Fictional Training Examples</a></div></header><p class="privacy-warning">Use the approved student alias and minimum-necessary plan information. Do not enter student full names, student IDs, diagnoses, parent information, medication information, or unnecessary identifying information.</p>
  <aside class="case-context"><h3>Case context</h3><dl>${workspace.study_id ? `<div><dt>Study ID</dt><dd>${esc(workspace.study_id)}</dd></div>` : ''}<div><dt>Case code</dt><dd>${esc(workspace.case_code)}</dd></div><div><dt>Student alias</dt><dd>${esc(workspace.student_alias)}</dd></div>${workspace.primary_function ? `<div><dt>Primary function</dt><dd>${esc(workspace.primary_function)}</dd></div>` : ''}</dl><strong>Active fidelity targets</strong><ul>${fidelity.map(target => `<li><code>${esc(targetKey(target))}</code> ${esc(target.description)}</li>`).join('') || '<li>None returned for this case.</li>'}</ul></aside>
  <section class="builder-section mission-setup"><h3>Mission Setup</h3><div class="builder-grid">${textField('MISSION ID', 'id', mission.id, 'pattern="[A-Za-z0-9_-]+" required')}${textField('MISSION TITLE', 'title', mission.title)}<label>MISSION TYPE<input value="${group.label}" readonly></label>${textField('ROUTINE / LOCATION', 'routine', mission.routine)}${textField('CENTRAL TENSION', 'centralTension', mission.authoringMeta.centralTension)}<label>FUNCTION PRESSURE<select name="functionPressure" multiple>${FUNCTIONS.map(option => `<option value="${option.value}"${mission.functionPressure.includes(option.value) ? ' selected' : ''}>${esc(option.label)}</option>`).join('')}</select></label><fieldset><legend>ACTIVE BIP COMPONENTS</legend>${COMPONENTS.map(value => `<label><input type="checkbox" name="activeBipComponents" value="${value}"${checked(mission.authoringMeta.activeBipComponents.includes(value))}> ${value}</label>`).join('')}</fieldset><label class="wide">MISSION AUTHORING FOCUS / DESIGN GOAL<textarea name="focus">${esc(mission.focus)}</textarea></label></div><p><small>Central tension and active BIP components are retained under <code>authoringMeta</code>; runtime mission fields remain canonical.</small></p></section>
  <section class="builder-section bip-targets"><h3>Fidelity Target Opportunities</h3><p>Select only active, approved targets expected somewhere in this mission.</p>${fidelity.map(target => `<label class="target-option"><input type="checkbox" name="bipTargets" value="${esc(targetKey(target))}"${checked(mission.bipTargets.includes(targetKey(target)))}><span><code>${esc(targetKey(target))}</code><strong>${esc(target.description)}</strong><small>${esc(target.domain)}</small></span></label>`).join('') || '<p>No active targets are available.</p>'}</section>
  <section class="builder-section decision-editor"><h3>Decisions</h3><nav class="decision-tabs">${DECISIONS.map((label, index) => { const number = index + 1, ids = number === 1 ? ['d1_start'] : TRAJECTORIES.map(branch => stepId(number, branch)), started = ids.some(key => isStarted(mission.steps[key])); return `<button type="button" data-decision="${number}" class="${decision === number ? 'selected' : ''}">Decision ${number}<small>${started ? 'Started' : 'Missing'}</small></button>`; }).join('')}</nav><h4>Decision ${decision} — ${DECISIONS[decision - 1]}</h4>${decision > 1 ? `<div class="branch-tabs">${TRAJECTORIES.map(branch => `<button type="button" data-branch="${branch}" class="${nav.branch === branch ? 'selected' : ''}">${branch[0].toUpperCase() + branch.slice(1)}</button>`).join('')}</div>` : ''}<div class="scene-editor" data-step-id="${id}"><label>SCENE<textarea name="text" rows="6">${esc(step.text)}</textarea></label><label>HINT<textarea name="hint">${esc(step.hint)}</textarea></label><label>EXACT FIDELITY TARGET<select name="fidelityTargetKey"><option value="">No exact fidelity target</option>${fidelity.map(target => `<option value="${esc(targetKey(target))}"${selected(targetKey(target), step.meta.fidelityTargetKey)}>${esc(targetKey(target))} — ${esc(target.description)}</option>`).join('')}</select></label><div class="choice-cards">${RATINGS.map(({ key }, index) => choiceCard(step.choices[key], index, decision)).join('')}</div></div></section>
  <section class="builder-section endings-editor"><h3>Mission Endings</h3><div class="ending-cards">${ENDINGS.map(key => `<fieldset data-ending="${key}"><legend>${key}</legend><label>Narrative outcome<textarea name="text">${esc(mission.endings[key]?.text)}</textarea></label><label>Wizard reaction<textarea name="wizard">${esc(mission.endings[key]?.wizard)}</textarea></label></fieldset>`).join('')}</div></section><div class="save-bar"><button id="save-mission-draft" class="primary" type="button">Save Draft</button><p id="mission-save-message" class="message" role="status">${esc(message)}</p></div></section>`;
}
function renderPublishedReview(published = {}) {
  const content = published.protected_content || {}, map = published.resource_map || {}, checklist = published.checklist || {}, orientation = checklist.intervention_orientation || {}, statuses = checklistStatuses('intervention_orientation');
  const reviews = [['resource_behavior_review', 'Behavior Review', map.behavior_reviewed], ['resource_privacy_review', 'Privacy Review', map.privacy_reviewed], ['resource_qa_preview', 'QA Preview Review', map.qa_previewed]];
  const orientationCard = `<form class="checklist-card checklist-form orientation-form" data-key="intervention_orientation"><strong class="checklist-card-label">MR intervention orientation</strong><div class="checklist-card-controls"><select name="status" aria-label="Status for MR intervention orientation">${statuses.map(status => `<option value="${status}"${selected(status, orientation.status || 'pending')}>${status.replaceAll('_', ' ')}</option>`).join('')}</select><input name="status_date" type="date" required value="${esc(orientation.status_date || denverToday())}" aria-label="MR intervention orientation status date"></div><input class="checklist-card-note" name="note" maxlength="1000" value="${esc(orientation.brief_note || '')}" aria-label="Optional note for MR intervention orientation" placeholder="Note"><button class="quiet checklist-card-save">Save orientation</button></form>`;
  return `<section class="published-game-review builder-section"><h2>Published Game Review</h2><p>This reviews the currently published protected game; it does not publish mission drafts.</p>${content.present ? `<p><strong>Protected content version ${Number(content.version) || 0}</strong></p><button id="preview-protected-game" class="primary" type="button" data-case-code="${esc(published.case_code)}">Preview Game</button><p><small>QA Preview is researcher testing only. It does not activate teacher access or count as participant study data.</small></p><div class="launch-reviews">${reviews.map(([type, label, done]) => `<button class="signoff-action ${done ? 'signed' : ''}" type="button" data-review-type="${type}" ${done ? 'disabled' : ''}><span>${label}</span><strong>${done ? 'Complete ✓' : 'Needs review'}</strong></button>`).join('')}<p id="signoff-message" class="message" aria-live="polite"></p></div>` : '<p class="needs">No published protected game is available to preview or review yet.</p>'}<h3>Teacher preparation</h3><p>Record the existing intervention orientation requirement here.</p>${orientationCard}</section>`;
}
export function renderGameCreation(workspace, selection, mission, nav, message = '', published = {}, loadError = '') {
  const authoring = workspace ? `${renderMissionBank(workspace, selection)}<section class="resource-map-placeholder"><h2>Resource Map</h2><p>Browser editor coming next.</p>${workspace.resource_draft || workspace.latest_resource_draft ? '<strong>Draft exists</strong>' : ''}</section>${renderMissionBuilder(workspace, selection, mission, nav, message)}` : `<section class="builder-section"><h2>Mission authoring workspace unavailable</h2><p class="error-message">Game authoring could not load: ${esc(loadError || 'Unknown workspace error')}. Confirm the browser-authoring migration is applied, then reload. No local-file fallback was used.</p></section>`;
  return `<section id="game-creation" class="panel browser-authoring"><div class="game-creation-heading"><div><p class="eyebrow">GAME CREATION</p><h1>Author mission drafts</h1><p>AUTHOR → SAVE DRAFT</p></div><button id="back-to-game-ready" class="quiet" type="button">Back to Game Ready</button></div>${authoring}${renderPublishedReview(published)}<p class="legacy-note">Legacy local build instructions remain available in documentation during the transition.</p></section>`;
}

export function captureMission(root, mission, nav) {
  const one = name => root.querySelector(`[name="${name}"]`);
  for (const name of ['id', 'title', 'routine', 'focus']) if (one(name)) mission[name] = one(name).value;
  mission.authoringMeta = { centralTension: one('centralTension')?.value || '', activeBipComponents: [...root.querySelectorAll('[name="activeBipComponents"]:checked')].map(input => input.value) };
  mission.functionPressure = [...root.querySelectorAll('[name="functionPressure"] option:checked')].map(option => option.value);
  mission.bipTargets = [...root.querySelectorAll('[name="bipTargets"]:checked')].map(input => input.value);
  const editor = root.querySelector('.scene-editor');
  if (editor) {
    const step = mission.steps[editor.dataset.stepId]; step.text = editor.querySelector('[name="text"]').value; step.hint = editor.querySelector('[name="hint"]').value;
    const exact = editor.querySelector('[name="fidelityTargetKey"]').value; step.meta = exact ? { ...step.meta, fidelityTargetKey: exact } : Object.fromEntries(Object.entries(step.meta || {}).filter(([key]) => key !== 'fidelityTargetKey'));
    editor.querySelectorAll('.choice-card').forEach((card, index) => { const { key, score } = RATINGS[index], item = step.choices[key]; for (const name of ['text', 'consequence', 'wizard', 'feedback']) item[name] = card.querySelector(`[name="${name}"]`).value; item.meta = Object.fromEntries(['bipComponent', 'mechanism', 'errorType', 'function'].map(name => [name, card.querySelector(`[name="${name}"]`).value])); item.score = score; if (nav.decision < 5) { item.next = nextStepId(nav.decision, card.querySelector('[name="trajectory"]').value); delete item.ending; } else { item.next = null; item.ending = card.querySelector('[name="ending"]').value; } });
  }
  root.querySelectorAll('[data-ending]').forEach(card => { mission.endings[card.dataset.ending] = { text: card.querySelector('[name="text"]').value, wizard: card.querySelector('[name="wizard"]').value }; });
  return mission;
}
