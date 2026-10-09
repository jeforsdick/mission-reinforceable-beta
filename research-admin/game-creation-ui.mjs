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
  { value: 'partial_implementation', label: 'Partial implementation' },
  { value: 'missed_response_step', label: 'Missed response step' },
  { value: 'missed_crisis_step', label: 'Missed crisis step' },
  { value: 'timing_or_delay', label: 'Timing / delay' },
  { value: 'contingency_mismatch', label: 'Contingency mismatch' },
  { value: 'function_mismatch', label: 'Function mismatch' },
  { value: 'reinforces_target_pattern', label: 'Reinforces target pattern' },
  { value: 'vague_or_nonspecific_response', label: 'Vague / non-specific response' },
  { value: 'public_or_attention_heavy_correction', label: 'Public / attention-heavy correction' },
  { value: 'plan_drift', label: 'Plan drift' },
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
const RESOURCE_BLOCK_TYPES = new Set(['paragraph', 'heading', 'list', 'definitionList', 'callout']);
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
  authoringState.resourceOpenSections = [];
  authoringState.fullDraftCheck = null;
  authoringState.validatedRevisionManifest = null;
  authoringState.publishResult = null;
}

export function draftRevisionManifest(workspace) {
  const order = { daily: 1, wild: 2, crisis: 3 };
  const missions = (workspace?.missions || workspace?.mission_drafts || []).map(row => ({
    mission_type: row.mission_type,
    slot_number: Number(row.slot_number),
    revision_id: row.revision_id || row.id
  })).sort((a, b) => order[a.mission_type] - order[b.mission_type] || a.slot_number - b.slot_number);
  return { setup_revision_id: workspace?.setup_draft?.revision_id || null, resource_revision_id: workspace?.resource_draft?.revision_id || null, missions };
}

export function sameDraftRevisionManifest(a, b) {
  if (a?.setup_revision_id !== b?.setup_revision_id || a?.resource_revision_id !== b?.resource_revision_id) return false;
  const order = { daily: 1, wild: 2, crisis: 3 };
  const normalize = manifest => (Array.isArray(manifest?.missions) ? manifest.missions : []).map(mission => ({
    mission_type: mission?.mission_type,
    slot_number: Number(mission?.slot_number),
    revision_id: mission?.revision_id
  })).sort((left, right) =>
    (order[left.mission_type] ?? 99) - (order[right.mission_type] ?? 99)
      || String(left.mission_type).localeCompare(String(right.mission_type))
      || left.slot_number - right.slot_number
  );
  const left = normalize(a);
  const right = normalize(b);
  return left.length === right.length && left.every((mission, index) =>
    mission.mission_type === right[index].mission_type
      && mission.slot_number === right[index].slot_number
      && mission.revision_id === right[index].revision_id
  );
}

export function captureResourceOpenSections(root) {
  if (!root) return [];
  return Array.from(root.querySelectorAll('.resource-section[open]'), section => section.dataset.sectionKey)
    .filter(key => Object.hasOwn(RESOURCE_SECTIONS, key));
}

export function restoreResourceOpenSections(root, keys = []) {
  if (!root) return;
  const openKeys = new Set(keys);
  root.querySelectorAll('.resource-section').forEach(section => {
    section.open = openKeys.has(section.dataset.sectionKey);
  });
}

