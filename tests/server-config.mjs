import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { validateProductionConfig } = require("../server/config");

assert.equal(typeof validateProductionConfig, "function");

const incompleteProduction = validateProductionConfig({
  nodeEnv: "production",
  publicBaseUrl: "http://faceok.cn",
  wechatMode: "wechat",
  wechatPayMode: "wechat_jsapi",
  wechatAppId: "",
  wechatAppSecret: "",
  wechatOAuthRedirectUri: "",
  wechatMchId: "",
  wechatPayApiV3Key: "",
  wechatPayPrivateKeyPath: "",
  wechatPaySerialNo: "",
  wechatPayNotifyUrl: ""
});

[
  "PUBLIC_BASE_URL must use https:// in production.",
  "WECHAT_APP_ID is required when WECHAT_MODE=wechat.",
  "WECHAT_APP_SECRET is required when WECHAT_MODE=wechat.",
  "WECHAT_OAUTH_REDIRECT_URI is required when WECHAT_MODE=wechat.",
  "WECHAT_MCH_ID is required when WECHAT_PAY_MODE=wechat_jsapi.",
  "WECHAT_PAY_API_V3_KEY is required when WECHAT_PAY_MODE=wechat_jsapi.",
  "WECHAT_PAY_PRIVATE_KEY_PATH is required when WECHAT_PAY_MODE=wechat_jsapi.",
  "WECHAT_PAY_SERIAL_NO is required when WECHAT_PAY_MODE=wechat_jsapi.",
  "WECHAT_PAY_NOTIFY_URL is required when WECHAT_PAY_MODE=wechat_jsapi."
].forEach((message) => assert.ok(incompleteProduction.errors.includes(message), message));

const mockProduction = validateProductionConfig({
  nodeEnv: "production",
  publicBaseUrl: "https://faceok.cn",
  wechatMode: "mock",
  wechatPayMode: "mock"
});

assert.deepEqual(mockProduction.errors, []);
assert.ok(mockProduction.warnings.includes("WECHAT_MODE=mock is only for pre-launch testing."));
assert.ok(mockProduction.warnings.includes("WECHAT_PAY_MODE=mock is only for pre-launch testing."));

const readyProduction = validateProductionConfig({
  nodeEnv: "production",
  publicBaseUrl: "https://faceok.cn",
  wechatMode: "wechat",
  wechatAppId: "appid",
  wechatAppSecret: "secret",
  wechatOAuthRedirectUri: "https://faceok.cn/api/wechat/callback",
  wechatPayMode: "wechat_jsapi",
  wechatMchId: "mchid",
  wechatPayApiV3Key: "api-v3-key",
  wechatPayPrivateKeyPath: "/secure/apiclient_key.pem",
  wechatPaySerialNo: "serial",
  wechatPayNotifyUrl: "https://faceok.cn/api/pay/notify"
});

assert.deepEqual(readyProduction.errors, []);
assert.deepEqual(readyProduction.warnings, []);

console.log(JSON.stringify({ ok: true, checked: "production-config" }));
