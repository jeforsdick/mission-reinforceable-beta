/*******************************************************
 * Mission: Reinforceable — Google Apps Script Endpoint
 * - Receives POSTs from the game
 * - Writes clean mission-level rows to "Mission Runs"
 * - Writes one row per decision to "Choices"
 * - Keeps legacy Sheet1/log_json support for older history tools
 * - Keeps beta survey responses separate
 *******************************************************/

function doGet(e) {
  e = e || { parameter: {} };

  if (e.parameter && e.parameter.action === "history") {
    return getTeacherHistory_(e);
  }

  return jsonResponse_({
    ok: true,
    message: "Mission: Reinforceable endpoint is live. Send results via POST."
  });
}

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const raw = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    const data = JSON.parse(raw);

    if (data.action === "betaSurvey") {
      return handleBetaSurvey_(ss, data);
    }

    return handleMissionRun_(ss, data);
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  }
}

/*******************************************************
 * Mission run handler
 *******************************************************/

function handleMissionRun_(ss, data) {
  const session = normalizeMissionSession_(data);
  const choices = normalizeMissionChoices_(data, session);

  appendMissionRun_(ss, session, data);
  appendChoices_(ss, choices);
  appendCoachingReview_(ss, choices);
  appendLegacyMissionRun_(ss, data, choices);

  return jsonResponse_({
    ok: true,
    type: "missionRun",
    sessionId: session.sessionId,
    choicesReceived: choices.length
  });
}

function appendMissionRun_(ss, session, rawData) {
  const sheet = ss.getSheetByName("Mission Runs") || ss.insertSheet("Mission Runs");
  const headers = [
    "timestamp",
    "sessionId",
    "teacherId",
    "teacherName",
    "student",
    "mode",
    "modeLabel",
    "missionId",
    "missionTitle",
    "score",
    "maxScore",
    "accuracy",
    "durationSeconds",
    "activeDurationSeconds",
    "totalQuestions",
    "bestChoiceCount",
    "refineChoiceCount",
    "missedOpportunityCount",
    "missedReviewCount",
    "hintsUsed",
    "totalHintsOpened",
    "questionsWithHints",
    "hintUseRate",
    "screenWidth",
    "screenHeight",
    "userAgent",
    "raw_json"
  ];

  const finalHeaders = ensureHeaders_(sheet, headers);
  const row = buildRowFromHeaders_(finalHeaders, Object.assign({}, session, {
    raw_json: JSON.stringify(rawData)
  }));
  sheet.appendRow(row);
}

function appendChoices_(ss, choices) {
  const sheet = ss.getSheetByName("Choices") || ss.insertSheet("Choices");
  const headers = [
    "timestamp",
    "sessionId",
    "teacherId",
    "teacherName",
    "student",
    "mode",
    "modeLabel",
    "missionId",
    "missionTitle",
    "stepIndex",
    "stepId",
    "scenarioTitle",
    "scenarioText",
    "selectedAnswerText",
    "selectedScore",
    "selectedType",
    "resultLabel",
    "isBestChoice",
    "isReviewItem",
    "feedbackText",
    "bestAnswerText",
    "hintOpened",
    "hintOpenCount",
    "hintOpenedAt",
    "timeFromQuestionStartToHintMs",
    "timeFromHintToAnswerMs",
    "responseTimeMs"
  ];

  const finalHeaders = ensureHeaders_(sheet, headers);
  if (!choices.length) return;

  const rows = choices.map(choice => buildRowFromHeaders_(finalHeaders, choice));
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, finalHeaders.length).setValues(rows);
}

function appendCoachingReview_(ss, choices) {
  const reviewItems = choices.filter(choice => choice.isReviewItem === true);
  const sheet = ss.getSheetByName("Coaching Review") || ss.insertSheet("Coaching Review");
  const headers = [
    "timestamp",
    "sessionId",
    "teacherId",
    "teacherName",
    "student",
    "mode",
    "missionId",
    "missionTitle",
    "stepIndex",
    "stepId",
    "scenarioTitle",
    "selectedAnswerText",
    "selectedScore",
    "selectedType",
    "resultLabel",
    "feedbackText",
    "bestAnswerText",
    "hintOpened",
    "hintOpenCount",
    "timeFromQuestionStartToHintMs",
    "timeFromHintToAnswerMs",
    "responseTimeMs"
  ];

  const finalHeaders = ensureHeaders_(sheet, headers);
  if (!reviewItems.length) return;

  const rows = reviewItems.map(choice => buildRowFromHeaders_(finalHeaders, choice));
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, finalHeaders.length).setValues(rows);
}

