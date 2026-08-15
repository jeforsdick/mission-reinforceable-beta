# FICTIONAL TRAINING CONTENT — NOT PARTICIPANT DATA

`CASE-999`, `MR-999`, Anna, every peer, and every classroom event in this document are fictional. This authoring draft is safe for public documentation; it is not participant data, a real BIP/BSP, or protected production content. It must be reviewed before any later translation into a protected game payload.

## Shared Fictional Source

Anna is a fictional kindergarten student whose behavior may include whining, tantrums, not following directions, hitting, throwing, or biting when adult attention is unavailable and attention often follows. The desired skills are asking for attention/help, breathing, waiting, following directions, and using a calm body and steady voice. The plan supports regular non-contingent attention, engaging independent activities, timers and advance reminders; explicit replacement prompts and calm practice; immediate specific praise, 1:1 attention, brief play, and snacks when appropriate; and calm, matter-of-fact minimization of attention to safe concern behavior with immediate replacement redirection.

Exact targets are narrower than general plan alignment: `proactive_01` = Give non-contingent attention; `teaching_01` = Prompt replacement behavior; `reinforcement_01` = Praise; `response_01` = Ignore.

# Daily Mission #2 — One More Minute

## Mission Design Card

- **Mission ID:** `CASE999_DAILY_02`
- **Mission type:** Daily
- **Routine / location:** Teacher-led small group during independent work
- **Central tension:** Anna initially asks appropriately, but you genuinely cannot give extended attention yet.
- **Function pressure:** Appropriate and escalated bids compete for limited adult attention.
- **Active BIP components:** Prevent, Teach, Reinforce, Respond
- **Exact fidelity opportunities:** D1 `reinforcement_01`; D2 none; D3 `teaching_01`; D4 `response_01`; D5 none
- **Emotional / narrative tone:** A ticking-clock puzzle in which quick calm can hide a costly contingency
- **Design goal:** Discriminate acknowledging and reinforcing an appropriate request, structuring a real delay, explicitly prompting a skill, and avoiding attention that makes escalation efficient.

Choice metadata uses **component · mechanism · error · function**. Every choice carries its consequence to the named next state.

## Cold Open / Decision 1 — The Setup

It is independent-writing time, and your horseshoe table is crowded with letter cards, dry-erase boards, and four children waiting to practice their names. Across the aisle, Anna has finished the first row of a picture-sort and is turning the final card between her fingers. Five minutes ago you gave her a quick check-in and showed her the two activities available.

Now Anna walks over with a calm body and says, “Can you come see mine?” The request is exactly the kind you want. Unfortunately, Maya has just uncapped a marker over her sleeve, Eli needs the next sound prompt, and leaving the table for a tour would stop the whole group. You can offer attention—but not much, and not yet.

**Exact fidelity target:** `reinforcement_01` — Praise

**Hint:** The request is already appropriate. Which response immediately tells Anna what she did well without promising more attention than you can deliver?

| Score | Teacher response | Modeled consequence | Wizard and behavioral explanation | Next |
|---|---|---|---|---|
| **10** | Say, “Nice job asking in a steady voice. I can look when this one-minute timer ends,” then start it. | Anna smiles at the named skill, sets the timer beside her sort, and returns to the last card. The group keeps its turn and you have made a bounded promise. | **Wizard:** “Request detected, praise delivered, clock engaged—the runway lights are ON!” Immediate specific praise reinforces the appropriate request; the timer supports the genuine delay. *Reinforce · specific praise plus bounded delay · none · attention.* | `D2_SUPPORTED` |
| **5** | Say warmly, “I will look in one minute,” start the timer, and give Anna a quick thumbs-up. | Anna returns to her work and watches the timer. Her appropriate bid receives acknowledgment and a credible path to attention, but the exact skill is not named in praise. | **Wizard:** “The request got a bridge and a friendly signal; its name never appeared on the marquee.” This genuinely supports and may reinforce the request, but it misses immediate specific praise. *Reinforce · acknowledgment/delayed attention · omitted specific praise · attention.* | `D2_WOBBLY` |
| **0** | Say, “I can’t look during group; go finish another activity,” and turn back to Eli without an acknowledgment or return point. | Anna stands with the sort for several seconds, then asks, “But when?” Her calm request has not produced praise, useful acknowledgment, or a workable route to later attention, and Eli watches the exchange stall. | **Wizard:** “The request knocked politely—and found a door with no handle.” The response protects group time but makes the appropriate request ineffective instead of reinforcing it. *Reinforce · dismissal/indefinite postponement · no reinforcement · attention.* | `D2_ESCALATED` |

## Decision 2 — The Pressure

**Exact fidelity target:** None. The scoring criterion integrates delayed attention, reassurance, waiting support, and honest follow-through rather than one atomic target.

### `D2_SUPPORTED`

Twenty seconds remain. Anna has placed the last card but calls softly, “Is it time?” Eli is halfway through writing his E, and interrupting his turn could cost the group’s momentum.

**Hint:** Reassurance can support a wait without becoming the wait’s main event.

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Briefly point to the timer, nod, and say, “You’re waiting; I’ll come when it rings,” then return to Eli. | Anna nods, traces a picture, and stays seated; Eli finishes his E. **Wizard:** “Tiny reassurance, sturdy boundary—the clock keeps the starring role.” The response acknowledges waiting without turning each check into extended attention. *Prevent · brief reassurance/timer · none · attention.* | `D3_SUPPORTED` |
| **5** | Say, “Almost! You’re doing fine,” each time Anna checks. | Anna remains calm but asks twice more, and your praise interrupts Eli’s next sound. **Wizard:** “Kind words multiplied into a side conversation.” Repeated reassurance helps right now but may make checking the route to attention. *Prevent · repeated reassurance · attention for checking · attention.* | `D3_WOBBLY` |
| **0** | Pause the group and begin asking Anna questions about her completed sort from your seat. | Anna carries the cards over and answers cheerfully; the timer rings during the conversation and the group waits. **Wizard:** “The timer finished, but waiting did not—the tour arrived early by remote control!” Extended attention precedes the promised boundary. *Reinforce · early remote attention · bypassed wait · attention.* | `D3_ESCALATED` |

### `D2_WOBBLY`

The timer is halfway done. Because the request was not praised, Anna stands beside it and repeats, “You said one minute,” with a slight whine. Two group members look toward her.

