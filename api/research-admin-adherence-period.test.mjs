import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import endpoint from './research-admin-study-day-status.js';

const { interventionAdherencePeriod }=endpoint;
const phase=(phase,effective_date,id='1',recorded_at=`${effective_date}T12:00:00Z`)=>({phase,effective_date,id,recorded_at});

test('baseline days are excluded and cases retain participant-specific intervention starts',()=>{
  const first=interventionAdherencePeriod([phase('baseline','2026-08-12'),phase('intervention','2026-09-01')],'2026-09-20');
  const second=interventionAdherencePeriod([phase('baseline','2026-08-12'),phase('intervention','2026-09-10')],'2026-09-20');
  assert.deepEqual(first,{period_start:'2026-09-01',period_end:'2026-09-20',ended_before:null});
  assert.equal(second.period_start,'2026-09-10');
  assert.notEqual(first.period_start,second.period_start);
});

test('Intervention not started produces no adherence period',()=>{
  assert.equal(interventionAdherencePeriod([phase('prebaseline','2026-08-12'),phase('baseline','2026-08-20')],'2026-09-20'),null);
});

test('the next phase is an exclusive intervention end boundary',()=>{
  const result=interventionAdherencePeriod([
    phase('baseline','2026-08-12'),phase('intervention','2026-09-01'),phase('maintenance','2026-09-15')
  ],'2026-10-01');
  assert.deepEqual(result,{period_start:'2026-09-01',period_end:'2026-09-14',ended_before:'2026-09-15'});
});

test('same-date phase corrections use deterministic latest recorded event',()=>{
  const result=interventionAdherencePeriod([
    phase('intervention','2026-09-01','1','2026-08-30T12:00:00Z'),
    phase('baseline','2026-09-01','2','2026-08-31T12:00:00Z')
  ],'2026-09-20');
  assert.equal(result,null);
});

test('Research Admin never supplies a universal intervention start',async()=>{
  const source=await readFile(new URL('./research-admin-study-day-status.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/period_start:\s*['"]2026-08-12/);
  assert.match(source,/period_start: period\.period_start/);
});