function appendLegacyMissionRun_(ss, data, choices) {
  const sheet = ss.getSheetByName("Sheet1") || ss.insertSheet("Sheet1");
  const headers = [
    "timestamp",
    "teacher_code",
    "student",
    "mode",
    "session_id",
    "points",
    "max_possible",
    "percent",
    "log_json"
  ];

  const finalHeaders = ensureHeaders_(sheet, headers);
  const missionData = {
    timestamp: data.timestamp || (data.session && data.session.timestamp) || new Date().toISOString(),
    teacher_code: data.teacher_code || data.teacherId || (data.session && data.session.teacherId) || "—",
    student: data.student || "",
    mode: data.mode || (data.session && data.session.mode) || "",
    session_id: data.session_id || data.id || (data.session && data.session.sessionId) || "",
    points: numberOrBlank_(data.points != null ? data.points : (data.score != null ? data.score : data.session && data.session.score)),
    max_possible: numberOrBlank_(data.max_possible != null ? data.max_possible : (data.maxScore != null ? data.maxScore : data.session && data.session.maxScore)),
    percent: numberOrBlank_(data.percent != null ? data.percent : (data.accuracy != null ? data.accuracy : data.session && data.session.accuracy)),
    log_json: JSON.stringify(choices || data.log || [])
  };

  const row = buildRowFromHeaders_(finalHeaders, missionData);
  sheet.appendRow(row);
}

/*******************************************************
 * Normalizers
 *******************************************************/

function normalizeMissionSession_(data) {
  const session = data.session || {};
  const rawChoices = Array.isArray(data.choices)
    ? data.choices
    : (Array.isArray(data.log)
      ? data.log
      : (Array.isArray(data.history)
        ? data.history
        : (data.rawRun && Array.isArray(data.rawRun.history) ? data.rawRun.history : [])));
  const counts = countScores_(rawChoices);

  return {
    timestamp: session.timestamp || data.timestamp || new Date().toISOString(),
    sessionId: session.sessionId || data.session_id || data.id || "",
    teacherId: session.teacherId || data.teacherId || data.teacher_code || "",
    teacherName: session.teacherName || data.teacherName || "",
    student: data.student || "",
    mode: session.mode || data.mode || "",
    modeLabel: session.modeLabel || data.modeLabel || "",
    missionId: session.missionId || data.missionId || "",
    missionTitle: session.missionTitle || data.missionTitle || "",
    score: numberOrBlank_(session.score != null ? session.score : (data.score != null ? data.score : data.points)),
    maxScore: numberOrBlank_(session.maxScore != null ? session.maxScore : (data.maxScore != null ? data.maxScore : data.max_possible)),
    accuracy: numberOrBlank_(session.accuracy != null ? session.accuracy : (data.accuracy != null ? data.accuracy : data.percent)),
    durationSeconds: numberOrBlank_(session.durationSeconds != null ? session.durationSeconds : data.durationSeconds),
    activeDurationSeconds: numberOrBlank_(session.activeDurationSeconds != null ? session.activeDurationSeconds : data.activeDurationSeconds),
    totalQuestions: numberOrDefault_(session.totalQuestions != null ? session.totalQuestions : data.totalQuestions, counts.totalQuestions),
    bestChoiceCount: numberOrDefault_(session.bestChoiceCount != null ? session.bestChoiceCount : data.bestChoiceCount, counts.bestChoiceCount),
    refineChoiceCount: numberOrDefault_(session.refineChoiceCount != null ? session.refineChoiceCount : data.refineChoiceCount, counts.refineChoiceCount),
    missedOpportunityCount: numberOrDefault_(session.missedOpportunityCount != null ? session.missedOpportunityCount : data.missedOpportunityCount, counts.missedOpportunityCount),
    missedReviewCount: numberOrDefault_(session.missedReviewCount != null ? session.missedReviewCount : data.missedReviewCount, counts.missedReviewCount),
    hintsUsed: booleanOrBlank_(session.hintsUsed != null ? session.hintsUsed : data.hintsUsed),
    totalHintsOpened: numberOrDefault_(session.totalHintsOpened != null ? session.totalHintsOpened : data.totalHintsOpened, countHintOpens_(rawChoices)),
    questionsWithHints: numberOrDefault_(session.questionsWithHints != null ? session.questionsWithHints : data.questionsWithHints, countQuestionsWithHints_(rawChoices)),
    hintUseRate: numberOrDefault_(session.hintUseRate != null ? session.hintUseRate : data.hintUseRate, rawChoices.length ? countQuestionsWithHints_(rawChoices) / rawChoices.length : 0),
    screenWidth: numberOrBlank_(session.screenWidth),
    screenHeight: numberOrBlank_(session.screenHeight),
    userAgent: session.userAgent || data.userAgent || ""
  };
}

