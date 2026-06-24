const STORAGE_KEY = "faceRescueMvpV1";
const APP_API_BASE = "http://127.0.0.1:4174";

const resetRequested = new URLSearchParams(location.search).get("reset") === "1";
if (resetRequested) {
  localStorage.removeItem(STORAGE_KEY);
  history.replaceState(null, "", `${location.pathname}#home`);
}

const defaultState = {
  quizSchemaVersion: 2,
  logged: false,
  userId: null,
  userName: null,
  quizDone: false,
  answers: [],
  supplements: [],
  photoAnalyzed: false,
  photoSummary: null,
  backendReportId: null,
  activeHistoryReport: null,
  userReports: [],
  reportSaved: false,
  day: 1,
  completedDays: 0,
  taskChecks: {},
  selectedScenario: "约会"
};

let saved = {};
try {
  saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
} catch {
  saved = {};
}
const state = { ...defaultState, ...saved };
state.answers = Array.isArray(saved.answers) ? saved.answers : [];
state.supplements = Array.isArray(saved.supplements) ? saved.supplements : [];
state.userReports = Array.isArray(saved.userReports) ? saved.userReports : [];
state.taskChecks = saved.taskChecks && typeof saved.taskChecks === "object" ? saved.taskChecks : {};
if (saved.quizSchemaVersion !== defaultState.quizSchemaVersion) {
  state.quizSchemaVersion = defaultState.quizSchemaVersion;
  state.quizDone = false;
  state.answers = [];
  state.photoAnalyzed = false;
  state.photoSummary = null;
  state.backendReportId = null;
  state.activeHistoryReport = null;
  state.userReports = [];
  state.reportSaved = false;
}

const validScreens = new Set([
  "home",
  "quiz",
  "resultGate",
  "photo",
  "report",
  "urgent",
  "checkin",
  "plan",
  "poster"
]);
const requestedInitialScreen = validScreens.has(location.hash.slice(1)) ? location.hash.slice(1) : "home";
const initialScreen = requestedInitialScreen === "resultGate" ? "photo" : requestedInitialScreen;
const historyStack = [initialScreen];
let currentScreen = initialScreen;
let questionIndex = 0;
let uploads = [];
let toastTimer;
let postLoginScreen = null;

