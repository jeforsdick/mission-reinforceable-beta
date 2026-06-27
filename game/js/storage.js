(function () {
  'use strict';

  const MR = window.MR = window.MR || {};

  function prefix() {
    const teacherId = (MR.teacherConfig && MR.teacherConfig.teacherId) || 'default';
    return `mission-reinforceable:${teacherId}`;
  }

  MR.storage = {
    key(name) { return `${prefix()}:${name}`; },

    get(name, fallback = null) {
      try {
        const raw = localStorage.getItem(this.key(name));
        return raw == null ? fallback : JSON.parse(raw);
      } catch (error) {
        console.warn('Storage read failed:', error);
        return fallback;
      }
    },

    set(name, value) {
      try {
        localStorage.setItem(this.key(name), JSON.stringify(value));
        return true;
      } catch (error) {
        console.warn('Storage write failed:', error);
        return false;
      }
    },

    getRuns() {
      return this.get('runs', []);
    },

    saveRun(run) {
      const runs = this.getRuns();
      runs.unshift(run);
      this.set('runs', runs.slice(0, 150));
      return run;
    },

    getSettings() {
      return this.get('settings', {});
    },

    saveSettings(settings) {
      const merged = Object.assign({}, this.getSettings(), settings || {});
      this.set('settings', merged);
      return merged;
    }
  };
})();
