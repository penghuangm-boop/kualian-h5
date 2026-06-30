const http = require("node:http");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const port = Number(process.env.PORT || 4174);
const dataDir = path.join(__dirname, "data");
const dbPath = path.join(dataDir, "kuailian.sqlite");

loadEnvFile();

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return;
    const [key, ...valueParts] = trimmed.split("=");
    if (process.env[key]) return;
    process.env[key] = valueParts.join("=").replace(/^["']|["']$/g, "");
  });
}

function env(name, fallback = "") {
  return process.env[name] || fallback;
}

function publicBaseUrl() {
  return env("PUBLIC_BASE_URL", "http://127.0.0.1:4173").replace(/\/$/, "");
}

const seedReports = [
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
    photoSummary: { count: 3, light: "光线适中", contrast: "层次清楚", clarity: "分辨率充足" },
    note: ""
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
    photoSummary: null,
    note: ""
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
    photoSummary: { count: 2, light: "偏亮", contrast: "层次清楚", clarity: "分辨率充足" },
    note: ""
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
    photoSummary: null,
    note: ""
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
    photoSummary: { count: 3, light: "光线适中", contrast: "画面对比偏弱", clarity: "分辨率一般" },
    note: ""
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
    photoSummary: null,
    note: ""
  }
];

function sql(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function runSql(statement, json = false) {
  const args = json ? ["-json", dbPath, statement] : [dbPath, statement];
  const output = execFileSync("sqlite3", args, { encoding: "utf8" }).trim();
  return json ? JSON.parse(output || "[]") : output;
}

function columnExists(tableName, columnName) {
  return runSql(`PRAGMA table_info(${tableName});`, true)
    .some((column) => column.name === columnName);
}

function initDb() {
  fs.mkdirSync(dataDir, { recursive: true });
  runSql(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      nickname TEXT NOT NULL,
      openid TEXT,
      login_type TEXT NOT NULL DEFAULT 'mock',
      stage TEXT NOT NULL DEFAULT 'new',
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      photo TEXT NOT NULL,
      saved TEXT NOT NULL,
      progress TEXT NOT NULL,
      submitted_at TEXT NOT NULL,
      answers_json TEXT NOT NULL DEFAULT '[]',
      supplements_json TEXT NOT NULL DEFAULT '[]',
      photo_summary_json TEXT,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS report_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS admin_config (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  if (!columnExists("reports", "user_id")) {
    runSql("ALTER TABLE reports ADD COLUMN user_id TEXT;");
  }
  if (!columnExists("users", "stage")) {
    runSql("ALTER TABLE users ADD COLUMN stage TEXT NOT NULL DEFAULT 'new';");
  }
  if (!columnExists("users", "note")) {
    runSql("ALTER TABLE users ADD COLUMN note TEXT NOT NULL DEFAULT '';");
  }
  const count = Number(runSql("SELECT COUNT(*) FROM reports;") || 0);
  if (count > 0) return;
  seedReports.forEach((report) => {
    runSql(`
      INSERT INTO reports (
        id, name, type, photo, saved, progress, submitted_at,
        answers_json, supplements_json, photo_summary_json, note
      ) VALUES (
        ${sql(report.id)}, ${sql(report.name)}, ${sql(report.type)}, ${sql(report.photo)},
        ${sql(report.saved)}, ${sql(report.progress)}, ${sql(report.submittedAt)},
        ${sql(JSON.stringify(report.answers || []))},
        ${sql(JSON.stringify(report.supplements || []))},
        ${sql(report.photoSummary ? JSON.stringify(report.photoSummary) : null)},
        ${sql(report.note || "")}
      );
    `);
  });
}

function normalizeReport(row) {
  return {
    id: row.id,
    userId: row.user_id || null,
    name: row.name,
    type: row.type,
    photo: row.photo,
    saved: row.saved,
    progress: row.progress,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    answers: JSON.parse(row.answers_json || "[]"),
    supplements: JSON.parse(row.supplements_json || "[]"),
    photoSummary: row.photo_summary_json ? JSON.parse(row.photo_summary_json) : null,
    note: row.note || ""
  };
}

function listReports() {
  return runSql("SELECT * FROM reports ORDER BY created_at ASC;", true).map(normalizeReport);
}

function getReport(id) {
  const rows = runSql(`SELECT * FROM reports WHERE id = ${sql(id)} LIMIT 1;`, true);
  return rows[0] ? normalizeReport(rows[0]) : null;
}

function normalizeUser(row) {
  return {
    id: row.id,
    nickname: row.nickname,
    openid: row.openid || null,
    loginType: row.login_type,
    stage: row.stage || "new",
    note: row.note || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reportCount: Number(row.report_count || 0),
    latestReportAt: row.latest_report_at || null
  };
}

function updateUserMeta(id, payload = {}) {
  const user = getUser(id);
  if (!user) return null;
  const allowedStages = new Set(["new", "priority", "photo", "high", "contacted"]);
  const stage = allowedStages.has(payload.stage) ? payload.stage : user.stage;
  const note = typeof payload.note === "string" ? payload.note.trim() : user.note;
  runSql(`
    UPDATE users
    SET stage = ${sql(stage)},
        note = ${sql(note)},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${sql(id)};
  `);
  return getUser(id);
}

function mockLogin(payload = {}) {
  const userId = payload.userId || `user-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const nickname = payload.nickname || "微信模拟用户";
  runSql(`
    INSERT INTO users (id, nickname, openid, login_type, updated_at)
    VALUES (${sql(userId)}, ${sql(nickname)}, ${sql(payload.openid || `mock-${userId}`)}, ${sql("mock")}, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      nickname = excluded.nickname,
      openid = COALESCE(users.openid, excluded.openid),
      updated_at = CURRENT_TIMESTAMP;
  `);
  return getUser(userId);
}

function readWechatConfig() {
  const wechatMode = env("WECHAT_MODE", "mock");
  const payMode = env("WECHAT_PAY_MODE", "mock");
  const oauthRedirectUri = env(
    "WECHAT_OAUTH_REDIRECT_URI",
    `${publicBaseUrl()}/api/wechat/callback`
  );
  const payNotifyUrl = env(
    "WECHAT_PAY_NOTIFY_URL",
    `${publicBaseUrl()}/api/pay/notify`
  );
  const oauthReady = Boolean(
    env("WECHAT_APP_ID") &&
    env("WECHAT_APP_SECRET") &&
    oauthRedirectUri
  );
  const payReady = Boolean(
    env("WECHAT_MCH_ID") &&
    env("WECHAT_PAY_API_V3_KEY") &&
    env("WECHAT_PAY_PRIVATE_KEY_PATH") &&
    env("WECHAT_PAY_SERIAL_NO") &&
    payNotifyUrl
  );

  return {
    wechatMode,
    payMode,
    publicBaseUrl: publicBaseUrl(),
    oauthReady: wechatMode === "wechat" && oauthReady,
    payReady: payMode === "wechat_jsapi" && payReady,
    appId: env("WECHAT_APP_ID"),
    appSecret: env("WECHAT_APP_SECRET"),
    oauthRedirectUri,
    mchId: env("WECHAT_MCH_ID"),
    payNotifyUrl,
    productName: env("WECHAT_PAY_PRODUCT_NAME", "7 天状态管理"),
    amountCents: Number(env("WECHAT_PAY_AMOUNT_CENTS", "990"))
  };
}

function publicWechatConfig() {
  const config = readWechatConfig();
  return {
    wechatMode: config.wechatMode,
    payMode: config.payMode,
    oauthReady: config.oauthReady,
    payReady: config.payReady,
    publicBaseUrl: config.publicBaseUrl,
    productName: config.productName,
    amountCents: config.amountCents
  };
}

function createWechatOAuthUrl(payload = {}) {
  const config = readWechatConfig();
  if (!config.oauthReady) {
    return {
      mode: "mock",
      loginUrl: null,
      reason: config.wechatMode === "wechat" ? "wechat_oauth_not_configured" : "mock_mode"
    };
  }
  const state = payload.state || crypto.randomBytes(8).toString("hex");
  const params = new URLSearchParams({
    appid: config.appId,
    redirect_uri: config.oauthRedirectUri,
    response_type: "code",
    scope: payload.scope || "snsapi_base",
    state
  });
  return {
    mode: "wechat",
    state,
    loginUrl: `https://open.weixin.qq.com/connect/oauth2/authorize?${params.toString()}#wechat_redirect`
  };
}

function handleWechatCallback(url) {
  const config = readWechatConfig();
  if (!config.oauthReady) {
    return {
      redirect: `${config.publicBaseUrl}/#home`,
      user: mockLogin({ nickname: "微信模拟用户", openid: `mock-oauth-${Date.now()}` }),
      mode: "mock"
    };
  }
  if (!url.searchParams.get("code")) {
    return {
      redirect: `${config.publicBaseUrl}/#home?wechat_error=missing_code`,
      user: null,
      mode: "wechat"
    };
  }
  return {
    redirect: `${config.publicBaseUrl}/#home?wechat_error=exchange_pending`,
    user: null,
    mode: "wechat",
    error: "wechat_code_exchange_pending"
  };
}

function parseCookies(request) {
  return Object.fromEntries(String(request.headers.cookie || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [key, ...valueParts] = part.split("=");
      return [decodeURIComponent(key), decodeURIComponent(valueParts.join("="))];
    }));
}

function getSessionFromRequest(request) {
  const cookies = parseCookies(request);
  const userId = cookies.kuailian_user_id;
  const user = userId ? getUser(userId) : null;
  return { logged: Boolean(user), user };
}

function createPaymentOrder(payload = {}, request = null) {
  const config = readWechatConfig();
  const session = request ? getSessionFromRequest(request) : { user: null };
  const orderId = `pay-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const amountCents = Math.max(1, Number(payload.amountCents || config.amountCents || 990));
  const order = {
    id: orderId,
    mode: config.payMode,
    productName: payload.productName || config.productName,
    amountCents,
    reportId: payload.reportId || null,
    userId: payload.userId || session.user?.id || null,
    createdAt: new Date().toISOString()
  };

  if (config.payMode !== "wechat_jsapi") {
    if (order.reportId) writeEvent(order.reportId, "payment_mock_paid", order);
    return {
      order,
      payParams: null,
      status: "paid_mock",
      message: "模拟支付成功"
    };
  }

  if (!config.payReady) {
    return {
      order,
      payParams: null,
      status: "not_configured",
      error: "wechat_pay_not_configured"
    };
  }

  return {
    order,
    payParams: null,
    status: "pending_real_integration",
    error: "wechat_pay_jsapi_signing_pending"
  };
}

function handlePaymentNotify(payload = {}) {
  return {
    code: "SUCCESS",
    message: "mock notification accepted",
    payload
  };
}

function listUsers() {
  return runSql(`
    SELECT
      users.*,
      COUNT(reports.id) AS report_count,
      MAX(reports.created_at) AS latest_report_at
    FROM users
    LEFT JOIN reports ON reports.user_id = users.id
    GROUP BY users.id
    ORDER BY users.created_at DESC;
  `, true).map(normalizeUser);
}

function getUser(id) {
  const rows = runSql(`
    SELECT
      users.*,
      COUNT(reports.id) AS report_count,
      MAX(reports.created_at) AS latest_report_at
    FROM users
    LEFT JOIN reports ON reports.user_id = users.id
    WHERE users.id = ${sql(id)}
    GROUP BY users.id
    LIMIT 1;
  `, true);
  return rows[0] ? normalizeUser(rows[0]) : null;
}

function reportsByUser(userId) {
  return runSql(`SELECT * FROM reports WHERE user_id = ${sql(userId)} ORDER BY created_at DESC;`, true)
    .map(normalizeReport);
}

function createReport(payload = {}) {
  const reportId = payload.id || `h5-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const userId = payload.userId || null;
  const answers = Array.isArray(payload.answers) ? payload.answers : [];
  const supplements = Array.isArray(payload.supplements) ? payload.supplements : [];
  const report = payload.report || {};
  runSql(`
    INSERT INTO reports (
      id, user_id, name, type, photo, saved, progress, submitted_at,
      answers_json, supplements_json, photo_summary_json, note
    ) VALUES (
      ${sql(reportId)},
      ${sql(userId)},
      ${sql(payload.name || "H5 测评用户")},
      ${sql(report.type || "待分析")},
      ${sql("未补充")},
      ${sql(payload.logged ? "已登录" : "未登录")},
      ${sql("0 / 7")},
      ${sql(new Date().toLocaleString("zh-CN", { hour12: false }))},
      ${sql(JSON.stringify(answers.map((item) => item?.label || item).filter(Boolean)))},
      ${sql(JSON.stringify(supplements))},
      NULL,
      ${sql("")}
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      user_id = COALESCE(excluded.user_id, reports.user_id),
      type = excluded.type,
      saved = excluded.saved,
      answers_json = excluded.answers_json,
      supplements_json = excluded.supplements_json,
      updated_at = CURRENT_TIMESTAMP;
  `);
  writeEvent(reportId, "report_created", payload);
  return getReport(reportId);
}

function updatePhoto(reportId, photoSummary) {
  runSql(`
    UPDATE reports
    SET photo = ${sql("已补充")},
        photo_summary_json = ${sql(JSON.stringify(photoSummary || {}))},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${sql(reportId)};
  `);
  writeEvent(reportId, "photo_updated", photoSummary || {});
  return getReport(reportId);
}

function updateCheckin(reportId, payload = {}) {
  const completedDays = Math.max(0, Math.min(7, Number(payload.completedDays || 0)));
  runSql(`
    UPDATE reports
    SET progress = ${sql(`${completedDays} / 7`)},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${sql(reportId)};
  `);
  writeEvent(reportId, "checkin_updated", payload);
  return getReport(reportId);
}

function updateNote(id, note) {
  runSql(`
    UPDATE reports
    SET note = ${sql(note)}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${sql(id)};
  `);
  return getReport(id);
}

function writeEvent(reportId, eventType, payload) {
  runSql(`
    INSERT INTO report_events (report_id, event_type, payload_json)
    VALUES (${sql(reportId)}, ${sql(eventType)}, ${sql(JSON.stringify(payload || {}))});
  `);
}

function readConfig(key) {
  const rows = runSql(`SELECT value_json FROM admin_config WHERE key = ${sql(key)} LIMIT 1;`, true);
  return rows[0] ? JSON.parse(rows[0].value_json) : null;
}

function writeConfig(key, value) {
  runSql(`
    INSERT INTO admin_config (key, value_json, updated_at)
    VALUES (${sql(key)}, ${sql(JSON.stringify(value))}, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET
      value_json = excluded.value_json,
      updated_at = CURRENT_TIMESTAMP;
  `);
  return readConfig(key);
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

initDb();

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  try {
    if (request.method === "OPTIONS") {
      sendJson(response, 204, {});
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, { ok: true, service: "kuailian-sqlite-api", db: dbPath });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/wechat/config") {
      sendJson(response, 200, publicWechatConfig());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/wechat/oauth-url") {
      sendJson(response, 200, createWechatOAuthUrl({
        state: url.searchParams.get("state") || undefined,
        scope: url.searchParams.get("scope") || undefined
      }));
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/wechat/callback") {
      const result = handleWechatCallback(url);
      const headers = { Location: result.redirect };
      if (result.user?.id) {
        headers["Set-Cookie"] = `kuailian_user_id=${encodeURIComponent(result.user.id)}; Path=/; HttpOnly; SameSite=Lax`;
      }
      response.writeHead(302, headers);
      response.end();
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/auth/session") {
      sendJson(response, 200, getSessionFromRequest(request));
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/admin/reports") {
      sendJson(response, 200, { reports: listReports() });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/auth/mock-login") {
      const body = await readBody(request);
      sendJson(response, 200, { user: mockLogin(body) });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/admin/users") {
      sendJson(response, 200, { users: listUsers() });
      return;
    }

    const userMatch = url.pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
    if (request.method === "GET" && userMatch) {
      const user = getUser(decodeURIComponent(userMatch[1]));
      sendJson(response, user ? 200 : 404, user
        ? { user, reports: reportsByUser(user.id) }
        : { error: "user_not_found" });
      return;
    }

    if (request.method === "PUT" && userMatch) {
      const body = await readBody(request);
      const user = updateUserMeta(decodeURIComponent(userMatch[1]), body);
      sendJson(response, user ? 200 : 404, user ? { user } : { error: "user_not_found" });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/reports") {
      const body = await readBody(request);
      sendJson(response, 201, { report: createReport(body) });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/pay/orders") {
      const body = await readBody(request);
      const payment = createPaymentOrder(body, request);
      const statusCode = payment.status === "not_configured" ? 409 : 201;
      sendJson(response, statusCode, payment);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/pay/notify") {
      const body = await readBody(request);
      sendJson(response, 200, handlePaymentNotify(body));
      return;
    }

    const photoMatch = url.pathname.match(/^\/api\/reports\/([^/]+)\/photo$/);
    if (request.method === "PUT" && photoMatch) {
      const body = await readBody(request);
      const report = updatePhoto(decodeURIComponent(photoMatch[1]), body.photoSummary || body);
      sendJson(response, report ? 200 : 404, report ? { report } : { error: "report_not_found" });
      return;
    }

    const checkinMatch = url.pathname.match(/^\/api\/reports\/([^/]+)\/checkin$/);
    if (request.method === "PUT" && checkinMatch) {
      const body = await readBody(request);
      const report = updateCheckin(decodeURIComponent(checkinMatch[1]), body);
      sendJson(response, report ? 200 : 404, report ? { report } : { error: "report_not_found" });
      return;
    }

    const reportMatch = url.pathname.match(/^\/api\/admin\/reports\/([^/]+)$/);
    if (request.method === "GET" && reportMatch) {
      const report = getReport(decodeURIComponent(reportMatch[1]));
      sendJson(response, report ? 200 : 404, report ? { report } : { error: "report_not_found" });
      return;
    }

    const noteMatch = url.pathname.match(/^\/api\/admin\/reports\/([^/]+)\/note$/);
    if (request.method === "PUT" && noteMatch) {
      const body = await readBody(request);
      const report = updateNote(decodeURIComponent(noteMatch[1]), String(body.note || "").trim());
      sendJson(response, report ? 200 : 404, report ? { report } : { error: "report_not_found" });
      return;
    }

    const configMatch = url.pathname.match(/^\/api\/admin\/config\/([^/]+)$/);
    if (request.method === "GET" && configMatch) {
      sendJson(response, 200, { key: decodeURIComponent(configMatch[1]), value: readConfig(decodeURIComponent(configMatch[1])) });
      return;
    }

    if (request.method === "PUT" && configMatch) {
      const body = await readBody(request);
      const key = decodeURIComponent(configMatch[1]);
      sendJson(response, 200, { key, value: writeConfig(key, body.value ?? body) });
      return;
    }

    sendJson(response, 404, { error: "not_found" });
  } catch (error) {
    sendJson(response, 500, { error: "server_error", message: error.message });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Kuailian SQLite API running: http://127.0.0.1:${port}`);
  console.log(`SQLite database: ${dbPath}`);
});