async function apiRequest(path, options = {}) {
  const response = await fetch(`${APP_API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!response.ok) throw new Error(`API ${response.status}`);
  return response.json();
}

async function loadRemoteAdminConfig() {
  try {
    const payload = await apiRequest("/api/admin/config/app-config");
    if (payload.value && window.writeKuailianAdminConfig) {
      window.writeKuailianAdminConfig(payload.value);
      renderAll();
    }
  } catch {
    // The H5 must keep working when the local API is not running.
  }
}

async function mockLoginToApi() {
  try {
    const result = await apiRequest("/api/auth/mock-login", {
      method: "POST",
      body: JSON.stringify({
        userId: state.userId,
        nickname: state.userName || "微信模拟用户"
      })
    });
    if (result.user?.id) {
      state.userId = result.user.id;
      state.userName = result.user.nickname;
      saveState();
    }
    return result.user;
  } catch {
    return null;
  }
}

async function loadUserReportsFromApi() {
  if (!state.userId) return [];
  try {
    const payload = await apiRequest(`/api/admin/users/${encodeURIComponent(state.userId)}`);
    state.userReports = Array.isArray(payload.reports) ? payload.reports : [];
    saveState();
    renderHome();
    return state.userReports;
  } catch {
    return state.userReports || [];
  }
}

async function syncReportToApi() {
  try {
    const profile = reportProfile();
    const payload = {
      id: state.backendReportId,
      userId: state.userId,
      name: state.logged ? "微信登录用户" : "H5 测评用户",
      logged: state.logged,
      answers: state.answers,
      supplements: state.supplements,
      report: {
        type: profile.type,
        level: profile.level,
        factors: profile.factors,
        metrics: profile.metrics
      }
    };
    const result = await apiRequest("/api/reports", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    if (result.report?.id) {
      state.backendReportId = result.report.id;
      state.activeHistoryReport = null;
      saveState();
      await loadUserReportsFromApi();
    }
    return result.report;
  } catch {
    return null;
  }
}

async function syncPhotoToApi(summary) {
  if (!state.backendReportId) await syncReportToApi();
  if (!state.backendReportId) return null;
  try {
    const result = await apiRequest(`/api/reports/${encodeURIComponent(state.backendReportId)}/photo`, {
      method: "PUT",
      body: JSON.stringify({ photoSummary: summary })
    });
    return result.report;
  } catch {
    return null;
  }
}

async function syncCheckinToApi() {
  if (!state.backendReportId) await syncReportToApi();
  if (!state.backendReportId) return null;
  try {
    const result = await apiRequest(`/api/reports/${encodeURIComponent(state.backendReportId)}/checkin`, {
      method: "PUT",
      body: JSON.stringify({
        day: state.day,
        completedDays: state.completedDays,
        taskChecks: state.taskChecks
      })
    });
    return result.report;
  } catch {
    return null;
  }
}

const quiz = [
  {
    question: "你觉得自己最明显的困扰是什么？",
    options: [
      ["法令纹明显", "fatigue", "face-lines.png"],
      ["下颌线模糊", "posture", "face-jaw.png"],
      ["面中凹陷", "fatigue", "face-mid.png"],
      ["嘴角下垂", "fatigue", "face-mouth.png"],
      ["早晚都浮肿", "puff", "face-puff.png"],
      ["拍照显老", "camera", "face-photo.png"]
    ]
  },
  {
    question: "你通常什么时候觉得脸更垮？",
    options: [
      ["早上起床", "puff", "face-puff.png"],
      ["晚上下班", "fatigue", "face-mid.png"],
      ["拍照时", "camera", "face-photo.png"],
      ["视频通话", "camera", "face-jaw.png"],
      ["吃咸之后", "puff", "face-puff.png"],
      ["熬夜之后", "fatigue", "face-lines.png"]
    ]
  },
  {
    question: "你想先改善什么？",
    options: [
      ["当天状态", "fatigue", "face-mid.png"],
      ["下颌线", "posture", "face-jaw.png"],
      ["妆造问题", "camera", "face-mouth.png"],
      ["拍照角度", "camera", "face-photo.png"],
      ["作息水肿", "puff", "face-puff.png"],
      ["精神感", "fatigue", "face-lines.png"]
    ]
  },
  {
    question: "你的上镜场景？",
    options: [
      ["自拍", "camera", "face-photo.png"],
      ["短视频", "camera", "face-jaw.png"],
      ["面试", "posture", "face-mid.png"],
      ["约会聚会", "fatigue", "face-mouth.png"],
      ["证件照", "camera", "face-photo.png"],
      ["旅行拍照", "camera", "face-photo.png"]
    ]
  },
  {
    question: "能接受的方式？",
    options: [
      ["冷敷消肿", "puff", "face-puff.png"],
      ["按摩护理", "puff", "face-jaw.png"],
      ["妆容修饰", "camera", "face-mouth.png"],
      ["姿态训练", "posture", "face-jaw.png"],
      ["每日打卡", "balanced", "face-mid.png"],
      ["状态记录", "balanced", "face-photo.png"]
    ]
  },
  {
    question: "最近作息？",
    options: [
      ["经常熬夜", "fatigue", "face-lines.png"],
      ["睡眠不足", "fatigue", "face-mid.png"],
      ["还算规律", "balanced", "face-mouth.png"],
      ["睡前刷手机", "posture", "face-jaw.png"],
      ["偶尔饮酒", "puff", "face-puff.png"],
      ["饮水偏少", "fatigue", "face-lines.png"]
    ]
  },
  {
    question: "颈肩状态？",
    options: [
      ["长期低头", "posture", "face-jaw.png"],
      ["久坐办公", "posture", "face-jaw.png"],
      ["有颈前伸", "posture", "face-jaw.png"],
      ["肩颈紧张", "posture", "face-mid.png"],
      ["状态正常", "balanced", "face-mouth.png"],
      ["不太确定", "balanced", "face-photo.png"]
    ]
  },
  {
    question: "拍照习惯？",
    options: [
      ["低机位", "camera", "face-jaw.png"],
      ["正脸多", "camera", "face-lines.png"],
      ["侧脸多", "balanced", "face-jaw.png"],
      ["开重滤镜", "camera", "face-photo.png"],
      ["不太会拍", "camera", "face-photo.png"],
      ["经常视频", "posture", "face-mid.png"]
    ]
  },
  {
    question: "妆造习惯？",
    options: [
      ["很少化妆", "fatigue", "face-lines.png"],
      ["底妆为主", "balanced", "face-mid.png"],
      ["腮红低位", "fatigue", "face-mouth.png"],
      ["喜欢披发", "camera", "face-photo.png"],
      ["常扎头发", "balanced", "face-jaw.png"],
      ["不确定", "balanced", "face-photo.png"]
    ]
  },
  {
    question: "是否想获得 7 天方案？",
    options: [
      ["想系统改善", "balanced", "face-mid.png"],
      ["先看报告", "balanced", "face-photo.png"],
      ["有重要场合", "camera", "face-lines.png"],
      ["想打卡", "balanced", "face-mouth.png"],
      ["想看对比", "camera", "face-photo.png"],
      ["暂不确定", "balanced", "face-jaw.png"]
    ]
  }
];

function activeQuiz() {
  const config = appAdminConfig();
  const configured = Array.isArray(config.questionBank) ? config.questionBank : [];
  const enabledQuestions = configured
    .filter((item) => item && item.enabled !== false)
    .map((item) => ({
      question: item.question,
      options: (Array.isArray(item.options) ? item.options : [])
        .map((option) => [
          option.label,
          option.type,
          option.image || "face-photo.png"
        ])
        .filter(([label, type]) => label && type)
    }))
    .filter((item) => item.question && item.options.length);
  return enabledQuestions.length ? enabledQuestions : quiz;
}

const supplementOptions = [
  ["经常熬夜", "fatigue"],
  ["长期低头", "posture"],
  ["晚餐偏咸", "puff"],
  ["有颈前伸", "posture"]
];

const uploadSlots = [
  { label: "正脸照", hint: "点击上传", image: "./assets/photo-page/upload-front.png", position: "center" },
  { label: "45°侧脸照", hint: "点击上传", image: "./assets/photo-page/upload-angle.png", position: "center" },
  { label: "侧面/下颌线", hint: "点击上传", image: "./assets/photo-page/upload-side.png", position: "center" }
];

const scenarioData = {
  "约会": [
    ["前一晚少盐、尽量早睡", "第二天的清爽感从前一晚开始，不临时用力按脸。"],
    ["妆前提亮眼下三角区", "把视觉重心往上移，腮红位置略高一些。"],
    ["提前测试 45° 高机位", "找到更显精神的一侧，避免低机位正脸。"]
  ],
  "面试": [
    ["先调整头颈姿态", "进门前做 30 秒靠墙站姿，让肩颈更舒展。"],
    ["底妆保持干净清爽", "重点提亮眼下与面中，不堆叠明显高光。"],
    ["练习自然轻微微笑", "嘴角轻提、眼神稳定，状态比表情幅度更重要。"]
  ],
  "证件照": [
    ["提前确认拍摄角度", "下巴微收、头顶向上提，避免低头压下颌。"],
    ["提高面中亮度", "眼下三角区和鼻翼旁轻提亮，减少疲惫感。"],
    ["发型露出脸部轮廓", "保留少量碎发修饰，但不要遮住下颌线。"]
  ],
  "直播": [
    ["先调好正面柔光", "灯光略高于眼睛，避免顶光和下方光。"],
    ["镜头略高于视线", "手机或摄像头抬高一点，减少下半脸沉重感。"],
    ["开播前做表情热身", "轻轻活动嘴角和颈部，让状态进入得更自然。"]
  ]
};

const planDays = [
  ["消肿启动日", ["温水与轻冷敷", "妆前提亮", "少盐早睡"]],
  ["姿态纠偏日", ["靠墙站姿", "手机抬高", "测试高机位"]],
  ["妆造优化日", ["提亮眼下", "腮红上移", "保持颅顶蓬松"]],
  ["轮廓唤醒日", ["肩颈拉伸", "轻柔护理", "短时轻有氧"]],
  ["拍照训练日", ["测试三组角度", "嘴角轻提", "使用侧前方光"]],
  ["场景预演日", ["10 分钟准备", "记录有效动作", "避免重复用力按摩"]],
  ["复盘巩固日", ["同角度对比", "保留 3 个长期动作", "形成维护清单"]]
];

const iconPaths = {
  cold: "./assets/icons/task-cold.png",
  phone: "./assets/icons/task-phone.png",
  moon: "./assets/icons/task-moon.png",
  score: "./assets/icons/feature-score.png",
  reason: "./assets/icons/feature-reason.png",
  advice: "./assets/icons/feature-advice.png"
};

const taskTemplates = {
  posture: [
    [iconPaths.phone, "手机抬高使用", "减少持续低头带来的姿态压缩感。"],
    [iconPaths.reason, "30 秒靠墙站姿", "让头顶向上、肩颈回到舒展位置。"],
    [iconPaths.advice, "测试 45° 高机位", "找到更适合自己的镜头高度。"]
  ],
  puff: [
    [iconPaths.cold, "轻冷敷 3 分钟", "帮助晨间状态更清爽，不要过度冰敷。"],
    [iconPaths.advice, "今天减少高盐饮食", "把调整放到下一餐，而不是临时补救。"],
    [iconPaths.moon, "23:30 前准备入睡", "为第二天的上镜状态留出恢复时间。"]
  ],
  fatigue: [
    [iconPaths.advice, "提亮眼下三角区", "把视觉重心向上移动，减少疲惫感。"],
    [iconPaths.cold, "闭眼休息 5 分钟", "让眼周与表情先放松下来。"],
    [iconPaths.moon, "今晚提前 30 分钟睡", "优先处理最直接的状态来源。"]
  ],
  camera: [
    [iconPaths.advice, "镜头略高于视线", "减少低机位对下半脸的放大。"],
    [iconPaths.reason, "寻找侧前方柔光", "避免顶光和下方光造成明显阴影。"],
    [iconPaths.score, "记录最自然的角度", "保留一组以后可以直接复用的机位。"]
  ],
  makeup: [
    [iconPaths.advice, "腮红位置上移", "把视觉重心拉回面中和眼下，减少下沉感。"],
    [iconPaths.score, "提亮眼下三角区", "让面中更干净，照片里会更有精神。"],
    [iconPaths.reason, "发型露出下颌线", "避免发丝压住脸侧，让轮廓更清爽。"]
  ],
  contour: [
    [iconPaths.phone, "先做肩颈舒展", "让下颌线和颈部线条不要被姿态压住。"],
    [iconPaths.cold, "短时轻冷敷", "帮助下半脸和面中状态更清爽。"],
    [iconPaths.advice, "测试侧前方柔光", "用光线保留轮廓，不靠重滤镜修饰。"]
  ]
};

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private browsing or a full storage quota should not block the core flow.
  }
}

function $(selector, scope = document) {
  return scope.querySelector(selector);
}

function $all(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      if (!toast.classList.contains("show")) toast.textContent = "";
    }, 220);
  }, 1800);
}

function openModal(content) {
  $("#modalContent").innerHTML = content;
  $("#modalMask").hidden = false;
  $("#modalClose").focus();
}

function closeModal() {
  $("#modalMask").hidden = true;
}

function openLoginModal(destination = null) {
  if (!$("#modalMask").hidden && $("#confirmLogin")) return;
  postLoginScreen = destination;
  const isReportLogin = destination === "report";
  openModal(`
    <span class="eyebrow">微信登录</span>
    <h2>${isReportLogin ? "登录后查看个人报告" : "保存你的状态档案"}</h2>
    <p>${isReportLogin
      ? "登录用于保存测评结果、照片辅助结论和 7 天进度。完成登录后将自动进入你的个人报告。"
      : "当前版本只在本机浏览器保存状态，不会连接或获取真实微信账户信息。"}</p>
    <button class="button wechat" type="button" id="confirmLogin">模拟微信登录</button>
  `);
}

function setScreen(screen) {
  if (!validScreens.has(screen)) screen = "home";
  if (screen === "resultGate") screen = "photo";
  const blockedReport = screen === "report" && state.quizDone && !state.logged;
  if (blockedReport) {
    screen = "photo";
    history.replaceState({ screen }, "", "#photo");
  }
  currentScreen = screen;
  $all(".screen").forEach((el) => el.classList.toggle("active", el.dataset.screen === screen));
  window.scrollTo({ top: 0, behavior: "auto" });
  renderAll();
  if (blockedReport) openLoginModal("report");
}

function go(screen, { replace = false } = {}) {
  if (!validScreens.has(screen)) screen = "home";
  if (screen === "resultGate") screen = "photo";
  if (screen === "report" && state.quizDone && !state.logged) {
    openLoginModal("report");
    return;
  }
  if (replace) {
    historyStack[historyStack.length - 1] = screen;
    history.replaceState({ screen }, "", `#${screen}`);
  } else if (screen !== currentScreen) {
    historyStack.push(screen);
    history.pushState({ screen }, "", `#${screen}`);
  }
  setScreen(screen);
}

