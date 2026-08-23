import { normalizeMission, nextStepId, stepId, TRAJECTORIES } from './game-creation-ui.mjs';

export const EXAMPLE_IMPORT_KIND = 'mr998_example_mission_drafts';
const SLOT_LIMITS = Object.freeze({ daily: 10, wild: 5, crisis: 5 });
const LABELS = Object.freeze({ daily: 'Daily', wild: 'Mystery', crisis: 'Crisis' });
const ENDINGS = Object.freeze({ A: 'STRONG', B: 'MIXED', C: 'FRAGILE' });
const SCORES = Object.freeze({ A: 10, B: 5, C: 0 });
const ERROR_TYPES = new Set(['none', 'missed_prevention_opportunity', 'missed_teaching_opportunity', 'missed_reinforcement_opportunity', 'missed_active_ingredient', 'timing_or_delay', 'contingency_mismatch', 'function_mismatch', 'reinforces_target_pattern', 'vague_or_nonspecific_response', 'public_or_attention_heavy_correction', 'other_needs_review']);
const FUNCTIONS = new Set(['attention', 'escape', 'tangible', 'automatic', 'multiple', 'unclear']);
const COMPONENTS = new Set(['Prevent', 'Teach', 'Reinforce', 'Respond', 'Crisis']);
const HTML_OR_SCRIPT = /<\s*\/?\s*(?:script|iframe|object|embed|style|[a-z][\w-]*)\b|javascript\s*:|\bon(?:click|load|error|mouse\w*|key\w*|submit|focus|blur)\s*=/i;
const PRIVATE_DATA = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]\d{3}[\s.-]\d{4}\b|\b(?:https?:\/\/|www\.)\S+/i;
const FORBIDDEN_FIELD = /(?:^on[a-z]+$|script|html|href|src|url|uri|(?:^|_)(?:path|file)(?:$|_)|(?:file|path)(?:name)?$|executable|command)/i;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
const expectedStepIds = () => ['d1_start', ...[2, 3, 4, 5].flatMap(decision => TRAJECTORIES.map(branch => stepId(decision, branch)))];
const targetKey = target => target?.target_key || target?.key;

export function canUseExampleMissionImporter(workspace) {
  return Boolean(workspace && workspace.case_id && workspace.case_code === 'CASE-998' && workspace.study_id === 'MR-998');
}

function unsafeContent(value, path = 'mission') {
  if (typeof value === 'string') return HTML_OR_SCRIPT.test(value) || PRIVATE_DATA.test(value) ? path : '';
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) { const found = unsafeContent(value[index], `${path}[${index}]`); if (found) return found; }
    return '';
  }
  if (!object(value)) return '';
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_FIELD.test(key)) return `${path}.${key}`;
    const found = unsafeContent(child, `${path}.${key}`); if (found) return found;
  }
  return '';
}

export function validateExampleMission(mission, activeTargets = []) {
  const errors = [];
  const add = message => errors.push(message);
  if (!object(mission)) return { valid: false, errors: ['Mission must be a JSON object.'] };
  if (!text(mission.id)) add('Canonical mission ID is required.');
  else if (!/^[A-Za-z0-9_-]+$/.test(mission.id)) add('Mission ID may contain only letters, numbers, underscores, and hyphens.');
  if (!text(mission.title)) add('Mission title is required.');
  if (mission.expectedSteps !== 5) add('expectedSteps must be 5.');
  if (mission.start !== 'd1_start') add('start must be d1_start.');
  const ids = expectedStepIds(), actualIds = object(mission.steps) ? Object.keys(mission.steps) : [];
  if (actualIds.length !== 13 || ids.some(id => !Object.hasOwn(mission.steps || {}, id)) || actualIds.some(id => !ids.includes(id))) add('Mission must contain exactly the 13 canonical scenes.');
  const validTargets = new Set(activeTargets.map(targetKey).filter(Boolean));
  for (const id of ids) {
    const scene = mission.steps?.[id];
    if (!object(scene)) { add(`${id}: scene must be an object.`); continue; }
    if (!text(scene.text)) add(`${id}: scene text is required.`);
    if (!text(scene.hint)) add(`${id}: hint is required.`);
    const keys = object(scene.choices) ? Object.keys(scene.choices) : [];
    if (keys.length !== 3 || !['A', 'B', 'C'].every(key => Object.hasOwn(scene.choices || {}, key)) || keys.some(key => !Object.hasOwn(SCORES, key))) { add(`${id}: choices must be exactly A, B, and C.`); continue; }
    const decision = Number(id[1]);
    for (const key of ['A', 'B', 'C']) {
      const choice = scene.choices[key];
      if (!object(choice)) { add(`${id} choice ${key}: choice must be an object.`); continue; }
      if (choice.score !== SCORES[key]) add(`${id} choice ${key}: score must be ${SCORES[key]}.`);
      for (const [field, label] of [['text', 'teacher action'], ['consequence', 'consequence'], ['wizard', 'Wizard feedback'], ['feedback', 'behavioral explanation']]) if (!text(choice[field])) add(`${id} choice ${key}: ${label} is required.`);
      if (decision < 5) {
        const validNext = TRAJECTORIES.map(branch => nextStepId(decision, branch));
        if (!validNext.includes(choice.next)) add(`${id} choice ${key}: next must target a canonical Decision ${decision + 1} state.`);
        if (choice.ending !== undefined) add(`${id} choice ${key}: Decisions 1–4 cannot declare an ending.`);
      } else {
        if (choice.next !== null && choice.next !== undefined) add(`${id} choice ${key}: Decision 5 cannot have a next state.`);
        if (choice.ending !== ENDINGS[key]) add(`${id} choice ${key}: ending must be ${ENDINGS[key]}.`);
      }
      const meta = choice.meta;
      if (!object(meta)) add(`${id} choice ${key}: canonical metadata is required.`);
      else {
        if (!COMPONENTS.has(meta.bipComponent)) add(`${id} choice ${key}: unsupported BIP component.`);
        if (!text(meta.mechanism)) add(`${id} choice ${key}: mechanism is required.`);
        if (!ERROR_TYPES.has(meta.errorType)) add(`${id} choice ${key}: unsupported error type.`);
        if (!FUNCTIONS.has(meta.function)) add(`${id} choice ${key}: unsupported function.`);
      }
    }
    const fidelityKey = scene.meta?.fidelityTargetKey;
    if (fidelityKey && !validTargets.has(fidelityKey)) add(`${id}: fidelity target ${fidelityKey} is not active for CASE-998.`);
    if (scene.meta?.fidelityTargetKeys !== undefined || Array.isArray(fidelityKey)) add(`${id}: use one canonical fidelityTargetKey.`);
  }
  for (const ending of Object.values(ENDINGS)) {
    if (!text(mission.endings?.[ending]?.text)) add(`${ending} ending narrative is required.`);
    if (!text(mission.endings?.[ending]?.wizard)) add(`${ending} Wizard ending text is required.`);
  }
  if (!Array.isArray(mission.bipTargets) || mission.bipTargets.some(key => !validTargets.has(key))) add('bipTargets must contain only active CASE-998 fidelity target keys.');
  const unsafePath = unsafeContent(mission); if (unsafePath) add(`Unsafe HTML, script, URL, contact, or file content detected at ${unsafePath}.`);
  return { valid: errors.length === 0, errors };
}

