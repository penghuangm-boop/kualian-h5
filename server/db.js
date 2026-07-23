const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { readServerConfig } = require("./config");

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

function dbPath() {
  return readServerConfig().dbPath;
}

function runSql(statement, json = false) {
  const args = json ? ["-json", dbPath(), statement] : [dbPath(), statement];
  const output = execFileSync("sqlite3", args, { encoding: "utf8" }).trim();
  return json ? JSON.parse(output || "[]") : output;
}

function columnExists(tableName, columnName) {
  return runSql(`PRAGMA table_info(${tableName});`, true)
    .some((column) => column.name === columnName);
}

function initDb() {
  const config = readServerConfig();
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
  runSql(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      nickname TEXT NOT NULL,
      openid TEXT,
      unionid TEXT,
      avatar_url TEXT,
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
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      report_id TEXT,
      product_code TEXT NOT NULL,
      product_name TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      status TEXT NOT NULL,
      pay_mode TEXT NOT NULL,
      wechat_prepay_id TEXT,
      transaction_id TEXT,
      paid_at TEXT,
      raw_payload_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
  if (!columnExists("users", "unionid")) {
    runSql("ALTER TABLE users ADD COLUMN unionid TEXT;");
  }
  if (!columnExists("users", "avatar_url")) {
    runSql("ALTER TABLE users ADD COLUMN avatar_url TEXT;");
  }
  seedDemoReports();
}

function seedDemoReports() {
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

function normalizeUser(row) {
  return {
    id: row.id,
    nickname: row.nickname,
    openid: row.openid || null,
    unionid: row.unionid || null,
    avatarUrl: row.avatar_url || null,
    loginType: row.login_type,
    stage: row.stage || "new",
    note: row.note || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reportCount: Number(row.report_count || 0),
    latestReportAt: row.latest_report_at || null
  };
}

function normalizeOrder(row) {
  return {
    id: row.id,
    userId: row.user_id || null,
    reportId: row.report_id || null,
    productCode: row.product_code,
    productName: row.product_name,
    amountCents: Number(row.amount_cents || 0),
    status: row.status,
    payMode: row.pay_mode,
    wechatPrepayId: row.wechat_prepay_id || null,
    transactionId: row.transaction_id || null,
    paidAt: row.paid_at || null,
    rawPayload: JSON.parse(row.raw_payload_json || "{}"),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function listReports() {
  return runSql("SELECT * FROM reports ORDER BY created_at ASC;", true).map(normalizeReport);
}

function getReport(id) {
  const rows = runSql(`SELECT * FROM reports WHERE id = ${sql(id)} LIMIT 1;`, true);
  return rows[0] ? normalizeReport(rows[0]) : null;
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

function stableWechatUserId(openid) {
  return `wechat-${crypto.createHash("sha256").update(String(openid)).digest("hex").slice(0, 16)}`;
}

function upsertWechatUser(payload = {}) {
  if (!payload.openid) {
    throw new Error("openid is required for wechat login");
  }
  const userId = payload.userId || stableWechatUserId(payload.openid);
  const nickname = payload.nickname || "微信用户";
  runSql(`
    INSERT INTO users (id, nickname, openid, unionid, avatar_url, login_type, updated_at)
    VALUES (
      ${sql(userId)},
      ${sql(nickname)},
      ${sql(payload.openid)},
      ${sql(payload.unionid || null)},
      ${sql(payload.avatarUrl || null)},
      ${sql("wechat")},
      CURRENT_TIMESTAMP
    )
    ON CONFLICT(id) DO UPDATE SET
      nickname = excluded.nickname,
      openid = excluded.openid,
      unionid = COALESCE(excluded.unionid, users.unionid),
      avatar_url = COALESCE(excluded.avatar_url, users.avatar_url),
      login_type = ${sql("wechat")},
      updated_at = CURRENT_TIMESTAMP;
  `);
  return getUser(userId);
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
  if (!reportId) return;
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

function createOrder(payload = {}) {
  const orderId = payload.id || `order-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  runSql(`
    INSERT INTO orders (
      id, user_id, report_id, product_code, product_name, amount_cents,
      status, pay_mode, wechat_prepay_id, transaction_id, paid_at, raw_payload_json
    ) VALUES (
      ${sql(orderId)},
      ${sql(payload.userId || null)},
      ${sql(payload.reportId || null)},
      ${sql(payload.productCode || "seven_day_plan")},
      ${sql(payload.productName || "7 天状态管理")},
      ${sql(Math.max(1, Number(payload.amountCents || 990)))},
      ${sql(payload.status || "pending")},
      ${sql(payload.payMode || "mock")},
      ${sql(payload.wechatPrepayId || null)},
      ${sql(payload.transactionId || null)},
      ${sql(payload.paidAt || null)},
      ${sql(JSON.stringify(payload.rawPayload || {}))}
    );
  `);
  return getOrder(orderId);
}

function markOrderPaid(id, payload = {}) {
  runSql(`
    UPDATE orders
    SET status = ${sql("paid")},
        transaction_id = ${sql(payload.transactionId || `mock-${id}`)},
        wechat_prepay_id = COALESCE(${sql(payload.wechatPrepayId || null)}, wechat_prepay_id),
        paid_at = COALESCE(${sql(payload.paidAt || null)}, CURRENT_TIMESTAMP),
        raw_payload_json = ${sql(JSON.stringify(payload.rawPayload || payload))},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${sql(id)};
  `);
  return getOrder(id);
}

function updateOrderStatus(id, status, payload = {}) {
  runSql(`
    UPDATE orders
    SET status = ${sql(status)},
        raw_payload_json = ${sql(JSON.stringify(payload || {}))},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${sql(id)};
  `);
  return getOrder(id);
}

function getOrder(id) {
  const rows = runSql(`SELECT * FROM orders WHERE id = ${sql(id)} LIMIT 1;`, true);
  return rows[0] ? normalizeOrder(rows[0]) : null;
}

function listOrders() {
  return runSql("SELECT * FROM orders ORDER BY created_at DESC;", true).map(normalizeOrder);
}

module.exports = {
  createOrder,
  createReport,
  dbPath,
  getOrder,
  getReport,
  getUser,
  initDb,
  listOrders,
  listReports,
  listUsers,
  markOrderPaid,
  mockLogin,
  readConfig,
  reportsByUser,
  runSql,
  updateCheckin,
  updateNote,
  updateOrderStatus,
  updatePhoto,
  updateUserMeta,
  upsertWechatUser,
  writeConfig,
  writeEvent
};
