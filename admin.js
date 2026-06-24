const STORAGE_KEY = "faceRescueMvpV1";
const REPORT_NOTES_KEY = "faceRescueAdminReportNotesV1";
const ADMIN_API_BASE = "http://127.0.0.1:4174";

const panelTitles = {
  overview: "数据概览",
  users: "用户报告",
  members: "用户管理",
  questions: "问卷题库",
  rules: "报告配置",
  content: "页面文案"
};

const answerTypeOptions = [
  ["fatigue", "作息 / 疲惫"],
  ["posture", "姿态 / 下颌线"],
  ["camera", "拍照 / 镜头"],
  ["puff", "水肿 / 晨间"],
  ["balanced", "平衡 / 观察"]
];

const quizImageOptions = [
  "face-lines.png",
  "face-jaw.png",
  "face-mid.png",
  "face-mouth.png",
  "face-puff.png",
  "face-photo.png"
];

const memberStageOptions = [
  ["new", "新用户"],
  ["priority", "重点跟进"],
  ["photo", "待补照片"],
  ["high", "高意向"],
  ["contacted", "已联系"]
];

const demoReports = [
  {
    id: "demo-a",
    name: "演示用户 A",
    type: "姿态疲惫型",
    photo: "已补充",
    saved: "已登录",
    progress: "2 / 7",
    submittedAt: "今天 09:42",
    answers: ["下颌线模糊", "拍照时", "先调姿态", "证件照"],
    supplements: ["长期低头", "有颈前伸"],
    photoSummary: { count: 3, light: "光线适中", contrast: "层次清楚", clarity: "分辨率充足" }
  },
  {
    id: "demo-b",
    name: "演示用户 B",
    type: "晨间浮肿型",
    photo: "未补充",
    saved: "未登录",
    progress: "0 / 7",
    submittedAt: "今天 08:16",
    answers: ["早晚容易浮肿", "早上起床", "先消肿", "自拍"],
    supplements: ["晚餐偏咸"],
    photoSummary: null
  },
  {
    id: "demo-c",
    name: "演示用户 C",
    type: "镜头显老型",
    photo: "已补充",
    saved: "已登录",
    progress: "5 / 7",
    submittedAt: "昨天 21:03",
    answers: ["拍照显老", "拍照时", "先找角度", "直播"],
    supplements: ["长期低头"],
    photoSummary: { count: 2, light: "偏亮", contrast: "层次清楚", clarity: "分辨率充足" }
  },
  {
    id: "demo-d",
    name: "演示用户 D",
    type: "妆造下沉型",
    photo: "未补充",
    saved: "已登录",
    progress: "1 / 7",
    submittedAt: "昨天 16:28",
    answers: ["面中显疲惫", "下午以后", "先调妆造", "约会"],
    supplements: ["经常熬夜"],
    photoSummary: null
  },
  {
    id: "demo-e",
    name: "演示用户 E",
    type: "轮廓松弛型",
    photo: "已补充",
    saved: "已登录",
    progress: "3 / 7",
    submittedAt: "周二 19:10",
    answers: ["嘴角容易下垂", "连续熬夜后", "先看报告", "旅行拍照"],
    supplements: ["经常熬夜", "长期低头"],
    photoSummary: { count: 3, light: "光线适中", contrast: "画面对比偏弱", clarity: "分辨率一般" }
  },
  {
    id: "demo-f",
    name: "演示用户 F",
    type: "作息疲惫型",
    photo: "未补充",
    saved: "未登录",
    progress: "0 / 7",
    submittedAt: "周一 23:41",
    answers: ["法令纹明显", "连续熬夜后", "先补作息", "面试"],
    supplements: ["经常熬夜"],
    photoSummary: null
  }
];

let adminConfig = window.readKuailianAdminConfig();
let collapseTypeParams = adminConfig.collapseTypeParams;
let questionBank = adminConfig.questionBank;
let reportRules = adminConfig.reportRules;
let photoRules = adminConfig.photoRules;
let flowSwitches = adminConfig.flowSwitches;
let selectedContentTypeId = collapseTypeParams[0]?.id || "posture";
let selectedReportId = "local";
let apiReports = null;
let apiMembers = null;
let selectedMemberId = null;
let apiOnline = false;
let userFilters = {
  type: "all",
  photo: "all",
  saved: "all",
  progress: "all"
};
let memberFilters = {
  query: "",
  reportStatus: "all",
  stage: "all"
};

const trendData = [
  ["周四", 18],
  ["周五", 24],
  ["周六", 36],
  ["周日", 42],
  ["周一", 31],
  ["周二", 48],
  ["今天", 54]
];

let toastTimer;

function $(selector, scope = document) {
  return scope.querySelector(selector);
}

