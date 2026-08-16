# Mission: Reinforceable Mission Authoring Standard

This is the canonical standard for individualized Mission: Reinforceable content. Individualized content changes by case; mechanics and authoring rules remain standardized. For dissertation participants, the current BIP/BSP is the primary source of truth, while intake information provides supplemental classroom context. If the BIP and intake conflict, use the BIP. Future scaled versions may use a sufficiently structured intake as the source of truth, but that is not the dissertation workflow.

Real participant BIPs, intake responses, missions, or generated protected-content payloads must **NEVER** be committed to public GitHub.

**Participant-facing choices are shuffled at display time. Authoring order must never be relied upon.** Choice IDs, scores, branching, and fidelity metadata belong to the choice object and must remain correct independently of its displayed position.

## 1. Core Design Principle

Every mission is a **five-decision interactive classroom story**, not a five-question quiz.

The intended player experience is:

> “I entered a classroom situation, made a decision, saw the classroom respond to my decision, and then had to deal with the situation I helped create.”

Design around:

- meaningful player choice
- visible consequences
- uncertainty
- challenge
- agency
- immediate feedback
- realistic classroom implementation

## 2. Standard Mission Structure

Every mission must include:

- unique mission ID
- short engaging title
- mission type
- classroom routine
- central tension
- function pressure when supported
- BIP components in play
- exact fidelity-target opportunities
- exactly 5 decision points per play-through
- 3 choices at every decision
- 10 / 5 / 0 scoring
- meaningful branching
- wizard hint
- vivid consequence feedback
- wizard feedback
- metadata

### Daily — 10

Routine, commonly occurring implementation moments.

### Mystery — 5

Unexpected variations, competing demands, staffing/material changes, peer issues, schedule changes, or other generalization challenges.

> **Implementation note:** The existing code/database field is `wildcard_missions`; public-facing language may use Mystery.

### Crisis — 5

Higher-intensity or high-pressure classroom moments.

Crisis missions must **NEVER** invent crisis, restraint, blocking, evacuation, physical management, or safety procedures absent from the BIP/BSP.

If no formal crisis plan exists, scenarios may depict elevated intensity only when:

- everyone is currently safe; **or**
- necessary immediate safety actions are already described as having occurred under existing school procedures, and the game decision begins afterward.

## 3. Mission Design Card

Before writing branches, complete:

```text
MISSION ID:

MISSION TITLE:

MISSION TYPE:
Daily / Mystery / Crisis

ROUTINE / LOCATION:

CENTRAL TENSION:

FUNCTION PRESSURE:

ACTIVE BIP COMPONENTS:
Prevent / Teach / Reinforce / Respond / Crisis if supported

EXACT FIDELITY TARGET OPPORTUNITIES:

EMOTIONAL / NARRATIVE TONE:

MISSION DESIGN GOAL:
What discrimination should make this mission difficult?
```

Titles should sound like situations, not ABA exercises.

Good examples:

- Everyone Needs You
- One More Minute
- The Circle-Time Tug-of-War
- The Teacher Table Pileup

Avoid:

- Attention Practice #3
- Reinforcement Scenario

## 4. Rich Scene Setting

Missions must begin with a narrative cold open rather than immediately asking a question. Opening scenes should generally be approximately 80–130 words. Later scenes can generally be 40–80 words.

Include:

- place/routine
- sensory or contextual detail
- competing teacher demand
- student baseline
- relevant antecedent/history
- observable behavior
- one factor that makes the decision difficult

Write in second person so the player occupies the teacher role.

```text
It’s [time/routine], and [brief classroom/context detail].

You’re [what the teacher is doing], while [competing demand].

[Student alias] has been [baseline/context].
A few minutes ago, [relevant antecedent/history].

Now [observable student behavior].

[One detail that makes the choice genuinely difficult.]

What do you do?
```

The goal is immersion, not unnecessary length.

## 5. Five-Beat Story Arc

Every play-through contains five meaningful decisions.

### Decision 1 — The Setup

Early opportunity, often before escalation.

### Decision 2 — The Pressure

The previous decision changes the classroom state and adds pressure.

### Decision 3 — The Pivot

Often the hardest discrimination. Replacement behavior, prompting, escalation, or competing contingencies are active.

### Decision 4 — The Consequence

Timing, reinforcement, and response contingency become especially important.

### Decision 5 — The Finish

The player must sustain, recover, or worsen the trajectory.

Important:

- A poor early choice must not doom the mission.
- A teacher must be able to recover.
- A strong early choice must not make later decisions trivial.

