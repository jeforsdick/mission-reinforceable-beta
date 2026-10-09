'use strict';
const { KINDS, createQaCronHandler } = require('../server/qa-teacher-email-service');
module.exports = createQaCronHandler(KINDS.DAILY);
