const crypto = require("node:crypto");
const db = require("../db");
const { getSessionFromRequest, readWechatConfig } = require("./wechat");

function createPaymentOrder(payload = {}, request = null) {
  const config = readWechatConfig();
  const session = request ? getSessionFromRequest(request) : { user: null };
  const order = db.createOrder({
    userId: payload.userId || session.user?.id || null,
    reportId: payload.reportId || null,
    productCode: payload.productCode || "seven_day_plan",
    productName: payload.productName || config.productName,
    amountCents: payload.amountCents || config.amountCents,
    status: "pending",
    payMode: config.payMode,
    rawPayload: payload
  });

  if (config.payMode !== "wechat_jsapi") {
    const paidOrder = db.markOrderPaid(order.id, {
      transactionId: `mock-${crypto.randomBytes(6).toString("hex")}`,
      rawPayload: { ...payload, status: "paid_mock" }
    });
    db.writeEvent(paidOrder.reportId, "payment_mock_paid", paidOrder);
    return {
      order: paidOrder,
      payParams: null,
      status: "paid_mock",
      message: "模拟支付成功"
    };
  }

  if (!config.payReady) {
    return {
      order,
      payParams: null,
      status: "not_configured",
      error: "wechat_pay_not_configured"
    };
  }

  return {
    order,
    payParams: null,
    status: "pending_real_integration",
    error: "wechat_pay_jsapi_signing_pending"
  };
}

function handlePaymentNotify(payload = {}) {
  const orderId = payload.orderId || payload.out_trade_no || payload.id;
  const order = orderId
    ? db.markOrderPaid(orderId, {
      transactionId: payload.transactionId || payload.transaction_id || `notify-${orderId}`,
      rawPayload: payload
    })
    : null;
  return {
    code: "SUCCESS",
    message: order ? "payment notification accepted" : "mock notification accepted",
    order,
    payload
  };
}

module.exports = {
  createPaymentOrder,
  handlePaymentNotify
};
