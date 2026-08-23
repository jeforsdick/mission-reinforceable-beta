#!/usr/bin/env node
'use strict';

const VALIDATOR_VERSION = '1.0.0';
const SCHEMA_VERSION = 1;
const REQUIRED_SECTIONS = Object.freeze({
  bip: 'BIP at a Glance',
  functionForest: 'Function Forest',
  prevention: 'Prevention Palace',
  replacement: 'Replacement Reservoir',
  reinforcement: 'Reinforcement Ridge',
  errorCorrection: 'Error Correction Canyon',
  library: 'BSP Library',
  coaching: 'Coaching Cottage',
  fidelity: 'Fidelity Fortress'
});
const ALLOWED_BLOCK_TYPES = new Set(['paragraph', 'heading', 'list', 'definitionList', 'callout']);
const FORBIDDEN_FIELD = /(?:^on[a-z]+$|script|html|href|src|url|uri|(?:^|_)(?:path|file)(?:$|_)|(?:file|path)(?:name)?$|executable|command)/i;
const HTML_OR_SCRIPT = /<\s*\/?\s*(?:script|iframe|object|embed|style|[a-z][\w-]*)\b|javascript\s*:|\bon(?:click|load|error|mouse\w*|key\w*|submit|focus|blur)\s*=/i;
const PRIVACY_PATTERNS = Object.freeze({
  email: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  phone: /(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]\d{3}[\s.-]\d{4}\b/,
  url: /\b(?:https?:\/\/|www\.)\S+/i,
  full_date: /\b(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4})\b/i
});

function validateResources(resources, options = {}) {
  const errors = [];
  const warnings = [];
  const error = (rule, path, message) => errors.push({ rule, path, message });
  const warning = (rule, path, message) => warnings.push({ rule, path, message });
  const plainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const substantive = value => typeof value === 'string' && value.trim().length > 0;

  if (!plainObject(resources)) {
    error('resources_object', 'resources', 'resources must be a data object');
    return report();
  }
  if (resources.schemaVersion !== SCHEMA_VERSION) error('schema_version', 'resources.schemaVersion', `schemaVersion must be ${SCHEMA_VERSION}`);
  if (options.expectedAlias !== undefined && (!substantive(resources.studentAlias) || resources.studentAlias !== options.expectedAlias)) {
    error('alias_consistency', 'resources.studentAlias', 'studentAlias must exactly match the expected alias');
  }
  if (!plainObject(resources.sections)) {
    error('sections_object', 'resources.sections', 'sections must be an object');
  } else {
    for (const [key, title] of Object.entries(REQUIRED_SECTIONS)) validateSection(key, title, resources.sections[key]);
  }
  scan(resources, 'resources');
  return report();

  function validateSection(key, canonicalTitle, section) {
    const sectionPath = `resources.sections.${key}`;
    if (!plainObject(section)) return error('required_section', sectionPath, `required section ${key} is missing`);
    if (section.title !== canonicalTitle) error('canonical_title', `${sectionPath}.title`, `title must be "${canonicalTitle}"`);
    if (!Array.isArray(section.blocks)) return error('blocks_array', `${sectionPath}.blocks`, 'blocks must be an array');
    if (section.blocks.length === 0) error('substantive_blocks', `${sectionPath}.blocks`, 'section must contain at least one substantive block');
    let substantiveCount = 0;
    section.blocks.forEach((block, index) => {
      const blockPath = `${sectionPath}.blocks[${index}]`;
      if (!plainObject(block)) return error('block_object', blockPath, 'block must be an object');
      if (!ALLOWED_BLOCK_TYPES.has(block.type)) return error('block_type', `${blockPath}.type`, 'unknown block type');
      if (block.type === 'paragraph') {
        if (!substantive(block.text)) error('paragraph_text', `${blockPath}.text`, 'paragraph text must be non-empty text'); else substantiveCount++;
      } else if (block.type === 'heading') {
        if (!substantive(block.text)) error('heading_text', `${blockPath}.text`, 'heading text must be non-empty text'); else substantiveCount++;
      } else if (block.type === 'list') {
        if (!Array.isArray(block.items) || block.items.length === 0 || block.items.some(item => !substantive(item))) error('list_items', `${blockPath}.items`, 'list items must be a non-empty array of non-empty text'); else substantiveCount++;
      } else if (block.type === 'definitionList') {
        if (!Array.isArray(block.items) || block.items.length === 0 || block.items.some(item => !plainObject(item) || !substantive(item.term) || !substantive(item.definition))) error('definition_list_items', `${blockPath}.items`, 'definitionList items require non-empty term and definition text'); else substantiveCount++;
      } else if (block.type === 'callout') {
        if (!substantive(block.label) || !substantive(block.text)) error('callout_fields', blockPath, 'callout requires non-empty label and text'); else substantiveCount++;
      }
    });
    if (section.blocks.length > 0 && substantiveCount === 0) error('substantive_blocks', `${sectionPath}.blocks`, 'section has no substantive blocks');
  }

  function scan(value, currentPath) {
    if (typeof value === 'string') {
      if (HTML_OR_SCRIPT.test(value)) error('raw_html_or_script', currentPath, 'raw HTML, script, or event-handler content is forbidden');
      for (const [kind, pattern] of Object.entries(PRIVACY_PATTERNS)) if (pattern.test(value)) warning(`privacy_${kind}`, currentPath, `${kind.replace('_', ' ')} detected; human privacy review is required`);
      return;
    }
    if (Array.isArray(value)) return value.forEach((item, index) => scan(item, `${currentPath}[${index}]`));
    if (!plainObject(value)) return;
    for (const [key, child] of Object.entries(value)) {
      const childPath = `${currentPath}.${key}`;
      if (FORBIDDEN_FIELD.test(key)) error('unexpected_executable_or_path_field', childPath, `field "${key}" is not permitted`);
      scan(child, childPath);
    }
  }

  function report() {
    return { valid: errors.length === 0, validatorVersion: VALIDATOR_VERSION, schemaVersion: resources && resources.schemaVersion, errors, warnings, privacyNotice: 'Automated privacy scanning is an aid, not certification. Final privacy determination requires human review.' };
  }
}

function formatResourceReport(report) {
  const lines = [...report.errors.map(item => `ERROR ${item.rule} at ${item.path}: ${item.message}`), ...report.warnings.map(item => `WARNING ${item.rule} at ${item.path}: ${item.message}`)];
  lines.push(report.privacyNotice);
  return lines.join('\n');
}

module.exports = { ALLOWED_BLOCK_TYPES, REQUIRED_SECTIONS, SCHEMA_VERSION, VALIDATOR_VERSION, formatResourceReport, validateResources };
