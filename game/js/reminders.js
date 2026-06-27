(function () {
  'use strict';

  const MR = window.MR = window.MR || {};
  let reminderTimer = null;

  function isSchoolDay(date) {
    const day = date.getDay();
    return day >= 1 && day <= 5;
  }

  function scheduleNextReminder() {
    if (reminderTimer) window.clearTimeout(reminderTimer);
    const settings = MR.storage.getSettings();
    if (!settings.reminderTime) return;

    const [hour, minute] = settings.reminderTime.split(':').map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(hour || 8, minute || 0, 0, 0);

    while (target <= now || !isSchoolDay(target)) {
      target.setDate(target.getDate() + 1);
    }

    const delay = target.getTime() - now.getTime();
    reminderTimer = window.setTimeout(() => {
      MR.reminders.notify();
      scheduleNextReminder();
    }, Math.min(delay, 2147483647));
  }

  MR.reminders = {
    async save(time) {
      if (!time) return 'Choose a reminder time first.';
      let permission = 'default';
      if ('Notification' in window) {
        permission = await Notification.requestPermission();
      }
      MR.storage.saveSettings({ reminderTime: time, notificationPermission: permission });
      scheduleNextReminder();
      return permission === 'granted'
        ? `Reminder saved for ${time} on school days in this browser.`
        : `Reminder time saved for ${time}. Browser notification permission was not granted, so reminders may only appear while the site is open.`;
    },

    notify() {
      const title = 'Mission: Reinforceable';
      const body = 'Your classroom mission is ready. Complete today’s brief practice mission.';
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '../favicon.png' });
      } else {
        alert(`${title}\n\n${body}`);
      }
    },

    hydrateControls() {
      const input = MR.$('#reminder-time');
      const status = MR.$('#reminder-status');
      const settings = MR.storage.getSettings();
      if (input && settings.reminderTime) input.value = settings.reminderTime;
      if (status && settings.reminderTime) status.textContent = `Saved for ${settings.reminderTime} on school days in this browser.`;
      scheduleNextReminder();
    }
  };
})();