**Hint:** What can preserve the real delay while making successful waiting visible?

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Say once, “You asked appropriately and you’re waiting—thank you. Watch the red disappear,” then resume group. | Anna looks from you to the timer and sits. Peer attention returns to the letter cards. **Wizard:** “Late reinforcement catch! Not perfect timing, but the skill is back under the spotlight.” Specific praise plus the timer repairs the missed signal. *Reinforce · specific praise/wait support · delayed praise · attention.* | `D3_SUPPORTED` |
| **5** | Move the timer closer and say, “It really will ring soon.” | Anna studies it and quiets, though she keeps a hand raised toward you. **Wizard:** “The clock gained credibility; the replacement skill gained no applause.” This supports waiting but still omits praise for the request/calm body. *Prevent · timer/reassurance · missing reinforcement · attention.* | `D3_WOBBLY` |
| **0** | Restart the timer so Anna has a full minute of quiet waiting. | Anna says, “That’s not fair,” pushes two cards off her desk, and attracts peer commentary while your promise moves farther away. **Wizard:** “Time-loop trap! The finish line moved while Anna was running toward it.” Extending the stated delay undermines predictability and raises attention pressure. *Prevent · timer reset · broken contingency · attention.* | `D3_ESCALATED` |

### `D2_ESCALATED`

Without a useful return point, Anna stays beside the small group holding her sort and asks, “But when can you see it?” Maya is upset about her sleeve, two children begin talking at once, and the unanswered appropriate request has become a repeated bid. Protecting group time without a workable path back has increased both Anna’s uncertainty and your workload.

**Hint:** Recovery requires a clear limit and a doable way to wait—not a promise you cannot keep.

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Say, “I can’t stay now. You may bring the finished sort to the review tray, and I’ll give you one minute after this group,” then show that point on the visual schedule. | Anna hesitates, carries the sort, and chooses a puzzle near the table. You address Maya while keeping the promise visible. **Wizard:** “Boundary rebuilt—with a job, a landmark, and no imaginary free time!” Engaging work and a concrete delayed-attention promise support recovery. *Prevent · engaging activity/visual delay · none · attention.* | `D3_WOBBLY` |
| **5** | Let Anna sit beside the group as long as she stays quiet. | She settles and watches you, but abandons her independent activity and receives continuous proximity. The fifth group chair becomes crowded. **Wizard:** “Peace treaty signed; independence clause missing.” Proximity may reduce disruption but supplies sustained attention access rather than waiting practice. *Prevent · proximity accommodation · excessive access · attention.* | `D3_WOBBLY` |
| **0** | Promise to play with Anna as soon as you clean Maya’s sleeve, without defining how long. | Anna waits at your elbow, corrects peers’ answers, and asks whether cleanup is finished. The group’s attention repeatedly shifts to her. **Wizard:** “A giant promise balloon is now bouncing around a very small table.” The vague, valuable promise and proximity increase checks and workload. *Reinforce · vague play promise · unclear delay/overattention · attention.* | `D3_ESCALATED` |

## Decision 3 — The Pivot

**Exact fidelity target:** `teaching_01` — Prompt replacement behavior

### `D3_SUPPORTED`

The timer rings. Before you can stand, Eli spills the letter cards. Anna looks at the spill, takes a breath, and says only, “But it rang.” The delay has unexpectedly changed.

**Hint:** She needs language for a changed wait, not another silent timer.

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Prompt, “Ask, ‘Can you tell me how much longer?’” | Anna repeats it steadily. You answer, “Until the cards are in the box,” and she begins a nearby puzzle. **Wizard:** “Schedule twist translated into usable words!” The explicit prompt teaches a functional request for information/help during a changed wait. *Teach · explicit replacement prompt · none · attention.* | `D4_SUPPORTED` |
| **5** | Praise her breath and say, “One more minute,” while resetting the timer. | Anna accepts the reset but watches you closely; she has no language for future changes. **Wizard:** “Regulation rewarded, plot question unanswered.” Praise and timer are supported, but they miss the exact replacement prompt. *Reinforce · breathing praise/new timer · adjacent response · attention.* | `D4_WOBBLY` |
| **0** | Say, “I know, but you have to be flexible,” and continue gathering cards. | Anna repeats “It rang” louder and pushes the puzzle away; peers begin explaining flexibility to her. **Wizard:** “Abstract advice entered. Functional words did not.” The explanation adds attention without an actionable replacement. *Teach · general flexibility reminder · no replacement prompt · attention.* | `D4_ESCALATED` |

### `D3_WOBBLY`

Anna is near the group with her puzzle but raises her voice: “Help me! Help me!” She has the right function but not a steady delivery, and three children are still waiting for turns.

**Hint:** Shape the request into a form you can reinforce rather than answering the volume.

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Prompt, “Calm voice: ‘Can you help after the next turn?’” | Anna repeats the sentence, returns a puzzle piece, and watches the next turn. **Wizard:** “The message kept its purpose and lost the siren!” This explicitly prompts both an appropriate help request and bounded waiting. *Teach · calm functional-request prompt · none · attention.* | `D4_SUPPORTED` |
| **5** | Model two slow breaths, then silently point to the timer. | Anna copies one breath and her volume drops, but she asks “Help?” again without a clear timing response. **Wizard:** “Volume spell successful; communication quest still active.” Modeling and the timer support regulation and waiting, but the teacher never prompts a replacement response. *Teach · breathing model/wait cue · omitted replacement prompt · attention.* | `D4_WOBBLY` |
| **0** | Begin helping the puzzle while continuing to lead the group. | Anna quiets immediately and slides pieces to you. Your group pauses between every instruction while divided attention becomes the solution. **Wizard:** “Ohhh, sneaky trap. It worked—which is exactly the problem.” Immediate calm is purchased with help following the louder bid, potentially making escalation efficient. *Reinforce · immediate help · reinforces escalation route · attention.* | `D4_ESCALATED` |

### `D3_ESCALATED`

Anna is now beside your chair, repeating “Stay with me” and nudging the card box with her shoe. The cards remain contained; everyone is safe. The group watches the exchange.

**Hint:** Make the replacement response brief enough to use inside this crowded moment.

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Calmly prompt, “Say, ‘Attention after group, please,’” and point to the last name on the turn card. | Anna echoes the request, steps back from the box, and tracks the final turn. **Wizard:** “Recovery phrase deployed in a four-chair traffic jam!” The explicit attention request and visual endpoint give her a workable alternative. *Teach · attention-request prompt/visual endpoint · none · attention.* | `D4_WOBBLY` |
| **5** | Move the turn card into Anna’s view and model a slow breath without giving her words to use. | Anna moves her foot away from the box and copies the breath, but remains beside you asking when you will stay. **Wizard:** “The card box is safe; the attention question is still flashing.” The visual endpoint and model are useful, but the teacher does not prompt Anna to perform a replacement behavior. *Teach · visual endpoint/breathing model · omitted replacement prompt · attention.* | `D4_WOBBLY` |
| **0** | Explain why every child deserves equal teacher time. | Anna argues that she finished first; two peers add their own fairness claims and the group becomes a debate. **Wizard:** “The fairness tribunal is now in session—and it pays entirely in attention.” Lengthy explanation feeds the interaction and omits a replacement prompt. *Respond · fairness lecture · prolonged attention · attention.* | `D4_ESCALATED` |

## Decision 4 — The Consequence

