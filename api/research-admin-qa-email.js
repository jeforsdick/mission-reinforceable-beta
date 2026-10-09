'use strict';

const { authorize, json, methodGuard, UUID_PATTERN } = require('./research-admin-server');
const { KINDS, deliver } = require('../server/qa-teacher-email-service');

module.exports = async function handler(request,response) {
  if(methodGuard(request,response))return;
  try {
    await authorize(request);
    const body=request.body||{};
    if(Object.keys(body).sort().join(',')!=='action,case_id'
      || !UUID_PATTERN.test(body.case_id||'')
      || !['send_daily','send_weekly'].includes(body.action)) {
      return json(response,400,{error:'Exactly action and case_id are required.'});
    }
    const type=body.action==='send_daily'?KINDS.DAILY:KINDS.WEEKLY;
    const result=await deliver(type,{caseId:body.case_id,manual:true});
    return json(response,result.failed?502:200,result);
  } catch(error) {
    console.error('Manual QA email request rejected:',error.message);
    return json(response,error.message?.includes('opted-in')?409:502,{error:error.message||'QA email unavailable.'});
  }
};
