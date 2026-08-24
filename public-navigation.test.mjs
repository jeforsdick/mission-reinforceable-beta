import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { canAccessCoachDashboard } from './coach-dashboard/dashboard-access.mjs';

const publicPages = [
  'index.html',
  'demo/index.html',
  'research/index.html',
  'intake/index.html',
];

const primaryNavigation = (html) => {
  const match = html.match(/<nav class="nav-links" aria-label="Primary navigation">([\s\S]*?)<\/nav>/);
  assert.ok(match, 'page has primary navigation');
  return match[1];
};

for (const page of publicPages) {
  test(`${page} exposes coach login before the primary teacher CTA`, async () => {
    const nav = primaryNavigation(await readFile(new URL(page, import.meta.url), 'utf8'));
    const coachLink = '<a href="/coach-dashboard/">Coach Login</a>';
    const teacherLink = '<a class="nav-cta" href="/game/">Teacher Login</a>';

    assert.equal(nav.match(/>Coach Login<\/a>/g)?.length, 1);
    assert.equal(nav.match(/>Teacher Login<\/a>/g)?.length, 1);
    assert.ok(nav.indexOf(coachLink) < nav.indexOf(teacherLink));
    assert.match(nav, /<a href="\/coach-dashboard\/">Coach Login<\/a>\s*<a class="nav-cta" href="\/game\/">Teacher Login<\/a>/);
  });
}

test('responsive public navigation keeps both login links visible', async () => {
  const css = await readFile(new URL('assets/site/site.css', import.meta.url), 'utf8');
  const mobileRules = css.slice(css.indexOf('@media (max-width: 620px)'));

  assert.match(mobileRules, /\.nav-links,\s*\.nav-links a,/);
  assert.match(mobileRules, /\.nav-links a,\s*\.button \{\s*justify-content: center;/);
  assert.doesNotMatch(mobileRules, /\.nav-links[^{}]*\{[^{}]*display:\s*none/);
});

test('coach dashboard authorization still rejects teachers and inactive users', () => {
  assert.equal(canAccessCoachDashboard({ role: 'coach', active: true }), true);
  assert.equal(canAccessCoachDashboard({ role: 'teacher', active: true }), false);
  assert.equal(canAccessCoachDashboard({ role: 'coach', active: false }), false);
  assert.equal(canAccessCoachDashboard(null), false);
});
