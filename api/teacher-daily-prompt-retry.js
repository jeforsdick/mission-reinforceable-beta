'use strict';

const { createHandler, TYPES } = require('../server/teacher-reminder-service');

module.exports = createHandler(TYPES.DAILY, { retryOnly: true });
