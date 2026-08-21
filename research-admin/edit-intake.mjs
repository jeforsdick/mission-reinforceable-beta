export const EDITABLE_FIELDS = [
  'teacher_name','teacher_email','coach_name','coach_email','grade_level','student_initials','student_strengths','preferred_items_activities',
  'target_behavior','behavior_topography','primary_function','replacement_behavior','desired_behavior','prevention_strategies','teaching_strategies',
  'reinforcement_system','response_strategy','crisis_plan','typical_settings','typical_consequences','current_staff_responses','requested_scenarios','additional_context'
];
export const REQUIRED_FIELDS = ['teacher_name','teacher_email','coach_name','coach_email','grade_level','student_initials','target_behavior','behavior_topography','primary_function','replacement_behavior','desired_behavior','typical_settings','typical_consequences','current_staff_responses'];

export function intakeChanges(form, row) {
  const changes = Object.fromEntries(EDITABLE_FIELDS.map(name => [name, String(form.get(name) || '').trim() || null]));
  changes.has_crisis_plan = form.get('has_crisis_plan') === 'true';
  const oldValuesDiffer = String(row.common_triggers || '').trim() !== String(row.typical_antecedents || '').trim();
  if (oldValuesDiffer && !form.has('consolidate_antecedents')) {
    changes.common_triggers = row.common_triggers;
    changes.typical_antecedents = row.typical_antecedents;
  } else {
    changes.common_triggers = String(form.get('antecedent_answer') || '').trim();
    changes.typical_antecedents = changes.common_triggers;
  }
  return changes;
}

export function missingRequired(changes) {
  const required = REQUIRED_FIELDS.concat(['common_triggers', 'typical_antecedents']);
  if (changes.has_crisis_plan) required.push('crisis_plan');
  return required.filter(name => !String(changes[name] || '').trim());
}
