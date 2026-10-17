import { reviewApprovedImport, sameJson } from './approved-draft-import.mjs';

const requireValid = (condition, message) => { if (!condition) throw new Error(message); };
const plain = value => value && typeof value === 'object' && !Array.isArray(value);
const SCENES = ['d1_start', ...[2,3,4,5].flatMap(n => ['supported','wobbly','escalated'].map(s => 'd' + n + '_' + s))];
const ENDINGS = ['STRONG','MIXED','FRAGILE'];
const latestRows = workspace => workspace?.missions || workspace?.mission_drafts || workspace?.latest_mission_drafts || [];

function missionFromFile(payload) {
  requireValid(plain(payload), 'Expected one complete Mission: Reinforceable JSON object.');
  if (plain(payload.mission)) {
    return { mission: payload.mission, envelope: payload };
  }
  requireValid(plain(payload.steps) && typeof payload.id === 'string',
    'This file is not a complete mission JSON. Select the full daily-2.json / crisis-2.json, or use the existing researcher-review patch importer for patch files.');
  return { mission: payload, envelope: null };
}

function changedPaths(a, b, path = '', found = []) {
  if (sameJson(a, b)) return found;
  if (plain(a) && plain(b)) {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      changedPaths(a[key], b[key], path ? path + '.' + key : key, found);
    }
  } else {
    found.push(path);
  }
  return found;
}

function verifyGraph(mission) {
  const seen = new Set(), endings = new Set();
  let paths = 0;
  function traverse(sceneId, depth) {
    const scene = mission.steps[sceneId];
    requireValid(plain(scene), 'Unknown destination ' + sceneId);
    seen.add(sceneId);
    for (const choice of Object.values(scene.choices)) {
      if (depth === 5) {
        requireValid(choice.next == null && ENDINGS.includes(choice.ending), 'Invalid final destination from ' + sceneId);
        endings.add(choice.ending);
        paths += 1;
      } else {
        requireValid(mission.steps[choice.next] && choice.next.startsWith('d' + (depth + 1) + '_'),
          'Invalid next-scene destination from ' + sceneId);
        traverse(choice.next, depth + 1);
      }
    }
  }
  traverse('d1_start', 1);
  requireValid(paths === 243 && seen.size === 13 && endings.size === 3,
    'Mission routes must reach all 13 scenes and all 3 endings across 243 paths.');
  return { paths, scenes: seen.size, endings: [...endings].sort() };
}

/**
 * Review a complete private existing-slot mission JSON. Does not write data.
 * It uses the same canonical field validation as the new-slot importer, but
 * binds to the exact already-saved mission ID and latest revision.
 */