**Exact fidelity target:** `response_01` — Ignore. In these safe scenes, this means minimizing attention to concern behavior and immediately redirecting to a replacement; it never means ignoring safety.

### `D4_SUPPORTED`

Anna used the prompted words. While you finish the last turn, she gives one theatrical whine—“This is taking foreeeever”—and looks directly at you. Her body and materials are safe.

**Hint:** Which response keeps the performance from earning a conversation while preserving the route that did work?

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Give no response to the whine; when Anna uses a steady voice to ask again, praise it and point to the final turn. | The stretched word ends without an audience. Anna tries the steady request and the last child writes. **Wizard:** “The drama echo faded; the clear signal got the encore.” Attention is minimized for safe whining and restored for the replacement. *Respond · ignore then reinforce replacement · none · attention.* | `D5_SUPPORTED` |
| **5** | Say once, “I hear you; waiting is hard,” then point to the turn card. | Anna stops the theatrical voice but asks for another update. The group continues with a small interruption. **Wizard:** “Compassionate, contained—and still a tiny attention receipt.” Brief reassurance is reasonable but gives the whine attention and does not immediately prompt. *Respond · brief reassurance · attention to concern behavior · attention.* | `D5_WOBBLY` |
| **0** | Move Anna’s chair next to yours for the final turn so she can manage the wait. | She quiets instantly and leans against the table, watching your face. Another child gives up a workspace and Anna’s louder bid has produced closer access. **Wizard:** “Instant calm unlocked the premium seat. That shortcut will remember.” Proximity contingent on whining may strengthen the concern behavior. *Respond · contingent proximity · reinforces concern behavior · attention.* | `D5_ESCALATED` |

### `D4_WOBBLY`

Anna waits through the next turn, then taps the table repeatedly and says, “Now? Now? Now?” The tapping is noisy but safe; peers begin copying the rhythm.

**Hint:** Lower the attention value of the noisy bid and make one calm request efficient.

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Do not comment on the tapping; briefly prompt “One steady ask,” then answer that request. | Anna stops tapping to say, “Is it my time?” You say, “After this name,” and the peer rhythm dissolves. **Wizard:** “The percussion section lost its audience; one clear line got through.” This minimizes attention to the safe concern behavior and redirects immediately. *Respond · ignore/replace · none · attention.* | `D5_SUPPORTED` |
| **5** | Slide a quiet fidget to Anna and continue teaching. | The tapping stops and Anna manipulates the fidget, but no replacement response is practiced. **Wizard:** “Noise solved; communication postponed.” An engaging item helps classroom regulation but does not complete the response sequence. *Prevent · engaging alternative · missing redirect · attention.* | `D5_WOBBLY` |
| **0** | Hold Anna’s hand and whisper updates until the turn ends. | Anna becomes calm and silent at once. Your prompts to the group slow, and the repeated bids have secured continuous one-to-one contact. **Wizard:** “Worked immediately—while the attention shortcut received a gold-plated upgrade.” The immediate-calm trap makes escalation an efficient route to sustained attention. *Respond · continuous reassurance/contact · reinforces concern behavior · attention.* | `D5_ESCALATED` |

### `D4_ESCALATED`

Anna pushes the puzzle tray away and cries, “Nobody helps me!” She is seated and safe, but the group and a passing aide both look over.

**Hint:** You can acknowledge an eventual functional request without building a long conversation around the cry.

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Keep a neutral expression, do not debate the claim, and prompt once, “Calm voice: ‘Help after group, please.’” | Anna sobs once, repeats the request, and pulls the tray back. The aide moves on and peers face their boards. **Wizard:** “The giant attention magnet powered down; the usable message stayed.” Safe concern behavior receives minimal attention while the replacement is immediately prompted. *Respond · ignore/redirect · none · attention.* | `D5_WOBBLY` |
| **5** | Say, “I will help after group,” and return to teaching. | Anna quiets somewhat but repeats, “Promise?” The interaction is short, though the cry directly earns reassurance. **Wizard:** “Boundary held, contingency blurred.” A concise limit is preferable to a lecture but still attends to concern behavior without a prompted replacement. *Respond · brief limit/reassurance · missed redirect · attention.* | `D5_WOBBLY` |
| **0** | Invite the aide to sit with Anna until you finish. | Anna calms, completes the puzzle with the aide, and smiles. Your group recovers—but the escalated statement has produced immediate one-to-one adult attention. **Wizard:** “The room got easier right now. The attention beacon got brighter for later.” The attractive staffing solution may strengthen the escalation route. *Respond · immediate delegated 1:1 attention · reinforces concern behavior · attention.* | `D5_ESCALATED` |

## Decision 5 — The Finish

**Exact fidelity target:** None; scoring integrates promise-keeping, praise, delayed attention, independence, and classroom feasibility.

### `D5_SUPPORTED`

The group’s final child writes her name and the promised attention window arrives. Anna is seated with a finished sort and says calmly, “Can you look now?” Cleanup begins in two minutes.

**Hint:** Delivering promised attention matters; so do its boundary and the transition that follows.

| Score | Teacher response | Consequence, Wizard, and explanation | Ending |
|---|---|---|---|
| **10** | Praise Anna’s asking and waiting, give a one-minute review, then preview cleanup. | Anna shows two favorite matches, accepts the transition reminder, and carries the sort to its shelf when time ends. **Wizard:** “Promise kept to the second—attention arrived because the skill worked!” This closes the delayed-attention contingency clearly. *Integrate · praise/bounded attention/reminder · none · attention.* | `STRONG` |
| **5** | Review the whole sort with Anna, then announce cleanup when finished. | Anna enjoys several minutes of attention and cooperates, but peers wait for the cleanup cue and your boundary expands. **Wizard:** “The promise landed with an oversized package.” Follow-through is good, but extended attention strains the routine and weakens the planned limit. *Integrate · extended promised attention · duration drift · attention.* | `MIXED` |
| **0** | Praise her waiting but say there is no longer time to look. | Anna’s smile drops; she says, “But you promised,” and holds the tray as peers clean. **Wizard:** “Praise without payoff—the quest contract just tore.” Praise alone cannot replace the promised reinforcer; failed follow-through may undermine future waiting. *Integrate · praise without attention · broken promise · attention.* | `FRAGILE` |

### `D5_WOBBLY`

The group ends with Anna quieter but still near your chair. She uses the practiced phrase: “Attention after group, please.” One minute remains before cleanup.

**Hint:** A late appropriate request can still create a strong finish if you reinforce it within a realistic limit.