function back() {
  if (historyStack.length > 1) {
    historyStack.pop();
    history.back();
  } else {
    go("home", { replace: true });
  }
}

function appAdminConfig() {
  if (window.readKuailianAdminConfig) return window.readKuailianAdminConfig();
  return window.KUAILIAN_DEFAULT_ADMIN_CONFIG || { collapseTypeParams: [] };
}

function typeScores() {
  const config = appAdminConfig();
  const dimensions = config.dimensions || ["作息", "姿态", "拍照", "妆造", "水肿"];
  const answerMap = config.answerTypeDimensions || {};
  const scores = Object.fromEntries(dimensions.map((name) => [name, 0]));
  const addScore = (name, value) => {
    if (scores[name] !== undefined) scores[name] += value;
  };

  state.answers.forEach((answer, index) => {
    if (!answer) return;
    addScore(answerMap[answer.type], 14);
    const questionHint = questionDimension(index);
    if (questionHint) addScore(questionHint, 5);
    keywordDimensions(answer.label).forEach((name) => addScore(name, 5));
  });

  state.supplements.forEach((item) => {
    const supplement = supplementOptions.find(([label]) => label === item);
    if (supplement) addScore(answerMap[supplement[1]], 9);
    keywordDimensions(item).forEach((name) => addScore(name, 4));
  });

  return scores;
}

