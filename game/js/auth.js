(function () {
  'use strict';

  const MR = window.MR = window.MR || {};
  const SUPABASE_URL = 'https://vyiwwwmcoahwkgiictmc.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5aXd3d21jb2Fod2tnaWljdG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMDE0NzMsImV4cCI6MjEwMTg3NzQ3M30.Ut7eLLdmNJfE3MFQ7q1osS3WOGJ9fPSf9Hm7e-_3ckQ';
  let supabaseClient = null;
  let dailySessionWatcherStarted = false;
  let dailySessionExpirationStarted = false;

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

  function hasCurrentStudyDaySignIn(user, now = new Date()) {
    if (!user || !user.last_sign_in_at) return false;
    const signedInAt = new Date(user.last_sign_in_at);
    if (Number.isNaN(signedInAt.getTime())) return false;
    return MR.studyDate.dateKey(signedInAt) === MR.studyDate.dateKey(now);
  }

  async function localSignOut(supabaseClient = client()) {
    const { error } = await supabaseClient.auth.signOut({ scope: 'local' });
    if (error) throw new Error(`Unable to log out: ${error.message}`);
  }

  function watchDailySession(user) {
    if (dailySessionWatcherStarted) return;
    dailySessionWatcherStarted = true;

    const check = async () => {
      if (dailySessionExpirationStarted || hasCurrentStudyDaySignIn(user)) return;
      dailySessionExpirationStarted = true;
      try {
        await localSignOut();
      } catch (error) {
        console.error('Daily participant sign-out failed.', error);
      }
      window.location.reload();
    };

    window.setInterval(check, 60 * 1000);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
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

  function draftRequest(search) {
    const params = new URLSearchParams(search);
    const type = params.get('qa_draft_type');
    const slotText = params.get('qa_draft_slot');
    if (!type && !slotText) return null;
    if (!type || !slotText) throw new Error('Draft QA preview requires both a mission type and slot.');
    if (!['daily', 'wild', 'crisis'].includes(type)) throw new Error('Draft QA preview has an invalid mission type.');
    const slot = Number(slotText);
    const maximum = type === 'daily' ? 10 : 5;
    if (!Number.isInteger(slot) || slot < 1 || slot > maximum) throw new Error('Draft QA preview has an invalid mission slot.');
    return { type, slot };
  }

  function missionFromWorkspaceRow(row) {
    return row && (row.mission || row.mission_json || row.draft || row.content) || null;
  }

  async function draftGameContent(assignment) {
    if (!assignment || assignment.qaMode !== true || !assignment.qaDraft) {
      throw new Error('Draft QA preview requires an authorized Research Admin QA assignment.');
    }
    const supabaseClient = client();
    const { data, error } = await supabaseClient.rpc('research_admin_game_authoring_workspace', {
      target_case_id: assignment.case.id
    });
    if (error) throw new Error(`Unable to load saved mission draft: ${error.message}`);
    const workspace = Array.isArray(data) ? data[0] : data;
    if (!workspace) throw new Error('Unable to load the mission authoring workspace.');
    const rows = workspace.missions || workspace.mission_drafts || workspace.latest_mission_drafts || [];
    const selected = rows.find(row => row.mission_type === assignment.qaDraft.type && Number(row.slot_number) === assignment.qaDraft.slot);
    const mission = missionFromWorkspaceRow(selected);
    if (!mission) throw new Error(`No saved ${assignment.qaDraft.type} mission draft exists in slot ${assignment.qaDraft.slot}.`);
    const published = await protectedGameContent(supabaseClient, assignment.case.id);
    const setup = workspace.setup_draft?.setup || workspace.latest_setup_draft?.setup || {};
    const config = Object.assign({}, published?.config || {}, {
      studentAlias: published?.config?.studentAlias || workspace.case?.student_alias || assignment.case.student_alias
    });
    if (typeof setup.bipBriefing === 'string' && setup.bipBriefing.trim()) config.bipBriefing = setup.bipBriefing;
    const content = {
      config,
      resources: published?.resources || null,
      daily_missions: [],
      wildcard_missions: [],
      crisis_missions: [],
      version: null
    };
    content[assignment.qaDraft.type === 'daily' ? 'daily_missions' : assignment.qaDraft.type === 'wild' ? 'wildcard_missions' : 'crisis_missions'] = [mission];
    return content;
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

  async function recordResourceEvent(eventName, sectionKey = null) {
    const context = MR.telemetryContext;
    if (!context || !context.participantId || !context.caseId) return false;
    const { error } = await client().from('game_resource_events').insert({
      participant_id: context.participantId,
      case_id: context.caseId,
      event_name: eventName,
      section_key: sectionKey,
      game_content_version: context.gameContentVersion,
      qa_mode: context.qaMode === true
    });
    if (error) throw new Error(`Unable to save Resource Map usage telemetry: ${error.message}`);
    return true;
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

  async function completeParticipantMission(sessionId, updates) {
    const { data, error } = await client().rpc('complete_participant_mission', {
      target_session_id: sessionId,
      completion: updates
    });
    if (error) throw new Error(`Unable to complete gameplay telemetry session: ${error.message}`);
    if (!['completed', 'already_completed'].includes(data)) {
      throw new Error(`Unable to complete gameplay telemetry session: unexpected result "${data}".`);
    }
    return data;
  }

  async function progressSessions(context) {
    if (!context || !context.participantId || !context.caseId) {
      throw new Error('A participant and case assignment are required to load mission progress.');
    }
    const { data, error } = await client()
      .from('game_sessions')
      .select('id, mode, mission_title, score, max_score, plan_aligned_count, refine_count, missed_count, ended_at, started_at')
      .eq('participant_id', context.participantId)
      .eq('case_id', context.caseId)
      .eq('status', 'completed')
      .eq('qa_mode', context.qaMode === true)
      .order('ended_at', { ascending: false, nullsFirst: false })
      .order('started_at', { ascending: false });
    if (error) throw new Error(`Unable to load mission progress: ${error.message}`);
    return Array.isArray(data) ? data : [];
  }

  async function progressResponses(sessionId, context) {
    if (!sessionId || !context || !context.participantId || !context.caseId) {
      throw new Error('A completed mission assignment is required to load mission feedback.');
    }
    const { data, error } = await client()
      .from('game_responses')
      .select('step_index, scenario_title, scenario_text, selected_answer_text, selected_score, alignment, best_answer_text, feedback_text')
      .eq('session_id', sessionId)
      .eq('participant_id', context.participantId)
      .eq('case_id', context.caseId)
      .eq('qa_mode', context.qaMode === true)
      .order('step_index', { ascending: true });
    if (error) throw new Error(`Unable to load mission feedback: ${error.message}`);
    return Array.isArray(data) ? data : [];
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
        const qaDraft = draftRequest(window.location.search);
        const previewResult = qaDraft
          ? await supabaseClient.rpc('research_admin_draft_game_preview', {
            target_case_code: qaCase.trim(),
            target_mission_type: qaDraft.type,
            target_slot_number: qaDraft.slot
          })
          : await supabaseClient.rpc('research_admin_game_preview', { target_case_code: qaCase.trim() });
        const { data: preview, error: previewError } = previewResult;
        if (previewError) throw new Error(`QA preview denied: ${previewError.message}`);
        if (!Array.isArray(preview) || preview.length !== 1) throw new Error('QA preview denied: assignment was not uniquely resolved.');
        const row = preview[0];
        return {
          user,
          qaMode: true,
          participant: { id: row.participant_id, participant_code: row.participant_code, active: false },
          case: { id: row.case_id, case_code: row.case_code, student_alias: row.student_alias, active: false },
          qaDraft
        };
      }
      if (!hasCurrentStudyDaySignIn(user)) {
        await localSignOut(supabaseClient);
        const currentUser = await waitForLogin(supabaseClient);
        if (!hasCurrentStudyDaySignIn(currentUser)) {
          await localSignOut(supabaseClient);
          throw new Error('A current-day sign-in is required. Please sign in again.');
        }
        return MR.auth.getAssignment();
      }
      const participant = await activeParticipant(supabaseClient, user);
      const caseAssignment = await activeCase(supabaseClient, participant);
      return { user, participant, case: caseAssignment, qaMode: false };
    },

    async getGameContent(caseId) {
      return protectedGameContent(client(), caseId);
    },

    getDraftGameContent: draftGameContent,

    async getFidelityTargets(caseId) {
      return activeFidelityTargets(client(), caseId);
    },

    createTelemetrySession,

    insertTelemetryResponses,

    recordResourceEvent,

    completeTelemetrySession,

    completeParticipantMission,

    getProgressSessions: progressSessions,

    getProgressResponses: progressResponses,

    async hasCompletedMissionToday() {
      const { data, error } = await client().rpc('has_completed_mission_today');
      if (error) throw new Error(`Unable to check today's mission status: ${error.message}`);
      return data === true;
    },

    async hasWeeklyCheckin(weekStart) {
      const { data, error } = await client().from('weekly_teacher_checkins').select('id').eq('week_start', weekStart).eq('qa_mode', false).maybeSingle();
      if (error) throw new Error(`Unable to check this week's teacher report status: ${error.message}`);
      return Boolean(data);
    },

    async submitWeeklyTeacherReport(values) {
      const { error } = await client().rpc('submit_weekly_teacher_report', {
        p_access_rating: values.accessRating,
        p_manageability_rating: values.manageabilityRating,
        p_bsp_relevance_rating: values.bspRelevanceRating,
        p_implementation_thinking_rating: values.implementationThinkingRating,
        p_feedback_usefulness_rating: values.feedbackUsefulnessRating,
        p_target_behavior_rating: values.targetBehaviorRating,
        p_replacement_behavior_rating: values.replacementBehaviorRating,
        p_barriers_facilitators: values.barriersFacilitators,
        p_behavior_context_note: values.behaviorContextNote
      });
      if (error) throw new Error(`Unable to submit the weekly teacher report: ${error.message}`);
    },

    hasCurrentStudyDaySignIn,

    watchDailySession,

    async signOut() {
      await localSignOut();
    }
  };
})();
