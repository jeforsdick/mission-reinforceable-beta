# FICTIONAL TRAINING CONTENT — NOT PARTICIPANT DATA

`CASE-999`, `MR-999`, Anna, the peers, and all classroom events below are fictional. This is public authoring documentation, not participant data, a real BIP/BSP, or a production payload.

## Fictional Source of Truth

Anna is a fictional kindergarten student. The supported function is **adult attention**. Prevention includes regular non-contingent attention, engaging independent activities, visual timers, and advance reminders. Teaching includes asking for attention/help, deep breathing, appropriate waiting, scripted/modelled replacement responses, and calm practice. Reinforcement includes immediate specific praise, adult attention, brief adult play, and appropriate preferred items/snacks where supported. Response means minimizing attention to behaviors of concern when safe, immediately redirecting toward replacement behavior, and remaining calm and matter-of-fact.

Exact targets are: `proactive_01` = Give non-contingent attention; `teaching_01` = Prompt replacement behavior; `reinforcement_01` = Praise; `response_01` = Ignore. Exact measurement takes priority over coverage.

# Daily Mission #4 — The Story That Cannot Wait

## Mission Design Card

- **Mission ID:** `CASE999_DAILY_04`
- **Mission type:** Daily
- **Routine / location:** Whole-group read-aloud / morning meeting
- **Central tension:** Anna has real, exciting news while you must preserve a shared story, make appropriate requesting worthwhile, and teach a usable wait without turning interruption into the fastest route to conversation.
- **Function pressure:** One teacher's attention is public and scarce; peers amplify bids.
- **Active BIP components:** Teach, Reinforce, Respond; Prevent appears as general support but is not measured here.
- **Exact fidelity opportunities:** D1 none; D2 `teaching_01`; D3 `response_01`; D4 `reinforcement_01`; D5 none
- **Emotional / narrative tone:** A story-within-a-story, with the class book repeatedly competing against Anna's news
- **Mission design goal:** Distinguish acknowledging a functional request from opening a conversation, ignoring safe interruption rather than ignoring Anna, and praising demonstrated waiting rather than mere silence.

Choice metadata uses **component · mechanism · error · function**. Each named next state changes at least two of student intensity, replacement availability, peer involvement, routine progress, and teacher workload.

## Cold Open / Decision 1 — The Setup

Morning meeting has reached the page where a paper moon unfolds from the book. Nineteen children lean toward it; the rug smells faintly of tempera paint from yesterday. You are holding the book open and tracking a second child whose untied shoe has become a neighbor's concern. Anna has raised her hand three times, quietly and correctly, while bouncing in place. When you nod, she whispers, “I have something amazing about my grandma's puppy.” The news is genuine, her request is appropriate, and every face will follow yours if you invite the story. Another student simultaneously holds up a torn name card and asks for help.

**Exact fidelity target:** None. This step integrates acknowledgment, bounded attention, and routine preservation; no atomic target alone governs scoring.

**Hint:** Can the appropriate bid work without making the whole personal story available right now?

| Score | Teacher response | Modeled consequence, Wizard, and behavioral explanation | Next |
|---|---|---|---|
| **10** | Briefly say, “I want to hear the puppy news. Tell me after the book; keep your hand in your lap until the moon page ends,” and mark her turn with a small talk card. | Anna grips the card, lowers her hand, and looks back at the moon; you repair the peer's card without surrendering the page. **Wizard:** “A story reservation—confirmed, bounded, and not boarding yet!” Her appropriate bid receives useful acknowledgment and a concrete waiting response, while extended attention remains delayed. *Integrate · acknowledgment/observable wait cue · none · attention.* | `D2_SUPPORTED` |
| **5** | Smile and say, “I see your hand; please wait until the story is over,” then continue reading. | Anna lowers her hand, but raises it again at the next sentence and mouths “puppy.” The class story continues, though she lacks a usable action or visible turn marker. **Wizard:** “Kind boundary posted; waiting instructions still written in invisible ink.” This acknowledges her but gives only a broad delay. *Teach · general wait direction · underspecified replacement · attention.* | `D2_WOBBLY` |
| **0** | Quietly let Anna tell the story “really fast” while everyone looks at the moon picture. | Anna delivers two delighted sentences and sits calm; two peers immediately raise hands to share pet news and the torn-card student calls louder. **Wizard:** “The room got peaceful for one heartbeat—and interruption found the express lane.” Listening is kind and genuinely attentive, but here the extended conversation follows repeated hand bids during instruction rather than a completed wait, making interruption efficient. *Reinforce · immediate extended conversation · timing/contingency drift · attention.* | `D2_ESCALATED` |

## Decision 2 — The Pressure

**Exact fidelity target:** `teaching_01` — Prompt replacement behavior.

### `D2_SUPPORTED`

Halfway through the next page, Anna holds the talk card up and whispers your name twice. She is calm, but the card has become another bid; a peer whispers, “Stop.”

**Hint:** Give Anna something observable to do during the wait, not merely another reason to wait.

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Prompt, “Put the card on your knee and show waiting by looking at the pictures.” | Anna repeats, “Card on knee,” places it, and turns to the page; the peer faces front. **Wizard:** “Waiting just acquired hands, eyes, and a job!” This explicitly prompts an appropriate waiting response. *Teach · explicit waiting prompt · none · attention.* | `D3_SUPPORTED` |
| **5** | Point to the final-page sticky note and continue reading. | Anna follows your point and quiets, but keeps the card at shoulder height. **Wizard:** “Destination visible; travel move not taught.” The visual supports delay but does not prompt Anna to perform a replacement behavior. *Prevent · visual endpoint · omitted prompt · attention.* | `D3_WOBBLY` |
| **0** | Whisper, “You already know how to wait,” and resume the sentence. | Anna says, “But I am waiting!” and the peer corrects her; three children miss the next line. **Wizard:** “A knowledge quiz appeared where a usable cue belonged.” The reminder neither prompts a specific replacement nor reduces the attention exchange. *Teach · vague correction · no replacement prompt · attention.* | `D3_ESCALATED` |

### `D2_WOBBLY`

Anna raises her hand again and says, “Is it over after this page?” Her voice is audible across the rug; several children answer for you.

