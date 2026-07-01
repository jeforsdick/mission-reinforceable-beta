(function () {
  'use strict';

  const MR = window.MR = window.MR || {};

  const resourceSections = {
    bip: {
      title: 'BIP at a Glance',
      body: `
        <p><strong>Jordan does best when writing feels small, clear, and supported.</strong></p>
        <p><strong>Function:</strong> Escape or avoidance of difficult writing tasks.</p>
        <p><strong>Prevention:</strong> Give a clear first step, offer a sentence starter, reduce the task size, and remind Jordan that help is available.</p>
        <p><strong>Replacement:</strong> Jordan can ask for help, ask for a break, or start with one small writing step.</p>
        <p><strong>Reinforcement:</strong> Praise asking appropriately, starting the task, or returning to writing.</p>
        <p><strong>Error correction:</strong> Stay calm, restate the small next step, prompt the replacement behavior, and reinforce the next right response.</p>
      `
    },

    prevention: {
      title: 'Prevention Palace',
      body: `
        <p><strong>Set Jordan up before writing gets hard.</strong></p>
        <p>Use a clear first step, sentence starter, choice, or smaller writing demand.</p>
        <p><strong>Try:</strong> “First, write one animal. You can ask for help if you get stuck.”</p>
      `
    },

    replacement: {
      title: 'Replacement Reservoir',
      body: `
        <p><strong>Prompt what Jordan can do instead.</strong></p>
        <p>Jordan can ask for help, request a short break, or start with one word.</p>
        <p><strong>Try:</strong> “If you’re stuck, say ‘help please,’ and we’ll do the first word together.”</p>
      `
    },

    reinforcement: {
      title: 'Reinforcement Ridge',
      body: `
        <p><strong>Reinforce the small steps you want to see again.</strong></p>
        <p>Notice when Jordan asks appropriately, starts writing, accepts help, or returns after a break.</p>
        <p><strong>Try:</strong> “Nice job asking for help. That was exactly what to do.”</p>
      `
    },

    errorCorrection: {
      title: 'Error Correction Canyon',
      body: `
        <p><strong>Keep correction calm, brief, and plan-aligned.</strong></p>
        <p>Restate the small next step, prompt the replacement behavior, and reinforce the next helpful response.</p>
        <p><strong>Try:</strong> “First write one animal, or ask me for help.”</p>
      `
    },

    library: {
      title: 'The BSP Library',
      body: `
        <p><strong>Key plan terms:</strong></p>
        <p><strong>Function:</strong> Why the behavior works for Jordan.</p>
        <p><strong>Prevention:</strong> Supports before behavior happens.</p>
        <p><strong>Replacement:</strong> What Jordan should do instead.</p>
        <p><strong>Reinforcement:</strong> What makes the helpful behavior more likely.</p>
        <p><strong>Error correction:</strong> A calm reset back to the plan.</p>
      `
    },

    functionForest: {
      title: 'Function Forest',
      body: `
        <p><strong>Look for the why.</strong></p>
        <p>Jordan may be communicating, “This is too hard,” “I don’t know how to start,” or “I need help.”</p>
        <p><strong>Respond to the function:</strong> make the task clearer, smaller, or more supported.</p>
      `
    },

    coaching: {
      title: 'Coaching Cottage',
      body: `
        <p><strong>Quick coaching reminder:</strong></p>
        <p>Small step. Calm prompt. Quick reinforcement.</p>
        <p>Keep language brief, reduce the audience, prompt before correcting, and reinforce the next right move.</p>
      `
    },

    fidelity: {
      title: 'Fidelity Fortress',
      body: `
        <p><strong>Stay true to the plan.</strong></p>
        <p>Check: Did I prevent? Did I prompt the replacement behavior? Did I reinforce? Did I correct calmly?</p>
        <p><strong>Watch for drift:</strong> too much talking, skipping the prompt, correcting publicly, or letting Jordan escape without practicing the replacement response.</p>
      `
    }
  };

  function contentHTML(sectionKey) {
    const item = resourceSections[sectionKey] || resourceSections.bip;
    return item.body;
  }

  function setActiveHotspot(sectionKey) {
    MR.$$('.map-hotspot').forEach(button => {
      const active = button.dataset.resourceSection === sectionKey;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function renderResourceSection(sectionKey = 'bip') {
    const title = MR.$('#resources-title');
    const root = MR.$('#resources-content');
    const backButton = MR.$('#back-to-bip');
    if (!title || !root) return;

    const item = resourceSections[sectionKey] || resourceSections.bip;
    title.textContent = item ? item.title : 'BIP at a Glance';
    root.innerHTML = contentHTML(sectionKey);
    setActiveHotspot(sectionKey === 'bip' ? '' : sectionKey);
    if (backButton) backButton.hidden = sectionKey === 'bip';
    root.scrollTop = 0;
  }

  function wireMap() {
    MR.$$('.map-hotspot').forEach(button => {
      if (button.dataset.resourceWired === 'true') return;
      button.dataset.resourceWired = 'true';
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => {
        if (MR.audio && typeof MR.audio.playSfx === 'function') {
          MR.audio.playSfx('click', 0.24);
        }
        renderResourceSection(button.dataset.resourceSection);
      });
    });

    const backButton = MR.$('#back-to-bip');
    if (backButton && backButton.dataset.resourceWired !== 'true') {
      backButton.dataset.resourceWired = 'true';
      backButton.addEventListener('click', () => {
        if (MR.audio && typeof MR.audio.playSfx === 'function') {
          MR.audio.playSfx('click', 0.24);
        }
        renderResourceSection('bip');
      });
    }
  }

  MR.resources = {
    render() {
      wireMap();
      renderResourceSection('bip');
    },
    renderResourceSection
  };
})();
