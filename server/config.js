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

module.exports = {
  env,
  loadEnvFile,
  readServerConfig,
  rootDir
};