**Hint:** Preserve the useful question while shaping how she asks and waits.

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Prompt quietly, “Ask, ‘When is my turn?’ then hands folded while I answer.” | Anna repeats the question; you point to the ending marker and she folds her hands. Peer answers stop. **Wizard:** “Question refined; waiting mode activated!” The prompt supplies functional words and an action. *Teach · explicit attention/wait prompt · none · attention.* | `D3_SUPPORTED` |
| **5** | Answer, “After the last page,” and point to the page count. | Anna nods and counts pages under her breath, but she asks again when you turn one. **Wizard:** “Accurate map, no practiced route.” Information is useful but is not a replacement-behavior prompt. *Prevent · clear endpoint · omitted prompt · attention.* | `D3_WOBBLY` |
| **0** | Ask the class to remind Anna of the meeting rule. | A chorus says, “Raise your hand!” Anna protests that she did, and the read-aloud becomes public correction. **Wizard:** “The audience became the lesson—and paid in attention.” This creates more attention without prompting the needed wait/request. *Respond · peer correction · public attention/no prompt · attention.* | `D3_ESCALATED` |

### `D2_ESCALATED`

Now six hands advertise pet stories. Anna moves closer and says, “Mine is the best one.” The book remains open, but the group plot has stopped.

**Hint:** Recovery needs one brief response Anna can use even inside a noisy group.

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Prompt, “Say, ‘Please save me a turn,’ then return to your rug spot.” | Anna repeats the line and steps back; you place her talk card by the book and restart the page. Other hands begin to lower. **Wizard:** “One sentence zipped the side story and reopened the main plot!” This explicitly prompts a functional request and return response. *Teach · scripted replacement prompt · none · attention.* | `D3_WOBBLY` |
| **5** | Model one breath and gesture toward Anna's rug spot. | She breathes and steps back, but asks, “Will you really listen?” before sitting. **Wizard:** “Body reset; communication still buffering.” Modeling regulation is supported but does not prompt the replacement request. *Teach · breathing model/gesture · adjacent skill only · attention.* | `D3_WOBBLY` |
| **0** | Explain why everyone cannot share during the book. | Anna counters with details about why her story is short; peers negotiate their own exceptions. **Wizard:** “The explanation appendix has swallowed the chapter.” Extended discussion supplies attention and no replacement prompt. *Respond · group lecture · prolonged attention/no prompt · attention.* | `D3_ESCALATED` |

## Decision 3 — The Pivot

**Exact fidelity target:** `response_01` — Ignore. In these explicitly safe scenes, this means minimizing attention to concern behavior and immediately redirecting toward a replacement, never ignoring the child or safety.

### `D3_SUPPORTED`

Anna watches two pages successfully. Then she stage-whispers, “Her name is Pickles!” and scans the rug for reactions. Her body and everyone nearby are safe.

**Hint:** Make the call-out inefficient while keeping the saved-turn route alive.

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Do not react to “Pickles”; point once to the talk card and quietly prompt, “Save it for your turn,” then read on. | The giggles fade, Anna touches the card and returns her eyes to the illustration. **Wizard:** “Spoiler denied an encore; the proper chapter remains bookmarked!” Attention to the safe call-out is minimized and the replacement route is immediate. *Respond · ignore/redirect · none · attention.* | `D4_SUPPORTED` |
| **5** | Say once, “That does sound exciting—remember your turn,” and continue. | Anna smiles, then whispers one more detail. The page proceeds with a small pause. **Wizard:** “Boundary held, but the spoiler earned a review.” This is brief and calm, yet gives the concern behavior attention before a loose redirect. *Respond · brief acknowledgment · attention to concern behavior · attention.* | `D4_WOBBLY` |
| **0** | Ask, “Pickles? Is that the puppy?” so Anna knows you heard. | Anna beams and explains the name; peers resume pet talk and the book drops to your lap. **Wizard:** “One follow-up question opened an entire bonus level.” Conversation follows the call-out rather than minimizing attention and redirecting. *Respond · contingent conversation · undermines ignore · attention.* | `D4_ESCALATED` |

### `D3_WOBBLY`

Anna keeps her place but taps the talk card against the rug and chants your name softly. The sound is safe; the child beside her begins copying the beat.

**Hint:** Address the route you want, not the performance that is gathering an audience.

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Give the chant no eye contact or comment; point to “card on knee,” then praise the quiet request when Anna asks, “My turn after?” | Anna stops tapping to ask, the peer rhythm ends, and you answer with one finger for one page. **Wizard:** “The drum solo lost power; clear words reached the conductor!” The chant receives minimal attention and an immediate replacement redirect. *Respond · planned ignore/redirect · none · attention.* | `D4_SUPPORTED` |
| **5** | Silently trade the card for a soft felt square. | The tapping stops and Anna rubs the square, but she still watches you and has not practiced asking/waiting. **Wizard:** “Sound problem solved; attention route unchanged.” An engaging item is helpful but omits the immediate replacement redirect. *Prevent · quiet alternative · missing redirect · attention.* | `D4_WOBBLY` |
| **0** | Move Anna beside your chair and whisper reminders while reading. | She quiets at once and leans toward you; the copying peer asks for the special seat. **Wizard:** “Instant hush purchased the front-row subscription.” Sustained proximity and whispers follow the noisy bid, directly undermining the response target. *Respond · contingent proximity/attention · undermines ignore · attention.* | `D4_ESCALATED` |

### `D3_ESCALATED`

Anna kneels at the book and says, “Listen now!” Peers comment, but she is not touching anyone or the book; the situation is safe.

**Hint:** Ignoring the behavior still includes giving Anna a fast route back to functional communication.

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Keep your expression neutral, do not debate “now,” and prompt once, “Say, ‘Save my turn, please,’ from your rug spot.” | Anna repeats the phrase, backs up, and watches you secure the talk card. Peer commentary loses momentum. **Wizard:** “The demand hit quiet air; the usable request found a landing pad.” This minimizes attention to the safe demand and immediately redirects. *Respond · ignore/redirect · none · attention.* | `D4_WOBBLY` |
| **5** | Calmly say, “Rug spot first,” and wait. | Anna returns after a pause; the class resumes, but no functional request is practiced. **Wizard:** “Traffic cleared; replacement sign still missing.” Matter-of-fact direction limits attention but incompletely implements ignore because immediate replacement redirection is absent. *Respond · low-attention direction · incomplete redirect · attention.* | `D4_WOBBLY` |
| **0** | Pause and negotiate thirty seconds for Anna now if she promises to stop. | Anna agrees and speaks calmly; other children protest that they also deserve thirty seconds. **Wizard:** “A peaceful bargain—with escalation holding the winning coupon.” Extended attention contingent on the demand undermines planned ignoring. *Respond · negotiated attention · reinforces concern behavior · attention.* | `D4_ESCALATED` |

## Decision 4 — The Consequence

**Exact fidelity target:** `reinforcement_01` — Praise.

### `D4_SUPPORTED`

