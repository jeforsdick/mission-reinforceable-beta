# Teacher reminder schedule

Participating teachers receive one normal Mission: Reinforceable reminder on eligible weekdays. The study procedure describes this as a reminder **around 7–8 AM Mountain Time**, rather than promising an exact clock time.

Vercel Hobby cron schedules use UTC, support hour-level scheduling, and cannot follow the `America/Denver` daylight-saving transition with a single once-daily expression. The normal job therefore runs at `0 14 * * 1-5`: approximately 8 AM during Mountain Daylight Time and 7 AM during Mountain Standard Time. This is intentionally the closest year-round compromise to approximately 7:30 AM Mountain Time given Vercel Hobby's UTC scheduling and hour-level precision.

A distinct retry-only job runs later at `0 16 * * 1-5`. It cannot originate a reminder; it can only reclaim a genuinely failed send or a pending send that has been stale for at least 30 minutes.

`America/Denver` remains authoritative for the study date, study-calendar eligibility, weekend suppression, and exact daily-mission completion suppression.
