# FICTIONAL TRAINING CONTENT — NOT PARTICIPANT DATA

`CASE-999`, `MR-999`, Anna, every peer and adult, and every event below are fictional. This is public authoring documentation only—not participant data, a real BIP/BSP, protected game content, or a Supabase payload. It contains no real identifying information and must not be loaded into a production system without a separate protected-content review.

## Fictional Source of Truth

Anna is a fictional kindergarten student. The supported function is **adult attention**. Fictional concern behavior may include tantrums, whining, not following directions, hitting, throwing, biting, and undressing; inclusion here does not assert that each behavior occurs in this mission.

- **Prevent:** regular non-contingent attention; engaging independent activities; visual timers; advance reminders.
- **Teach:** ask for attention/help; wait appropriately; use a calm voice/body; use breathing when supported; explicitly prompt/model replacement responses.
- **Reinforce:** immediate specific praise; appropriate adult attention; brief adult play/interaction where supported.
- **Respond:** when behavior is safe, minimize attention to concern behavior; immediately redirect/prompt a replacement response; remain calm and matter-of-fact.
- **Exact fidelity targets:** `proactive_01` = Give non-contingent attention; `teaching_01` = Prompt replacement behavior; `reinforcement_01` = Praise; `response_01` = Ignore. Exact fidelity measurement is narrower than broad plan alignment.

## No Formal Crisis/Safety Plan

**This fictional BIP contains no formal crisis/safety plan.** This mission neither invents nor teaches restraint, physical blocking, seclusion, evacuation, physical management, removal, protective equipment, staff positioning, or crisis-response techniques. The playable story starts only after the high-intensity event and any immediate safety handling have ended.

# Crisis Mission #1 — The Room Goes Quiet

## Mission Design Card

- **Mission ID:** `CASE999_CRISIS_01`
- **Mission title:** The Room Goes Quiet
- **Mission type:** Crisis
- **Routine / location:** Classroom transition immediately after a high-intensity behavior episode has safely ended
- **Central tension:** Everyone is safe, but the teacher must help Anna recover while peers are watching, instruction has stopped, and there is strong pressure to lecture, reassure, process extensively, or give prolonged one-to-one attention.
- **Function pressure:** Adult attention is especially powerful immediately after the intense episode.
- **Active BIP components:** Respond / Teach / Reinforce / Prevent
- **Exact fidelity target opportunities:** D1 `response_01`; D2 `teaching_01`; D3 `reinforcement_01`; D4 `proactive_01`; D5 none
- **Emotional / narrative tone:** The boss battle is over; now the harder challenge is rebuilding the pathway without feeding the wrong portal.
- **Mission design goal:** Test whether the teacher can transition from an intense event back into calm, function-based implementation rather than allowing urgency, guilt, peer attention, or relief to change the contingency.
- **Instructional challenge:** Can the teacher recover the BIP pathway after a high-intensity event without making the event itself the most efficient route to adult attention?

Every choice below keeps **Consequence**, **Wizard**, **Feedback**, and **Meta** separate. Meta follows **BIP component · mechanism · error type · function**. Participant-facing choices may be shuffled; score and metadata, never authoring order, identify meaning. Each consequence changes at least two relevant dimensions and is a plausible modeled branch, not a guaranteed real-world prediction.

## Decision 1 — The Immediate Recovery

**Exact fidelity target:** `response_01` — Ignore. Here “Ignore” means minimizing attention to **safe, lower-level attention-maintained concern behavior** while remaining calm and immediately prompting a replacement. It never applies to injury, danger, safety-related distress, or a legitimate unmet need.

### `D1_START`

The cleanup song cuts off mid-note. During the busy transition, your attention had been pulled among several children; Anna’s bids intensified into yelling and throwing one lightweight classroom item. No one was injured. **Immediate safety needs were handled according to existing school procedures. Everyone is now safe.** Anna is physically safe, classmates are safe, and there is no active physical danger.

Now the room is unnaturally quiet. Your hands still feel shaky; peers are watching, the routine has stopped, and Anna whines, “Stay with me—you have to stay,” while calling your name again. These are safe, lower-level attention bids, not a safety signal or an unmet need. Adult attention has never felt more valuable, and every instinct says to make this moment feel resolved.

**Hint:** The smoke has cleared and needs are met. Which response keeps attention off the safe concern behavior while opening the replacement route immediately?

