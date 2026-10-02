import { renderObserverTrainingDashboard } from "./training-ui.mjs";

const SUPABASE_URL = "https://vyiwwwmcoahwkgiictmc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6InZ5aXd3d21jb2Fod2tnaWljdG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMDE0NzMsImV4cCI6MjEwMTg3NzQ3M30.Ut7eLLdmNJfE3MFQ7q1osS3WOGJ9fPSf9Hm7e-_3ckQ";
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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