| Score | Teacher response | Consequence, Wizard, and explanation | Ending |
|---|---|---|---|
| **10** | Specifically praise the request, set a one-minute timer, and let Anna choose a brief talk or puzzle help. | She chooses puzzle help, places the last piece, and cleans when the timer rings. The small group packs independently. **Wizard:** “Comeback window caught—brief, chosen, and earned by the replacement!” This reinforces recovery and makes the limit visible. *Integrate · praise/choice/bounded attention · none · attention.* | `STRONG` |
| **5** | Say, “Good asking; I’ll talk while I put these materials away.” | Anna follows you and chats while you clean. She gets delayed attention, but her independence and your workload remain tangled. **Wizard:** “The skill earned attention; the teacher sprouted a shadow.” This is reinforcing but misses an independent, clearly bounded finish. *Integrate · praise/divided attention · weak boundary · attention.* | `MIXED` |
| **0** | Ask Anna to wait until after cleanup without a timer or clear endpoint. | She asks “After which part?” and trails you from table to table as the room grows noisy. **Wizard:** “Another delay appeared with no shoreline.” A second vague wait after effort does not reinforce the functional request effectively. *Integrate · repeated unsupported delay · reinforcement missed · attention.* | `FRAGILE` |

### `D5_ESCALATED`

The immediate adult support has made Anna calm, but she now asks the aide to come to cleanup too. Your group is finishing and the aide needs to leave for another room.

**Hint:** Calm is part of the picture, not the whole picture. Can adult attention transfer back to an appropriate request and independence?

| Score | Teacher response | Consequence, Wizard, and explanation | Ending |
|---|---|---|---|
| **10** | Have the aide briefly praise Anna’s calm request, preview departure, and direct Anna to ask you for a one-minute check-in after she shelves the puzzle. | Anna asks you, shelves the tray, and receives the brief check-in while the aide exits. **Wizard:** “Attention rerouted from emergency express to skill-built local!” The sequence fades excess proximity, prompts a functional request, and reinforces following directions. *Integrate · transition/prompt/praise/delayed attention · none · attention.* | `STRONG` |
| **5** | Let the aide stay through cleanup, then praise Anna for cooperating. | Cleanup is smooth and Anna follows directions, but the aide misses the next-room start and escalation retains a long attention payoff. **Wizard:** “Beautiful cleanup scene; expensive ticket.” Praise is useful, yet extended 1:1 attention remains contingent on the difficult path. *Integrate · extended adult proximity/praise · overattention · attention.* | `MIXED` |
| **0** | Have the aide leave without preview and tell Anna she has had enough attention. | Anna grips the puzzle tray, protests, and refuses the shelf direction as peers line up. Your workload spikes again. **Wizard:** “The attention drawbridge snapped up with Anna still on it.” Abrupt withdrawal and frustration conflict with calm, matter-of-fact redirection. *Respond · abrupt withdrawal · frustrated limit/no replacement · attention.* | `FRAGILE` |

## Mission #2 Endings

- **`STRONG` — The Minute Means Something:** Anna experiences a credible delay, a usable replacement response, and attention that follows asking/waiting rather than escalation. The group completes its turns and the classroom enters cleanup with the promise intact. **Wizard:** “The clock was not the hero—you made the contingency keep time.”
- **`MIXED` — Calm, With a Cost:** Anna is calm and the task may even be complete, but extra proximity, loose duration, or divided teacher attention creates hidden workload. The scene works now without cleanly strengthening independence. **Wizard:** “Quest cleared in silver. Check the receipt before celebrating the shortcut.”
- **`FRAGILE` — The Moving Finish Line:** A broken promise, unsupported second delay, or abrupt withdrawal leaves Anna checking, protesting, or holding the routine in place. Earlier success remains available for tomorrow, but today’s ending does not make the desired route reliable. **Wizard:** “The timer rang; the learning signal did not.”

## Mission #2 Metadata Recommendation

```yaml
id: CASE999_DAILY_02
title: One More Minute
type: Daily
expectedSteps: 5
routine: independent work / teacher-led small group
functionPressure: [attention]
exactFidelityByDecision: {decision_1: reinforcement_01, decision_2: null, decision_3: teaching_01, decision_4: response_01, decision_5: null}
branchStates: [SUPPORTED, WOBBLY, ESCALATED]
endStates: [STRONG, MIXED, FRAGILE]
status: authoring-draft
productionEligible: false
```

# Daily Mission #3 — Cleanup Chorus

## Mission Design Card

- **Mission ID:** `CASE999_DAILY_03`
- **Mission type:** Daily
- **Routine / location:** End-of-center cleanup and transition to the rug
- **Central tension:** Whole-class noise and needs divide your attention exactly when Anna must stop a preferred center and transition.
- **Function pressure:** Adult attention becomes scarce and publicly visible during a demanding transition.
- **Active BIP components:** Prevent, Teach, Reinforce, Respond
- **Exact fidelity opportunities:** D1 `proactive_01`; D2 none; D3 `response_01`; D4 `reinforcement_01`; D5 none
- **Emotional / narrative tone:** A noisy ensemble in which the teacher must conduct without becoming Anna’s permanent duet partner
- **Design goal:** Discriminate a brief proactive connection and meaningful job from repeated explanation, extensive help, and proximity that make cleanup easy now but costly later.

Choice metadata uses **component · mechanism · error · function**.

## Cold Open / Decision 1 — The Setup

The center clock shows three minutes until cleanup. Wooden blocks knock softly into bins, the sensory table smells faintly of soap, and twenty kindergarten voices are beginning to climb. You are circulating with an advance reminder—“Three minutes, then materials away and meet at the rug”—while one child needs a stuck paint apron untied and another is searching for a missing puzzle piece.

Anna is still calmly arranging plastic animals into a long parade. She heard the class reminder and has not refused, whined, or asked for you. Still, she watches you untie the apron, then watches two classmates call your name. You know the room’s attention supply is about to shrink exactly when her transition demand arrives.

**Exact fidelity target:** `proactive_01` — Give non-contingent attention

**Hint:** Nothing has gone wrong. Which option offers a brief connection that Anna did not have to summon?

| Score | Teacher response | Modeled consequence | Wizard and behavioral explanation | Next |
|---|---|---|---|---|
| **10** | Pause for ten seconds and say, “I like your animal parade. In three minutes, I’ll need my bin-delivery captain,” then continue circulating. | Anna grins, shows you the lead elephant, and repeats “bin captain” while moving the animals closer to their tub. The apron is freed and your route continues. | **Wizard:** “A ten-second solo before the whole cleanup orchestra begins!” The brief attention is delivered before any concern behavior and pairs connection with an advance reminder/engaging job. *Prevent · non-contingent attention plus preview · none · attention.* | `D2_SUPPORTED` |
| **5** | Show Anna a three-minute visual timer and say, “Animals away when it rings.” | Anna watches the red field and lines up two more animals. She has clear transition information but continues tracking whom you help. | **Wizard:** “Excellent stage clock; missing opening note.” Timer and reminder are plan-aligned, but they do not satisfy the exact non-contingent-attention opportunity. *Prevent · timer/reminder · missed active ingredient · attention.* | `D2_WOBBLY` |
| **0** | Keep helping the children who are calling because Anna is calm, planning to check on her only if she asks or cleanup becomes difficult. | Anna watches you untie the apron and sort the markers, then quietly adds animals until the song begins. When the demand arrives, she is farther from cleanup and calls, “You didn’t come see mine!” as peers turn toward her. | **Wizard:** “Wait-and-see mode engaged—the calm moment passed without a connection.” The choice is understandable in a crowded room, but it provides no non-contingent attention and reserves attention for a later bid or problem. *Prevent · reactive wait-and-see · omitted proactive attention · attention.* | `D2_ESCALATED` |