| Score | Teacher action | Consequence | Wizard | Feedback | Meta | Next |
|---|---|---|---|---|---|---|
| **10** | Keep your expression neutral toward the whining and promptly say once, “Use a calm voice and ask, ‘Can you check on me after directions?’” | Anna repeats the request more softly. You name the return point and step toward the waiting class; peer eyes begin to follow you instead of the repeated calls. | “The battle smoke gets no encore; a clean signal lights the rebuilding bridge!” | This minimizes attention to safe concern behavior, stays matter-of-fact, and immediately prompts an appropriate replacement response. It preserves access to attention through the supported route. | *Respond · minimize attention/immediate replacement prompt · none · attention* | `D2_SUPPORTED` |
| **5** | Say quietly, “I know that was a lot. I will talk with you after I restart the group,” then point to her seat. | Anna sits, but asks twice whether you really will return. The exchange is bounded, yet reassurance has followed the whining and no replacement response has been practiced. | “A caring lantern glows through the smoke, but the bridge signal is still missing.” | The response is calm and limits interaction, but it gives attention to the concern behavior and delays the immediate replacement prompt. | *Respond · brief reassurance/task redirect · delayed replacement prompt · attention* | `D2_WOBBLY` |
| **0** | Sit beside Anna and gently review what happened, reassuring her that you will stay until she feels ready to rejoin. | Anna quiets and begins answering your questions while the class waits and watches. Prolonged one-to-one attention now follows the intense episode and continuing complaints. | “The room is quiet—but the damaged portal just received a velvet waiting room.” | This compassionate post-incident processing supplies substantial, high-value attention after concern behavior and postpones the plan’s replacement pathway. | *Respond · extended reassurance/processing · contingent prolonged attention · attention* | `D2_ESCALATED` |

## Decision 2 — Rebuild the Signal

**Exact fidelity target:** `teaching_01` — Prompt replacement behavior

### `D2_SUPPORTED`

Anna sits with the return point in view and glances at you as you lift the direction cards. She has used the prompted phrase once, but the skill is not yet sturdy under the peers’ watchful silence. A child asks when cleanup will continue.

**Hint:** Which action requires Anna to perform a concise, functional signal rather than merely making waiting easier?

| Score | Teacher action | Consequence | Wizard | Feedback | Meta | Next |
|---|---|---|---|---|---|---|
| **10** | Prompt, “Ask, ‘Can I have a quick check after the first direction?’” and pause for Anna to say it. | Anna performs the request in a calm voice. You confirm the endpoint, peers turn toward the direction card, and Anna holds the usable signal for later. | “Bridge plank placed by the traveler herself—the signal can carry weight!” | This explicitly prompts Anna to perform an appropriate attention request with a credible wait. | *Teach · explicit attention-request prompt · none · attention* | `D3_SUPPORTED` |
| **5** | Show Anna a two-minute visual timer and say, “My check-in comes when this ends,” then begin the first direction. | Anna tracks the timer and remains seated while instruction restarts. Waiting becomes clearer, but she has not performed an attention or help request. | “The aftershock clock is excellent; the bridge still lacks a practiced call bell.” | The timer and endpoint are useful adjacent supports, but they do not elicit the measured replacement response. | *Prevent · visual timer/clear endpoint · replacement practice omitted · attention* | `D3_WOBBLY` |
| **0** | Give Anna the promised check-in now, answer her questions, and then tell her when the group will restart. | Anna receives focused help and stays near you as peers wait for directions. Appropriate attention is available, but no replacement practice was required to reach it. | “Help crossed the gap by royal carriage; the signal lesson stayed on the far bank.” | Immediate help is caring, yet it skips prompting the replacement behavior and keeps adult initiation central. | *Teach · immediate help/attention · omitted replacement prompt · attention* | `D3_ESCALATED` |

### `D2_WOBBLY`

Anna reaches her seat but continues watching you. When you face the class, she says, “Teacher, come here,” then lowers her voice without forming a clear request. Peers whisper about whether cleanup is over, and your promised later talk could easily become the only route forward.

**Hint:** What makes Anna actively rehearse the communication pathway now?

| Score | Teacher action | Consequence | Wizard | Feedback | Meta | Next |
|---|---|---|---|---|---|---|
| **10** | Prompt, “Say, ‘Can you help me after you give one direction?’” and wait for Anna to repeat it. | Anna says the full request and points to the direction card. You confirm it, begin the class cue, and her next access to you has a practiced route. | “Signal restored under aftershock pressure—the bridge has a handrail!” | The teacher explicitly prompts performance of a concise help request plus appropriate waiting. | *Teach · explicit help-request prompt · none · attention* | `D3_SUPPORTED` |
| **5** | Place a first-then card on Anna’s desk—“one group direction, then check-in”—and point to each picture. | Anna studies the sequence and waits through the first cue. The room gains structure, though Anna has not rehearsed what to say when she needs attention. | “A clear map survived the tremor; its speaking rune remains blank.” | A visual sequence and endpoint support waiting but do not elicit the exact replacement behavior. | *Prevent · visual sequence/endpoint · replacement practice omitted · attention* | `D3_WOBBLY` |
| **0** | Answer, “Yes, I’m here,” move beside Anna, and quietly solve what she wants before addressing the class. | Anna tells you several details while peer chatter grows and the group cue waits. Desired help arrives from the vague bid without functional-request practice. | “The damaged portal opened on an unfinished password.” | Providing help immediately is plausible under pressure, but it bypasses explicit replacement practice. | *Teach · immediate proximity/help · omitted replacement prompt · attention* | `D3_ESCALATED` |