function normalizeMissionChoices_(data, session) {
  const rawChoices = Array.isArray(data.choices)
    ? data.choices
    : (Array.isArray(data.log)
      ? data.log
      : (Array.isArray(data.history)
        ? data.history
        : (data.rawRun && Array.isArray(data.rawRun.history) ? data.rawRun.history : [])));

  return rawChoices.map((choice, index) => {
    const selectedScore = scoreNumber_(choice.selectedScore != null ? choice.selectedScore : (choice.score != null ? choice.score : choice.delta));
    const selectedType = choice.selectedType || choiceTypeForScore_(selectedScore);
    const resultLabel = choice.resultLabel || choice.result_label || choiceLabelForType_(selectedType);
    return {
      timestamp: session.timestamp,
      sessionId: choice.sessionId || session.sessionId,
      teacherId: choice.teacherId || session.teacherId,
      teacherName: session.teacherName,
      student: session.student,
      mode: session.mode,
      modeLabel: session.modeLabel,
      missionId: choice.missionId || session.missionId,
      missionTitle: session.missionTitle,
      stepIndex: numberOrDefault_(choice.stepIndex, index + 1),
      stepId: choice.stepId || choice.nodeId || "",
      scenarioTitle: choice.scenarioTitle || choice.scenario_title || "",
      scenarioText: choice.scenarioText || choice.scenario_text || choice.scene_text || choice.question_prompt || choice.context || choice.prompt || "",
      selectedAnswerText: choice.selectedAnswerText || choice.selected_answer || choice.choiceText || choice.choice || "",
      selectedScore: selectedScore,
      selectedType: selectedType,
      resultLabel: resultLabel,
      isBestChoice: selectedScore === 10,
      isReviewItem: selectedScore < 10,
      feedbackText: choice.feedbackText || choice.wizard_feedback || choice.feedback || choice.wizard || "",
      bestAnswerText: choice.bestAnswerText || choice.correct_answer || choice.bestChoiceText || "",
      hintOpened: booleanOrBlank_(choice.hintOpened),
      hintOpenCount: numberOrDefault_(choice.hintOpenCount, 0),
      hintOpenedAt: choice.hintOpenedAt || "",
      timeFromQuestionStartToHintMs: numberOrBlank_(choice.timeFromQuestionStartToHintMs),
      timeFromHintToAnswerMs: numberOrBlank_(choice.timeFromHintToAnswerMs),
      responseTimeMs: numberOrBlank_(choice.responseTimeMs)
    };
  });
}

function countScores_(choices) {
  const scores = (choices || []).map(choice => scoreNumber_(choice.selectedScore != null ? choice.selectedScore : (choice.score != null ? choice.score : choice.delta)));
  return {
    totalQuestions: scores.length,
    bestChoiceCount: scores.filter(score => score === 10).length,
    refineChoiceCount: scores.filter(score => score === 5).length,
    missedOpportunityCount: scores.filter(score => score === 0).length,
    missedReviewCount: scores.filter(score => score < 10).length
  };
}

function countHintOpens_(choices) {
  return (choices || []).reduce((sum, choice) => sum + numberOrDefault_(choice.hintOpenCount, 0), 0);
}

function countQuestionsWithHints_(choices) {
  return (choices || []).filter(choice => choice.hintOpened === true || String(choice.hintOpened).toLowerCase() === "true").length;
}

