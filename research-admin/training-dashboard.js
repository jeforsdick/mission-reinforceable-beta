import { renderObserverTrainingDashboard } from "./training-ui.mjs";

const SUPABASE_URL = "https://vyiwwwmcoahwkgiictmc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Mp2ASOgrx0Yx8Bp-Fz3AAg_V5Gl0I4W";
const target = document.getElementById("observer-training-dashboard");

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"
  })[char]);
}

function showMessage(message) {
  if (!target) return;
  target.innerHTML = `<section class="panel observer-training-panel"><p class="eyebrow">Observer Training</p><p>${escapeHtml(message)}</p></section>`;
}

async function loadDashboard(client) {
  if (!target) return;
  const { data: { session }, error: sessionError } = await client.auth.getSession();
  if (sessionError || !session) {
    target.innerHTML = "";
    return;
  }

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("role,active")
    .eq("id", session.user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "research_admin" || profile.active !== true) {
    target.innerHTML = "";
    return;
  }

  showMessage("Loading asynchronous training submissions…");

  const [attempts, feedback, questions, roster, clearances] = await Promise.all([
    client.from("observer_training_attempts").select("*").order("submitted_at", { ascending: false }),
    client.from("observer_training_feedback").select("*").order("submitted_at", { ascending: false }),
    client.from("observer_training_questions").select("*").order("submitted_at", { ascending: false }),
    client.from("research_observers").select("id,observer_code,display_name,active"),
    client.from("research_observer_clearance").select("observer_id,clearance_status,cleared_at")
  ]);

  const error = attempts.error || feedback.error || questions.error || roster.error || clearances.error;
  if (error) {
    showMessage("Training submissions could not be loaded. Refresh Research Admin and try again.");
    return;
  }

  target.innerHTML = renderObserverTrainingDashboard({
    attempts: attempts.data || [],
    feedback: feedback.data || [],
    questions: questions.data || [],
    roster: roster.data || [],
    clearances: clearances.data || []
  }, escapeHtml);
}

function start() {
  if (!target) return;
  const client = window.__mrResearchAdminClient;
  const state = window.__mrResearchAdminState;
  if (!client || !state) return;
  loadDashboard(client);
}

target?.addEventListener("click", async (event) => {
  const clearButton = event.target.closest("[data-clear-observer-id]");
  if (clearButton) {
    const observerName = clearButton.dataset.clearObserverName || "this observer";
    if (!window.confirm(`Clear ${observerName} for independent observations?\n\nConfirm the online criterion is met and you have completed the team review / field calibration you require.`)) return;
    clearButton.disabled = true;
    const client = window.__mrResearchAdminClient;
    if (!client) {
      window.alert("Research Admin session is not ready. Refresh and try again.");
      clearButton.disabled = false;
      return;
    }
    const { error } = await client.rpc("research_admin_set_observer_clearance", {
      target_observer_id: clearButton.dataset.clearObserverId,
      target_status: "cleared",
      target_note: "Online training complete; researcher confirmed team review / field calibration."
    });
    if (error) {
      window.alert(error.message);
      clearButton.disabled = false;
      return;
    }
    await loadDashboard(client);
    window.dispatchEvent(new CustomEvent("mr-research-admin-ready"));
    return;
  }

  const trigger = event.target.closest("[data-training-details]");
  if (!trigger) return;
  const observer = trigger.dataset.trainingDetails;
  const panel = [...target.querySelectorAll("[data-training-details-panel]")]
    .find((item) => item.dataset.trainingDetailsPanel === observer);
  if (!panel) return;
  panel.open = !panel.open;
  if (panel.open) panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

window.addEventListener("mr-research-admin-ready", start);
if (window.__mrResearchAdminClient && window.__mrResearchAdminState) start();