### `D2_ESCALATED`

After the long conversation, Anna is calmer but keeps your sleeve-side position. As you rise, she says, “Don’t go—help me,” while the class begins talking again. The need for predictable attention is real; the prolonged access has not taught a concise way to obtain it.

**Hint:** Rebuild the signal without withholding legitimate help.

| Score | Teacher action | Consequence | Wizard | Feedback | Meta | Next |
|---|---|---|---|---|---|---|
| **10** | Prompt, “Say, ‘Help me start, then check back after the timer,’” and have Anna use the words before you briefly assist. | Anna repeats the request, accepts one start cue, and watches you set the timer. Adult proximity decreases while a functional route becomes available. | “From scorched stone to working bridge: ask, help, return!” | This explicitly prompts the replacement response, then honors the legitimate request with bounded support. | *Teach · explicit help/wait request prompt · none · attention* | `D3_WOBBLY` |
| **5** | Put a simple start card and timer on Anna’s desk, demonstrate the first task step, and point to your return time. | Anna starts the step and stops following your movement. Independence and predictability improve, but she never performs the attention/help request. | “Strong repair beams; no signal lantern installed.” | Task structure is genuinely useful recovery support without meeting the measured prompt-replacement target. | *Prevent · task model/visual timer · replacement practice omitted · attention* | `D3_WOBBLY` |
| **0** | Remain beside Anna to start the entire activity together, promising to leave only when she says she is ready. | Anna engages while you stay and asks you to handle each next step. The class waits longer, proximity stays high, and replacement practice remains unavailable. | “A beautiful bridge—carried everywhere by the guide.” | Extended help may produce calm but provides the desired attention without prompting an independent replacement response. | *Teach · prolonged guided help · replacement omitted/adult dependence · attention* | `D3_ESCALATED` |

## Decision 3 — Catch the Recovery

**Exact fidelity target:** `reinforcement_01` — Praise

### `D3_SUPPORTED`

Anna waits through the first direction, then says, “Can I have a quick check now?” in the practiced calm voice. The timing matches the endpoint. Several peers still glance over, and the next classroom direction is already on your tongue.

**Hint:** The bridge held. How do you mark exactly what made it hold?

| Score | Teacher action | Consequence | Wizard | Feedback | Meta | Next |
|---|---|---|---|---|---|---|
| **10** | Immediately say, “You waited and asked in a calm voice—that was strong asking,” then give the brief check. | Anna smiles, accepts the short interaction, and returns to the task. Peers orient to the next cue while the replacement behavior earns prompt attention. | “Specific praise seals the repaired plank before the spell residue cools!” | Immediate behavior-specific praise identifies waiting and calm asking, followed by appropriate brief adult attention. | *Reinforce · immediate specific praise/brief attention · none · attention* | `D4_SUPPORTED` |
| **5** | Smile, nod, and say, “Nice job,” before giving the brief check and moving on. | Anna returns to work and the class advances. The acknowledgment is genuine and timely, but the behavior that earned it remains unnamed. | “A warm victory flare—bright, but missing its label!” | Generic and partly nonverbal acknowledgment is weaker on the exact behavior-specific praise target. | *Reinforce · generic/nonverbal acknowledgment · nonspecific praise · attention* | `D4_WOBBLY` |
| **0** | Answer the task question efficiently, then praise the class for being ready for the next direction. | Anna receives help and starts working, but her request and waiting pass without praise. Peer focus shifts to the group rather than the recovery skill. | “The kingdom gets a banner; the repaired bridge gets no marker.” | The response does not punish recovery, but it omits praise for Anna’s relevant replacement behavior. | *Reinforce · task help/group praise · target recovery not praised · attention* | `D4_ESCALATED` |

### `D3_WOBBLY`

Anna watches the timer empty, takes a breath, and asks, “Can you check this, please?” Her voice is steady even though the earlier route was uneven. You have a brief chance to make this comeback more valuable than the concern behavior.

**Hint:** Which response makes the successful recovery unmistakable right now?