## 6. Agency and Branching

Choices must genuinely affect what happens. Do not merely change feedback and then route every answer into the same unchanged next paragraph.

Each meaningful branch should alter at least two of:

- student intensity
- replacement behavior availability
- teacher attention/workload
- peer involvement
- task status
- reinforcement opportunity
- elapsed waiting
- environmental disruption

For internal authoring, branches may be conceptualized as:

- `SUPPORTED`
- `WOBBLY`
- `ESCALATED`

These are trajectories, not fixed endings. Movement can occur in both directions: `ESCALATED → WOBBLY → SUPPORTED` and `SUPPORTED → WOBBLY`.

## 7. Difficulty Standard

Start hard. Difficulty should come from **behavioral discrimination**, not confusing wording or trick questions. All three options should initially appear plausible to a competent educator.

### 10 — Plan Aligned

Best fits:

- the BIP
- function
- timing
- contingency
- current student state

### 5 — Workable / Refine

A caring, reasonable response that contains something helpful but misses or delays an important active ingredient.

Common 5-point patterns:

- good strategy at the wrong time
- vague support instead of an explicit skill prompt
- reinforcement delivered too loosely
- delayed reinforcement
- prompting without reinforcing
- support that misses the replacement behavior
- generally appropriate classroom practice that does not fully implement this BIP

The player should sometimes genuinely believe the 5-point response was best.

### 0 — Plan Drift / Missed Opportunity

A realistic response a stressed or busy teacher might plausibly make, but one that conflicts with the plan or strengthens the wrong contingency. Do not write cartoonishly bad choices.

All three choices should be similar in:

- length
- specificity
- professional tone
- warmth
- grammatical quality

Never allow wording quality to reveal the correct answer.

## 8. Feedback Must Show the Consequence First

After a choice, feedback should answer **“What happens now?”** before **“Why?”**

### A. Immediate Modeled Consequence

Use 2–4 vivid sentences showing what happens in the simulation. These may include student words, movement, intensity, task behavior, attention shifts, peers, classroom disruption, replacement behavior, or teacher workload.

### B. Wizard Reaction

Use 1–3 memorable, theatrical sentences. The Wizard may be dramatic, playful, surprised, celebratory, or ominous, but never insulting, shaming, condescending, or judgmental toward the teacher.

### C. Behavioral Explanation

Explain why the response did or did not fit the plan, function, contingency, timing, replacement behavior, and reinforcement.

### D. Carry the Consequence Forward

The next scene must reflect the state created by the player's decision.

## 9. Wizard Feedback Style

Wizard feedback should be bigger and more game-like than ordinary instructional feedback.

Avoid:

> That is not the correct approach.

Prefer:

> Ohhh, sneaky trap. It worked — which is exactly the problem.

or:

> YES. You closed the escalation portal before it opened.

The Wizard should enhance the drama without changing the behavioral meaning.

## 10. Modeled Consequence Safety

Vivid feedback describes what happens **inside the simulated branch**. Do not present behavioral outcomes as guaranteed predictions.

Allowed modeled consequence:

> Anna’s voice gets louder and she pushes the bin away.

Appropriate behavioral explanation:

> This response may make escalation more likely because...

Avoid:

> Doing this always causes aggression.

Consequences must be:

- plausible
- consistent with the BIP/function
- appropriate to the current trajectory
- not falsely deterministic

## 11. Hints

Hints are just-in-time support, not answer keys.

Do not say:

> Choose the non-contingent attention option.

Prefer:

> Nothing has gone wrong yet. Which option uses the plan before the student has to work harder to get your attention?

Hints should point the teacher toward function, timing, contingency, replacement behavior, or a BIP component without identifying the answer.

## 12. Exact Fidelity Target Linkage

Fidelity measurement is narrower than general BIP alignment. A decision gets `meta.fidelityTargetKey` only when the exact fidelity target description is a defensible scoring criterion for that decision.

Put `fidelityTargetKey` on the **decision step**, never individual choices. One decision step may have at most one primary fidelity target in the current version. Leave it absent when none fit exactly.

Never:

- infer target linkage from wording similarity
- hardcode Supabase UUIDs
- attach a target merely because the decision belongs to the same PTR domain

For example, if the target is `proactive_01 = Give non-contingent attention`, then:

- an exact non-contingent-attention opportunity may use `proactive_01`
- using a visual timer is BIP-aligned but does **NOT** automatically count as `proactive_01`

## 13. Choice Metadata

Each choice should retain descriptive metadata such as:

```js
meta: {
  bipComponent: "Prevent",
  mechanism: "Non-contingent attention",
  errorType: "none",
  function: "attention"
}
```

Metadata describes the selected response. Fidelity linkage belongs at the decision-step level.

## 14. Resources / BIP Briefing Standard

The participant Resources section supports rehearsal but never replaces the official BIP. Include only supported information:

- student snapshot
- classroom challenge
- function/pathway
- setting events/common contexts
- antecedents
- prevention
- replacement skills
- reinforcement
- response procedures
- safety boundaries
- plan-aligned examples
- less-helpful examples
- fidelity checklist

Use the approved student game alias only. Do not include unnecessary identifiers.

## 15. Crisis Authoring Safeguard

Before writing any Crisis mission, ask:

> Does the BIP contain a formal crisis/safety procedure?

If **YES**, use only those documented procedures. If **NO**, do not invent one.

High-intensity scenarios may still be used, but choices must begin from a safe point or after required safety actions have already occurred according to school procedures. Do not teach physical intervention procedures unless explicitly supported and approved.

## 16. Full Copy/Paste Mission Authoring Template

```text
MISSION:

MISSION ID:

MISSION TITLE:

MISSION TYPE:

ROUTINE / LOCATION:

CENTRAL TENSION:

FUNCTION PRESSURE:

ACTIVE BIP COMPONENTS:

EXACT FIDELITY TARGET OPPORTUNITIES:

================================================
DECISION 1 — THE SETUP
================================================

INCOMING STATE:

SCENE:

CHOICE 10 — PLAN ALIGNED

Teacher action:

Immediate modeled consequence:

Wizard:

Behavioral explanation:

NEXT STATE:

CHOICE 5 — WORKABLE / REFINE

Teacher action:

Immediate modeled consequence:

Wizard:

Behavioral explanation:

NEXT STATE:

CHOICE 0 — PLAN DRIFT

Teacher action:

Immediate modeled consequence:

Wizard:

Behavioral explanation:

NEXT STATE:

HINT:
[Just-in-time cue without revealing answer]

METADATA:
- BIP component
- mechanism
- error type
- function
- fidelityTargetKey if exact

================================================
DECISION 2 — THE PRESSURE
================================================

Write scenes that actually reflect the incoming branch.

================================================
DECISION 3 — THE PIVOT
================================================

Often the hardest discrimination.

================================================
DECISION 4 — THE CONSEQUENCE
================================================

Emphasize timing and contingency.

================================================
DECISION 5 — THE FINISH
================================================

Provide a meaningful opportunity to sustain, recover, or worsen the trajectory.

================================================
ENDING
================================================

Reflect:
- student state
- classroom state
- accumulated player decisions
- transition back to ordinary classroom activity
```

Repeat the complete choice, consequence, Wizard, explanation, next-state, hint, and metadata fields for every incoming branch at Decisions 2–5.

## 17. Machine-Friendly Mission Skeleton

This JavaScript/JSON-style example matches the current game structure:

```js
{
  id: "MISSION_ID",
  title: "MISSION TITLE",
  expectedSteps: 5,
  start: "d1_start",
  focus: "MISSION AUTHORING FOCUS",
  routine: "CLASSROOM ROUTINE",
  functionPressure: ["attention"],
  bipTargets: [],

  // Optional narrative closure shown after (and not counted as) Decision 5.
  endings: {
    STRONG: { text: "NARRATIVE OUTCOME", wizard: "OPTIONAL WIZARD REACTION" },
    MIXED: { text: "NARRATIVE OUTCOME", wizard: "OPTIONAL WIZARD REACTION" },
    FRAGILE: { text: "NARRATIVE OUTCOME", wizard: "OPTIONAL WIZARD REACTION" }
  },

  steps: {
    d1_start: {
      meta: {
        fidelityTargetKey: "proactive_01"
      },

      text: "RICH SCENE-SETTING TEXT",

      hint: "JUST-IN-TIME WIZARD HINT",

      choices: {
        A: {
          text: "PLAUSIBLE TEACHER RESPONSE",
          score: 10,
          consequence: "SIMULATED CLASSROOM RESULT AFTER THIS CHOICE",
          wizard: "DRAMATIC BUT NONJUDGMENTAL WIZARD RESPONSE",
          feedback: "BEHAVIORAL/BIP EXPLANATION OF WHY THE CHOICE ALIGNS OR DRIFTS",
          next: "d2_supported",
          meta: {
            bipComponent: "Prevent",
            mechanism: "Non-contingent attention",
            errorType: "none",
            function: "attention"
          }
        },

        B: {
          text: "PLAUSIBLE WORKABLE-BUT-INCOMPLETE RESPONSE",
          score: 5,
          feedback: "VIVID CONSEQUENCE + EXPLANATION",
          wizard: "WIZARD RESPONSE",
          next: "d2_wobbly",
          meta: {
            bipComponent: "Prevent",
            mechanism: "Waiting support",
            errorType: "missed active ingredient",
            function: "attention"
          }
        },

        C: {
          text: "REALISTIC PLAN-DRIFT RESPONSE",
          score: 0,
          feedback: "VIVID CONSEQUENCE + EXPLANATION",
          wizard: "WIZARD RESPONSE",
          next: "d2_escalated",
          meta: {
            bipComponent: "Respond",
            mechanism: "Attention contingency",
            errorType: "reinforces target pattern",
            function: "attention"
          }
        }
      }
    }
  }
}
```