export function setupFromWorkspace(workspace) {
  const setup = workspace?.setup_draft?.setup || workspace?.latest_setup_draft?.setup || {};
  return {
    schemaVersion: 1,
    classroomLabel: typeof setup.classroomLabel === 'string' ? setup.classroomLabel : '',
    bipBriefing: typeof setup.bipBriefing === 'string' ? setup.bipBriefing : ''
  };
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
export function defaultNextTrajectory(incomingTrajectory, score) {
  const incoming = String(incomingTrajectory || 'start');
  const value = Number(score);
  if (incoming === 'escalated') return value >= 10 ? 'wobbly' : 'escalated';
  if (value >= 10) return 'supported';
  if (value >= 5) return 'wobbly';
  return 'escalated';
}
function trajectoryFromNext(next) {
  const value = String(next || '');
  return TRAJECTORIES.find(branch => value.endsWith(`_${branch}`)) || '';
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
    for (const id of ids) {
      const incoming = decision === 1 ? 'start' : TRAJECTORIES.find(branch => id.endsWith(`_${branch}`)) || 'start';
      RATINGS.forEach(({ key, score }) => {
        steps[id].choices[key].next = nextStepId(decision, defaultNextTrajectory(incoming, score));
        delete steps[id].choices[key].ending;
      });
    }
  }
  return { id: defaultMissionId(caseCode, type, slot), title: '', expectedSteps: 5, start: 'd1_start', focus: '', routine: '', functionPressure: [], bipTargets: [], authoringMeta: { centralTension: '', tone: '', functionPressureContext: '', activeBipComponents: [], qualityReview: { behavioral: false, gameDesign: false } }, endings: Object.fromEntries(ENDINGS.map(key => [key, { text: '', wizard: '' }])), steps };
}
export function normalizeMission(value, caseCode, type, slot) {
  const base = blankMission(caseCode, type, slot);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return base;
  const mission = { ...base, ...structuredClone(value), authoringMeta: { ...base.authoringMeta, ...(value.authoringMeta || {}), centralTension: value.authoringMeta?.centralTension ?? value.centralTension ?? '', tone: value.authoringMeta?.tone ?? value.tone ?? '', functionPressureContext: value.authoringMeta?.functionPressureContext ?? value.functionPressureContext ?? '', activeBipComponents: value.authoringMeta?.activeBipComponents ?? value.activeBipComponents ?? [], qualityReview: { ...base.authoringMeta.qualityReview, ...(value.authoringMeta?.qualityReview || {}) } }, endings: { ...base.endings, ...(value.endings || {}) }, steps: { ...base.steps } };
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
  return (workspace?.mission_drafts || workspace?.latest_mission_drafts || workspace?.missions || []).find(row => row.mission_type === type && Number(row.slot_number) === Number(slot));
}
export function missionFromDraft(row) { return row?.mission || row?.mission_json || row?.draft || row?.content || null; }
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const selected = (a, b) => a === b ? ' selected' : '';
const checked = value => value ? ' checked' : '';
const targetKey = target => target.target_key || target.key;
const targets = workspace => workspace?.active_fidelity_targets || workspace?.fidelity_targets || [];
const dateLabel = value => value ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value)) : '';
const isStarted = step => Boolean(step?.text || step?.hint || step?.meta?.fidelityTargetKey || Object.values(step?.choices || {}).some(item => item.text || item.consequence || item.wizard || item.feedback || Object.values(item.meta || {}).some(Boolean)));
const missionSceneEntries = mission => Object.entries(mission?.steps || {}).filter(([id]) => /^d[1-5]_(?:start|supported|wobbly|escalated)$/.test(id));
const choiceIsComplete = choice => Boolean(
  choice?.text?.trim()
  && choice?.consequence?.trim()
  && choice?.feedback?.trim()
);
export function missionAuthoringProgress(mission) {
  const scenes = missionSceneEntries(mission);
  const completeScenes = scenes.filter(([,step]) =>
    step?.text?.trim()
    && step?.hint?.trim()
    && Object.values(step?.choices || {}).length === 3
    && Object.values(step?.choices || {}).every(choiceIsComplete)
  ).length;
  const choices = scenes.flatMap(([,step]) => Object.values(step?.choices || {}));
  const completeChoices = choices.filter(choiceIsComplete).length;
  const fidelityLinks = scenes.filter(([,step]) => step?.meta?.fidelityTargetKey).length;
  const reviews = Number(mission?.authoringMeta?.qualityReview?.behavioral === true)
    + Number(mission?.authoringMeta?.qualityReview?.gameDesign === true);
  return { scenes: scenes.length, completeScenes, choices: choices.length, completeChoices, fidelityLinks, reviews };
}