| Score | Teacher action | Consequence | Wizard | Feedback | Meta | Next |
|---|---|---|---|---|---|---|
| **10** | Immediately say, “You waited for the timer and asked calmly—excellent recovery,” then provide the brief check. | Anna relaxes, shows one item, and resumes independently after the bounded attention. Peer interest fades as ordinary instruction resumes. | “Comeback rune activated: precise praise, precise moment!” | This immediately names and reinforces the appropriate waiting and request, then delivers supported attention. | *Reinforce · immediate specific praise/brief attention · none · attention* | `D4_SUPPORTED` |
| **5** | Complete the group sentence, then return shortly and say, “Thank you for waiting,” while checking her work. | Anna remains seated and receives sincere praise plus attention, but the delay loosens the connection to her calm request. | “The message arrived intact—one portal beat late.” | The acknowledgment is behavior-relevant but delayed, making the exact contingency weaker. | *Reinforce · delayed specific praise · timing drift · attention* | `D4_WOBBLY` |
| **0** | Check the work, provide the next card, and continue the lesson without commenting on how Anna asked. | Anna follows the card but looks toward you again after you leave. The task progresses while the recovery behavior receives no praise. | “The map advances; the successful spell remains unrecorded.” | Useful instructional help is not punitive, but it omits reinforcement for the replacement response. | *Reinforce · task assistance only · praise omitted · attention* | `D4_ESCALATED` |

### `D3_ESCALATED`

With you still nearby, Anna eventually says, “Can I have a check after the timer?” and lets her hands rest on the desk. The request and calmer body are genuine recovery behaviors, even though the route consumed substantial adult time.

**Hint:** Do not wait for a perfect journey; identify the recovery behavior while it is happening.

| Score | Teacher action | Consequence | Wizard | Feedback | Meta | Next |
|---|---|---|---|---|---|---|
| **10** | Immediately say, “That was a calm request, and your body is ready to wait,” then provide a brief check and step away. | Anna watches the timer and stays at the desk as you return to the class. Specific praise creates a reinforcement opportunity and reduces prolonged proximity. | “Recovery bridge raised from the rubble—name the stones that held!” | Immediate specific praise identifies the plan-supported recovery behaviors and pairs them with brief appropriate attention. | *Reinforce · immediate specific praise/bounded attention · none · attention* | `D4_WOBBLY` |
| **5** | Give a warm thumbs-up, finish setting the timer, and quietly say, “Good,” before stepping away. | Anna remains seated and adult proximity decreases. The positive response is immediate but vague and largely nonverbal. | “A friendly spark crosses the bridge; its coordinates are fuzzy.” | Genuine acknowledgment supports recovery but does not specify the successful request or calm body. | *Reinforce · vague/nonverbal praise · insufficient specificity · attention* | `D4_WOBBLY` |
| **0** | Set the timer, tell the class, “Thank you all for waiting,” and move into the next direction. | Anna begins the task but receives no direct acknowledgment of her changed behavior. The class restarts while her reinforcement opportunity closes. | “The crowd receives the recovery medal; the key spell goes unnamed.” | Group praise is not punishment, but it misses Anna’s appropriate request and recovery behavior. | *Reinforce · class-directed praise · student recovery not praised · attention* | `D4_ESCALATED` |

## Decision 4 — Before You Turn Away Again

**Exact fidelity target:** `proactive_01` — Give non-contingent attention

### `D4_SUPPORTED`

Anna is working and the classroom rhythm is returning. You must turn away to lead the delayed cleanup directions, making your attention scarce again. She has not bid for attention; this is the narrow moment before the next demand on the repaired pathway.

**Hint:** Which action provides attention before Anna must bid and makes your return credible?

| Score | Teacher action | Consequence | Wizard | Feedback | Meta | Next |
|---|---|---|---|---|---|---|
| **10** | Briefly check in—“You’re back on your plan; I’m glad to see it. I’ll return after these two directions”—then turn to the group. | Anna looks at the two cards and continues working before making another bid. You restart instruction with lower monitoring demand and less peer attention on her. | “A supply cart crosses the bridge before anyone sends a distress raven!” | This gives brief non-contingent attention before a bid and provides a credible return point. | *Prevent · non-contingent attention/return point · none · attention* | `D5_SUPPORTED` |
| **5** | Give Anna a preferred independent sorting tray and show a timer for the end of the two directions. | Anna begins the engaging task and checks the timer once. Structure and independence improve, but no non-contingent attention check-in occurs. | “Excellent bridge materials delivered; the attention ration stayed in storage.” | The activity and timer are supported antecedent strategies, but they do not deliver the exact NCA target. | *Prevent · engaging activity/visual timer · adjacent support, no NCA · attention* | `D5_WOBBLY` |
| **0** | Restart the group immediately and rely on Anna to use her request if she needs attention. | The class finally moves, but Anna tracks your conversations and pauses her work. Teacher workload drops briefly while elapsed waiting and attention pressure rise. | “The map rolls forward with one bridge marked: CALL IF CRACKED.” | Requesting is useful, but relying on a bid misses proactive attention when scarcity is predictable. | *Prevent · reactive attention access · omitted NCA · attention* | `D5_ESCALATED` |

