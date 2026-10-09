'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SOURCE = fs.readFileSync(path.join(__dirname,'..','server','qa-teacher-email-service.js'),'utf8');
const PARTICIPANT_ID = '11111111-1111-4111-8111-111111111111';
const CASE_ID = '22222222-2222-4222-8222-222222222222';
const candidate = {participant_id:PARTICIPANT_ID,case_id:CASE_ID,participant_code:'MR-100',
  teacher_name:'Sample Teacher',teacher_email:'teacher@example.org'};

function makeService({now='2026-10-09T14:00:00.000Z',completed=false,claimable=true,eligible=[candidate]}={}) {
  let providerCalls=0;
  let tokens=0;
  const events=[];
  const sent=[];
  const dependencies = {
    '../api/research-admin-server':{
      supabaseFetch:async (endpoint,opts={})=>{
        const body=opts.body?JSON.parse(opts.body):{};
        let result;
        if(endpoint==='/rest/v1/rpc/eligible_qa_teacher_emails')result=eligible;
        else if(endpoint.startsWith('/rest/v1/game_sessions?')) result=completed?[{ended_at:now}]:[];
        else if(endpoint==='/rest/v1/rpc/claim_qa_teacher_email_event'){
          events.push({kind:'claim',body});
          result=[{claimed:claimable,event_id:claimable?'33333333-3333-4333-8333-333333333333':null}];
        }else if(endpoint.startsWith('/rest/v1/qa_teacher_email_events?')){
          events.push({kind:'patch',body});
          return {ok:true,json:async()=>null};
        }else if(endpoint==='/rest/v1/rpc/research_admin_qa_weekly_game_summary'){
          result={week_start:body.target_week_start,week_end:'2026-10-09',
            missions_completed:3,days_practiced:2,
            mission_mix:{daily:2,mystery:1,crisis:0}};
        }else if(endpoint==='/rest/v1/rpc/generate_qa_teacher_weekly_checkin'){
          events.push({kind:'weekly-token',body});
          result='44444444-4444-4444-8444-444444444444';
        }else if(endpoint.startsWith('/rest/v1/research_qa_game_access_events?')){
          result=[{recorded_at:'2026-10-08T17:00:00Z'}];
        }else throw Error('Unexpected mock database path '+endpoint);
        return {ok:true,json:async()=>result};
      }
    },
    './teacher-reminder-service':{authorized:()=>true},
    './granite-study-calendar':{isEligibleStudyDay:date=>date!=='2026-10-12'},
    './mission-reminder-email':{buildMissionReminderEmail:(url,teacherName)=>({
      subject:'Today’s Mission Is Ready',html:'<a href="'+url+'">Start</a>',text:teacherName+' / '+url})},
    './weekly-recap-email':{buildWeeklyRecapEmail:input=>{
      assert.equal(input.summary.missions_completed,3);
      assert.match(input.weeklyQualtricsUrl,/qa_token=/);
      return {subject:'Your Weekly Quest Recap',html:'<a href="'+input.weeklyQualtricsUrl+'">Check in</a>',
        text:input.weeklyQualtricsUrl};
    }},
    './weekly-checkin-service':{
      createRawToken:()=>{tokens++;return 'secure-test-token';},
      hashToken:()=> 'a'.repeat(64),
      buildQualtricsUrl:()=> 'https://educationutah.co1.qualtrics.com/jfe/form/SV_123?qa_token=placeholder',
      qualtricsConfiguration:()=>({configured:true})
    },
    './weekly-recap-service':{
      denverDate:dt=>new Date(dt).toISOString().slice(0,10),
      eligibleStudyDays:()=>5
    }
  };
  const mod={exports:{}};
  vm.runInNewContext(SOURCE,{module:mod,require:key=>{
    if(!Object.hasOwn(dependencies,key))throw Error('unexpected mock module '+key);
    return dependencies[key];
  },process:{env:{
    SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'service-test',
    RESEND_API_KEY:'resend-test',TEACHER_REMINDER_FROM_EMAIL:'missions@example.org',
    TEACHER_GAME_URL:'https://missionreinforceable.com/game/',CRON_SECRET:'cron-test'
  }},fetch:async (_endpoint,opts)=>{
    providerCalls++;
    const body=JSON.parse(opts.body);
    sent.push(body);
    return {ok:true,json:async()=>({id:'resend-test-id'})};
  },console:{error:()=>{}},Date,URL,encodeURIComponent,Buffer},{filename:'qa-teacher-email-service.js'});
  return {service:mod.exports,stats:()=>({providerCalls,tokens,events,sent})};
}

test('daily QA email sends only to opted-in case and is marked QA',async()=>{
  const {service,stats}=makeService();
  const result=await service.deliver('daily',{manual:true,caseId:CASE_ID,
    now:new Date('2026-10-09T14:00:00Z')});
  assert.equal(result.sent,1);
  const {providerCalls,sent,events}=stats();
  assert.equal(providerCalls,1);
  assert.equal(sent[0].to[0],candidate.teacher_email);
  assert.match(sent[0].subject,/^\[QA\]/);
  assert.equal(events.filter(e=>e.kind==='claim').length,1);
  assert.equal(events.filter(e=>e.kind==='patch'&&e.body.status==='sent').length,1);
});

test('no QA opt-in never sends an email',async()=>{
  const {service,stats}=makeService({eligible:[]});
  await assert.rejects(service.deliver('daily',{manual:true,caseId:CASE_ID}),/opted-in/);
  assert.equal(stats().providerCalls,0);
});

test('scheduled daily prompt skips completed QA gameplay',async()=>{
  const {service,stats}=makeService({completed:true});
  const result=await service.deliver('daily',{now:new Date('2026-10-09T14:00:00Z')});
  assert.equal(result.skipped,1);
  assert.equal(result.sent,0);
  assert.equal(stats().providerCalls,0);
});

test('manual daily test is possible after gameplay',async()=>{
  const {service,stats}=makeService({completed:true});
  const result=await service.deliver('daily',{manual:true,caseId:CASE_ID,
    now:new Date('2026-10-09T14:00:00Z')});
  assert.equal(result.sent,1);
  assert.equal(stats().providerCalls,1);
});

test('Friday recap includes QA game totals and a separate QA check-in token',async()=>{
  const {service,stats}=makeService();
  const result=await service.deliver('weekly',{now:new Date('2026-10-09T23:00:00Z')});
  assert.equal(result.sent,1);
  const {providerCalls,tokens,events,sent}=stats();
  assert.equal(providerCalls,1);
  assert.equal(tokens,1);
  assert.equal(events.filter(x=>x.kind==='weekly-token').length,1);
  assert.match(sent[0].subject,/^\[QA\]/);
  assert.match(sent[0].html,/qualtrics\.com/);
});

test('weekly cron does not send on a non-Friday',async()=>{
  const {service,stats}=makeService();
  const result=await service.deliver('weekly',{now:new Date('2026-10-08T23:00:00Z')});
  assert.equal(result.sent,0);
  assert.equal(stats().providerCalls,0);
});

test('deduplicated claim does not resend the same email',async()=>{
  const {service,stats}=makeService({claimable:false});
  const result=await service.deliver('daily',{manual:true,caseId:CASE_ID});
  assert.equal(result.sent,0);
  assert.equal(result.skipped,1);
  assert.equal(stats().providerCalls,0);
});