The final page closes. Anna remains on her rug spot, raises one hand once, and asks, “Is my saved turn now?” The torn-card student also needs the repaired card returned.

**Hint:** Which response immediately names the behavior worth repeating?

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Say, “You waited on your spot and asked once—that was excellent waiting,” then give her a bounded sharing turn. | Anna tells one bright sentence; the class listens and you hand back the name card. **Wizard:** “Waiting earned the headline, not merely the puppy!” Immediate specific praise clearly marks the replacement. *Reinforce · immediate behavior-specific praise/attention · none · attention.* | `D5_SUPPORTED` |
| **5** | Say, “Thanks, Anna. Tell us one sentence.” | She shares and sits, but the class hears no description of what her thanks was for. **Wizard:** “Applause arrived with the label smudged.” Timely generic praise is weaker than specific praise. *Reinforce · generic praise/attention · nonspecific praise · attention.* | `D5_WOBBLY` |
| **0** | Invite her to share but skip praise so the class can move quickly. | Anna gets the desired audience, then adds a second detail when no skill boundary is named. **Wizard:** “The reinforcer arrived; praise missed the train.” Adult/group attention may reinforce sharing, but the exact praise target is not performed. *Reinforce · attention without praise · omitted measured target · attention.* | `D5_ESCALATED` |

### `D4_WOBBLY`

Anna returns to her spot and uses the prompted saved-turn request. Her voice is uneven, but the functional words are clear; the group is restless.

**Hint:** Praise can mark recovery even when it is not polished.

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Immediately say, “You came back and used the saved-turn words—strong recovery,” then allow one sentence. | Anna exhales, shares, and passes the talk card back; peers prepare for the greeting song. **Wizard:** “Comeback captured while it was still glowing!” The praise is immediate and specific to recovery. *Reinforce · recovery-specific praise · none · attention.* | `D5_SUPPORTED` |
| **5** | Let her share, then say, “Good job,” as you collect the card. | Anna smiles, though she asks whether “good job” means her puppy story. **Wizard:** “Praise arrived late and wearing a disguise.” Praise exists but timing and specificity are weak. *Reinforce · delayed generic praise · weak timing/specificity · attention.* | `D5_WOBBLY` |
| **0** | Say only, “One sentence,” and start the class song immediately after it. | Anna shares but holds the card, looking uncertain whether her recovery mattered. **Wizard:** “Efficient transition; silent reinforcement target.” The limit is useful but no praise is given. *Reinforce · limit without praise · omitted measured target · attention.* | `D5_ESCALATED` |

### `D4_ESCALATED`

After the negotiated talk, Anna finally returns to her spot and says without prompting, “I can wait for another turn tomorrow.” The class is still watching.

**Hint:** Do not let the earlier shortcut hide a replacement response happening now.

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Say immediately, “You told me you can wait and went back to your spot—that is the choice to practice,” then begin the greeting song. | Anna joins the motions; peer requests fade as the group gets a shared activity. **Wizard:** “A clean learning signal salvaged from a messy bargain!” Specific praise strengthens the late replacement without praising escalation. *Reinforce · immediate specific praise · none · attention.* | `D5_WOBBLY` |
| **5** | Give a thumbs-up and begin the song. | Anna joins but watches for another response from you. **Wizard:** “Positive signal, tiny print.” Nonverbal approval is useful but weaker and nonspecific as praise. *Reinforce · nonverbal approval · weak specificity · attention.* | `D5_WOBBLY` |
| **0** | Say, “We have already spent enough time on this,” and begin the song. | Anna folds her arms and misses the first motions; peers glance back at her. **Wizard:** “The recovery line vanished beneath the receipt.” The response provides no praise and adds frustrated attention. *Reinforce · corrective dismissal · no praise · attention.* | `D5_ESCALATED` |

## Decision 5 — The Finish

**Exact fidelity target:** None. This integration step balances honoring appropriate attention, limits, participation, and independence.

### `D5_SUPPORTED`

During the greeting song, Anna participates and then quietly asks whether she may draw Pickles during table choice. Another child needs help finding the correct table.

**Hint:** Let appropriate asking remain worthwhile without turning your help into the whole activity.

| Score | Teacher response | Consequence, Wizard, and explanation | Ending |
|---|---|---|---|
| **10** | Praise the calm question, offer paper, and say you will look after she draws while you guide the peer. | Anna starts independently; you later give a brief promised look and both children reach tables. **Wizard:** “The side story became independent work—and the promise returned on cue!” Bounded follow-through reinforces asking while preserving the routine. *Integrate · praise/engagement/delayed attention · none · attention.* | `STRONG` |
| **5** | Help Anna begin the drawing before guiding the other child. | She starts happily, but the peer waits and Anna asks you to draw the puppy's ears. **Wizard:** “Lovely launch, sticky handoff.” Help is appropriate but broader than needed and weakens independence. *Integrate · initial adult help · excessive assistance · attention.* | `MIXED` |
| **0** | Tell Anna the puppy topic is finished for today. | She stops singing, follows you toward the peer, and asks why she cannot draw it. **Wizard:** “The boundary erased a perfectly usable independent bridge.” The appropriate request is needlessly ineffective and creates a new attention exchange. *Integrate · blanket denial · missed engagement/reinforcement · attention.* | `FRAGILE` |

### `D5_WOBBLY`

The song begins, but Anna watches your face instead of doing the motions and asks, “Did I wait good?” The class is moving around her.

**Hint:** A brief repair can return attention to participation rather than start another review.

| Score | Teacher response | Consequence, Wizard, and explanation | Ending |
|---|---|---|---|
| **10** | Say, “You returned and used your words; show me the next motion,” then join the class. | Anna copies the motion and stays in the song; your attention returns to the whole group. **Wizard:** “Answer, redirect, rejoin—the scene lands on participation!” Brief specific feedback makes recovery meaningful without an extended debrief. *Integrate · specific feedback/participation redirect · none · attention.* | `STRONG` |
| **5** | Whisper a recap of what went well while the class sings. | Anna listens calmly, but both of you miss two motions and peers stare. **Wizard:** “Helpful debrief scheduled inside the performance.” The review is kind and accurate but too attention-rich for this moment. *Integrate · in-routine debrief · timing/attention drift · attention.* | `MIXED` |
| **0** | Ignore the appropriate question as well as earlier interruptions. | Anna asks louder, “Was I good?” and the song loses another participant. **Wizard:** “Behavior and child got bundled into the same silence—wrong parcel.” Planned ignoring applies to safe concern behavior, not an appropriate request. *Respond · ignores functional request · overgeneralized ignoring · attention.* | `FRAGILE` |

