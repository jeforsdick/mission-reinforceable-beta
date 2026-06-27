(function () {
  'use strict';

  const MR = window.MR = window.MR || {};

  MR.$ = (selector, root = document) => root.querySelector(selector);
  MR.$$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  MR.todayKey = function todayKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  MR.formatDate = function formatDate(dateKey) {
    const [y, m, d] = String(dateKey || '').split('-').map(Number);
    if (!y || !m || !d) return dateKey || '';
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  MR.escapeHTML = function escapeHTML(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  };

  MR.stripHTML = function stripHTML(value) {
    const tmp = document.createElement('div');
    tmp.innerHTML = String(value || '');
    return tmp.textContent || tmp.innerText || '';
  };

  MR.slug = function slug(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  MR.shuffle = function shuffle(items) {
    const arr = items.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  MR.loadScript = function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = () => resolve(src);
      script.onerror = () => reject(new Error(`Could not load ${src}`));
      document.head.appendChild(script);
    });
  };

  MR.setScreen = function setScreen(name) {
    MR.$$('.screen').forEach(screen => screen.classList.remove('is-active'));
    const screen = MR.$(`#${name}-screen`);
    if (screen) screen.classList.add('is-active');
    document.body.dataset.screen = name;
    window.scrollTo({ top: 0, behavior: 'auto' });
  };
})();
