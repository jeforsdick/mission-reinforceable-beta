(function () {
  'use strict';

  const MR = window.MR = window.MR || {};
  const SUPABASE_URL = 'https://vyiwwwmcoahwkgiictmc.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5aXd3d21jb2Fod2tnaWljdG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMDE0NzMsImV4cCI6MjEwMTg3NzQ3M30.Ut7eLLdmNJfE3MFQ7q1osS3WOGJ9fPSf9Hm7e-_3ckQ';
  let supabaseClient = null;

  function client() {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      throw new Error('Authentication could not load. Please refresh the page and try again.');
    }
    if (!supabaseClient) {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    }
    return supabaseClient;
  }

  function showLogin(message = '') {
    const error = MR.$('#login-error');
    if (error) error.textContent = message;
    MR.setScreen('login');
  }

  function waitForLogin(supabaseClient) {
    return new Promise(resolve => {
      const form = MR.$('#login-form');
      const submit = MR.$('#login-submit');

      form.addEventListener('submit', async event => {
        event.preventDefault();
        submit.disabled = true;
        submit.textContent = 'Signing In...';
        showLogin('');

        const formData = new FormData(form);
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email: String(formData.get('email') || '').trim(),
          password: String(formData.get('password') || '')
        });

        submit.disabled = false;
        submit.textContent = 'Enter the Mission';
        if (error) {
          showLogin(error.message || 'Sign-in failed. Check your email and password.');
          return;
        }
        resolve(data.user);
      });

      showLogin();
      MR.$('#login-email').focus();
    });
  }

  async function activeParticipant(supabaseClient, user) {
    const { data, error } = await supabaseClient
      .from('participants')
      .select('*')
      .eq('auth_user_id', user.id)
      .eq('active', true)
      .maybeSingle();

    if (error) throw new Error(`Unable to load your participant assignment: ${error.message}`);
    if (!data) throw new Error('No active participant record is assigned to this account. Please contact the research team.');
    return data;
  }

  async function activeCase(supabaseClient, participant) {
    if (!participant.case_id) {
      throw new Error('No case is assigned to this participant. Please contact the research team.');
    }

    const { data, error } = await supabaseClient
      .from('cases')
      .select('*')
      .eq('id', participant.case_id)
      .eq('active', true)
      .maybeSingle();

    if (error) throw new Error(`Unable to load your case assignment: ${error.message}`);
    if (!data) throw new Error('No active case is assigned to this participant. Please contact the research team.');
    return data;
  }

  async function protectedGameContent(supabaseClient, caseId) {
    if (!caseId) throw new Error('No case is available for protected game content.');

    const { data, error } = await supabaseClient
      .from('case_game_content')
      .select('case_id, config, resources, daily_missions, wildcard_missions, crisis_missions, version, updated_at')
      .eq('case_id', caseId)
      .maybeSingle();

    if (error) throw new Error(`Unable to load protected game content: ${error.message}`);
    return data || null;
  }

  async function activeFidelityTargets(supabaseClient, caseId) {
    if (!caseId) throw new Error('No case is available for fidelity targets.');

    const { data, error } = await supabaseClient
      .from('fidelity_targets')
      .select('id, case_id, domain, target_key')
      .eq('case_id', caseId)
      .eq('active', true);

    if (error) throw new Error(`Unable to load fidelity targets: ${error.message}`);
    return Array.isArray(data) ? data : [];
  }

  async function createTelemetrySession(sessionRow) {
    const { error } = await client().from('game_sessions').insert(sessionRow);
    if (error) throw new Error(`Unable to create gameplay telemetry session: ${error.message}`);
  }

  async function insertTelemetryResponses(responseRows) {
    if (!Array.isArray(responseRows) || !responseRows.length) return;
    const { error } = await client().from('game_responses').insert(responseRows);
    if (error) throw new Error(`Unable to save gameplay telemetry responses: ${error.message}`);
  }

  async function completeTelemetrySession(sessionId, participantId, caseId, updates) {
    const { data, error } = await client()
      .from('game_sessions')
      .update(updates)
      .eq('id', sessionId)
      .eq('participant_id', participantId)
      .eq('case_id', caseId)
      .select('id');
    if (error) throw new Error(`Unable to complete gameplay telemetry session: ${error.message}`);
    if (!Array.isArray(data) || data.length !== 1) {
      throw new Error('Unable to complete gameplay telemetry session: the session was not updated.');
    }
  }

  MR.auth = {
    async getAssignment() {
      const supabaseClient = client();
      const { data, error } = await supabaseClient.auth.getUser();
      if (error && error.name !== 'AuthSessionMissingError') {
        throw new Error(`Unable to check your sign-in: ${error.message}`);
      }

      const user = data && data.user ? data.user : await waitForLogin(supabaseClient);
      const qaCase = new URLSearchParams(window.location.search).get('qa_case');
      if (qaCase) {
        const { data: preview, error: previewError } = await supabaseClient
          .rpc('research_admin_game_preview', { target_case_code: qaCase.trim() });
        if (previewError) throw new Error(`QA preview denied: ${previewError.message}`);
        if (!Array.isArray(preview) || preview.length !== 1) throw new Error('QA preview denied: assignment was not uniquely resolved.');
        const row = preview[0];
        return {
          user,
          qaMode: true,
          participant: { id: row.participant_id, participant_code: row.participant_code, active: false },
          case: { id: row.case_id, case_code: row.case_code, student_alias: row.student_alias, game_folder: row.game_folder, active: false }
        };
      }
      const participant = await activeParticipant(supabaseClient, user);
      const caseAssignment = await activeCase(supabaseClient, participant);
      return { user, participant, case: caseAssignment, qaMode: false };
    },

    async getGameContent(caseId) {
      return protectedGameContent(client(), caseId);
    },

    async getFidelityTargets(caseId) {
      return activeFidelityTargets(client(), caseId);
    },

    createTelemetrySession,

    insertTelemetryResponses,

    completeTelemetrySession,

    async hasCompletedMissionToday() {
      const { data, error } = await client().rpc('has_completed_mission_today');
      if (error) throw new Error(`Unable to check today's mission status: ${error.message}`);
      return data === true;
    },

    async signOut() {
      const { error } = await client().auth.signOut();
      if (error) throw new Error(`Unable to log out: ${error.message}`);
    }
  };
})();
