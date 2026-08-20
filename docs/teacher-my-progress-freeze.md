# Teacher My Progress freeze

Teacher-facing **My Progress** is game-practice feedback. Its summary is frozen to exactly these four metrics:

- **Average Practice Score:** total points earned across completed missions divided by total points possible across completed missions, multiplied by 100 and rounded to the nearest whole percent.
- **Missions Completed:** the count of completed Mission: Reinforceable missions included in the teacher's progress history.
- **Most Recent Practice Score:** the percentage score from the most recently completed mission.
- **Best Practice Score:** the highest percentage score among completed missions.

**Mission History** shows the America/Denver completion date, mission type, Mission Score percentage, and a Details action that reopens the saved mission responses and feedback.

These are game-practice and engagement metrics. They are not classroom BSP implementation fidelity, treatment integrity, or mastery criteria. They do not determine phase change, replace direct observation, or standardize or prescribe coach action. Teachers may review existing mission feedback; My Progress does not automatically identify a deficit or recommend a personalized focus.

Authenticated progress comes only from completed Supabase mission sessions scoped to the current participant and case. Normal participant views require `qa_mode = false`; QA Preview requires `qa_mode = true`. Classroom observation, weekly teacher-report, and Resource Map telemetry data are outside this score boundary. Public demo progress may remain browser-local.

The required safeguard remains: "These scores summarize your choices in Mission: Reinforceable. They are not classroom fidelity scores."