### `D5_ESCALATED`

Anna sits out the first verse, then takes one breath and says, “Can I join now?” There is no assigned solo or special seat—only the shared motions.

**Hint:** Recovery can be reinforced through ordinary group inclusion, not a premium attention event.

| Score | Teacher response | Consequence, Wizard, and explanation | Ending |
|---|---|---|---|
| **10** | Say, “Yes—nice calm asking,” cue the current motion, and continue leading everyone. | Anna joins beside her peers; attention is brief, specific, and immediately shared across the group. **Wizard:** “No VIP pass required; the recovery entered through the regular door!” This reinforces a functional request without extending the earlier attention payoff. *Integrate · brief praise/inclusion · none · attention.* | `STRONG` |
| **5** | Stop the song, welcome Anna back, and restart the verse for her. | Anna joins smiling, but the class groans and her return commands the entire room. **Wizard:** “Warm welcome, oversized spotlight.” Inclusion is appropriate; restarting converts it into disproportionate attention. *Integrate · public restart · excessive attention · attention.* | `MIXED` |
| **0** | Tell her she can join at the next song because she missed the start. | Anna protests from the rug edge while peers watch instead of singing. **Wizard:** “Recovery request reached a locked gate.” Delayed exclusion makes appropriate recovery ineffective and renews the attention struggle. *Integrate · denied re-entry · recovery not reinforced · attention.* | `FRAGILE` |

## Mission #4 Endings

- **`STRONG` — Two Stories Find Their Pages:** Anna's news is heard in a bounded turn or moved into independent engagement; she participates in the group and functional bids remain useful. The book, peer needs, and teacher attention all keep moving. **Wizard:** “Main plot intact; side plot honored; no chapter ate the whole book.”
- **`MIXED` — A Spotlight Runs Long:** Anna is calm and included, but an extended debrief, drawing assist, or class restart makes adult/group attention larger than necessary. The routine survives with avoidable drag. **Wizard:** “A kind edit—just several paragraphs too long.”
- **`FRAGILE` — The Unfinished Sentence:** Appropriate recovery or requesting becomes ineffective, so Anna checks, protests, or disconnects from the group. Immediate quiet may have occurred earlier, but the participation route ends unclear. **Wizard:** “The room reached the next page; the learning thread is still dangling.”

## Mission #4 Metadata Recommendation

```yaml
id: CASE999_DAILY_04
title: The Story That Cannot Wait
type: Daily
expectedSteps: 5
routine: whole-group read-aloud / morning meeting
functionPressure: [attention]
exactFidelityByDecision: {decision_1: null, decision_2: teaching_01, decision_3: response_01, decision_4: reinforcement_01, decision_5: null}
branchStates: [SUPPORTED, WOBBLY, ESCALATED]
endStates: [STRONG, MIXED, FRAGILE]
status: authoring-draft
productionEligible: false
```

# Daily Mission #5 — The Glue-Bottle Gridlock

## Mission Design Card

- **Mission ID:** `CASE999_DAILY_05`
- **Mission type:** Daily
- **Routine / location:** Art / hands-on collage project
- **Central tension:** Several children need real material help at once; Anna's clogged glue creates a valid help opportunity while the amount and timing of adult assistance can strengthen either requesting and independence or escalation.
- **Function pressure:** Necessary help includes adult attention, and scarcity makes louder routes tempting.
- **Active BIP components:** Prevent, Teach, Reinforce, Respond
- **Exact fidelity opportunities:** D1 `proactive_01`; D2 none; D3 `teaching_01`; D4 `reinforcement_01`; D5 `response_01`
- **Emotional / narrative tone:** A cheerful workshop traffic jam, with tools, hands, and help tickets moving through stations
- **Mission design goal:** Discriminate legitimate help that reinforces functional asking from extensive assistance delivered after escalation, then fade help back to independent making.

Choice metadata uses **component · mechanism · error · function**.

## Cold Open / Decision 1 — The Setup

The art tables are bright with tissue squares, cardboard circles, and uncapped markers. The class is building paper gardens, and scraps cling to sleeves with static. You circulate while one child holds a torn stem, another reports a dry green marker, and a third cannot peel tape. Anna is calmly arranging petals and has not called for you. Her glue bottle still sits untouched beside her elbow; yesterday several bottles clogged. As you pass, she glances up, then tries twisting the cap without making a bid. You have perhaps ten seconds before the torn paper and tape problems pull you across the room.

**Exact fidelity target:** `proactive_01` — Give non-contingent attention.

**Hint:** Nothing has gone wrong and Anna has not asked. Which choice offers connection before help becomes urgent?

| Score | Teacher response | Modeled consequence, Wizard, and behavioral explanation | Next |
|---|---|---|---|
| **10** | Pause and say, “I see your petal pattern—show me your next color,” listen briefly, then continue your route. | Anna points to yellow, smiles, and resumes arranging while you reach the torn stem. The glue remains a material problem, not yet an attention emergency. **Wizard:** “Workshop check-in delivered before any help flare launched!” Attention is given before a bid or concern behavior, exactly implementing non-contingent attention. *Prevent · non-contingent attention · none · attention.* | `D2_SUPPORTED` |
| **5** | Check the glue tip, say, “This one may be sticky; try the spare if you need it,” and move on. | Anna tests the tip and knows an alternative, but watches you cross the room without a social exchange. **Wizard:** “Excellent tool forecast; no connection in the package.” Antecedent help is useful but does not give non-contingent attention. *Prevent · materials preparation · missed active ingredient · attention.* | `D2_WOBBLY` |
| **0** | Save your check-in for when Anna asks because the other children already need help. | Anna squeezes the bottle twice, looks toward you, and calls your name over the tape request. Your route now has four callers and a clogged bottle. **Wizard:** “Efficient triage reserved attention for the moment it had to be summoned.” This understandable choice gives no non-contingent attention and makes attention reactive. *Prevent · wait-and-see · no proactive attention · attention.* | `D2_ESCALATED` |

## Decision 2 — The Pressure

**Exact fidelity target:** None. The criterion is proportionate assistance plus a return to independent engagement, not one atomic fidelity target.

### `D2_SUPPORTED`

The glue will not flow. Anna raises the bottle and says calmly, “Can you help me?” Two peers call from the supply shelf.

