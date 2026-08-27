'use strict';

const SUBJECT = 'Mission: Reinforceable — Your Game Access Is Ready';
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

function formatGameLoginEmail({ teacherName, teacherEmail, actionLink, gameUrl }) {
  const name = String(teacherName || '').trim() || 'Teacher';
  const text = `Hello ${name},\n\nYour Mission: Reinforceable account is ready.\n\nUse the secure link below to create or reset your password and open Mission: Reinforceable:\n\n${actionLink}\n\nAfter you set your password, you can return to:\n\n${gameUrl}\n\nand sign in using:\n\n${teacherEmail}\n\nand the password you created.\n\nPlease keep the password-setup link private. The secure link will expire.\n\nIf you have trouble accessing Mission: Reinforceable, please contact Jess at jess.olson@utah.edu.\n\nThank you,\n\nJess`;
  const html = `<p>Hello ${escapeHtml(name)},</p><p>Your Mission: Reinforceable account is ready.</p><p>Use the secure link below to create or reset your password and open Mission: Reinforceable:</p><p><a href="${escapeHtml(actionLink)}">Set Password and Open Mission: Reinforceable</a></p><p>After you set your password, you can return to:</p><p><a href="${escapeHtml(gameUrl)}">${escapeHtml(gameUrl)}</a></p><p>and sign in using:</p><p>${escapeHtml(teacherEmail)}</p><p>and the password you created.</p><p>Please keep the password-setup link private. The secure link will expire.</p><p>If you have trouble accessing Mission: Reinforceable, please contact Jess at <a href="mailto:jess.olson@utah.edu">jess.olson@utah.edu</a>.</p><p>Thank you,</p><p>Jess</p>`;
  return { subject: SUBJECT, text, html };
}

module.exports = { SUBJECT, configuration, formatGameLoginEmail, httpsUrl };
