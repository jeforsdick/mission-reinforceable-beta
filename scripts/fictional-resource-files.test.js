'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { validateResources } = require('./resource-content-validator');

function loadResource(relativePath) {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8'), context);
  return context.window.MR_RESOURCES;
}

for (const [name, relativePath] of [
  ['Demo-2 development fixture', 'game/teachers/demo-2/content/resources.js'],
  ['Public demo fixture', 'demo-game/content/resources.js']
]) {
  test(`${name} fictional resources pass canonical resource-content validation`, () => {
    const resources = loadResource(relativePath);
    const report = validateResources(resources, { expectedAlias: resources.studentAlias });
    assert.equal(report.valid, true, JSON.stringify(report.errors, null, 2));
  });
}
