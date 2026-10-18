/* A shared visual cue linking Wizard feedback to lost health.
   Does not change scores, feedback text, missions, or telemetry. */
(function () {
  'use strict';
  const MR = window.MR = window.MR || {};
  let cleanupTimer = null;
  let activeLayer = null;

  function clear() {
    if (cleanupTimer !== null) {
      window.clearTimeout(cleanupTimer);
      cleanupTimer = null;
    }
    if (activeLayer) {
      activeLayer.remove();
      activeLayer = null;
    }
  }

  function lossLabel(before, after) {
    const change = Math.max(0, Number(before) - Number(after));
    if (!Number.isFinite(change) || change < 0.01) return '';
    return change < 0.75 ? '-1/2' : '-1';
  }

  function affectedHeart(hearts, before, after) {
    const fill = (health, index) => Math.max(0, Math.min(1, health - index));
    const changed = Array.from(hearts || []).filter((_, index) =>
      fill(before, index) > fill(after, index) + 0.001);
    return changed.length ? changed[changed.length - 1] : null;
  }

  function center(rect) {
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  // getBoundingClientRect reports displayed pixels, while the game's fitted
  // 1500px stage may be CSS-transformed. Convert both endpoints back into
  // the Wizard overlay's local coordinate system to avoid missing the HUD.
  function flightPoints(modal, wizard, target) {
    const outer = modal.getBoundingClientRect();
    const start = center(wizard.getBoundingClientRect());
    const finish = center(target.getBoundingClientRect());
    const scaleX = modal.clientWidth / outer.width;
    const scaleY = modal.clientHeight / outer.height;
    if (![start.x, start.y, finish.x, finish.y, scaleX, scaleY].every(Number.isFinite)
        || outer.width <= 0 || outer.height <= 0 || scaleX <= 0 || scaleY <= 0) return null;
    return {
      x: (start.x - outer.left) * scaleX,
      y: (start.y - outer.top) * scaleY - 20 * scaleY,
      dx: (finish.x - start.x) * scaleX,
      dy: (finish.y - start.y) * scaleY + 20 * scaleY
    };
  }

  function play(before, after) {
    clear();
    const label = lossLabel(before, after);
    if (!label) return false;
    // No separate stationary effect: reduced-motion users retain the normal
    // health update without the decorative flying graphic.
    if (typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;

    const modal = document.getElementById('wizard-modal');
    const wizard = document.getElementById('wizard-modal-img');
    const bar = document.getElementById('heart-row');
    const dest = affectedHeart(bar && bar.children, before, after);
    if (!modal || modal.hidden || modal.dataset.mode !== 'feedback' || !wizard || !dest) return false;
    const points = flightPoints(modal, wizard, dest);
    const heartSource = MR.asset && MR.asset('heart');
    if (!points || !heartSource) return false;

    const layer = document.createElement('div');
    layer.className = 'wizard-heart-flight-layer';
    layer.setAttribute('aria-hidden', 'true');

    const flying = document.createElement('div');
    flying.className = 'wizard-heart-flight';
    flying.dataset.loss = label === '-1/2' ? 'half' : 'full';
    flying.style.left = points.x + 'px';
    flying.style.top = points.y + 'px';
    flying.style.setProperty('--heart-flight-dx', points.dx + 'px');
    flying.style.setProperty('--heart-flight-dy', points.dy + 'px');
    flying.style.setProperty('--heart-flight-mid-x', points.dx * .36 + 'px');
    flying.style.setProperty('--heart-flight-mid-y', points.dy * .22 - 50 + 'px');
    flying.style.setProperty('--heart-flight-rise-y', points.dy - 18 + 'px');

    const image = document.createElement('img');
    image.src = heartSource;
    image.alt = '';
    image.className = 'wizard-heart-flight-icon';
    const amount = document.createElement('span');
    amount.className = 'wizard-heart-flight-amount';
    amount.textContent = label;
    flying.append(image, amount);

    const landing = document.createElement('div');
    landing.className = 'wizard-heart-flight-landing';
    landing.style.left = points.x + points.dx + 'px';
    landing.style.top = points.y + points.dy + 'px';

    layer.append(flying, landing);
    modal.appendChild(layer);
    activeLayer = layer;
    flying.addEventListener('animationend', () => {
      if (activeLayer === layer) clear();
    }, { once: true });
    // Robust cleanup in browsers where an animationend is missed or canceled.
    cleanupTimer = window.setTimeout(() => {
      if (activeLayer === layer) clear();
    }, 1850);
    return true;
  }

  MR.heartFlight = { play, clear };
})();
