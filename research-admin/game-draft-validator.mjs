const TYPES = Object.freeze({ daily: { label: 'Daily', count: 10 }, wild: { label: 'Mystery', count: 5 }, crisis: { label: 'Crisis', count: 5 } });
const ENDINGS = new Set(['STRONG', 'MIXED', 'FRAGILE']);
const KEY_PATTERN = /^(proactive|teaching|reinforcement|response|crisis)_\d{2}$/;
const COMPONENTS = new Set(['Prevent', 'Teach', 'Reinforce', 'Respond', 'Crisis']);
const ERROR_TYPES = new Set(['none', 'missed_prevention_opportunity', 'missed_teaching_opportunity', 'missed_reinforcement_opportunity', 'missed_active_ingredient', 'timing_or_delay', 'contingency_mismatch', 'function_mismatch', 'reinforces_target_pattern', 'vague_or_nonspecific_response', 'public_or_attention_heavy_correction', 'other_needs_review']);
const FUNCTIONS = new Set(['attention', 'escape', 'tangible', 'automatic', 'multiple', 'unclear']);
export const RESOURCE_SECTIONS = Object.freeze({ bip: 'BIP at a Glance', functionForest: 'Function Forest', prevention: 'Prevention Palace', replacement: 'Replacement Reservoir', reinforcement: 'Reinforcement Ridge', errorCorrection: 'Error Correction Canyon', library: 'BSP Library', coaching: 'Coaching Cottage', fidelity: 'Fidelity Fortress' });
const ALLOWED_BLOCKS = new Set(['paragraph', 'list', 'definitionList', 'callout']);
const FORBIDDEN_FIELD = /(?:^on[a-z]+$|script|html|href|src|url|uri|(?:^|_)(?:path|file)(?:$|_)|(?:file|path)(?:name)?$|executable|command)/i;
const HTML = /<\s*\/?\s*(?:script|iframe|object|embed|style|[a-z][\w-]*)\b|javascript\s*:|\bon(?:click|load|error|mouse\w*|key\w*|submit|focus|blur)\s*=/i;
const PRIVACY = { email: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, phone: /(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]\d{3}[\s.-]\d{4}\b/, url: /\b(?:https?:\/\/|www\.)\S+/i, 'full date': /\b(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4})\b/i };
const substantive = value => typeof value === 'string' && value.trim().length > 0;
const missionValue = row => row?.mission || row?.mission_json || row?.draft || row?.content || null;
const targetKey = target => target?.target_key || target?.key;
const supportedSetup = setup => ({ schemaVersion: 1, bipBriefing: typeof setup?.bipBriefing === 'string' ? setup.bipBriefing : '' });

export function buildFullDraftSnapshot(workspace) {
  const root = Array.isArray(workspace) ? workspace[0] : workspace || {};
  const caseRow = root.case || root;
  const rows = root.missions || root.mission_drafts || root.latest_mission_drafts || [];
  const missions = { daily: [], wild: [], crisis: [] };
  for (const row of rows) if (missions[row?.mission_type]) missions[row.mission_type].push({ slotNumber: Number(row.slot_number), mission: missionValue(row), row });
  for (const list of Object.values(missions)) list.sort((a, b) => a.slotNumber - b.slotNumber);
  return {
    caseCode: caseRow.case_code || root.case_code || '', studentAlias: caseRow.student_alias || root.student_alias || '',
    hasCrisisPlan: Boolean(root.has_crisis_plan ?? caseRow.has_crisis_plan),
    setupRevisionExists: Boolean(root.setup_draft || root.latest_setup_draft),
    resourceRevisionExists: Boolean(root.resource_draft || root.latest_resource_draft),
    setup: root.setup_draft || root.latest_setup_draft ? supportedSetup(root.setup_draft?.setup || root.latest_setup_draft?.setup) : null,
    resources: root.resource_draft?.resources || root.latest_resource_draft?.resources || null,
    missions, activeFidelityTargets: root.fidelity_targets || root.active_fidelity_targets || []
  };
}

export function buildFullDraftPayload(workspace, publishedConfig = {}) {
  const snapshot = buildFullDraftSnapshot(workspace);
  if (!snapshot.resourceRevisionExists) throw new Error('No saved Resource Map draft exists for Full Draft QA.');
  const setup = snapshot.setup || {};
  return {
    config: Object.assign(Object.fromEntries(Object.entries(publishedConfig).filter(([key]) => key !== 'weeklyTeacherReport')), { studentAlias: snapshot.studentAlias, bipBriefing: setup.bipBriefing || '' }),
    resources: { ...structuredClone(snapshot.resources), studentAlias: snapshot.studentAlias },
    daily_missions: snapshot.missions.daily.map(item => item.mission), wildcard_missions: snapshot.missions.wild.map(item => item.mission), crisis_missions: snapshot.missions.crisis.map(item => item.mission), version: null
  };
}