export function renderMissionBank(workspace, selection) {
  return `<section class="mission-bank" aria-labelledby="mission-bank-title"><h2 id="mission-bank-title">MISSION BANK</h2>${TYPES.map(group => `<section class="mission-bank-group"><h3>${group.label} Missions</h3>${group.type === 'crisis' && !workspace.has_crisis_plan ? '<p class="crisis-label"><strong>Formal crisis plan not present.</strong><br>Do not author crisis procedures that are not in the approved plan. Elevated, safe scenarios may be drafted only within the Mission Authoring Standard.</p>' : ''}<div class="mission-slots">${Array.from({ length: group.count }, (_, index) => { const slot = index + 1, row = latestDraft(workspace, group.type, slot), mission = missionFromDraft(row), active = selection?.mission_type === group.type && selection?.slot_number === slot; return `<button type="button" class="mission-slot${active ? ' selected' : ''}" data-mission-type="${group.type}" data-slot-number="${slot}" aria-pressed="${active}"><strong>${group.label} ${slot}</strong>${mission?.title ? `<span>${esc(mission.title)}</span>` : ''}<small>${row ? `${missionAuthoringProgress(mission).completeScenes}/13 scenes${row.created_at ? ` · saved ${esc(dateLabel(row.created_at))}` : ''}` : 'Not started'}</small></button>`; }).join('')}</div></section>`).join('')}</section>`;
}
const textField = (label, name, value, extra = '') => `<label>${label}<input ${extra} name="${name}" value="${esc(value)}"></label>`;
const selectOptions = (values, value, empty = 'Select…') => `<option value="">${empty}</option>${values.map(item => { const option = typeof item === 'string' ? { value: item, label: item } : item; return `<option value="${esc(option.value)}"${selected(option.value, value)}>${esc(option.label)}</option>`; }).join('')}`;
function choiceCard(item, index, decision) {
  const rating = RATINGS[index];
  const helper = rating.score === 10
    ? 'Best match to the individualized plan in this moment.'
    : rating.score === 5
    ? 'Reasonable and tempting, but missing or mistiming an important ingredient.'
    : 'A realistic response that drifts from the individualized plan.';
  const currentTrajectory = trajectoryFromNext(item.next);
  const routing = decision < 5 ? `<label class="choice-routing">NEXT CLASSROOM STATE
      <select name="trajectory">
        ${TRAJECTORIES.map(branch => `<option value="${branch}"${selected(branch, currentTrajectory)}>${branch[0].toUpperCase() + branch.slice(1)}</option>`).join('')}
      </select>
      <small>Separate from score: choose what would plausibly happen next given the current classroom state and this response.</small>
    </label>` : '';
  return `<fieldset class="choice-card simple-choice score-${rating.score}" data-choice="${rating.key}">
    <legend><strong>${rating.score}</strong> — ${rating.label}</legend>
    <small class="choice-helper">${helper}</small>
    <label>TEACHER RESPONSE<textarea name="text" rows="3">${esc(item.text)}</textarea></label>
    <label>WHAT HAPPENS NEXT?<textarea name="consequence" rows="3">${esc(item.consequence)}</textarea></label>
    <label>WHY DOES THIS SCORE FIT?<textarea name="feedback" rows="3">${esc(item.feedback)}</textarea></label>
    ${routing}
  </fieldset>`;
}
export function draftPreviewUrl(caseCode, type, slot) {
  const params = new URLSearchParams({ qa_case: caseCode, qa_draft_type: type, qa_draft_slot: String(slot) });
  return `../game/?${params}`;
}
export function renderMissionBuilder(workspace, selection, mission, nav = { decision: 1, branch: 'supported' }, message = '') {
  if (!selection || !mission) return '<section class="mission-builder-empty"><h2>Mission Builder</h2><p>Select a mission above to start writing.</p></section>';
  const group = TYPES.find(item => item.type === selection.mission_type);
  const decision = nav.decision;
  const id = stepId(decision, nav.branch);
  const step = mission.steps[id];
  const fidelity = targets(workspace);
  const saved = Boolean(latestDraft(workspace, selection.mission_type, selection.slot_number));
  const progress = missionAuthoringProgress(mission);
  const branchLabels = {
    supported: ['Supported state','The current classroom state is relatively regulated and plan support is working'],
    wobbly: ['Wobbly state','Some support is working, but difficulty or uncertainty is still present'],
    escalated: ['Escalated state','The situation is harder; a strong response may begin recovery without erasing what already happened']
  };
  const sceneOrder = [
    { decision:1, branch:'supported' },
    ...[2,3,4,5].flatMap(number => TRAJECTORIES.map(branch => ({ decision:number, branch })))
  ];
  const sceneIndex = sceneOrder.findIndex(item => item.decision===decision && item.branch===nav.branch);
  return `<section class="mission-builder simple-mission-builder" data-case-id="${esc(workspace.case.id)}">
    <header>
      <div><p class="eyebrow">EDITING ${esc(group.label.toUpperCase())} MISSION ${Number(selection.slot_number)}</p><h2>${esc(mission.title || `${group.label} Mission ${selection.slot_number}`)}</h2></div>
      <div class="mission-builder-status"><strong>${progress.completeScenes}/13 scenes</strong><span>${progress.completeChoices}/39 choices complete</span></div>
    </header>

    <details class="simple-case-reference">
      <summary>Case reference</summary>
      <div class="simple-case-reference-body">
        <p><strong>Student alias:</strong> ${esc(workspace.case.student_alias)}${workspace.primary_function ? ` · <strong>Function:</strong> ${esc(workspace.primary_function)}` : ''}</p>
        <p><strong>Approved fidelity targets:</strong></p>
        <ul>${fidelity.map(target => `<li><code>${esc(targetKey(target))}</code> ${esc(target.description)}</li>`).join('') || '<li>None returned.</li>'}</ul>
      </div>
    </details>

    <section class="simple-mission-basics">
      <label>MISSION TITLE<input name="title" value="${esc(mission.title)}" placeholder="A short situation-based title"></label>
      <label>ROUTINE / LOCATION<input name="routine" value="${esc(mission.routine)}" placeholder="e.g., Centers, independent work, transition"></label>
    </section>

    <section class="builder-section decision-editor simple-decision-editor">
      <div class="simple-decision-heading">
        <div><p class="eyebrow">STEP ${decision} OF 5</p><h3>${DECISIONS[decision - 1]}</h3></div>
        <nav class="decision-tabs" aria-label="Mission decisions">${DECISIONS.map((label, index) => {
          const number=index+1;
          const ids=number===1?['d1_start']:TRAJECTORIES.map(branch=>stepId(number,branch));
          const started=ids.some(key=>isStarted(mission.steps[key]));
          return `<button type="button" data-decision="${number}" class="${decision===number?'selected':''}"><strong>${number}</strong><small>${started?'Started':'Blank'}</small></button>`;
        }).join('')}</nav>
      </div>

      ${decision > 1 ? `<div class="branch-tabs simple-branch-tabs">${TRAJECTORIES.map(branch => `<button type="button" data-branch="${branch}" class="${nav.branch===branch?'selected':''}"><strong>${branchLabels[branch][0]}</strong><small>${branchLabels[branch][1]}</small></button>`).join('')}</div>` : ''}

      <div class="scene-editor simple-scene-editor" data-step-id="${id}">
        <label class="scene-field">SCENE<textarea name="text" rows="7" placeholder="What is happening in the classroom right now?">${esc(step.text)}</textarea></label>
        <label>HINT<textarea name="hint" rows="2" placeholder="A useful cue that does not give away the answer">${esc(step.hint)}</textarea></label>
        <label>EXACT PLAN STEP PRACTICED <span class="optional-label">Optional</span>
          <select name="fidelityTargetKey">
            <option value="">No exact fidelity target for this decision</option>
            ${fidelity.map(target => `<option value="${esc(targetKey(target))}"${selected(targetKey(target), step.meta.fidelityTargetKey)}>${esc(target.description)}</option>`).join('')}
          </select>
          <small>Use this only when the decision is a true opportunity to perform that exact teacher action.</small>
        </label>

        <div class="simple-choice-intro"><strong>What could the teacher do?</strong><span>Write three believable choices. The teacher should have to think.</span></div>
        <div class="choice-cards">${RATINGS.map(({ key }, index) => choiceCard(step.choices[key], index, decision)).join('')}</div>
      </div>

      <div class="simple-step-nav">
        <button type="button" class="quiet" data-simple-prev${sceneIndex<=0?' disabled':''}>← Previous scene</button>
        <span>${decision===1?'Opening scene':decision===5?'Final decision':`Decision ${decision} · ${branchLabels[nav.branch][0]}`}</span>
        <button type="button" class="quiet" data-simple-next${sceneIndex>=sceneOrder.length-1?' disabled':''}>Next scene →</button>
      </div>
    </section>

    <div class="save-bar simple-save-bar">
      <button id="save-mission-draft" class="primary" type="button">Save Mission</button>
      <button id="preview-saved-draft" type="button" data-case-code="${esc(workspace.case.case_code)}" data-mission-type="${esc(selection.mission_type)}" data-slot-number="${Number(selection.slot_number)}"${saved?'':' disabled'}>Play Saved Mission</button>
      <p id="mission-save-message" class="message" role="status">${esc(message)}</p>
    </div>
  </section>`;
}
function renderPublishedReview(published = {}, workspace = null, check = null, publishResult = null) {
  const content = published.protected_content || {}, map = published.resource_map || {}, checklist = published.checklist || {}, orientation = checklist.intervention_orientation || {}, statuses = checklistStatuses('intervention_orientation');
  const version = Number(content.version) || 0;
  const ready = check?.ready === true;
  const draftStatus = content.present ? (published.draft_changed ? 'Saved changes since published v' + version : 'Draft matches published v' + version) : 'No published game yet';
  const publishAction = ready ? '<p>Full Draft passed. Publishing creates a protected version but does not activate teacher access.</p><button id="publish-protected-version" class="primary" type="button">Publish Current Draft</button>' : '<p>Run Check Full Draft and resolve blocking findings before publishing.</p>';
  const draftSection = workspace ? `<div class="game-publishing-draft"><h3>Current Draft</h3><p><strong>${draftStatus}</strong></p>${publishResult ? `<p class="ready">Protected version v${Number(publishResult.version)} published. Review it below.</p>` : publishAction}<p id="publish-message" class="message" role="status"></p></div>` : '';
  const reviews = [
    ['resource_behavior_review', 'Behavior Review', map.behavior_reviewed, 'Confirm the published teacher-facing behavior content matches the approved BSP/BIP and fidelity targets. Check the Resource Map, mission choices, feedback, and crisis content for anything that adds, changes, or contradicts the plan.'],
    ['resource_privacy_review', 'Privacy Review', map.privacy_reviewed, 'Confirm the published version uses the approved student alias and only minimum-necessary information. Check that there are no student full names or IDs, family information, diagnoses or medication information, unnecessary school identifiers, or internal researcher notes.'],
    ['resource_qa_preview', 'QA Preview Review', map.qa_previewed, 'Open Preview Published Game and use it like a teacher: check the home screen/banner, Mission Briefing, Resources, mission start, choices/branching, feedback, results/progress, and navigation. Mark complete when this published version looks and works as intended.']
  ];
  const orientationCard = `<form class="checklist-card checklist-form orientation-form" data-key="intervention_orientation"><strong class="checklist-card-label">MR intervention orientation</strong><div class="checklist-card-controls"><select name="status" aria-label="Status for MR intervention orientation">${statuses.map(status => `<option value="${status}"${selected(status, orientation.status || 'pending')}>${status.replaceAll('_', ' ')}</option>`).join('')}</select><input name="status_date" type="date" required value="${esc(orientation.status_date || denverToday())}" aria-label="MR intervention orientation status date"></div><input class="checklist-card-note" name="note" maxlength="1000" value="${esc(orientation.brief_note || '')}" aria-label="Optional note for MR intervention orientation" placeholder="Note"><button class="quiet checklist-card-save">Save orientation</button></form>`;
  return `<section class="published-game-review builder-section"><p class="eyebrow">GAME REVIEW &amp; PUBLISHING</p><h2>Game Review &amp; Publishing</h2><p>Review saved drafts before publishing. Reviews below apply only to the protected version.</p>${draftSection}<div class="game-publishing-published"><h3>Published Game</h3>${content.present ? `<p><strong>Reviewing protected version v${version}</strong></p><button id="preview-protected-game" class="primary" type="button" data-case-code="${esc(published.case_code)}" data-content-version="${version}">Preview Published Game (v${version})</button><p><small>QA Preview is researcher testing only. It loads current protected version v${version}, records that game content version in QA telemetry, and does not activate teacher access or count as participant study data.</small></p><div class="launch-reviews">${reviews.map(([type, label, done, explanation]) => `<div class="published-review-item"><button class="signoff-action ${done ? 'signed' : ''}" type="button" data-review-type="${type}" data-content-version="${version}" ${done ? 'disabled' : ''}><span>${label} · v${version}</span><strong>${done ? 'Complete ✓' : 'Needs review'}</strong></button><p><strong>What to do:</strong> ${esc(explanation)}</p></div>`).join('')}<p id="signoff-message" class="message" aria-live="polite"></p></div>` : '<p class="needs">No published protected game is available to preview or review yet.</p>'}</div><h3>Teacher preparation</h3><p>Record the existing intervention orientation requirement here.</p>${orientationCard}</section>`;
}
const privacyWarning = 'Use the approved student alias and minimum-necessary plan information. Do not enter student full names, student IDs, diagnoses, parent information, medication information, or unnecessary identifying information.';
const authoringBriefValue = value => typeof value === 'string' && value.trim()
  ? `<p>${esc(value)}</p>`
  : '<p class="authoring-brief-empty">Not provided.</p>';
