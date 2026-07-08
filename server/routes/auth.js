const db = require("../db");
const { readBody, sendJson } = require("../http");
const { getSessionFromRequest } = require("../services/wechat");

async function handleAuthRoutes(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/auth/session") {
    sendJson(response, 200, getSessionFromRequest(request));
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/mock-login") {
    const body = await readBody(request);
    sendJson(response, 200, { user: db.mockLogin(body) });
    return true;
  }

  return false;
}

module.exports = {
  handleAuthRoutes
};
