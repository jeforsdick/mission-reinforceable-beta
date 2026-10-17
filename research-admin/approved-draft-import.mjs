const slots = { daily: 10, wild: 5, crisis: 5 };
const states = ['supported', 'wobbly', 'escalated'];
const endings = ['STRONG', 'MIXED', 'FRAGILE'];
const object = v => v && typeof v === 'object' && !Array.isArray(v);
const requireValue = (ok, message) => { if (!ok) throw new Error(message); };
export function sameJson(a, b) {
  const canonical = v => Array.isArray(v) ? v.map(canonical) : object(v)
    ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}
export function reviewApprovedImport(payload, workspace) {
  requireValue(object(payload) && payload.schemaVersion === 1, 'Import schemaVersion must be 1.');
  requireValue(payload.case_id === workspace?.case?.id && payload.case_code === workspace?.case?.case_code, 'Import must match the selected case ID and code.');
  requireValue(Array.isArray(payload.missions) && payload.missions.length > 0 && payload.missions.length <= 20, 'Import requires 1–20 missions.');
  const targetKeys = new Set((workspace.fidelity_targets || []).map(t => t.target_key));
  const occupied = new Set(), ids = new Set();
  for (const row of payload.missions) {
    const { mission_type: type, slot_number: slot, mission: m } = row;
    requireValue(slots[type] && Number.isInteger(slot) && slot >= 1 && slot <= slots[type], 'Invalid mission type or slot.');
    const slotKey = `${type}:${slot}`;
    requireValue(!occupied.has(slotKey), 'Duplicate mission slot.'); occupied.add(slotKey);
    // Imported Work-authored missions use CASE-069_DAILY_02, while the
    // built-in Research Admin authoring form uses CASE069_D02. Both are
    // case-scoped identifiers; no cross-case ID is permitted.
    const casePrefix = String(payload.case_code).toUpperCase().replace(/[^A-Z0-9]/g,'');
    requireValue(object(m) && typeof m.id === 'string'
      && (m.id.startsWith(payload.case_code + '_') || m.id.startsWith(casePrefix + '_'))
      && !ids.has(m.id), 'Mission ID must be unique and case-scoped.'); ids.add(m.id);
    requireValue(m.expectedSteps === 5 && m.start === 'd1_start' && object(m.steps), 'Mission must have five decisions and a canonical start.');
    const expected = ['d1_start', ...[2,3,4,5].flatMap(d => states.map(s => `d${d}_${s}`))];
    requireValue(sameJson(Object.keys(m.steps).sort(), expected.sort()), `${slotKey}: exactly 13 canonical scenes required.`);
    requireValue(typeof m.title === 'string' && m.title.trim() && object(m.endings), `${slotKey}: title and endings required.`);
    for (const ending of endings) requireValue(m.endings[ending]?.text?.trim() && m.endings[ending]?.wizard?.trim(), `${slotKey}: complete endings required.`);
    for (const [id, scene] of Object.entries(m.steps)) {
      requireValue(scene.text?.trim() && scene.hint?.trim(), `${slotKey}/${id}: scene and hint required.`);
      requireValue(!scene.meta?.fidelityTargetKey || targetKeys.has(scene.meta.fidelityTargetKey), `${slotKey}/${id}: inactive or unknown fidelity target.`);
      requireValue(object(scene.choices) && sameJson(Object.keys(scene.choices).sort(), ['A','B','C']), `${slotKey}/${id}: three choices required.`);
      const decision = Number(id[1]);
      for (const [key, score] of [['A',10],['B',5],['C',0]]) {
        const c = scene.choices[key];
        requireValue(c.score === score && ['text','consequence','wizard','feedback'].every(k => typeof c[k] === 'string' && c[k].trim()), `${slotKey}/${id}/${key}: complete scored choice required.`);
        requireValue(object(c.meta) && ['bipComponent','mechanism','function'].every(k => typeof c.meta[k] === 'string' && c.meta[k].trim()), `${slotKey}/${id}/${key}: choice metadata required.`);
        requireValue(score !== 10 || !c.meta.errorType || c.meta.errorType === 'none', `${slotKey}/${id}/${key}: aligned choice cannot have error metadata.`);
        requireValue(decision === 5 ? c.next == null && endings.includes(c.ending) : states.some(s => c.next === `d${decision+1}_${s}`) && !c.ending, `${slotKey}/${id}/${key}: invalid route or ending.`);
      }
    }
  }
  return structuredClone(payload.missions);
}
export async function saveApprovedImport(rows, initialWorkspace, readWorkspace, saveMission, progress = () => {}) {
  const caseId = initialWorkspace.case.id;
  const saved = [];
  for (const row of rows) {
    const workspace = await readWorkspace();
    requireValue(workspace.case.id === caseId, 'Selected case changed. Import stopped.');
    const find = w => (w.missions || []).find(m => m.mission_type === row.mission_type && m.slot_number === row.slot_number);
    const initial = find(initialWorkspace), current = find(workspace);
    if (sameJson(current?.mission, row.mission)) { progress(row, 'Already saved'); continue; }
    requireValue((initial?.revision_id || null) === (current?.revision_id || null), 'Saved draft changed after import review. Reload and compare before importing.');
    // Existing content is never silently replaced by an import.
    requireValue(!current, 'This slot already contains a different draft. Compare and edit it before importing.');
    const revisionId = await saveMission(row);
    const verified = find(await readWorkspace());
    requireValue(verified?.revision_id === revisionId && sameJson(verified.mission, row.mission), 'Saved revision could not be verified. Import stopped.');
    saved.push({ mission_type: row.mission_type, slot_number: row.slot_number, revision_id: revisionId });
    progress(row, 'Saved and verified');
  }
  return saved;
}
