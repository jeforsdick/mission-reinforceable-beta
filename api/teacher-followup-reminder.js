'use strict';

const { createHandler, TYPES } = require('./teacher-reminder-service');

module.exports = createHandler(TYPES.FOLLOWUP);
