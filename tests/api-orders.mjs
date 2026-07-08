import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const nodeBin = process.execPath;
const root = path.resolve(import.meta.dirname, "..");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kuailian-orders-"));
const dbPath = path.join(tmpDir, "orders.sqlite");
const port = 4194;
const server = spawn(nodeBin, ["server/index.js"], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    KUAILIAN_DB_PATH: dbPath,
    DATA_DIR: tmpDir,
    WECHAT_MODE: "mock",
    WECHAT_PAY_MODE: "mock"
  },
  stdio: ["ignore", "pipe", "pipe"]
});

let output = "";
server.stdout.on("data", (chunk) => {
  output += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  output += chunk.toString();
});

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (response.ok) return;
    } catch {
      await delay(100);
    }
  }
  throw new Error(`server did not start\n${output}`);
}

async function request(pathname, options = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`${pathname} ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

try {
  await waitForServer();
  const payment = await request("/api/pay/orders", {
    method: "POST",
    body: JSON.stringify({
      userId: "test-user",
      reportId: "demo-a",
      productCode: "seven_day_plan",
      productName: "7 天状态管理",
      amountCents: 990
    })
  });

  if (payment.status !== "paid_mock") {
    throw new Error(`expected paid_mock, got ${payment.status}`);
  }
  if (payment.order.status !== "paid") {
    throw new Error(`expected stored order paid, got ${payment.order.status}`);
  }
  if (payment.order.productCode !== "seven_day_plan") {
    throw new Error(`unexpected product code ${payment.order.productCode}`);
  }

  const ordersPayload = await request("/api/admin/orders");
  const order = ordersPayload.orders.find((item) => item.id === payment.order.id);
  if (!order) throw new Error("created order was not returned by /api/admin/orders");
  if (order.status !== "paid") throw new Error(`expected listed order paid, got ${order.status}`);

  const detail = await request(`/api/admin/orders/${encodeURIComponent(order.id)}`);
  if (detail.order.id !== order.id) throw new Error("order detail id mismatch");

  console.log(JSON.stringify({
    ok: true,
    orderId: order.id,
    status: order.status,
    payMode: order.payMode
  }, null, 2));
} finally {
  server.kill("SIGTERM");
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
