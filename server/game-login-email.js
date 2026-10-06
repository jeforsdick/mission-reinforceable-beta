'use strict';

const SUBJECT = 'Mission: Reinforceable — Your Game Access Is Ready';
const SETUP_SUBJECT = 'Mission: Reinforceable — Set Up Your Account';
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function httpsUrl(value, requiredPath) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && (!requiredPath || url.pathname === requiredPath) && !url.search && !url.hash ? url : null;
  } catch { return null; }
}

function configuration(environment = process.env) {
  const gameUrl = httpsUrl(environment.TEACHER_GAME_URL, '/game/');
  const setupUrl = httpsUrl(environment.GAME_PASSWORD_SETUP_URL, '/set-password/');
  const enabled = environment.GAME_LOGIN_EMAIL_ENABLED === 'true' && Boolean(environment.RESEND_API_KEY && environment.TEACHER_REMINDER_FROM_EMAIL && gameUrl && setupUrl);
  return { enabled, gameUrl: gameUrl?.toString(), setupUrl: setupUrl?.toString(), from: environment.TEACHER_REMINDER_FROM_EMAIL };
}

function formatAccountSetupEmail({ teacherName, teacherEmail, actionLink }) {
  const name = String(teacherName || '').trim() || 'Teacher';
  const text = `Hello ${name},

Your Mission: Reinforceable account has been created for the study.

Please use the secure link below to create your password before your scheduled orientation:

${actionLink}

Your sign-in email is:

${teacherEmail}

Creating your password does not begin Mission: Reinforceable and does not give you access to study missions yet. Access begins during your scheduled intervention orientation.

Please keep the password-setup link private. The secure link will expire.

If you have trouble setting up your password, please contact the research team.

Thank you.`;
  const html = `<p>Hello ${escapeHtml(name)},</p><p>Your Mission: Reinforceable account has been created for the study.</p><p>Please use the secure link below to create your password <strong>before your scheduled orientation</strong>:</p><p><a href="${escapeHtml(actionLink)}">Create Your Mission: Reinforceable Password</a></p><p>Your sign-in email is:</p><p><strong>${escapeHtml(teacherEmail)}</strong></p><p><strong>Creating your password does not begin Mission: Reinforceable and does not give you access to study missions yet.</strong> Access begins during your scheduled intervention orientation.</p><p>Please keep the password-setup link private. The secure link will expire.</p><p>If you have trouble setting up your password, please contact the research team.</p><p>Thank you.</p>`;
  return { subject: SETUP_SUBJECT, text, html };
}

function formatGameLoginEmail({ teacherName, teacherEmail, actionLink, gameUrl }) {
  const name = String(teacherName || '').trim() || 'Teacher';
  const text = `Hello ${name},\n\nYour Mission: Reinforceable account is ready.\n\nUse the secure link below to create or reset your password and open Mission: Reinforceable:\n\n${actionLink}\n\nAfter you set your password, you can return to:\n\n${gameUrl}\n\nand sign in using:\n\n${teacherEmail}\n\nand the password you created.\n\nPlease keep the password-setup link private. The secure link will expire.\n\nIf you have trouble accessing Mission: Reinforceable, please contact Jess at jess.olson@utah.edu.\n\nThank you,\n\nJess`;
  const html = `<p>Hello ${escapeHtml(name)},</p><p>Your Mission: Reinforceable account is ready.</p><p>Use the secure link below to create or reset your password and open Mission: Reinforceable:</p><p><a href="${escapeHtml(actionLink)}">Set Password and Open Mission: Reinforceable</a></p><p>After you set your password, you can return to:</p><p><a href="${escapeHtml(gameUrl)}">${escapeHtml(gameUrl)}</a></p><p>and sign in using:</p><p>${escapeHtml(teacherEmail)}</p><p>and the password you created.</p><p>Please keep the password-setup link private. The secure link will expire.</p><p>If you have trouble accessing Mission: Reinforceable, please contact Jess at <a href="mailto:jess.olson@utah.edu">jess.olson@utah.edu</a>.</p><p>Thank you,</p><p>Jess</p>`;
  return { subject: SUBJECT, text, html };
}

module.exports = { SUBJECT, SETUP_SUBJECT, configuration, formatAccountSetupEmail, formatGameLoginEmail, httpsUrl };
