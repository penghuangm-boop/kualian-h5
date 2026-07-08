const http = require("node:http");
const { readServerConfig } = require("./config");
const db = require("./db");
const { sendJson } = require("./http");
const { handleAdminRoutes } = require("./routes/admin");
const { handleAuthRoutes } = require("./routes/auth");
const { handlePaymentRoutes } = require("./routes/payments");
const { handleReportRoutes } = require("./routes/reports");
const { handleWechatRoutes } = require("./routes/wechat");

const routeHandlers = [
  handleWechatRoutes,
  handleAuthRoutes,
  handleAdminRoutes,
  handleReportRoutes,
  handlePaymentRoutes
];

function createServer() {
  db.initDb();
  return http.createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`);

    try {
      if (request.method === "OPTIONS") {
        sendJson(response, 204, {});
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/health") {
        sendJson(response, 200, {
          ok: true,
          service: "kuailian-production-api",
          db: db.dbPath()
        });
        return;
      }

      for (const handler of routeHandlers) {
        if (await handler(request, response, url)) return;
      }

      sendJson(response, 404, { error: "not_found" });
    } catch (error) {
      sendJson(response, 500, { error: "server_error", message: error.message });
    }
  });
}

function startServer(overrides = {}) {
  const config = { ...readServerConfig(), ...overrides };
  const server = createServer();
  server.listen(config.port, config.host, () => {
    console.log(`Kuailian production API running: http://${config.host}:${config.port}`);
    console.log(`SQLite database: ${db.dbPath()}`);
  });
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createServer,
  startServer
};