## Decision 2 — The Pressure

**Exact fidelity target:** None. This decision discriminates transition support and meaningful engagement from adult-dependent cleanup; no exact target description alone governs it.

### `D2_SUPPORTED`

The cleanup song begins. Anna immediately carries the animal tub toward the shelf, but a peer has parked a block basket in her path. She looks at you, waiting, while three children ask where the glue belongs.

**Hint:** The job should increase participation, not require you to become the job’s permanent assistant.

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Point out a clear route around the basket and say, “Captain, deliver it, then choose one rug spot.” | Anna steers around the basket, shelves the tub, and heads toward the rug while you answer the glue question. **Wizard:** “One navigation cue, then the captain sailed solo!” The brief direction maintains the engaging role and independence. *Prevent · meaningful job/brief direction · none · attention.* | `D3_SUPPORTED` |
| **5** | Move the block basket yourself and walk with Anna to the shelf. | The tub arrives neatly and Anna stays calm, but two glue bottles land in a crayon bin while your attention travels with her. **Wizard:** “Route cleared—by the classroom’s busiest road crew.” Practical help works, though it supplies extra proximity and shifts workload. *Prevent · adult assistance · unnecessary proximity · attention.* | `D3_WOBBLY` |
| **0** | Take the heavy-looking tub from Anna and tell her to go to the rug. | Anna hands it over, then wanders back to the animal table instead of transitioning. You carry the tub while directing glue cleanup from across the room. **Wizard:** “Captain demoted; teacher promoted to pack mule.” Removing the meaningful job reduces engagement and creates more teacher work. *Prevent · adult completes job · independence removed · attention.* | `D3_ESCALATED` |

### `D2_WOBBLY`

The timer rings into the first line of the cleanup song. Anna covers it with her hand and says, “Not yet—I need the elephant at the end.” Peers are already brushing past with bins.

**Hint:** A short, concrete completion boundary can support transition without opening a repeated explanation loop.

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Say, “Place the elephant, then carry the animal tub to the shelf,” and gesture to the open route. | Anna places it, scoops the parade into the tub, and begins carrying. Two peers follow her example and start shelving. **Wizard:** “One last elephant became a bridge, not a new center period.” A bounded finish plus meaningful direction supports follow-through without prolonged attention. *Prevent · first-then boundary/engaging job · none · attention.* | `D3_SUPPORTED` |
| **5** | Explain that cleanup keeps the classroom safe and there will be animals tomorrow. | Anna listens, then asks whether the same elephant will be available. Cleanup continues around your stationary conversation. **Wizard:** “A thoughtful speech entered during the noisiest chorus.” Reassurance is caring but longer than needed and becomes attention during delay. *Prevent · transition explanation · excessive reassurance · attention.* | `D3_WOBBLY` |
| **0** | Give Anna another minute while you help everyone else begin cleanup. | She quietly completes the parade and looks pleased. When you return, most peers are at the rug and Anna has an entire center left to clean with your attention now available. | **Wizard:** “Peace now, private cleanup duet later—the delayed bill just arrived.” The exception makes waiting/refusal a route to exclusive help and increases transition workload. *Respond · delay/give-in · concern behavior gains later attention · attention.* | `D3_ESCALATED` |

### `D2_ESCALATED`

Because the calm window passed without a check-in, Anna waits until the song starts, then crosses the room, hooks her arm around yours, and says, “You didn’t look. You clean with me.” The apron remains stuck and marker sorting is going wrong across the room.

**Hint:** Recover by making your attention brief and the independent action concrete.

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Say, “I’ll put in two animals; you finish and deliver the tub as captain,” then leave after exactly two. | Anna watches you go, calls once, then begins sweeping animals into the tub. You free the apron and redirect the markers. **Wizard:** “Two-animal handoff! The duet became a solo with a clear downbeat.” Brief help plus an engaging role fades the unnecessary proximity. *Prevent · bounded help/meaningful job · none · attention.* | `D3_WOBBLY` |
| **5** | Keep cleaning beside Anna but ask her to put in more animals than you. | The center gets clean and Anna cooperates, yet she monitors every piece you add and the rest of the room loses your presence. **Wizard:** “Participation improved; teacher tether remains firmly knotted.” Shared cleanup is workable but sustains one-to-one attention. *Prevent · shared cleanup · excess adult involvement · attention.* | `D3_WOBBLY` |
| **0** | Finish the animal cleanup for Anna so you can both move on quickly. | Anna watches, then takes your hand toward the rug. The task is done fast, but the apron child calls again and Anna has completed neither cleanup nor transition independently. **Wizard:** “Speed record achieved; skill rehearsal missing from the scoreboard.” Extensive help makes immediate cleanup easy while deepening adult dependence. *Prevent · adult task completion · independence removed · attention.* | `D3_ESCALATED` |

## Decision 3 — The Pivot

**Exact fidelity target:** `response_01` — Ignore. Only safe whining/refusal is minimized; replacement direction remains available and no safety procedure is implied.

### `D3_SUPPORTED`

Anna shelves the tub, then sees you help a peer with spilled markers. She whines, “But I’m the captain—watch me!” and pauses in the walkway. She and others are safe, and she knows the next step is the rug.

**Hint:** Which response keeps safe whining from buying an audience and makes direction following the efficient route?

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Do not answer the whine; gesture toward the rug and, when Anna starts walking, briefly say, “You followed the rug direction.” | Anna waits a beat, then crosses to the rug. The marker spill receives your hands while her movement receives the only new attention. **Wizard:** “The whine sang to an empty balcony; direction following got the review!” This minimizes attention to safe whining and redirects/reinforces the desired behavior. *Respond · ignore/redirect · none · attention.* | `D4_SUPPORTED` |
| **5** | Say once, “I saw you, but I’m helping with a spill. Rug, please.” | Anna says “Okay” and walks slowly to the rug. Your brief reassurance prevents a long exchange but the whine still earns acknowledgment. **Wizard:** “Short solo, quick cutoff—not a disaster, not the cleanest cue.” Calm brevity helps, but does not fully minimize attention. *Respond · brief acknowledgment/direction · attention to whine · attention.* | `D4_WOBBLY` |
| **0** | Stop, praise the entire captain job, and walk Anna to her rug spot. | Anna brightens and arrives calmly beside you. The spill spreads under two shoes while the whining has produced rich praise and escorted attention. **Wizard:** “Gorgeous rug arrival; the attention spotlight followed the whine.” The attractive immediate success risks reinforcing the concern behavior. *Respond · contingent praise/escort · reinforces whine · attention.* | `D4_ESCALATED` |