function scoreNumber_(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function choiceTypeForScore_(score) {
  if (score === 10) return "best";
  if (score === 5) return "refine";
  if (score === 0) return "missed";
  return score >= 10 ? "best" : score > 0 ? "refine" : "missed";
}

function choiceLabelForType_(type) {
  if (type === "best") return "Best Choice";
  if (type === "refine") return "Workable, but Refine";
  return "Missed Opportunity";
}

/*******************************************************
 * Beta survey handler
 *******************************************************/

function handleBetaSurvey_(ss, data) {
  const sheetName = "Beta Survey Responses";
  const sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);

  const headers = [
    "timestamp",
    "sessionId",
    "teacherId",
    "teacherName",
    "mode",
    "modeLabel",
    "missionId",
    "missionTitle",
    "score",
    "maxScore",
    "accuracy",
    "durationSeconds",
    "activeDurationSeconds",

    "testerRole",
    "device_type",

    "understoodTask",
    "bipClear",
    "choicesMadeMeThink",
    "feedbackHelpful",
    "easyToNavigate",
    "lookedPolished",
    "difficulty",
    "branchingClear",

    "resourcesEasyToFind",
    "resourcesShortEnough",
    "resourcesHelpful",
    "progressHelpful",
    "missedReviewHelpful",

    "confusingPart",
    "favoritePart",
    "changeSuggestion",
    "openComments",
    "permissionToUseFeedback",
    "follow_up_email",

    "screenWidth",
    "screenHeight",
    "userAgent",

    "choiceHistory",
    "scoreHistory",
    "branchPath",
    "totalQuestions",
    "bestChoiceCount",
    "refineChoiceCount",
    "missedOpportunityCount",
    "missedReviewCount",
    "neutralChoiceCount",
    "incorrectChoiceCount",
    "correctChoiceCount",
    "hintsUsed",
    "totalHintsOpened",
    "questionsWithHints",
    "hintUseRate",
    "perQuestionHintData",

    "raw_json"
  ];

  const finalHeaders = ensureHeaders_(sheet, headers);
  const betaData = Object.assign({}, data, {
    timestamp: data.timestamp || new Date().toISOString(),
    raw_json: JSON.stringify(data)
  });

  const row = buildRowFromHeaders_(finalHeaders, betaData);
  sheet.appendRow(row);

  return jsonResponse_({
    ok: true,
    type: "betaSurvey",
    received_device_type: data.device_type || "",
    received_follow_up_email: data.follow_up_email || ""
  });
}

/*******************************************************
 * Browser/history endpoint
 *******************************************************/

function getTeacherHistory_(e) {
  const teacher = String(e.parameter.teacher || "").trim();
  const student = String(e.parameter.student || "").trim();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sessionsSheet = ss.getSheetByName("Mission Runs") || ss.getSheetByName("Sheet1");
  const choicesSheet = ss.getSheetByName("Choices") || ss.getSheetByName("Mistakes");

  const sessions = sessionsSheet ? sheetToObjects_(sessionsSheet) : [];
  const decisions = choicesSheet ? sheetToObjects_(choicesSheet) : [];

  const filteredSessions = sessions.filter(row => {
    const rowTeacher = String(row.teacherId || row.teacher_code || row.Teacher || row.teacher || "").trim();
    const rowStudent = String(row.student || row.Student || "").trim();
    return rowTeacher === teacher && (!student || rowStudent === student);
  });

  const filteredDecisions = decisions.filter(row => {
    const rowTeacher = String(row.teacherId || row.Teacher || row.teacher_code || row.teacher || "").trim();
    const rowStudent = String(row.student || row.Student || "").trim();
    return rowTeacher === teacher && (!student || rowStudent === student);
  });

  return jsonResponse_({
    ok: true,
    teacher: teacher,
    student: student,
    sessions: filteredSessions,
    decisions: filteredDecisions
  });
}

/*******************************************************
 * Helpers
 *******************************************************/

function buildRowFromHeaders_(headers, data) {
  return headers.map(header => {
    const value = data[header];
    if (value === undefined || value === null) return "";
    if (Array.isArray(value) || typeof value === "object") return JSON.stringify(value);
    return value;
  });
}

function ensureHeaders_(sheet, headers) {
  const existingLastCol = Math.max(sheet.getLastColumn(), 1);
  const firstRow = sheet.getRange(1, 1, 1, existingLastCol).getValues()[0];
  const existingHeaders = firstRow.map(h => String(h || "").trim()).filter(Boolean);

  if (sheet.getLastRow() === 0 || existingHeaders.length === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return headers;
  }

  const updatedHeaders = existingHeaders.slice();
  headers.forEach(header => {
    if (!updatedHeaders.includes(header)) updatedHeaders.push(header);
  });

  sheet.getRange(1, 1, 1, updatedHeaders.length).setValues([updatedHeaders]);
  return updatedHeaders;
}