function questionDimension(index) {
  return {
    1: "水肿",
    5: "作息",
    6: "姿态",
    7: "拍照",
    8: "妆造"
  }[index];
}

function keywordDimensions(label = "") {
  const hits = [];
  if (/熬夜|睡眠|休息|饮水|饮酒|疲惫|眼周|早睡/.test(label)) hits.push("作息");
  if (/低头|颈|肩|姿态|下颌|法令|嘴角|面中/.test(label)) hits.push("姿态");
  if (/拍照|自拍|镜头|视频|机位|滤镜|角度|证件照|直播/.test(label)) hits.push("拍照");
  if (/妆|腮红|发型|底妆|披发|扎头发|提亮/.test(label)) hits.push("妆造");
  if (/浮肿|水肿|早上|晨|盐|冷敷|消肿/.test(label)) hits.push("水肿");
  return hits;
}

function normalizedScores(scores) {
  const maxScore = Math.max(...Object.values(scores), 1);
  return Object.fromEntries(
    Object.entries(scores).map(([name, value]) => [name, Math.round(value / maxScore * 100)])
  );
}

function weightedTypeScore(type, scores) {
  const entries = Object.entries(type.weights || {});
  const totalWeight = entries.reduce((sum, [, weight]) => sum + Number(weight || 0), 0) || 1;
  return Math.round(entries.reduce((sum, [name, weight]) => (
    sum + (scores[name] || 0) * Number(weight || 0)
  ), 0) / totalWeight);
}

function scoreCollapseTypes(types, scores) {
  const candidates = types.map((type) => {
    const score = weightedTypeScore(type, scores);
    const threshold = Number(type.threshold) || 0;
    return { type, score, threshold, passed: score >= threshold };
  });
  const passed = candidates.filter((item) => item.passed);
  return (passed.length ? passed : candidates)
    .sort((a, b) => (b.score - b.threshold) - (a.score - a.threshold))[0];
}

function adviceIcon(icon) {
  if (iconPaths[icon]) return iconPaths[icon];
  if (typeof icon === "string" && icon.startsWith("./")) return icon;
  return iconPaths.advice;
}

function normalizeAdviceItems(items, fallbackKey) {
  const fallback = taskTemplates[fallbackKey] || taskTemplates.posture;
  if (!Array.isArray(items) || !items.length) return fallback;
  return items.map(([icon, title, detail]) => [
    adviceIcon(icon),
    title || "轻量调整",
    detail || "按当前状态选择一个容易执行的小动作。"
  ]);
}

function normalizePlanItems(items) {
  if (!Array.isArray(items) || !items.length) return planDays;
  return items.map(([title, tasks], index) => [
    title || `第 ${index + 1} 天`,
    Array.isArray(tasks) && tasks.length ? tasks : ["完成一个轻量动作", "记录上镜状态", "保持节奏"]
  ]);
}

