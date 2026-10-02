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
  if (!target || !window.supabase) return;
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

  client.auth.onAuthStateChange((_event, session) => {
    if (session) setTimeout(() => loadDashboard(client), 0);
    else target.innerHTML = "";
  });

  loadDashboard(client);
}

target?.addEventListener("click", async (event) => {
  const clearButton = event.target.closest("[data-clear-observer-id]");
  if (clearButton) {
    const observerName = clearButton.dataset.clearObserverName || "this observer";
    if (!window.confirm(`Clear ${observerName} for live observations?\n\nUse this only after you have reviewed training and completed the Q&A/calibration you require.`)) return;
    clearButton.disabled = true;
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    const { data: { session } } = await client.auth.getSession();
    const { error } = await client.from("research_observer_clearance")
      .update({
        clearance_status: "cleared",
        cleared_at: new Date().toISOString(),
        cleared_by: session?.user?.id || null,
        updated_at: new Date().toISOString()
      })
      .eq("observer_id", clearButton.dataset.clearObserverId);
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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
