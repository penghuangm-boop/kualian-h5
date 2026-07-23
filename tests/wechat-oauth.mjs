import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kuailian-wechat-"));

process.env.DATA_DIR = tmpDir;
process.env.KUAILIAN_DB_PATH = path.join(tmpDir, "wechat.sqlite");
process.env.PUBLIC_BASE_URL = "https://faceok.cn";
process.env.WECHAT_MODE = "wechat";
process.env.WECHAT_APP_ID = "wx-test-app";
process.env.WECHAT_APP_SECRET = "test-secret";
process.env.WECHAT_OAUTH_REDIRECT_URI = "https://faceok.cn/api/wechat/callback";

const db = require("../server/db");
const {
  createWechatOAuthUrl,
  handleWechatCallback
} = require("../server/services/wechat");

db.initDb();

const oauth = createWechatOAuthUrl({ state: "state-1" });
assert.equal(oauth.mode, "wechat");
assert.ok(oauth.loginUrl.includes("scope=snsapi_userinfo"));
assert.ok(oauth.loginUrl.includes("appid=wx-test-app"));

const requestedUrls = [];
global.fetch = async (target) => {
  requestedUrls.push(String(target));
  if (String(target).includes("/sns/oauth2/access_token")) {
    return {
      ok: true,
      json: async () => ({
        access_token: "oauth-token",
        openid: "openid-123",
        scope: "snsapi_userinfo",
        unionid: "union-123"
      })
    };
  }
  if (String(target).includes("/sns/userinfo")) {
    return {
      ok: true,
      json: async () => ({
        openid: "openid-123",
        nickname: "微信用户甲",
        headimgurl: "https://thirdwx.qlogo.cn/avatar.jpg",
        unionid: "union-123"
      })
    };
  }
  throw new Error(`unexpected fetch ${target}`);
};

try {
  const callbackUrl = new URL("https://faceok.cn/api/wechat/callback?code=code-123&state=state-1");
  const result = await handleWechatCallback(callbackUrl);

  assert.equal(result.mode, "wechat");
  assert.equal(result.redirect, "https://faceok.cn/#home?wechat_login=success");
  assert.equal(result.user.openid, "openid-123");
  assert.equal(result.user.nickname, "微信用户甲");
  assert.equal(result.user.loginType, "wechat");
  assert.equal(result.user.unionid, "union-123");
  assert.equal(result.user.avatarUrl, "https://thirdwx.qlogo.cn/avatar.jpg");
  assert.ok(requestedUrls.some((target) => target.includes("code=code-123")));

  const stored = db.getUser(result.user.id);
  assert.equal(stored.openid, "openid-123");
  assert.equal(stored.loginType, "wechat");
  assert.equal(stored.unionid, "union-123");

  console.log(JSON.stringify({ ok: true, userId: result.user.id, checked: "wechat-oauth" }));
} finally {
  delete global.fetch;
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