function reportProfile() {
  const config = appAdminConfig();
  if (state.activeHistoryReport?.type) {
    const typeConfigs = config.collapseTypeParams?.length
      ? config.collapseTypeParams
      : window.KUAILIAN_DEFAULT_ADMIN_CONFIG.collapseTypeParams;
    const profile = typeConfigs.find((type) => type.name === state.activeHistoryReport.type) || typeConfigs[0];
    return {
      type: state.activeHistoryReport.type || profile.name,
      level: profile.level,
      factors: profile.factors,
      primary: profile.adviceKey || profile.id,
      advice: normalizeAdviceItems(profile.advice, profile.adviceKey || profile.id),
      plan: normalizePlanItems(profile.plan),
      metrics: profile.metrics,
      scores: {},
      rawScores: {},
      matchScore: 0,
      threshold: Number(profile.threshold) || 0,
      isHistory: true
    };
  }
  const rawScores = typeScores();
  const scores = normalizedScores(rawScores);
  const typeConfigs = config.collapseTypeParams?.length
    ? config.collapseTypeParams
    : window.KUAILIAN_DEFAULT_ADMIN_CONFIG.collapseTypeParams;
  const selected = scoreCollapseTypes(typeConfigs, scores);
  const profile = selected.type;
  const photoBonus = state.photoAnalyzed ? 4 : 0;
  const matchBonus = Math.max(0, selected.score - selected.threshold) * .08;
  const metrics = Object.fromEntries(
    Object.entries(profile.metrics || {}).map(([name, value]) => [
      name,
      Math.min(90, Math.round(Number(value) + photoBonus + matchBonus))
    ])
  );
  return {
    type: profile.name,
    level: profile.level,
    factors: profile.factors,
    primary: profile.adviceKey || profile.id,
    advice: normalizeAdviceItems(profile.advice, profile.adviceKey || profile.id),
    plan: normalizePlanItems(profile.plan),
    metrics,
    scores,
    rawScores,
    matchScore: selected.score,
    threshold: selected.threshold
  };
}

function renderHome() {
  const hasReport = state.quizDone;
  $("#homeFirst").hidden = hasReport;
  $("#homeReturn").hidden = !hasReport;
  if (!hasReport) return;
  const profile = reportProfile();
  $("#homeChips").innerHTML = [
    profile.type,
    profile.level,
    state.photoAnalyzed ? "已完成照片辅助" : "可补充照片辅助"
  ].map((text) => `<span class="chip">${text}</span>`).join("");
  $("#homeDayTitle").textContent = `7 天状态管理 · Day ${Math.min(state.day, 7)} / 7`;
  $("#homeDayDesc").textContent = state.completedDays
    ? `已完成 ${state.completedDays} / 7 天，今天继续完成 3 个轻量任务。`
    : "今天完成 3 个轻量任务，不追求用力过猛。";
  renderHomeHistory();
  renderMetrics("#homeMetrics", profile.metrics);
}

function renderHomeHistory() {
  const card = $("#homeHistoryCard");
  const list = $("#homeHistoryList");
  const count = $("#historyCount");
  if (!card || !list || !count) return;
  const reports = Array.isArray(state.userReports) ? state.userReports : [];
  card.hidden = !state.logged;
  if (!state.logged) return;
  count.textContent = reports.length ? `共 ${reports.length} 份` : "暂无历史";
  list.innerHTML = reports.length ? reports.slice(0, 5).map((report) => `
    <button class="history-item" type="button" data-open-history="${escapeHtml(report.id)}">
      <span>
        <b>${escapeHtml(report.type || "待分析")}</b>
        <em>${escapeHtml(report.submittedAt || report.createdAt || "最近报告")}</em>
      </span>
      <i>${escapeHtml(report.photo || "未补充")} · ${escapeHtml(report.progress || "0 / 7")}</i>
    </button>
  `).join("") : `
    <div class="history-empty">登录后完成测评，历史报告会保存在这里。</div>
  `;
}

function renderQuiz() {
  const currentQuiz = activeQuiz();
  if (questionIndex >= currentQuiz.length) questionIndex = Math.max(0, currentQuiz.length - 1);
  const data = currentQuiz[questionIndex];
  const percent = Math.round(((questionIndex + 1) / currentQuiz.length) * 100);
  $("#quizStep").textContent = `第 ${questionIndex + 1} / ${currentQuiz.length} 题`;
  $("#quizPercent").textContent = `${percent}%`;
  $("#quizBar").style.width = `${percent}%`;
  $("#questionText").textContent = data.question;
  $("#answerGrid").innerHTML = data.options.map(([label, type, image]) => {
    const selected = state.answers[questionIndex]?.label === label;
    const imageSource = image.startsWith("./") ? image : `./assets/icons/${image}`;
    return `
      <button class="answer-option${selected ? " selected" : ""}" type="button"
        data-answer="${label}" data-type="${type}">
        <img src="${imageSource}" alt="">
        <b>${label}</b><span aria-hidden="true"></span>
      </button>`;
  }).join("");
  $("#supplementGrid").innerHTML = supplementOptions.map(([label]) => `
    <button class="supplement-option${state.supplements.includes(label) ? " selected" : ""}"
      type="button" data-supplement="${label}">${label}</button>
  `).join("");
  $("#quizPrev").textContent = questionIndex === 0 ? "返回首页" : "上一题";
  $("#quizNext").textContent = questionIndex === currentQuiz.length - 1 ? "生成报告" : "下一题";
}

function renderUploads() {
  $("#uploadGrid").innerHTML = uploadSlots.map((slot, index) => {
    const upload = uploads[index];
    return `
      <label class="upload-card${upload ? " ready" : ""}">
        <input type="file" accept="image/jpeg,image/png,image/webp" data-upload="${index}">
        <div class="upload-preview-wrap">
          <img class="upload-preview" src="${upload?.url || slot.image}" style="object-position:${slot.position}" alt="">
          ${upload ? `<img class="upload-done" src="./assets/photo-page/rule-check.png" alt="">` : ""}
        </div>
        <b>${slot.label}</b>
        <span>${upload ? "已选择" : slot.hint}</span>
      </label>`;
  }).join("");
}

function renderMetrics(target, metrics) {
  $(target).innerHTML = Object.entries(metrics).map(([name, value], index) => `
    <article class="metric-card">
      <b>${name}</b>
      <strong class="${index % 2 ? "purple" : ""}">${value >= 65 ? "良好" : value >= 50 ? "一般" : "待调整"}</strong>
      <div class="meter"><i style="width:${value}%"></i></div>
    </article>
  `).join("");
}

