# Weekly Teacher Report Qualtrics contract

## Incoming URL Embedded Data

Mission: Reinforceable sends exactly these query parameters to the configured survey:

- `mr_weekly_token`
- `participant_code`
- `week_number`

`week_number` is the participant's 1-based Intervention-week ordinal in the existing weekly check-in sequence (first generated Intervention check-in is 1, second is 2, and so on), not a calendar week number.

## Qualtrics-only participant personalization fields

- `target_behavior`
- `replacement_behavior`
- `target_routine`

These fields are manually configured in Qualtrics Survey Flow for each participant code. They are **not** passed in the MR URL.

## Survey Flow concept

Define these Embedded Data fields at the top of the flow:

- `mr_weekly_token`
- `participant_code`
- `week_number`
- `target_behavior`
- `replacement_behavior`
- `target_routine`

Then configure each participant-code branch to set the target behavior, replacement/desired behavior, and target routine. Preview each branch using only its coded Study ID.

## End-of-survey redirect

```text
https://<production MR domain>/weekly-checkin-complete/?token=${e://Field/mr_weekly_token}
```

Qualtrics owns survey response data. MR owns distribution/completion metadata only. Do not send response fields, names, diagnoses, BIP/BSP text, or other participant content back to MR.
