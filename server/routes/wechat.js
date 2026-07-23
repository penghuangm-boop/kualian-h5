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
    const result = await handleWechatCallback(url);
    const headers = { Location: result.redirect };
    if (result.user?.id) {
      const secure = result.redirect.startsWith("https://") ? "; Secure" : "";
      headers["Set-Cookie"] = `kuailian_user_id=${encodeURIComponent(result.user.id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`;
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