### `D3_WOBBLY`

Anna carries the tub but drops to her knees beside the shelf and repeats, “I need you, I need you,” in a whine. The tub is stable, the aisle is clear, and peers step around her.

**Hint:** Keep the concern behavior small while opening one brief functional route.

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | With neutral affect, do not discuss the whine; prompt once, “Ask, ‘Help with the shelf, please,’” then honor the calm request briefly. | Anna repeats it, accepts ten seconds of help, and stands with the empty tub shelved. Peer traffic resumes. **Wizard:** “Static muted, clear request connected—cleanup frequency restored!” Attention is minimized for whining and delivered for the replacement. *Respond · ignore/prompt replacement · none · attention.* | `D4_SUPPORTED` |
| **5** | Say once, “I know you want me here; stand up and put it on the shelf,” in a calm voice. | Anna complies while still whining softly and then waits beside the shelf. The job finishes, but the whine receives a brief acknowledgment and no appropriate request is made available. **Wizard:** “Task complete; communication channel still fuzzy.” The response is calm and bounded, but it does not ignore the concern behavior or immediately redirect to a replacement. *Respond · brief acknowledgment/direction · missed ignore and redirect · attention.* | `D4_WOBBLY` |
| **0** | Kneel and repeatedly reassure Anna that you are not leaving her. | Anna stops whining, leans against you, and lets you shelve the tub. The class reaches the rug while you remain in a quiet one-to-one conversation. **Wizard:** “The volume vanished; the attention anchor dropped.” Repeated reassurance produces immediate calm but makes the concern behavior efficient. *Respond · repeated reassurance/proximity · reinforces concern behavior · attention.* | `D4_ESCALATED` |

### `D3_ESCALATED`

Most children are at the rug. Anna sits among the remaining animals, says “No cleanup,” and pushes the empty tub six inches away. No one is nearby and everyone is safe; your whole-class song is ending.

**Hint:** A refusal does not need a seminar. What response is low-attention and points straight to a usable action?

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Keep your tone neutral, do not debate “no,” and prompt, “Ask for help with the first two.” | Anna says, “Help first two.” You place two animals with her, then step away; she adds a third alone. **Wizard:** “Refusal monologue canceled; recovery line delivered!” The safe refusal receives minimal attention and the functional request receives brief support. *Respond · ignore/redirect to help request · none · attention.* | `D4_WOBBLY` |
| **5** | Say once, “I know you want more animal time. Animals in the tub, then rug,” and turn to cue the class. | Anna puts in one animal and watches you. The interaction stays brief, but her refusal receives acknowledgment and no help request is prompted. **Wizard:** “Boundary clean, bridge only half-built.” This is calm and concise, but it does not fully minimize attention to the concern behavior or redirect to a replacement request. *Respond · brief acknowledgment/first-then direction · missed ignore and redirect · attention.* | `D4_WOBBLY` |
| **0** | Sit beside Anna and explain each step until all animals are put away. | Anna follows your narrated directions and cleanup becomes orderly. The rug group waits through a long private interaction and Anna hands you every other animal. **Wizard:** “Cleanup easier right now—the deluxe narrated edition costs the whole class.” Extensive explanation/help rewards refusal with sustained attention. *Respond · repeated explanation/extensive help · reinforces refusal · attention.* | `D4_ESCALATED` |

## Decision 4 — The Consequence

**Exact fidelity target:** `reinforcement_01` — Praise

### `D4_SUPPORTED`

Anna arrives at the rug independently and sits with a calm body while you give the class its first direction. A peer squeezes into her preferred spot, but Anna shifts over without calling you.

**Hint:** The desired behavior is happening quietly in a noisy room. Name it before it disappears.

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Briefly say, “Anna, you came to the rug and moved over calmly—thank you.” | Anna looks up proudly, folds her hands, and attends to the class direction. Your praise takes seconds and peers remain settled. **Wizard:** “Quiet victory amplified at exactly the right moment!” Immediate specific praise targets following directions and calm behavior. *Reinforce · behavior-specific praise · none · attention.* | `D5_SUPPORTED` |
| **5** | Give Anna a silent thumbs-up while continuing the direction. | She smiles and stays seated, though what earned the signal is not explicit. **Wizard:** “A sparkle crossed the room; its label fell off.” The gesture may reinforce, but lacks the specificity of the praise target. *Reinforce · nonverbal approval · nonspecific reinforcement · attention.* | `D5_WOBBLY` |
| **0** | Continue the whole-class direction without acknowledging Anna’s transition or calm flexibility. | Anna begins looking over her shoulder for you while two peers continue talking. Her individual transition and flexibility pass without praise or another immediate reinforcer. **Wizard:** “The praise train passed the station without stopping.” The desired behavior receives no praise, so the exact reinforcement opportunity is missed. *Reinforce · no praise · omitted reinforcement · attention.* | `D5_ESCALATED` |

### `D4_WOBBLY`

After brief help, Anna places the last animal herself and walks toward the rug in a steady voice. The class is restless, and you are tempted to begin immediately.

**Hint:** Recovery behavior is worth marking even when the schedule is late.

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Say as she passes, “You asked for help, finished the animals, and walked calmly—strong recovery.” | Anna quickens toward the rug, chooses an open spot, and looks ready for the next cue. **Wizard:** “Three-part comeback combo, caught before the curtain!” Specific immediate praise reinforces replacement, completion, and calm transition. *Reinforce · recovery-specific praise · none · attention.* | `D5_SUPPORTED` |
| **5** | Wait until she sits and say, “Thanks for joining us.” | Anna settles, but the help request and independent finish are not identified. **Wizard:** “Welcome delivered; comeback details left backstage.” Praise is present but delayed and broad. *Reinforce · delayed general praise · weak timing/specificity · attention.* | `D5_WOBBLY` |
| **0** | Begin the rug activity without acknowledging Anna so lost time is not increased. | Anna stands at the rug edge and calls, “I cleaned!” You must pause anyway as peers turn to look. **Wizard:** “Saved two seconds, spent ten—the reinforcement window sent an invoice.” Omitting praise misses the recovery and may provoke another attention bid. *Reinforce · no acknowledgment · omitted reinforcement · attention.* | `D5_ESCALATED` |

### `D4_ESCALATED`

With extensive adult help, cleanup is finally done. Anna places one last animal in the tub by herself and uses a steady voice: “I’m ready for rug.” Your whole group is waiting.

