(function () {
  'use strict';

  const MR = window.MR = window.MR || {};
  const DEFAULT_MIN_FONT_SIZE = 16;
  const DEFAULT_STEP = 1;

  function contentHeight(container, getStyle) {
    const style = getStyle(container);
    const padding = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
    return Math.max(0, container.clientHeight - padding);
  }

  function fitScenarioText(element, options = {}) {
    if (!element || !element.parentElement) return null;
    const getStyle = options.getComputedStyle || window.getComputedStyle.bind(window);
    const minimum = Number.isFinite(options.minFontSize) ? options.minFontSize : DEFAULT_MIN_FONT_SIZE;
    const step = Number.isFinite(options.step) && options.step > 0 ? options.step : DEFAULT_STEP;

    // Reset first so every scene and layout starts at the normal CSS size.
    element.style.fontSize = '';
    const normal = parseFloat(getStyle(element).fontSize);
    if (!Number.isFinite(normal)) return null;

    const floor = Math.min(normal, minimum);
    const available = contentHeight(element.parentElement, getStyle);
    let size = normal;
    while (element.scrollHeight > available && size > floor) {
      size = Math.max(floor, size - step);
      element.style.fontSize = `${size}px`;
    }

    return {
      normalFontSize: normal,
      fontSize: size,
      minimumFontSize: floor,
      fits: element.scrollHeight <= available
    };
  }

  function watchScenarioTextFit(element, options = {}) {
    if (!element) return function () {};
    const requestFrame = options.requestAnimationFrame || window.requestAnimationFrame.bind(window);
    let frame = null;
    const refit = function () {
      if (frame !== null && window.cancelAnimationFrame) window.cancelAnimationFrame(frame);
      frame = requestFrame(function () {
        frame = null;
        fitScenarioText(element, options);
      });
    };
    window.addEventListener('resize', refit);
    window.addEventListener('orientationchange', refit);
    refit();
    return function () {
      window.removeEventListener('resize', refit);
      window.removeEventListener('orientationchange', refit);
    };
  }


  // Gameplay hints share a fixed pixel-art bubble on larger screens. Refitting
  // protects any authored hint from clipping without changing the text itself.
  // On phones, the hint is an in-flow card and should grow instead of shrinking.
  function fitWizardHintText(element, options = {}) {
    if (!element) return null;
    const getStyle = options.getComputedStyle || window.getComputedStyle.bind(window);
    const mobile = options.mobile !== undefined
      ? Boolean(options.mobile)
      : Boolean(window.matchMedia && window.matchMedia('(max-width: 700px)').matches);

    // Reset between scenes and after orientation changes; an earlier long hint
    // must not leave the next short hint or the mobile view artificially small.
    element.style.fontSize = '';
    if (element.classList) element.classList.remove('is-overflowing');
    const normal = parseFloat(getStyle(element).fontSize);
    if (mobile || !Number.isFinite(normal) || !element.clientHeight || !element.clientWidth) {
      return { fontSize: normal, fits: true, mobile, skipped: !mobile };
    }

    const minimum = Number.isFinite(options.minFontSize) ? options.minFontSize : 13.5;
    const floor = Math.min(normal, minimum);
    const step = Number.isFinite(options.step) && options.step > 0 ? options.step : 0.5;
    const overflowing = () =>
      element.scrollHeight > element.clientHeight + 1 ||
      element.scrollWidth > element.clientWidth + 1;
    let size = normal;
    while (overflowing() && size > floor) {
      size = Math.max(floor, size - step);
      element.style.fontSize = `${size}px`;
    }
    const fits = !overflowing();
    // Rare very long legacy hints remain readable in a scrollable bubble
    // instead of spilling over the wizard or answer buttons.
    if (element.classList) element.classList.toggle('is-overflowing', !fits);
    return { normalFontSize: normal, fontSize: size, minimumFontSize: floor, fits, mobile: false };
  }

  function watchWizardHintFit(element, options = {}) {
    if (!element) return function () {};
    const requestFrame = options.requestAnimationFrame ||
      (window.requestAnimationFrame && window.requestAnimationFrame.bind(window));
    const cancelFrame = options.cancelAnimationFrame ||
      (window.cancelAnimationFrame && window.cancelAnimationFrame.bind(window));
    let frame = null;
    const refit = function () {
      if (frame !== null && cancelFrame) cancelFrame(frame);
      if (requestFrame) {
        frame = requestFrame(() => {
          frame = null;
          fitWizardHintText(element, options);
        });
      } else {
        fitWizardHintText(element, options);
      }
    };
    window.addEventListener('resize', refit);
    window.addEventListener('orientationchange', refit);
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      document.fonts.ready.then(refit).catch(() => {});
    }
    return function () {
      window.removeEventListener('resize', refit);
      window.removeEventListener('orientationchange', refit);
      if (frame !== null && cancelFrame) cancelFrame(frame);
    };
  }

  MR.scenarioFit = {
    DEFAULT_MIN_FONT_SIZE,
    fitScenarioText,
    watchScenarioTextFit,
    fitWizardHintText,
    watchWizardHintFit
  };
})();
