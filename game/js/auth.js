(function () {
  'use strict';

  const MR = window.MR = window.MR || {};
  const SUPABASE_URL = 'https://vyiwwwmcoahwkgiictmc.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_rCL4M_2ffrCVf8vf7yoZrw_IE7eXCHHE';

  function client() {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      throw new Error('Authentication could not load. Please refresh the page and try again.');
    }
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
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
    if (!data.game_folder || !String(data.game_folder).trim()) {
      throw new Error('Your active case does not have a game folder assignment. Please contact the research team.');
    }
    return data;
  }

  MR.auth = {
    async getAssignment() {
      const supabaseClient = client();
      const { data, error } = await supabaseClient.auth.getUser();
      if (error && error.name !== 'AuthSessionMissingError') {
        throw new Error(`Unable to check your sign-in: ${error.message}`);
      }

      const user = data && data.user ? data.user : await waitForLogin(supabaseClient);
      const participant = await activeParticipant(supabaseClient, user);
      const caseAssignment = await activeCase(supabaseClient, participant);
      return { user, participant, case: caseAssignment };
    }
  };
})();
