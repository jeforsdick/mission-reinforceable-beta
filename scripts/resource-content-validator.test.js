'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { REQUIRED_SECTIONS, validateResources } = require('./resource-content-validator');

function fixture() {
  return {
    schemaVersion: 1,
    studentAlias: 'River',
    sections: Object.fromEntries(Object.entries(REQUIRED_SECTIONS).map(([key, title]) => [key, {
      title,
      blocks: [{ type: 'paragraph', text: 'Use a brief, calm prompt; then reinforce the expected response.' }]
    }]))
  };
}

function rules(report) { return report.errors.map(error => error.rule); }
function warningRules(report) { return report.warnings.map(warning => warning.rule); }

test('complete fictional nine-section fixture passes with normal punctuation', () => {
  const report = validateResources(fixture(), { expectedAlias: 'River' });
  assert.equal(report.valid, true);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.warnings, []);
});

test('missing section fails', () => {
  const value = fixture();
  delete value.sections.coaching;
  assert(rules(validateResources(value)).includes('required_section'));
});

test('wrong canonical title fails', () => {
  const value = fixture();
  value.sections.bip.title = 'BIP Overview';
  assert(rules(validateResources(value)).includes('canonical_title'));
});

test('empty section fails', () => {
  const value = fixture();
  value.sections.library.blocks = [];
  assert(rules(validateResources(value)).includes('substantive_blocks'));
});

test('unknown block type fails', () => {
  const value = fixture();
  value.sections.prevention.blocks = [{ type: 'table', rows: [] }];
  assert(rules(validateResources(value)).includes('block_type'));
});

test('malformed definition list fails', () => {
  const value = fixture();
  value.sections.replacement.blocks = [{ type: 'definitionList', items: [{ term: 'Request' }] }];
  assert(rules(validateResources(value)).includes('definition_list_items'));
});

test('raw HTML, script, event handlers, and executable fields fail', () => {
  for (const unsafe of ['<strong>private</strong>', '<script>alert(1)</script>', 'onclick = "run()"', 'javascript:run()']) {
    const value = fixture();
    value.sections.fidelity.blocks[0].text = unsafe;
    assert(rules(validateResources(value)).includes('raw_html_or_script'), unsafe);
  }
  const value = fixture();
  value.sections.fidelity.blocks[0].filePath = '/tmp/private';
  assert(rules(validateResources(value)).includes('unexpected_executable_or_path_field'));
});

test('email, phone, URL, and obvious full date produce privacy-aid findings', () => {
  const examples = {
    privacy_email: 'Contact educator@example.org.',
    privacy_phone: 'Call (555) 234-6789.',
    privacy_url: 'Read https://example.org/private.',
    privacy_full_date: 'Observed on January 12, 2026.'
  };
  for (const [rule, text] of Object.entries(examples)) {
    const value = fixture();
    value.sections.coaching.blocks[0].text = text;
    const report = validateResources(value);
    assert.equal(report.valid, true);
    assert(warningRules(report).includes(rule));
    assert.match(report.privacyNotice, /aid, not certification/i);
  }
});

test('missing resources, invalid schema, blocks type, fields, and alias fail', () => {
  assert(rules(validateResources(undefined)).includes('resources_object'));
  const value = fixture();
  value.schemaVersion = 2;
  value.sections.bip.blocks = 'not an array';
  assert(rules(validateResources(value, { expectedAlias: 'Different' })).includes('schema_version'));
  assert(rules(validateResources(value, { expectedAlias: 'Different' })).includes('blocks_array'));
  assert(rules(validateResources(value, { expectedAlias: 'Different' })).includes('alias_consistency'));
});

test('all four data-only block types pass', () => {
  const value = fixture();
  value.sections.bip.blocks = [
    { type: 'paragraph', text: 'Fictional paragraph.' },
    { type: 'list', items: ['First.', 'Second.'] },
    { type: 'definitionList', items: [{ term: 'Term', definition: 'Definition.' }] },
    { type: 'callout', label: 'Remember', text: 'Review the fictional plan.' }
  ];
  assert.equal(validateResources(value).valid, true);
});

test('heading is canonical, substantive, and subject to HTML safety validation', () => {
  const value = fixture();
  value.sections.bip.blocks = [{ type: 'heading', text: 'What you may see' }];
  assert.equal(validateResources(value).valid, true);
  value.sections.bip.blocks[0].text = '   ';
  assert(rules(validateResources(value)).includes('heading_text'));
  value.sections.bip.blocks[0].text = '<script>alert(1)</script>';
  assert(rules(validateResources(value)).includes('raw_html_or_script'));
});
