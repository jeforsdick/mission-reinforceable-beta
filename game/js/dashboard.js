(function () {
  'use strict';

  const MR = window.MR = window.MR || {};
  const DENVER_TIME_ZONE = 'America/Denver';
  const LOAD_ERROR = 'Mission progress could not be loaded. Please try again or contact the research team.';
  const EMPTY_MESSAGE = 'Complete a mission and your game-practice progress will appear here.';
  const PROGRESS_POLISH_HREF = '../game/css/progress-polish.css?v=20260818-compact';

  function value(run, camel, snake) {
    return run && run[camel] != null ? run[camel] : run && run[snake];
  }

  function percentage(run) {
    const score = Number(value(run, 'score', 'score')) || 0;
    const maximum = Number(value(run, 'maxScore', 'max_score')) || 0;
    return maximum > 0 ? Math.round((score / maximum) * 100) : 0;
  }

  function completedAt(run) {
    return value(run, 'endedAt', 'ended_at') || value(run, 'startedAt', 'started_at') || run.timestamp || run.dateKey || '';
  }

  function newestFirst(runs) {
    return (runs || []).slice().sort((left, right) => {
      const rightTime = Date.parse(completedAt(right)) || 0;
      const leftTime = Date.parse(completedAt(left)) || 0;
      return rightTime - leftTime;
    });
  }

  function formatDenverDate(run) {
    const raw = completedAt(run);
    if (!raw) return 'Date unavailable';
    // Legacy demo date keys represent a calendar date rather than an instant.
    const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T12:00:00Z`) : new Date(raw);
    if (Number.isNaN(date.getTime())) return 'Date unavailable';
    return new Intl.DateTimeFormat('en-US', {
      timeZone: DENVER_TIME_ZONE,
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  function modeLabel(mode) {
    if (mode === 'crisis') return 'Crisis Mission';
    if (mode === 'wild' || mode === 'wildcard') return 'Mystery Mission';
    return 'Daily Mission';
  }

  function shortSummary(run) {
    const score = percentage(run);
    if (score >= 90) return 'Great work. Your choices stayed closely aligned with the plan.';
    if (score >= 70) return 'Nice work. Most of your choices stayed aligned with the plan.';
    if (score >= 50) return 'Good practice. You found some plan-aligned moves and a few places to tighten your response.';
    return 'Keep practicing. Review the plan and focus on one clear move for your next mission.';
  }

  function ensureProgressPolish() {
    const wizard = MR.$('.progress-wizard');
    if (wizard) {
      const src = MR.asset('wizardGuide');
      if (src) wizard.src = src;
      if (wizard.dataset) wizard.dataset.asset = 'wizardGuide';
      wizard.alt = 'A helpful wizard';
    }

    if (!document || !document.head || typeof document.createElement !== 'function') return;
    if (typeof document.querySelector === 'function' && document.querySelector('link[data-progress-polish]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = PROGRESS_POLISH_HREF;
    link.dataset.progressPolish = 'true';
    document.head.appendChild(link);
  }

  MR.dashboard = {
    metrics(runs) {
      const ordered = newestFirst(runs);
      const totalScore = ordered.reduce((sum, run) => sum + (Number(run.score) || 0), 0);
      const totalMax = ordered.reduce((sum, run) => sum + (Number(value(run, 'maxScore', 'max_score')) || 0), 0);
      return {
        average: totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0,
        completed: ordered.length,
        recent: ordered.length ? percentage(ordered[0]) : 0,
        best: ordered.length ? Math.max(...ordered.map(percentage)) : 0
      };
    },

    async render() {
      ensureProgressPolish();
      const protectedMode = Boolean(MR.telemetryContext);
      let runs;
      try {
        runs = protectedMode
          ? await MR.auth.getProgressSessions(MR.telemetryContext)
          : MR.storage.getRuns();
      } catch (error) {
        console.error('Mission progress load failed:', error);
        this.renderSummary([]);
        MR.$('#progress-list').innerHTML = `<div class="progress-message progress-error" role="alert">${LOAD_ERROR}</div>`;
        return;
      }

      runs = newestFirst(runs);
      this.renderSummary(runs);
      const list = MR.$('#progress-list');
      if (!runs.length) {
        list.innerHTML = `<div class="progress-message empty-progress">${EMPTY_MESSAGE}</div>`;
        return;
      }

      list.innerHTML = `<h2 class="history-heading">Mission History</h2>${runs.map((run, index) => this.runCard(run, index)).join('')}`;
      MR.$$('.run-card button', list).forEach(button => {
        button.addEventListener('click', () => {
          const run = runs[Number(button.dataset.index)];
          if (run) this.showSummaryDetails(run);
        });
      });
    },

    renderSummary(runs) {
      ensureProgressPolish();
      const metrics = this.metrics(runs);
      MR.$('#progress-title').textContent = 'Mission Progress';
      MR.$('#growth-focus').textContent = 'Practice focus: Review your recent feedback and choose one plan-aligned move to carry into your next mission.';
      MR.$('#stat-average').textContent = `${metrics.average}%`;
      MR.$('#stat-completed').textContent = `${metrics.completed}`;
      MR.$('#stat-recent').textContent = `${metrics.recent}%`;
      MR.$('#stat-best').textContent = `${metrics.best}%`;
    },

    runCard(run, index) {
      const mode = value(run, 'mode', 'mode') || 'daily';
      const icon = mode === 'crisis' ? MR.asset('crisisIcon') : (mode === 'wild' || mode === 'wildcard') ? MR.asset('mysteryIcon') : MR.asset('dailyIcon');
      return `
        <article class="run-card compact-run-card">
          <img src="${MR.escapeHTML(icon)}" alt="" />
          <div>
            <h3>${MR.escapeHTML(formatDenverDate(run))}</h3>
            <p><strong>${MR.escapeHTML(modeLabel(mode))}</strong></p>
            <p><strong>Mission Score: ${percentage(run)}%</strong></p>
          </div>
          <button class="pixel-btn green-btn" data-index="${index}" type="button">Details</button>
        </article>`;
    },

    showSummaryDetails(run) {
      const list = MR.$('#progress-list');
      let panel = MR.$('#mission-review', list);
      if (!panel) {
        panel = document.createElement('section');
        panel.id = 'mission-review';
        panel.className = 'mission-review compact-mission-review';
        list.appendChild(panel);
      }
      panel.innerHTML = this.detailsHTML(run);
      if (typeof panel.scrollIntoView === 'function') panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    detailsHTML(run) {
      const mode = value(run, 'mode', 'mode') || 'daily';
      return `<h2>Mission Summary</h2>
        <div class="mission-summary-copy">
          <p>You completed a <strong>${MR.escapeHTML(modeLabel(mode))}</strong> on ${MR.escapeHTML(formatDenverDate(run))}.</p>
          <p><strong>Mission Score: ${percentage(run)}%</strong></p>
          <p>${MR.escapeHTML(shortSummary(run))}</p>
        </div>`;
    },

    DENVER_TIME_ZONE
  };
})();
