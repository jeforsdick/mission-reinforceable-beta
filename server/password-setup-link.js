'use strict';

// Supabase's /auth/v1/verify links are single use. Enterprise mail
// gateways can prefetch GET links and consume them before a teacher
// opens the email. Send a link to a *static* page instead; that page
// only redeems the hash via verifyOtp when the human clicks Continue.
// The token stays in the URL fragment so it is not sent in HTTP requests.
function passwordSetupLandingLink(generated, setupUrl, authOrigin) {
  const landing = new URL(setupUrl);
  const auth = new URL(authOrigin);
  if (landing.protocol !== 'https:' || landing.pathname !== '/set-password/' ||
      landing.search || landing.hash || landing.username || landing.password ||
      auth.protocol !== 'https:' || auth.pathname !== '/' || auth.search || auth.hash) {
    throw new Error('Password setup configuration is invalid.');
  }

  const original = new URL(generated?.action_link || '');
  if (original.origin !== auth.origin || original.pathname !== '/auth/v1/verify' ||
      original.searchParams.get('type') !== 'recovery') {
    throw new Error('Secure recovery verification link was not generated.');
  }
  const tokenHash = original.searchParams.get('token');
  if (!/^[A-Za-z0-9_-]{32,256}$/.test(tokenHash || '') ||
      (generated?.hashed_token && generated.hashed_token !== tokenHash)) {
    throw new Error('Secure recovery token was not generated.');
  }
  const params = new URLSearchParams({ token_hash: tokenHash, type: 'recovery' });
  landing.hash = params.toString();
  return landing.toString();
}

module.exports = { passwordSetupLandingLink };
