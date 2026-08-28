# Qualtrics measure configuration

Configure these server-side Vercel environment variables for Production (and for any Preview environment used for research QA). Survey URLs are configuration, not application constants; do not add Qualtrics API keys or response data to Mission: Reinforceable.

| Measure | Environment variable | Participant context |
| --- | --- | --- |
| TSES Pre | `TSES_PRE_QUALTRICS_URL` | `participant_code`, added server-side from the case participant |
| Weekly Teacher Report | `WEEKLY_TEACHER_CHECKIN_QUALTRICS_URL` | `participant_code` through the existing opaque weekly-token architecture |
| TSES Post | `TSES_POST_QUALTRICS_URL` | `participant_code`, added server-side from the case participant |
| URP-IR | `URP_IR_QUALTRICS_URL` | `participant_code`, added server-side from the case participant |
| Teacher Interview | `TEACHER_INTERVIEW_QUALTRICS_URL` | None; the researcher enters the Study ID manually |

Each value must be an HTTPS Qualtrics URL with no credentials and a `/jfe/form/SV_*` path. Invalid or missing values fail closed and appear as not configured in Research Operations.

The Weekly Teacher Report continues to require `mr_weekly_token`, `participant_code`, and `week_number`; its configuration status never provides a static survey link. TSES Pre, TSES Post, and URP-IR receive only `participant_code`. The Interview URL receives no participant or case parameters. Opening or copying any link does not update the manual measure record.
