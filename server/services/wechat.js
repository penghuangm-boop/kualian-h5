const crypto = require("node:crypto");
const { readServerConfig } = require("../config");
const { parseCookies } = require("../http");
const db = require("../db");

function readWechatConfig() {
  const config = readServerConfig();
  const oauthRedirectUri = config.wechatOAuthRedirectUri || `${config.publicBaseUrl}/api/wechat/callback`;
  const payNotifyUrl = config.wechatPayNotifyUrl || `${config.publicBaseUrl}/api/pay/notify`;
  const oauthReady = Boolean(config.wechatAppId && config.wechatAppSecret && oauthRedirectUri);
  const payReady = Boolean(
    config.wechatMchId &&
    config.wechatPayApiV3Key &&
    config.wechatPayPrivateKeyPath &&
    config.wechatPaySerialNo &&
    payNotifyUrl
  );

  return {
    wechatMode: config.wechatMode,
    payMode: config.wechatPayMode,
    publicBaseUrl: config.publicBaseUrl,
    oauthReady: config.wechatMode === "wechat" && oauthReady,
    payReady: config.wechatPayMode === "wechat_jsapi" && payReady,
    appId: config.wechatAppId,
    appSecret: config.wechatAppSecret,
    oauthRedirectUri,
    mchId: config.wechatMchId,
    payNotifyUrl,
    productName: config.wechatPayProductName,
    amountCents: config.wechatPayAmountCents
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

async function requestWechatJson(target) {
  const response = await fetch(target);
  const payload = await response.json();
  if (!response.ok || payload.errcode) {
    const code = payload.errcode ? `wechat_${payload.errcode}` : `http_${response.status}`;
    throw new Error(code);
  }
  return payload;
}

async function exchangeWechatCode(config, code) {
  const params = new URLSearchParams({
    appid: config.appId,
    secret: config.appSecret,
    code,
    grant_type: "authorization_code"
  });
  return requestWechatJson(`https://api.weixin.qq.com/sns/oauth2/access_token?${params.toString()}`);
}

async function fetchWechatUserInfo(accessTokenPayload) {
  if (!accessTokenPayload.access_token || !accessTokenPayload.openid) {
    throw new Error("wechat_oauth_missing_openid");
  }
  if (!String(accessTokenPayload.scope || "").includes("snsapi_userinfo")) {
    return {
      openid: accessTokenPayload.openid,
      unionid: accessTokenPayload.unionid || null,
      nickname: "微信用户",
      avatarUrl: null
    };
  }
  const params = new URLSearchParams({
    access_token: accessTokenPayload.access_token,
    openid: accessTokenPayload.openid,
    lang: "zh_CN"
  });
  const userInfo = await requestWechatJson(`https://api.weixin.qq.com/sns/userinfo?${params.toString()}`);
  return {
    openid: userInfo.openid || accessTokenPayload.openid,
    unionid: userInfo.unionid || accessTokenPayload.unionid || null,
    nickname: userInfo.nickname || "微信用户",
    avatarUrl: userInfo.headimgurl || null
  };
}

async function handleWechatCallback(url) {
  const config = readWechatConfig();
  if (!config.oauthReady) {
    return {
      redirect: `${config.publicBaseUrl}/#home`,
      user: db.mockLogin({ nickname: "微信模拟用户", openid: `mock-oauth-${Date.now()}` }),
      mode: "mock"
    };
  }
  const code = url.searchParams.get("code");
  if (!code) {
    return {
      redirect: `${config.publicBaseUrl}/#home?wechat_error=missing_code`,
      user: null,
      mode: "wechat"
    };
  }
  try {
    const tokenPayload = await exchangeWechatCode(config, code);
    const userInfo = await fetchWechatUserInfo(tokenPayload);
    return {
      redirect: `${config.publicBaseUrl}/#home?wechat_login=success`,
      user: db.upsertWechatUser(userInfo),
      mode: "wechat"
    };
  } catch (error) {
    return {
      redirect: `${config.publicBaseUrl}/#home?wechat_error=oauth_failed`,
      user: null,
      mode: "wechat",
      error: error.message
    };
  }
}

function getSessionFromRequest(request) {
  const cookies = parseCookies(request);
  const userId = cookies.kuailian_user_id;
  const user = userId ? db.getUser(userId) : null;
  return { logged: Boolean(user), user };
}

module.exports = {
  createWechatOAuthUrl,
  getSessionFromRequest,
  handleWechatCallback,
  publicWechatConfig,
  readWechatConfig
};
