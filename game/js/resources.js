(function () {
  'use strict';

  const MR = window.MR = window.MR || {};
  const UNAVAILABLE_MESSAGE = 'BIP resources are not available. Please contact the research team.';
  const DRAFT_EMPTY_MESSAGE = 'This section has not been started in the saved Resource Map draft.';
  const DRAFT_INVALID_MESSAGE = 'This draft section contains content that must be corrected before publishing.';
  const SECTION_TITLES = {
    bip: 'BIP at a Glance',
    functionForest: 'Function Forest',
    prevention: 'Prevention Palace',
    replacement: 'Replacement Reservoir',
    reinforcement: 'Reinforcement Ridge',
    errorCorrection: 'Error Correction Canyon',
    library: 'BSP Library',
    coaching: 'Coaching Cottage',
    fidelity: 'Fidelity Fortress'
  };

  function isText(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function isValidBlock(block) {
    if (!block || typeof block !== 'object' || Array.isArray(block)) return false;
    if (block.type === 'paragraph') return isText(block.text);
    if (block.type === 'list') return Array.isArray(block.items) && block.items.length > 0 && block.items.every(isText);
    if (block.type === 'definitionList') {
      return Array.isArray(block.items) && block.items.length > 0 && block.items.every(item => (
        item && typeof item === 'object' && !Array.isArray(item) && isText(item.term) && isText(item.definition)
      ));
    }
    return block.type === 'callout' && isText(block.label) && isText(block.text);
  }

  function getSections() {
    const resources = MR.resourcesData;
    if (!resources || typeof resources !== 'object' || resources.schemaVersion !== 1 || !resources.sections || typeof resources.sections !== 'object') return null;
    if (MR.telemetryContext?.draftQa === true) {
      return Object.fromEntries(Object.entries(SECTION_TITLES).map(([key, canonicalTitle]) => {
        const section = resources.sections[key];
        if (!section || !Array.isArray(section.blocks) || section.blocks.length === 0) {
          return [key, { title: canonicalTitle, blocks: [], draftStatus: 'empty' }];
        }
        if (section.title !== canonicalTitle || !section.blocks.every(isValidBlock)) {
          return [key, { title: canonicalTitle, blocks: [], draftStatus: 'invalid' }];
        }
        return [key, { title: canonicalTitle, blocks: section.blocks, draftStatus: 'ready' }];
      }));
    }
    const valid = Object.entries(SECTION_TITLES).every(([key, canonicalTitle]) => {
      const section = resources.sections[key];
      return section && section.title === canonicalTitle && Array.isArray(section.blocks) && section.blocks.length > 0 && section.blocks.every(isValidBlock);
    });
    return valid ? resources.sections : null;
  }

  function appendTextElement(root, tagName, text, className) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = text;
    root.appendChild(element);
    return element;
  }

  function renderBlock(root, block) {
    if (block.type === 'paragraph') {
      appendTextElement(root, 'p', block.text);
    } else if (block.type === 'list') {
      const list = document.createElement('ul');
      block.items.forEach(item => appendTextElement(list, 'li', item));
      root.appendChild(list);
    } else if (block.type === 'definitionList') {
      const list = document.createElement('dl');
      list.className = 'behavior-basics';
      block.items.forEach(item => {
        const row = document.createElement('div');
        appendTextElement(row, 'dt', item.term);
        appendTextElement(row, 'dd', item.definition);
        list.appendChild(row);
      });
      root.appendChild(list);
    } else if (block.type === 'callout') {
      const callout = document.createElement('aside');
      callout.className = 'resource-callout';
      appendTextElement(callout, 'strong', block.label);
      appendTextElement(callout, 'p', block.text);
      root.appendChild(callout);
    }
  }

  function setActiveHotspot(sectionKey) {
    MR.$$('.map-hotspot').forEach(button => {
      const active = button.dataset.resourceSection === sectionKey;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function renderUnavailable(title, root, backButton) {
    title.textContent = 'Resources unavailable';
    root.replaceChildren();
    appendTextElement(root, 'p', UNAVAILABLE_MESSAGE, 'resources-unavailable');
    setActiveHotspot('');
    if (backButton) backButton.hidden = true;
    root.scrollTop = 0;
  }

  function renderResourceSection(sectionKey = 'bip') {
    const title = MR.$('#resources-title');
    const root = MR.$('#resources-content');
    const backButton = MR.$('#back-to-bip');
    if (!title || !root) return;

    const sections = getSections();
    const item = sections && sections[sectionKey];
    if (!item) {
      renderUnavailable(title, root, backButton);
      return;
    }

    title.textContent = item.title;
    root.replaceChildren();
    if (item.draftStatus === 'empty') appendTextElement(root, 'p', DRAFT_EMPTY_MESSAGE, 'resources-draft-status');
    else if (item.draftStatus === 'invalid') appendTextElement(root, 'p', DRAFT_INVALID_MESSAGE, 'resources-draft-status');
    else item.blocks.forEach(block => renderBlock(root, block));
    setActiveHotspot(sectionKey === 'bip' ? '' : sectionKey);
    if (backButton) backButton.hidden = sectionKey === 'bip';
    root.scrollTop = 0;
  }

  function recordSectionOpen(sectionKey) {
    if (!MR.telemetryContext || !MR.auth || typeof MR.auth.recordResourceEvent !== 'function') return;
    MR.auth.recordResourceEvent('resource_section_opened', sectionKey).catch(error => {
      console.warn('Resource Map usage telemetry could not be saved.', error);
    });
  }

  function wireMap() {
    MR.$$('.map-hotspot').forEach(button => {
      if (button.dataset.resourceWired === 'true') return;
      button.dataset.resourceWired = 'true';
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => {
        if (MR.audio && typeof MR.audio.playSfx === 'function') MR.audio.playSfx('click', 0.24);
        recordSectionOpen(button.dataset.resourceSection);
        renderResourceSection(button.dataset.resourceSection);
      });
    });

    const backButton = MR.$('#back-to-bip');
    if (backButton && backButton.dataset.resourceWired !== 'true') {
      backButton.dataset.resourceWired = 'true';
      backButton.addEventListener('click', () => {
        if (MR.audio && typeof MR.audio.playSfx === 'function') MR.audio.playSfx('click', 0.24);
        recordSectionOpen('bip');
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
