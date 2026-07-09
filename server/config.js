const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");

function loadEnvFile() {
  const envPath = path.join(rootDir, ".env");
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

function readServerConfig() {
  loadEnvFile();
  const dataDir = env("DATA_DIR", path.join(rootDir, "data"));
  const dbPath = env("KUAILIAN_DB_PATH", path.join(dataDir, "kuailian.sqlite"));
  return {
    rootDir,
    nodeEnv: env("NODE_ENV", "development"),
    host: env("HOST", "127.0.0.1"),
    port: Number(env("PORT", "4174")),
    dataDir,
    dbPath,
    publicBaseUrl: env("PUBLIC_BASE_URL", "http://127.0.0.1:4173").replace(/\/$/, ""),
    wechatMode: env("WECHAT_MODE", "mock"),
    wechatAppId: env("WECHAT_APP_ID"),
    wechatAppSecret: env("WECHAT_APP_SECRET"),
    wechatOAuthRedirectUri: env("WECHAT_OAUTH_REDIRECT_URI"),
    wechatPayMode: env("WECHAT_PAY_MODE", "mock"),
    wechatMchId: env("WECHAT_MCH_ID"),
    wechatPayApiV3Key: env("WECHAT_PAY_API_V3_KEY"),
    wechatPayPrivateKeyPath: env("WECHAT_PAY_PRIVATE_KEY_PATH"),
    wechatPaySerialNo: env("WECHAT_PAY_SERIAL_NO"),
    wechatPayNotifyUrl: env("WECHAT_PAY_NOTIFY_URL"),
    wechatPayProductName: env("WECHAT_PAY_PRODUCT_NAME", "7 天状态管理"),
    wechatPayAmountCents: Number(env("WECHAT_PAY_AMOUNT_CENTS", "990"))
  };
}

function isProductionConfig(config) {
  return config.nodeEnv === "production" || env("KUAILIAN_ENV") === "production";
}

function requireFields(config, fields, errors) {
  fields.forEach(([field, message]) => {
    if (!config[field]) errors.push(message);
  });
}

function validateProductionConfig(config) {
  const errors = [];
  const warnings = [];
  const production = isProductionConfig(config);

  if (production && !String(config.publicBaseUrl || "").startsWith("https://")) {
    errors.push("PUBLIC_BASE_URL must use https:// in production.");
  }

  if (config.wechatMode === "wechat") {
    requireFields(config, [
      ["wechatAppId", "WECHAT_APP_ID is required when WECHAT_MODE=wechat."],
      ["wechatAppSecret", "WECHAT_APP_SECRET is required when WECHAT_MODE=wechat."],
      ["wechatOAuthRedirectUri", "WECHAT_OAUTH_REDIRECT_URI is required when WECHAT_MODE=wechat."]
    ], errors);
  } else if (production && config.wechatMode === "mock") {
    warnings.push("WECHAT_MODE=mock is only for pre-launch testing.");
  }

  if (config.wechatPayMode === "wechat_jsapi") {
    requireFields(config, [
      ["wechatMchId", "WECHAT_MCH_ID is required when WECHAT_PAY_MODE=wechat_jsapi."],
      ["wechatPayApiV3Key", "WECHAT_PAY_API_V3_KEY is required when WECHAT_PAY_MODE=wechat_jsapi."],
      ["wechatPayPrivateKeyPath", "WECHAT_PAY_PRIVATE_KEY_PATH is required when WECHAT_PAY_MODE=wechat_jsapi."],
      ["wechatPaySerialNo", "WECHAT_PAY_SERIAL_NO is required when WECHAT_PAY_MODE=wechat_jsapi."],
      ["wechatPayNotifyUrl", "WECHAT_PAY_NOTIFY_URL is required when WECHAT_PAY_MODE=wechat_jsapi."]
    ], errors);
  } else if (production && config.wechatPayMode === "mock") {
    warnings.push("WECHAT_PAY_MODE=mock is only for pre-launch testing.");
  }

  return { errors, warnings };
}

function assertProductionConfig(config, logger = console) {
  const result = validateProductionConfig(config);
  result.warnings.forEach((warning) => logger.warn(`[config] ${warning}`));
  if (result.errors.length === 0) return result;

  const message = [
    "Production configuration error:",
    ...result.errors.map((error) => `- ${error}`)
  ].join("\n");
  throw new Error(message);
}

module.exports = {
  assertProductionConfig,
  env,
  loadEnvFile,
  readServerConfig,
  rootDir,
  validateProductionConfig
};