const authoringBriefField = (label, value) => `<div class="authoring-brief-field"><span>${esc(label)}</span>${authoringBriefValue(value)}</div>`;

export function renderAuthoringBrief(workspace) {
  const context = workspace?.intake_context || {};
  const fidelity = targets(workspace);
  return `<details class="builder-section authoring-brief compact-authoring-reference">
    <summary><strong>Case context for writing missions</strong><span>Open only when you need a reminder from the intake/BSP review.</span></summary>
    <div class="authoring-brief-grid">
      <section><h3>Behavior</h3>
        ${authoringBriefField('Target behavior', context.target_behavior)}
        ${authoringBriefField('Function', context.primary_function || workspace?.primary_function)}
        ${authoringBriefField('Replacement behavior', context.replacement_behavior)}
        ${authoringBriefField('Desired behavior', context.desired_behavior)}
      </section>
      <section><h3>Plan</h3>
        ${authoringBriefField('Prevent', context.prevention_strategies)}
        ${authoringBriefField('Teach', context.teaching_strategies)}
        ${authoringBriefField('Reinforce', context.reinforcement_system)}
        ${authoringBriefField('Respond', context.response_strategy)}
      </section>
      <section><h3>Real classroom context</h3>
        ${authoringBriefField('Routines/settings', context.typical_settings)}
        ${authoringBriefField('Triggers', context.common_triggers)}
        ${authoringBriefField('Current staff responses', context.current_staff_responses)}
        ${authoringBriefField('Requested scenarios', context.requested_scenarios)}
      </section>
      <section><h3>Personalization</h3>
        ${authoringBriefField('Strengths/interests', context.student_strengths)}
        ${authoringBriefField('Reinforcers/preferences', context.preferred_items_activities)}
        ${authoringBriefField('Additional context', context.additional_context)}
      </section>
    </div>
    <div class="authoring-fidelity-brief"><div><h3>Approved fidelity targets</h3><p>The mission bank should rehearse these across realistic classroom situations.</p></div><ul>${fidelity.map(target => `<li><code>${esc(targetKey(target))}</code><span>${esc(target.description)}</span></li>`).join('') || '<li>No active fidelity targets returned.</li>'}</ul></div>
    <p class="authoring-source-rule"><strong>Source of truth:</strong> the approved BSP/BIP and finalized fidelity targets govern the game. Intake information is supplemental context.</p>
  </details>`;
}
export function renderGameSetup(setup, message = '') {
  return `<section class="builder-section game-setup" aria-labelledby="game-setup-title"><p class="eyebrow">GAME SETUP</p><h2 id="game-setup-title">Game Setup</h2>
    <div class="game-setup-field">
      <label>Home mission banner
        <input id="classroom-label" name="classroomLabel" maxlength="60" value="${esc(setup?.classroomLabel)}" placeholder="e.g., Teacher's Mission">
        <small>This replaces the generic “Participant Mission” plaque on the teacher home screen. Use the teacher’s first name + “Mission” (for example, <strong>Teacher's Mission</strong>).</small>
      </label>
    </div>
    <p><strong>BIP Briefing shown before missions</strong></p><p>This is the short case-specific plan summary shown immediately before a teacher begins a mission.</p><p class="privacy-warning">${privacyWarning}</p><label>BIP Briefing<textarea id="bip-briefing" name="bipBriefing" rows="7">${esc(setup?.bipBriefing)}</textarea><small>Write a brief, teacher-friendly reminder of the function and the most important plan actions. Use the approved student alias only.</small></label><div class="save-bar"><button id="save-game-setup" class="primary" type="button">Save Game Setup</button><p id="setup-save-message" class="message" role="status">${esc(message)}</p></div></section>`;
}

