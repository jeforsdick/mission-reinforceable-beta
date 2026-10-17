import { sameJson } from './approved-draft-import.mjs';

const requireValid = (ok, message) => { if (!ok) throw new Error(message); };
const plain = v => v && typeof v === 'object' && !Array.isArray(v);
const ONLY_SCENES = ['d1_start', ...[2, 3, 4, 5].flatMap(d => ['supported', 'wobbly', 'escalated'].map(state => `d${d}_${state}`))];
const SAME_KEYS = (value, expected) => sameJson(Object.keys(value || {}).sort(), expected.slice().sort());
const cleanText = (value, location) => {
  requireValid(typeof value === 'string' && value.trim() && value.length <= 4000, location + ': missing or oversized text.');
  return value.trim();
};
const latest = (workspace, type, slot) => (workspace?.missions || workspace?.mission_drafts || workspace?.latest_mission_drafts || [])
  .find(row => row.mission_type === type && Number(row.slot_number) === Number(slot));

/**
 * Converts a *case-scoped, reviewed changeset* into one complete mission.
 * Never accepts a replacement mission or publishes it. Unmodified fields
 * (feedback, wizard, metadata, artwork, endings and identity) are preserved.
 */
export function prepareExistingDraftRevision(payload, workspace) {
  requireValid(plain(payload) && payload.kind === 'researcher_review_patch_NOT_A_SAVED_DRAFT',
    'Choose a Mission: Reinforceable researcher-review patch, not a whole-game import.');
  requireValid(payload.status === 'draft_for_researcher_review_NOT_SAVED', 'Patch must be an unsaved review draft.');
  requireValid(plain(workspace?.case) && payload.case_code === workspace.case.case_code,
    'Patch case code does not match the selected Research Admin case.');
  requireValid(['daily','wild','crisis'].includes(payload.mission_type), 'Unknown mission type.');
  const maxSlot = payload.mission_type === 'daily' ? 10 : 5;
  requireValid(Number.isInteger(payload.slot_number) && payload.slot_number >= 1 && payload.slot_number <= maxSlot,
    'Invalid mission slot.');
  const row = latest(workspace, payload.mission_type, payload.slot_number);
  requireValid(row && plain(row.mission), 'The selected mission does not have a saved draft to revise.');
  const current = row.mission;
  requireValid(current.id === payload.mission_id && current.title === payload.title,
    'Patch mission identity does not match the latest saved draft.');
  requireValid(current.start === 'd1_start' && current.expectedSteps === 5 && SAME_KEYS(current.steps, ONLY_SCENES),
    'Saved mission does not have the expected canonical 13-scene structure.');
  requireValid(plain(payload.scenes) && SAME_KEYS(payload.scenes, ONLY_SCENES),
    'Patch must contain exactly the same 13 canonical scenes; no missing or extra scenes.');
  const revised = structuredClone(current), changes = [];
  const activeTargets = new Set((workspace.fidelity_targets || []).filter(t => t.active === true).map(t => t.target_key));
  for (const sceneId of ONLY_SCENES) {
    const target = revised.steps[sceneId];
    const patch = payload.scenes[sceneId];
    requireValid(plain(patch) && plain(patch.choices) && SAME_KEYS(patch.choices, ['A','B','C']),
      sceneId + ': patch requires three complete choices.');
    requireValid(typeof patch.text === 'string' && patch.text.trim(), sceneId + ': scene text missing.');
    const nextText = cleanText(patch.text, sceneId);
    if (nextText !== target.text) { target.text = nextText; changes.push(sceneId + ': scene'); }
    if (patch.hint_override != null) {
      const hint = cleanText(patch.hint_override, sceneId + '/hint');
      if (hint !== target.hint) { target.hint = hint; changes.push(sceneId + ': hint'); }
    }
    if (patch.meta_override != null) {
      requireValid(plain(patch.meta_override) && SAME_KEYS(patch.meta_override, ['fidelityTargetKey']),
        sceneId + ': only fidelity target linkage may be reviewed through this patch.');
      const key = cleanText(patch.meta_override.fidelityTargetKey, sceneId + '/fidelity');
      requireValid(activeTargets.has(key), sceneId + ': fidelity target is not active in the case.');
      if (key !== target.meta?.fidelityTargetKey) {
        target.meta = { ...(target.meta || {}), fidelityTargetKey: key };
        changes.push(sceneId + ': fidelity target');
      }
    }
    for (const [choiceKey, expectedScore] of [['A',10],['B',5],['C',0]]) {
      const originalChoice = current.steps[sceneId].choices[choiceKey];
      const updatedChoice = target.choices[choiceKey];
      const edited = patch.choices[choiceKey];
      requireValid(plain(edited) && Number(edited.score) === expectedScore
        && originalChoice.score === expectedScore, sceneId + '/' + choiceKey + ': scoring mismatch.');
      const expectedNext = Number(sceneId[1]) === 5 ? originalChoice.ending : originalChoice.next;
      requireValid(edited.next_or_ending === expectedNext,
        sceneId + '/' + choiceKey + ': routing changed; patch cannot alter choices or ending destinations.');
      const consequence = cleanText(edited.consequence, sceneId + '/' + choiceKey + '/consequence');
      if (consequence !== originalChoice.consequence) {
        updatedChoice.consequence = consequence;
        changes.push(sceneId + '/' + choiceKey + ': consequence');
      }
      if (edited.choice_text_override != null) {
        const choice = cleanText(edited.choice_text_override, sceneId + '/' + choiceKey + '/choice');
        if (choice !== originalChoice.text) {
          updatedChoice.text = choice;
          changes.push(sceneId + '/' + choiceKey + ': choice text');
        }
      }
    }
  }
  requireValid(changes.length > 0, 'No changes were found; nothing to save.');
  // A revised scenario must be reviewed again. Never carry a former clinical
  // quality checkmark forward merely because the original draft had one.
  if (revised.authoringMeta?.qualityReview) {
    revised.authoringMeta.qualityReview = { ...revised.authoringMeta.qualityReview,
      behavioral: false, gameDesign: false };
    changes.push('mission-level behavioral and game-design review reset');
  }
  return {
    case_id: workspace.case.id,
    case_code: workspace.case.case_code,
    mission_type: payload.mission_type, slot_number: payload.slot_number,
    expected_revision_id: row.revision_id || row.id,
    original: structuredClone(current), mission: revised, changes,
    review_flags: Array.isArray(payload.review_flags) ? payload.review_flags.filter(v => typeof v === 'string') : []
  };
}

/** Must use the normal authenticated Research Admin RPC provided by the caller. */
export async function saveReviewedDraftRevision(prepared, readWorkspace, saveMission) {
  const workspace = await readWorkspace();
  requireValid(workspace?.case?.id === prepared.case_id && workspace.case.case_code === prepared.case_code,
    'Selected Research Admin case changed; reload before saving.');
  const existing = latest(workspace, prepared.mission_type, prepared.slot_number);
  requireValid(existing && (existing.revision_id || existing.id) === prepared.expected_revision_id
    && sameJson(existing.mission, prepared.original),
    'This saved mission changed since patch review; reload, compare revisions, and try again.');
  const id = await saveMission(prepared);
  const verified = latest(await readWorkspace(), prepared.mission_type, prepared.slot_number);
  requireValid(verified && (verified.revision_id || verified.id) === id
    && sameJson(verified.mission, prepared.mission),
    'Revision was submitted but exact saved read-back failed. Stop and inspect Research Admin.');
  return { revision_id: id, changes: prepared.changes.length };
}
