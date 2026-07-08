const db = require("../db");
const { readBody, sendJson } = require("../http");

async function handleReportRoutes(request, response, url) {
  if (request.method === "POST" && url.pathname === "/api/reports") {
    const body = await readBody(request);
    sendJson(response, 201, { report: db.createReport(body) });
    return true;
  }

  const photoMatch = url.pathname.match(/^\/api\/reports\/([^/]+)\/photo$/);
  if (request.method === "PUT" && photoMatch) {
    const body = await readBody(request);
    const report = db.updatePhoto(decodeURIComponent(photoMatch[1]), body.photoSummary || body);
    sendJson(response, report ? 200 : 404, report ? { report } : { error: "report_not_found" });
    return true;
  }

  const checkinMatch = url.pathname.match(/^\/api\/reports\/([^/]+)\/checkin$/);
  if (request.method === "PUT" && checkinMatch) {
    const body = await readBody(request);
    const report = db.updateCheckin(decodeURIComponent(checkinMatch[1]), body);
    sendJson(response, report ? 200 : 404, report ? { report } : { error: "report_not_found" });
    return true;
  }

  return false;
}

module.exports = {
  handleReportRoutes
};