function $all(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

function readState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function readReportNotes() {
  try {
    return JSON.parse(localStorage.getItem(REPORT_NOTES_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeReportNotes(notes) {
  localStorage.setItem(REPORT_NOTES_KEY, JSON.stringify(notes));
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${ADMIN_API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!response.ok) throw new Error(`API ${response.status}`);
  return response.json();
}

async function loadReportsFromApi(showMessage = false) {
  try {
    const payload = await apiRequest("/api/admin/reports");
    apiReports = Array.isArray(payload.reports) ? payload.reports : [];
    apiOnline = true;
    renderAll();
    if (showMessage) showToast("已从 mock API 刷新报告数据");
  } catch {
    apiOnline = false;
    apiReports = null;
    if (showMessage) showToast("mock API 未开启，已使用本地演示数据");
  }
}

async function loadMembersFromApi(showMessage = false) {
  try {
    const payload = await apiRequest("/api/admin/users");
    apiMembers = Array.isArray(payload.users) ? payload.users : [];
    apiOnline = true;
    if (!selectedMemberId || !apiMembers.some((user) => user.id === selectedMemberId)) {
      selectedMemberId = apiMembers[0]?.id || null;
    }
    renderAll();
    if (showMessage) showToast("已刷新用户管理数据");
  } catch {
    apiMembers = null;
    selectedMemberId = null;
    renderMembers();
    if (showMessage) showToast("用户 API 暂不可用，请确认本地服务已启动");
  }
}

async function loadMemberDetail(userId) {
  if (!userId) return;
  try {
    const payload = await apiRequest(`/api/admin/users/${encodeURIComponent(userId)}`);
    renderMemberDetail(payload.user, Array.isArray(payload.reports) ? payload.reports : []);
  } catch {
    renderMemberDetail(null, []);
    showToast("用户详情读取失败");
  }
}

async function saveMemberMetaToApi(userId, stage, note) {
  const payload = await apiRequest(`/api/admin/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    body: JSON.stringify({ stage, note })
  });
  if (payload.user && apiMembers) {
    apiMembers = apiMembers.map((item) => item.id === userId ? payload.user : item);
  }
  return payload.user;
}

async function saveReportNoteToApi(reportId, note) {
  if (!apiOnline) return;
  const payload = await apiRequest(`/api/admin/reports/${encodeURIComponent(reportId)}/note`, {
    method: "PUT",
    body: JSON.stringify({ note })
  });
  if (payload.report && apiReports) {
    apiReports = apiReports.map((item) => item.id === reportId ? payload.report : item);
  }
}

async function loadAdminConfigFromApi(showMessage = false) {
  try {
    const payload = await apiRequest("/api/admin/config/app-config");
    if (!payload.value) return false;
    adminConfig = window.writeKuailianAdminConfig(payload.value);
    collapseTypeParams = adminConfig.collapseTypeParams;
    questionBank = adminConfig.questionBank;
    reportRules = adminConfig.reportRules;
    photoRules = adminConfig.photoRules;
    flowSwitches = adminConfig.flowSwitches;
    renderAll();
    if (showMessage) showToast("已从 SQLite 同步后台配置");
    return true;
  } catch {
    if (showMessage) showToast("SQLite 配置暂不可用，已使用本地配置");
    return false;
  }
}

async function persistAdminConfig(message) {
  try {
    await apiRequest("/api/admin/config/app-config", {
      method: "PUT",
      body: JSON.stringify({ value: adminConfig })
    });
    showToast(message || "已保存并同步到 SQLite");
  } catch {
    showToast("已保存到本地，SQLite 同步失败");
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function progressDays(progress) {
  return Number.parseInt(progress, 10) || 0;
}

function progressStatus(progress) {
  const days = progressDays(progress);
  if (days >= 7) return "done";
  if (days > 0) return "active";
  return "none";
}

function typeConfigByName(typeName) {
  return collapseTypeParams.find((type) => type.name === typeName) || collapseTypeParams[0] || {};
}

function reportFactors(typeName) {
  return typeConfigByName(typeName).factors || [];
}

function reportAdvice(typeName) {
  return typeConfigByName(typeName).advice || [];
}

function reportNoteStatus(record) {
  if (record.note) return "已备注";
  if (record.saved !== "已登录") return "待登录";
  if (record.photo !== "已补充") return "待补照";
  if (progressDays(record.progress) >= 7) return "已完成";
  if (progressDays(record.progress) > 0) return "跟进中";
  return "新报告";
}

function reportSourceLabel(record) {
  if (record.isLocal) return "浏览器本地数据";
  if (record.isRemote) return "SQLite 报告";
  return "运营演示数据";
}

function inferLocalType(state) {
  if (!state.quizDone) return "未完成测评";
  const answers = Array.isArray(state.answers) ? state.answers : [];
  const counts = answers.reduce((acc, item) => {
    if (item?.type) acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {});
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  return {
    posture: "姿态疲惫型",
    puff: "晨间浮肿型",
    fatigue: "作息疲惫型",
    camera: "镜头显老型",
    balanced: "平衡观察型"
  }[top] || "平衡观察型";
}

function localRecord() {
  const state = readState();
  const answers = Array.isArray(state.answers) ? state.answers : [];
  const supplements = Array.isArray(state.supplements) ? state.supplements : [];
  return {
    id: "local",
    name: "本机演示用户",
    type: inferLocalType(state),
    photo: state.photoAnalyzed ? "已补充" : "未补充",
    saved: state.logged ? "已登录" : "未登录",
    progress: `${state.completedDays || 0} / 7`,
    submittedAt: state.quizDone ? "本机最近一次" : "尚未完成",
    answers: answers.map((item) => item?.label).filter(Boolean),
    supplements,
    photoSummary: state.photoSummary || null,
    isLocal: true,
    done: Boolean(state.quizDone)
  };
}

function showToast(message) {
  const toast = $("#adminToast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
}

function renderKpis(records) {
  const reportRows = apiReports ? records.filter((item) => item.isRemote) : records.filter((item) => item.done !== false);
  const photos = reportRows.filter((item) => item.photo === "已补充").length;
  const saved = reportRows.filter((item) => item.saved === "已登录").length;
  const checkins = reportRows.reduce((sum, item) => sum + Number.parseInt(item.progress, 10), 0);
  const userCount = apiMembers ? apiMembers.length : new Set(reportRows.map((item) => item.userId || item.name)).size;
  const kpis = apiReports
    ? [
      ["真实用户", userCount, "来自 H5 模拟微信登录"],
      ["报告总数", reportRows.length, "SQLite 已保存报告"],
      ["照片辅助", photos, "已完成照片补充"],
      ["打卡天数", checkins, "累计 7 天管理进度"]
    ]
    : [
      ["累计测评", reportRows.length, "当前为演示数据与本机状态"],
      ["照片辅助", photos, "已完成照片补充"],
      ["登录保存", saved, "已保存报告用户"],
      ["打卡完成", checkins, "累计完成天数"]
    ];
  $("#kpiGrid").innerHTML = kpis.map(([label, value, hint]) => `
    <article class="kpi-card">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${hint}</small>
    </article>
  `).join("");
}

function parseReportDate(record) {
  const raw = record.createdAt || record.submittedAt;
  if (!raw || /今天|昨天|周|本机|尚未/.test(raw)) return null;
  const date = new Date(String(raw).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

function realTrendData(records) {
  const reports = records.filter((item) => item.isRemote);
  const today = new Date();
  const buckets = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(today.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      label: index === 6 ? "今天" : `${date.getMonth() + 1}/${date.getDate()}`,
      value: 0
    };
  });
  reports.forEach((report) => {
    const date = parseReportDate(report) || today;
    const key = date.toISOString().slice(0, 10);
    const bucket = buckets.find((item) => item.key === key);
    if (bucket) bucket.value += 1;
  });
  return buckets.map((item) => [item.label, item.value]);
}

function renderTrend(records) {
  const rows = apiReports ? realTrendData(records) : trendData;
  const max = Math.max(...rows.map((item) => item[1]), 1);
  $("#trendChart").innerHTML = rows.map(([day, value]) => `
    <div class="trend-bar">
      <b>${value}</b>
      <i style="height:${Math.max(16, Math.round(value / max * 150))}px"></i>
      <span>${day}</span>
    </div>
  `).join("");
}

function renderDistribution(records) {
  const sourceRows = apiReports ? records.filter((item) => item.isRemote) : records.filter((item) => item.done !== false);
  const counts = sourceRows.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {});
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!rows.length) {
    $("#distributionList").innerHTML = `
      <div class="detail-empty compact-empty">暂无报告数据<br>完成一次 H5 测评后会生成类型分布</div>
    `;
    return;
  }
  const max = Math.max(...rows.map((item) => item[1]), 1);
  $("#distributionList").innerHTML = rows.map(([type, value]) => `
    <div class="distribution-item">
      <b>${type}</b>
      <div class="meter"><i style="width:${Math.round(value / max * 100)}%"></i></div>
      <span>${value}</span>
    </div>
  `).join("");
}

function renderTodos(records) {
  const sourceRows = apiReports ? records.filter((item) => item.isRemote) : records.filter((item) => item.done !== false);
  const pendingPhoto = sourceRows.filter((item) => item.photo !== "已补充").length;
  const pendingLogin = sourceRows.filter((item) => item.saved !== "已登录").length;
  const activeCheckin = sourceRows.filter((item) => progressDays(item.progress) > 0 && progressDays(item.progress) < 7).length;
  const sourceText = apiReports ? "基于 SQLite 真实报告" : "当前基于演示数据";
  const items = [
    ["照片辅助转化", `${pendingPhoto} 个报告尚未补充照片，可优化照片页引导。`, pendingPhoto ? "关注" : "正常"],
    ["登录保存转化", `${pendingLogin} 个报告未登录保存，需要验证登录弹窗文案。`, pendingLogin ? "关注" : "正常"],
    ["7 天管理跟进", `${activeCheckin} 个用户正在打卡中。${sourceText}。`, activeCheckin ? "跟进" : "观察"]
  ];
  $("#todoList").innerHTML = items.map(([title, desc, tag]) => `
    <div class="todo-item">
      <i class="status-dot"></i>
      <div><b>${title}</b><span>${desc}</span></div>
      <em class="pill">${tag}</em>
    </div>
  `).join("");
}

function applyUserFilters(items) {
  return items.filter((item) => {
    if (userFilters.type !== "all" && item.type !== userFilters.type) return false;
    if (userFilters.photo !== "all" && item.photo !== userFilters.photo) return false;
    if (userFilters.saved !== "all" && item.saved !== userFilters.saved) return false;
    if (userFilters.progress !== "all" && progressStatus(item.progress) !== userFilters.progress) return false;
    return true;
  });
}

function renderUserFilters(items) {
  const typeSelect = $("#filterType");
  if (!typeSelect) return;
  const typeOptions = [...new Set(items.map((item) => item.type).filter(Boolean))];
  typeSelect.innerHTML = [
    `<option value="all">全部类型</option>`,
    ...typeOptions.map((type) => `
      <option value="${escapeHtml(type)}" ${type === userFilters.type ? "selected" : ""}>${escapeHtml(type)}</option>
    `)
  ].join("");
  $("#filterPhoto").value = userFilters.photo;
  $("#filterSaved").value = userFilters.saved;
  $("#filterProgress").value = userFilters.progress;
}

function renderUsers(items) {
  renderUserFilters(items);
  const filtered = applyUserFilters(items);
  if (!filtered.some((item) => item.id === selectedReportId)) {
    selectedReportId = filtered[0]?.id || null;
  }
  $("#userCountLabel").textContent = `共 ${filtered.length} / ${items.length} 份报告`;
  $("#userTable").innerHTML = filtered.length ? filtered.map((item) => `
    <tr class="${item.id === selectedReportId ? "row-selected" : ""}" data-report-row="${escapeHtml(item.id)}">
      <td><strong>${escapeHtml(item.name)}</strong><span>${reportSourceLabel(item)} · ${escapeHtml(item.submittedAt)}</span></td>
      <td>${escapeHtml(item.type)}</td>
      <td><span class="pill">${escapeHtml(item.photo)}</span></td>
      <td>${escapeHtml(item.saved)}</td>
      <td>${escapeHtml(item.progress)}</td>
      <td><span class="pill">${escapeHtml(reportNoteStatus(item))}</span></td>
      <td><button class="mini-button" type="button" data-report-detail="${escapeHtml(item.id)}">查看详情</button></td>
    </tr>
  `).join("") : `
    <tr>
      <td colspan="7"><strong>暂无匹配报告</strong><span>换个筛选条件试试</span></td>
    </tr>
  `;
  renderReportDetail(items);
}

function renderReportDetail(items) {
  const detail = $("#reportDetail");
  if (!detail) return;
  const record = items.find((item) => item.id === selectedReportId);
  if (!record) {
    detail.innerHTML = `<div class="detail-empty">请选择一份用户报告<br>右侧会显示报告详情和运营备注</div>`;
    return;
  }
  const factors = reportFactors(record.type).slice(0, 3);
  const advice = reportAdvice(record.type).slice(0, 3);
  const photoRows = record.photoSummary
    ? [
      ["已选照片", `${record.photoSummary.count || 0} / 3 张`],
      ["光线", record.photoSummary.light || "待评估"],
      ["画面层次", record.photoSummary.contrast || "待评估"],
      ["清晰度", record.photoSummary.clarity || "待评估"]
    ]
    : [["照片辅助", "未补充"]];
  detail.innerHTML = `
    <div class="detail-head">
      <div>
        <strong>${escapeHtml(record.name)}</strong>
        <small>${escapeHtml(record.submittedAt)} · ${record.isLocal ? "本机状态" : "演示样本"}</small>
      </div>
      <div class="detail-tags">
        <span class="pill">${escapeHtml(record.type)}</span>
        <span class="pill">${escapeHtml(record.photo)}</span>
        <span class="pill">${escapeHtml(reportNoteStatus(record))}</span>
      </div>
    </div>
    <div class="detail-grid">
      <section class="detail-block">
        <span>核心结论</span>
        <b>${escapeHtml(record.type)}</b>
        <p>${record.userId ? `用户ID：${escapeHtml(record.userId)} · ` : ""}${escapeHtml(typeConfigByName(record.type).desc || "当前类型暂无说明。")}</p>
      </section>
      <section class="detail-block">
        <span>主要影响因素</span>
        <ul class="detail-list">
          ${factors.map(([title, desc]) => `<li><strong>${escapeHtml(title)}</strong><em>${escapeHtml(desc)}</em></li>`).join("")}
        </ul>
      </section>
      <section class="detail-block">
        <span>今日建议</span>
        <ul class="detail-list">
          ${advice.map(([, title, desc]) => `<li><strong>${escapeHtml(title)}</strong><em>${escapeHtml(desc)}</em></li>`).join("")}
        </ul>
      </section>
      <section class="detail-block">
        <span>问卷摘要</span>
        <div class="answer-chips">
          ${(record.answers?.length ? record.answers : ["暂无问卷答案"]).slice(0, 8).map((answer) => `<i class="answer-chip">${escapeHtml(answer)}</i>`).join("")}
        </div>
        <p>${record.supplements?.length ? `补充信息：${escapeHtml(record.supplements.join("、"))}` : "暂无补充信息"}</p>
      </section>
      <section class="detail-block">
        <span>照片辅助</span>
        <ul class="detail-list">
          ${photoRows.map(([title, value]) => `<li><strong>${escapeHtml(title)}</strong><em>${escapeHtml(value)}</em></li>`).join("")}
        </ul>
      </section>
      <section class="detail-block">
        <span>7 天进度</span>
        <b>${escapeHtml(record.progress)}</b>
        <p>${progressDays(record.progress) ? "用户已进入状态管理，可继续做召回和打卡提醒。" : "用户尚未开始打卡，适合推送首日轻任务。"}</p>
      </section>
    </div>
    <label class="detail-note-form">
      <span>运营备注</span>
      <textarea id="reportNoteInput" data-note-report="${escapeHtml(record.id)}" placeholder="例如：优先引导补充照片；适合推送 7 天计划。">${escapeHtml(record.note || "")}</textarea>
    </label>
    <div class="detail-actions">
      <button class="primary-action" type="button" data-save-note="${escapeHtml(record.id)}">保存备注</button>
      <button class="ghost-action" type="button" data-open-front-report>打开前台报告</button>
    </div>
  `;
}

function formatDateTime(value) {
  if (!value) return "暂无";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function memberLoginLabel(loginType) {
  if (loginType === "mock") return "模拟微信";
  if (loginType === "wechat") return "微信登录";
  return loginType || "未知";
}

function memberStageLabel(stage) {
  return memberStageOptions.find(([value]) => value === stage)?.[1] || "新用户";
}

function reportHistoryLabel(report) {
  const tags = [report.type, report.photo, report.progress].filter(Boolean);
  return tags.length ? tags.join(" · ") : "暂无报告状态";
}

function applyMemberFilters(items) {
  const query = memberFilters.query.trim().toLowerCase();
  return items.filter((user) => {
    if (memberFilters.reportStatus === "withReport" && Number(user.reportCount || 0) <= 0) return false;
    if (memberFilters.reportStatus === "noReport" && Number(user.reportCount || 0) > 0) return false;
    if (memberFilters.stage !== "all" && (user.stage || "new") !== memberFilters.stage) return false;
    if (!query) return true;
    return [user.nickname, user.id, user.openid]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });
}

function renderMemberFilters() {
  const search = $("#memberSearch");
  const reportFilter = $("#memberReportFilter");
  const stageFilter = $("#memberStageFilter");
  if (!search || !reportFilter || !stageFilter) return;
  search.value = memberFilters.query;
  reportFilter.value = memberFilters.reportStatus;
  stageFilter.value = memberFilters.stage;
}

function renderMembers() {
  const table = $("#memberTable");
  const label = $("#memberCountLabel");
  const detail = $("#memberDetail");
  if (!table || !label || !detail) return;
  renderMemberFilters();
  if (apiMembers === null) {
    label.textContent = "API 未连接";
    table.innerHTML = `
      <tr>
        <td colspan="7"><strong>等待本地用户 API</strong><span>启动 mock-api 后，H5 模拟登录用户会显示在这里</span></td>
      </tr>
    `;
    detail.innerHTML = `<div class="detail-empty">暂无用户数据<br>先完成一次 H5 模拟微信登录</div>`;
    return;
  }
  if (!apiMembers.length) {
    label.textContent = "暂无用户";
    table.innerHTML = `
      <tr>
        <td colspan="7"><strong>还没有用户</strong><span>前台点击“微信登录并保存”后会自动创建本地用户</span></td>
      </tr>
    `;
    detail.innerHTML = `<div class="detail-empty">暂无用户数据<br>登录保存报告后会展示详情</div>`;
    return;
  }
  const filteredMembers = applyMemberFilters(apiMembers);
  if (!filteredMembers.length) {
    selectedMemberId = null;
    label.textContent = `共 0 / ${apiMembers.length} 位用户`;
    table.innerHTML = `
      <tr>
        <td colspan="7"><strong>没有匹配用户</strong><span>换个关键词或报告状态试试</span></td>
      </tr>
    `;
    detail.innerHTML = `<div class="detail-empty">没有匹配的用户<br>可以重置检索条件</div>`;
    return;
  }
  if (!selectedMemberId || !filteredMembers.some((user) => user.id === selectedMemberId)) {
    selectedMemberId = filteredMembers[0].id;
  }
  label.textContent = `共 ${filteredMembers.length} / ${apiMembers.length} 位用户`;
  table.innerHTML = filteredMembers.map((user) => `
    <tr class="${user.id === selectedMemberId ? "row-selected" : ""}" data-member-row="${escapeHtml(user.id)}">
      <td><strong>${escapeHtml(user.nickname || "微信用户")}</strong><span>ID：${escapeHtml(user.id)}</span></td>
      <td><span class="pill">${escapeHtml(memberLoginLabel(user.loginType))}</span></td>
      <td><span class="pill">${escapeHtml(memberStageLabel(user.stage))}</span></td>
      <td>${Number(user.reportCount || 0)}</td>
      <td>${escapeHtml(formatDateTime(user.latestReportAt))}</td>
      <td>${escapeHtml(formatDateTime(user.createdAt))}</td>
      <td><button class="mini-button" type="button" data-member-detail="${escapeHtml(user.id)}">查看用户</button></td>
    </tr>
  `).join("");
  loadMemberDetail(selectedMemberId);
}

function renderMemberDetail(user, reports = []) {
  const detail = $("#memberDetail");
  if (!detail) return;
  if (!user) {
    detail.innerHTML = `<div class="detail-empty">请选择一位用户<br>这里会展示用户档案和历史报告</div>`;
    return;
  }
  const latestReport = reports[0];
  detail.innerHTML = `
    <div class="detail-head">
      <div>
        <strong>${escapeHtml(user.nickname || "微信用户")}</strong>
        <small>${escapeHtml(memberLoginLabel(user.loginType))} · ${escapeHtml(user.id)}</small>
      </div>
      <div class="detail-tags">
        <span class="pill">报告 ${Number(user.reportCount || reports.length || 0)}</span>
        <span class="pill">${latestReport ? "有历史报告" : "暂无报告"}</span>
      </div>
    </div>
    <div class="member-metrics">
      <section class="member-metric">
        <span>创建时间</span>
        <b>${escapeHtml(formatDateTime(user.createdAt))}</b>
      </section>
      <section class="member-metric">
        <span>最近更新</span>
        <b>${escapeHtml(formatDateTime(user.updatedAt || user.latestReportAt))}</b>
      </section>
      <section class="member-metric">
        <span>最近报告</span>
        <b>${latestReport ? escapeHtml(latestReport.type) : "暂无"}</b>
      </section>
      <section class="member-metric">
        <span>7 天进度</span>
        <b>${latestReport ? escapeHtml(latestReport.progress) : "0 / 7"}</b>
      </section>
    </div>
    <section class="detail-block">
      <span>用户标识</span>
      <ul class="detail-list">
        <li><strong>用户 ID</strong><em>${escapeHtml(user.id)}</em></li>
        <li><strong>OpenID</strong><em>${escapeHtml(user.openid || "未写入")}</em></li>
        <li><strong>登录方式</strong><em>${escapeHtml(memberLoginLabel(user.loginType))}</em></li>
      </ul>
    </section>
    <section class="detail-block member-meta-block">
      <span>运营标记</span>
      <label class="field">
        <span>跟进阶段</span>
        <select data-member-stage="${escapeHtml(user.id)}">
          ${memberStageOptions.map(([value, label]) => `
            <option value="${value}" ${(user.stage || "new") === value ? "selected" : ""}>${label}</option>
          `).join("")}
        </select>
      </label>
      <label class="field">
        <span>用户备注</span>
        <textarea rows="3" data-member-note="${escapeHtml(user.id)}" placeholder="例如：重要场合用户；已提醒补照片；适合推送 7 天计划。">${escapeHtml(user.note || "")}</textarea>
      </label>
      <button class="primary-action wide" type="button" data-save-member-meta="${escapeHtml(user.id)}">保存用户标记</button>
    </section>
    <section class="detail-block member-history">
      <span>历史报告</span>
      ${reports.length ? `
        <ul class="detail-list">
          ${reports.map((report) => `
            <li>
              <strong>${escapeHtml(report.submittedAt || report.id)}</strong>
              <em>
                ${escapeHtml(reportHistoryLabel(report))}
                <button class="mini-button inline-button" type="button" data-member-report="${escapeHtml(report.id)}">查看报告</button>
              </em>
            </li>
          `).join("")}
        </ul>
      ` : `<p>该用户还没有保存过报告。</p>`}
    </section>
  `;
}

function renderQuestions() {
  $("#questionList").innerHTML = questionBank.map((question, index) => `
    <article class="question-item question-editor" data-question-id="${escapeHtml(question.id)}">
      <div class="question-editor-head">
        <i class="question-index">${index + 1}</i>
        <label class="question-enabled">
          <input type="checkbox" data-question-enabled ${question.enabled !== false ? "checked" : ""}>
          <span>${question.enabled !== false ? "启用" : "停用"}</span>
        </label>
      </div>
      <div class="question-fields">
        <label class="field">
          <span>题干</span>
          <textarea rows="2" data-question-title>${escapeHtml(question.question)}</textarea>
        </label>
        <label class="field">
          <span>题目分组</span>
          <input data-question-group value="${escapeHtml(question.group)}">
        </label>
      </div>
      <div class="option-editor-grid">
        ${(question.options || []).map((option, optionIndex) => `
          <section class="option-editor" data-option-index="${optionIndex}">
            <b>选项 ${optionIndex + 1}</b>
            <input data-option-label value="${escapeHtml(option.label)}" placeholder="选项文案">
            <select data-option-type>
              ${answerTypeOptions.map(([value, label]) => `
                <option value="${value}" ${option.type === value ? "selected" : ""}>${label}</option>
              `).join("")}
            </select>
            <select data-option-image>
              ${quizImageOptions.map((image) => `
                <option value="${image}" ${option.image === image ? "selected" : ""}>${image}</option>
              `).join("")}
            </select>
          </section>
        `).join("")}
      </div>
    </article>
  `).join("");
}

function collectQuestionBank() {
  return $all("[data-question-id]").map((card, index) => ({
    id: card.dataset.questionId,
    order: index + 1,
    enabled: $('[data-question-enabled]', card)?.checked !== false,
    question: $('[data-question-title]', card)?.value?.trim() || `第 ${index + 1} 题`,
    group: $('[data-question-group]', card)?.value?.trim() || "未分组",
    options: $all("[data-option-index]", card).map((optionCard) => ({
      label: $('[data-option-label]', optionCard)?.value?.trim() || "待补充选项",
      type: $('[data-option-type]', optionCard)?.value || "balanced",
      image: $('[data-option-image]', optionCard)?.value || "face-photo.png"
    }))
  }));
}

function saveQuestionBankConfig() {
  questionBank = collectQuestionBank();
  adminConfig = window.writeKuailianAdminConfig({
    ...adminConfig,
    questionBank,
    collapseTypeParams,
    photoRules,
    flowSwitches
  });
  questionBank = adminConfig.questionBank;
  renderQuestions();
  showToast("已保存问卷题库，H5 测评会读取新题目");
  persistAdminConfig("已保存问卷题库并同步到 SQLite");
}

function resetQuestionBankConfig() {
  questionBank = window.KUAILIAN_DEFAULT_ADMIN_CONFIG.questionBank;
  adminConfig = window.writeKuailianAdminConfig({
    ...adminConfig,
    questionBank,
    collapseTypeParams,
    photoRules,
    flowSwitches
  });
  questionBank = adminConfig.questionBank;
  renderQuestions();
  showToast("已恢复默认 10 题题库");
  persistAdminConfig("已恢复默认题库并同步到 SQLite");
}

function renderRuleList(selector, rows) {
  $(selector).innerHTML = rows.map(([title, desc, tag]) => `
    <article class="rule-item">
      <i class="status-dot"></i>
      <div><b>${title}</b><span>${desc}</span></div>
      <em class="pill">${tag}</em>
    </article>
  `).join("");
}

function renderSwitches() {
  $("#flowSwitches").innerHTML = flowSwitches.map(([title, desc, enabled]) => `
    <article class="switch-item">
      <i class="status-dot"></i>
      <div><b>${title}</b><span>${desc}</span></div>
      <em class="pill">${enabled ? "开启" : "关闭"}</em>
    </article>
  `).join("");
}

function renderTypeParams() {
  $("#collapseTypeConfig").innerHTML = collapseTypeParams.map((type, index) => `
    <article class="type-card" data-type-id="${type.id}">
      <div class="type-head">
        <i class="type-badge">${index + 1}</i>
        <div>
          <b>${type.name}</b>
          <span>${type.priority} · ${type.level}</span>
        </div>
        <em class="pill">启用</em>
      </div>
      <p>${type.desc}</p>
      <div class="param-row">
        <label>
          <span>判定阈值</span>
          <input type="number" min="0" max="100" value="${type.threshold}" data-param="threshold">
        </label>
        <label>
          <span>等级标签</span>
          <input value="${type.level}" data-param="level">
        </label>
      </div>
      <div class="weight-grid">
        ${Object.entries(type.weights).map(([name, value]) => `
          <label class="weight-item">
            <span>${name}</span>
            <input type="range" min="0" max="60" value="${value}" data-weight="${name}">
            <b data-weight-value="${name}">${value}</b>
          </label>
        `).join("")}
      </div>
    </article>
  `).join("");
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function collectTypeParams() {
  return collapseTypeParams.map((type) => {
    const card = $(`[data-type-id="${type.id}"]`);
    if (!card) return type;
    const thresholdInput = $('[data-param="threshold"]', card);
    const levelInput = $('[data-param="level"]', card);
    const weights = { ...type.weights };
    $all("[data-weight]", card).forEach((input) => {
      weights[input.dataset.weight] = clampNumber(input.value, 0, 60, weights[input.dataset.weight] || 0);
    });
    return {
      ...type,
      threshold: clampNumber(thresholdInput?.value, 0, 100, type.threshold),
      level: levelInput?.value?.trim() || type.level,
      weights
    };
  });
}

function saveTypeParams() {
  collapseTypeParams = collectTypeParams();
  collapseTypeParams = mergeContentEditor(collapseTypeParams);
  adminConfig = window.writeKuailianAdminConfig({
    ...adminConfig,
    collapseTypeParams,
    photoRules,
    flowSwitches
  });
  collapseTypeParams = adminConfig.collapseTypeParams;
  reportRules = adminConfig.reportRules;
  photoRules = adminConfig.photoRules;
  flowSwitches = adminConfig.flowSwitches;
  renderRuleList("#reportRules", reportRules);
  showToast("已保存垮脸类型参数，H5 报告会读取新配置");
  persistAdminConfig("已保存垮脸类型参数并同步到 SQLite");
}

function formatPairLines(items = []) {
  return items.map(([title, detail]) => `${title}｜${detail}`).join("\n");
}

function formatAdviceLines(items = []) {
  return items.map(([icon, title, detail]) => `${icon}｜${title}｜${detail}`).join("\n");
}

function formatPlanLines(items = []) {
  return items.map(([title, tasks]) => `${title}｜${(tasks || []).join("；")}`).join("\n");
}

function parseParts(line) {
  return line.split(/[｜|]/).map((item) => item.trim()).filter(Boolean);
}

function parsePairLines(value) {
  return value.split(/\n+/)
    .map((line) => parseParts(line))
    .filter((parts) => parts.length)
    .map(([title, ...detailParts]) => [title, detailParts.join("｜") || "待补充说明"]);
}

function parseAdviceLines(value) {
  return value.split(/\n+/)
    .map((line) => parseParts(line))
    .filter((parts) => parts.length)
    .map((parts) => {
      if (parts.length >= 3) return [parts[0], parts[1], parts.slice(2).join("｜")];
      if (parts.length === 2) return ["advice", parts[0], parts[1]];
      return ["advice", parts[0], "按当前状态选择一个容易执行的小动作。"];
    });
}

function parsePlanLines(value) {
  return value.split(/\n+/)
    .map((line) => parseParts(line))
    .filter((parts) => parts.length)
    .map(([title, taskText]) => [
      title,
      (taskText || "完成一个轻量动作；记录上镜状态；保持节奏")
        .split(/[；;]/)
        .map((item) => item.trim())
        .filter(Boolean)
    ]);
}

function renderContentEditor() {
  const select = $("#contentTypeSelect");
  const editor = $("#contentEditor");
  if (!select || !editor) return;
  if (!collapseTypeParams.some((type) => type.id === selectedContentTypeId)) {
    selectedContentTypeId = collapseTypeParams[0]?.id || "posture";
  }
  select.innerHTML = collapseTypeParams.map((type) => `
    <option value="${type.id}" ${type.id === selectedContentTypeId ? "selected" : ""}>${type.name}</option>
  `).join("");
  const type = collapseTypeParams.find((item) => item.id === selectedContentTypeId) || collapseTypeParams[0];
  if (!type) return;
  editor.innerHTML = `
    <label class="field content-field">
      <span>类型说明</span>
      <textarea rows="3" data-content-field="desc">${type.desc || ""}</textarea>
    </label>
    <label class="field content-field">
      <span>主要影响因素（每行：标题｜说明）</span>
      <textarea rows="5" data-content-field="factors">${formatPairLines(type.factors)}</textarea>
    </label>
    <label class="field content-field">
      <span>今日建议（每行：图标key｜标题｜说明，图标可用 phone/cold/moon/score/reason/advice）</span>
      <textarea rows="5" data-content-field="advice">${formatAdviceLines(type.advice)}</textarea>
    </label>
    <label class="field content-field">
      <span>7 天计划（每行：天名称｜任务1；任务2；任务3）</span>
      <textarea rows="8" data-content-field="plan">${formatPlanLines(type.plan)}</textarea>
    </label>
  `;
}

function mergeContentEditor(types = collapseTypeParams) {
  const editor = $("#contentEditor");
  if (!editor) return types;
  const current = types.find((type) => type.id === selectedContentTypeId);
  if (!current) return types;
  const desc = $('[data-content-field="desc"]', editor)?.value?.trim() || current.desc;
  const factors = parsePairLines($('[data-content-field="factors"]', editor)?.value || "");
  const advice = parseAdviceLines($('[data-content-field="advice"]', editor)?.value || "");
  const plan = parsePlanLines($('[data-content-field="plan"]', editor)?.value || "");
  return types.map((type) => type.id === selectedContentTypeId
    ? {
      ...type,
      desc,
      factors: factors.length ? factors : type.factors,
      advice: advice.length ? advice : type.advice,
      plan: plan.length ? plan : type.plan
    }
    : type);
}

function saveContentConfig() {
  collapseTypeParams = collectTypeParams();
  collapseTypeParams = mergeContentEditor(collapseTypeParams);
  adminConfig = window.writeKuailianAdminConfig({
    ...adminConfig,
    collapseTypeParams,
    photoRules,
    flowSwitches
  });
  collapseTypeParams = adminConfig.collapseTypeParams;
  reportRules = adminConfig.reportRules;
  photoRules = adminConfig.photoRules;
  flowSwitches = adminConfig.flowSwitches;
  renderContentEditor();
  renderTypeParams();
  renderRuleList("#reportRules", reportRules);
  showToast("已保存报告内容，前台报告与 7 天计划会读取新文案");
  persistAdminConfig("已保存报告内容并同步到 SQLite");
}

function records() {
  const notes = readReportNotes();
  const remoteReports = apiReports || demoReports;
  return [localRecord(), ...remoteReports].map((item) => ({
    ...item,
    isRemote: Boolean(apiReports && !item.isLocal),
    note: item.note || notes[item.id] || ""
  }));
}

function csvCell(value) {
  const text = String(value ?? "").replaceAll('"', '""');
  return `"${text}"`;
}

function downloadTextFile(filename, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadCsv(filename, headers, rows) {
  const bom = "\ufeff";
  const content = [
    headers.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(","))
  ].join("\n");
  downloadTextFile(filename, `${bom}${content}`, "text/csv;charset=utf-8");
}

function exportReportsCsv() {
  const rows = records().filter((item) => item.done !== false);
  downloadCsv("kuailian-reports.csv", [
    "报告ID",
    "用户ID",
    "用户",
    "来源",
    "状态类型",
    "照片辅助",
    "登录保存",
    "7天进度",
    "提交时间",
    "问卷答案",
    "补充信息",
    "运营备注"
  ], rows.map((item) => [
    item.id,
    item.userId || "",
    item.name,
    reportSourceLabel(item),
    item.type,
    item.photo,
    item.saved,
    item.progress,
    item.submittedAt || item.createdAt || "",
    (item.answers || []).join(" / "),
    (item.supplements || []).join(" / "),
    item.note || ""
  ]));
  showToast(`已导出 ${rows.length} 份报告 CSV`);
}

function exportMembersCsv() {
  const users = apiMembers || [];
  if (!users.length) {
    showToast("暂无真实用户可导出，请先完成一次登录保存");
    return;
  }
  downloadCsv("kuailian-users.csv", [
    "用户ID",
    "昵称",
    "OpenID",
    "登录方式",
    "运营阶段",
    "用户备注",
    "报告数",
    "最近报告时间",
    "创建时间",
    "更新时间"
  ], users.map((user) => [
    user.id,
    user.nickname || "",
    user.openid || "",
    memberLoginLabel(user.loginType),
    memberStageLabel(user.stage),
    user.note || "",
    Number(user.reportCount || 0),
    user.latestReportAt || "",
    user.createdAt || "",
    user.updatedAt || ""
  ]));
  showToast(`已导出 ${users.length} 位用户 CSV`);
}

function renderAll() {
  const rows = records();
  renderKpis(rows);
  renderTrend(rows);
  renderDistribution(rows);
  renderTodos(rows);
  renderUsers(rows);
  renderMembers();
  renderQuestions();
  renderTypeParams();
  renderContentEditor();
  renderRuleList("#reportRules", reportRules);
  renderRuleList("#photoRules", photoRules);
  renderSwitches();
}

function setPanel(panel) {
  $all("[data-panel]").forEach((button) => {
    button.classList.toggle("active", button.dataset.panel === panel);
  });
  $all("[data-panel-view]").forEach((view) => {
    view.classList.toggle("active", view.dataset.panelView === panel);
  });
  $("#panelTitle").textContent = panelTitles[panel] || "数据概览";
}

function exportConfig() {
  collapseTypeParams = collectTypeParams();
  collapseTypeParams = mergeContentEditor(collapseTypeParams);
  const payload = {
    version: "admin-mvp-20260617",
    questionBank,
    collapseTypeParams,
    reportRules,
    photoRules,
    flowSwitches,
    localState: readState()
  };
  downloadTextFile("kuailian-admin-config.json", JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
  showToast("已导出后台配置 JSON");
}

$all("[data-panel]").forEach((button) => {
  button.addEventListener("click", () => setPanel(button.dataset.panel));
});

$("#refreshData").addEventListener("click", () => {
  renderAll();
  loadReportsFromApi(true);
  loadMembersFromApi(true);
  loadAdminConfigFromApi(true);
});

$("#exportConfig").addEventListener("click", exportConfig);
$("#exportMembersCsv").addEventListener("click", exportMembersCsv);
$("#exportReportsCsv").addEventListener("click", exportReportsCsv);

document.addEventListener("click", (event) => {
  if (event.target.matches("[data-save-content]")) {
    saveContentConfig();
    return;
  }
  if (event.target.matches("[data-save-questions]")) {
    saveQuestionBankConfig();
    return;
  }
  if (event.target.matches("[data-reset-questions]")) {
    resetQuestionBankConfig();
    return;
  }
  if (event.target.matches("[data-save-types]")) {
    saveTypeParams();
    return;
  }
  if (event.target.matches("[data-save-demo]")) {
    showToast("MVP 阶段已模拟保存，真实后台会接接口");
  }
  const detailButton = event.target.closest("[data-report-detail]");
  const detailRow = event.target.closest("[data-report-row]");
  if (detailButton || detailRow) {
    selectedReportId = (detailButton || detailRow).dataset.reportDetail || detailRow.dataset.reportRow;
    renderUsers(records());
    return;
  }
  const memberButton = event.target.closest("[data-member-detail]");
  const memberRow = event.target.closest("[data-member-row]");
  if (memberButton || memberRow) {
    selectedMemberId = (memberButton || memberRow).dataset.memberDetail || memberRow.dataset.memberRow;
    renderMembers();
    return;
  }
  const memberReportButton = event.target.closest("[data-member-report]");
  if (memberReportButton) {
    selectedReportId = memberReportButton.dataset.memberReport;
    setPanel("users");
    renderUsers(records());
    return;
  }
  const saveMemberButton = event.target.closest("[data-save-member-meta]");
  if (saveMemberButton) {
    const userId = saveMemberButton.dataset.saveMemberMeta;
    const stage = $(`[data-member-stage="${userId}"]`)?.value || "new";
    const note = $(`[data-member-note="${userId}"]`)?.value?.trim() || "";
    saveMemberMetaToApi(userId, stage, note)
      .then(() => {
        renderMembers();
        showToast("已保存用户标记");
      })
      .catch(() => showToast("用户标记保存失败，请确认 API 已启动"));
    return;
  }
  const saveNoteButton = event.target.closest("[data-save-note]");
  if (saveNoteButton) {
    const reportId = saveNoteButton.dataset.saveNote;
    const noteInput = $(`[data-note-report="${reportId}"]`);
    const notes = readReportNotes();
    const note = noteInput?.value?.trim() || "";
    if (note) {
      notes[reportId] = note;
    } else {
      delete notes[reportId];
    }
    writeReportNotes(notes);
    saveReportNoteToApi(reportId, note)
      .then(() => {
        renderUsers(records());
        showToast(apiOnline ? "已保存运营备注到 mock API" : "已保存运营备注");
      })
      .catch(() => {
        apiOnline = false;
        renderUsers(records());
        showToast("mock API 保存失败，已保存在本地");
      });
    return;
  }
  if (event.target.matches("#resetUserFilters")) {
    userFilters = { type: "all", photo: "all", saved: "all", progress: "all" };
    renderUsers(records());
    showToast("已重置报告筛选");
    return;
  }
  if (event.target.matches("#resetMemberFilters")) {
    memberFilters = { query: "", reportStatus: "all", stage: "all" };
    renderMembers();
    showToast("已重置用户检索");
    return;
  }
  if (event.target.matches("[data-open-front-report]")) {
    window.open("./index.html#report", "_blank");
  }
});

document.addEventListener("input", (event) => {
  if (!event.target.matches("[data-weight]")) return;
  const value = event.target.closest(".weight-item")?.querySelector("[data-weight-value]");
  if (value) value.textContent = event.target.value;
});

$("#contentTypeSelect")?.addEventListener("change", (event) => {
  selectedContentTypeId = event.target.value;
  renderContentEditor();
});

$("#reportFilters")?.addEventListener("change", (event) => {
  const target = event.target;
  if (!target.matches("select")) return;
  userFilters = {
    type: $("#filterType").value,
    photo: $("#filterPhoto").value,
    saved: $("#filterSaved").value,
    progress: $("#filterProgress").value
  };
  renderUsers(records());
});

$("#memberFilters")?.addEventListener("input", (event) => {
  const target = event.target;
  if (!target.matches("input")) return;
  memberFilters.query = $("#memberSearch").value;
  renderMembers();
});

$("#memberFilters")?.addEventListener("change", (event) => {
  const target = event.target;
  if (!target.matches("select")) return;
  memberFilters = {
    query: $("#memberSearch").value,
    reportStatus: $("#memberReportFilter").value,
    stage: $("#memberStageFilter").value
  };
  renderMembers();
});

renderAll();
loadReportsFromApi(false);
loadMembersFromApi(false);
loadAdminConfigFromApi(false);