### `D4_WOBBLY`

Anna is settled enough to work, though she still glances up when peers call you. The group needs an immediate restart, and taking even ten seconds for one child feels unfair while everyone has waited. Anna has not made a new bid.

**Hint:** The room’s urgency is the trap. What happens before attention becomes scarce?

| Score | Teacher action | Consequence | Wizard | Feedback | Meta | Next |
|---|---|---|---|---|---|---|
| **10** | Offer a brief check-in—“I see you getting back on track. I’ll come back after the cleanup picture”—then address the class. | Anna nods toward the picture and starts independently. Adult proximity ends predictably, peer watching decreases, and you can lead the transition. | “Ten seconds of bridge repair prevents a full expedition later!” | The attention is non-contingent because it arrives before a new bid, and the return point keeps it bounded and credible. | *Prevent · non-contingent attention/advance return · none · attention* | `D5_SUPPORTED` |
| **5** | Assign Anna the clear job of matching cleanup cards to the board and set a short timer. | Anna takes the predictable role, peers follow the cards, and the routine restarts. She gains engagement and status but no direct proactive attention check-in. | “A sturdy job plank spans the gap; the exact attention rune is absent.” | A predictable, engaging job and timer are valid prevention supports without meeting the exact NCA target. | *Prevent · predictable job/visual timer · adjacent support, no NCA · attention* | `D5_WOBBLY` |
| **0** | Tell the whole class, “We need to get moving now,” and begin cleanup, planning to respond if Anna asks appropriately. | Peers rush to bins while Anna watches you help two children and stops matching her materials. Structure returns for the group, but attention access remains reactive. | “The kingdom marches; one damaged portal waits for another knock.” | The group response is understandable under pressure, yet it omits proactive attention before a known scarcity period. | *Prevent · immediate group restart · omitted NCA · attention* | `D5_ESCALATED` |

### `D4_ESCALATED`

The class has waited a long time. Anna is quiet with a task card, but her gaze follows you and her independent start is fragile. No new attention bid has occurred. Your strongest urge is to reclaim every lost second for the group.

**Hint:** Can a small, unearned check-in reduce later workload without reopening prolonged processing?

| Score | Teacher action | Consequence | Wizard | Feedback | Meta | Next |
|---|---|---|---|---|---|---|
| **10** | Give a five-second check-in—“I see you starting. I’ll be back when the cleanup song ends”—then begin the song. | Anna touches the task card and begins while you move away. A credible attention point becomes available before a bid, and the class regains its routine. | “A tiny repair spell steadies the whole bridge before the next aftershock!” | Brief NCA delivered before concern behavior supports recovery while bounding proximity with a credible return. | *Prevent · non-contingent attention/credible return · none · attention* | `D5_WOBBLY` |
| **5** | Offer an engaging contained puzzle and set a timer matching the cleanup song before returning to peers. | Anna opens the puzzle and stays at the desk while the class moves. Independent engagement rises, though direct non-contingent attention is absent. | “The portal receives a fine stabilizer—not the measured attention spell.” | This is a supported antecedent intervention but not the exact NCA opportunity. | *Prevent · engaging independent activity/timer · adjacent support, no NCA · attention* | `D5_WOBBLY` |
| **0** | Begin the song immediately, deciding Anna can call appropriately if the task becomes difficult. | Peers begin cleaning and Anna remains safe, but she leaves the task untouched and starts scanning for a moment to call you. Teacher demands and elapsed waiting accumulate. | “The song restarts while the attention bridge runs on emergency bells.” | This practical restart relies on future bids rather than providing planned non-contingent attention. | *Prevent · reactive request reliance · omitted NCA · attention* | `D5_ESCALATED` |

## Decision 5 — Re-entry

**Exact fidelity target:** None. This is an integrated plan-application decision, not an atomic fidelity opportunity.

### `D5_SUPPORTED`

The cleanup rhythm returns. Anna has a known check-in point and is ready to rejoin an ordinary table activity; peers are beginning to treat the interruption as finished. The final choice is not one atomic fidelity test—it must preserve dignity, predictability, appropriate attention, and growing independence.

**Hint:** Which re-entry restores ordinary life without erasing support or making the incident the class’s main story?