const FIDELITY_DOMAIN_LABELS = {
  proactive: 'Prevent',
  teaching: 'Teach',
  reinforcement: 'Reinforce',
  response: 'Respond',
  crisis: 'Crisis'
};
function linkedFidelityTargetKeys(workspace) {
  const keys = new Set();
  for (const row of workspace?.missions || workspace?.mission_drafts || []) {
    const mission = row?.mission || row?.mission_json || row?.draft || row?.content || {};
    for (const step of Object.values(mission?.steps || {})) {
      const key = step?.meta?.fidelityTargetKey;
      if (key) keys.add(key);
    }
  }
  return keys;
}
function fidelityTargetEditorRow(target, linked = false) {
  const key = target?.target_key || '';
  const domain = target?.domain || 'proactive';
  const options = Object.entries(FIDELITY_DOMAIN_LABELS).map(([value,label]) =>
    `<option value="${value}"${value===domain?' selected':''}>${label}</option>`
  ).join('');
  return `<div class="case-fidelity-target-row" data-target-key="${esc(key)}">
    <div class="case-fidelity-target-meta">
      <code>${key ? esc(key) : 'NEW'}</code>
      <select name="domain" aria-label="Fidelity target domain"${key ? ' disabled' : ''}>${options}</select>
      ${linked ? '<span class="target-linked-badge">Linked in mission</span>' : ''}
    </div>
    <textarea name="description" rows="2" aria-label="Fidelity target description">${esc(target?.description)}</textarea>
    <button type="button" class="quiet remove-case-fidelity-target"${linked ? ' disabled title="Relink the mission before deactivating this target."' : ''}>${linked ? 'Linked' : 'Remove'}</button>
  </div>`;
}
export function renderFidelityTargetEditor(workspace) {
  const fidelity = targets(workspace);
  const linked = linkedFidelityTargetKeys(workspace);
  return `<details class="builder-section fidelity-target-editor" open>
    <summary><strong>Final Fidelity Targets</strong><span>Clean these before writing missions.</span></summary>
    <div class="fidelity-target-editor-body">
      <p>These are the final observable teacher actions used for fidelity scoring and exact mission links. Edit wording, remove duplicates, or add a missing action here. Existing target codes stay stable.</p>
      <p class="neutral-note"><strong>Mission-link protection:</strong> once a saved mission uses a target, that target cannot be removed until the mission is relinked.</p>
      <div id="case-fidelity-target-list">
        ${fidelity.map(target => fidelityTargetEditorRow(target, linked.has(targetKey(target)))).join('')}
      </div>
      <div class="case-fidelity-add">
        <label>New target domain
          <select id="new-case-fidelity-domain">
            ${Object.entries(FIDELITY_DOMAIN_LABELS).map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}
          </select>
        </label>
        <button id="add-case-fidelity-target" type="button">+ Add target</button>
      </div>
      <div class="save-bar">
        <button id="save-case-fidelity-targets" class="primary" type="button">Save Final Targets</button>
        <p id="fidelity-target-save-message" class="message" role="status"></p>
      </div>
    </div>
  </details>`;
}
function renderResourceBlock(block, index) {
  const controls = `<div class="resource-block-controls"><button type="button" data-block-action="up" aria-label="Move block up">Move Up</button><button type="button" data-block-action="down" aria-label="Move block down">Move Down</button><button type="button" data-block-action="remove" aria-label="Remove block">Remove Block</button></div>`;
  if (!block || typeof block !== 'object' || !RESOURCE_BLOCK_TYPES.has(block.type)) return `<article class="resource-block unsupported" data-block-index="${index}"><p class="error-message"><strong>Unsupported saved block.</strong> This content is preserved until you remove it and replace it with a supported block.</p>${controls}</article>`;
  if (block.type === 'paragraph') return `<article class="resource-block" data-block-index="${index}" data-block-type="paragraph"><label>Paragraph<textarea name="text">${esc(block.text)}</textarea></label>${controls}</article>`;
  if (block.type === 'heading') return `<article class="resource-block resource-heading-block" data-block-index="${index}" data-block-type="heading">${textField('SUBSECTION HEADING', 'text', block.text)}${controls}</article>`;
  if (block.type === 'callout') return `<article class="resource-block" data-block-index="${index}" data-block-type="callout">${textField('Label', 'label', block.label)}<label>Text<textarea name="text">${esc(block.text)}</textarea></label>${controls}</article>`;
  const rows = (Array.isArray(block.items) ? block.items : []).map((item, row) => block.type === 'list' ? `<div class="resource-item" data-item-index="${row}"><input name="item" aria-label="Bullet item" value="${esc(item)}"><button type="button" data-item-remove aria-label="Remove bullet item">Remove item</button></div>` : `<div class="resource-item definition-item" data-item-index="${row}">${textField('Term', 'term', item?.term)}${textField('Definition', 'definition', item?.definition)}<button type="button" data-item-remove aria-label="Remove definition row">Remove row</button></div>`).join('');
  return `<article class="resource-block" data-block-index="${index}" data-block-type="${block.type}"><strong>${block.type === 'list' ? 'Bullet List' : 'Definition List'}</strong><div class="resource-items">${rows}</div><button type="button" data-item-add>${block.type === 'list' ? 'Add item' : 'Add row'}</button>${controls}</article>`;
}
export function renderResourceMap(resources, message = '') {
  const warning = hasUnsupportedResourceBlocks(resources) ? '<p class="error-message" role="alert">Unsupported legacy Resource Map content was found. It remains preserved until explicitly removed and replaced.</p>' : '';
  return `<details class="builder-section resource-map-builder compact-secondary-builder"><summary><strong>Resources / Resource Map</strong><span>Open when you are ready to review the teacher reference pages.</span></summary><div class="secondary-builder-body"><p class="privacy-warning">${privacyWarning}</p>${warning}${Object.entries(RESOURCE_SECTIONS).map(([key, [title, helper]]) => { const section = resources.sections[key], started = section.blocks.length > 0; return `<details class="resource-section" data-section-key="${key}"><summary><strong>${title}</strong><span>${started ? 'Started' : 'Not started'}</span></summary><p>${helper}</p><div class="resource-blocks">${section.blocks.map(renderResourceBlock).join('')}</div><label>Add Block<select data-add-block><option value="">Choose block type…</option><option value="paragraph">Paragraph</option><option value="heading">Heading</option><option value="list">Bullet List</option><option value="definitionList">Definition List</option><option value="callout">Callout</option></select></label></details>`; }).join('')}<div class="save-bar"><button id="save-resource-map" class="primary" type="button">Save Resource Map Draft</button><p id="resource-save-message" class="message" role="status">${esc(message)}</p></div></div></details>`;
}
export function renderFullDraftCheck(workspace, check) {
  const ready = check?.ready === true;
  const report = check ? `<div class="full-draft-report"><h3 class="${ready ? 'ready' : 'needs'}">${ready ? 'READY TO PREVIEW' : `${check.blockingCount} ITEMS NEED ACTION`}</h3>${Object.entries(check.categories).map(([name, category]) => { const status = category.errors.length ? 'NEEDS ACTION' : category.warnings.length ? 'WARNING' : 'PASS'; return `<section class="check-category"><h4>${esc(name)} <span class="${status === 'PASS' ? 'ready' : status === 'WARNING' ? 'warning' : 'needs'}">${status}</span></h4>${[...category.errors, ...category.warnings].map(item => `<div class="check-finding"><span>${item.severity === 'blocking' ? 'Needs action' : 'Review'}: ${esc(item.message)}</span>${item.action?.type === 'setup' ? '<button type="button" data-check-nav="setup">Go to Game Setup</button>' : item.action?.type === 'mission' ? `<button type="button" data-check-mission-type="${esc(item.action.missionType)}" data-check-slot="${Number(item.action.slot)}">Open ${esc(item.path)}</button>` : item.path?.startsWith('Resource Map') ? `<button type="button" data-check-resource="${esc(Object.entries(RESOURCE_SECTIONS).find(([, [title]]) => item.path.includes(title))?.[0] || '')}">Open Resource Map</button>` : ''}</div>`).join('') || '<p>No findings.</p>'}</section>`; }).join('')}<p><small>Automated privacy scanning and coverage checks are aids, not certification of privacy, behavioral validity, or crisis safety.</small></p></div>` : '';
  return `<section class="builder-section full-draft-check"><p class="eyebrow">CHECK &amp; PREVIEW FULL DRAFT</p><h2>Check &amp; Preview Full Draft</h2><p>Check the latest saved Game Setup, Resource Map, and mission drafts before previewing the complete game.</p><p><strong>Current Draft uses your latest saved setup, Resource Map, and missions. Unsaved changes are not included. Published Game shows the last protected version, not new draft edits.</strong></p><div class="actions"><button id="check-full-draft" class="primary" type="button">Check Full Draft</button><button id="preview-full-draft" type="button" data-case-code="${esc(workspace.case.case_code)}"${ready ? '' : ' disabled'}>Preview Current Draft Game</button></div><p id="full-draft-message" class="message" role="status"></p>${report}</section>`;
}
export function fullDraftPreviewUrl(caseCode) { return `../game/?${new URLSearchParams({ qa_case: caseCode, qa_full_draft: '1' })}`; }
export function renderGameCreation(workspace, selection, mission, nav, message = '', published = {}, loadError = '', setupDraft, resourceDraft, setupMessage = '', resourceMessage = '', fullDraftCheck = null, publishResult = null) {
  const authoring = workspace ? `${renderGameSetup(setupDraft || setupFromWorkspace(workspace), setupMessage)}${renderFidelityTargetEditor(workspace)}${renderAuthoringBrief(workspace)}${renderMissionBank(workspace, selection)}${renderMissionBuilder(workspace, selection, mission, nav, message)}${renderResourceMap(resourceDraft || resourcesFromWorkspace(workspace), resourceMessage)}${renderFullDraftCheck(workspace, fullDraftCheck)}` : `<section class="builder-section"><h2>Mission authoring workspace unavailable</h2><p class="error-message">Game authoring could not load: ${esc(loadError || 'Unknown workspace error')}. Confirm the browser-authoring migration is applied, then reload. No local-file fallback was used.</p></section>`;
  return `<section id="game-creation" class="panel browser-authoring"><div class="game-creation-heading"><div><p class="eyebrow">GAME CREATION</p><h1>Build the game</h1><p>BIP BRIEFING → MISSIONS → PLAY TEST → PUBLISH</p></div><button id="back-to-game-ready" class="quiet" type="button">Back to Game Ready</button></div>${authoring}${renderPublishedReview(published, workspace, fullDraftCheck, publishResult)}<p class="legacy-note">Legacy local build instructions remain available in documentation during the transition.</p></section>`;
}