**Hint:** Help is appropriate; how much preserves Anna's ownership of the project?

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Say, “Yes,” clear the tip, hand it back, and ask Anna to test one dot while you answer the shelf callers. | One dot appears; Anna says “It works!” and begins gluing petals independently. **Wizard:** “Repair complete, tool returned, artist still in charge!” Brief help honors the functional request and returns control. *Reinforce · bounded help/independence · none · attention.* | `D3_SUPPORTED` |
| **5** | Replace the bottle and squeeze glue onto the first three petals with Anna. | Work starts smoothly, but Anna slides the next petals toward you while peers wait. **Wizard:** “Legitimate help grew an extra set of roots.” Assistance is appropriate but broader than necessary and blurs the handoff. *Reinforce · extended help · weak independence boundary · attention.* | `D3_WOBBLY` |
| **0** | Tell Anna to keep trying until you finish with the supply shelf. | She squeezes harder, the cap pops loose, and glue puddles across two petals; she calls louder. **Wizard:** “A valid help request entered the waiting room without a ticket.” The real request is not made effective or supported, increasing work and pressure. *Reinforce · unsupported delay · functional request not reinforced · attention.* | `D3_ESCALATED` |

### `D2_WOBBLY`

Anna switches bottles as suggested, but its cap is sealed too. She asks, “Can you open it?” while holding both bottles carefully. The torn-stem child is beginning to cry.

**Hint:** A brief assist can reinforce asking without turning into co-creation.

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Open the spare, say, “You asked clearly,” and return it for Anna to use while you address the torn stem. | Anna tests it and continues alone; the other child receives help. **Wizard:** “One cap, one acknowledgment, two artists moving!” The bounded assist makes the functional request effective and restores independence. *Reinforce · brief help/acknowledgment · none · attention.* | `D3_SUPPORTED` |
| **5** | Open it and remain long enough to hold each petal while Anna glues. | Anna works calmly, but the torn-stem child waits and begins calling your name. **Wizard:** “Help was deserved; duration became the traffic jam.” Adult help is not wrong, but the extended presence exceeds the material need. *Reinforce · legitimate but extended help · over-assistance · attention.* | `D3_WOBBLY` |
| **0** | Take the project to your desk and say you will glue it later. | Anna has no task, trails you, and asks when her garden will return; the project stops being hers. **Wizard:** “Problem removed—along with the artist's next move.” Taking over creates prolonged dependence and does not reinforce independent engagement. *Respond · adult takeover · removes engagement/overattention · attention.* | `D3_ESCALATED` |

### `D2_ESCALATED`

Glue spreads on the table. Anna whines, “You never help me!” while holding her clean hands above the puddle. Everyone is safe; peers call for towels.

**Hint:** Solve enough of the real material problem to reopen independence, without awarding a full-service art session to the escalation.

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Place a towel over the spill, say matter-of-factly, “Ask, ‘Help with the bottle, please,’” honor it by swapping bottles, and direct Anna to restart with one dry petal. | Anna repeats the request, presses the towel once, and places a dry petal independently while you circulate. **Wizard:** “Spill contained; help rerouted through usable words; artist relaunched!” The integrated repair addresses the real problem, bounds attention, and restores work. *Integrate · material repair/prompt/brief help · none · attention.* | `D3_WOBBLY` |
| **5** | Clean the spill and set out a working bottle without discussing the whine. | Anna quiets and restarts, but watches you for the next step; no functional request has been made efficient. **Wizard:** “Table rescued, learning signal foggy.” Practical help is necessary and calm, but adult work follows escalation without a replacement transition. *Respond · cleanup/material replacement · missed replacement bridge · attention.* | `D3_WOBBLY` |
| **0** | Sit down, clean everything, and finish gluing the garden so Anna can recover. | Anna becomes calm immediately and narrates where you should place every petal; three peers cluster with their own projects. **Wizard:** “Perfect calm, beautiful garden, escalation upgraded to full-service studio access.” Necessary help expands into sustained attention and task completion following whining. *Respond · contingent adult takeover · escalation made efficient · attention.* | `D3_ESCALATED` |

## Decision 3 — The Pivot

**Exact fidelity target:** `teaching_01` — Prompt replacement behavior.

### `D3_SUPPORTED`

Anna glues two petals, then the paper tears under her thumb. She looks up and says only, “Oh no,” while you are helping the tape child.

**Hint:** The problem is real; give Anna the words that can access proportionate help.

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Prompt, “Say, ‘Can you help me fix the tear?’” | Anna repeats it; you answer, “Yes, after I peel this tape,” and she holds the pieces together. **Wizard:** “Specific problem, specific request, usable queue!” This directly prompts a functional help response. *Teach · explicit help-request prompt · none · attention.* | `D4_SUPPORTED` |
| **5** | Model a deep breath and show her how to pinch the paper together from across the table. | Anna breathes and stabilizes it, but keeps saying, “Teacher?” without a clear request. **Wizard:** “Coping and problem-solving arrived; the communication tool stayed boxed.” Supported skills are modeled, but no replacement behavior is prompted. *Teach · breathing/problem-solving model · adjacent skills only · attention.* | `D4_WOBBLY` |
| **0** | Tell her, “Artists solve problems,” and continue helping the peer. | Anna says, “I can't,” pulls the tear wider, and waves it toward you. **Wizard:** “Encouragement poster displayed; functional words unavailable.” General encouragement is not an explicit prompt and leaves the real need unresolved. *Teach · vague independence cue · no prompt · attention.* | `D4_ESCALATED` |

### `D3_WOBBLY`

Anna has a working bottle but pushes each petal toward you and repeats, “You do this one.” The request is clear in function but asks for the whole task.

**Hint:** Prompt a request for the smallest help that unlocks independent action.

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Prompt, “Ask, ‘Can you hold one petal while I glue?’” | Anna repeats it, glues while you hold once, then reaches for the next petal herself. **Wizard:** “Help request resized; ownership stays with the artist!” This explicitly prompts a bounded functional request. *Teach · graduated help-request prompt · none · attention.* | `D4_SUPPORTED` |
| **5** | Point to a finished sample and say, “Try one like this.” | Anna copies the model but asks you to watch every dot. **Wizard:** “Independent step unlocked; attention language still unpracticed.” A visual model helps performance but is not a replacement prompt. *Prevent · task model · omitted replacement prompt · attention.* | `D4_WOBBLY` |
| **0** | Agree to glue while Anna chooses placement. | Anna settles and hands you every piece; peers' requests queue behind your new role. **Wizard:** “Collaboration costume, adult-takeover engine.” Immediate extensive help bypasses prompting and makes dependent bids effective. *Reinforce · adult task completion · no prompt/dependence · attention.* | `D4_ESCALATED` |

### `D3_ESCALATED`

Anna watches you finish the project and then says, “Help me make another flower,” reaching for fresh paper. Peers are still gathered.

