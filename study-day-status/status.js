'use strict';
(() => {
  const heading = document.querySelector('#heading');
  const message = document.querySelector('#message');
  const detail = document.querySelector('#detail');
  const fallback = document.querySelector('#fallback');
  const token = new URLSearchParams(location.search).get('token') || '';
  let complete = false;
  async function record() {
    fallback.hidden = true; fallback.disabled = true;
    heading.textContent = "Recording today's update…"; message.textContent = 'Please keep this page open for a moment.'; detail.textContent = '';
    try {
      const response = await fetch('/api/study-day-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit', body: JSON.stringify({ token }) });
      const result = await response.json();
      if (!response.ok) throw Object.assign(new Error(result.message || "We couldn't record today's status."), { permanent: ['expired', 'invalid'].includes(result.error) });
      complete = true; history.replaceState(null, '', '/study-day-status/');
      heading.textContent = result.heading; message.textContent = result.message; detail.textContent = result.detail || '';
    } catch (error) {
      heading.textContent = error.message;
      message.textContent = error.permanent ? '' : 'You can try again.';
      if (!error.permanent) { fallback.hidden = false; fallback.disabled = false; }
    }
  }
  fallback.addEventListener('click', () => { if (!complete) record(); });
  record();
})();
