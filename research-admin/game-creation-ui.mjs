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
export const ERROR_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'missed_prevention_opportunity', label: 'Missed prevention opportunity' },
  { value: 'missed_teaching_opportunity', label: 'Missed teaching opportunity' },
  { value: 'missed_reinforcement_opportunity', label: 'Missed reinforcement opportunity' },
  { value: 'missed_active_ingredient', label: 'Missed active ingredient' },
  { value: 'timing_or_delay', label: 'Timing / delay' },
  { value: 'contingency_mismatch', label: 'Contingency mismatch' },
  { value: 'function_mismatch', label: 'Function mismatch' },
  { value: 'reinforces_target_pattern', label: 'Reinforces target pattern' },
  { value: 'vague_or_nonspecific_response', label: 'Vague / non-specific response' },
  { value: 'public_or_attention_heavy_correction', label: 'Public / attention-heavy correction' },
  { value: 'other_needs_review', label: 'Other / needs review' },
];
export const DECISIONS = ['The Setup', 'The Pressure', 'The Pivot', 'The Consequence', 'The Finish'];
export const RESOURCE_SECTIONS = {
  bip: ['BIP at a Glance', 'Give the teacher the shortest useful overview of the plan.'],
  functionForest: ['Function Forest', 'Explain what the behavior is likely accomplishing and the important context.'],
  prevention: ['Prevention Palace', 'Describe what to do before predictable challenges.'],
  replacement: ['Replacement Reservoir', 'Describe the replacement behaviors the teacher should prompt and teach.'],
  reinforcement: ['Reinforcement Ridge', 'Describe what to reinforce, how, and when.'],
  errorCorrection: ['Error Correction Canyon', 'Describe the plan-aligned response when problem behavior occurs.'],
  library: ['BSP Library', 'Give the teacher quick-reference plan steps or reminders.'],
  coaching: ['Coaching Cottage', 'Add practical coaching tips, common barriers, or implementation reminders.'],
  fidelity: ['Fidelity Fortress', 'Summarize the observable teacher actions that matter for plan fidelity.']
};
const RESOURCE_BLOCK_TYPES = new Set(['paragraph', 'list', 'definitionList', 'callout']);
const RATINGS = [{ key: 'A', score: 10, label: 'PLAN ALIGNED' }, { key: 'B', score: 5, label: 'WORKABLE / REFINE' }, { key: 'C', score: 0, label: 'PLAN DRIFT' }];
const ENDINGS = ['STRONG', 'MIXED', 'FRAGILE'];
const canonicalFunction = value => FUNCTIONS.find(option => option.value === value || option.label === value)?.value || value || '';
const LEGACY_ERROR_TYPES = {
  'missed active ingredient': 'missed_active_ingredient',
  'missed prevention opportunity': 'missed_prevention_opportunity',
  'missed teaching opportunity': 'missed_teaching_opportunity',
  'missed reinforcement opportunity': 'missed_reinforcement_opportunity',
  'delayed reinforcement': 'timing_or_delay',
  'reinforcement delayed': 'timing_or_delay',
  'reinforces target pattern': 'reinforces_target_pattern',
};
export function canonicalErrorType(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (ERROR_TYPES.some(option => option.value === raw)) return raw;
  return LEGACY_ERROR_TYPES[raw.toLowerCase()] || raw;
}

export function resetMissionAuthoringState(authoringState) {
  authoringState.authoringWorkspace = null;
  authoringState.authoringLoadError = '';
  authoringState.missionSelection = null;
  authoringState.missionDraft = null;
  authoringState.missionNav = { decision: 1, branch: 'supported' };
  authoringState.missionMessage = '';
  authoringState.setupDraft = null;
  authoringState.resourceDraft = null;
  authoringState.setupMessage = '';
  authoringState.resourceMessage = '';
}

