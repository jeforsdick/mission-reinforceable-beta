'use strict';

const { ASSET_ROOT, ASSET_FILES, teacherFirstName } = require('./mission-reminder-email');

const SUBJECT = 'Mission: Reinforceable — Your Game Access Is Ready';
const SETUP_SUBJECT = 'Mission: Reinforceable — Set Up Your Account';
const COACH_SETUP_SUBJECT = 'Mission: Reinforceable — Set Up Your Coach Account';
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

function setupAssets() {
  const configured = httpsUrl(process.env.TEACHER_GAME_URL || 'https://www.missionreinforceable.com/game/', '/game/');
  const origin = configured?.origin || 'https://www.missionreinforceable.com';
  return Object.fromEntries(Object.entries(ASSET_FILES).map(([key,file]) => [key,new URL(ASSET_ROOT + file,origin).href]));
}

function setupEmailHtml({ subject, label, name, email, actionLink, coach=false }) {
  const assets=setupAssets();
  const greeting=teacherFirstName(name) || (coach ? 'Coach' : 'Hero');
  const intro=coach ? 'Your Mission: Reinforceable coach account is ready.' : 'Your Mission: Reinforceable teacher account is ready.';
  const next=coach ? 'After you create your password, you’ll be taken to the Coaching Dashboard.' : 'Creating your password does not start your missions yet. Your game stays locked until the research team begins your intervention.';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escapeHtml(subject)+'</title></head>'+
    '<body style="margin:0;padding:0;background:#f4f1f7;font-family:Arial,Helvetica,sans-serif;color:#302826;">'+
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f1f7;"><tr><td align="center" style="padding:20px 10px;">'+
    '<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#fffdf8;border:1px solid #ded7e3;">'+
    '<tr><td><img src="'+assets.emailHeader+'" width="600" alt="Mission: Reinforceable" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>'+
    '<tr><td align="center" style="padding:9px 16px;background:#60388c;color:#fff;font-family:Courier New,Courier,monospace;font-size:14px;font-weight:bold;letter-spacing:1px;">'+escapeHtml(label)+'</td></tr>'+
    '<tr><td style="padding:20px;">'+
      '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fff4d8;border:3px solid #49362d;box-shadow:inset 0 0 0 2px #d6a844;"><tr><td style="padding:18px;color:#302826;font-size:16px;line-height:24px;">'+
      '<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td width="44"><img src="'+assets.heart+'" width="32" alt="" style="display:block;border:0;"></td><td><h1 style="margin:0;color:#49362d;font-family:Courier New,Courier,monospace;font-size:22px;line-height:27px;">Hey, '+escapeHtml(greeting)+'!</h1></td></tr></table>'+
      '<p style="margin:12px 0 8px;">'+escapeHtml(intro)+'</p><p style="margin:0;">Your sign-in email is <strong>'+escapeHtml(email)+'</strong>.</p></td></tr></table>'+
    '</td></tr>'+
    '<tr><td align="center" style="padding:0 20px 24px;"><p style="margin:0 0 18px;font-size:15px;line-height:22px;">Create your password using the secure button below.</p>'+
      '<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="background:#9a3040;border:3px solid #d9a638;outline:3px solid #4a3025;box-shadow:0 5px 0 #4a3025;"><a href="'+escapeHtml(actionLink)+'" style="display:inline-block;padding:14px 22px;color:#fff;text-decoration:none;font-size:16px;font-weight:bold;">CREATE YOUR PASSWORD &#8594;</a></td></tr></table>'+
    '</td></tr>'+
    '<tr><td style="padding:0 20px 18px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1eafa;border:2px solid #76509a;"><tr><td width="64" align="center" style="padding:15px 0 15px 14px;"><img src="'+assets.potion+'" width="42" alt="" style="display:block;border:0;"></td><td style="padding:14px 16px;color:#44394a;font-size:13px;line-height:19px;"><strong style="color:#553078;">What happens next?</strong><p style="margin:6px 0 0;">'+escapeHtml(next)+'</p></td></tr></table></td></tr>'+
    '<tr><td style="padding:16px 20px;border-top:1px solid #e6dfeb;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td width="52"><img src="'+assets.heart+'" width="38" alt="" style="display:block;border:0;"></td><td style="color:#49362d;font-size:14px;line-height:20px;"><strong style="color:#60388c;">Welcome to Mission: Reinforceable!</strong><br>We’re glad you’re part of the adventure.</td><td width="38" align="right"><img src="'+assets.sparkle+'" width="24" alt="" style="display:block;border:0;"></td></tr></table></td></tr>'+
    '<tr><td style="padding:14px 20px 18px;border-top:1px solid #ded7e3;color:#746b78;font-size:11px;line-height:17px;"><table role="presentation" width="100%"><tr><td width="46" valign="top"><img src="'+assets.hat+'" width="34" alt="" style="display:block;border:0;"></td><td>Mission: Reinforceable is a research project designed to support educators in implementing high-quality behavior supports. Need help? Contact Jess at <a href="mailto:jess.olson@utah.edu" style="color:#60388c;">jess.olson@utah.edu</a>.</td></tr></table></td></tr>'+
    '</table></td></tr></table></body></html>';
}

