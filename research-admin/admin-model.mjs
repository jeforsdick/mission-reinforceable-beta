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
  return row.role === expectedRole && row.active === true
    ? { ready: true, label: 'Ready', profileId: row.profile_id }
    : { ready: false, label: 'Account not ready' };
}

export function readinessForCase(item) {
  const reminderOn = item.reminder?.enabled === true;
  return {
    intake: item.intake ? 'Ready' : 'Needs action',
    teacher: item.participant?.auth_user_id ? 'Ready' : 'Needs action',
    coach: item.coach?.coach_user_id ? 'Ready' : 'Needs action',
    case: item.case?.id ? 'Ready' : 'Needs action',
    snapshot: item.intake?.case_id ? 'Ready' : 'Needs action',
    targets: item.targets?.length ? 'Ready' : 'Needs action',
    assignment: item.coach?.active ? 'Ready' : 'Needs action',
    content: item.content ? 'Ready' : 'Needs action',
    game: item.case?.active && item.participant?.active ? 'Ready' : 'Off intentionally',
    reminders: reminderOn ? 'Ready' : 'Off intentionally'
  };
}
