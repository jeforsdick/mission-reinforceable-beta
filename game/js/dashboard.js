(function () {
  'use strict';

  const MR = window.MR = window.MR || {};
  const DENVER_TIME_ZONE = 'America/Denver';
  const LOAD_ERROR = 'Mission progress could not be loaded. Please try again or contact the research team.';
  const EMPTY_MESSAGE = 'Complete a mission and your game-practice progress will appear here.';
  const SCORE_DISCLAIMER = 'These scores summarize your choices in Mission: Reinforceable. They are not classroom fidelity scores.';
  const PROGRESS_POLISH_HREF = '../game/css/progress-summary-v2.css?v=20260818-summary-v2';

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

  function missionCounts(run) {
    return {
      best: Number(value(run, 'bestChoiceCount', 'plan_aligned_count')) || 0,
      refine: Number(value(run, 'refineChoiceCount', 'refine_count')) || 0,
      missed: Number(value(run, 'missedOpportunityCount', 'missed_count')) || 0
    };
  }

  function summaryTitle(run) {
    const score = percentage(run);
    if (score >= 100) return 'Perfect Mission!';
    if (score >= 80) return 'Strong Mission!';
    return 'Keep Practicing';
  }

  function coachingSummary(run) {
    const counts = missionCounts(run);
    if (!counts.refine && !counts.missed) {
      return 'Excellent work. Your choices consistently matched the plan and supported prevention, replacement behavior teaching, reinforcement, and calm error correction.';
    }
    if (counts.refine && !counts.missed) {
      return 'Strong work. Your choices mostly stayed aligned with the plan. A few responses were workable, but could be tightened by prompting and reinforcing the replacement behavior more directly.';
    }
    return 'You identified some helpful responses, but a few choices moved away from the student’s plan. Keep focusing on calm, plan-aligned responding during tricky moments.';
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
        MR.$('#progress-list').innerHTML = `<h2 class="history-heading">Mission History</h2><p class="history-disclaimer">${SCORE_DISCLAIMER}</p><div class="progress-message progress-error" role="alert">${LOAD_ERROR}</div>`;
        return;
      }

      runs = newestFirst(runs);
      this.renderSummary(runs);
      const list = MR.$('#progress-list');
      if (!runs.length) {
        list.innerHTML = `<h2 class="history-heading">Mission History</h2><p class="history-disclaimer">${SCORE_DISCLAIMER}</p><div class="progress-message empty-progress">${EMPTY_MESSAGE}</div>`;
        return;
      }

      list.innerHTML = `<h2 class="history-heading">Mission History</h2><p class="history-disclaimer">${SCORE_DISCLAIMER}</p>${runs.map((run, index) => this.runCard(run, index)).join('')}`;
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
      const counts = missionCounts(run);
      const maxScore = Number(value(run, 'maxScore', 'max_score')) || 0;
      const score = Number(value(run, 'score', 'score')) || 0;
      return `<section class="results-debrief progress-summary-debrief">
        <h1>${MR.escapeHTML(summaryTitle(run))}</h1>
        <section class="results-card results-summary-card">
          <h2>Mission Summary</h2>
          <dl class="results-stats">
            <div><dt>Total Score</dt><dd>${score} / ${maxScore}</dd></div>
            <div><dt>Percent</dt><dd>${percentage(run)}%</dd></div>
            <div><dt>Best Choice</dt><dd>${counts.best}</dd></div>
            <div><dt>Workable, but Refine</dt><dd>${counts.refine}</dd></div>
            <div><dt>Missed Opportunity</dt><dd>${counts.missed}</dd></div>
          </dl>
        </section>
        <section class="results-card results-coaching-card">
          <h2>Coaching Summary</h2>
          <p>${MR.escapeHTML(coachingSummary(run))}</p>
        </section>
      </section>`;
    },

    DENVER_TIME_ZONE
  };
})();