**Hint:** Recovery means converting a broad demand into a functional, limited request Anna can use.

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Prompt, “Ask, ‘Can you help me start, then I finish?’” | Anna repeats it; you point to two starter pieces and she takes the scissors herself. Peers drift back to work. **Wizard:** “Studio contract rewritten: start support, independent finish!” This directly prompts a usable bounded request. *Teach · explicit bounded-help prompt · none · attention.* | `D4_WOBBLY` |
| **5** | Offer two paper colors and tell Anna to choose one before asking again. | She chooses, quiets, and says “Help?” The task is more engaging, but the replacement response remains vague. **Wizard:** “Choice restored momentum; request still missing its edges.” Engagement supports recovery without implementing the prompt target. *Prevent · choice/engagement · omitted replacement prompt · attention.* | `D4_WOBBLY` |
| **0** | Explain that she received more help than anyone else. | Anna argues about each peer's project and the group supplies evidence; adult and peer attention expand. **Wizard:** “The fairness gallery opened—admission paid in conversation.” No replacement is prompted and lengthy attention follows dependence. *Respond · fairness lecture · no prompt/prolonged attention · attention.* | `D4_ESCALATED` |

## Decision 4 — The Consequence

**Exact fidelity target:** `reinforcement_01` — Praise.

### `D4_SUPPORTED`

Anna uses the prompted tear-help request, waits through the tape fix, and keeps the paper pinched together. You return and the repair takes five seconds.

**Hint:** Help solves the paper; what makes the requesting and waiting visible as the behavior to repeat?

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Say immediately, “You asked exactly what help you needed and held it while you waited—excellent,” then tape the tear. | Anna smooths the tape and resumes gluing without following you. **Wizard:** “Repair plus named skill—the label is stronger than the tape!” Immediate specific praise meets the exact target; brief help is the supported reinforcer. *Reinforce · specific praise/brief help · none · attention.* | `D5_SUPPORTED` |
| **5** | Tape it, smile, and say, “There you go.” | Anna resumes, though the asking and waiting are not named. **Wizard:** “Problem fixed; praise message reduced to a friendly receipt.” Warm acknowledgment is weaker than explicit praise for the behavior. *Reinforce · acknowledgment/help · weak or absent praise content · attention.* | `D5_WOBBLY` |
| **0** | Silently tape the paper and hurry to the next caller. | The art is repaired, but Anna immediately asks you to watch the next petal. **Wizard:** “Help delivered; measured praise left on the supply cart.” Assistance may reinforce the request, but no praise is performed. *Reinforce · help without praise · omitted measured target · attention.* | `D5_ESCALATED` |

### `D4_WOBBLY`

Anna asks you to hold one petal and then glues the next one alone. She glances up to see whether you noticed while two peers wait behind you.

**Hint:** One sentence can mark the independent handoff before the line moves.

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Say, “You asked for one bit of help, then did the next petal yourself—smart problem solving.” | Anna beams and reaches for another petal as you move to the next child. **Wizard:** “Independence caught in a one-sentence spotlight!” The praise is immediate and specific. *Reinforce · immediate specific praise · none · attention.* | `D5_SUPPORTED` |
| **5** | Give a thumbs-up and say, “Nice,” while walking away. | Anna continues but calls, “Did you see this one?” **Wizard:** “Positive, quick, and blurry.” Praise is present but nonspecific. *Reinforce · generic praise · weak specificity · attention.* | `D5_WOBBLY` |
| **0** | Tell the waiting peers, “See, Anna can do it herself,” without addressing Anna. | Peers look at Anna; she pushes the next petal away and says she still needs you. **Wizard:** “Public commentary is not praise delivered to the learner.” The statement neither directly nor clearly praises Anna and adds peer attention. *Reinforce · third-person commentary · no direct praise · attention.* | `D5_ESCALATED` |

### `D4_ESCALATED`

After the fairness debate, Anna picks up the scissors and says, “I can start this part.” She cuts one rough but usable stem without help.

**Hint:** Reinforce recovery, not artistic perfection or the preceding debate.

| Score | Teacher response | Consequence, Wizard, and explanation | Next |
|---|---|---|---|
| **10** | Immediately say, “You started independently after a hard moment—that is strong recovery.” | Anna adds the stem to her page and peers return to their own work. **Wizard:** “Rough edge, brilliant comeback signal!” Specific praise clearly marks the desired recovery. *Reinforce · immediate recovery-specific praise · none · attention.* | `D5_WOBBLY` |
| **5** | Say, “Pretty stem,” and point to the glue. | Anna smiles but asks whether you like the flower too. **Wizard:** “Praise landed on the product, not the independent move.” Praise is genuine but weaker for the relevant behavior. *Reinforce · product praise · nonspecific to behavior · attention.* | `D5_WOBBLY` |
| **0** | Correct the crooked cut so the final project looks complete. | Anna hands the scissors back and waits for you to finish; the recovery response gets no praise. **Wizard:** “Craft quality rose; independence signal disappeared.” Correction omits praise and reopens adult takeover. *Reinforce · corrective help · no praise/dependence · attention.* | `D5_ESCALATED` |

## Decision 5 — The Finish

**Exact fidelity target:** `response_01` — Ignore. All depicted concern behaviors are explicitly safe; the target means calm minimization of attention plus immediate replacement redirection, not ignoring legitimate help or safety.

### `D5_SUPPORTED`

With her garden nearly finished, Anna gives one exaggerated whine—“Watch meeee”—while squeezing a safe dot of glue and looking at you. You are helping the dry-marker student.

**Hint:** The tool works and Anna is safe. Make one appropriate bid more efficient than the whine.

| Score | Teacher response | Consequence, Wizard, and explanation | Ending |
|---|---|---|---|
| **10** | Give the whine no look or comment; prompt once, “Ask, ‘Look when you're free, please,’” then praise and honor that request briefly. | Anna uses the words, finishes a petal while waiting, and gets your short look after the marker swap. **Wizard:** “Whine found an empty counter; clear request received service!” Attention is minimized to the safe concern behavior and immediately redirected. *Respond · ignore/redirect/reinforce · none · attention.* | `STRONG` |
| **5** | Say, “I will look after this marker,” and continue helping the peer. | Anna quiets but asks “Now?” twice; the whine directly earned reassurance and no replacement was prompted. **Wizard:** “Efficient answer, fuzzy contingency.” The response is brief and useful but incompletely implements ignore. *Respond · concise reassurance · attention to concern behavior/missed redirect · attention.* | `MIXED` |
| **0** | Turn and watch each remaining glue dot so she stays calm. | Anna works silently and proudly while the marker student waits with a dry tip. **Wizard:** “Immediate calm achieved; whining awarded a private gallery opening.” Sustained attention follows the concern behavior, undermining the exact target. *Respond · contingent sustained attention · undermines ignore · attention.* | `FRAGILE` |

