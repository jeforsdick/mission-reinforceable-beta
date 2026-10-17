import { reviewApprovedImport, saveApprovedImport, sameJson } from './approved-draft-import.mjs';
import { prepareFullMissionDraftRevision, reviewSummary, verifyGraph } from './full-mission-revision.mjs';
import { prepareExistingDraftRevision, saveReviewedDraftRevision } from './existing-draft-revision.mjs';

const requireValid = (ok, message) => { if (!ok) throw new Error(message); };
const object = v => !!v && typeof v === 'object' && !Array.isArray(v);
const VALID = { daily:10, wild:5, crisis:5 };

export function prepareMissionUpload(payload, workspace, selected) {
  requireValid(object(workspace?.case) && workspace.case.id && workspace.case.case_code,
    'Select a Research Admin case before reviewing a mission.');
  const type = selected?.mission_type, slot = Number(selected?.slot_number);
  requireValid(Number.isInteger(slot) && slot >= 1 && slot <= VALID[type],
    'Choose a Daily, Mystery or Crisis mission slot from the dropdown first.');
  const existing = (workspace.missions || []).find(r => r.mission_type === type && Number(r.slot_number) === slot);

  if (payload?.kind === 'researcher_review_patch_NOT_A_SAVED_DRAFT') {
    requireValid(!!existing,'A researcher-review patch can only update an existing saved mission.');
    requireValid(payload.mission_type === type && payload.slot_number === slot,
      'The uploaded patch identifies a DIFFERENT mission slot than the dropdown. Nothing was saved.');
    const prepared = prepareExistingDraftRevision(payload,workspace);
    return {
      kind: 'patch', prepared,
      case_id: workspace.case.id, case_code: workspace.case.case_code,
      mission_type: type, slot_number: slot, title: prepared.mission.title,
      expected_revision_id: prepared.expected_revision_id,
      report: [
        'REVIEW PATCH — NO SAVE HAS OCCURRED',
        type.toUpperCase() + ' ' + slot + ' — ' + prepared.mission.title,
        'Existing revision: ' + prepared.expected_revision_id,
        'Changes: ' + prepared.changes.length,
        ...prepared.changes.map(x => ' • ' + x),
        'Only after confirmation will a new researcher-only draft be saved.'
      ].join('\n')
    };
  }

  let mission, envelope = null;
  if (Array.isArray(payload?.missions)) {
    requireValid(payload.missions.length === 1,
      'This single-mission uploader accepts one mission per file. Export each mission separately.');
    requireValid(payload.case_id === workspace.case.id && payload.case_code === workspace.case.case_code,
      'Uploaded import envelope belongs to a different case.');
    const item = payload.missions[0];
    requireValid(item.mission_type === type && Number(item.slot_number) === slot,
      'The mission slot selected in the dropdown does not match the file.');
    mission = item.mission;
    envelope = payload;
  } else if (object(payload?.mission)) {
    mission = payload.mission;
    envelope = payload;
  } else {
    mission = payload;
  }
  requireValid(object(mission) && typeof mission.id === 'string',
    'Please select a complete mission JSON file, not a QA report or ZIP.');
  if (envelope) {
    if (envelope.case_code != null) requireValid(envelope.case_code === workspace.case.case_code,
      'The file belongs to a different case.');
    if (envelope.case_id != null) requireValid(envelope.case_id === workspace.case.id,
      'The file case ID does not match the selected case.');
    if (envelope.mission_type != null) requireValid(envelope.mission_type === type,
      'The file describes a different mission type.');
    if (envelope.slot_number != null) requireValid(Number(envelope.slot_number) === slot,
      'The file describes a different mission slot.');
  }
  const expectedId = workspace.case.case_code + '_' + type.toUpperCase() + '_' + String(slot).padStart(2,'0');
  requireValid(mission.id === expectedId,
    'Wrong mission for the selected slot. Choose ' + expectedId + ' in the dropdown, or upload its matching JSON.');
  if (existing) {
    requireValid(existing.mission?.id === mission.id,
      'The existing slot has a different case-scoped mission ID; do not overwrite it.');
    const prepared = prepareFullMissionDraftRevision(envelope && !Array.isArray(payload.missions)
      ? payload : mission,workspace);
    requireValid(prepared.mission_type === type && Number(prepared.slot_number) === slot,
      'The uploaded mission resolves to a different saved slot.');
    return {
      kind: 'existing', prepared, case_id:workspace.case.id, case_code:workspace.case.case_code,
      mission_type:type,slot_number:slot,title:prepared.mission.title,
      expected_revision_id:prepared.expected_revision_id,
      report:reviewSummary(prepared)
    };
  }

  requireValid(object(mission.authoringMeta) && object(mission.authoringMeta.qualityReview)
    && typeof mission.authoringMeta.sourceStatus === 'string' && mission.authoringMeta.sourceStatus.trim(),
    'New mission needs explicit sourceStatus and qualityReview metadata.');
  requireValid(!/\b(?:live|plan.verified|bsp.verified|clinically.approved|clinically.verified)\b/i.test(mission.authoringMeta.sourceStatus)
    || /\b(?:provisional|intake.only|qa)\b/i.test(mission.authoringMeta.sourceStatus),
    'Do not import a mission claiming unverified clinical/live approval.');
  const draft = structuredClone(mission);
  draft.authoringMeta.qualityReview.behavioral = false;
  draft.authoringMeta.qualityReview.gameDesign = false;
  const record = { mission_type:type, slot_number:slot, mission:draft };
  const validated = reviewApprovedImport({
    schemaVersion:1,case_id:workspace.case.id,case_code:workspace.case.case_code,missions:[record]
  },workspace);
  for (const [sceneId,scene] of Object.entries(draft.steps)) {
    requireValid(typeof scene.meta?.fidelityTargetKey === 'string' &&
      (workspace.fidelity_targets || []).some(t => t.target_key === scene.meta.fidelityTargetKey && t.active !== false),
      'Inactive/missing fidelity target in ' + sceneId);
  }
  const graph = verifyGraph(draft);
  requireValid(graph.paths === 243 && graph.scenes === 13 && graph.endings.length === 3,
    'Full mission path verification failed.');
  return {
    kind:'new',record:validated[0], initialWorkspace:workspace,
    case_id:workspace.case.id,case_code:workspace.case.case_code,
    mission_type:type,slot_number:slot,title:draft.title,expected_revision_id:null,
    report:[
      'REVIEW NEW MISSION — NO SAVE HAS OCCURRED',
      type.toUpperCase() + ' ' + slot + ' — ' + draft.title,
      'Target slot is empty. New case-scoped mission: ' + draft.id,
      'Valid canonical structure: 13 scenes, 39 choices, 243 routes and all 3 endings.',
      'Quality-review flags will be FALSE.',
      'Human clinical/safety and storyline review are still required.',
      'Saving creates a private QA DRAFT only—not a published game or teacher access.'
    ].join('\n')
  };
}

export async function saveMissionUpload(review, readWorkspace, saveMission) {
  if (review?.kind === 'new') {
    const { record, initialWorkspace } = review;
    const saved = await saveApprovedImport([record],initialWorkspace,readWorkspace,saveMission);
    requireValid(saved.length === 1, 'No new revision was written; reload the current mission to inspect it.');
    return { revision_id:saved[0].revision_id, changes:'new complete mission' };
  }
  requireValid(['existing','patch'].includes(review?.kind),'Review a valid mission first.');
  return saveReviewedDraftRevision(review.prepared,readWorkspace,saveMission);
}