export function validateMissionStructure(groups) {
  const errors = [], seen = new Set();
  const add = (rule, mission, details = {}) => errors.push({ rule, mission_id: mission?.id, ...details });
  for (const missions of Object.values(groups)) for (const mission of missions || []) {
    if (!mission?.id || seen.has(mission.id)) add('duplicate_mission_id', mission); else seen.add(mission.id);
    const steps = mission?.steps || {};
    if (!mission?.start || !steps[mission.start]) add('missing_start_step', mission, { start: mission?.start });
    for (const [stepId, step] of Object.entries(steps)) {
      const choices = Object.values(step?.choices || {}), scores = choices.map(choice => choice?.score).sort((a, b) => a - b);
      if (choices.length !== 3) add('incorrect_decision_count', mission, { step_id: stepId, actual: choices.length });
      if (scores.length !== 3 || scores[0] !== 0 || scores[1] !== 5 || scores[2] !== 10) add('invalid_score_set', mission, { step_id: stepId, scores });
      const key = step?.meta?.fidelityTargetKey;
      if (key !== undefined && (typeof key !== 'string' || !KEY_PATTERN.test(key))) add('invalid_fidelity_key', mission, { step_id: stepId });
      for (const choice of choices) {
        if (choice?.next && !steps[choice.next]) add('unresolved_next', mission, { step_id: stepId, next: choice.next });
        if (choice?.ending !== undefined) {
          if (choice.next) add('nonterminal_ending', mission, { step_id: stepId });
          if (!ENDINGS.has(choice.ending)) add('invalid_ending_key', mission, { step_id: stepId });
          if (!mission.endings?.[choice.ending]) add('missing_referenced_ending', mission, { step_id: stepId });
        }
      }
    }
    if (!mission?.start || !steps[mission.start]) continue;
    const expected = Number(mission.expectedSteps);
    const visit = (id, depth, stack) => {
      if (stack.has(id)) return add('loop', mission, { step_id: id });
      if (!steps[id]) return;
      const nextStack = new Set(stack).add(id);
      for (const choice of Object.values(steps[id].choices || {})) choice.next ? visit(choice.next, depth + 1, nextStack) : (!Number.isInteger(expected) || depth !== expected) && add('incorrect_playthrough_length', mission, { step_id: id, expected, actual: depth });
    };
    visit(mission.start, 1, new Set());
  }
  return { valid: errors.length === 0, errors };
}

function validateResources(resources, alias) {
  const errors = [], warnings = [], error = (rule, path, message) => errors.push({ rule, path, message }), warning = (rule, path, message) => warnings.push({ rule, path, message });
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  if (!object(resources)) return { errors: [{ rule: 'resources_object', path: 'Resource Map', message: 'Add and save a Resource Map.' }], warnings };
  if (resources.schemaVersion !== 1) error('schema_version', 'Resource Map', 'Resource Map schemaVersion must be 1.');
  if (resources.studentAlias !== alias) error('alias_consistency', 'Resource Map', 'Resource Map alias does not match the authoritative case alias.');
  for (const [key, title] of Object.entries(RESOURCE_SECTIONS)) {
    const section = resources.sections?.[key], path = `Resource Map → ${title}`;
    if (!object(section)) { error('required_section', path, `${title} is missing.`); continue; }
    if (section.title !== title) error('canonical_title', path, `${title} must use its canonical title.`);
    if (!Array.isArray(section.blocks) || !section.blocks.length) { error('substantive_blocks', path, `${title} is empty.`); continue; }
    section.blocks.forEach((block, index) => {
      const blockPath = `${path} → Block ${index + 1}`;
      if (!object(block) || !ALLOWED_BLOCKS.has(block.type)) return error('block_type', blockPath, 'Remove the unsupported Resource Map block.');
      if (block.type === 'paragraph' && !substantive(block.text)) error('paragraph_text', blockPath, 'Add paragraph text.');
      if (block.type === 'list' && (!Array.isArray(block.items) || !block.items.length || block.items.some(item => !substantive(item)))) error('list_items', blockPath, 'Complete every list item.');
      if (block.type === 'definitionList' && (!Array.isArray(block.items) || !block.items.length || block.items.some(item => !object(item) || !substantive(item.term) || !substantive(item.definition)))) error('definition_list_items', blockPath, 'Complete every definition term and definition.');
      if (block.type === 'callout' && (!substantive(block.label) || !substantive(block.text))) error('callout_fields', blockPath, 'Complete the callout label and text.');
    });
  }
  const scan = (value, path) => {
    if (typeof value === 'string') { if (HTML.test(value)) error('raw_html_or_script', path, 'Remove raw HTML, script, or event-handler content.'); for (const [kind, pattern] of Object.entries(PRIVACY)) if (pattern.test(value)) warning(`privacy_${kind.replace(' ', '_')}`, path, `${kind} detected; human privacy review is required.`); return; }
    if (Array.isArray(value)) return value.forEach((item, index) => scan(item, `${path} → ${index + 1}`));
    if (!object(value)) return;
    for (const [key, child] of Object.entries(value)) { if (FORBIDDEN_FIELD.test(key)) error('unexpected_executable_or_path_field', path, `Remove unsupported field “${key}”.`); scan(child, path); }
  };
  scan(resources, 'Resource Map'); return { errors, warnings };
}

