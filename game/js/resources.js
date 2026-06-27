(function () {
  'use strict';

  const MR = window.MR = window.MR || {};

  function list(items) {
    if (!Array.isArray(items) || !items.length) return '';
    return `<ul>${items.map(item => `<li>${MR.escapeHTML(item)}</li>`).join('')}</ul>`;
  }

  function section(title, body) {
    return `
      <section class="bip-section">
        <h2>${MR.escapeHTML(title)}</h2>
        ${body}
      </section>
    `;
  }

  function definitionList(items) {
    if (!Array.isArray(items) || !items.length) return '';
    return `
      <dl class="behavior-basics">
        ${items.map(item => `
          <div>
            <dt>${MR.escapeHTML(item.term)}</dt>
            <dd>${MR.escapeHTML(item.definition)}</dd>
          </div>
        `).join('')}
      </dl>
    `;
  }

  function definitionsByTerm(items, term) {
    if (!Array.isArray(items) || !items.length) return [];
    return items
      .filter(item => item && item.term === term)
      .map(item => item.definition)
      .filter(Boolean);
  }

  function snapshot(data) {
    const snap = data.studentSnapshot || {};
    return `
      <div class="snapshot-grid">
        <p><strong>Student:</strong> ${MR.escapeHTML(snap.student || 'Student')}</p>
        <p><strong>Target routine:</strong> ${MR.escapeHTML(snap.routine || '')}</p>
        <p><strong>Target behavior:</strong> ${MR.escapeHTML(snap.targetBehavior || '')}</p>
        <p><strong>Hypothesized function:</strong> ${MR.escapeHTML(snap.function || '')}</p>
      </div>
    `;
  }

  MR.resources = {
    render() {
      const data = MR.resourcesData || {};
      const pathway = data.bipPathway || {};
      const root = MR.$('#resources-content');
      const title = MR.$('#resources-title');
      if (!root) return;

      if (title) title.textContent = data.title || 'Beta Mission Briefing: Jordan';

      const harderExamples = definitionsByTerm(data.behaviorBasics, 'Less helpful');
      const reminder = definitionsByTerm(data.behaviorBasics, 'Remember');

      root.innerHTML = [
        section(data.title || 'Beta Mission Briefing: Jordan', `<p>Read this short briefing before you play.</p>`),
        section('Your Goal', list(pathway.settingEvents)),
        section('Jordan’s Writing Plan', [
          `<p>${MR.escapeHTML((data.studentSnapshot && data.studentSnapshot.function) || '')}</p>`,
          list([
            (data.studentSnapshot && data.studentSnapshot.routine) ? `Routine: ${data.studentSnapshot.routine}` : '',
            (data.studentSnapshot && data.studentSnapshot.targetBehavior) || ''
          ].filter(Boolean)),
          list(pathway.antecedents)
        ].join('')),
        section('What Helps Jordan', [
          list(pathway.replacementBehavior),
          list(pathway.prevention),
          list(pathway.responsePlan),
          list(pathway.reinforcement)
        ].join('')),
        section('What Makes It Harder', list(harderExamples)),
        section('Quick Reminder', [
          reminder.map(item => `<p>${MR.escapeHTML(item)}</p>`).join(''),
          list(data.fidelityChecklist)
        ].join(''))
      ].join('');
    }
  };
})();
