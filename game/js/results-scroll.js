/* Show the same More below cue on overflowing Coaching Summary / Review results.
   This is presentation-only; it does not modify gameplay, scores or telemetry. */
(() => {
  'use strict';
  const MR = window.MR || (window.MR = {});
  let frame = null;
  let wired = false;

  function elements() {
    return {
      content: document.getElementById('results-content'),
      cue: document.getElementById('results-scroll-cue')
    };
  }

  function update() {
    const { content, cue } = elements();
    if (!content || !cue) return;
    // Hidden results screens do not have measurable client height.
    const overflow = content.clientHeight > 0
      && content.scrollHeight > content.clientHeight + 8;
    const hasMore = content.scrollTop + content.clientHeight < content.scrollHeight - 8;
    cue.hidden = !(overflow && hasMore);
  }

  function schedule() {
    if (typeof window.requestAnimationFrame !== 'function') {
      update();
      return;
    }
    if (frame !== null && typeof window.cancelAnimationFrame === 'function') {
      window.cancelAnimationFrame(frame);
    }
    frame = window.requestAnimationFrame(() => {
      frame = null;
      update();
    });
  }

  function wire() {
    const { content, cue } = elements();
    if (!content || !cue || wired) return;
    wired = true;
    cue.hidden = true;
    content.addEventListener('scroll', schedule, { passive: true });
    cue.addEventListener('click', () => {
      const delta = Math.max(100, Math.round(content.clientHeight * .72));
      if (typeof content.scrollBy === 'function') {
        content.scrollBy({ top: delta, behavior: 'smooth' });
      } else {
        content.scrollTop += delta;
      }
      schedule();
    });
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(schedule);
      observer.observe(content);
      if (content.parentElement) observer.observe(content.parentElement);
    }
    schedule();
  }

  MR.resultsScroll = {
    refresh() {
      wire();
      const { content, cue } = elements();
      if (!content || !cue) return;
      content.scrollTop = 0;
      cue.hidden = true;
      schedule();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
