import { CHECKLIST, MEASURES, currentByKey, timelineForCase } from './operations-model.mjs';

export const BASELINE_LABELS = Object.fromEntries([
  ...CHECKLIST.slice(0, 10), ['tses_pre', 'TSES — Pre-Baseline'], ['stagger_position', 'Baseline assignment']
]);

export function friendlyBaselineError(message = '') {
  if (!/baseline prerequisites missing:/i.test(message)) return message;
  const keys = message.split(':').slice(1).join(':').split(',').map(key => key.trim()).filter(Boolean);
  const labels = keys.map(key => BASELINE_LABELS[key] || key.replaceAll('_', ' '));
  return labels.length === 1
    ? `Baseline is not ready yet: ${labels[0]}`
    : `Baseline is not ready yet:\n${labels.map(label => `• ${label}`).join('\n')}`;
}

const display = value => String(value ?? '—').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
const yesNo = value => value ? 'Yes' : 'No';
const percent = (yes, applicable) => applicable ? `${Math.round(yes / applicable * 1000) / 10}%` : 'Not calculated';
const cell = (value, e) => `<td>${e(value ?? '—')}</td>`;
const table = (headers, rows, e) => rows.length ? `<table><thead><tr>${headers.map(x => `<th>${e(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(x => cell(x, e)).join('')}</tr>`).join('')}</tbody></table>` : '<p class="empty">No records available.</p>';
const section = (title, body) => `<section><h2>${title}</h2>${body}</section>`;

export function renderCaseReport(item, prepared, fidelity, e, generated = new Date()) {
  const checklist = currentByKey(item.checklist), measures = currentByKey(item.measures, 'measure_key');
  const observations = (item.observation_data?.observations || []).filter(row => row.primary_record_id);
  const coverage = item.observation_data?.coverage || {};
  const readinessRows = CHECKLIST.slice(0, 10).map(([key, label]) => [label, display(checklist[key]?.status || 'pending'), checklist[key]?.status_date || '—']);
  readinessRows.push(['TSES — Pre-Baseline', measures.tses_pre?.status === 'complete' ? 'Complete' : 'Needs completion', measures.tses_pre?.completed_on || '—']);
  const measureRows = MEASURES.map(([key, label]) => [label, display(measures[key]?.status || 'pending'), measures[key]?.completed_on || '—', measures[key]?.external_reference || '—']);
  const observationRows = observations.map(row => [row.observation_date, display(row.phase), row.session_number, row.primary_observer_code, row.secondary_observer_code || '—', row.teacher_fidelity_percent ?? '—', row.student_behavior_percent ?? '—', row.ioa?.teacher_fidelity_ioa_percent ?? '—', row.ioa?.student_behavior_ioa_percent ?? '—', row.ioa ? (row.ioa.overall_ioa_attention ? 'Needs review' : 'Complete') : 'Not paired']);
  const phaseCounts = Object.entries(Object.groupBy ? Object.groupBy(observations, x => x.phase) : observations.reduce((a,x)=>((a[x.phase]??=[]).push(x),a),{})).map(([phase, rows]) => [display(phase), rows.length, rows.filter(x => x.secondary_record_id).length, `${rows.length ? Math.round(rows.filter(x => x.secondary_record_id).length / rows.length * 1000) / 10 : 0}%`]);
  const history = fidelity?.history || [], summary = fidelity?.summary || {};
  const timeline = timelineForCase(item).slice().reverse();
  const overview = table(['Field', 'Value'], [['Study ID', item.study_id], ['Case code', item.case_code], ['Student alias', item.student_alias], ['Current phase', display(item.current_phase)], ['Baseline assignment', item.protocol ? `Position ${item.protocol.stagger_position}` : 'Not assigned'], ['Planned baseline observation minimum', item.protocol?.planned_baseline_observations ?? 'Not assigned']], e);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${e(item.study_id)} Case Report</title><style>
  @page{size:letter;margin:.55in}*{box-sizing:border-box}body{margin:0;color:#172033;background:#fff;font:10pt/1.4 Arial,sans-serif}header{border-bottom:3px solid #34205c;padding-bottom:14px;margin-bottom:18px}h1{font-size:23pt;margin:2px 0}h2{font-size:14pt;color:#34205c;border-bottom:1px solid #aeb4bf;padding-bottom:4px;margin:0 0 10px}section{break-inside:avoid-page;margin:0 0 22px}.metadata{display:grid;grid-template-columns:repeat(3,1fr);gap:6px 18px}.metadata span{display:block;color:#596273;font-size:8pt;text-transform:uppercase}.metadata strong{display:block}table{width:100%;border-collapse:collapse;font-size:8.5pt}thead{display:table-header-group}th,td{text-align:left;vertical-align:top;border:1px solid #c8ccd3;padding:5px}th{background:#eceaf1;color:#1e1630}tr{break-inside:avoid}.empty{color:#596273;font-style:italic}.print-help{font-size:9pt;color:#596273}@media print{.print-help{display:none}}
  </style></head><body><header><p><strong>Mission: Reinforceable</strong></p><h1>Research Case Report</h1><div class="metadata"><div><span>Study ID</span><strong>${e(item.study_id)}</strong></div><div><span>Case code</span><strong>${e(item.case_code)}</strong></div><div><span>Student alias</span><strong>${e(item.student_alias)}</strong></div><div><span>Current phase</span><strong>${e(display(item.current_phase))}</strong></div><div><span>Report generated</span><strong>${e(generated.toLocaleDateString())}</strong></div></div><p class="print-help">Choose Save as PDF in the print window.</p></header>
  ${section('Case Overview', overview)}
  ${section('Baseline Readiness', table(['Prerequisite', 'Status', 'Completion date'], readinessRows, e))}
  ${section('Phase History', table(['Phase', 'Effective date', 'Researcher decision note'], (item.phase_history || []).map(x => [display(x.phase), x.effective_date, x.decision_note || x.researcher_decision_note || '—']), e))}
  ${section('Study Measures', table(['Measure', 'Status', 'Completion date', 'External reference'], measureRows, e))}
  ${section('Classroom Observations', table(['Date', 'Phase', 'Session', 'Primary observer', 'IOA observer', 'Teacher fidelity %', 'Student target behavior %', 'Teacher IOA %', 'Student IOA %', 'IOA status'], observationRows, e))}
  ${section('IOA Summary', table(['Metric', 'Value'], [['Completed observations', coverage.completed ?? observations.length], ['Paired IOA observations', coverage.ioa ?? observations.filter(x => x.secondary_record_id).length], ['Overall IOA coverage', `${coverage.percent || 0}%`], ['Number needing review', observations.filter(x => x.ioa?.overall_ioa_attention).length]], e) + '<h3>By phase</h3>' + table(['Phase', 'Completed', 'Paired', 'Coverage'], phaseCounts, e))}
  ${section('Coaching-as-Usual', table(['Date', 'Format', 'Duration', 'Provider role', 'Focus'], (item.coaching_contacts || []).map(x => [x.contact_date, display(x.format), x.approximate_duration_minutes ? `${x.approximate_duration_minutes} minutes` : '—', x.provider_role, (x.focuses || []).map(display).join(', ')]), e))}
  ${section('Study Events', table(['Date', 'Event type', 'Affected observation', 'Affected MR access/practice', 'Could affect interpretation', 'Brief note', 'Action taken', 'Resolved'], (item.study_events || []).map(x => [x.event_date, display(x.event_type), yesNo(x.affects_observation), yesNo(x.affects_mr_exposure), yesNo(x.affects_phase_interpretation), x.brief_note || '—', x.action_taken || '—', yesNo(Boolean(x.resolved_at))]), e))}
  ${section('Game Readiness', table(['Item', 'Status'], [['Protected game content', prepared.protected_content?.present ? 'Present' : 'Needs action'], ['Resource Map', prepared.resource_map?.status || 'Needs action'], ['Mission review', prepared.mission_bank_comparability?.status || 'Needs action'], ['Intervention orientation', display(checklist.intervention_orientation?.status || 'pending')], ['Game status', item.case_active && item.participant_active ? 'On' : 'Off'], ['Reminders status', prepared.reminders?.enabled ? 'On' : 'Off']], e))}
  ${section('MR Procedural Fidelity', table(['Summary', 'Fidelity', 'Applicable components'], [['Daily fidelity', percent(summary.daily_yes || 0, summary.daily_applicable || 0), `${summary.daily_yes || 0}/${summary.daily_applicable || 0}`], ['Weekly fidelity', percent(summary.weekly_yes || 0, summary.weekly_applicable || 0), `${summary.weekly_yes || 0}/${summary.weekly_applicable || 0}`], ['Overall fidelity', percent(summary.overall_yes || 0, summary.overall_applicable || 0), `${summary.overall_yes || 0}/${summary.overall_applicable || 0}`]], e) + table(['Review date', 'Scope', 'Fidelity %', 'Status'], history.map(x => [x.study_date || x.week_start || x.reviewed_at?.slice(0,10), display(x.review_scope), x.fidelity_percent ?? '—', 'Reviewed']), e))}
  ${section('Timeline', table(['Date', 'Category', 'Event'], timeline.map(x => [String(x.date).slice(0,10), x.category, x.label]), e))}
  </body></html>`;
}