export function setupFromWorkspace(workspace) {
  const setup = workspace?.setup_draft?.setup || workspace?.latest_setup_draft?.setup || {};
  return { schemaVersion: 1, bipBriefing: typeof setup.bipBriefing === 'string' ? setup.bipBriefing : '' };
}
export function normalizeResourceMap(value) {
  const source = value?.sections && typeof value.sections === 'object' ? value.sections : {};
  return { schemaVersion: 1, sections: Object.fromEntries(Object.entries(RESOURCE_SECTIONS).map(([key, [title]]) => {
    const incoming = source[key];
    const blocks = Array.isArray(incoming?.blocks) ? structuredClone(incoming.blocks) : [];
    return [key, { title, blocks }];
  })) };
}
export function resourcesFromWorkspace(workspace) {
  return normalizeResourceMap(workspace?.resource_draft?.resources || workspace?.latest_resource_draft?.resources);
}
export function hasUnsupportedResourceBlocks(resources) {
  return Object.values(resources?.sections || {}).some(section => (section.blocks || []).some(block => !block || typeof block !== 'object' || !RESOURCE_BLOCK_TYPES.has(block.type)));
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
      const meta = { ...template.choices[key].meta, ...(old.meta || {}), bipComponent: old.meta?.bipComponent ?? old.bipComponent ?? '', mechanism: old.meta?.mechanism ?? old.mechanism ?? '', errorType: canonicalErrorType(old.meta?.errorType ?? old.errorType), function: canonicalFunction(old.meta?.function ?? old.function) };
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
  const knownError = !item.meta.errorType || ERROR_TYPES.some(option => option.value === item.meta.errorType);
  const errors = knownError ? ERROR_TYPES : [{ value: item.meta.errorType, label: `Existing specific value: ${item.meta.errorType}` }, ...ERROR_TYPES];
  return `<fieldset class="choice-card" data-choice="${rating.key}"><legend><strong>${rating.score}</strong> — ${rating.label}</legend><input type="hidden" name="score" value="${rating.score}">${textField('TEACHER ACTION', 'text', item.text)}${textField('WHAT HAPPENS NEXT?', 'consequence', item.consequence)}${textField('WIZARD', 'wizard', item.wizard)}<label>BEHAVIORAL EXPLANATION<textarea name="feedback">${esc(item.feedback)}</textarea></label><label>BIP COMPONENT<select name="bipComponent">${selectOptions(COMPONENTS, item.meta.bipComponent)}</select></label>${textField('MECHANISM', 'mechanism', item.meta.mechanism)}<label>ERROR TYPE<select name="errorType">${selectOptions(errors, item.meta.errorType, 'No Error Type selected')}</select></label><label>FUNCTION<select name="function">${selectOptions(FUNCTIONS, item.meta.function)}</select></label>${decision < 5 ? `<label>NEXT STATE<select name="trajectory">${TRAJECTORIES.map(branch => `<option value="${branch}"${selected(nextStepId(decision, branch), item.next)}>${branch[0].toUpperCase() + branch.slice(1)}</option>`).join('')}</select></label>` : `<label>ENDING<select name="ending">${ENDINGS.map(key => `<option value="${key}"${selected(key, item.ending)}>${key[0] + key.slice(1).toLowerCase()}</option>`).join('')}</select></label>`}</fieldset>`;
}
export function draftPreviewUrl(caseCode, type, slot) {
  const params = new URLSearchParams({ qa_case: caseCode, qa_draft_type: type, qa_draft_slot: String(slot) });
  return `../game/?${params}`;
}
export function renderMissionBuilder(workspace, selection, mission, nav = { decision: 1, branch: 'supported' }, message = '') {
  if (!selection || !mission) return '<section class="mission-builder-empty"><h2>Mission Builder</h2><p>Select a mission slot to begin.</p></section>';
  const group = TYPES.find(item => item.type === selection.mission_type), decision = nav.decision, id = stepId(decision, nav.branch), step = mission.steps[id], fidelity = targets(workspace), saved = Boolean(latestDraft(workspace, selection.mission_type, selection.slot_number));
  return `<section class="mission-builder" data-case-id="${esc(workspace.case_id || workspace.id)}"><header><div><p class="eyebrow">EDITING MISSION</p><h2>${group.label} ${selection.slot_number}</h2></div><div class="authoring-links"><a href="../docs/MISSION_AUTHORING_STANDARD.md" target="_blank" rel="noopener">Mission Authoring Standard</a><a href="../docs/examples/FICTIONAL_CASE_AUTHORING_EXAMPLE.md" target="_blank" rel="noopener">Fictional Training Examples</a></div></header><p class="privacy-warning">Use the approved student alias and minimum-necessary plan information. Do not enter student full names, student IDs, diagnoses, parent information, medication information, or unnecessary identifying information.</p>
  <aside class="case-context"><h3>Case context</h3><dl>${workspace.study_id ? `<div><dt>Study ID</dt><dd>${esc(workspace.study_id)}</dd></div>` : ''}<div><dt>Case code</dt><dd>${esc(workspace.case_code)}</dd></div><div><dt>Student alias</dt><dd>${esc(workspace.student_alias)}</dd></div>${workspace.primary_function ? `<div><dt>Primary function</dt><dd>${esc(workspace.primary_function)}</dd></div>` : ''}</dl><strong>Active fidelity targets</strong><ul>${fidelity.map(target => `<li><code>${esc(targetKey(target))}</code> ${esc(target.description)}</li>`).join('') || '<li>None returned for this case.</li>'}</ul></aside>
  <section class="builder-section mission-setup"><h3>Mission Setup</h3><div class="builder-grid">${textField('MISSION ID', 'id', mission.id, 'pattern="[A-Za-z0-9_-]+" required')}${textField('MISSION TITLE', 'title', mission.title)}<label>MISSION TYPE<input value="${group.label}" readonly></label>${textField('ROUTINE / LOCATION', 'routine', mission.routine)}${textField('CENTRAL TENSION', 'centralTension', mission.authoringMeta.centralTension)}<label>FUNCTION PRESSURE<select name="functionPressure" multiple>${FUNCTIONS.map(option => `<option value="${option.value}"${mission.functionPressure.includes(option.value) ? ' selected' : ''}>${esc(option.label)}</option>`).join('')}</select></label><fieldset><legend>ACTIVE BIP COMPONENTS</legend>${COMPONENTS.map(value => `<label><input type="checkbox" name="activeBipComponents" value="${value}"${checked(mission.authoringMeta.activeBipComponents.includes(value))}> ${value}</label>`).join('')}</fieldset><label class="wide">MISSION AUTHORING FOCUS / DESIGN GOAL<textarea name="focus">${esc(mission.focus)}</textarea></label></div><p><small>Central tension and active BIP components are retained under <code>authoringMeta</code>; runtime mission fields remain canonical.</small></p></section>
  <section class="builder-section bip-targets"><h3>Fidelity Target Opportunities</h3><p>Select only active, approved targets expected somewhere in this mission.</p>${fidelity.map(target => `<label class="target-option"><input type="checkbox" name="bipTargets" value="${esc(targetKey(target))}"${checked(mission.bipTargets.includes(targetKey(target)))}><span><code>${esc(targetKey(target))}</code><strong>${esc(target.description)}</strong><small>${esc(target.domain)}</small></span></label>`).join('') || '<p>No active targets are available.</p>'}</section>
  <section class="builder-section decision-editor"><h3>Decisions</h3><nav class="decision-tabs">${DECISIONS.map((label, index) => { const number = index + 1, ids = number === 1 ? ['d1_start'] : TRAJECTORIES.map(branch => stepId(number, branch)), started = ids.some(key => isStarted(mission.steps[key])); return `<button type="button" data-decision="${number}" class="${decision === number ? 'selected' : ''}">Decision ${number}<small>${started ? 'Started' : 'Missing'}</small></button>`; }).join('')}</nav><h4>Decision ${decision} — ${DECISIONS[decision - 1]}</h4>${decision > 1 ? `<div class="branch-tabs">${TRAJECTORIES.map(branch => `<button type="button" data-branch="${branch}" class="${nav.branch === branch ? 'selected' : ''}">${branch[0].toUpperCase() + branch.slice(1)}</button>`).join('')}</div>` : ''}<div class="scene-editor" data-step-id="${id}"><label>SCENE<textarea name="text" rows="6">${esc(step.text)}</textarea></label><label>HINT<textarea name="hint">${esc(step.hint)}</textarea></label><label>EXACT FIDELITY TARGET<select name="fidelityTargetKey"><option value="">No exact fidelity target</option>${fidelity.map(target => `<option value="${esc(targetKey(target))}"${selected(targetKey(target), step.meta.fidelityTargetKey)}>${esc(targetKey(target))} — ${esc(target.description)}</option>`).join('')}</select></label><div class="choice-cards">${RATINGS.map(({ key }, index) => choiceCard(step.choices[key], index, decision)).join('')}</div></div></section>
  <section class="builder-section endings-editor"><h3>Mission Endings</h3><div class="ending-cards">${ENDINGS.map(key => `<fieldset data-ending="${key}"><legend>${key}</legend><label>Narrative outcome<textarea name="text">${esc(mission.endings[key]?.text)}</textarea></label><label>Wizard reaction<textarea name="wizard">${esc(mission.endings[key]?.wizard)}</textarea></label></fieldset>`).join('')}</div></section><div class="save-bar"><button id="save-mission-draft" class="primary" type="button">Save Draft</button><div><button id="preview-saved-draft" type="button" data-case-code="${esc(workspace.case_code)}" data-mission-type="${esc(selection.mission_type)}" data-slot-number="${Number(selection.slot_number)}"${saved ? '' : ' disabled'}>Preview Saved Draft</button><small>${saved ? 'Preview uses the last saved version. Unsaved changes are not included.' : 'Save this mission before previewing.'}</small></div><p id="mission-save-message" class="message" role="status">${esc(message)}</p></div></section>`;
}
function renderPublishedReview(published = {}) {
  const content = published.protected_content || {}, map = published.resource_map || {}, checklist = published.checklist || {}, orientation = checklist.intervention_orientation || {}, statuses = checklistStatuses('intervention_orientation');
  const reviews = [['resource_behavior_review', 'Behavior Review', map.behavior_reviewed], ['resource_privacy_review', 'Privacy Review', map.privacy_reviewed], ['resource_qa_preview', 'QA Preview Review', map.qa_previewed]];
  const orientationCard = `<form class="checklist-card checklist-form orientation-form" data-key="intervention_orientation"><strong class="checklist-card-label">MR intervention orientation</strong><div class="checklist-card-controls"><select name="status" aria-label="Status for MR intervention orientation">${statuses.map(status => `<option value="${status}"${selected(status, orientation.status || 'pending')}>${status.replaceAll('_', ' ')}</option>`).join('')}</select><input name="status_date" type="date" required value="${esc(orientation.status_date || denverToday())}" aria-label="MR intervention orientation status date"></div><input class="checklist-card-note" name="note" maxlength="1000" value="${esc(orientation.brief_note || '')}" aria-label="Optional note for MR intervention orientation" placeholder="Note"><button class="quiet checklist-card-save">Save orientation</button></form>`;
  return `<section class="published-game-review builder-section"><h2>Published Game Review</h2><p>This reviews the currently published protected game; it does not publish mission drafts.</p>${content.present ? `<p><strong>Protected content version ${Number(content.version) || 0}</strong></p><button id="preview-protected-game" class="primary" type="button" data-case-code="${esc(published.case_code)}">Preview Game</button><p><small>QA Preview is researcher testing only. It does not activate teacher access or count as participant study data.</small></p><div class="launch-reviews">${reviews.map(([type, label, done]) => `<button class="signoff-action ${done ? 'signed' : ''}" type="button" data-review-type="${type}" ${done ? 'disabled' : ''}><span>${label}</span><strong>${done ? 'Complete ✓' : 'Needs review'}</strong></button>`).join('')}<p id="signoff-message" class="message" aria-live="polite"></p></div>` : '<p class="needs">No published protected game is available to preview or review yet.</p>'}<h3>Teacher preparation</h3><p>Record the existing intervention orientation requirement here.</p>${orientationCard}</section>`;
}
const privacyWarning = 'Use the approved student alias and minimum-necessary plan information. Do not enter student full names, student IDs, diagnoses, parent information, medication information, or unnecessary identifying information.';
export function renderGameSetup(setup, message = '') {
  return `<section class="builder-section game-setup" aria-labelledby="game-setup-title"><p class="eyebrow">GAME SETUP</p><h2 id="game-setup-title">Game Setup</h2><p><strong>BIP Briefing shown before missions</strong></p><p>This is the short case-specific plan summary shown immediately before a teacher begins a mission.</p><p class="privacy-warning">${privacyWarning}</p><label>BIP Briefing<textarea id="bip-briefing" name="bipBriefing" rows="7">${esc(setup?.bipBriefing)}</textarea><small>Write a brief, teacher-friendly reminder of the function and the most important plan actions. Use the approved student alias only.</small></label><div class="save-bar"><button id="save-game-setup" class="primary" type="button">Save Game Setup</button><p id="setup-save-message" class="message" role="status">${esc(message)}</p></div></section>`;
}
function renderResourceBlock(block, index) {
  const controls = `<div class="resource-block-controls"><button type="button" data-block-action="up" aria-label="Move block up">Move Up</button><button type="button" data-block-action="down" aria-label="Move block down">Move Down</button><button type="button" data-block-action="remove" aria-label="Remove block">Remove Block</button></div>`;
  if (!block || typeof block !== 'object' || !RESOURCE_BLOCK_TYPES.has(block.type)) return `<article class="resource-block unsupported" data-block-index="${index}"><p class="error-message"><strong>Unsupported saved block.</strong> This content is preserved until you remove it and replace it with a supported block.</p>${controls}</article>`;
  if (block.type === 'paragraph') return `<article class="resource-block" data-block-index="${index}" data-block-type="paragraph"><label>Paragraph<textarea name="text">${esc(block.text)}</textarea></label>${controls}</article>`;
  if (block.type === 'callout') return `<article class="resource-block" data-block-index="${index}" data-block-type="callout">${textField('Label', 'label', block.label)}<label>Text<textarea name="text">${esc(block.text)}</textarea></label>${controls}</article>`;
  const rows = (Array.isArray(block.items) ? block.items : []).map((item, row) => block.type === 'list' ? `<div class="resource-item" data-item-index="${row}"><input name="item" aria-label="Bullet item" value="${esc(item)}"><button type="button" data-item-remove aria-label="Remove bullet item">Remove item</button></div>` : `<div class="resource-item definition-item" data-item-index="${row}">${textField('Term', 'term', item?.term)}${textField('Definition', 'definition', item?.definition)}<button type="button" data-item-remove aria-label="Remove definition row">Remove row</button></div>`).join('');
  return `<article class="resource-block" data-block-index="${index}" data-block-type="${block.type}"><strong>${block.type === 'list' ? 'Bullet List' : 'Definition List'}</strong><div class="resource-items">${rows}</div><button type="button" data-item-add>${block.type === 'list' ? 'Add item' : 'Add row'}</button>${controls}</article>`;
}
export function renderResourceMap(resources, message = '') {
  const warning = hasUnsupportedResourceBlocks(resources) ? '<p class="error-message" role="alert">Unsupported legacy Resource Map content was found. It remains preserved until explicitly removed and replaced.</p>' : '';
  return `<section class="builder-section resource-map-builder"><h2>Resource Map</h2><p class="privacy-warning">${privacyWarning}</p>${warning}${Object.entries(RESOURCE_SECTIONS).map(([key, [title, helper]]) => { const section = resources.sections[key], started = section.blocks.length > 0; return `<details class="resource-section" data-section-key="${key}"><summary><strong>${title}</strong><span>${started ? 'Started' : 'Not started'}</span></summary><p>${helper}</p><div class="resource-blocks">${section.blocks.map(renderResourceBlock).join('')}</div><label>Add Block<select data-add-block><option value="">Choose block type…</option><option value="paragraph">Paragraph</option><option value="list">Bullet List</option><option value="definitionList">Definition List</option><option value="callout">Callout</option></select></label></details>`; }).join('')}<div class="save-bar"><button id="save-resource-map" class="primary" type="button">Save Resource Map Draft</button><p id="resource-save-message" class="message" role="status">${esc(message)}</p></div></section>`;
}
export function renderGameCreation(workspace, selection, mission, nav, message = '', published = {}, loadError = '', setupDraft, resourceDraft, setupMessage = '', resourceMessage = '') {
  const authoring = workspace ? `${renderGameSetup(setupDraft || setupFromWorkspace(workspace), setupMessage)}${renderMissionBank(workspace, selection)}${renderMissionBuilder(workspace, selection, mission, nav, message)}${renderResourceMap(resourceDraft || resourcesFromWorkspace(workspace), resourceMessage)}` : `<section class="builder-section"><h2>Mission authoring workspace unavailable</h2><p class="error-message">Game authoring could not load: ${esc(loadError || 'Unknown workspace error')}. Confirm the browser-authoring migration is applied, then reload. No local-file fallback was used.</p></section>`;
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

export function captureResourceMap(root, resources) {
  root.querySelectorAll('.resource-section').forEach(card => {
    const section = resources.sections[card.dataset.sectionKey];
    card.querySelectorAll('.resource-block').forEach(element => {
      const block = section.blocks[Number(element.dataset.blockIndex)];
      if (!element.dataset.blockType) return;
      if (block.type === 'paragraph') block.text = element.querySelector('[name="text"]').value;
      if (block.type === 'callout') { block.label = element.querySelector('[name="label"]').value; block.text = element.querySelector('[name="text"]').value; }
      if (block.type === 'list') block.items = [...element.querySelectorAll('[name="item"]')].map(input => input.value);
      if (block.type === 'definitionList') block.items = [...element.querySelectorAll('.definition-item')].map(row => ({ term: row.querySelector('[name="term"]').value, definition: row.querySelector('[name="definition"]').value }));
    });
  });
  return resources;
}
