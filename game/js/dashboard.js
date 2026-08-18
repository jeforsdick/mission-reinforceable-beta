(function () {
  'use strict';

  const MR = window.MR = window.MR || {};
  const DENVER_TIME_ZONE = 'America/Denver';
  const LOAD_ERROR = 'Mission progress could not be loaded. Please try again or contact the research team.';
  const EMPTY_MESSAGE = 'Complete a mission and your game-practice progress will appear here.';

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

  function alignmentLabel(alignment, score) {
    if (alignment === 'plan_aligned' || Number(score) === 10) return 'Plan-Aligned Choice';
    if (alignment === 'workable_refine' || Number(score) === 5) return 'Workable, but Refine';
    return 'Missed Opportunity';
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
        button.addEventListener('click', async () => {
          const run = runs[Number(button.dataset.index)];
          if (!run) return;
          if (!protectedMode) {
            MR.engine.showStoredRunDetails(run);
            return;
          }
          await this.showProtectedDetails(run, button);
        });
      });
    },

    renderSummary(runs) {
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
      const title = value(run, 'missionTitle', 'mission_title') || 'Mission';
      const planAligned = Number(value(run, 'bestChoiceCount', 'plan_aligned_count')) || 0;
      const refine = Number(value(run, 'refineChoiceCount', 'refine_count')) || 0;
      const missed = Number(value(run, 'missedOpportunityCount', 'missed_count')) || 0;
      return `
        <article class="run-card">
          <img src="${MR.escapeHTML(icon)}" alt="" />
          <div>
            <h3>${MR.escapeHTML(formatDenverDate(run))}</h3>
            <p><strong>${MR.escapeHTML(modeLabel(mode))}</strong> · ${MR.escapeHTML(title)}</p>
            <p><strong>Mission Score: ${percentage(run)}%</strong></p>
            <p>Plan-Aligned Choices: ${planAligned} · Workable, but Refine: ${refine} · Missed Opportunities: ${missed}</p>
          </div>
          <button class="pixel-btn green-btn" data-index="${index}" type="button">Details</button>
        </article>`;
    },

    async showProtectedDetails(run, button) {
      const list = MR.$('#progress-list');
      let panel = MR.$('#mission-review', list);
      if (!panel) {
        panel = document.createElement('section');
        panel.id = 'mission-review';
        panel.className = 'mission-review';
        list.appendChild(panel);
      }
      panel.innerHTML = '<h2>Mission Review</h2><p>Loading feedback…</p>';
      button.disabled = true;
      try {
        const responses = await MR.auth.getProgressResponses(run.id, MR.telemetryContext);
        panel.innerHTML = this.detailsHTML(responses);
      } catch (error) {
        console.error('Mission review load failed:', error);
        panel.innerHTML = '<h2>Mission Review</h2><p>Mission feedback could not be loaded. Please try again.</p>';
      } finally {
        button.disabled = false;
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    },

    detailsHTML(responses) {
      if (!Array.isArray(responses) || !responses.length) {
        return '<h2>Mission Review</h2><p>No reviewable feedback is available for this mission.</p>';
      }
      return `<h2>Mission Review</h2>${responses.map((response, index) => {
        const label = alignmentLabel(response.alignment, response.selected_score);
        const stronger = response.best_answer_text && response.best_answer_text !== response.selected_answer_text
          ? `<p><strong>Stronger Plan-Aligned Move:</strong> ${MR.escapeHTML(response.best_answer_text)}</p>` : '';
        return `<article class="review-step">
          <h3>${index + 1}. ${MR.escapeHTML(response.scenario_title || 'Mission decision')} — ${MR.escapeHTML(label)}</h3>
          ${response.scenario_text ? `<p>${MR.escapeHTML(response.scenario_text)}</p>` : ''}
          <p><strong>Your Choice:</strong> ${MR.escapeHTML(response.selected_answer_text || 'Choice unavailable')}</p>
          <p><strong>Feedback:</strong> ${MR.escapeHTML(response.feedback_text || 'No additional feedback is available.')}</p>
          ${stronger}
        </article>`;
      }).join('')}`;
    },

    DENVER_TIME_ZONE
  };
})();
