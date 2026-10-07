import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  REAL_SESSION,
  calculateFidelity,
  calculateStudentBehavior,
  calculateIntervalIOA,
  calculateFidelityIOA,
  formatClock
} from "./observation-model.mjs";

test("real session is 30 minutes with 120 fifteen-second intervals", () => {
  assert.equal(REAL_SESSION.durationSeconds, 1800);
  assert.equal(REAL_SESSION.intervalSeconds, 15);
  assert.equal(REAL_SESSION.intervalCount, 120);
});

test("fidelity excludes no-opportunity items from the denominator", () => {
  const scores = {
    a: "implemented",
    b: "implemented",
    c: "implemented",
    d: "implemented",
    e: "implemented",
    f: "implemented",
    g: "not_implemented",
    h: "not_implemented",
    i: "no_opportunity"
  };
  const result = calculateFidelity(scores);
  assert.equal(result.implemented, 6);
  assert.equal(result.notImplemented, 2);
  assert.equal(result.noOpportunity, 1);
  assert.equal(result.scoreable, 8);
  assert.equal(result.percent, 75);
});

test("student behavior percentage excludes not-observed intervals", () => {
  const result = calculateStudentBehavior([
    "occurred",
    "did_not_occur",
    "not_observed",
    "occurred"
  ]);
  assert.equal(result.observed, 3);
  assert.equal(result.occurred, 2);
  assert.equal(result.notObserved, 1);
  assert.equal(result.percent, (2 / 3) * 100);
});

test("interval IOA compares only observed intervals", () => {
  const result = calculateIntervalIOA(
    ["occurred", "did_not_occur", "not_observed", "occurred"],
    ["occurred", "occurred", "did_not_occur", "occurred"]
  );
  assert.equal(result.agreements, 2);
  assert.equal(result.disagreements, 1);
  assert.equal(result.excluded, 1);
  assert.equal(result.percent, (2 / 3) * 100);
});

test("fidelity IOA is item-by-item", () => {
  const result = calculateFidelityIOA(
    { a: "implemented", b: "no_opportunity", c: "not_implemented" },
    { a: "implemented", b: "no_opportunity", c: "implemented" }
  );
  assert.equal(result.agreements, 2);
  assert.equal(result.disagreements, 1);
  assert.equal(result.percent, (2 / 3) * 100);
});

test("clock formatter uses mm:ss", () => {
  assert.equal(formatClock(1800), "30:00");
  assert.equal(formatClock(65), "01:05");
});


test("live observer preserves repeated timestamped fidelity opportunities", () => {
  const live = fs.readFileSync(new URL("../observer/observer.js", import.meta.url), "utf8");
  assert.match(live, /fidelityOpportunities/);
  assert.match(live, /\+ Add another opportunity/);
  assert.match(live, /Implemented as Written/);
  assert.match(live, /Not Implemented as Written/);
  assert.match(live, /desired_outcome/);
  assert.match(live, /elapsed_seconds:elapsedSeconds\(\)/);
});

test("training teaches and stores repeated fidelity opportunities", () => {
  const training = fs.readFileSync(new URL("./observe.js", import.meta.url), "utf8");
  const page = fs.readFileSync(new URL("./index.html", import.meta.url), "utf8");
  assert.match(training, /fidelityOpportunities/);
  assert.match(training, /\+ Add another opportunity/);
  assert.match(training, /elapsed_seconds:Math\.max/);
  assert.match(page, /score every opportunity/i);
  assert.match(page, /desired outcome occurred/i);
});

test("opportunity migration is backward compatible", () => {
  const migration = fs.readFileSync(new URL("../supabase/migrations/20261007093000_fidelity_opportunity_timeline.sql", import.meta.url), "utf8");
  assert.match(migration, /add column if not exists fidelity_opportunities jsonb not null default '\[\]'::jsonb/);
  assert.match(migration, /research_observer_save_fidelity_opportunities/);
  assert.doesNotMatch(migration, /update public\.research_observation_records_v2[\s\S]*status='submitted'/i);
});
