import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.env.SMOKE_ROOT
  ? path.resolve(process.env.SMOKE_ROOT)
  : path.resolve(import.meta.dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const configJs = fs.readFileSync(path.join(root, "config.js"), "utf8");
const js = fs.readFileSync(path.join(root, "app.js"), "utf8");
const adminHtml = fs.readFileSync(path.join(root, "admin.html"), "utf8");
const adminCss = fs.readFileSync(path.join(root, "admin.css"), "utf8");
const adminJs = fs.readFileSync(path.join(root, "admin.js"), "utf8");
const mockApiPath = path.join(root, "mock-api.js");
const hasMockApi = fs.existsSync(mockApiPath);
const mockApiJs = hasMockApi ? fs.readFileSync(mockApiPath, "utf8") : "";
const quizBlock = js.match(/const quiz = \[([\s\S]*?)\n\];/)?.[1] || "";
const questionCount = [...quizBlock.matchAll(/\n\s+question:/g)].length;
const questionTitles = [...quizBlock.matchAll(/question: "([^"]+)"/g)].map((match) => match[1]);
const expectedQuestionTitles = [
  "你觉得自己最明显的困扰是什么？",
  "你通常什么时候觉得脸更垮？",
  "你想先改善什么？",
  "你的上镜场景？",
  "能接受的方式？",
  "最近作息？",
  "颈肩状态？",
  "拍照习惯？",
  "妆造习惯？",
  "是否想获得 7 天方案？"
];

const ids = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
const screens = [...html.matchAll(/data-screen="([^"]+)"/g)].map((match) => match[1]);
const htmlRefs = [...html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)].map((match) => match[1]);
const cssRefs = [...css.matchAll(/url\(["']?(\.\/[^)"']+)/g)].map((match) => match[1]);
const jsRefs = [...js.matchAll(/["'`](\.\/assets\/[^"'`$]+)["'`]/g)].map((match) => match[1]);
const configRefs = [...configJs.matchAll(/["'`](\.\/assets\/[^"'`$]+)["'`]/g)].map((match) => match[1]);
const adminIds = [...adminHtml.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
const duplicateAdminIds = [...new Set(adminIds.filter((id, index) => adminIds.indexOf(id) !== index))];
const adminHtmlRefs = [...adminHtml.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)].map((match) => match[1]);
const adminCssRefs = [...adminCss.matchAll(/url\(["']?(\.\/[^)"']+)/g)].map((match) => match[1]);
const adminJsRefs = [...adminJs.matchAll(/["'`](\.\/assets\/[^"'`$]+)["'`]/g)].map((match) => match[1]);
const missingAssets = [...new Set([...htmlRefs, ...cssRefs, ...configRefs, ...jsRefs, ...adminHtmlRefs, ...adminCssRefs, ...adminJsRefs])]
  .filter((reference) => {
    const fileReference = reference.split(/[?#]/, 1)[0];
    return !fs.existsSync(path.resolve(root, fileReference));
  });

const requiredScreens = [
  "home",
  "quiz",
  "resultGate",
  "photo",
  "report",
  "urgent",
  "checkin",
  "plan",
  "poster"
];

const requiredLogic = [
  "reportProfile",
  "scoreCollapseTypes",
  "weightedTypeScore",
  "inspectImage",
  "photoSummary",
  "syncReportToApi",
  "syncPhotoToApi",
  "syncCheckinToApi",
  "loadRemoteAdminConfig",
  "activeQuiz",
  "loadUserReportsFromApi",
  "renderHomeHistory",
  "mockLoginToApi",
  "renderCheckin",
  "renderPosterCanvas",
  "drawPoster"
];
const requiredFlowSnippets = [
  'state.quizDone = true;',
  'go("photo");',
  'data-open-history',
  'screen === "report" && state.quizDone && !state.logged',
  'openLoginModal("report")'
];
const requiredReportDesignSnippets = [
  "report-visual-card",
  "report-portrait-panel",
  "report-card-reference-portrait.png",
  "report-basis-line",
  "基于文字问卷生成",
  "未上传照片",
  "根据问卷与照片质量辅助结果生成",
  "不识别身份",
  "hasUploadedPhotoAnalysis",
  "hasUserUpload",
  "reportPhotoButton",
  'toggleAttribute("hidden", hasUploadedPhotoAnalysis)',
  "report-score-value",
  "report-score-total",
  "report-disclaimer",
  "补传照片增强分析"
];
const requiredReportStyleSnippets = [
  ".screen[data-screen=\"report\"]",
  ".report-visual-card",
  "margin: 0 0 24px",
  ".screen[data-screen=\"report\"] .page-header.simple",
  "position: sticky",
  ".report-score-value",
  ".factor-item .factor-index",
  ".report-basis-line + .report-basis-line",
  ".screen[data-screen=\"report\"] .plan-cta .button.primary",
  ".factor-card::before",
  ".report-disclaimer"
];

const missingScreens = requiredScreens.filter((screen) => !screens.includes(screen));
const missingLogic = requiredLogic.filter((name) => !js.includes(`function ${name}`));
const missingFlow = requiredFlowSnippets.filter((snippet) => !js.includes(snippet));
const requiredAdminSnippets = [
  "后台管理 MVP",
  "data-panel=\"overview\"",
  "data-panel=\"users\"",
  "data-panel=\"members\"",
  "data-panel=\"questions\"",
  "data-save-questions",
  "data-reset-questions",
  "data-panel=\"rules\"",
  "data-panel=\"content\"",
  "用户垮脸类型参数配置",
  "collapseTypeConfig",
  "报告内容配置",
  "contentTypeSelect",
  "contentEditor",
  "data-save-content",
  "用户报告管理",
  "reportFilters",
  "reportDetail",
  "resetUserFilters",
  "用户管理",
  "memberFilters",
  "memberSearch",
  "memberReportFilter",
  "memberStageFilter",
  "memberTable",
  "memberDetail",
  "exportMembersCsv",
  "exportReportsCsv"
];
const requiredConfigSnippets = [
  "faceRescueAdminConfigV1",
  "readKuailianAdminConfig",
  "writeKuailianAdminConfig",
  "collapseTypeParams",
  "questionBank",
  "normalizeQuestionBank",
  "typeAdvice",
  "typePlans",
  "advice:",
  "plan:"
];
const collapseTypeBlock = configJs.match(/const collapseTypeParams = \[([\s\S]*?)\n\s+\];/)?.[1] || "";
const collapseTypeCount = [...collapseTypeBlock.matchAll(/\n\s+{\n\s+id:/g)].length;
const failures = {
  duplicateIds,
  duplicateAdminIds,
  missingAssets,
  missingScreens,
  missingLogic,
  missingFlow,
  missingReportDesign: requiredReportDesignSnippets.filter((snippet) => !html.includes(snippet) && !js.includes(snippet)),
  wrongReportHeroImage: html.includes("report-card-reference-portrait.png") ? [] : ["report hero should use the illustrated reference portrait"],
  missingReportStyles: requiredReportStyleSnippets.filter((snippet) => !css.includes(snippet)),
  missingAdmin: requiredAdminSnippets.filter((snippet) => !adminHtml.includes(snippet)),
  missingConfig: requiredConfigSnippets.filter((snippet) => !configJs.includes(snippet)),
  missingSharedConfigScripts: ["config.js?v=20260618-1"].filter((snippet) => !html.includes(snippet) || !adminHtml.includes(snippet)),
  missingAdminLogic: ["apiRequest", "loadReportsFromApi", "loadMembersFromApi", "loadMemberDetail", "saveMemberMetaToApi", "memberStageLabel", "applyMemberFilters", "renderMemberFilters", "renderMembers", "renderMemberDetail", "saveReportNoteToApi", "loadAdminConfigFromApi", "persistAdminConfig", "renderKpis", "parseReportDate", "realTrendData", "reportSourceLabel", "renderUsers", "renderReportDetail", "renderQuestions", "collectQuestionBank", "saveQuestionBankConfig", "resetQuestionBankConfig", "renderTypeParams", "saveTypeParams", "renderContentEditor", "saveContentConfig", "downloadCsv", "exportReportsCsv", "exportMembersCsv", "exportConfig"].filter((name) => !adminJs.includes(`function ${name}`)),
  missingMockApi: hasMockApi
    ? ["/api/admin/reports", "/api/admin/reports/:id/note", "/api/auth/mock-login", "/api/admin/users", "updateUserMeta", "stage TEXT", "note TEXT", "/api/reports", "/photo", "/checkin", "CREATE TABLE IF NOT EXISTS users", "user_id", "report_events", "admin_config", "sqlite3", "kuailian.sqlite", "Access-Control-Allow-Origin"].filter((snippet) => {
      const needle = snippet === "/api/admin/reports/:id/note" ? "/note" : snippet;
      return !mockApiJs.includes(needle);
    })
    : [],
  collapseTypeCount: collapseTypeCount === 6 ? [] : [`expected 6 collapse face types, found ${collapseTypeCount}`],
  questionCount: questionCount === 10 ? [] : [`expected 10 questions, found ${questionCount}`],
  questionOrder: JSON.stringify(questionTitles) === JSON.stringify(expectedQuestionTitles)
    ? []
    : ["question titles or order differ from the PRD"]
};

console.log(JSON.stringify({
  screens,
  assetReferences: new Set([...htmlRefs, ...cssRefs, ...configRefs, ...jsRefs]).size,
  questionCount,
  questionTitles,
  javascriptBytes: Buffer.byteLength(js),
  configJavascriptBytes: Buffer.byteLength(configJs),
  adminJavascriptBytes: Buffer.byteLength(adminJs),
  mockApiJavascriptBytes: Buffer.byteLength(mockApiJs),
  collapseTypeCount,
  failures
}, null, 2));

if (Object.values(failures).some((items) => items.length > 0)) {
  process.exit(1);
}
