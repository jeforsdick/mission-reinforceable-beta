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

  MR.scenarioFit = {
    DEFAULT_MIN_FONT_SIZE,
    fitScenarioText,
    watchScenarioTextFit
  };
})();