| Score | Teacher action | Consequence | Wizard | Feedback | Meta | Next |
|---|---|---|---|---|---|---|
| **10** | Quietly point Anna to her usual table choice, preview “sort, then brief check,” and lead the whole class into the same routine. | Anna joins peers, completes the first sort independently, and receives the ordinary brief check at the previewed point. The incident loses social center while structure and dignity remain. | “Map restored: ordinary roads, a marked return point, no grand incident monument!” | This integrates supported structure, bounded attention, predictability, and independence without publicly processing the episode. | *Integrate · structured ordinary re-entry/bounded check · none · attention* | `STRONG` |
| **5** | Seat Anna at the table nearest you and keep checking quietly while you lead the class activity. | Anna participates and peers move on, but she monitors your proximity and waits for repeated reassurance. Re-entry works at a higher ongoing adult cost. | “The bridge is open, though the guide still walks every traveler across.” | This preserves dignity and participation, but over-support and proximity weaken independence. | *Integrate · close-proximity re-entry · over-support/adult dependence · attention* | `MIXED` |
| **0** | Pause to privately finish a thorough feelings conversation with Anna while peers begin a flexible free-choice period. | Anna receives prolonged attention and the class disperses without a predictable shared re-entry. The incident remains central to teacher access and task structure dissolves. | “A private epilogue expands while the restored map blows off the table.” | Private processing avoids public shame, but unnecessary prolonged attention and reduced structure make re-entry fragile. | *Integrate · extended private processing/unstructured class · incident-centered attention · attention* | `FRAGILE` |

### `D5_WOBBLY`

The class is moving again, but Anna’s route is only partly stable. She is ready to enter the table routine and looks between a clear task card and your location. Peers are settling, giving you a short window to make recovery ordinary rather than ceremonial.

**Hint:** Choose a re-entry path that can survive when your attention shifts elsewhere.

| Score | Teacher action | Consequence | Wizard | Feedback | Meta | Next |
|---|---|---|---|---|---|---|
| **10** | Offer the same table choice as peers, preview the first step and return point, then circulate on the ordinary class route. | Anna begins beside peers and waits for your scheduled pass. Peer attention fades, the task advances, and adult proximity becomes ordinary rather than incident-driven. | “The repaired bridge rejoins the public road—steady, dignified, usable!” | Predictable ordinary participation plus a bounded return integrates the plan while supporting independence. | *Integrate · ordinary structured re-entry/predictable check · none · attention* | `STRONG` |
| **5** | Give Anna a separate but engaging activity beside your teaching spot until you are sure she is fully ready. | Anna works calmly and the class continues, though re-entry depends on staying close to you and apart from the usual task. | “Safe side path found; it still orbits the guide tower.” | The support is reasonable and engaging, but separation and proximity make it more adult-dependent than needed. | *Integrate · separate proximity-based activity · over-support/delayed ordinary re-entry · attention* | `MIXED` |
| **0** | Let Anna choose any activity for the rest of the transition while you focus exclusively on getting peers caught up. | Anna changes materials twice and begins watching you assist peers. Immediate workload falls, but predictability, task completion, and a workable attention route weaken. | “The map says ‘anywhere’; the damaged portal says ‘watch the wizard.’” | Flexibility sounds kind, yet removing structure and the credible check-in makes re-entry fragile. | *Integrate · unrestricted activity/teacher withdrawal · insufficient structure · attention* | `FRAGILE` |

### `D5_ESCALATED`

The routine is restarting, but Anna has not begun her task and watches every adult movement. Peers still remember the disruption, and you could easily keep Anna beside you for the remainder of class. A functional re-entry remains possible even from this pressured route.

**Hint:** Recovery is still available. What makes the next minutes ordinary, structured, and not dependent on constant proximity?

| Score | Teacher action | Consequence | Wizard | Feedback | Meta | Next |
|---|---|---|---|---|---|---|
| **10** | Quietly offer two plan-supported task choices, show “first step, then brief check,” and place Anna in the normal table rotation. | Anna chooses sorting, starts one step, and waits for the scheduled pass while peers resume their own work. Structure returns and peer attention recedes without a special post-incident program. | “ESCALATED to steady ground—the bridge reconnects to the ordinary map!” | This creates a dignified, predictable re-entry with engaging choice, bounded attention, and a route toward independence. | *Integrate · choice/visual sequence/ordinary check · none · attention* | `STRONG` |
| **5** | Keep Anna as your helper beside you through the first activity, then plan to fade her into a table later. | Anna completes useful jobs and the class progresses, but she remains continuously near adult attention and independent re-entry is postponed. | “The helper road moves forward, tethered to the guide’s cloak.” | A clear role is workable, yet extended proximity makes recovery more adult-dependent than necessary. | *Integrate · prolonged helper proximity · over-support/delayed independence · attention* | `MIXED` |
| **0** | Begin a quiet one-to-one debrief at the side table while another adult starts a loosely structured class choice time. | Anna talks calmly with you as peers select activities and continue glancing over. The incident remains socially central and prolonged attention follows the pressured route. | “The boss-battle credits keep rolling; the ordinary map never reloads.” | The response is caring and private, not punitive, but it preserves incident-centered attention and fails to build a workable re-entry path. | *Integrate · extended debrief/loose re-entry · incident-centered prolonged attention · attention* | `FRAGILE` |


