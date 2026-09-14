'use strict';

const { SENDER, ASSET_ROOT, ASSET_FILES } = require('./mission-reminder-email');
const { validateWeeklyQualtricsUrl } = require('./weekly-recap-service');

const SUBJECT = 'Mission: Reinforceable — Your Weekly Quest Recap';
const WEEKLY_ASSET_FILES = Object.freeze({
  ...ASSET_FILES,
  wizardSuccess: 'wizard-success.png',
  keepGoing: 'keep-going-sign.png',
  daily: 'daily-mission-icon.png',
  mystery: 'mystery-mission-icon.png',
  crisis: 'crisis-mission-icon.png'
});
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

// An honorific usually means the remaining value may be only a surname. It is
// safer and friendlier not to guess than to address a teacher by that surname.
function weeklyGreetingName(teacherName) {
  if (typeof teacherName !== 'string') return null;
  const parts = teacherName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length || /^(?:mr|mrs|ms|miss|mx|dr|prof)\.?$/i.test(parts[0])) return null;
  const candidate = parts[0].replace(/^[^\p{L}]+|[^\p{L}'’-]+$/gu, '');
  return candidate && /^[\p{L}][\p{L}'’-]*$/u.test(candidate) ? candidate : null;
}

function buildWeeklyRecapEmail({ summary, weeklyQualtricsUrl, teacherName, assetOrigin, subject = SUBJECT }) {
  const checked = validateWeeklyQualtricsUrl(weeklyQualtricsUrl);
  if (!checked.configured) throw new Error('A valid weekly Qualtrics check-in link is required');
  const origin = new URL(assetOrigin);
  if (origin.protocol !== 'https:') throw new Error('Weekly recap asset origin must use HTTPS');
  const assets = Object.fromEntries(Object.entries(WEEKLY_ASSET_FILES).map(([key, file]) => [key, new URL(ASSET_ROOT + file, origin).href]));
  const personalizedName = weeklyGreetingName(teacherName);
  const greeting = personalizedName ? `Hey, ${personalizedName}!` : 'Hey, Hero!';
  const missions = Number(summary.missions_completed) || 0;
  const days = Number(summary.days_practiced) || 0;
  const eligibleDays = Number.isFinite(Number(summary.eligible_study_days)) ? Number(summary.eligible_study_days) : 5;
  const mix = summary.mission_mix || { daily: 0, mystery: 0, crisis: 0 };
  const mixText = `${Number(mix.daily) || 0} Daily · ${Number(mix.mystery) || 0} Mystery · ${Number(mix.crisis) || 0} Crisis`;
  const active = missions > 0;
  const lead = active ? 'Another week of practice in the books!' : 'Every week is different.';
  const detail = active
    ? "Every mission is another chance to practice your student's behavior support plan."
    : 'Your brief weekly check-in is ready below.';
  const mixTextBlock = active ? `\nYOUR MISSION MIX\n${mixText}\n` : '';
  const text = `MISSION: REINFORCEABLE
YOUR WEEKLY QUEST RECAP

${greeting}

Here’s a look at your adventure this week.

YOUR ADVENTURE THIS WEEK

${missions} Missions Completed
${days} of ${eligibleDays} Days Practiced
${mixTextBlock}
${lead}
${detail}

ONE LAST QUEST FOR THE WEEK
Take a minute to complete your weekly check-in.

COMPLETE WEEKLY CHECK-IN: ${checked.url}

Thank you for being a hero in your student's journey!
Every mission makes a difference.

Mission: Reinforceable is a research project designed to support educators in implementing high-quality behavior supports.`;

  const mixHtml = active ? `<tr><td colspan="2" style="padding:2px 18px 19px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-top:1px solid #d6a844;"><tr><td colspan="3" align="center" style="padding:14px 6px 10px;color:#60388c;font-family:'Courier New',Courier,monospace;font-size:13px;line-height:18px;font-weight:bold;letter-spacing:1px;">YOUR MISSION MIX</td></tr><tr><td width="33%" align="center" valign="top" style="padding:0 3px;color:#49362d;font-size:13px;line-height:18px;"><img src="${assets.daily}" width="31" alt="" style="display:block;width:31px;max-width:100%;height:auto;margin:0 auto 4px;border:0;"><strong>${Number(mix.daily) || 0}</strong> Daily</td><td width="34%" align="center" valign="top" style="padding:0 3px;color:#49362d;font-size:13px;line-height:18px;"><img src="${assets.mystery}" width="31" alt="" style="display:block;width:31px;max-width:100%;height:auto;margin:0 auto 4px;border:0;"><strong>${Number(mix.mystery) || 0}</strong> Mystery</td><td width="33%" align="center" valign="top" style="padding:0 3px;color:#49362d;font-size:13px;line-height:18px;"><img src="${assets.crisis}" width="31" alt="" style="display:block;width:31px;max-width:100%;height:auto;margin:0 auto 4px;border:0;"><strong>${Number(mix.crisis) || 0}</strong> Crisis</td></tr></table></td></tr>` : '';
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background-color:#f4f1f7;color:#302826;font-family:Arial,Helvetica,sans-serif;"><div role="article" aria-roledescription="email" aria-label="${escapeHtml(subject)}" lang="en" style="background-color:#f4f1f7;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#f4f1f7;"><tr><td align="center" style="padding:16px 8px;"><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#fffdf8;border:1px solid #ded7e3;">
<tr><td align="center" style="padding:10px 14px 7px;background-color:#fffdf8;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td width="32" align="center" valign="middle"><img src="${assets.sparkle}" width="20" alt="" style="display:block;width:20px;max-width:100%;height:auto;border:0;"></td><td align="center"><img src="${assets.title}" width="440" alt="Mission: Reinforceable" style="display:block;width:100%;max-width:440px;height:auto;border:0;outline:none;text-decoration:none;"></td><td width="32" align="center" valign="middle"><img src="${assets.sparkle}" width="20" alt="" style="display:block;width:20px;max-width:100%;height:auto;border:0;"></td></tr></table></td></tr>
<tr><td align="center" bgcolor="#60388c" style="padding:9px 16px;background-color:#60388c;color:#ffffff;font-family:'Courier New',Courier,monospace;font-size:14px;font-weight:bold;letter-spacing:1px;">YOUR WEEKLY QUEST RECAP</td></tr>
<tr><td style="padding:18px 20px 20px;background-color:#fffdf8;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td width="60%" valign="middle" style="padding:4px 10px 4px 0;"><h1 style="margin:0 0 7px;color:#49362d;font-family:'Courier New',Courier,monospace;font-size:24px;line-height:29px;">${escapeHtml(greeting)}</h1><p style="margin:0;color:#443a36;font-size:16px;line-height:23px;">Here’s a look at your adventure this week.</p></td><td width="40%" align="center" valign="middle"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td valign="top" style="padding-top:8px;"><img src="${assets.sparkle}" width="20" alt="" style="display:block;width:20px;max-width:100%;height:auto;border:0;"></td><td align="center"><img src="${assets.wizardSuccess}" width="140" alt="Happy Mission: Reinforceable wizard celebrating your week" style="display:block;width:100%;max-width:140px;height:auto;border:0;outline:none;text-decoration:none;"></td><td valign="bottom" style="padding-bottom:12px;"><img src="${assets.sparkle}" width="17" alt="" style="display:block;width:17px;max-width:100%;height:auto;border:0;"></td></tr></table></td></tr></table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#fff1ce" style="width:100%;margin-top:14px;background-color:#fff1ce;border:4px solid #49362d;box-shadow:inset 0 0 0 2px #d6a844;"><tr><td colspan="2" align="center" style="padding:19px 12px 8px;color:#60388c;font-family:'Courier New',Courier,monospace;font-size:15px;line-height:20px;font-weight:bold;letter-spacing:1px;">YOUR ADVENTURE THIS WEEK</td></tr><tr><td width="50%" align="center" valign="top" style="padding:10px 8px 18px;border-right:2px solid #d6a844;color:#49362d;"><img src="${assets.heart}" width="36" alt="" style="display:block;width:36px;max-width:100%;height:auto;margin:0 auto 5px;border:0;"><strong style="font-size:30px;line-height:36px;">${missions}</strong><br><span style="font-size:14px;line-height:20px;font-weight:bold;">Missions Completed</span></td><td width="50%" align="center" valign="top" style="padding:10px 8px 18px;color:#49362d;"><img src="${assets.sparkle}" width="36" alt="" style="display:block;width:36px;max-width:100%;height:auto;margin:0 auto 5px;border:0;"><strong style="font-size:30px;line-height:36px;">${days} of ${eligibleDays}</strong><br><span style="font-size:14px;line-height:20px;font-weight:bold;">Days Practiced</span></td></tr>${mixHtml}</table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f3ecfa" style="width:100%;margin-top:18px;background-color:#f3ecfa;border:2px solid #b493cf;"><tr><td width="112" align="center" valign="middle" style="padding:12px 6px 12px 12px;"><img src="${assets.keepGoing}" width="94" alt="Keep going" style="display:block;width:100%;max-width:94px;height:auto;border:0;outline:none;text-decoration:none;"></td><td valign="middle" style="padding:14px 16px 14px 8px;color:#443a36;"><h2 style="margin:0 0 6px;color:#60388c;font-family:'Courier New',Courier,monospace;font-size:18px;line-height:23px;">${escapeHtml(lead)}</h2><p style="margin:0;font-size:15px;line-height:22px;">${escapeHtml(detail)}</p></td></tr></table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#eee3f8" style="width:100%;margin-top:18px;background-color:#eee3f8;border:2px solid #76509a;"><tr><td align="center" style="padding:19px 12px 23px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td width="32" align="center"><img src="${assets.sparkle}" width="22" alt="" style="display:block;width:22px;height:auto;border:0;"></td><td align="center"><strong style="color:#553078;font-family:'Courier New',Courier,monospace;font-size:15px;line-height:20px;">ONE LAST QUEST FOR THE WEEK</strong></td><td width="32" align="center"><img src="${assets.sparkle}" width="22" alt="" style="display:block;width:22px;height:auto;border:0;"></td></tr></table><p style="margin:10px 0 18px;line-height:22px;">Take a minute to complete your weekly check-in.</p><!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office-word" href="${escapeHtml(checked.url)}" style="height:56px;v-text-anchor:middle;width:360px;" arcsize="8%" strokecolor="#4a3025" strokeweight="6px" fillcolor="#9a3040"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">COMPLETE WEEKLY CHECK-IN &#8594;</center></v:roundrect><![endif]--><!--[if !mso]><!--><table role="presentation" cellspacing="0" cellpadding="0" border="0" style="max-width:100%;"><tr><td align="center" bgcolor="#9a3040" style="background-color:#9a3040;border:3px solid #d9a638;outline:3px solid #4a3025;box-shadow:0 5px 0 #4a3025;"><a href="${escapeHtml(checked.url)}" style="display:inline-block;padding:14px 18px;color:#ffffff;text-decoration:none;font-size:16px;line-height:22px;font-weight:bold;">COMPLETE WEEKLY CHECK-IN &#8594;</a></td></tr></table><!--<![endif]--></td></tr></table></td></tr>
<tr><td style="padding:16px 20px;border-top:1px solid #e6dfeb;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td width="52"><img src="${assets.heart}" width="38" alt="Heart of appreciation" style="display:block;width:38px;height:auto;border:0;"></td><td style="color:#49362d;font-size:14px;line-height:20px;"><p style="margin:0 0 2px;font-weight:bold;color:#60388c;">Thank you for being a hero in your student's journey!</p><p style="margin:0;">Every mission makes a difference.</p></td><td width="38" align="right"><img src="${assets.sparkle}" width="24" alt="Magical sparkle" style="display:block;width:24px;height:auto;border:0;"></td></tr></table></td></tr>
<tr><td style="padding:14px 20px 18px;border-top:1px solid #ded7e3;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td width="46" valign="top"><img src="${assets.hat}" width="34" alt="Research scholar hat" style="display:block;width:34px;height:auto;border:0;"></td><td valign="top" style="color:#746b78;font-size:11px;line-height:17px;">Mission: Reinforceable is a research project designed to support educators in implementing high-quality behavior supports.</td></tr></table></td></tr>
</table></td></tr></table></div></body></html>`;
  return { from: SENDER, subject, html, text, ctaUrl: checked.url, assets };
}

module.exports = { SUBJECT, weeklyGreetingName, buildWeeklyRecapEmail };
