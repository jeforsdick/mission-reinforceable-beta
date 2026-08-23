export const STUDY_START = '2026-08-12';
export const STUDY_END = '2027-05-26';
export const INELIGIBLE_DATES = new Set(['2026-09-07','2026-09-18','2026-10-15','2026-10-16','2026-10-19','2026-10-20','2026-11-25','2026-11-26','2026-11-27','2026-12-21','2026-12-22','2026-12-23','2026-12-24','2026-12-25','2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-04','2027-01-18','2027-02-12','2027-02-15','2027-02-16','2027-03-12','2027-03-15','2027-03-29','2027-03-30','2027-03-31','2027-04-01','2027-04-02','2027-04-05']);

export const COMPONENTS = {
  daily: [
    ['daily_prompt_delivered','Weekday mission prompt delivered','The planned Mission: Reinforceable prompt was successfully delivered. Opening the email or completing a mission is not required.'],
    ['mission_available','Mission available','A scored mission was available as intended. Teacher failure to play does not make this No.'],
    ['functional_access_available','Teacher had functional access','Account, authentication, assignment, and protected game access functioned as intended. No session does not prove access failure.']
  ],
  weekly: [
    ['weekly_usage_summary_delivered','Weekly usage summary delivered','The planned weekly MR usage summary was delivered or made available; do not infer this from mission completion.'],
    ['weekly_teacher_checkin_distributed','Qualtrics Weekly Teacher Report distributed','The Qualtrics report was made available as intended. Mission: Reinforceable does not collect or store its responses.']
  ]
};

const addDays = (key, days) => { const d = new Date(`${key}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0,10); };
export function isStudyDay(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key || '') || key < STUDY_START || key > STUDY_END || INELIGIBLE_DATES.has(key)) return false;
  const day = new Date(`${key}T00:00:00Z`).getUTCDay(); return day >= 1 && day <= 5;
}
export function weekStart(key) { const d = new Date(`${key}T00:00:00Z`).getUTCDay(); return addDays(key, -(d === 0 ? 6 : d - 1)); }
export function weekHasStudyDay(monday) { return Array.from({length:5},(_,i)=>addDays(monday,i)).some(isStudyDay); }
export function percentage(yes, applicable) { return Number(applicable) ? `${Math.round(Number(yes) / Number(applicable) * 1000) / 10}%` : 'Not applicable'; }
export function currentReviews(history=[]) { return history.filter(review => review.is_current); }
