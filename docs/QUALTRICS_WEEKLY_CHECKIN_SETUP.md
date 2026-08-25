# One-time Qualtrics weekly check-in setup

Qualtrics owns the Weekly Teacher Report and every answer. Mission: Reinforceable records only administration metadata: whether a check-in was expected, whether its link was issued, whether it was completed, and the completion time.

Jess needs to configure the survey once:

1. In Survey Flow, add the Embedded Data field `mr_weekly_token` and allow it to be populated from the incoming query string.
2. Set the End of Survey behavior to redirect to:

   `https://<MISSION-SITE>/weekly-checkin-complete/?token=${e://Field/mr_weekly_token}`

The piped-text expression above is the intended Qualtrics Embedded Data form, but **must be verified in the deployed Qualtrics account before production use**.

Set the server-only `WEEKLY_TEACHER_CHECKIN_QUALTRICS_URL` to the real survey URL. If it is absent, production delivery remains unavailable. No Qualtrics response API or answer export to Mission: Reinforceable is required or permitted.
