export const TRAINING_CASES = {
  nora: {
    id: "nora",
    code: "TRAIN-NORA",
    name: "Nora",
    title: "Nora — Math Review",
    videoId: "TGf7l_eQ5eA",
    videoUrl: "https://www.youtube.com/watch?v=TGf7l_eQ5eA",
    videoDurationSeconds: 265,
    sourceLabel: "IRIS Center — Acting-Out Cycle: Nora",
    sourceUrl: "https://iris.peabody.vanderbilt.edu/module/bi1-elem/cresource/q2/p02/",
    routine: "Whole-group math homework review while waiting for peers",
    behaviorName: "Escalation behavior",
    behaviorDefinition: "Any audible sigh or groan, negative verbal protest about the activity or waiting, yelling or raised-voice protest, or pushing/knocking classroom furniture. Do not score appropriate statements during the later recovery/debrief.",
    behaviorExamples: [
      "Audibly sighs or groans in response to having to continue waiting during math review.",
      "Makes a negative protest about the review, waiting, or the activity.",
      "Raises her voice or yells in protest.",
      "Pushes, kicks, or knocks classroom furniture during escalation."
    ],
    behaviorNonExamples: [
      "Quietly crosses her arms or rolls her eyes without an audible sigh/groan or verbal protest.",
      "Calmly asks to work ahead, asks for a different activity, or requests the Peace Corner.",
      "Answers an academic question appropriately.",
      "Talks about what she could do differently during the later recovery/debrief."
    ],
    hypothesis: "Training hypothesis: behavior is likely when Nora must wait during review she has already mastered and may function to escape/shorten waiting and gain access to more appropriate or challenging activity.",
    replacement: "Appropriately ask to work ahead, request a challenging independent activity, or request the Peace Corner.",
    bip: {
      prevent: "Have independent/challenge work available during review. At early signs of frustration, discreetly offer Nora the planned alternative.",
      teach: "Teach and prompt Nora to request to work ahead, request a challenge activity, or request the Peace Corner before escalation.",
      reinforce: "Honor appropriate requests when feasible and acknowledge calm waiting, appropriate requesting, and successful re-entry.",
      respond: "At early frustration, use a brief neutral/supportive response and offer the planned option. For unsafe escalation, follow the classroom safety/de-escalation plan. Support a calm return and debrief after recovery."
    },
    fidelityTargets: [
      {
        id: "nora_01",
        area: "Prevent",
        short: "Early frustration → offer alternative work",
        detail: "At clear early frustration, discreetly offer work-ahead/challenge activity.",
        full: "Within 10 seconds of clear early frustration (e.g., repeated sighing/groaning and disengagement), discreetly offer Nora the planned work-ahead or challenge activity.",
        desiredOutcome: "Nora accepts or orients toward the alternative and escalation decreases.",
        example: "Nora sighs/groans and disengages; within 10 seconds the teacher quietly offers her the planned challenge work or work-ahead option.",
        nonExample: "The teacher tells Nora to wait, reminds her to be respectful, or offers an alternative only after the escalation is already well underway.",
        trainingKey: "not_implemented"
      },
      {
        id: "nora_02",
        area: "Respond",
        short: "Verbal protest → calm supportive response",
        detail: "Brief neutral/supportive response plus planned choice; no reprimand/threat.",
        full: "Following Nora's verbal protest, use a brief neutral or supportive response and prompt/offer the planned alternative without arguing, reprimanding, or threatening consequences.",
        desiredOutcome: "Nora's escalation decreases or she shifts toward an appropriate option.",
        example: "After Nora verbally protests, the teacher calmly acknowledges the frustration and briefly offers the planned work-ahead or regulation choice.",
        nonExample: "The teacher argues, lectures, threatens a consequence, or only tells Nora to stop or be respectful without offering the planned option.",
        trainingKey: "not_implemented"
      },
      {
        id: "nora_03",
        area: "Reinforce",
        short: "Appropriate request → honor planned option",
        detail: "Honor an appropriate request to work ahead, use challenge work, or use Peace Corner.",
        full: "If Nora appropriately requests to work ahead, access a challenge activity, or use the Peace Corner during the routine, honor the planned option when feasible.",
        desiredOutcome: "Nora accesses the appropriate alternative and remains or returns to calm engagement.",
        example: "Nora appropriately asks to work ahead or use the Peace Corner, and the teacher promptly allows the planned option when feasible.",
        nonExample: "The teacher gives Nora a break or removes the demand after escalation even though Nora did not use the taught request.",
        trainingKey: "no_opportunity"
      },
      {
        id: "nora_04",
        area: "Respond",
        short: "Unsafe escalation → follow de-escalation plan",
        detail: "Protect peers, reduce demands/interaction, and offer planned regulation support.",
        full: "Following unsafe escalation, implement the classroom safety/de-escalation response: protect peers, minimize additional verbal escalation, and offer the planned regulation space/support.",
        desiredOutcome: "Nora moves toward de-escalation without additional unsafe behavior.",
        example: "After unsafe behavior begins, the teacher protects peers, reduces verbal interaction, and offers the planned regulation space/support.",
        nonExample: "The teacher continues a lengthy verbal correction, adds demands, argues, or repeatedly questions Nora while she is escalating.",
        trainingKey: "implemented",
        trainingOutcomeKey: "yes"
      },
      {
        id: "nora_05",
        area: "Recovery",
        short: "Recovery → structured re-entry + debrief",
        detail: "Support return to work, acknowledge recovery, then identify a future replacement response.",
        full: "After Nora has de-escalated, provide a manageable re-entry task, acknowledge appropriate recovery/re-engagement, and complete a brief debrief that identifies a replacement response for next time.",
        desiredOutcome: "Nora re-engages and identifies an appropriate future response.",
        example: "Once Nora is calm, the teacher supports a manageable return to work, acknowledges her re-engagement, and briefly identifies what she can do next time.",
        nonExample: "The teacher simply sends Nora back to the original task, requires an apology only, or ends the interaction without discussing a future replacement response.",
        trainingKey: "implemented",
        trainingOutcomeKey: "yes"
      }
    ],
    masterIntervals: null
  },

  kai: {
    id: "kai",
    code: "TRAIN-KAI",
    name: "Kai",
    title: "Kai — Popcorn Reading",
    videoId: "48eBXIXPiv8",
    videoUrl: "https://www.youtube.com/watch?v=48eBXIXPiv8&t=3s",
    videoDurationSeconds: 297,
    sourceLabel: "IRIS Center — Acting-Out Cycle: Kai",
    sourceUrl: "https://iris.peabody.vanderbilt.edu/module/bi1-elem/cresource/q2/p02/",
    routine: "Whole-group popcorn reading",
    behaviorName: "Reading-avoidance / escalation behavior",
    behaviorDefinition: "Any repeated pencil tapping paired with disengagement, head down on the desk, verbal refusal/protest, pushing or sweeping materials, or leaving the classroom without permission. Do not score appropriate requests for help/passing or calm participation.",
    behaviorExamples: [
      "Repeatedly taps a pencil while disengaged from the reading activity.",
      "Puts his head down on the desk during the reading routine.",
      "Verbally refuses or protests reading aloud.",
      "Pushes/sweeps materials or leaves the classroom without permission."
    ],
    behaviorNonExamples: [
      "Taps the pencil once while still looking at and participating in the reading activity.",
      "Misreads a word, hesitates, or reads slowly without refusal/protest behavior.",
      "Appropriately asks for help or asks to pass his turn.",
      "Participates calmly in reading or returns to the activity appropriately."
    ],
    hypothesis: "Training hypothesis: behavior is likely when Kai anticipates or encounters difficult public reading and may function to escape or avoid reading aloud in front of peers.",
    replacement: "Appropriately ask for help, pass the turn to another student, or request a brief regulation break.",
    bip: {
      prevent: "Before popcorn reading, pre-correct that Kai can ask for help or pass his turn. When possible, preview difficult reading material in advance.",
      teach: "Teach and practice a brief help request and a pass-turn response before the routine.",
      reinforce: "Honor appropriate help/pass requests and provide specific acknowledgment for using the replacement response and re-engaging.",
      respond: "At early agitation, acknowledge difficulty and offer help/pass. During escalation, use a brief neutral prompt and reduce interaction. After return, support regulation and structured re-entry."
    },
    fidelityTargets: [
      {
        id: "kai_01",
        area: "Reinforce",
        short: "Calm/readiness → behavior-specific praise",
        detail: "Acknowledge Kai for showing readiness at the start of reading.",
        full: "During the calm phase, provide behavior-specific praise for Kai demonstrating readiness for the reading activity.",
        desiredOutcome: "Kai remains calmly engaged and prepared to participate.",
        example: "At the start of the routine, the teacher specifically acknowledges Kai for being ready, prepared, or appropriately engaged.",
        nonExample: "The teacher says only a generic 'good job' with no connection to readiness/engagement, or gives praise to the class but not to Kai's observable behavior.",
        trainingKey: "implemented",
        trainingOutcomeKey: "yes"
      },
      {
        id: "kai_02",
        area: "Prevent",
        short: "Before popcorn → pre-correct help/pass",
        detail: "Remind Kai he may ask for help or pass his turn before reading begins.",
        full: "Before the popcorn-reading demand, remind Kai that if reading is difficult he may ask for help or pass his turn to another student.",
        desiredOutcome: "Kai enters the routine with a clear, appropriate escape/help option.",
        example: "Before popcorn reading starts, the teacher privately reminds Kai that he can ask for help or pass if a section is difficult.",
        nonExample: "The teacher says 'do your best' or offers help only after Kai has already become agitated.",
        trainingKey: "not_implemented"
      },
      {
        id: "kai_03",
        area: "Respond",
        short: "Early agitation → offer help or pass",
        detail: "Acknowledge difficulty and offer a choice when head-down/tapping begins.",
        full: "When Kai shows early agitation or difficulty reading, briefly acknowledge the challenge and offer a choice to receive help or pass the turn.",
        desiredOutcome: "Kai uses an appropriate option and escalation decreases.",
        example: "When Kai begins tapping/head-down behavior, the teacher briefly acknowledges the difficulty and offers 'help or pass?'",
        nonExample: "The teacher repeatedly tells Kai to read, reprimands him for not participating, or continues the demand without offering the planned choice.",
        trainingKey: "not_implemented"
      },
      {
        id: "kai_04",
        area: "Reinforce",
        short: "Appropriate help/pass request → honor it",
        detail: "Immediately honor an appropriate request for help or to pass.",
        full: "If Kai appropriately asks for help or to pass the turn during the routine, honor the request promptly and acknowledge the appropriate response.",
        desiredOutcome: "Kai remains in the activity without escalating.",
        example: "Kai appropriately asks for help or to pass, and the teacher promptly honors the request and acknowledges the appropriate asking.",
        nonExample: "The teacher independently skips Kai without him using the replacement request, or allows escape only after escalation.",
        trainingKey: "no_opportunity"
      },
      {
        id: "kai_05",
        area: "Recovery",
        short: "Return → regulation + structured re-entry",
        detail: "Offer Peace Corner, then support return to a manageable task with acknowledgment.",
        full: "After Kai returns and is calmer, offer the planned regulation space, support a manageable re-entry task, and acknowledge appropriate recovery/re-engagement.",
        desiredOutcome: "Kai regulates, returns to the classroom routine, and re-engages successfully.",
        example: "After Kai returns calmer, the teacher offers the planned regulation option, gives him a manageable re-entry task, and acknowledges successful re-engagement.",
        nonExample: "Kai is immediately returned to the same difficult public-reading demand with no regulation support, adjustment, or acknowledgment.",
        trainingKey: "implemented",
        trainingOutcomeKey: "yes"
      }
    ],
    masterIntervals: null
  }
};

export function getTrainingCase(caseId) {
  return TRAINING_CASES[caseId] || TRAINING_CASES.nora;
}

export function intervalCountForDuration(durationSeconds, intervalSeconds = 15) {
  return Math.ceil(durationSeconds / intervalSeconds);
}