export function captureMission(root, mission, nav) {
  const one = name => root.querySelector(`[name="${name}"]`);
  if (one('title')) mission.title = one('title').value;
  if (one('routine')) mission.routine = one('routine').value;

  const editor = root.querySelector('.scene-editor');
  if (editor) {
    const step = mission.steps[editor.dataset.stepId];
    step.text = editor.querySelector('[name="text"]').value;
    step.hint = editor.querySelector('[name="hint"]').value;

    const exact = editor.querySelector('[name="fidelityTargetKey"]').value;
    step.meta = exact
      ? { ...(step.meta || {}), fidelityTargetKey: exact }
      : Object.fromEntries(Object.entries(step.meta || {}).filter(([key]) => key !== 'fidelityTargetKey'));

    const domain = exact ? exact.split('_')[0] : '';
    const component = ({ proactive:'Prevent', teaching:'Teach', reinforcement:'Reinforce', response:'Respond', crisis:'Crisis' })[domain] || '';
    const functionValue = canonicalFunction(mission.functionPressure?.[0]) || 'unclear';
    const incomingTrajectory = nav.decision === 1 ? 'start' : nav.branch;
    const wizardDefaults = {
      10: 'YES. That matched the plan at the moment it mattered.',
      5: 'Close call. Helpful idea — but an important ingredient is still missing.',
      0: 'That response is understandable, but it drifts from the individualized plan.'
    };

    editor.querySelectorAll('.choice-card').forEach((card, index) => {
      const { key, score } = RATINGS[index];
      const item = step.choices[key];
      item.text = card.querySelector('[name="text"]').value;
      item.consequence = card.querySelector('[name="consequence"]').value;
      item.feedback = card.querySelector('[name="feedback"]').value;
      item.wizard = item.wizard?.trim() || wizardDefaults[score];
      item.score = score;
      item.meta = {
        ...(item.meta || {}),
        bipComponent: item.meta?.bipComponent || component,
        mechanism: item.meta?.mechanism?.trim() || item.text.trim(),
        errorType: score === 10
          ? 'none'
          : (item.meta?.errorType && item.meta.errorType !== 'none'
            ? item.meta.errorType
            : score === 5 ? 'missed_active_ingredient' : 'other_needs_review'),
        function: item.meta?.function || functionValue
      };
      if (nav.decision < 5) {
        const selectedTrajectory = card.querySelector('[name="trajectory"]')?.value
          || defaultNextTrajectory(incomingTrajectory, score);
        item.next = nextStepId(nav.decision, selectedTrajectory);
        delete item.ending;
      } else {
        item.next = null;
        item.ending = item.ending || (score === 10 ? 'STRONG' : score === 5 ? 'MIXED' : 'FRAGILE');
      }
    });
  }

  const linkedTargets = [...new Set(
    Object.values(mission.steps || {})
      .map(step => step?.meta?.fidelityTargetKey)
      .filter(Boolean)
  )];
  mission.bipTargets = linkedTargets;

  const linkedComponents = [...new Set(
    linkedTargets
      .map(key => ({ proactive:'Prevent', teaching:'Teach', reinforcement:'Reinforce', response:'Respond', crisis:'Crisis' })[String(key).split('_')[0]])
      .filter(Boolean)
  )];
  mission.authoringMeta = {
    ...(mission.authoringMeta || {}),
    activeBipComponents: linkedComponents
  };

  if ((!mission.functionPressure || !mission.functionPressure.length) && linkedTargets.length) {
    mission.functionPressure = ['unclear'];
  }
  return mission;
}

export function captureResourceMap(root, resources) {
  root.querySelectorAll('.resource-section').forEach(card => {
    const section = resources.sections[card.dataset.sectionKey];
    card.querySelectorAll('.resource-block').forEach(element => {
      const block = section.blocks[Number(element.dataset.blockIndex)];
      if (!element.dataset.blockType) return;
      if (block.type === 'paragraph' || block.type === 'heading') block.text = element.querySelector('[name="text"]').value;
      if (block.type === 'callout') { block.label = element.querySelector('[name="label"]').value; block.text = element.querySelector('[name="text"]').value; }
      if (block.type === 'list') block.items = [...element.querySelectorAll('[name="item"]')].map(input => input.value);
      if (block.type === 'definitionList') block.items = [...element.querySelectorAll('.definition-item')].map(row => ({ term: row.querySelector('[name="term"]').value, definition: row.querySelector('[name="definition"]').value }));
    });
  });
  return resources;
}
