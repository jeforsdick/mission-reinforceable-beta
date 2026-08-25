export async function completeWeeklyCheckin({ token, fetchImpl = fetch, onState = () => {} }) {
  onState('finishing');
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token || '')) { onState('invalid'); return 'invalid'; }
  try {
    const response = await fetchImpl('/api/study-day-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'weekly_checkin', token }) });
    if (response.ok) { onState('success'); return 'success'; }
    const state = [400, 404, 410].includes(response.status) ? 'invalid' : 'retry';
    onState(state); return state;
  } catch { onState('retry'); return 'retry'; }
}

if (typeof document !== 'undefined') {
  const token = new URLSearchParams(location.search).get('token') || '';
  const icon = document.querySelector('#completion-icon'), title = document.querySelector('#completion-title'), detail = document.querySelector('#completion-detail'), retry = document.querySelector('#completion-retry');
  const render = state => {
    icon.textContent = state === 'success' ? '✓' : '';
    title.textContent = state === 'success' ? 'All done!' : state === 'finishing' ? 'Finishing your weekly check-in…' : "We couldn't confirm your weekly check-in.";
    detail.textContent = state === 'success' ? 'Your weekly Mission: Reinforceable check-in is complete. Thanks for taking a minute to check in.' : state === 'finishing' ? 'Please keep this page open for a moment.' : state === 'invalid' ? 'This completion link is invalid or has expired.' : 'Please try again. If the problem continues, you may close this page and contact the study team.';
    retry.hidden = state !== 'retry';
  };
  const run = () => completeWeeklyCheckin({ token, onState: render });
  retry.addEventListener('click', run);
  run().finally(() => history.replaceState({}, '', location.pathname));
}