export function prepareFullMissionDraftRevision(payload, workspace) {
  requireValid(plain(workspace?.case) && workspace.case.id && workspace.case.case_code,
    'An authenticated Research Admin case must be selected first.');
  const { mission: uploaded, envelope } = missionFromFile(payload);
  if (envelope) {
    if (envelope.case_code != null) requireValid(envelope.case_code === workspace.case.case_code, 'Uploaded case_code does not match the selected case.');
    if (envelope.case_id != null) requireValid(envelope.case_id === workspace.case.id, 'Uploaded case_id does not match the selected case.');
  }
  const matches = latestRows(workspace).filter(row => row?.mission?.id === uploaded.id);
  requireValid(matches.length === 1,
    'This complete mission ID does not match exactly one existing draft in the selected case. It cannot be imported into a different mission or new slot.');
  const row = matches[0], type = row.mission_type, slot = Number(row.slot_number);
  if (envelope) {
    if (envelope.mission_type != null) requireValid(envelope.mission_type === type, 'Mission type does not match saved slot.');
    if (envelope.slot_number != null) requireValid(Number(envelope.slot_number) === slot, 'Mission slot does not match saved slot.');
    if (envelope.expected_revision_id != null) requireValid(envelope.expected_revision_id === (row.revision_id || row.id),
      'This JSON was based on a different saved revision. Re-fetch the newest mission before reviewing.');
  }
  requireValid(row.revision_id || row.id, 'The current saved revision ID was not returned. Stop before saving.');
  requireValid(plain(uploaded.authoringMeta) && plain(uploaded.authoringMeta.qualityReview),
    'Full revised missions must include authoringMeta.qualityReview.');
  const existing = row.mission;
  requireValid(existing.start === 'd1_start' && existing.expectedSteps === 5, 'The saved mission has an unexpected schema.');
  requireValid(existing.id === uploaded.id, 'Mission identity must not change.');
  // Work may paraphrase provenance metadata while authoring. The actual
  // case's saved status is authoritative; NEVER let an uploaded file promote
  // provisional intake content into an approved/plan-verified state.
  const suppliedStatus = String(uploaded.authoringMeta.sourceStatus || '');
  const authoritativeStatus = String(existing.authoringMeta?.sourceStatus || '');
  requireValid(authoritativeStatus.trim() && suppliedStatus.trim(),
    'Both saved and uploaded missions need sourceStatus provenance. Do not guess missing research status.');
  requireValid(!/\\b(?:live|plan.verified|bsp.verified|clinically.approved|clinically.verified)\\b/i.test(suppliedStatus)
    || /\\b(?:provisional|intake.only|qa)\\b/i.test(suppliedStatus),
    'Uploaded sourceStatus claims verified/live clinical approval. This must be reconciled separately, not imported.');
  const provenanceNormalized = suppliedStatus !== authoritativeStatus;
  const correctedUpload = structuredClone(uploaded);
  correctedUpload.authoringMeta.sourceStatus = authoritativeStatus;
  for (const ending of ENDINGS) requireValid(
    typeof uploaded.endings?.[ending]?.summary === 'string' && uploaded.endings[ending].summary.trim(),
    'Missing short Results summary: endings.' + ending + '.summary');
  const targets = (workspace.fidelity_targets || []).filter(target => target.active !== false);
  const rows = reviewApprovedImport({
    schemaVersion: 1, case_id: workspace.case.id, case_code: workspace.case.case_code,
    missions: [{ mission_type: type, slot_number: slot, mission: correctedUpload }]
  }, { ...workspace, fidelity_targets: targets });
  const revised = rows[0].mission;
  for (const sceneId of SCENES) {
    const savedStep = existing.steps?.[sceneId], nextStep = revised.steps[sceneId];
    requireValid(plain(savedStep) && plain(nextStep), 'Existing or revised scene missing: ' + sceneId);
    requireValid(nextStep.meta?.fidelityTargetKey && targets.some(t => t.target_key === nextStep.meta.fidelityTargetKey),
      'An active exact fidelity target is required for ' + sceneId);
  }
  const routes = verifyGraph(revised);
  revised.authoringMeta = { ...revised.authoringMeta, qualityReview: {
    ...revised.authoringMeta.qualityReview, behavioral: false, gameDesign: false
  }};
  const changes = changedPaths(existing, revised);
  requireValid(changes.length > 0, 'The uploaded mission matches the saved draft. There is nothing new to save.');
  const routeChanges = changes.filter(path => /\.choices\.[ABC]\.(next|ending)$/.test(path));
  const scoreChanges = changes.filter(path => /\.choices\.[ABC]\.score$/.test(path));
  requireValid(scoreChanges.length === 0, 'The scoring contract cannot be changed through full mission import.');
  return {
    case_id: workspace.case.id, case_code: workspace.case.case_code,
    mission_type: type, slot_number: slot, expected_revision_id: row.revision_id || row.id,
    original: structuredClone(existing), mission: revised, changes, routeChanges,
    provenanceNormalized, fullMissionReview: true, graph: routes
  };
}

export function reviewSummary(prepared) {
  const changes = prepared.changes;
  const category = test => changes.filter(test).length;
  return [
    'REVIEW COMPLETE MISSION — NO SAVE HAS OCCURRED',
    prepared.mission_type.toUpperCase() + ' ' + prepared.slot_number + ': ' + prepared.mission.title,
    'Current saved revision: ' + prepared.expected_revision_id,
    'Changes: ' + changes.length + ' complete JSON fields',
    'Scene text: ' + category(x => /^steps\.d\d_[a-z]+\.text$/.test(x)),
    'Choice text/consequence/Wizard/feedback: ' + category(x => /\.choices\.[ABC]\.(text|consequence|wizard|feedback)$/.test(x)),
    'Branch/ending destinations: ' + prepared.routeChanges.length,
    'Other fields (hints, targets, metadata, endings): ' + category(x => !/^steps\.d\d_[a-z]+\.text$/.test(x) && !/\.choices\.[ABC]\.(text|consequence|wizard|feedback)$/.test(x) && !/\.choices\.[ABC]\.(next|ending)$/.test(x)),
    'Graph: ' + prepared.graph.scenes + ' scenes, 39 choices, ' + prepared.graph.paths + ' complete paths, 3 endings.',
    'Researcher behavioral and game-design flags will remain FALSE.',
    prepared.provenanceNormalized
      ? 'Provenance normalized: AI sourceStatus wording was ignored; the saved case\'s authoritative provisional status will be retained.'
      : 'Existing authoritative sourceStatus preserved unchanged.',
    'Saving will create a new private QA DRAFT only, never publish or enable teacher access.',
    prepared.routeChanges.length ? 'CAUTION — ROUTING CHANGES require deliberate behavioral review: ' + prepared.routeChanges.join(', ') : 'No routing changes.',
    '',
    'This check validates structure, not natural language, BSP fidelity, clinical safety, or narrative continuity.',
    'Changed JSON paths (first 65):',
    ...changes.slice(0, 65).map(x => ' • ' + x),
    changes.length > 65 ? ' • ... ' + (changes.length - 65) + ' additional changes' : ''
  ].join('\n');
}
