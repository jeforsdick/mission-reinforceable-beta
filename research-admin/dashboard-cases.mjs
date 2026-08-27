export function isActiveStudyCase(item) {
  return item?.case_active === true && item?.participant_active === true;
}

export function partitionStudyCases(cases = []) {
  return cases.reduce((groups, item) => {
    groups[isActiveStudyCase(item) ? 'active' : 'archived'].push(item);
    return groups;
  }, { active: [], archived: [] });
}

export function visibleStudyCases(cases = [], showArchived = false) {
  const groups = partitionStudyCases(cases);
  return showArchived ? [...groups.active, ...groups.archived] : groups.active;
}