function sheetToObjects_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) return [];

  const headers = values[0].map(h => String(h || "").trim());

  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      if (!header) return;
      let value = row[index];
      if (value instanceof Date) value = value.toISOString();
      obj[header] = value;
    });
    return obj;
  });
}

function numberOrBlank_(value) {
  if (value === undefined || value === null || value === "") return "";
  const number = Number(value);
  return Number.isFinite(number) ? number : "";
}

function numberOrDefault_(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function booleanOrBlank_(value) {
  if (value === undefined || value === null || value === "") return "";
  return value === true || String(value).toLowerCase() === "true";
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/*******************************************************
 * Manual tests: run these in Apps Script editor
 *******************************************************/

function testMissionRunWrite_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  handleMissionRun_(ss, {
    action: "missionRun",
    session: {
      sessionId: "TEST-MISSION-SESSION",
      timestamp: new Date().toISOString(),
      teacherId: "test",
      teacherName: "Test Teacher",
      mode: "daily",
      modeLabel: "Daily Mission",
      missionId: "jordan-test",
      missionTitle: "Jordan Writing Mission",
      score: 25,
      maxScore: 50,
      accuracy: 50,
      totalQuestions: 5,
      bestChoiceCount: 1,
      refineChoiceCount: 3,
      missedOpportunityCount: 1,
      missedReviewCount: 4,
      hintsUsed: true,
      totalHintsOpened: 2,
      questionsWithHints: 1,
      hintUseRate: 0.2
    },
    choices: [
      {
        stepIndex: 1,
        stepId: "start",
        scenarioTitle: "Writing start",
        scenarioText: "Jordan pushes the paper away.",
        selectedAnswerText: "Offer help with one small first step.",
        selectedScore: 10,
        selectedType: "best",
        feedbackText: "This matched the plan.",
        bestAnswerText: "Offer help with one small first step.",
        hintOpened: true,
        hintOpenCount: 2,
        responseTimeMs: 12000
      },
      {
        stepIndex: 2,
        stepId: "followup",
        scenarioTitle: "Follow-up",
        scenarioText: "Jordan looks away from the task.",
        selectedAnswerText: "Give Jordan a quiet minute.",
        selectedScore: 5,
        selectedType: "refine",
        feedbackText: "Understandable, but it needs a clearer prompt back to the replacement skill.",
        bestAnswerText: "Prompt Jordan to ask for help or write one word.",
        hintOpened: false,
        hintOpenCount: 0,
        responseTimeMs: 9000
      }
    ]
  });
}

function testBetaSurveyWrite_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  handleBetaSurvey_(ss, {
    action: "betaSurvey",
    timestamp: new Date().toISOString(),
    sessionId: "TEST-SURVEY-SESSION",
    teacherId: "test",
    teacherName: "Test Teacher",
    mode: "test",
    modeLabel: "Test Mode",
    missionId: "test-mission",
    missionTitle: "Test Mission",
    score: 50,
    maxScore: 50,
    accuracy: 100,
    durationSeconds: 123,
    activeDurationSeconds: 100,
    testerRole: "Software/technology tester",
    device_type: "Desktop/laptop",
    understoodTask: "5",
    bipClear: "5",
    choicesMadeMeThink: "5",
    feedbackHelpful: "5",
    easyToNavigate: "5",
    lookedPolished: "5",
    difficulty: "Just right",
    resourcesHelpful: "5",
    missedReviewHelpful: "5",
    confusingPart: "Test confusing part",
    favoritePart: "Test favorite part",
    changeSuggestion: "Test suggestion",
    openComments: "Test comments",
    permissionToUseFeedback: "Yes",
    follow_up_email: "test@example.com",
    screenWidth: 1440,
    screenHeight: 900,
    userAgent: "Apps Script test",
    choiceHistory: [],
    scoreHistory: [],
    branchPath: [],
    totalQuestions: 5,
    bestChoiceCount: 5,
    refineChoiceCount: 0,
    missedOpportunityCount: 0,
    missedReviewCount: 0,
    neutralChoiceCount: 0,
    incorrectChoiceCount: 0,
    correctChoiceCount: 5
  });
}