function renderReport() {
  const profile = reportProfile();
  $("#reportType").textContent = profile.type;
  $("#reportLevel").textContent = profile.level;
  $("#reportBasis").textContent = profile.isHistory
    ? "根据历史报告记录展示，可重新测评生成最新状态"
    : state.photoAnalyzed
    ? "根据问卷与照片质量辅助结果生成，不识别身份"
    : "根据问卷回答生成，可选照片辅助评估";
  renderMetrics("#reportMetrics", profile.metrics);
  $("#factorList").innerHTML = profile.factors.map(([title, detail], index) => `
    <article class="factor-item">
      <span class="factor-index">${index + 1}</span>
      <div><b>${title}</b><span>${detail}</span></div>
    </article>
  `).join("");
  $("#adviceGrid").innerHTML = profile.advice.map(([image, title]) => `
    <article class="advice-item"><img src="${image}" alt=""><b>${title}</b></article>
  `).join("");
}

function renderScenarios() {
  const images = {
    "约会": "./assets/icons/feature-advice.png",
    "面试": "./assets/icons/feature-reason.png",
    "证件照": "./assets/icons/advice-camera.png",
    "直播": "./assets/icons/feature-score.png"
  };
  $("#scenarioGrid").innerHTML = Object.keys(scenarioData).map((name) => `
    <button class="scenario-option${state.selectedScenario === name ? " selected" : ""}"
      type="button" data-scenario="${name}">
      <img src="${images[name]}" alt=""><span>${name}</span>
    </button>
  `).join("");
  $("#scenarioTitle").textContent = `${state.selectedScenario}准备建议`;
  $("#urgentList").innerHTML = scenarioData[state.selectedScenario].map(([title, detail], index) => `
    <article class="urgent-item">
      <b>${index + 1}</b>
      <div><b>${title}</b><span>${detail}</span></div>
    </article>
  `).join("");
}

function todayTasks() {
  const profile = reportProfile();
  return profile.advice;
}

function renderCheckin() {
  const tasks = todayTasks();
  const checkedTasks = state.taskChecks[state.day] || [];
  const dayComplete = state.completedDays >= state.day;
  $("#dayLabel").textContent = `Day ${Math.min(state.day, 7)} / 7`;
  $("#taskList").innerHTML = tasks.map(([image, title, detail], index) => {
    const taskDone = dayComplete || checkedTasks.includes(index);
    return `
    <article class="task-item${taskDone ? " done" : ""}" data-task-index="${index}" role="button" tabindex="0">
      <img src="${image}" alt="">
      <div><b>${title}</b><span>${detail}</span></div>
      <span class="task-state">${taskDone ? "已完成" : "待完成"}</span>
    </article>`;
  }).join("");
  $("#calendarStatus").textContent = `已完成 ${state.completedDays} / 7`;
  $("#calendar").innerHTML = Array.from({ length: 7 }, (_, index) => {
    const day = index + 1;
    const className = day <= state.completedDays ? "done" : day === state.day ? "today" : "";
    const status = day <= state.completedDays ? "完成" : day === state.day ? "今天" : "待开始";
    return `<div class="calendar-day ${className}"><b>D${day}</b><span>${status}</span></div>`;
  }).join("");
  const profile = reportProfile();
  const progressMetrics = Object.fromEntries(
    Object.entries(profile.metrics).slice(0, 2).map(([name, value]) => [
      name,
      Math.min(90, value + state.completedDays * 4)
    ])
  );
  renderMetrics("#checkinMetrics", progressMetrics);
  $("#finishDay").disabled = state.completedDays >= 7;
  $("#finishDay").textContent = state.completedDays >= 7 ? "7 天计划已完成" : "完成今日打卡";
}

function renderPlan() {
  const profile = reportProfile();
  $("#planList").innerHTML = profile.plan.map(([title, tasks], index) => `
    <article class="plan-card">
      <div class="plan-day">D${index + 1}</div>
      <div>
        <h2>${title}</h2>
        <p>${tasks.join("；")}</p>
        <ul>${tasks.map((task) => `<li>${task}</li>`).join("")}</ul>
      </div>
    </article>
  `).join("");
}

