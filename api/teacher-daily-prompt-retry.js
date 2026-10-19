'use strict';

const { createHandler, TYPES, authorized } = require('../server/teacher-reminder-service');
const weeklyRecap = require('../server/weekly-recap-delivery');
const researcherDigest = require('../server/research-weekly-digest');
const { KINDS, deliver } = require('../server/qa-teacher-email-service');

const dailyRetry = createHandler(TYPES.DAILY, { retry: true });

module.exports = async function handler(request,response) {
  // Authenticated QA preview shares this existing function: no additional Vercel function slot.
  if(request.query?.test_case) {
    if(request.method!=='GET'||!authorized(request.headers?.authorization,process.env.CRON_SECRET))
      return response.status(401).json({error:'Unauthorized'});
    if(!['CASE-069','CASE-100'].includes(request.query.test_case))
      return response.status(400).json({error:'Unknown QA test case'});
    try {
      const data=await researcherDigest.digest(new Date(),request.query.test_case);
      return response.status(200).json({preview:true,recipient:researcherDigest.RECIPIENT,subject:researcherDigest.compose(data).subject,content:researcherDigest.compose(data).text});
    } catch(error) {
      console.error('Research digest QA preview failed',error.message);
      return response.status(502).json({error:'QA digest preview unavailable'});
    }
  }
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
  let researchDigest=null;
  if(process.env.RESEARCH_WEEKLY_DIGEST_ENABLED==='true') {
    try {
      const content=await researcherDigest.digest(new Date());
      researchDigest=content.rows.length ? await researcherDigest.send(content) : {sent:false,reason:'no_eligible_dyads'};
    }catch(error){
      console.error('Researcher digest failed independently of teacher recaps:',error.message);
      researchDigest={error:'Research digest unavailable'};
    }
  }
  return response.status(status).json({...(body||{}),qa,researchDigest});
};
