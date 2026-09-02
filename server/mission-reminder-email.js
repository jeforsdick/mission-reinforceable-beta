'use strict';

const SUBJECT = 'Your Mission: Reinforceable mission is ready';
const SENDER = 'Mission: Reinforceable <missions@mail.missionreinforceable.com>';
const ASSET_ROOT = '/assets/game/skin-v2/';
const ASSET_FILES = Object.freeze({
  title: 'mission-reinforceable-title.png',
  classroom: 'landing-page-classroom.png',
  heart: 'heart-icon.png',
  behaviorXp: 'behavior-xp-icon.png',
  hat: 'hat-icon.png',
  potion: 'potion-icon.png',
  sparkle: 'sparkle-icon.png'
});

function canonicalGameUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Mission reminder email URL is invalid'); }
  if (url.protocol !== 'https:' || url.pathname !== '/game/' || url.search || url.hash || url.username || url.password) {
    throw new Error('Mission reminder email URL must be an authenticated /game/ URL');
  }
  return url;
}

function teacherFirstName(teacherName) {
  if (typeof teacherName !== 'string') return null;
  const parts = teacherName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  const honorifics = /^(?:mr|mrs|ms|miss|mx|dr|prof)\.?$/i;
  const firstName = honorifics.test(parts[0]) ? parts[1] : parts[0];
  return firstName || null;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function buildMissionReminderEmail(gameUrl, teacherName, subject = SUBJECT) {
  const missionUrl = canonicalGameUrl(gameUrl);
  const ctaUrl = missionUrl.href;
  const assets = Object.fromEntries(Object.entries(ASSET_FILES).map(([key, file]) => [key, new URL(ASSET_ROOT + file, missionUrl.origin).href]));
  const greetingName = teacherFirstName(teacherName) || 'Hero';
  const greeting = `Good morning, ${greetingName}!`;
  const safeGreeting = escapeHtml(greeting);
  const text = `MISSION: REINFORCEABLE
YOUR DAILY MISSION AWAITS

${greeting}

Your Mission: Reinforceable mission is ready for today.
Take a few minutes, make your choices, and keep making a difference for your student.

START TODAY'S MISSION: ${ctaUrl}

You've got this!
See you in there,
Mission: Reinforceable

Do not reply directly to this email.
If you have difficulty accessing the mission, please contact Jess at jess.olson@utah.edu.
If the mission is unavailable or you are unable to complete it, please continue implementing the student's behavior support plan as usual.

Thank you for being a hero in your student's journey!
Every mission makes a difference.

Mission: Reinforceable is a research project designed to support educators in implementing high-quality behavior supports.`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background-color:#f4f1f7;color:#302826;font-family:Arial,Helvetica,sans-serif;">
<div role="article" aria-roledescription="email" aria-label="${escapeHtml(subject)}" lang="en" style="background-color:#f4f1f7;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#f4f1f7;"><tr><td align="center" style="padding:20px 10px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #ded7e3;">
<tr><td align="center" style="padding:18px 18px 10px;background-color:#ffffff;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
<td width="36" align="center" valign="middle"><img src="${assets.sparkle}" width="20" alt="Magical sparkle" style="display:block;width:20px;height:auto;border:0;"></td>
<td align="center"><img src="${assets.title}" width="440" alt="Mission: Reinforceable" style="display:block;width:100%;max-width:440px;height:auto;border:0;outline:none;text-decoration:none;color:#552f79;font-size:22px;font-weight:bold;"></td>
<td width="36" align="center" valign="middle"><img src="${assets.sparkle}" width="20" alt="Magical sparkle" style="display:block;width:20px;height:auto;border:0;"></td>
</tr></table>
</td></tr>
<tr><td align="center" bgcolor="#60388c" style="padding:8px 16px;background-color:#60388c;color:#ffffff;font-family:'Courier New',Courier,monospace;font-size:14px;line-height:18px;font-weight:bold;letter-spacing:1px;">YOUR DAILY MISSION AWAITS</td></tr>
<tr><td align="center" style="padding:0;background-color:#ffffff;"><img src="${assets.classroom}" width="598" alt="A magical Mission: Reinforceable classroom ready for today's mission" style="display:block;width:100%;max-width:598px;height:auto;border:0;outline:none;text-decoration:none;background-color:#f8f2e5;color:#553d34;font-size:16px;line-height:24px;text-align:center;"></td></tr>
<tr><td align="center" style="padding:18px 20px 20px;background-color:#ffffff;">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${ctaUrl}" style="height:58px;v-text-anchor:middle;width:330px;" arcsize="8%" strokecolor="#4a3025" strokeweight="7px" fillcolor="#9a3040"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:17px;font-weight:bold;">START TODAY'S MISSION</center></v:roundrect><![endif]-->
<!--[if !mso]><!--><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" bgcolor="#9a3040" style="background-color:#9a3040;border:3px solid #d9a638;outline:3px solid #4a3025;box-shadow:0 5px 0 #4a3025;"><a href="${ctaUrl}" style="display:inline-block;padding:14px 23px;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:22px;font-weight:bold;">START TODAY'S MISSION</a></td></tr></table><!--<![endif]-->
</td></tr>
<tr><td style="padding:0 20px 16px;background-color:#ffffff;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#fff4d8" style="width:100%;background-color:#fff4d8;border:3px solid #49362d;box-shadow:inset 0 0 0 2px #d6a844;"><tr><td style="padding:18px 18px 16px;color:#302826;font-size:16px;line-height:24px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td width="42" valign="middle"><img src="${assets.heart}" width="32" alt="Heart" style="display:block;width:32px;height:auto;border:0;"></td><td valign="middle"><h1 style="margin:0;color:#49362d;font-family:'Courier New',Courier,monospace;font-size:22px;line-height:27px;">${safeGreeting}</h1></td></tr></table>
<p style="margin:12px 0 8px;">Your Mission: Reinforceable mission is ready for today.</p>
<p style="margin:0 0 13px;">Take a few minutes, make your choices, and keep making a difference for your student.</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td width="42" valign="top"><img src="${assets.behaviorXp}" width="31" alt="Behavior XP encouragement" style="display:block;width:31px;height:auto;border:0;"></td><td valign="top"><p style="margin:0 0 5px;font-weight:bold;color:#60388c;">You've got this!</p><p style="margin:0;">See you in there,<br><strong>Mission: Reinforceable</strong></p></td></tr></table>
</td></tr></table></td></tr>
<tr><td style="padding:0 20px 16px;background-color:#ffffff;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f1eafa" style="width:100%;background-color:#f1eafa;border:2px solid #76509a;"><tr><td width="64" valign="top" align="center" style="padding:17px 0 17px 14px;"><img src="${assets.potion}" width="42" alt="Support potion" style="display:block;width:42px;height:auto;border:0;"></td><td style="padding:15px 16px;color:#44394a;font-size:13px;line-height:19px;">
<p style="margin:0 0 6px;font-weight:bold;color:#553078;">Do not reply directly to this email.</p>
<p style="margin:0 0 6px;">If you have difficulty accessing the mission, please contact Jess at <a href="mailto:jess.olson@utah.edu" style="color:#60388c;text-decoration:underline;">jess.olson@utah.edu</a>.</p>
<p style="margin:0;">If the mission is unavailable or you are unable to complete it, please continue implementing the student's behavior support plan as usual.</p>
</td></tr></table></td></tr>
<tr><td style="padding:16px 20px;background-color:#ffffff;border-top:1px solid #e6dfeb;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td width="52" valign="middle"><img src="${assets.heart}" width="38" alt="Heart of appreciation" style="display:block;width:38px;height:auto;border:0;"></td><td valign="middle" style="color:#49362d;font-size:14px;line-height:20px;"><p style="margin:0 0 2px;font-weight:bold;color:#60388c;">Thank you for being a hero in your student's journey!</p><p style="margin:0;">Every mission makes a difference.</p></td><td width="38" align="right" valign="middle"><img src="${assets.sparkle}" width="24" alt="Magical sparkle" style="display:block;width:24px;height:auto;border:0;"></td></tr></table>
</td></tr>
<tr><td style="padding:14px 20px 18px;background-color:#ffffff;border-top:1px solid #ded7e3;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td width="46" valign="top"><img src="${assets.hat}" width="34" alt="Research scholar hat" style="display:block;width:34px;height:auto;border:0;"></td><td valign="top" style="color:#746b78;font-size:11px;line-height:17px;">Mission: Reinforceable is a research project designed to support educators in implementing high-quality behavior supports.</td></tr></table>
</td></tr></table></td></tr></table></div></body></html>`;

  return { from: SENDER, subject, html, text, ctaUrl, assets };
}

module.exports = { SUBJECT, SENDER, ASSET_ROOT, ASSET_FILES, teacherFirstName, buildMissionReminderEmail };