function renderPosterCanvas() {
  const canvas = $("#posterCanvas");
  const ctx = canvas.getContext("2d");
  const profile = reportProfile();
  const gradient = ctx.createLinearGradient(0, 0, 750, 1200);
  gradient.addColorStop(0, "#fff8fc");
  gradient.addColorStop(.55, "#ffe8f3");
  gradient.addColorStop(1, "#f2eaff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255,255,255,.86)";
  roundRect(ctx, 55, 55, 640, 1090, 42);
  ctx.fill();
  ctx.fillStyle = "#f63287";
  ctx.textAlign = "center";
  ctx.font = "700 28px sans-serif";
  ctx.fillText("垮脸自救实验室", 375, 135);
  ctx.fillStyle = "#201d24";
  ctx.font = "900 54px sans-serif";
  wrapText(ctx, "我的 7 天上镜状态管理", 375, 245, 560, 72);
  ctx.fillStyle = "#f63287";
  ctx.font = "900 120px sans-serif";
  ctx.fillText(`${state.completedDays}/7`, 375, 480);
  ctx.fillStyle = "#746c78";
  ctx.font = "500 27px sans-serif";
  ctx.fillText("已完成天数", 375, 530);
  ctx.fillStyle = "#201d24";
  ctx.font = "800 38px sans-serif";
  ctx.fillText(profile.type, 375, 645);
  ctx.fillStyle = "#746c78";
  ctx.font = "500 25px sans-serif";
  ctx.fillText("问卷为主 · 照片辅助 · 轻量执行", 375, 700);
  const cards = [
    ["当前重点", profile.factors[0][0]],
    ["今日动作", todayTasks()[0][1]],
    ["完成进度", `${Math.round(state.completedDays / 7 * 100)}%`]
  ];
  cards.forEach(([label, value], index) => {
    const x = 90 + index * 205;
    ctx.fillStyle = "#fff";
    roundRect(ctx, x, 790, 175, 190, 28);
    ctx.fill();
    ctx.fillStyle = "#f63287";
    ctx.font = "800 23px sans-serif";
    ctx.fillText(label, x + 87, 845);
    ctx.fillStyle = "#201d24";
    ctx.font = "700 24px sans-serif";
    wrapText(ctx, value, x + 87, 905, 145, 34);
  });
  ctx.fillStyle = "#8d838e";
  ctx.font = "500 21px sans-serif";
  ctx.fillText("仅供上镜状态参考，不构成医疗或美容诊断", 375, 1080);
  canvas.dataset.rendered = "true";
}

function drawPoster() {
  renderPosterCanvas();
  go("poster");
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  const r = Math.min(radius, width / 2, height / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const chars = Array.from(text);
  let line = "";
  const lines = [];
  chars.forEach((char) => {
    const test = line + char;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = char;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  lines.forEach((item, index) => ctx.fillText(item, x, y + index * lineHeight));
}

function renderAll() {
  renderHome();
  renderQuiz();
  renderUploads();
  renderReport();
  renderScenarios();
  renderCheckin();
  renderPlan();
  if (currentScreen === "poster") renderPosterCanvas();
  saveState();
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => resolve({ image, url: reader.result });
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function inspectImage(image) {
  const size = 96;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  let brightness = 0;
  let contrastAccumulator = 0;
  const values = [];
  for (let index = 0; index < data.length; index += 4) {
    const value = (data[index] * .299) + (data[index + 1] * .587) + (data[index + 2] * .114);
    brightness += value;
    values.push(value);
  }
  brightness /= values.length;
  values.forEach((value) => {
    contrastAccumulator += Math.pow(value - brightness, 2);
  });
  const contrast = Math.sqrt(contrastAccumulator / values.length);
  return {
    brightness: Math.round(brightness),
    contrast: Math.round(contrast),
    width: image.naturalWidth,
    height: image.naturalHeight
  };
}

function photoSummary() {
  const valid = uploads.filter(Boolean);
  if (!valid.length) return null;
  const avgBrightness = valid.reduce((sum, item) => sum + item.metrics.brightness, 0) / valid.length;
  const avgContrast = valid.reduce((sum, item) => sum + item.metrics.contrast, 0) / valid.length;
  const minEdge = Math.min(...valid.map((item) => Math.min(item.metrics.width, item.metrics.height)));
  return {
    count: valid.length,
    light: avgBrightness < 75 ? "偏暗" : avgBrightness > 210 ? "偏亮" : "光线适中",
    contrast: avgContrast < 28 ? "画面对比偏弱" : "层次清楚",
    clarity: minEdge < 720 ? "分辨率一般" : "分辨率充足"
  };
}

document.addEventListener("click", (event) => {
  const goButton = event.target.closest("[data-go]");
  if (goButton) {
    if (goButton.dataset.go === "quiz") {
      state.activeHistoryReport = null;
      saveState();
    }
    go(goButton.dataset.go);
  }
  const backButton = event.target.closest("[data-back]");
  if (backButton) back();
  const historyButton = event.target.closest("[data-open-history]");
  if (historyButton) {
    const report = (state.userReports || []).find((item) => item.id === historyButton.dataset.openHistory);
    if (report) {
      state.activeHistoryReport = report;
      state.backendReportId = report.id;
      state.quizDone = true;
      saveState();
      go("report");
    }
  }
  const answer = event.target.closest("[data-answer]");
  if (answer) {
    state.answers[questionIndex] = {
      label: answer.dataset.answer,
      type: answer.dataset.type
    };
    renderQuiz();
  }
  const supplement = event.target.closest("[data-supplement]");
  if (supplement) {
    const label = supplement.dataset.supplement;
    state.supplements = state.supplements.includes(label)
      ? state.supplements.filter((item) => item !== label)
      : [...state.supplements, label];
    renderQuiz();
  }
  const scenario = event.target.closest("[data-scenario]");
  if (scenario) {
    state.selectedScenario = scenario.dataset.scenario;
    renderScenarios();
  }
  const task = event.target.closest("[data-task-index]");
  if (task && state.completedDays < state.day) {
    const index = Number(task.dataset.taskIndex);
    const checked = state.taskChecks[state.day] || [];
    state.taskChecks[state.day] = checked.includes(index)
      ? checked.filter((item) => item !== index)
      : [...checked, index];
    saveState();
    renderCheckin();
  }
  if (event.target.closest("[data-login]")) {
    openLoginModal();
  }
  if (event.target.closest("[data-open='about']")) {
    openModal(`
      <span class="eyebrow">产品说明</span>
      <h2>问卷为主，照片辅助</h2>
      <p>这个 MVP 用问卷规则生成上镜状态类型。照片只粗略检查亮度、清晰度和完整度，不做人脸身份识别，不提供医疗诊断。</p>
      <button class="button primary" type="button" id="aboutStart">开始测评</button>
    `);
  }
});

document.addEventListener("change", async (event) => {
  const input = event.target.closest("[data-upload]");
  if (!input || !input.files?.[0]) return;
  const index = Number(input.dataset.upload);
  const file = input.files[0];
  if (file.size > 12 * 1024 * 1024) {
    showToast("单张照片请控制在 12MB 以内");
    input.value = "";
    return;
  }
  try {
    const { image, url } = await readImage(file);
    uploads[index] = { file, url, metrics: inspectImage(image) };
    renderUploads();
  } catch {
    showToast("照片读取失败，请换一张试试");
  }
});

$("#quizPrev").addEventListener("click", () => {
  if (questionIndex === 0) {
    go("home");
  } else {
    questionIndex -= 1;
    renderQuiz();
  }
});

$("#quizNext").addEventListener("click", () => {
  const currentQuiz = activeQuiz();
  if (!state.answers[questionIndex]) {
    showToast("请先选择一个最接近的答案");
    return;
  }
  if (questionIndex < currentQuiz.length - 1) {
    questionIndex += 1;
    renderQuiz();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  state.quizDone = true;
  saveState();
  syncReportToApi();
  go("photo");
});

$("#previewReport").addEventListener("click", () => {
  if (!state.logged) {
    openLoginModal("report");
    return;
  }
  go("report");
});

$("#analyzePhotos").addEventListener("click", () => {
  if (!$("#photoConsent").checked) {
    showToast("请先确认照片使用范围");
    return;
  }
  const summary = photoSummary();
  if (!summary) {
    showToast("请至少选择一张照片");
    return;
  }
  state.photoAnalyzed = true;
  state.photoSummary = summary;
  saveState();
  syncPhotoToApi(summary);
  openModal(`
    <h2>照片辅助评估已完成</h2>
    <p>只分析了画面质量，不识别身份，也没有判断真实脸部结构。</p>
    <ul class="analysis-list">
      <li><span>已选照片</span><b>${summary.count} / 3 张</b></li>
      <li><span>光线</span><b>${summary.light}</b></li>
      <li><span>画面层次</span><b>${summary.contrast}</b></li>
      <li><span>清晰度</span><b>${summary.clarity}</b></li>
    </ul>
    <button class="button primary" type="button" id="viewEnhancedReport">
      ${state.logged ? "查看辅助版报告" : "登录查看辅助版报告"}
    </button>
  `);
});

$("#saveReport").addEventListener("click", () => {
  state.reportSaved = true;
  saveState();
  showToast("报告已保存到本机");
});

$("#finishDay").addEventListener("click", () => {
  if (state.completedDays >= 7) return;
  if ((state.taskChecks[state.day] || []).length < 3) {
    showToast("请先完成今天的 3 个小任务");
    return;
  }
  state.completedDays = Math.max(state.completedDays, state.day);
  if (state.day < 7) state.day += 1;
  saveState();
  syncCheckinToApi();
  renderCheckin();
  openModal(`
    <span class="eyebrow">今日已完成</span>
    <h2>已完成 ${state.completedDays} / 7 天</h2>
    <p>轻量、稳定地执行，比临时用力更重要。完成全部 7 天后可以生成完整进度海报。</p>
    <button class="button primary" type="button" id="returnCheckin">返回状态管理</button>
    <button class="button secondary" type="button" id="quickPoster">查看进度海报</button>
  `);
});

$("#makePoster").addEventListener("click", drawPoster);

$("#downloadPoster").addEventListener("click", () => {
  const imageUrl = $("#posterCanvas").toDataURL("image/png");
  if (/MicroMessenger/i.test(navigator.userAgent)) {
    openModal(`
      <span class="eyebrow">保存海报</span>
      <h2>长按图片保存到手机</h2>
      <p>微信内置浏览器通常会拦截网页直接下载，请长按下方海报选择“保存图片”。</p>
      <img src="${imageUrl}" alt="7 天状态管理进度海报" style="width:100%;border-radius:20px">
    `);
    return;
  }
  const link = document.createElement("a");
  link.download = `上镜状态管理-${state.completedDays}天.png`;
  link.href = imageUrl;
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast("海报图片已生成");
});

$("#modalClose").addEventListener("click", closeModal);
$("#modalMask").addEventListener("click", (event) => {
  if (event.target === $("#modalMask")) closeModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("#modalMask").hidden) closeModal();
  const task = event.target.closest?.("[data-task-index]");
  if (task && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    task.click();
  }
});

window.addEventListener("popstate", (event) => {
  let screen = event.state?.screen || (validScreens.has(location.hash.slice(1)) ? location.hash.slice(1) : "home");
  if (screen === "resultGate") screen = "photo";
  if (historyStack[historyStack.length - 1] !== screen) {
    const existingIndex = historyStack.lastIndexOf(screen);
    if (existingIndex >= 0) {
      historyStack.splice(existingIndex + 1);
    } else {
      historyStack.push(screen);
    }
  }
  setScreen(screen);
});

$("#modalContent").addEventListener("click", async (event) => {
  if (event.target.closest("#confirmLogin")) {
    state.logged = true;
    saveState();
    await mockLoginToApi();
    if (state.quizDone) {
      await syncReportToApi();
    } else {
      await loadUserReportsFromApi();
    }
    closeModal();
    const destination = postLoginScreen;
    postLoginScreen = null;
    showToast("登录成功，正在生成个人报告");
    if (destination) go(destination);
  }
  if (event.target.closest("#aboutStart")) {
    closeModal();
    go("quiz");
  }
  if (event.target.closest("#viewEnhancedReport")) {
    closeModal();
    go("report");
  }
  if (event.target.closest("#returnCheckin")) {
    closeModal();
    go("checkin");
  }
  if (event.target.closest("#quickPoster")) {
    closeModal();
    drawPoster();
  }
});

history.replaceState({ screen: initialScreen }, "", `#${initialScreen}`);
setScreen(initialScreen);
loadRemoteAdminConfig();