**Hint:** Do not let the amount of help erase the one independent response you can strengthen now.

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Say immediately, “You put in the last animal yourself and told me calmly you’re ready,” then point to the rug. | Anna releases your hand, walks ahead, and sits. The class finally receives its next direction. **Wizard:** “Tiny independent note—massive amplification!” Specific praise makes the late replacement/independent behavior salient. *Reinforce · specific praise · none · attention.* | `D5_WOBBLY` |
| **5** | Hugely cheer, “Amazing cleanup!” and walk her to the rug. | Anna smiles and transitions, but the celebration implies the adult-assisted whole task—not her last independent act—earned attention. **Wizard:** “Fanfare magnificent; target blurry.” Praise is immediate but nonspecific and paired with more proximity. *Reinforce · enthusiastic general praise/escort · nonspecific/overattention · attention.* | `D5_WOBBLY` |
| **0** | Say, “Finally,” and hurry back to the rug. | Anna’s face tightens; she stays beside the shelf and repeats, “I did it myself.” The group watches the next attention bid form. **Wizard:** “Frustration leaked into the microphone.” The response misses praise and is not calm or matter-of-fact. *Respond · frustrated withdrawal · omitted reinforcement · attention.* | `D5_ESCALATED` |

## Decision 5 — The Finish

**Exact fidelity target:** None; the decision integrates advance reminder, meaningful participation, replacement skills, praise, and bounded attention.

### `D5_SUPPORTED`

The class is seated. Anna has followed directions and received specific praise. You need to pass out rhythm sticks, and she quietly asks, “Can I help you?” Several peers raise their hands too.

**Hint:** Honor the functional request without making adult access exclusive or unlimited.

| Score | Teacher response | Consequence, Wizard, and explanation | Ending |
|---|---|---|---|
| **10** | Praise the calm help request, assign Anna one row and another child the second, then preview where helpers sit. | Anna distributes her row, hands off the basket, and sits at the previewed spot. Peers see a fair, bounded job. **Wizard:** “Finale in harmony—request, role, handoff, sit!” The response reinforces the request and direction following without sustained exclusive attention. *Integrate · praise/shared meaningful job/reminder · none · attention.* | `STRONG` |
| **5** | Let Anna distribute all the sticks while you begin the song. | She is engaged and helpful, but remains beside you for the entire setup while peers wait for roles. **Wizard:** “Great helper, oversized solo.” The job supports participation but offers prolonged privileged access. *Integrate · extended meaningful job · excess proximity · attention.* | `MIXED` |
| **0** | Say there are too many volunteers and choose no helper. | Anna withdraws her hand, begins tapping the rug, and misses the opening direction. You distribute everything alone. **Wizard:** “Functional request declined; teacher workload wins the encore.” The appropriate bid receives neither praise nor an alternate bounded opportunity. *Integrate · request denied/no alternative · missed reinforcement · attention.* | `FRAGILE` |

### `D5_WOBBLY`

Anna reaches the rug after a recovery, but the preferred front spot is full. She asks steadily, “Can you help me find a place?” The class is noisy and ready to start.

**Hint:** Brief help can reinforce the request and end in independence; it need not become permanent seating support.

| Score | Teacher response | Consequence, Wizard, and explanation | Ending |
|---|---|---|---|
| **10** | Praise the calm help request, point out two available spots, and let Anna choose before starting. | Anna chooses beside Maya, sits without you, and joins the first motion. **Wizard:** “Help request answered with a choice—not a teacher-shaped seatbelt!” Brief attention reinforces the skill while returning control to the routine. *Integrate · praise/brief help/choice · none · attention.* | `STRONG` |
| **5** | Save a spot beside your chair and invite Anna there. | She sits calmly and participates, but checks your face throughout the song and gains sustained proximity. **Wizard:** “Smooth rug time, sticky attention boundary.” The accommodation works now but does not support independent waiting/participation. *Integrate · teacher proximity · dependency risk · attention.* | `MIXED` |
| **0** | Explain repeatedly that any rug spot works until Anna chooses one. | Anna debates the view from each spot while classmates wait and offer opinions. Your explanation becomes the center of the transition. **Wizard:** “The seating documentary now has six episodes.” Repeated explanation supplies extended attention rather than brief help. *Respond · repeated explanation · overattention · attention.* | `FRAGILE` |

### `D5_ESCALATED`

Anna stands at the rug edge saying, “You didn’t see me clean.” The class is waiting, but she is now using a steady voice and her body is calm. This is the last chance to change what pays off.

**Hint:** Acknowledge the recoverable skill, keep attention brief, and give the classroom a next action.

| Score | Teacher response | Consequence, Wizard, and explanation | Ending |
|---|---|---|---|
| **10** | Say, “You told me calmly. I saw your last animal go in; sit on a blue square and choose our first motion.” | Anna selects a square, announces “clap,” and joins the group. Your brief attention flows into participation rather than a private review. **Wizard:** “Final-bar recovery! Calm words became a whole-class contribution.” This reinforces the steady bid and redirects into an engaging, bounded role. *Integrate · specific acknowledgment/meaningful choice · none · attention.* | `STRONG` |
| **5** | Briefly review what Anna cleaned, then direct her to an open square. | Anna lists three animals, accepts your direction, and sits. The class starts late, but the interaction ends. **Wizard:** “Recovery achieved with an extra verse.” The response is calm and bounded enough, though it gives more retrospective attention than necessary. *Integrate · brief review/direction · excess attention · attention.* | `MIXED` |
| **0** | Tell Anna the class cannot wait any longer and start without her. | Anna remains standing, raises her voice to be heard over the song, and two peers turn around. You must conduct and manage the renewed bid at once. **Wizard:** “The orchestra started while one instrument was still tuning.” The appropriate steady bid is missed, and abrupt withdrawal loses the recovery opportunity. *Respond · abrupt dismissal · missed replacement reinforcement · attention.* | `FRAGILE` |

## Mission #3 Endings

- **`STRONG` — The Chorus Rejoins:** Whether Anna began as captain or recovered from a private cleanup trap, she enters the rug routine through a calm request, independent action, or bounded classroom job. Peers participate, teacher attention spreads again, and earlier mistakes do not control the finale. **Wizard:** “Every section is playing again—and attention is back in the whole-class mix.”
- **`MIXED` — A Successful Duet:** Materials are away and Anna is calm, but she stays beside you, holds the largest helper role, or needs an extra review. Cleanup succeeded today while teacher workload and adult dependence remain audible underneath. **Wizard:** “Lovely performance. Next rehearsal, hand Anna fewer measures of your part.”
- **`FRAGILE` — Cleanup Gets an Encore:** Anna or the class remains caught at the transition because a functional bid was missed, explanations multiplied, or independence disappeared. The room moves eventually, but attention scarcity has again become the loudest instrument. **Wizard:** “Curtain delayed. The next cue must be shorter, clearer, and easier to use.”

## Mission #3 Metadata Recommendation

