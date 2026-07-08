const { readBody, sendJson } = require("../http");
const {
  createPaymentOrder,
  handlePaymentNotify
} = require("../services/payments");

async function handlePaymentRoutes(request, response, url) {
  if (request.method === "POST" && url.pathname === "/api/pay/orders") {
    const body = await readBody(request);
    const payment = createPaymentOrder(body, request);
    const statusCode = payment.status === "not_configured" ? 409 : 201;
    sendJson(response, statusCode, payment);
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/pay/notify") {
    const body = await readBody(request);
    sendJson(response, 200, handlePaymentNotify(body));
    return true;
  }

  return false;
}

module.exports = {
  handlePaymentRoutes
};
