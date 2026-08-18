export const DOMAINS = ['proactive', 'teaching', 'reinforcement', 'response', 'crisis'];

export function normalizeTargets(targets, hasCrisis) {
  const source = Array.isArray(targets) ? targets : [];
  return DOMAINS.flatMap(domain => {
    if (domain === 'crisis' && !hasCrisis) return [];
    return source.filter(item => item && item.domain === domain && String(item.description || '').trim())
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
      .map((item, index) => ({
        domain,
        description: String(item.description).trim(),
        sort_order: index + 1,
        target_key: `${domain}_${String(index + 1).padStart(2, '0')}`
      }));
  });
}

export function accountState(rows, expectedRole) {
  if (!Array.isArray(rows) || rows.length !== 1) return { ready: false, label: 'Account not ready' };
  const row = rows[0];
  const allowedRole = row.role === expectedRole || (expectedRole === 'coach' && row.role === 'research_admin');
  return allowedRole && row.active === true
    ? { ready: true, label: 'Ready', profileId: row.profile_id }
    : { ready: false, label: 'Account not ready' };
}

export function readinessForCase(item) {
  const reminderOn = item.reminders?.enabled === true;
  const participant = item.participant;
  const caseRow = item.case;
  return {
    intake: item.intake_snapshot ? 'Ready' : 'Needs action',
    teacher: participant?.auth_user_id ? 'Ready' : 'Needs action',
    coach: item.coach?.coach_user_id ? 'Ready' : 'Needs action',
    case: caseRow?.id ? 'Ready' : 'Needs action',
    snapshot: item.intake_snapshot ? 'Ready' : 'Needs action',
    targets: Number(item.fidelity_target_count) > 0 ? 'Ready' : 'Needs action',
    assignment: item.coach?.active ? 'Ready' : 'Needs action',
    content: item.protected_content?.present ? 'Ready' : 'Needs action',
    resourceMap: item.resource_map?.status || 'Needs content',
    comparability: item.mission_bank_comparability?.status || 'Needs review',
    game: caseRow?.active && participant?.active ? 'Ready' : 'Off intentionally',
    reminders: reminderOn ? 'Ready' : 'Off intentionally'
  };
}
