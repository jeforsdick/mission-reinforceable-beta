'use strict';

const SUBJECT = 'Your Mission: Reinforceable mission is ready';
const SENDER = 'Mission: Reinforceable <missions@mail.missionreinforceable.com>';
const HERO_ASSET_PATH = '/assets/game/skin-v2/landing-page-classroom.png';

function canonicalGameUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Test mission email URL is invalid'); }
  if (url.protocol !== 'https:' || url.pathname !== '/game/' || url.search || url.hash || url.username || url.password) {
    throw new Error('Test mission email URL must be an authenticated /game/ URL');
  }
  return url;
}

function buildTestMissionEmail(gameUrl) {
  const missionUrl = canonicalGameUrl(gameUrl);
  const ctaUrl = missionUrl.href;
  // This existing game asset is deployed on the same origin as the canonical game entry URL.
  const heroUrl = new URL(HERO_ASSET_PATH, missionUrl.origin).href;
  const text = `MISSION: REINFORCEABLE
YOUR DAILY MISSION AWAITS

Good morning, Hero!

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
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>${SUBJECT}</title></head>
<body style="margin:0;padding:0;background-color:#f7f2e8;color:#321d1b;font-family:Arial,Helvetica,sans-serif;">
<div role="article" aria-roledescription="email" aria-label="${SUBJECT}" lang="en" style="background-color:#f7f2e8;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#f7f2e8;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:4px solid #5b2639;">
<tr><td align="center" style="padding:24px 20px 16px;background-color:#4b286d;border-bottom:6px solid #d5a63b;color:#ffffff;">
<div style="font-family:'Courier New',Courier,monospace;font-size:28px;line-height:34px;font-weight:bold;letter-spacing:1px;">MISSION: REINFORCEABLE</div>
<div style="display:inline-block;margin-top:12px;padding:7px 12px;background-color:#f7e4ad;border:3px solid #7a3a25;color:#5b2639;font-family:'Courier New',Courier,monospace;font-size:14px;line-height:18px;font-weight:bold;letter-spacing:1px;">YOUR DAILY MISSION AWAITS</div>
</td></tr>
<tr><td align="center" style="padding:20px 20px 8px;background-color:#fffaf0;">
<img src="${heroUrl}" width="552" alt="Mission: Reinforceable classroom with the Wizard" style="display:block;width:100%;max-width:552px;height:auto;border:0;outline:none;text-decoration:none;background-color:#eee3c8;color:#4b286d;font-size:16px;line-height:24px;text-align:center;">
</td></tr>
<tr><td align="center" style="padding:18px 24px 24px;background-color:#fffaf0;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" bgcolor="#8d2438" style="border:4px solid #4a1e27;border-bottom-width:7px;">
<a href="${ctaUrl}" style="display:inline-block;padding:15px 22px;color:#ffffff;text-decoration:none;font-family:'Courier New',Courier,monospace;font-size:18px;line-height:22px;font-weight:bold;">START TODAY'S MISSION</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:0 24px 24px;background-color:#fffaf0;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#ffffff;border:3px solid #d5a63b;"><tr><td style="padding:24px;color:#321d1b;font-size:16px;line-height:25px;">
<h1 style="margin:0 0 16px;color:#5b2639;font-family:'Courier New',Courier,monospace;font-size:23px;line-height:29px;">Good morning, Hero!</h1>
<p style="margin:0 0 12px;">Your Mission: Reinforceable mission is ready for today.</p>
<p style="margin:0 0 20px;">Take a few minutes, make your choices, and keep making a difference for your student.</p>
<p style="margin:0 0 8px;font-weight:bold;color:#4b286d;">You've got this!</p>
<p style="margin:0;">See you in there,<br><strong>Mission: Reinforceable</strong></p>
</td></tr></table>
</td></tr>
<tr><td style="padding:0 24px 24px;background-color:#fffaf0;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#f4ecdc;border-left:4px solid #9b825b;"><tr><td style="padding:18px 20px;color:#54433d;font-size:13px;line-height:20px;">
<p style="margin:0 0 8px;font-weight:bold;">Do not reply directly to this email.</p>
<p style="margin:0 0 8px;">If you have difficulty accessing the mission, please contact Jess at <a href="mailto:jess.olson@utah.edu" style="color:#6b2852;text-decoration:underline;">jess.olson@utah.edu</a>.</p>
<p style="margin:0;">If the mission is unavailable or you are unable to complete it, please continue implementing the student's behavior support plan as usual.</p>
</td></tr></table>
</td></tr>
<tr><td align="center" style="padding:22px 24px;background-color:#5b2639;color:#fff8e8;font-size:14px;line-height:21px;">
<p style="margin:0 0 4px;font-weight:bold;color:#f2cb68;">Thank you for being a hero in your student's journey!</p>
<p style="margin:0 0 14px;">Every mission makes a difference.</p>
<p style="margin:0;font-size:11px;line-height:17px;color:#f0dfd2;">Mission: Reinforceable is a research project designed to support educators in implementing high-quality behavior supports.</p>
</td></tr></table>
</td></tr></table>
</div></body></html>`;

  return { from: SENDER, subject: SUBJECT, html, text, ctaUrl, heroUrl };
}

module.exports = { SUBJECT, SENDER, HERO_ASSET_PATH, buildTestMissionEmail };
