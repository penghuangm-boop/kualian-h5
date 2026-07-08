const db = require("../db");
const { readBody, sendJson } = require("../http");

async function handleAdminRoutes(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/admin/reports") {
    sendJson(response, 200, { reports: db.listReports() });
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/admin/users") {
    sendJson(response, 200, { users: db.listUsers() });
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/admin/orders") {
    sendJson(response, 200, { orders: db.listOrders() });
    return true;
  }

  const orderMatch = url.pathname.match(/^\/api\/admin\/orders\/([^/]+)$/);
  // /api/admin/orders/:id
  if (request.method === "GET" && orderMatch) {
    const order = db.getOrder(decodeURIComponent(orderMatch[1]));
    sendJson(response, order ? 200 : 404, order ? { order } : { error: "order_not_found" });
    return true;
  }

  const userMatch = url.pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (request.method === "GET" && userMatch) {
    const user = db.getUser(decodeURIComponent(userMatch[1]));
    sendJson(response, user ? 200 : 404, user
      ? { user, reports: db.reportsByUser(user.id) }
      : { error: "user_not_found" });
    return true;
  }

  if (request.method === "PUT" && userMatch) {
    const body = await readBody(request);
    const user = db.updateUserMeta(decodeURIComponent(userMatch[1]), body);
    sendJson(response, user ? 200 : 404, user ? { user } : { error: "user_not_found" });
    return true;
  }

  const reportMatch = url.pathname.match(/^\/api\/admin\/reports\/([^/]+)$/);
  if (request.method === "GET" && reportMatch) {
    const report = db.getReport(decodeURIComponent(reportMatch[1]));
    sendJson(response, report ? 200 : 404, report ? { report } : { error: "report_not_found" });
    return true;
  }

  const noteMatch = url.pathname.match(/^\/api\/admin\/reports\/([^/]+)\/note$/);
  if (request.method === "PUT" && noteMatch) {
    const body = await readBody(request);
    const report = db.updateNote(decodeURIComponent(noteMatch[1]), String(body.note || "").trim());
    sendJson(response, report ? 200 : 404, report ? { report } : { error: "report_not_found" });
    return true;
  }

  const configMatch = url.pathname.match(/^\/api\/admin\/config\/([^/]+)$/);
  if (request.method === "GET" && configMatch) {
    const key = decodeURIComponent(configMatch[1]);
    sendJson(response, 200, { key, value: db.readConfig(key) });
    return true;
  }

  if (request.method === "PUT" && configMatch) {
    const body = await readBody(request);
    const key = decodeURIComponent(configMatch[1]);
    sendJson(response, 200, { key, value: db.writeConfig(key, body.value ?? body) });
    return true;
  }

  return false;
}

module.exports = {
  handleAdminRoutes
};
