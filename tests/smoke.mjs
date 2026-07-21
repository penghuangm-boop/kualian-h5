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
const buildDistPath = path.join(root, "scripts/build-dist.mjs");
const buildDistJs = fs.existsSync(buildDistPath) ? fs.readFileSync(buildDistPath, "utf8") : "";
const legalPageFiles = ["privacy.html", "terms.html", "disclaimer.html", "contact.html"];
const icpNumber = "浙ICP备2026055373号";
const legalPages = Object.fromEntries(legalPageFiles.map((file) => {
  const pagePath = path.join(root, file);
  return [file, fs.existsSync(pagePath) ? fs.readFileSync(pagePath, "utf8") : ""];
}));
const mockApiPath = path.join(root, "mock-api.js");
const hasMockApi = fs.existsSync(mockApiPath);
const mockApiJs = hasMockApi ? fs.readFileSync(mockApiPath, "utf8") : "";
const envExamplePath = path.join(root, ".env.example");
const hasEnvExample = fs.existsSync(envExamplePath);
const envExample = hasEnvExample ? fs.readFileSync(envExamplePath, "utf8") : "";
const nginxDeployPath = path.join(root, "deploy/nginx-faceok.conf");
const nginxDeployConfig = fs.existsSync(nginxDeployPath) ? fs.readFileSync(nginxDeployPath, "utf8") : "";
const nginxHttpsDeployPath = path.join(root, "deploy/nginx-faceok-https.conf");
const nginxHttpsDeployConfig = fs.existsSync(nginxHttpsDeployPath) ? fs.readFileSync(nginxHttpsDeployPath, "utf8") : "";
const deployScriptPath = path.join(root, "scripts/deploy-production.sh");
const deployScript = fs.existsSync(deployScriptPath) ? fs.readFileSync(deployScriptPath, "utf8") : "";
const httpsSetupScriptPath = path.join(root, "scripts/setup-https.sh");
const httpsSetupScript = fs.existsSync(httpsSetupScriptPath) ? fs.readFileSync(httpsSetupScriptPath, "utf8") : "";
const serverFiles = {
  index: path.join(root, "server/index.js"),
  config: path.join(root, "server/config.js"),
  db: path.join(root, "server/db.js"),
  http: path.join(root, "server/http.js"),
  authRoutes: path.join(root, "server/routes/auth.js"),
  reportRoutes: path.join(root, "server/routes/reports.js"),
  adminRoutes: path.join(root, "server/routes/admin.js"),
  wechatRoutes: path.join(root, "server/routes/wechat.js"),
  paymentRoutes: path.join(root, "server/routes/payments.js"),
  wechatService: path.join(root, "server/services/wechat.js"),
  paymentService: path.join(root, "server/services/payments.js")
};
const serverSources = Object.fromEntries(Object.entries(serverFiles).map(([key, file]) => [
  key,
  fs.existsSync(file) ? fs.readFileSync(file, "utf8") : ""
]));
const backendSource = [mockApiJs, ...Object.values(serverSources)].join("\n");
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
      return !backendSource.includes(needle);
    })
    : [],
  missingWechatBackend: hasMockApi
    ? [
      "readWechatConfig",
      "createWechatOAuthUrl",
      "handleWechatCallback",
      "getSessionFromRequest",
      "createPaymentOrder",
      "handlePaymentNotify",
      "/api/wechat/config",
      "/api/wechat/oauth-url",
      "/api/wechat/callback",
      "/api/auth/session",
      "/api/pay/orders",
      "/api/pay/notify",
      "WECHAT_MODE",
      "WECHAT_PAY_MODE"
    ].filter((snippet) => !backendSource.includes(snippet))
    : [],
  missingWechatFrontend: [
    "loadWechatRuntimeConfig",
    "loginWithWechatOrMock",
    "createPaymentOrder",
    "startSevenDayPlan",
    "/api/wechat/config",
    "/api/wechat/oauth-url",
    "/api/pay/orders",
    "微信授权登录",
    "模拟支付成功"
  ].filter((snippet) => !js.includes(snippet) && !html.includes(snippet)),
  missingEnvExample: hasMockApi
    ? hasEnvExample
      ? [
      "NODE_ENV=development",
      "WECHAT_MODE=mock",
      "WECHAT_APP_ID=",
      "WECHAT_APP_SECRET=",
      "WECHAT_OAUTH_REDIRECT_URI=",
      "WECHAT_PAY_MODE=mock",
      "WECHAT_MCH_ID=",
      "WECHAT_PAY_API_V3_KEY=",
      "WECHAT_PAY_PRIVATE_KEY_PATH=",
      "PUBLIC_BASE_URL=",
      "DATA_DIR=",
      "KUAILIAN_DB_PATH="
      ].filter((snippet) => !envExample.includes(snippet))
      : [".env.example missing"]
    : [],
  missingProductionServer: hasMockApi
    ? Object.entries(serverFiles)
      .filter(([, file]) => !fs.existsSync(file))
      .map(([key]) => `${key} missing`)
    : [],
  missingOrderModel: hasMockApi
    ? [
      "CREATE TABLE IF NOT EXISTS orders",
      "product_code TEXT NOT NULL",
      "status TEXT NOT NULL",
      "pay_mode TEXT NOT NULL",
      "wechat_prepay_id TEXT",
      "transaction_id TEXT",
      "paid_at TEXT",
      "createOrder",
      "markOrderPaid",
      "listOrders"
    ].filter((snippet) => !backendSource.includes(snippet))
    : [],
  missingOrderRoutes: hasMockApi
    ? [
      "createPaymentOrder",
      "handlePaymentNotify",
      "GET",
      "/api/admin/orders",
      "/api/admin/orders/:id",
      "/api/pay/orders",
      "/api/pay/notify",
      "paid_mock"
    ].filter((snippet) => {
      const paymentSource = serverSources.paymentRoutes + serverSources.paymentService + serverSources.adminRoutes;
      return !paymentSource.includes(snippet);
    })
    : [],
  missingMockApiWrapper: hasMockApi
    ? ["require(\"./server/index\")", "startServer"].filter((snippet) => !mockApiJs.includes(snippet))
    : [],
  missingComplianceLinks: [
    "privacy.html",
    "terms.html",
    "disclaimer.html",
    "contact.html",
    icpNumber,
    "https://beian.miit.gov.cn/",
    "support@faceok.cn"
  ].filter((snippet) => !html.includes(snippet)),
  missingCompliancePages: legalPageFiles
    .filter((file) => legalPages[file].length === 0)
    .concat([
      ["privacy.html", "隐私政策"],
      ["privacy.html", "个人信息"],
      ["privacy.html", "不识别身份"],
      ["terms.html", "用户协议"],
      ["terms.html", "非医疗诊断"],
      ["disclaimer.html", "免责声明"],
      ["disclaimer.html", "仅供参考"],
      ["contact.html", "联系我们"],
      ["contact.html", "support@faceok.cn"],
      ["contact.html", icpNumber],
      ["contact.html", "https://beian.miit.gov.cn/"]
    ].filter(([file, snippet]) => !legalPages[file].includes(snippet)).map(([file, snippet]) => `${file}:${snippet}`)),
  lingeringIcpPlaceholder: [html, ...Object.values(legalPages)].some((source) => source.includes("备案中"))
    ? ["ICP备案号 should not say 备案中 after filing is approved"]
    : [],
  missingComplianceBuildEntries: buildDistJs
    ? legalPageFiles.filter((file) => !buildDistJs.includes(`"${file}"`))
    : [],
  missingAdminProtectionTemplate: buildDistJs ? [
    "auth_basic",
    "auth_basic_user_file /etc/nginx/.htpasswd-faceok-admin;",
    "location ^~ /.well-known/acme-challenge/",
    "location = /admin.html",
    "location = /admin.js",
    "location = /admin.css",
    "location ^~ /api/admin/",
    "proxy_pass http://127.0.0.1:4174/api/admin/"
  ].filter((snippet) => !nginxDeployConfig.includes(snippet)) : [],
  missingProductionConfigValidation: hasMockApi
    ? [
      "validateProductionConfig",
      "assertProductionConfig",
      "PUBLIC_BASE_URL must use https:// in production.",
      "WECHAT_APP_ID is required when WECHAT_MODE=wechat.",
      "WECHAT_PAY_API_V3_KEY is required when WECHAT_PAY_MODE=wechat_jsapi.",
      "WECHAT_PAY_NOTIFY_URL is required when WECHAT_PAY_MODE=wechat_jsapi.",
      "Production configuration error"
    ].filter((snippet) => !backendSource.includes(snippet))
    : [],
  missingDeployScript: buildDistJs ? [
    "scripts/build-dist.mjs",
    "/var/www/faceok",
    "deploy/nginx-faceok.conf",
    "nginx -t",
    "systemctl reload nginx",
    "pm2 restart",
    "pm2 save",
    "rsync",
    "set -euo pipefail"
  ].filter((snippet) => !deployScript.includes(snippet)) : [],
  missingHttpsTemplate: buildDistJs ? [
    "listen 443 ssl http2;",
    "listen 80;",
    "return 301 https://$host$request_uri;",
    "ssl_certificate /etc/letsencrypt/live/faceok.cn/fullchain.pem;",
    "ssl_certificate_key /etc/letsencrypt/live/faceok.cn/privkey.pem;",
    "location ^~ /.well-known/acme-challenge/",
    "location ^~ /api/admin/",
    "auth_basic_user_file /etc/nginx/.htpasswd-faceok-admin;",
    "proxy_set_header X-Forwarded-Proto $scheme;",
    "try_files $uri $uri/ /index.html;"
  ].filter((snippet) => !nginxHttpsDeployConfig.includes(snippet)) : [],
  missingHttpsSetupScript: buildDistJs ? [
    "CERTBOT_EMAIL",
    "certbot certonly --webroot",
    "--agree-tos",
    "--non-interactive",
    "deploy/nginx-faceok.conf",
    "deploy/nginx-faceok-https.conf",
    "nginx -t",
    "systemctl reload nginx",
    "certbot renew --dry-run",
    "set -euo pipefail"
  ].filter((snippet) => !httpsSetupScript.includes(snippet)) : [],
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
