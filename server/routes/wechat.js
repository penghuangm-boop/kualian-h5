const { sendJson } = require("../http");
const {
  createWechatOAuthUrl,
  handleWechatCallback,
  publicWechatConfig
} = require("../services/wechat");

async function handleWechatRoutes(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/wechat/config") {
    sendJson(response, 200, publicWechatConfig());
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/wechat/oauth-url") {
    sendJson(response, 200, createWechatOAuthUrl({
      state: url.searchParams.get("state") || undefined,
      scope: url.searchParams.get("scope") || undefined
    }));
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/wechat/callback") {
    const result = handleWechatCallback(url);
    const headers = { Location: result.redirect };
    if (result.user?.id) {
      headers["Set-Cookie"] = `kuailian_user_id=${encodeURIComponent(result.user.id)}; Path=/; HttpOnly; SameSite=Lax`;
    }
    response.writeHead(302, headers);
    response.end();
    return true;
  }

  return false;
}

module.exports = {
  handleWechatRoutes
};