function formatAccountSetupEmail({ teacherName, teacherEmail, actionLink }) {
  const name=String(teacherName||'').trim()||'Teacher';
  const text='MISSION: REINFORCEABLE\nYOUR ADVENTURE STARTS HERE\n\nHello '+name+',\n\nYour Mission: Reinforceable teacher account is ready.\n\nCREATE YOUR PASSWORD:\n'+actionLink+'\n\nSign-in email: '+teacherEmail+'\n\nCreating your password does not start your missions yet. Your game stays locked until the research team begins your intervention.\n\nWelcome to Mission: Reinforceable!\nIf you need help, contact Jess at jess.olson@utah.edu.';
  return { subject:SETUP_SUBJECT, text, html:setupEmailHtml({subject:SETUP_SUBJECT,label:'YOUR ADVENTURE STARTS HERE',name,email:teacherEmail,actionLink,coach:false}) };
}

function formatCoachAccountSetupEmail({ coachName, coachEmail, actionLink }) {
  const name=String(coachName||'').trim()||'Coach';
  const text='MISSION: REINFORCEABLE\nCOACH ACCESS UNLOCKED\n\nHello '+name+',\n\nYour Mission: Reinforceable coach account is ready.\n\nCREATE YOUR PASSWORD:\n'+actionLink+'\n\nSign-in email: '+coachEmail+'\n\nAfter you create your password, you’ll be taken to the Coaching Dashboard.\n\nWelcome to Mission: Reinforceable!\nIf you need help, contact Jess at jess.olson@utah.edu.';
  return { subject:COACH_SETUP_SUBJECT, text, html:setupEmailHtml({subject:COACH_SETUP_SUBJECT,label:'COACH ACCESS UNLOCKED',name,email:coachEmail,actionLink,coach:true}) };
}
function formatGameLoginEmail({ teacherName, teacherEmail, actionLink, gameUrl }) {
  const name = String(teacherName || '').trim() || 'Teacher';
  const text = `Hello ${name},\n\nYour Mission: Reinforceable account is ready.\n\nUse the secure link below to create or reset your password and open Mission: Reinforceable:\n\n${actionLink}\n\nAfter you set your password, you can return to:\n\n${gameUrl}\n\nand sign in using:\n\n${teacherEmail}\n\nand the password you created.\n\nPlease keep the password-setup link private. The secure link will expire.\n\nIf you have trouble accessing Mission: Reinforceable, please contact Jess at jess.olson@utah.edu.\n\nThank you,\n\nJess`;
  const html = `<p>Hello ${escapeHtml(name)},</p><p>Your Mission: Reinforceable account is ready.</p><p>Use the secure link below to create or reset your password and open Mission: Reinforceable:</p><p><a href="${escapeHtml(actionLink)}">Set Password and Open Mission: Reinforceable</a></p><p>After you set your password, you can return to:</p><p><a href="${escapeHtml(gameUrl)}">${escapeHtml(gameUrl)}</a></p><p>and sign in using:</p><p>${escapeHtml(teacherEmail)}</p><p>and the password you created.</p><p>Please keep the password-setup link private. The secure link will expire.</p><p>If you have trouble accessing Mission: Reinforceable, please contact Jess at <a href="mailto:jess.olson@utah.edu">jess.olson@utah.edu</a>.</p><p>Thank you,</p><p>Jess</p>`;
  return { subject: SUBJECT, text, html };
}

module.exports = { SUBJECT, SETUP_SUBJECT, COACH_SETUP_SUBJECT, configuration, formatAccountSetupEmail, formatCoachAccountSetupEmail, formatGameLoginEmail, httpsUrl };
