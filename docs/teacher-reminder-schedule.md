# Teacher reminder schedule

Participating teachers receive one normal Mission: Reinforceable reminder on eligible weekdays. The study procedure describes this as a reminder during the **7 AM Mountain Time hour**.

Vercel Hobby cron schedules use UTC, support hour-level scheduling, and cannot follow the `America/Denver` daylight-saving transition with a single once-daily expression. The normal job therefore runs at `0 13 * * 1-5`: 7 AM during Mountain Daylight Time and 6 AM during Mountain Standard Time. This favors the daylight-time portion of the school-year study and does not promise an exact 7:00 or 7:30 delivery throughout the year.

A distinct retry-only job runs later at `0 15 * * 1-5`. It cannot originate a reminder; it can only reclaim a genuinely failed send or a pending send that has been stale for at least 30 minutes.

`America/Denver` remains authoritative for the study date, study-calendar eligibility, weekend suppression, and exact daily-mission completion suppression.
