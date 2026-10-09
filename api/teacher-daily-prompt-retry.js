'use strict';

const { createHandler, TYPES, authorized } = require('../server/teacher-reminder-service');
const weeklyRecap = require('../server/weekly-recap-delivery');
const { KINDS, deliver } = require('../server/qa-teacher-email-service');

const dailyRetry = createHandler(TYPES.DAILY, { retry: true });

module.exports = async function handler(request,response) {
  if(request.headers?.['x-vercel-cron-schedule'] !== '0 23 * * 5') {
    return dailyRetry(request,response);
  }
  // Friday's preexisting cron sends production recaps first. QA recaps
  // are a separate, optional run using QA-marked sessions and tokens.
  let status=200,body=null;
  const proxy={
    setHeader:(...args)=>response.setHeader(...args),
    status(code){status=code;return this;},
    json(value){body=value;return value;}
  };
  await weeklyRecap(request,proxy);
  if(request.method!=='GET' || !authorized(request.headers?.authorization,process.env.CRON_SECRET)){
    return response.status(status).json(body);
  }
  let qa=null;
  try {
    qa=await deliver(KINDS.WEEKLY);
  } catch(error) {
    console.error('QA Friday recap failed without affecting production recaps:',error.message);
    qa={error:'QA weekly delivery unavailable'};
  }
  return response.status(status).json({...(body||{}),qa});
};
