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
        trainingKey: "not_implemented"
      },
      {
        id: "nora_02",
        area: "Respond",
        short: "Verbal protest → calm supportive response",
        detail: "Brief neutral/supportive response plus planned choice; no reprimand/threat.",
        full: "Following Nora's verbal protest, use a brief neutral or supportive response and prompt/offer the planned alternative without arguing, reprimanding, or threatening consequences.",
        desiredOutcome: "Nora's escalation decreases or she shifts toward an appropriate option.",
        trainingKey: "not_implemented"
      },
      {
        id: "nora_03",
        area: "Reinforce",
        short: "Appropriate request → honor planned option",
        detail: "Honor an appropriate request to work ahead, use challenge work, or use Peace Corner.",
        full: "If Nora appropriately requests to work ahead, access a challenge activity, or use the Peace Corner during the routine, honor the planned option when feasible.",
        desiredOutcome: "Nora accesses the appropriate alternative and remains or returns to calm engagement.",
        trainingKey: "no_opportunity"
      },
      {
        id: "nora_04",
        area: "Respond",
        short: "Unsafe escalation → follow de-escalation plan",
        detail: "Protect peers, reduce demands/interaction, and offer planned regulation support.",
        full: "Following unsafe escalation, implement the classroom safety/de-escalation response: protect peers, minimize additional verbal escalation, and offer the planned regulation space/support.",
        desiredOutcome: "Nora moves toward de-escalation without additional unsafe behavior.",
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
        trainingKey: "not_implemented"
      },
      {
        id: "kai_03",
        area: "Respond",
        short: "Early agitation → offer help or pass",
        detail: "Acknowledge difficulty and offer a choice when head-down/tapping begins.",
        full: "When Kai shows early agitation or difficulty reading, briefly acknowledge the challenge and offer a choice to receive help or pass the turn.",
        desiredOutcome: "Kai uses an appropriate option and escalation decreases.",
        trainingKey: "not_implemented"
      },
      {
        id: "kai_04",
        area: "Reinforce",
        short: "Appropriate help/pass request → honor it",
        detail: "Immediately honor an appropriate request for help or to pass.",
        full: "If Kai appropriately asks for help or to pass the turn during the routine, honor the request promptly and acknowledge the appropriate response.",
        desiredOutcome: "Kai remains in the activity without escalating.",
        trainingKey: "no_opportunity"
      },
      {
        id: "kai_05",
        area: "Recovery",
        short: "Return → regulation + structured re-entry",
        detail: "Offer Peace Corner, then support return to a manageable task with acknowledgment.",
        full: "After Kai returns and is calmer, offer the planned regulation space, support a manageable re-entry task, and acknowledge appropriate recovery/re-engagement.",
        desiredOutcome: "Kai regulates, returns to the classroom routine, and re-engages successfully.",
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
