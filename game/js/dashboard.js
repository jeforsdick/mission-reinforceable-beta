(function () {
  'use strict';

  const MR = window.MR = window.MR || {};

  function uniqueSortedDates(runs) {
    return Array.from(new Set(runs.map(run => run.dateKey).filter(Boolean))).sort();
  }

  function computeStreak(dates) {
    const set = new Set(dates);
    let cursor = new Date();
    let streak = 0;
    while (true) {
      const key = MR.todayKey(cursor);
      if (!set.has(key)) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function activeSeconds(run) {
    return Number(run && (run.activeDurationSeconds || run.durationSeconds) || 0);
  }

  function formatTime(seconds) {
    if (MR.SessionTimer && MR.SessionTimer.formatSeconds) return MR.SessionTimer.formatSeconds(seconds);
    const value = Math.max(0, Math.round(Number(seconds) || 0));
    const mins = Math.floor(value / 60);
    const secs = value % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  MR.dashboard = {
    metrics(runs) {
      const safeRuns = runs || [];
      const totalScore = safeRuns.reduce((sum, run) => sum + Number(run.score || 0), 0);
      const totalMax = safeRuns.reduce((sum, run) => sum + Number(run.maxScore || 0), 0);
      const overall = totalMax ? Math.round((totalScore / totalMax) * 100) : 0;
      const best = safeRuns.length ? Math.max(...safeRuns.map(run => Number(run.accuracy || 0))) : 0;
      const dates = uniqueSortedDates(safeRuns);
      const timedRuns = safeRuns.filter(run => activeSeconds(run) > 0);
      const totalActiveSeconds = timedRuns.reduce((sum, run) => sum + activeSeconds(run), 0);
      const recentTimedRun = timedRuns[0];
      return {
        overall,
        best,
        completed: safeRuns.length,
        streak: computeStreak(dates),
        averageActiveSeconds: timedRuns.length ? totalActiveSeconds / timedRuns.length : 0,
        recentActiveSeconds: recentTimedRun ? activeSeconds(recentTimedRun) : 0,
        totalActiveSeconds
      };
    },

    render() {
      const config = MR.teacherConfig;
      const runs = MR.storage.getRuns();
      const metrics = this.metrics(runs);
      MR.$('#progress-title').textContent = `${config.displayName || 'Teacher'}'s Mission Progress`;
      MR.$('#growth-focus').textContent = `Growth focus: ${config.growthFocus || 'Review your most recent feedback and choose one small move to tighten next time.'}`;
      MR.$('#stat-accuracy').textContent = `${metrics.overall}%`;
      MR.$('#stat-streak').textContent = `${metrics.streak}`;
      MR.$('#stat-completed').textContent = `${metrics.completed}`;
      MR.$('#stat-best').textContent = `${metrics.best}%`;

      const list = MR.$('#progress-list');
      if (!runs.length) {
        list.innerHTML = `${this.timeSummaryCard(metrics)}<div class="empty-progress">No missions saved yet. Complete a mission and your results will appear here.</div>`;
        return;
      }

      list.innerHTML = [
        this.timeSummaryCard(metrics),
        ...runs.map((run, index) => this.runCard(run, index))
      ].join('');
      MR.$$('.run-card button', list).forEach(button => {
        button.addEventListener('click', () => {
          const run = runs[Number(button.dataset.index)];
          if (run) MR.engine.showStoredRunDetails(run);
        });
      });
    },

    timeSummaryCard(metrics) {
      return `
        <article class="run-card">
          <img src="${MR.asset('progressIcon')}" alt="" />
          <div>
            <h3>Time Played</h3>
            <p><strong>Average Mission Time:</strong> ${formatTime(metrics.averageActiveSeconds)}</p>
            <p><strong>Most Recent Mission:</strong> ${formatTime(metrics.recentActiveSeconds)}</p>
            <p><strong>Total Time Played:</strong> ${formatTime(metrics.totalActiveSeconds)}</p>
          </div>
          <span aria-hidden="true"></span>
        </article>
      `;
    },

    runCard(run, index) {
      const mode = run.mode || 'daily';
      const icon = mode === 'crisis' ? MR.asset('crisisIcon') : mode === 'wild' ? MR.asset('mysteryIcon') : MR.asset('dailyIcon');
      const accuracy = Number(run.accuracy || 0);
      const accuracyClass = accuracy >= 80 ? 'accuracy-good' : accuracy >= 50 ? 'accuracy-mid' : 'accuracy-low';
      const modeLabel = mode === 'crisis' ? 'Crisis Mission' : mode === 'wild' ? 'Mystery Mission' : 'Daily Mission';
      return `
        <article class="run-card">
          <img src="${icon}" alt="" />
          <div>
            <h3>${MR.escapeHTML(MR.formatDate(run.dateKey))}</h3>
            <p><strong>${MR.escapeHTML(modeLabel)}</strong></p>
            <p>Score: ${Number(run.score || 0)}/${Number(run.maxScore || 0)}</p>
            <p class="${accuracyClass}">Accuracy: ${accuracy}%</p>
          </div>
          <button class="pixel-btn green-btn" data-index="${index}" type="button">Details</button>
        </article>
      `;
    }
  };
})();
