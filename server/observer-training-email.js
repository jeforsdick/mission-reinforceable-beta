'use strict';

const SUBJECT = 'Mission: Reinforceable — Your Observer Account Is Ready';
const SENDER = 'Mission: Reinforceable <missions@mail.missionreinforceable.com>';
const REPLY_TO = 'Jess Olson <Jess.olson@utah.edu>';
const OBSERVER_URL = 'https://www.missionreinforceable.com/observer/';
const ASSET_ROOT = 'https://www.missionreinforceable.com/assets/game/skin-v2/';

function buildObserverTrainingEmail() {
  const assets = {
    header: ASSET_ROOT + 'email-header-banner.png',
    classroom: ASSET_ROOT + 'landing-page-classroom.png',
    heart: ASSET_ROOT + 'heart-icon.png',
    potion: ASSET_ROOT + 'potion-icon.png',
    sparkle: ASSET_ROOT + 'sparkle-icon.png',
    hat: ASSET_ROOT + 'hat-icon.png'
  };

  const text = `MISSION: REINFORCEABLE
YOUR OBSERVER MISSION AWAITS

Hey, team!

Thank you again for helping with data collection for my dissertation! I have the observer side of Mission: Reinforceable up and running, and your first step is to get your observer account set up and complete the asynchronous training.

Please complete the training by Friday, October 9. It should take about 30–45 minutes.

Your Observer Account gives you access to:
- Observer Training — learn and practice the data-collection procedures
- My Schedule — this is where schedules will be housed once we have a teacher/case
- Live Data Collection — this is where you will access the data-collection log for your assigned session and collect data directly in the system

SET UP YOUR OBSERVER ACCOUNT:
${OBSERVER_URL}

FIRST TIME SIGNING IN?
Click “First time here or forgot your password?”, enter your Utah email address for your account, and use the secure email link to create your password.
Once you are signed in, click Observer Training and work through the module.

ABOUT QUALIFICATION
The training criterion is ≥90% agreement for both teacher fidelity and student behavior before independent data collection. This is also our chance to catch anything that is confusing or needs to be changed before we start collecting real dissertation data, so please be candid in the feedback/questions section.

WHAT HAPPENS NEXT?
After everyone finishes, I’ll review the practice/qualification data, feedback, and questions. We’ll find time for a short team Q&A during the week of October 12.

After that, I’ll be in touch once we have a teacher/case ready for data collection. I’ll join you for your first several observations for field calibration before anyone is cleared for independent data collection. This is part of our study protocol, but it is also meant to give you time to get comfortable with the school, the classroom routine, and the data-collection system before you are expected to do observations on your own. I’ll keep coming out with you until you feel comfortable and we both feel good about independent data collection.

For now: Nothing will appear under My Schedule yet. Once we have a teacher/case ready, I’ll handle the scheduling and your assigned observations will show up there automatically. There also won’t be anything available for live data collection yet!

Seriously, thank you for doing this. Having a solid team of people I trust collecting these data is a huge help, and I really appreciate you being willing to be part of it!

– Jess

Thank you for joining the Mission: Reinforceable research team!

Mission: Reinforceable is a research project designed to support educators in implementing high-quality behavior supports.`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>${SUBJECT}</title></head>
<body style="margin:0;padding:0;background-color:#f4f1f7;color:#302826;font-family:Arial,Helvetica,sans-serif;">
<div role="article" aria-roledescription="email" aria-label="${SUBJECT}" lang="en" style="background-color:#f4f1f7;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#f4f1f7;"><tr><td align="center" style="padding:20px 10px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #ded7e3;">
<tr><td align="center" style="padding:0;background:#fff;"><img src="${assets.header}" width="600" alt="Mission: Reinforceable" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>
<tr><td align="center" bgcolor="#60388c" style="padding:9px 16px;background:#60388c;color:#fff;font-family:'Courier New',Courier,monospace;font-size:14px;line-height:18px;font-weight:bold;letter-spacing:1px;">YOUR OBSERVER MISSION AWAITS</td></tr>
<tr><td align="center" style="padding:0;background:#fff;"><img src="${assets.classroom}" width="598" alt="Mission: Reinforceable classroom" style="display:block;width:100%;max-width:598px;height:auto;border:0;background:#f8f2e5;"></td></tr>

<tr><td style="padding:18px 20px 0;background:#fff;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#fff4d8" style="width:100%;background:#fff4d8;border:3px solid #49362d;box-shadow:inset 0 0 0 2px #d6a844;">
<tr><td style="padding:18px;color:#302826;font-size:15px;line-height:23px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td width="42" valign="middle"><img src="${assets.heart}" width="32" alt="" style="display:block;width:32px;height:auto;border:0;"></td><td valign="middle"><h1 style="margin:0;color:#49362d;font-family:'Courier New',Courier,monospace;font-size:22px;line-height:27px;">Hey, team!</h1></td></tr></table>
<p style="margin:12px 0 10px;">Thank you again for helping with data collection for my dissertation! I have the observer side of <strong>Mission: Reinforceable</strong> up and running, and your first step is to get your observer account set up and complete the asynchronous training.</p>
<p style="margin:0 0 12px;"><strong>Please complete the training by Friday, October 9.</strong> It should take about <strong>30–45 minutes</strong>.</p>
<p style="margin:0 0 7px;font-weight:bold;color:#60388c;">Your Observer Account gives you access to:</p>
<p style="margin:0 0 5px;">⚔️ <strong>Observer Training</strong> — learn and practice the data-collection procedures</p>
<p style="margin:0 0 5px;">📅 <strong>My Schedule</strong> — this is where schedules will be housed once we have a teacher/case</p>
<p style="margin:0;">📋 <strong>Live Data Collection</strong> — this is where you will access the data-collection log for your assigned session and collect data directly in the system</p>
</td></tr></table></td></tr>

<tr><td align="center" style="padding:22px 20px 20px;background:#fff;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" bgcolor="#9a3040" style="background:#9a3040;border:3px solid #d9a638;outline:3px solid #4a3025;box-shadow:0 5px 0 #4a3025;">
<a href="${OBSERVER_URL}" style="display:inline-block;padding:14px 23px;color:#fff;text-decoration:none;font-size:17px;line-height:22px;font-weight:bold;">SET UP YOUR OBSERVER ACCOUNT</a>
</td></tr></table></td></tr>

<tr><td style="padding:0 20px 16px;background:#fff;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f1eafa" style="width:100%;background:#f1eafa;border:2px solid #76509a;">
<tr><td width="64" valign="top" align="center" style="padding:17px 0 17px 14px;"><img src="${assets.potion}" width="42" alt="" style="display:block;width:42px;height:auto;border:0;"></td>
<td style="padding:15px 16px;color:#44394a;font-size:14px;line-height:21px;">
<p style="margin:0 0 7px;font-weight:bold;color:#553078;">FIRST TIME SIGNING IN?</p>
<p style="margin:0 0 6px;">Click <strong>“First time here or forgot your password?”</strong>, enter your Utah email address for your account, and use the secure email link to create your password.</p>
<p style="margin:0;">Once you are signed in, click <strong>Observer Training</strong> and work through the module.</p>
</td></tr></table></td></tr>

<tr><td style="padding:0 20px 16px;background:#fff;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#fff8de" style="width:100%;background:#fff8de;border:2px solid #d6a844;">
<tr><td style="padding:16px 18px;color:#49362d;font-size:14px;line-height:21px;">
<p style="margin:0 0 7px;font-family:'Courier New',Courier,monospace;font-weight:bold;color:#60388c;">ABOUT QUALIFICATION</p>
<p style="margin:0;">The training criterion is <strong>≥90% agreement for both teacher fidelity and student behavior</strong> before independent data collection. This is also our chance to catch anything that is confusing or needs to be changed before we start collecting real dissertation data, so please be candid in the feedback/questions section.</p>
</td></tr></table></td></tr>

<tr><td style="padding:0 20px 16px;background:#fff;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f1eafa" style="width:100%;background:#f1eafa;border:2px solid #76509a;">
<tr><td width="64" valign="top" align="center" style="padding:17px 0 17px 14px;"><img src="${assets.sparkle}" width="34" alt="" style="display:block;width:34px;height:auto;border:0;"></td>
<td style="padding:15px 16px;color:#44394a;font-size:14px;line-height:21px;">
<p style="margin:0 0 7px;font-weight:bold;color:#553078;">WHAT HAPPENS NEXT?</p>
<p style="margin:0 0 7px;">After everyone finishes, I’ll review the practice/qualification data, feedback, and questions. We’ll find time for a short team Q&amp;A during the <strong>week of October 12</strong>.</p>
<p style="margin:0;">After that, I’ll be in touch once we have a teacher/case ready for data collection. I’ll join you for your first several observations for <strong>field calibration</strong> before anyone is cleared for independent data collection. This is part of our study protocol, but it is also meant to give you time to get comfortable with the school, classroom routine, and data-collection system before you are expected to do observations on your own. <strong>I’ll keep coming out with you until you feel comfortable and we both feel good about independent data collection.</strong></p>
</td></tr></table></td></tr>

<tr><td style="padding:0 20px 18px;background:#fff;color:#443a36;font-size:14px;line-height:21px;">
<p style="margin:0 0 7px;"><strong>For now:</strong> Nothing will appear under <strong>My Schedule</strong> yet. Once we have a teacher/case ready, I’ll handle the scheduling and your assigned observations will show up there automatically. There also won’t be anything available for live data collection yet!</p>
<p style="margin:14px 0 0;">Seriously, thank you for doing this. Having a solid team of people I trust collecting these data is a huge help, and I really appreciate you being willing to be part of it!</p>
<p style="margin:10px 0 0;"><strong>– Jess</strong></p>
</td></tr>

<tr><td style="padding:16px 20px;background:#fff;border-top:1px solid #e6dfeb;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
<td width="52" valign="middle"><img src="${assets.heart}" width="38" alt="" style="display:block;width:38px;height:auto;border:0;"></td>
<td valign="middle" style="color:#49362d;font-size:14px;line-height:20px;"><p style="margin:0;font-weight:bold;color:#60388c;">Thank you for joining the Mission: Reinforceable research team!</p></td>
<td width="38" align="right" valign="middle"><img src="${assets.sparkle}" width="24" alt="" style="display:block;width:24px;height:auto;border:0;"></td>
</tr></table></td></tr>

<tr><td style="padding:14px 20px 18px;background:#fff;border-top:1px solid #ded7e3;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
<td width="46" valign="top"><img src="${assets.hat}" width="34" alt="" style="display:block;width:34px;height:auto;border:0;"></td>
<td valign="top" style="color:#746b78;font-size:11px;line-height:17px;">Mission: Reinforceable is a research project designed to support educators in implementing high-quality behavior supports.</td>
</tr></table></td></tr>

</table></td></tr></table></div></body></html>`;

  return { from: SENDER, replyTo: REPLY_TO, subject: SUBJECT, html, text };
}

module.exports = { SUBJECT, SENDER, REPLY_TO, OBSERVER_URL, buildObserverTrainingEmail };