The executable choice fields have distinct jobs:

- `consequence` is the simulated classroom result and is shown first. It is optional so legacy missions remain valid.
- `wizard` is the Wizard's short theatrical reaction.
- `feedback` is the behavioral/BIP explanation of why the choice did or did not align with the plan.
- `ending` is an optional `STRONG`, `MIXED`, or `FRAGILE` narrative outcome key on a terminal Decision 5 choice only.
- `mission.endings` optionally maps those keys to an outcome `text` and optional `wizard` reaction.

An ending is narrative closure, not a decision: it must not add a step, choice, score, heart change, fidelity observation, or telemetry response. If the key is absent, invalid, or not configured, the engine proceeds directly from Decision 5 feedback to results as it does for legacy missions. A mission still has exactly five teacher decisions.

A terminal Decision 5 choice may select the configured closure after its normal feedback:

```js
{
  text: "FINAL TEACHER RESPONSE",
  score: 10,
  consequence: "FINAL SIMULATED CLASSROOM RESULT",
  wizard: "FINAL THEATRICAL REACTION",
  feedback: "FINAL BEHAVIORAL/BIP EXPLANATION",
  ending: "STRONG",
  meta: { /* descriptive choice metadata */ }
}
```

The skeleton illustrates structure only. Do not mechanically force `fidelityTargetKey` onto every step.

## 18. Structural Requirements

Require:

- every mission ID unique
- every step ID unique within the mission
- every `next` target exists
- every possible play-through contains exactly 5 decisions
- no accidental loops
- no unintended dead ends
- all 3 scores present at each decision
- branching actually changes state
- hints present
- feedback present
- wizard feedback present

## 19. Mission Quality Gate

This checklist is required:

- [ ] Opening makes the classroom easy to picture.
- [ ] Central tension is clear.
- [ ] All three choices are professionally plausible.
- [ ] Correct answer cannot be identified by length/tone alone.
- [ ] 5-point option is genuinely tempting.
- [ ] 0-point option is realistic rather than absurd.
- [ ] Every choice produces an observable modeled consequence.
- [ ] Consequences affect subsequent scenes.
- [ ] Teacher can recover after a mistake.
- [ ] Strong trajectory can still become challenging.
- [ ] Wizard feedback is memorable and nonjudgmental.
- [ ] Feedback explains mechanism/function/timing rather than only correctness.
- [ ] Consequences are plausible, not falsely deterministic.
- [ ] No unsupported procedure was invented.
- [ ] No unsupported crisis procedure was invented.
- [ ] Exact fidelity linkage is used only where exact.
- [ ] All fidelity target keys exist for the case.
- [ ] Every play-through contains exactly 5 decisions.
- [ ] All branches resolve.
- [ ] Scenario requires meaningful discrimination rather than ABA vocabulary recognition.
- [ ] Content contains no identifying information beyond approved research operational data.
- [ ] Reviewer wants to know “what happens next,” not merely “which answer was correct.”

## 20. Behavioral Review

Require:

- every 10 is supported by the source plan
- every 0 does not accidentally represent a required response
- every 5 has a defensible reason it is incomplete
- replacement behavior is modeled/reinforced appropriately
- function statements stay within the source plan
- consequences do not claim certainty
- safety boundaries are honored
- BIP wording/context is retained accurately

## 21. Privacy

Never commit real:

- BIP/BSP
- intake response
- teacher name/email
- student initials/name
- school
- participant-specific mission bank
- participant Resources content
- generated participant SQL/JSON

to public GitHub.

The repository contains:

- engine
- generic standards
- fictional examples
- validators
- schemas/migrations

Real individualized content belongs only in the approved private workflow and protected Supabase storage.