## Endings

- **`STRONG` — The Ordinary Map Restored:** Anna returns to ordinary instruction with predictable, bounded attention and usable independence. Peers and teacher resume the classroom routine; success means the function-based pathway recovered, not merely that the room became quiet. **Wizard:** “The smoke cleared, the bridge held, and the map leads back to everyday learning.”
- **`MIXED` — Bridge Open, Guide Required:** The classroom resumes and Anna participates, but adult proximity or extra support still carries too much of the route. The pathway is usable yet needs deliberate fading and more independence. **Wizard:** “Passage restored—with scaffolding still humming under every plank.”
- **`FRAGILE` — Quiet, Portal Unrepaired:** The visible disruption has ended, but prolonged incident attention or missing structure leaves the attention pathway unclear. Quiet is not mistaken for successful implementation. **Wizard:** “The spell residue settled; the map still points too strongly toward the incident.”

## Metadata Recommendation

```yaml
id: CASE999_CRISIS_01
title: The Room Goes Quiet
type: Crisis
expectedSteps: 5
start: D1_START
routine: classroom transition after a safely ended high-intensity episode
functionPressure: [attention]
activeBipComponents: [Respond, Teach, Reinforce, Prevent]
exactFidelityByDecision:
  decision_1: response_01
  decision_2: teaching_01
  decision_3: reinforcement_01
  decision_4: proactive_01
  decision_5: null
branchStates: [SUPPORTED, WOBBLY, ESCALATED]
endStates: [STRONG, MIXED, FRAGILE]
fictional: true
protectedContent: false
```

No database UUID, participant identifier, protected payload, Supabase write, or game-code representation is recommended or included.

## Exact-Link Audit

| Decision | Exact key | Defensible discrimination | Result |
|---|---|---|---|
| D1 | `response_01` | The 10 minimizes attention to safe concern behavior and immediately prompts replacement; 5 partly attends/delays; 0 supplies extended attention. | Pass |
| D2 | `teaching_01` | The 10 explicitly elicits a performed request; 5 supplies adjacent structure without cueing/modeling ask/wait; 0 gives help without practice. | Pass |
| D3 | `reinforcement_01` | The 10 gives immediate behavior-specific praise; 5 is vague, delayed, or nonverbal; 0 omits target praise without punishing recovery. | Pass |
| D4 | `proactive_01` | The 10 gives attention before a bid; 5 uses a supported antecedent strategy without NCA; 0 relies on a later request. | Pass |
| D5 | none | Re-entry integrates several strategies, so no single exact fidelity target defensibly governs scoring. | Pass |

No linkage was forced, and fidelity linkage belongs to each decision step rather than its choices.

## Crisis Safety Boundary Audit

- **Pass — no active-danger choice:** No player choice occurs during active physical danger; playable action starts after the episode and safety response have ended.
- **Pass — explicit safety before D1:** The cold open states that Anna is safe, classmates are safe, and there is no active physical danger.
- **Pass — constrained safety wording:** Immediate handling appears only as: **“Immediate safety needs were handled according to existing school procedures. Everyone is now safe.”**
- **Pass — no unsupported procedures:** No restraint, blocking, physical management, evacuation procedure, seclusion, removal procedure, protective equipment, staff positioning, or crisis-response technique is taught.
- **Pass — no invented plan:** The document explicitly says the fictional BIP has no formal crisis/safety plan and invents none.
- **Pass — legitimate needs remain eligible for help:** No injury, danger, safety-related distress, or legitimate unmet need is scored as something to ignore.
- **Pass — D1 scope:** `response_01` applies only after safety is established and only to safe, lower-level attention-maintained complaints, whining, name-calling, or demands for continued proximity; the 10 immediately opens an appropriate request route.
- **Pass — depiction boundary:** The antecedent mentions yelling and one lightweight item thrown, with no injury; it does not depict or ask the player to select a physical safety action.

## Cross-Bank Diversity Review: Daily #1–#5 and Mystery #1

