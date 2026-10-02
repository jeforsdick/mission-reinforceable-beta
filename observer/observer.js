const SUPABASE_URL = "https://vyiwwwmcoahwkgiictmc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Mp2ASOgrx0Yx8Bp-Fz3AAg_V5Gl0I4W";

const loadingView = document.getElementById("loading-view");
const loginView = document.getElementById("login-view");
const unauthorizedView = document.getElementById("unauthorized-view");
const portalView = document.getElementById("portal-view");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const observerName = document.getElementById("observer-name");
const readinessStatus = document.getElementById("readiness-status");
const readinessHelp = document.getElementById("readiness-help");
const assignmentList = document.getElementById("assignment-list");

let client = null;

function show(view) {
  [loadingView, loginView, unauthorizedView, portalView].forEach(function (el) {
    el.hidden = el !== view;
  });
}

function dateLabel(value) {
  var date = new Date(value + "T12:00:00");
  return new Intl.DateTimeFormat(undefined, { weekday:"long", month:"short", day:"numeric" }).format(date);
}

function timeLabel(value) {
  if (!value) return "—";
  var parts = String(value).slice(0,5).split(":");
  var hour = Number(parts[0]);
  var minute = Number(parts[1]);
  return (hour % 12 || 12) + ":" + String(minute).padStart(2,"0") + " " + (hour < 12 ? "AM" : "PM");
}

function roleLabel(slot, observerId) {
  if (slot.secondary_observer_id === observerId) {
    if (slot.secondary_role === "formal_ioa") return "Formal IOA";
    if (slot.secondary_role === "supported_calibration") return "Supported calibration";
    if (slot.secondary_role === "calibration_and_ioa") return "Calibration + IOA";
    return "Secondary observer";
  }
  return "Primary observer";
}

function renderAssignments(slots, observerId) {
  if (!slots.length) {
    assignmentList.innerHTML = '<p class="empty-state">Nothing is currently assigned to you.</p>';
    return;
  }
  assignmentList.innerHTML = slots.map(function (slot) {
    return '<article class="assignment-card">' +
      '<div><strong>' + dateLabel(slot.observation_date) + ' · ' + (slot.case_code_snapshot || "Case") + '</strong>' +
      '<span>' + (slot.routine_label_snapshot || "Routine") + ' · ' + timeLabel(slot.planned_start_time) + '–' + timeLabel(slot.planned_end_time) + '</span>' +
      '<small>Status: ' + String(slot.status || "").replaceAll("_"," ") + '</small></div>' +
      '<div><span class="assignment-role">' + roleLabel(slot, observerId) + '</span></div>' +
      '</article>';
  }).join("");
}

async function loadPortal() {
  show(loadingView);
  var sessionResult = await client.auth.getSession();
  var session = sessionResult.data.session;
  if (!session) {
    show(loginView);
    return;
  }

  var accountResult = await client.from("research_observer_accounts")
    .select("observer_id,active")
    .eq("auth_user_id", session.user.id)
    .eq("active", true)
    .maybeSingle();

  if (accountResult.error || !accountResult.data) {
    show(unauthorizedView);
    return;
  }

  var observerId = accountResult.data.observer_id;
  var responses = await Promise.all([
    client.from("research_observers").select("display_name,observer_code").eq("id", observerId).maybeSingle(),
    client.from("research_observer_clearance").select("clearance_status,clearance_note").eq("observer_id", observerId).maybeSingle(),
    client.from("research_observation_schedule_slots")
      .select("*")
      .gte("observation_date", new Date().toISOString().slice(0,10))
      .order("observation_date", { ascending:true })
  ]);

  if (responses[0].error || responses[1].error || responses[2].error) {
    show(unauthorizedView);
    return;
  }

  var observer = responses[0].data;
  var clearance = responses[1].data;
  observerName.textContent = observer && observer.display_name ? observer.display_name : "Observer";

  var status = clearance && clearance.clearance_status ? clearance.clearance_status : "pending";
  if (status === "cleared") {
    readinessStatus.textContent = "Cleared for live observations";
    readinessHelp.textContent = "Your assigned observation sessions will appear below.";
  } else if (status === "revoked") {
    readinessStatus.textContent = "Recalibration required";
    readinessHelp.textContent = "Do not collect independently until Jess clears you again.";
  } else {
    readinessStatus.textContent = "Training pending";
    readinessHelp.textContent = "Jess will clear you for live observations after training and calibration are complete.";
  }

  renderAssignments(responses[2].data || [], observerId);
  show(portalView);
}

async function signOut() {
  await client.auth.signOut();
  show(loginView);
}

loginForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  loginError.textContent = "";
  var form = new FormData(loginForm);
  var result = await client.auth.signInWithPassword({
    email: String(form.get("email") || "").trim(),
    password: String(form.get("password") || "")
  });
  if (result.error) {
    loginError.textContent = "Sign-in failed. Check your email and password.";
    return;
  }
  loadPortal();
});

document.getElementById("sign-out").addEventListener("click", signOut);
document.getElementById("unauthorized-signout").addEventListener("click", signOut);

function start() {
  if (!window.supabase) {
    loadingView.innerHTML = "<h1>Sign-in service did not load.</h1>";
    return;
  }
  client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  client.auth.onAuthStateChange(function (_event, session) {
    if (!session) show(loginView);
  });
  loadPortal();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once:true });
} else {
  start();
}