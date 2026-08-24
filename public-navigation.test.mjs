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
  test(`${page} exposes the public links in order with teacher login as the primary CTA`, async () => {
    const nav = primaryNavigation(await readFile(new URL(page, import.meta.url), 'utf8'));
    const menu = nav.match(/<div class="nav-menu" id="primary-nav-menu">([\s\S]*?)<\/div>/)?.[1];
    const coachLink = '<a href="/coach-dashboard/">Coach Login</a>';
    const teacherLink = '<a class="nav-cta" href="/game/">Teacher Login</a>';

    assert.equal(nav.match(/>Coach Login<\/a>/g)?.length, 1);
    assert.equal(nav.match(/>Teacher Login<\/a>/g)?.length, 1);
    assert.ok(menu, 'collapsible menu exists');
    assert.deepEqual(
      [...nav.matchAll(/<a\b[^>]*>([^<]+)<\/a>/g)].map((match) => match[1]),
      ['Home', 'Research', 'New Game', 'Play Demo', 'Coach Login', 'Teacher Login'],
    );
    assert.doesNotMatch(nav, />New Game Intake<\/a>/);
    assert.ok(nav.indexOf(coachLink) < nav.indexOf(teacherLink));
    assert.deepEqual(
      [...menu.matchAll(/<a\b[^>]*>([^<]+)<\/a>/g)].map((match) => match[1]),
      ['Home', 'Research', 'New Game', 'Play Demo', 'Coach Login'],
    );
    assert.doesNotMatch(menu, /Teacher Login/);
    assert.match(nav, /<button class="nav-toggle" type="button" aria-label="Open navigation menu" aria-expanded="false" aria-controls="primary-nav-menu" hidden>/);
  });
}

test('responsive public navigation uses a compact row and collapsible menu', async () => {
  const css = await readFile(new URL('assets/site/site.css', import.meta.url), 'utf8');
  const mobileRules = css.slice(css.indexOf('@media (max-width: 700px)'));

  assert.match(mobileRules, /\.nav-wrap\s*\{[^}]*flex-direction:\s*row;[^}]*justify-content:\s*space-between;/s);
  assert.match(mobileRules, /\.brand-logo\s*\{[^}]*width:\s*clamp\(104px, 32vw, 145px\);[^}]*max-width:/s);
  assert.match(mobileRules, /\.nav-links \.nav-cta\s*\{[^}]*min-height:\s*40px;/s);
  assert.match(mobileRules, /\.nav-toggle\s*\{[^}]*width:\s*40px;[^}]*height:\s*40px;/s);
  assert.match(mobileRules, /\.nav-enhanced \.nav-menu\s*\{\s*display:\s*none;/s);
  assert.match(mobileRules, /\.nav-enhanced \.nav-links\.is-open \.nav-menu\s*\{\s*display:\s*grid;/s);
  assert.doesNotMatch(mobileRules, /\.nav-links,\s*\.nav-links a,/);
});

test('public navigation script toggles the menu and closes it with Escape', async () => {
  const script = await readFile(new URL('assets/site/site-nav.js', import.meta.url), 'utf8');

  assert.match(script, /addEventListener\('click'/);
  assert.match(script, /classList\.toggle\('is-open', opening\)/);
  assert.match(script, /setAttribute\('aria-expanded', String\(opening\)\)/);
  assert.match(script, /event\.key === 'Escape'/);
  assert.match(script, /classList\.remove\('is-open'\)/);
});

test('desktop public navigation stays on one line and prevents link text wrapping', async () => {
  const css = await readFile(new URL('assets/site/site.css', import.meta.url), 'utf8');
  const desktopRules = css.slice(0, css.indexOf('@media (max-width: 960px)'));

  assert.match(desktopRules, /\.nav-links\s*\{[^}]*flex-wrap:\s*nowrap;/s);
  assert.match(desktopRules, /\.nav-links a\s*\{[^}]*white-space:\s*nowrap;/s);
});

test('coach dashboard authorization still rejects teachers and inactive users', () => {
  assert.equal(canAccessCoachDashboard({ role: 'coach', active: true }), true);
  assert.equal(canAccessCoachDashboard({ role: 'teacher', active: true }), false);
  assert.equal(canAccessCoachDashboard({ role: 'coach', active: false }), false);
  assert.equal(canAccessCoachDashboard(null), false);
});