```yaml
id: CASE999_DAILY_03
title: Cleanup Chorus
type: Daily
expectedSteps: 5
routine: end-of-center cleanup / transition to rug
functionPressure: [attention]
exactFidelityByDecision: {decision_1: proactive_01, decision_2: null, decision_3: response_01, decision_4: reinforcement_01, decision_5: null}
branchStates: [SUPPORTED, WOBBLY, ESCALATED]
endStates: [STRONG, MIXED, FRAGILE]
status: authoring-draft
productionEligible: false
```

# Cross-Mission Repetition Review

| Review dimension | Everyone Needs You | One More Minute | Cleanup Chorus | Result |
|---|---|---|---|---|
| Opening structure | Literacy centers; Anna silently displays a creation while another child reads. | Small-group writing; Anna begins with an appropriate spoken request during a genuine constraint. | Whole-class transition countdown; no request or concern behavior has occurred. | Distinct entry actions, demands, sensory details, and teacher workload. |
| Student escalation | Tower crash / scattered tiles and loud bids. | Checking, tapping, puzzle push, proximity, and group intrusion. | Delayed cleanup, sitting/refusal, adult tethering, and rug hesitation. | No mission relies on the same escalation sequence. |
| Correct-answer pattern | Prevent → Teach → Praise → Ignore → Integrate. | Praise → Integrate delay → Teach → Ignore → Integrate. | Prevent → Integrate transition → Ignore → Praise → Integrate. | Target order is not identical. |
| 5-point traps | Adjacent skill, vague praise, brief reassurance, excessive help. | Timer without praise, repeated reassurance, breathing instead of requesting, quiet fidget. | Timer without attention, practical help, concise direction, late/broad praise. | Traps overlap only where clinically natural; their scene function differs. |
| Wizard language | Beacons, portals, bridges, tower/quest imagery. | Clocks, runways, signals, receipts, moving finish lines. | Orchestra, captain, parade, chorus, stage imagery. | No repeated signature line within the authored missions. |
| Trajectory | Tower disruption can recover; supported tower route can lose ground. | Time/promise credibility and proximity reshape the route. | Independence, room-wide workload, and transition participation reshape the route. | All permit supported loss, escalated recovery, and strong late finishes without identical progression. |

The review found purposeful recurrence of plan components but no mechanical reuse of opening, escalation, choice order, branch progression, or Wizard motif. The missions do **not** all follow `Prevent → Teach → Praise → Ignore → Integrate`.

# Quality-Gate Table

| Mission | Primary discrimination | Exact targets used | Recovery path exists? | 5-point response genuinely tempting? | Immediate-calm trap present where appropriate? | Branches meaningfully diverge? | Unsupported procedures? | Ready for human review? |
|---|---|---|---|---|---|---|---|---|
| Everyone Needs You | Atomic fidelity actions versus generally kind attention during competing literacy needs | D1 `proactive_01`; D2 `teaching_01`; D3 `reinforcement_01`; D4 `response_01`; D5 none | Yes—every escalated incoming scene offers movement to wobbly/strong | Yes—timers, breathing, brief reassurance, and extensive help are useful but incomplete | Yes—staying at the tower produces immediate calm at D4 while strengthening the wrong contingency | Yes—tower/task status, peer attention, group work, intensity, and workload change | None | **Yes** |
| One More Minute | Credible delayed attention and promise-keeping versus fast calm through attention | D1 `reinforcement_01`; D2 none; D3 `teaching_01`; D4 `response_01`; D5 none | Yes—late requesting, bounded aid, and fulfilled attention can produce `STRONG` | Yes—acknowledgment without specific praise, proximity, breathing models, fidgets, and aide help plausibly solve immediate problems | Yes—D3 puzzle help and D4 handholding/aide attention visibly calm Anna while making escalation efficient | Yes—group progress, promise credibility, independent task, proximity, peer/aide attention, and workload change | None | **Yes** |
| Cleanup Chorus | Brief proactive connection and bounded participation versus adult-dependent transition help | D1 `proactive_01`; D2 none; D3 `response_01`; D4 `reinforcement_01`; D5 none | Yes—an escalated cleanup can end with independent rug participation | Yes—moving obstacles, extra cleanup time, shared cleanup, reassurance, and close seating ease the routine now | Yes—reassurance, escorted transition, and adult-completed cleanup yield calm/ease at a longer-term cost | Yes—materials, peer flow, classroom timing, teacher location, independence, and rug participation change | None | **Yes** |

## Exact-Link Audit

The audit applied the exact target description—not merely general BIP alignment—as the primary scoring criterion for every linked step. “Pass” means the 10 clearly implements the target, the 5 is useful but incomplete or weaker on the measured target, and the 0 does not implement or undermines it.

| Mission / linked decision | Exact target | 10 / 5 / 0 discrimination | Audit |
|---|---|---|---|
| Everyone Needs You D1 | `proactive_01` | Brief attention before behavior / timer only / no proactive attention | **Pass** |
| Everyone Needs You D2, all incoming states | `teaching_01` | Explicit replacement prompt / modeling, visuals, reassurance, or praise without prompting / no prompt or prolonged attention | **Pass** |
| Everyone Needs You D3, all incoming states | `reinforcement_01` | Immediate specific praise / vague or delayed praise / no praise | **Pass** |
| Everyone Needs You D4, all incoming states | `response_01` | Minimize attention to safe concern behavior and redirect / brief attention or incomplete redirection / sustained attention following concern behavior | **Pass** |
| One More Minute D1 | `reinforcement_01` | Immediate specific praise plus bounded delay / acknowledgment and credible delayed attention without specific praise / dismissal with no reinforcement or return point | **Pass** |
| One More Minute D3, all incoming states | `teaching_01` | Explicit functional replacement prompt / models and antecedent supports without prompting / help, explanation, or attention without a prompt | **Pass** |
| One More Minute D4, all incoming states | `response_01` | Minimize attention and redirect / brief reassurance or antecedent support / sustained or delegated attention following concern behavior | **Pass** |
| Cleanup Chorus D1 | `proactive_01` | Brief attention before behavior / timer and reminder only / reactive wait-and-see with no proactive attention | **Pass** |
| Cleanup Chorus D3, all incoming states | `response_01` | Minimize attention and redirect / brief acknowledgment/direction without ignoring or replacement prompt / rich attention following concern behavior | **Pass** |
| Cleanup Chorus D4, all incoming states | `reinforcement_01` | Immediate specific praise / nonverbal, broad, delayed, or nonspecific praise / no praise or frustrated withdrawal | **Pass** |

**Exact-link audit result: PASS.** No linked 0-point choice implements its measured target, and no choice is scored primarily on a different BIP component. Unlinked integration decisions remain unlinked rather than forcing target coverage.

All three authoring drafts pass the canonical structural, behavioral, and exact-link quality gates and are ready for **human review**, not production activation. Each route contains exactly five decisions, three plausible scored responses per decision, a hint, modeled consequences, Wizard feedback, behavioral explanation, and a complete ending. No crisis, punishment, response cost, restraint, blocking, physical-management, or other unsupported procedure is introduced.