export function reviewExampleMissionImport(payload, workspace) {
  const errors = [], entries = [];
  if (!object(payload)) return { valid: false, errors: ['Import file must contain a JSON object.'], entries };
  if (payload.schemaVersion !== 1) errors.push('schemaVersion must be 1.');
  if (payload.importKind !== EXAMPLE_IMPORT_KIND) errors.push(`importKind must be ${EXAMPLE_IMPORT_KIND}.`);
  if (payload.caseCode !== 'CASE-998') errors.push('caseCode must be CASE-998.');
  if (payload.participantCode !== 'MR-998') errors.push('participantCode must be MR-998.');
  if (!Array.isArray(payload.missions) || payload.missions.length === 0) errors.push('missions must be a non-empty array.');
  const seen = new Set();
  for (const [index, item] of (Array.isArray(payload.missions) ? payload.missions : []).entries()) {
    const location = object(item) ? `${LABELS[item.missionType] || item.missionType || 'Unknown'} ${item.slotNumber ?? '?'}` : `Entry ${index + 1}`;
    if (!object(item) || !Object.hasOwn(SLOT_LIMITS, item.missionType)) { errors.push(`${location}: unsupported mission type.`); continue; }
    if (!Number.isInteger(item.slotNumber) || item.slotNumber < 1 || item.slotNumber > SLOT_LIMITS[item.missionType]) { errors.push(`${location}: invalid slot number.`); continue; }
    if (item.missionType === 'daily' && item.slotNumber === 1) { errors.push('Daily 1 is protected and cannot be imported or replaced.'); continue; }
    const slotKey = `${item.missionType}:${item.slotNumber}`;
    if (seen.has(slotKey)) { errors.push(`${location}: duplicate type and slot.`); continue; }
    seen.add(slotKey);
    if (!object(item.mission)) { errors.push(`${location}: mission must be a JSON object.`); continue; }
    // Check source invariants before normalization so normalization cannot repair a bad score or shape.
    const sourceReport = validateExampleMission(item.mission, workspace?.active_fidelity_targets || workspace?.fidelity_targets || []);
    const mission = normalizeMission(item.mission, 'CASE-998', item.missionType, item.slotNumber);
    const normalizedReport = validateExampleMission(mission, workspace?.active_fidelity_targets || workspace?.fidelity_targets || []);
    for (const problem of [...sourceReport.errors, ...normalizedReport.errors.filter(problem => !sourceReport.errors.includes(problem))]) errors.push(`${location}: ${problem}`);
    entries.push({ missionType: item.missionType, slotNumber: item.slotNumber, mission, label: location });
  }
  return { valid: errors.length === 0, errors, entries };
}

export function importSummary(review, workspace) {
  const compactSlots = slots => {
    const ranges = []; let start = slots[0], previous = slots[0];
    for (const slot of slots.slice(1)) { if (slot === previous + 1) { previous = slot; continue; } ranges.push(start === previous ? `${start}` : `${start}–${previous}`); start = previous = slot; }
    if (start !== undefined) ranges.push(start === previous ? `${start}` : `${start}–${previous}`);
    return ranges.join(', ');
  };
  const ranges = Object.keys(SLOT_LIMITS).map(type => {
    const slots = review.entries.filter(item => item.missionType === type).map(item => item.slotNumber).sort((a, b) => a - b);
    return slots.length ? `${LABELS[type]}: ${compactSlots(slots)}` : null;
  }).filter(Boolean);
  const existing = review.entries.filter(item => (workspace?.mission_drafts || []).some(row => row.mission_type === item.missionType && Number(row.slot_number) === item.slotNumber)).map(item => item.label);
  return { count: review.entries.length, ranges, existing };
}

export async function saveExampleMissionImport(entries, save, progress = () => {}) {
  const saved = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]; progress(index + 1, entries.length, entry);
    try { await save(entry); saved.push(entry); }
    catch (error) { return { ok: false, saved, failed: entry, error }; }
  }
  return { ok: true, saved, failed: null, error: null };
}