| Dimension | Existing bank pattern reviewed | Crisis #1 distinction / revision applied |
|---|---|---|
| Opening intensity | Daily missions open in ordinary recurring routines; Mystery #1 opens with a safe unexpected room move before escalation. | Opens after a brief high-intensity episode has safely ended, with silence, disrupted instruction, peer observation, and explicit post-safety wording. |
| Teacher emotional pressure | Daily pressure centers on normal competing demands; Mystery pressure centers on unfamiliar logistics. | Adds the teacher’s physical/emotional aftershock, relief, guilt-driven reassurance pressure, and urgent desire to restart the whole room. |
| Target order | Daily and Mystery missions vary opportunities; Mystery #1 uses Prevent, integrated, Teach, Respond, Reinforce. | Uses the required recovery sequence Respond → Teach → Reinforce → Prevent → integrated re-entry. |
| Student trajectory | Other missions generally move from baseline through prevention/generalization challenges. | Begins after intensity, continues with only safe lower-level bids, and measures recovery of the pathway rather than prevention of an initial event. |
| Five-point traps | Existing traps include adjacent visuals, vague prompts, delayed praise, and proximity. | Revises each trap for post-incident pressure: bounded reassurance at D1, structure without elicitation at D2, weakly marked comeback at D3, antecedent support without NCA at D4, and dignified but proximity-dependent re-entry at D5. |
| Wizard motif | Daily motifs emphasize routine quests; Mystery #1 uses a moved map/portal travel motif. | Uses smoke clearing, aftershocks, spell residue, bridge rebuilding, damaged portals, and map restoration; “boss battle” labels the situation only, never Anna. |
| Branch structure | Existing banks use recoverable three-state trajectories. | Preserves 13 scenes while making `ESCALATED → WOBBLY → SUPPORTED → STRONG` possible and allowing later drift from supported routes to fragile outcomes. |
| Ending discrimination | Other endings often emphasize settled routines plus target performance. | Distinguishes recovered function-based access and independence from mere quiet, ongoing adult dependence, or incident-centered attention. |

These revisions make Crisis #1 a post-intensity recovery/re-entry challenge rather than a Daily or Mystery scenario with louder behavior.

## Canonical Quality-Gate Review

- **Source and privacy:** Fictional source of truth only; approved alias used; no real identifying information, protected content, or database payload.
- **Five-beat story:** Every route contains D1 through D5 exactly once, followed by a non-scored ending; no loop or sixth decision exists.
- **Rich scenes and agency:** The opening is a second-person narrative cold open; later incoming-state scenes carry intensity, peer attention, workload, proximity, task, independence, reinforcement, or waiting consequences forward.
- **Choice quality:** Every scene has three similarly warm, professional, plausible actions scored exactly 10/5/0. Correctness turns on timing, function, contingency, and active ingredients—not a calm tone or conspicuous harshness.
- **Feedback contract:** Every choice separately states modeled consequence first, Wizard reaction, behavioral feedback, metadata, and next destination.
- **Modeled consequence safety:** Consequences are branch-specific plausible simulation outcomes and are not represented as guaranteed predictions.
- **Hints:** Each hint directs attention to the relevant discrimination without naming a score or copying the correct action.
- **Wizard:** High-pressure fantasy language is dramatic but non-shaming; battle imagery refers to the situation/implementation challenge, never the child.
- **Exact linkage:** D1 `response_01`; D2 `teaching_01`; D3 `reinforcement_01`; D4 `proactive_01`; D5 none.
- **Crisis safeguard:** The dedicated audit above confirms play begins after safety is restored and teaches no unsupported crisis/safety procedure.
- **Endings:** STRONG, MIXED, and FRAGILE describe recovery quality, classroom state, independence, and attention contingencies—not quiet alone.

## Structural Validation Ledger

| Check | Result |
|---|---|
| Crisis missions in this document | 1 |
| Scored decisions on every route | 5 |
| Decision-step scenes | 13 (`1 + 3 + 3 + 3 + 3`) |
| Choices | 39 (`13 × 3`) |
| Choices per scene | 3 |
| Score set per scene | Exactly one 10, one 5, and one 0 |
| Possible score-choice routes | 243 (`3^5`) |
| Branch resolution | No unresolved branches; all D1–D4 choices advance one decision |
| Graph shape | Acyclic; no loops; no sixth decision |
| D5 destinations | Every choice resolves to STRONG, MIXED, or FRAGILE |
| Fidelity map | D1 `response_01`; D2 `teaching_01`; D3 `reinforcement_01`; D4 `proactive_01`; D5 none |
| Safety and privacy | No unsupported safety procedure; no real identifying information |

### Route examples

- Recovery remains possible: `D1_ESCALATED` outcome → `D2_ESCALATED` → choose 10 → `D3_WOBBLY` → choose 10 → `D4_SUPPORTED` → choose 10 → `D5_SUPPORTED` → choose 10 → `STRONG`.
- Later drift remains possible: `D1_SUPPORTED` outcome → `D2_SUPPORTED` → choose 10 → `D3_SUPPORTED` → choose 0 → `D4_ESCALATED` → choose 0 → `D5_ESCALATED` → choose 0 → `FRAGILE`.

The route count is the Cartesian set of three choices at each of five decisions (`3 × 3 × 3 × 3 × 3 = 243`), even when multiple histories intentionally converge on the same trajectory scene.
