import assert from 'node:assert/strict';
import { extractFidelityTargets, extractionSummary } from './fidelity-target-extractor.mjs';

const row = {
  has_crisis_plan: true,
  replacement_behavior: 'Ask for a short break or use the calm area when a transition feels difficult.',
  prevention_strategies: 'A visual schedule is posted in the classroom. Teacher gives the class transition warnings 10 minutes, 5 minutes, and 1 minute before transitions.',
  teaching_strategies: 'If the student does not follow a direction within 30 seconds, staff prompt the student to do what was asked.',
  reinforcement_system: 'When the student follows directions within 30 seconds, staff give a token and specific praise. After the first prompt and reminder of the reinforcer, staff prompt the student to ask for a break.',
  response_strategy: 'When the student leaves the instructional area, staff remain within eyesight and attempt to redirect the student back to the classroom.',
  crisis_plan: 'If the student leaves school property, staff contact the principal for additional support.',
  fidelity_targets: [
    { domain: 'proactive', sort_order: 1, description: 'Give a transition warning' },
    { domain: 'teaching', sort_order: 1, description: 'Prompt' },
    { domain: 'reinforcement', sort_order: 1, description: 'Token board' },
    { domain: 'response', sort_order: 1, description: 'Maintain eyesight and redirect' },
    { domain: 'crisis', sort_order: 1, description: 'Contact principal if student leaves school property' }
  ]
};

const targets = extractFidelityTargets(row);
const summary = extractionSummary(targets);

assert.ok(targets.length >= 5);
assert.deepEqual(targets.map(t => t.target_key), targets.map((t, i, all) => {
  const n = all.slice(0, i + 1).filter(x => x.domain === t.domain).length;
  return t.domain + '_' + String(n).padStart(2, '0');
}));
assert.ok(targets.some(t => t.domain === 'teaching' && /ask for a break/i.test(t.description)), 'teaching extraction connects replacement behavior to the teaching context');
assert.ok(targets.some(t => t.domain === 'teaching' && /30 seconds/i.test(t.description)), 'teaching timing is preserved');
assert.ok(targets.some(t => t.domain === 'proactive' && /transition warning/i.test(t.description)), 'proactive plan action is retained');
assert.ok(targets.some(t => t.domain === 'response' && /eyesight/i.test(t.description)), 'response plan action is retained');
assert.ok(targets.some(t => t.domain === 'crisis' && /principal/i.test(t.description)), 'crisis remains separate');
assert.equal(targets.some(t => t.domain === 'teaching' && /^Prompt$/i.test(t.description)), false, 'vague teaching shorthand is replaced when richer plan context exists');
assert.ok(summary.by_domain.teaching >= 2);
assert.equal(summary.total, targets.length);

const noCrisis = extractFidelityTargets({ ...row, has_crisis_plan: false });
assert.equal(noCrisis.some(t => t.domain === 'crisis'), false);

const vague = extractFidelityTargets({
  replacement_behavior: 'Use a break card to request a short break.',
  teaching_strategies: '',
  fidelity_targets: [
    { domain: 'proactive', sort_order: 1, description: 'Use visual schedule' },
    { domain: 'teaching', sort_order: 1, description: 'Prompt' },
    { domain: 'reinforcement', sort_order: 1, description: 'Praise' },
    { domain: 'response', sort_order: 1, description: 'Redirect' }
  ]
});
const linked = vague.find(t => t.domain === 'teaching');
assert.match(linked.description, /replacement behavior/i);
assert.equal(linked.needs_review, true);

console.log('Full-plan fidelity target extraction checks passed.');