### `D5_WOBBLY`

Anna works alone for a minute, then repeats “Help, help, help” while holding an ordinary loose petal. She is safe and has already shown she can glue it.

**Hint:** Do not eliminate access to real help; shift this repeated bid into one usable request and the smallest needed assist.

| Score | Teacher response | Consequence, Wizard, and explanation | Ending |
|---|---|---|---|
| **10** | Do not answer the repetition; prompt, “One steady ask: ‘Help me start this petal,’” then hold it once and step away. | Anna repeats the request, glues it, and finishes the final petal independently. **Wizard:** “Help stayed available; repetition lost its fast pass!” This minimizes attention to repeated bids, redirects immediately, and provides proportionate help. *Respond · ignore/redirect/bounded help · none · attention.* | `STRONG` |
| **5** | Slide the finished sample closer and say, “Try yours here.” | Anna copies it and completes the petal, but no functional request is practiced and the repeated bid receives a direction. **Wizard:** “Task solved; response sequence only half built.” The low-attention support is useful but lacks immediate replacement redirection. *Respond · task cue · incomplete redirect · attention.* | `MIXED` |
| **0** | Sit and finish the last petals with Anna to stop the repeated asking. | Anna quiets and chats while you glue; the teacher-help line reforms behind you. **Wizard:** “The project crossed the finish line on escalation express.” Extended attention and task help follow the repeated bid, failing to ignore it. *Respond · contingent extended help · undermines ignore · attention.* | `FRAGILE` |

### `D5_ESCALATED`

After you correct the stem, Anna slides the entire garden toward you and whines, “Fix all of it.” The paper and bodies are safe. A peer beside her appropriately asks for a new marker.

**Hint:** Minimize attention to the broad demand, immediately reopen a limited request, and preserve legitimate help.

| Score | Teacher response | Consequence, Wizard, and explanation | Ending |
|---|---|---|---|
| **10** | Keep a neutral expression, do not inspect every flaw, and prompt, “Ask for help with one part.” Honor her choice of one loose petal, then return the garden. | Anna asks for the petal, repairs it with you, and carries the garden to the drying rack while the peer gets a marker. **Wizard:** “Full-service demand dimmed; one-part help route lit up!” Safe whining gets minimal attention and an immediate functional redirect. *Respond · ignore/redirect/bounded help · none · attention.* | `STRONG` |
| **5** | Say, “I can fix one thing,” repair a petal, and return the garden. | Anna accepts the limit but asks which words would get help next time. The peer waits briefly. **Wizard:** “Boundary strong; replacement doorway unlabeled.” Attention is bounded, but it responds directly to whining and does not immediately prompt replacement. *Respond · concise limit/brief help · attention to behavior/missed redirect · attention.* | `MIXED` |
| **0** | Review every flaw with Anna and negotiate which ones you will repair. | Anna becomes calm and deeply engaged in the conference; peers line up while the broad whine produces sustained adult analysis. **Wizard:** “Matter-of-fact tone, deluxe attention package.” Calm professionalism does not equal ignoring when extended attention follows concern behavior. *Respond · contingent review/negotiation · undermines ignore · attention.* | `FRAGILE` |

## Mission #5 Endings

- **`STRONG` — The Artist Keeps the Tools:** Anna receives real, bounded help after functional words, completes meaningful work herself, and moves the garden to the drying rack. Peers also access help and concern behavior is not the efficient route. **Wizard:** “Repair station closed; independence exhibit now open.”
- **`MIXED` — Fixed, but Still in Queue:** The project progresses and Anna is often calm, yet vague reassurance, task cues without communication, or help delivered directly to whining leaves the contingency unclear. **Wizard:** “The materials work. The help-request system needs one more adjustment.”
- **`FRAGILE` — Full-Service Studio:** The art may look finished and Anna may look peaceful, but repeated bids or whining purchase watching, co-production, or an extended review. Teacher workload and peer delay expose the hidden cost. **Wizard:** “Gallery-ready product; independence invoice unpaid.”

## Mission #5 Metadata Recommendation

```yaml
id: CASE999_DAILY_05
title: The Glue-Bottle Gridlock
type: Daily
expectedSteps: 5
routine: art / hands-on classroom project
functionPressure: [attention]
exactFidelityByDecision: {decision_1: proactive_01, decision_2: null, decision_3: teaching_01, decision_4: reinforcement_01, decision_5: response_01}
branchStates: [SUPPORTED, WOBBLY, ESCALATED]
endStates: [STRONG, MIXED, FRAGILE]
status: authoring-draft
productionEligible: false
```

# Cross-Mission Bank Review: Daily #1–#5

| Mission | Routine | Primary discrimination | Main classroom pressure | Exact target order | Primary 5-point trap | Primary escalation pattern | Wizard motif |
|---|---|---|---|---|---|---|---|
| **#1 Everyone Needs You** | Literacy centers | Atomic plan actions versus kind but poorly contingent attention | Reading support competes with a tower bid | Proactive → Teach → Praise → Ignore → none | Adjacent calming/reassurance instead of exact action | Tower crash, scattered tiles, prolonged adult tour | Beacons, portals, maps, quests |
| **#2 One More Minute** | Small group / independent work | Credible delay and follow-through versus immediate calm | Group instruction and a promised attention window | Praise → none → Teach → Ignore → none | Timers/reassurance without the measured ingredient | Repeated checking, tapping, group intrusion, puzzle push | Clocks, runways, signals, receipts |
| **#3 Cleanup Chorus** | Center cleanup / rug transition | Proactive connection and independence versus adult-dependent transition | Whole-room noise and simultaneous cleanup needs | Proactive → none → Ignore → Praise → none | Practical help that replaces participation | Delayed cleanup, refusal, adult tethering | Orchestra, chorus, conducting, stage |
| **#4 The Story That Cannot Wait** | Whole-group read-aloud / meeting | Acknowledge appropriate bids without opening a conversation; ignore behavior, not child | Public teacher attention and peer amplification | none → Teach → Ignore → Praise → none | Accurate endpoint or brief acknowledgment without explicit prompt/ignore/praise | Personal-fact call-outs, card tapping, peer storytelling, group negotiation | Books, chapters, spoilers, bookmarks |
| **#5 The Glue-Bottle Gridlock** | Art / hands-on project | Legitimate help as reinforcement versus escalation purchasing extensive help | Multiple real material failures and a teacher-help queue | Proactive → none → Teach → Praise → Ignore | Useful material/task assistance missing the measured communication or praise step | Whining/repeated bids, glue spill, adult takeover, help queue | Workshop, tools, studio, gallery |

