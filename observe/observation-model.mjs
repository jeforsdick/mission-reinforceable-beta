export const REAL_SESSION = Object.freeze({
  durationSeconds: 30 * 60,
  intervalSeconds: 15,
  intervalCount: 120
});

export const TEST_SESSION = Object.freeze({
  durationSeconds: 60,
  intervalSeconds: 5,
  intervalCount: 12
});

export function formatClock(totalSeconds) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function calculateFidelity(scores = {}) {
  const values = Object.values(scores).map((entry) =>
    typeof entry === "string" ? entry : entry?.score
  );
  const implemented = values.filter((value) => value === "implemented").length;
  const notImplemented = values.filter((value) => value === "not_implemented").length;
  const noOpportunity = values.filter((value) => value === "no_opportunity").length;
  const scoreable = implemented + notImplemented;
  return {
    implemented,
    notImplemented,
    noOpportunity,
    scoreable,
    percent: scoreable ? (implemented / scoreable) * 100 : null
  };
}

export function calculateStudentBehavior(intervals = []) {
  const occurred = intervals.filter((value) => value === "occurred").length;
  const didNotOccur = intervals.filter((value) => value === "did_not_occur").length;
  const notObserved = intervals.filter((value) => value === "not_observed").length;
  const observed = occurred + didNotOccur;
  return {
    occurred,
    didNotOccur,
    notObserved,
    observed,
    percent: observed ? (occurred / observed) * 100 : null
  };
}

export function calculateIntervalIOA(primary = [], secondary = []) {
  const count = Math.min(primary.length, secondary.length);
  let agreements = 0;
  let disagreements = 0;
  let excluded = 0;

  for (let index = 0; index < count; index += 1) {
    const a = primary[index];
    const b = secondary[index];
    if (a === "not_observed" || b === "not_observed" || !a || !b) {
      excluded += 1;
      continue;
    }
    if (a === b) agreements += 1;
    else disagreements += 1;
  }

  const compared = agreements + disagreements;
  return {
    agreements,
    disagreements,
    excluded,
    compared,
    percent: compared ? (agreements / compared) * 100 : null
  };
}

export function calculateFidelityIOA(primary = {}, secondary = {}) {
  const keys = [...new Set([...Object.keys(primary), ...Object.keys(secondary)])];
  let agreements = 0;
  let disagreements = 0;
  let excluded = 0;

  for (const key of keys) {
    const a = typeof primary[key] === "string" ? primary[key] : primary[key]?.score;
    const b = typeof secondary[key] === "string" ? secondary[key] : secondary[key]?.score;
    if (!a || !b) {
      excluded += 1;
      continue;
    }
    if (a === b) agreements += 1;
    else disagreements += 1;
  }

  const compared = agreements + disagreements;
  return {
    agreements,
    disagreements,
    excluded,
    compared,
    percent: compared ? (agreements / compared) * 100 : null
  };
}
