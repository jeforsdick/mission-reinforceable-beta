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

  const [attempts, feedback, questions] = await Promise.all([
    client.from("observer_training_attempts").select("*").order("submitted_at", { ascending: false }),
    client.from("observer_training_feedback").select("*").order("submitted_at", { ascending: false }),
    client.from("observer_training_questions").select("*").order("submitted_at", { ascending: false })
  ]);

  const error = attempts.error || feedback.error || questions.error;
  if (error) {
    showMessage("Training submissions could not be loaded. Refresh Research Admin and try again.");
    return;
  }

  target.innerHTML = renderObserverTrainingDashboard({
    attempts: attempts.data || [],
    feedback: feedback.data || [],
    questions: questions.data || []
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

target?.addEventListener("click", (event) => {
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