export function validateFullDraft(input) {
  const snapshot = input?.missions?.daily && input?.missions?.wild && input?.missions?.crisis ? input : buildFullDraftSnapshot(input);
  const categories = Object.fromEntries(['GAME SETUP', 'MISSION BANK', 'MISSION STRUCTURE', 'RESOURCE MAP', 'FIDELITY LINKS', 'PRIVACY & SAFETY'].map(name => [name, { errors: [], warnings: [] }]));
  const issue = (category, severity, message, path = '', action = null) => categories[category][severity === 'blocking' ? 'errors' : 'warnings'].push({ severity, message, path, action });
  const setup = snapshot.setup || {};
  if (!snapshot.setupRevisionExists) issue('GAME SETUP', 'blocking', 'Add and save Game Setup.', 'Game Setup', { type: 'setup' });
  if (!substantive(setup.bipBriefing)) issue('GAME SETUP', 'blocking', 'Add and save a BIP Briefing.', 'Game Setup → BIP Briefing', { type: 'setup' });
  const plainGroups = {};
  for (const [type, spec] of Object.entries(TYPES)) {
    const entries = snapshot.missions[type] || [], slots = new Map(entries.map(item => [item.slotNumber, item])); plainGroups[type === 'wild' ? 'wildcard' : type] = entries.map(item => item.mission).filter(Boolean);
    if (entries.length !== spec.count || slots.size !== spec.count) issue('MISSION BANK', 'blocking', `${spec.label}: ${slots.size} / ${spec.count} saved slots.`, spec.label);
    for (let slot = 1; slot <= spec.count; slot++) if (!slots.get(slot)?.mission) issue('MISSION BANK', 'blocking', `${spec.label} ${slot} — Not started.`, `${spec.label} ${slot}`, { type: 'mission', missionType: type, slot });
    for (const slot of slots.keys()) if (slot < 1 || slot > spec.count) issue('MISSION BANK', 'blocking', `${spec.label} has an invalid saved slot ${slot}.`, `${spec.label} ${slot}`);
  }
  for (const error of validateMissionStructure(plainGroups).errors) issue('MISSION STRUCTURE', 'blocking', `Correct ${error.rule.replaceAll('_', ' ')} in mission ${error.mission_id || '(missing ID)'}.`, error.step_id ? `${error.mission_id || 'Mission'} → ${error.step_id}` : error.mission_id || 'Mission');
  for (const [type, entries] of Object.entries(snapshot.missions)) for (const { slotNumber, mission } of entries) {
    if (!mission) continue;
    const missionPath = `${TYPES[type].label} ${slotNumber}`;
    const requireText = (value, label, message) => { if (!substantive(value)) issue('MISSION STRUCTURE', 'blocking', message, `${missionPath} → ${label}`, { type: 'mission', missionType: type, slot: slotNumber }); };
    requireText(mission.id, 'Mission ID', 'Add a mission ID.');
    requireText(mission.title, 'Mission Title', 'Add a mission title.');
    requireText(mission.routine, 'Routine', 'Add the mission routine.');
    if (mission.expectedSteps !== 5) issue('MISSION STRUCTURE', 'blocking', 'Mission playthroughs must contain exactly 5 decisions.', `${missionPath} → Expected Steps`, { type: 'mission', missionType: type, slot: slotNumber });
    if (!substantive(mission.start) || !mission.steps?.[mission.start]) issue('MISSION STRUCTURE', 'blocking', 'Choose a valid mission start step.', `${missionPath} → Start`, { type: 'mission', missionType: type, slot: slotNumber });
    for (const ending of ENDINGS) requireText(mission.endings?.[ending]?.text, `${ending} Ending`, `Add the ${ending} ending narrative.`);
    for (const [stepId, step] of Object.entries(mission.steps || {})) {
      const decision = /^d(\d+)/.exec(stepId)?.[1] || stepId;
      const stepPath = `${missionPath} → Decision ${decision}`;
      if (!substantive(step?.text)) issue('MISSION STRUCTURE', 'blocking', 'Add the scene text.', `${stepPath} → Scene`, { type: 'mission', missionType: type, slot: slotNumber });
      if (!substantive(step?.hint)) issue('MISSION STRUCTURE', 'blocking', 'Add a hint.', `${stepPath} → Hint`, { type: 'mission', missionType: type, slot: slotNumber });
      const choices = Object.values(step?.choices || {});
      if (choices.length !== 3) continue; // The structural finding already reports this once.
      for (const choice of choices) {
        const choicePath = `${stepPath} → Choice ${choice?.score ?? '?'}`;
        if (!substantive(choice?.text)) issue('MISSION STRUCTURE', 'blocking', 'Add the teacher action.', `${choicePath} → Teacher Action`, { type: 'mission', missionType: type, slot: slotNumber });
        if (!substantive(choice?.consequence)) issue('MISSION STRUCTURE', 'blocking', 'Add what happens next.', `${choicePath} → What Happens Next`, { type: 'mission', missionType: type, slot: slotNumber });
        if (!substantive(choice?.wizard)) issue('MISSION STRUCTURE', 'blocking', 'Add Wizard feedback.', `${choicePath} → Wizard Feedback`, { type: 'mission', missionType: type, slot: slotNumber });
        if (!substantive(choice?.feedback)) issue('MISSION STRUCTURE', 'blocking', 'Add the behavioral explanation.', `${choicePath} → Behavioral Explanation`, { type: 'mission', missionType: type, slot: slotNumber });
        const meta = choice?.meta;
        if (!meta || typeof meta !== 'object' || Array.isArray(meta)) issue('MISSION STRUCTURE', 'blocking', 'Add canonical choice metadata.', `${choicePath} → Metadata`, { type: 'mission', missionType: type, slot: slotNumber });
        else {
          if (!substantive(meta.bipComponent) || !COMPONENTS.has(meta.bipComponent)) issue('MISSION STRUCTURE', 'blocking', 'Choose a canonical BIP component.', `${choicePath} → BIP Component`, { type: 'mission', missionType: type, slot: slotNumber });
          if (!substantive(meta.mechanism)) issue('MISSION STRUCTURE', 'blocking', 'Add the choice mechanism.', `${choicePath} → Mechanism`, { type: 'mission', missionType: type, slot: slotNumber });
          if (!substantive(meta.errorType) || !ERROR_TYPES.has(meta.errorType)) issue('MISSION STRUCTURE', 'blocking', 'Choose a canonical Error Type.', `${choicePath} → Error Type`, { type: 'mission', missionType: type, slot: slotNumber });
          if (!substantive(meta.function) || !FUNCTIONS.has(meta.function)) issue('MISSION STRUCTURE', 'blocking', 'Choose a canonical behavior function.', `${choicePath} → Function`, { type: 'mission', missionType: type, slot: slotNumber });
        }
      }
    }
  }
  const injectedResources = snapshot.resources && { ...structuredClone(snapshot.resources), studentAlias: snapshot.studentAlias };
  const resourceReport = validateResources(injectedResources, snapshot.studentAlias);
  resourceReport.errors.forEach(item => issue('RESOURCE MAP', 'blocking', item.message, item.path)); resourceReport.warnings.forEach(item => issue('PRIVACY & SAFETY', 'warning', item.message, item.path));
  const manifest = new Map(snapshot.activeFidelityTargets.map(target => [targetKey(target), target]));
  const coverage = new Map();
  for (const [type, entries] of Object.entries(snapshot.missions)) for (const { slotNumber, mission } of entries) for (const [stepId, step] of Object.entries(mission?.steps || {})) {
    const location = `${TYPES[type].label} ${slotNumber} → ${stepId}`;
    const stepKey = step?.meta?.fidelityTargetKey, stepKeys = step?.meta?.fidelityTargetKeys;
    if (Array.isArray(stepKey) || stepKeys !== undefined) issue('FIDELITY LINKS', 'blocking', 'Only one primary fidelity target may be linked to a decision.', location);
    if (stepKey && !KEY_PATTERN.test(stepKey)) issue('FIDELITY LINKS', 'blocking', 'Correct the malformed fidelity target key.', location);
    else if (stepKey && !manifest.has(stepKey)) issue('FIDELITY LINKS', 'blocking', `Fidelity target ${stepKey} is not active for this case.`, location);
    else if (stepKey) {
      const domain = stepKey.split('_')[0], approvedDomain = manifest.get(stepKey)?.domain;
      if (approvedDomain && approvedDomain !== domain) issue('FIDELITY LINKS', 'blocking', `Fidelity target ${stepKey} does not match its approved domain.`, location);
      const item = coverage.get(stepKey) || { count: 0, missions: new Map() }; item.count++; item.missions.set(mission.id, (item.missions.get(mission.id) || 0) + 1); coverage.set(stepKey, item);
      if (!snapshot.hasCrisisPlan && stepKey.startsWith('crisis_')) issue('PRIVACY & SAFETY', 'blocking', 'A crisis fidelity target cannot be used without a formal crisis plan.', location);
    }
    for (const [choiceKey, choice] of Object.entries(step.choices || {})) {
      if (choice?.meta?.fidelityTargetKey !== undefined || choice?.meta?.fidelityTargetKeys !== undefined) issue('FIDELITY LINKS', 'blocking', 'Move legacy choice-level fidelity linkage to the decision step.', `${location} → Choice ${choiceKey}`);
      if (!snapshot.hasCrisisPlan && choice?.meta?.bipComponent === 'Crisis') issue('PRIVACY & SAFETY', 'blocking', 'Crisis BIP-component metadata requires a formal crisis plan.', `${location} → Choice ${choiceKey}`);
    }
  }
  for (const [key] of manifest) { const item = coverage.get(key); if (!item) issue('FIDELITY LINKS', 'warning', `Approved target ${key} is never linked; researcher review is required.`, key); else { if (item.count < 3) issue('FIDELITY LINKS', 'warning', `Target ${key} is linked fewer than 3 times.`, key); if (item.missions.size === 1) issue('FIDELITY LINKS', 'warning', `Target ${key} appears in only one mission.`, key); for (const [missionId, count] of item.missions) if (count > 2) issue('FIDELITY LINKS', 'warning', `Target ${key} is over-concentrated in mission ${missionId}.`, key); } }
  const pathLabel = key => ({ bipBriefing: 'BIP Briefing', text: 'Scene / Text', hint: 'Hint', consequence: 'Consequence', wizard: 'Wizard', feedback: 'Feedback', title: 'Title', focus: 'Focus', routine: 'Routine', steps: 'Decisions', choices: 'Choice', endings: 'Ending' })[key] || key;
  const scanAuthored = (value, path) => { if (typeof value === 'string') { if (HTML.test(value)) issue('PRIVACY & SAFETY', 'blocking', 'Remove raw HTML, script, or event-handler content.', path); for (const [kind, pattern] of Object.entries(PRIVACY)) if (pattern.test(value)) issue('PRIVACY & SAFETY', 'warning', `${kind} detected; human privacy review is required.`, path); } else if (Array.isArray(value)) value.forEach((item, index) => scanAuthored(item, `${path} → ${index + 1}`)); else if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) if (!['id', 'next', 'fidelityTargetKey', 'fidelityTargetKeys'].includes(key)) scanAuthored(child, `${path} → ${pathLabel(key)}`); };
  scanAuthored(setup, 'Game Setup'); for (const [type, entries] of Object.entries(snapshot.missions)) entries.forEach(({ slotNumber, mission }) => scanAuthored(mission, `${TYPES[type].label} ${slotNumber}`));
  issue('PRIVACY & SAFETY', 'warning', snapshot.hasCrisisPlan ? 'Human crisis/safety review required before publishing.' : 'No formal crisis plan is recorded. Crisis missions must begin from a safe point or after required safety actions have already occurred under existing school procedures.', 'Crisis safety');
  const blockingCount = Object.values(categories).reduce((sum, category) => sum + category.errors.length, 0), warningCount = Object.values(categories).reduce((sum, category) => sum + category.warnings.length, 0);
  return { ready: blockingCount === 0, blockingCount, warningCount, categories, snapshot };
}
