const target = document.getElementById("weekly-schedule-dashboard");

function esc(value) {
  return String(value == null ? "" : value).replace(/[&<>'"]/g, function (ch) {
    return { "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[ch];
  });
}

function mondayOf(date) {
  var d = date ? new Date(date) : new Date();
  d = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  var offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

function addDays(date, n) {
  var d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isoDate(date) {
  var y = date.getFullYear();
  var m = String(date.getMonth() + 1).padStart(2, "0");
  var d = String(date.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + d;
}

function labelDay(date) {
  return new Intl.DateTimeFormat(undefined, { weekday:"short", month:"short", day:"numeric" }).format(date);
}

function labelTime(value) {
  if (!value) return "—";
  var parts = String(value).slice(0,5).split(":");
  var hour = Number(parts[0]);
  var minute = Number(parts[1]);
  return (hour % 12 || 12) + ":" + String(minute).padStart(2, "0") + " " + (hour < 12 ? "AM" : "PM");
}

var currentWeek = mondayOf();
var dashboard = null;

function observerName(id) {
  var found = (dashboard.observers || []).find(function (o) { return o.id === id; });
  return found ? found.display_name : "Unassigned";
}

function scheduleFor(caseId) {
  return (dashboard.schedules || []).find(function (s) { return s.case_id === caseId; });
}

function clearedObservers() {
  return (dashboard.observers || []).filter(function (o) {
    return o.active && dashboard.clearance[o.id] === "cleared";
  });
}
function primaryObservers() {
  return clearedObservers().filter(function (o) {
    return o.observer_type === "trained_observer";
  });
}
function onlineTrainingReady(id) {
  return (dashboard.training || []).some(function (row) {
    return row.observer_id === id && row.online_criterion_met === true && row.module_complete === true;
  });
}
function primaryCandidateObservers() {
  return (dashboard.observers || []).filter(function (o) {
    if (!o.active) return false;
    if (o.observer_type === "primary_researcher") return dashboard.clearance[o.id] !== "revoked";
    return o.observer_type === "trained_observer"
      && (dashboard.clearance[o.id] === "cleared" || onlineTrainingReady(o.id));
  });
}
function calibrationSupportObservers() {
  return (dashboard.observers || []).filter(function (o) {
    return o.active && o.observer_type === "primary_researcher";
  });
}

function allSchedulingCases() {
  var seen = new Set();
  return (dashboard.cases || []).concat(dashboard.testCases || []).filter(function (c) {
    if (!c || seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}
function activeCases() {
  return allSchedulingCases().filter(function (c) {
    return !c.archived_at;
  });
}
function isTestCase(caseId) {
  var item = allSchedulingCases().find(function (c) { return c.id === caseId; });
  return item?.is_test === true;
}

function weeklySummary() {
  var studySchedules = (dashboard.schedules || []).filter(function (row) { return !isTestCase(row.case_id); });
  var studySlots = (dashboard.slots || []).filter(function (row) { return !isTestCase(row.case_id); });
  var expected = studySchedules.reduce(function (sum, row) {
    var item = caseForSchedule(row.case_id);
    return sum + Number(collectionPlan(item,row).target || 0);
  }, 0);
  var completed = studySlots.filter(function (s) { return s.status === "completed"; }).length;
  var assigned = studySlots.filter(function (s) {
    return !!s.primary_observer_id && s.status !== "cancelled" && s.status !== "needs_reschedule";
  }).length;
  var reschedules = studySlots.filter(function (s) { return s.status === "needs_reschedule"; }).length;
  var cumulative = dashboard.state.observationData && dashboard.state.observationData.coverage
    ? dashboard.state.observationData.coverage : {};
  var cumulativeCompleted = Number(cumulative.completed || 0);
  var cumulativeIoa = Number(cumulative.ioa || 0);
  var remaining = Math.max(expected - completed, 0);
  var requiredByEnd = Math.ceil((cumulativeCompleted + remaining) * 0.20);
  var plannedIoa = studySlots.filter(function (s) {
    return s.secondary_role === "formal_ioa" || s.secondary_role === "calibration_and_ioa";
  }).length;
  return {
    expected: expected,
    completed: completed,
    assigned: assigned,
    reschedules: reschedules,
    unassigned: Math.max(expected - assigned, 0),
    cumulativeCompleted: cumulativeCompleted,
    cumulativeIoa: cumulativeIoa,
    ioaStillNeeded: Math.max(requiredByEnd - cumulativeIoa - plannedIoa, 0)
  };
}

function caseLabel(item) {
  var label = item.study_id || item.case_code || "Case";
  return item.is_test === true ? label + " · QA" : label;
}

function finalizedBaselineRows(item) {
  return ((item && item.observation_data && item.observation_data.observations) || []).filter(function (row) {
    return row.phase === "baseline" && !!row.summary_revision_id;
  });
}

function collectionPlan(item, schedule) {
  if (!item) return { label:"Not active", target:0 };
  var phase = item.current_phase || "prebaseline";
  if (phase === "baseline") {
    var position = Number(item.protocol && item.protocol.stagger_position || 0);
    var planned = Number(item.protocol && item.protocol.planned_baseline_observations || 0);
    var rows = finalizedBaselineRows(item);
    if (position === 1) return { label:"Daily baseline", target:5 };
    if (position > 1) {
      var initial = rows.filter(function (row) { return row.baseline_measurement_role === "initial_series"; }).length;
      var preStarted = !!(item.observation_data && item.observation_data.probe_state && item.observation_data.probe_state.preintervention_series_started_on);
      if (initial < 3) return { label:"Initial 3-session series", target:Math.max(3-initial,0) };
      if (preStarted) {
        var pre = rows.filter(function (row) { return row.baseline_measurement_role === "preintervention_series"; }).length;
        return { label:"Final 3-session series", target:Math.max(3-pre,0) || 1 };
      }
      if (planned && rows.length >= Math.max(planned-3,3)) return { label:"Ready to begin final 3-session series", target:0 };
      return { label:"Intermittent probe", target:1 };
    }
    return { label:"Baseline assignment needed", target:0 };
  }
  if (phase === "intervention") return { label:"Intervention observations", target:Number(schedule && schedule.weekly_target_days || 3) };
  if (phase === "maintenance") return { label:"Maintenance probes", target:0 };
  return { label:"No observations due", target:0 };
}

function caseForSchedule(caseId) {
  return allSchedulingCases().find(function (item) { return item.id === caseId; });
}

function renderCaseSetup(item) {
  var schedule = scheduleFor(item.id);
  if (!schedule) {
    return '<article class="schedule-case-config needs-config">' +
      '<div><strong>' + esc(caseLabel(item)) + '</strong><span>Routine time not set</span></div>' +
      '<form class="routine-config-form" data-case="' + esc(item.id) + '">' +
      '<input name="routine" placeholder="Routine label" required>' +
      '<input name="start" type="time" required>' +
      '<input name="end" type="time" required>' +
      '<button class="quiet" type="submit">Set routine</button>' +
      '</form></article>';
  }
  var caseSlots = dashboard.slots.filter(function (s) { return s.case_id === item.id; });
  var assigned = caseSlots.filter(function (s) { return !!s.primary_observer_id && s.status !== "needs_reschedule" && s.status !== "cancelled"; }).length;
  var done = caseSlots.filter(function (s) { return s.status === "completed"; }).length;
  var plan = collectionPlan(item,schedule);
  var targetText = plan.target ? assigned + '/' + plan.target + ' assigned' : assigned + ' assigned';
  return '<article class="schedule-case-config">' +
    '<div><strong>' + esc(caseLabel(item)) + '</strong>' +
    '<span>' + esc(schedule.routine_label || "Routine") + ' · ' + labelTime(schedule.routine_start_time) + '–' + labelTime(schedule.routine_end_time) + '</span>' +
    '<small>' + esc(plan.label) + '</small></div>' +
    '<div class="case-week-progress"><b>' + esc(targetText) + '</b><span>' + done + ' complete</span></div>' +
    '</article>';
}

function renderSlot(slot) {
  var secondary = slot.secondary_observer_id ? " + " + observerName(slot.secondary_observer_id) : "";
  var buttons = "";
  if (slot.attendance_status === "unchecked" && slot.status !== "completed") {
    buttons = '<div class="slot-actions">' +
      '<button class="mini-action" data-present="' + slot.id + '">Student present</button>' +
      '<button class="mini-action" data-absent="' + slot.id + '">Absent</button>' +
      '</div>';
  }
  return '<article class="schedule-slot ' + esc(slot.status) + '">' +
    '<div class="slot-top"><strong>' + esc(slot.case_code_snapshot || "Case") + '</strong><span>' + esc(slot.status.replaceAll("_"," ")) + '</span></div>' +
    '<p>' + esc(slot.routine_label_snapshot || "Routine") + ' · ' + labelTime(slot.planned_start_time) + '–' + labelTime(slot.planned_end_time) + '</p>' +
    '<p><b>' + esc(observerName(slot.primary_observer_id)) + secondary + '</b></p>' +
    buttons +
    '</article>';
}

function renderDay(date) {
  var dateKey = isoDate(date);
  var slots = dashboard.slots.filter(function (s) { return s.observation_date === dateKey; });
  var caseOptions = (dashboard.schedules || []).map(function (schedule) {
    var item = activeCases().find(function (c) { return c.id === schedule.case_id; });
    if (!item) return "";
    var already = slots.some(function (slot) { return slot.case_id === schedule.case_id; });
    var plan = collectionPlan(item,schedule);
    return '<option value="' + esc(schedule.case_id) + '"' + (already ? " disabled" : "") + '>' +
      esc(caseLabel(item)) + ' · ' + esc(plan.label) + ' · ' + labelTime(schedule.routine_start_time) + '</option>';
  }).join("");
  var observerOptions = primaryCandidateObservers().map(function (o) {
    var suffix = "";
    if (o.observer_type === "primary_researcher") suffix = " — researcher backup";
    else if (dashboard.clearance[o.id] !== "cleared") suffix = " — calibration only";
    return '<option value="' + esc(o.id) + '">' + esc(o.display_name + suffix) + '</option>';
  }).join("");
  var pairedPool = clearedObservers().concat(calibrationSupportObservers().filter(function (o) {
    return !clearedObservers().some(function (x) { return x.id === o.id; });
  }));
  var pairedOptions = pairedPool.map(function (o) {
    var supportOnly = o.observer_type === "primary_researcher" && dashboard.clearance[o.id] !== "cleared";
    return '<option value="' + esc(o.id) + '">' + esc(o.display_name + (supportOnly ? " — calibration support" : "")) + '</option>';
  }).join("");
  return '<section class="schedule-day">' +
    '<header><strong>' + labelDay(date) + '</strong><span>' + slots.length + ' planned</span></header>' +
    '<div class="day-slots">' + (slots.length ? slots.map(renderSlot).join("") : '<p class="empty-day">No observation assigned.</p>') + '</div>' +
    '<details class="add-slot"><summary>+ Assign observation</summary>' +
    '<form class="assign-slot-form" data-date="' + dateKey + '">' +
    '<select name="case_id" required><option value="">Case</option>' + caseOptions + '</select>' +
    '<select name="observer_id" required><option value="">Primary observer</option>' +
      (observerOptions || '<option value="" disabled>No cleared primary collectors yet</option>') +
    '</select>' +
    '<select name="secondary_id"><option value="">No paired observer</option>' + pairedOptions + '</select>' +
    '<select name="secondary_role"><option value="">Paired role</option><option value="formal_ioa">Formal IOA</option><option value="supported_calibration">Supported calibration</option><option value="calibration_and_ioa">Calibration + IOA</option></select>' +
    '<small class="schedule-helper">Supported calibration uses an online-qualified trainee + Jess. Jess may also serve as a researcher backup primary when needed.</small>' +
    '<button class="quiet" type="submit"' + (observerOptions ? "" : " disabled") + '>Assign</button>' +
    '</form></details></section>';
}

function render() {
  if (!dashboard) return;
  var summary = weeklySummary();
  var days = [0,1,2,3,4].map(function (n) { return addDays(currentWeek, n); });
  var attention = [];
  if (summary.unassigned) attention.push(summary.unassigned + " observation day(s) still need an observer.");
  if (summary.reschedules) attention.push(summary.reschedules + " session(s) need rescheduling.");
  if (summary.ioaStillNeeded) attention.push("Schedule " + summary.ioaStillNeeded + " more formal IOA session(s) to stay on pace for ≥20%.");

  target.innerHTML =
    '<section class="panel schedule-panel">' +
    '<div class="section-heading schedule-heading">' +
      '<div><p class="eyebrow">This Week</p><h2>Observation Command Center</h2>' +
      '<p>Observation targets follow the design: Position 1 daily baseline; later tiers 3 → intermittent probes → 3; intervention approximately 3 days/week.</p></div>' +
      '<div class="week-switcher"><button class="quiet" id="prev-week">←</button><strong>' +
      labelDay(days[0]) + '–' + labelDay(days[4]) +
      '</strong><button class="quiet" id="next-week">→</button></div>' +
    '</div>' +
    '<div class="weekly-kpis">' +
      '<div><span>Observations</span><strong>' + summary.completed + '/' + summary.expected + '</strong><small>' + summary.unassigned + ' still need assignment</small></div>' +
      '<div><span>Reschedules</span><strong>' + summary.reschedules + '</strong><small>Absence / missed session</small></div>' +
      '<div><span>IOA still needed</span><strong>' + summary.ioaStillNeeded + '</strong><small>to stay on pace for ≥20%</small></div>' +
      '<div><span>Cumulative IOA</span><strong>' + summary.cumulativeIoa + '/' + summary.cumulativeCompleted + '</strong><small>finalized observations</small></div>' +
    '</div>' +
    '<div class="schedule-attention">' +
      (attention.length ? attention.map(function (x) { return '<span>⚠ ' + esc(x) + '</span>'; }).join("") : '<span class="all-good">Nothing urgent in the weekly schedule.</span>') +
    '</div>' +
    '<div class="week-board">' + days.map(renderDay).join("") + '</div>' +
    '<details class="schedule-config-details">' +
      '<summary>Routine setup & weekly case progress</summary>' +
      '<div class="schedule-case-grid">' + (activeCases().length ? activeCases().map(renderCaseSetup).join("") : '<p>No active study cases.</p>') + '</div>' +
    '</details>' +
    '</section>';

  bind();
}

function bind() {
  target.querySelector("#prev-week")?.addEventListener("click", function () { currentWeek = addDays(currentWeek, -7); load(); });
  target.querySelector("#next-week")?.addEventListener("click", function () { currentWeek = addDays(currentWeek, 7); load(); });

  target.querySelectorAll(".routine-config-form").forEach(function (form) {
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      var fd = new FormData(form);
      var payload = {
        case_id: form.dataset.case,
        routine_label: String(fd.get("routine") || "").trim(),
        routine_start_time: fd.get("start"),
        routine_end_time: fd.get("end"),
        weekly_target_days: 3,
        active: true,
        updated_at: new Date().toISOString()
      };
      var result = await window.__mrResearchAdminClient.from("research_case_observation_schedule").upsert(payload, { onConflict:"case_id" });
      if (result.error) return window.alert(result.error.message);
      load();
    });
  });

  target.querySelectorAll(".assign-slot-form").forEach(function (form) {
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      var fd = new FormData(form);
      var caseId = String(fd.get("case_id"));
      var observerId = String(fd.get("observer_id"));
      var secondaryId = String(fd.get("secondary_id") || "");
      var secondaryRole = String(fd.get("secondary_role") || "");
      if ((secondaryId && !secondaryRole) || (!secondaryId && secondaryRole)) {
        return window.alert("Choose both a paired observer and the paired-observer role.");
      }
      if (secondaryId && secondaryId === observerId) {
        return window.alert("Primary and paired observers must be different people.");
      }
      var primary = (dashboard.observers || []).find(function (o) { return o.id === observerId; });
      var secondary = (dashboard.observers || []).find(function (o) { return o.id === secondaryId; });
      var primaryCleared = dashboard.clearance[observerId] === "cleared";
      var secondaryCleared = secondaryId ? dashboard.clearance[secondaryId] === "cleared" : false;
      var primaryIsResearcher = primary?.observer_type === "primary_researcher";
      var secondaryIsResearcher = secondary?.observer_type === "primary_researcher";

      if (secondaryRole === "supported_calibration") {
        if (!primary || primary.observer_type !== "trained_observer" || !(primaryCleared || onlineTrainingReady(observerId))) {
          return window.alert("Supported calibration requires a trained observer who has completed the online module.");
        }
        if (!secondary || secondary.observer_type !== "primary_researcher") {
          return window.alert("Supported calibration must be paired with Jess as the primary researcher.");
        }
      } else {
        if (!primaryCleared && !primaryIsResearcher) {
          return window.alert("Independent and IOA observations require a cleared trained observer or the primary researcher.");
        }
        if (secondaryId && !secondaryCleared && !secondaryIsResearcher) {
          return window.alert("This paired-observer role requires a cleared observer or the primary researcher.");
        }
      }
      var schedule = scheduleFor(caseId);
      var item = activeCases().find(function (c) { return c.id === caseId; });
      if (!schedule || !item) return;
      var payload = {
        case_id: caseId,
        observation_date: form.dataset.date,
        planned_start_time: schedule.routine_start_time,
        planned_end_time: schedule.routine_end_time,
        primary_observer_id: observerId,
        secondary_observer_id: secondaryId || null,
        secondary_role: secondaryRole || null,
        status: "scheduled",
        attendance_status: "unchecked",
        case_code_snapshot: caseLabel(item),
        routine_label_snapshot: schedule.routine_label || "Routine",
        observer_message_note: primaryIsResearcher ? "Primary researcher serving as backup primary observer." : null
      };
      var result = await window.__mrResearchAdminClient.from("research_observation_schedule_slots").insert(payload);
      if (result.error) return window.alert(result.error.message);
      load();
    });
  });

  target.querySelectorAll("[data-present]").forEach(function (button) {
    button.addEventListener("click", async function () {
      var result = await window.__mrResearchAdminClient.from("research_observation_schedule_slots")
        .update({ attendance_status:"student_present", status:"confirmed", updated_at:new Date().toISOString() })
        .eq("id", button.dataset.present);
      if (result.error) return window.alert(result.error.message);
      load();
    });
  });

  target.querySelectorAll("[data-absent]").forEach(function (button) {
    button.addEventListener("click", async function () {
      var result = await window.__mrResearchAdminClient.from("research_observation_schedule_slots")
        .update({ attendance_status:"student_absent", status:"needs_reschedule", reschedule_reason:"Student absent", updated_at:new Date().toISOString() })
        .eq("id", button.dataset.absent);
      if (result.error) return window.alert(result.error.message);
      load();
    });
  });
}

async function load() {
  var client = window.__mrResearchAdminClient;
  var state = window.__mrResearchAdminState;
  if (!target || !client || !state) return;

  var start = isoDate(currentWeek);
  var end = isoDate(addDays(currentWeek, 4));
  var responses = await Promise.all([
    client.from("research_case_observation_schedule").select("*").eq("active", true),
    client.from("research_observation_schedule_slots").select("*").gte("observation_date", start).lte("observation_date", end).order("observation_date"),
    client.from("research_observer_clearance").select("*"),
    client.rpc("research_admin_observer_training_dashboard")
  ]);
  var error = responses[0].error || responses[1].error || responses[2].error || responses[3].error;
  if (error) {
    target.innerHTML = '<section class="panel schedule-panel"><p class="attention">Weekly schedule could not load: ' + esc(error.message) + '</p></section>';
    return;
  }

  dashboard = {
    cases: state.operations && state.operations.cases ? state.operations.cases : [],
    testCases: state.testCases || [],
    schedules: responses[0].data || [],
    slots: responses[1].data || [],
    observers: state.observationData && state.observationData.observers ? state.observationData.observers : [],
    clearance: Object.fromEntries((responses[2].data || []).map(function (x) { return [x.observer_id, x.clearance_status]; })),
    training: responses[3].data || [],
    state: state
  };
  render();
}

window.addEventListener("mr-research-admin-ready", load);
if (window.__mrResearchAdminClient && window.__mrResearchAdminState) load();