**Similarity flags and revisions:** #4 originally risked repeating #2's timer-as-wait structure, so it uses a talk card, page landmark, observable participation, and saved turn instead; no 5-point answer relies on a timer or recurring “brief reassurance.” Its public call-out/peer-story escalation differs from tower disruption, checking, and cleanup refusal. #5 necessarily overlaps #1 and #3 around adult help, but makes the *legitimacy and dose of help* the core discrimination rather than using proximity as the trap. Its exact order is unique across the bank, its material-failure escalation is distinct, and its 5-point options emphasize over-assistance, samples, choices, and bounded-but-unprompted help. No revision was needed after that audit. Purposeful recurrence remains in appropriate requesting, waiting, praise, and attention because those are source-plan components, not template artifacts.

# Exact-Link Audit

The exact target description—not broad plan alignment—was the scoring criterion for every linked decision. Each linked incoming-state variant was audited independently.

| Mission / linked decision | Exact target | Why 10 implements it | Why 5 is helpful but incomplete/weaker | Why 0 fails or undermines it | Result |
|---|---|---|---|---|---|
| #4 D2, all states | `teaching_01` — Prompt replacement behavior | Explicitly prompts an observable waiting or saved-turn request | Visual endpoint, information, breathing, or modeling supports success but does not prompt Anna to perform the replacement | Vague correction, peer rule recital, or lecture supplies no replacement prompt | **Pass** |
| #4 D3, all states | `response_01` — Ignore | Minimizes attention to safe call-out/chant/demand and immediately redirects to replacement | Brief acknowledgment, alternative item, or low-attention direction is useful but attends to the behavior or omits replacement redirection | Follow-up conversation, contingent proximity, or negotiated attention directly follows concern behavior | **Pass** |
| #4 D4, all states | `reinforcement_01` — Praise | Gives immediate, behavior-specific praise for waiting/requesting/recovery | Generic, delayed, nonverbal, or nonspecific praise is genuinely positive but weaker | Sharing without praise, a limit without praise, or dismissal does not praise | **Pass** |
| #5 D1 | `proactive_01` — Give non-contingent attention | Gives a brief social check-in before any bid or concern behavior | Materials prevention is helpful but contains no attention | Reactive triage withholds attention until a bid/problem | **Pass** |
| #5 D3, all states | `teaching_01` — Prompt replacement behavior | Explicitly prompts a specific, bounded help request | Breathing, task models, choice, and problem-solving help but do not prompt the replacement | General encouragement, task takeover, or fairness lecture provides no replacement prompt | **Pass** |
| #5 D4, all states | `reinforcement_01` — Praise | Gives immediate specific praise for asking, independence, or recovery | Friendly acknowledgment, generic praise, or product praise is weaker in specificity/timing | Silent help, third-person commentary, or correction does not praise Anna | **Pass** |
| #5 D5, all states | `response_01` — Ignore | Minimizes attention to safe whining/repetition and immediately redirects to one functional request, then honors bounded help | Concise reassurance, task cue, or a bounded limit helps but attends to the bid or omits the replacement redirect | Sustained watching, co-production, or extended review follows the concern behavior and undermines ignoring | **Pass** |

**Exact-link audit result: PASS.** No linked 0-point choice performs the measured target. Useful actions that cannot support a clean 10/5/0 distinction remain on unlinked D1/D5 in #4 and D2 in #5 rather than being forced into fidelity coverage.

# Canonical Quality Gate

| Gate | Evidence / finding | Result |
|---|---|---|
| Immersive opening and clear tension | Both openings establish sensory context, concurrent peer needs, Anna's observable baseline, and a genuine choice pressure. | **Pass** |
| Exactly five decisions per route | Every transition advances from D1 through D5 once; D2–D5 accept all three incoming architectures, and only D5 terminates. | **Pass** |
| Three plausible 10/5/0 choices | Each scene contains three similarly professional choices; 5s contain real support and 0s are realistic workload shortcuts. | **Pass** |
| Choice balance and answer masking | Choices use comparable tone, warmth, specificity, and length; the aligned choice is not identifiable through polished or compassionate wording alone. | **Pass** |
| Choices genuinely difficult | #4 separates acknowledgment from conversation and child from behavior; #5 separates legitimate help from its contingency, dose, and handoff. | **Pass** |
| Observable, state-changing consequences | Choices alter group/peer attention, task progress, replacement availability, teacher queue, independence, and intensity in the next scene. | **Pass** |
| Recovery and loss of ground | Every ESCALATED scene offers movement toward WOBBLY/STRONG, while every SUPPORTED scene includes plausible paths to WOBBLY/ESCALATED. | **Pass** |
| Immediate calm is not automatic success | The quick puppy story, special-seat whispering, full-service gluing, and sustained watching visibly calm Anna but receive context-dependent 0s; legitimate brief help after a request receives 10s. | **Pass** |
| Adult attention/help not treated as bad | Bounded sharing, brief listening, material repair, holding one petal, praise, and promised looks are plan-aligned reinforcers when contingent on replacement behavior. | **Pass** |
| Exact linkage behaviorally defensible | The preceding exact-link audit passes, with no linked 0 performing its target and ambiguous integration steps unlinked. | **Pass** |
| Wizard quality and variety | #4 uses literary language; #5 uses workshop/gallery language. Feedback is theatrical, mechanism-consistent, and nonjudgmental. | **Pass** |
| Mechanistic, non-deterministic explanations | Explanations identify function, timing, contingency, replacement behavior, or independence; simulated outcomes are modeled branch events rather than universal predictions. | **Pass** |
| Safety and source fidelity | Concern behavior is explicitly safe where ignoring is offered. No punishment, crisis, restraint, blocking, response cost, physical management, or unsupported procedure is introduced. | **Pass** |
| Complete resolution and metadata | Both missions define complete STRONG/MIXED/FRAGILE endings and non-production metadata. | **Pass** |
| Privacy and scope | Only fictional CASE-999 authoring documentation is added; there are no real identifiers or production artifacts. | **Pass** |
| Reader curiosity / interactive-story test | Every branch ends with changed classroom conditions that create the next decision rather than revealing an isolated quiz answer. | **Pass** |

Both missions pass the complete structural and behavioral quality gates and are ready for **human authoring review only**. They are not approved for production activation.
