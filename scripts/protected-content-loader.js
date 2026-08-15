#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function runFile(filename, context) {
  vm.runInContext(fs.readFileSync(filename, 'utf8'), context, { filename });
}

function safeContentPath(sourceDir, relativeFile) {
  const cleanFile = String(relativeFile).split('?')[0];
  const filename = path.resolve(sourceDir, cleanFile);
  const relative = path.relative(sourceDir, filename);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Content file escapes source directory: ${relativeFile}`);
  }
  return filename;
}

function loadExecutableContent(sourceDirectory) {
  const sourceDir = path.resolve(sourceDirectory);
  const sandbox = {
    console,
    POOL: { daily: [], wild: [], crisis: [] },
    GAME_CONFIG: {},
    MR_TEACHER_CONFIG: null,
    MR_RESOURCES: null
  };
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);

  runFile(path.join(sourceDir, 'config.js'), context);
  const config = JSON.parse(JSON.stringify(context.MR_TEACHER_CONFIG || {}));
  const missionFiles = Array.isArray(config.missionFiles) ? config.missionFiles.slice() : [];
  const resourcesFile = config.resourcesFile || '';
  for (const relativeFile of missionFiles) runFile(safeContentPath(sourceDir, relativeFile), context);
  if (resourcesFile) runFile(safeContentPath(sourceDir, resourcesFile), context);

  delete config.missionFiles;
  delete config.resourcesFile;
  config.contentSource = 'supabase-protected';

  return JSON.parse(JSON.stringify({
    config,
    resources: context.MR_RESOURCES || {},
    daily_missions: context.POOL.daily || [],
    wildcard_missions: context.POOL.wild || [],
    crisis_missions: context.POOL.crisis || []
  }));
}

function missionGroups(payload) {
  return {
    daily: payload.daily_missions || [],
    wildcard: payload.wildcard_missions || [],
    crisis: payload.crisis_missions || []
  };
}

module.exports = { loadExecutableContent, missionGroups, safeContentPath };
