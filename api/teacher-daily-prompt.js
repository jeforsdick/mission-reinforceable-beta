'use strict';

const { createHandler, TYPES, authorized } = require('../server/teacher-reminder-service');
const { KINDS, deliver } = require('../server/qa-teacher-email-service');

const productionDaily = createHandler(TYPES.DAILY);

module.exports = async function handler(request,response) {
  // Preserve the production delivery implementation and its response verbatim.
  // QA delivery is supplementary and must never suppress real participant prompts.
  let status=200,body=null;
  const proxy={
    setHeader:(...args)=>response.setHeader(...args),
    status(code){status=code;return this;},
    json(value){body=value;return value;}
  };
  await productionDaily(request,proxy);
  if(request.method!=='GET' || !authorized(request.headers?.authorization,process.env.CRON_SECRET)){
    return response.status(status).json(body);
  }
  let qa=null;
  try {
    qa=await deliver(KINDS.DAILY);
  } catch(error) {
    console.error('QA daily delivery failed without affecting production reminders:',error.message);
    qa={error:'QA daily delivery unavailable'};
  }
  return response.status(status).json({...(body||{}),qa});
};
