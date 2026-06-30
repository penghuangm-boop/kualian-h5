# WeChat OAuth And Pay Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe公众号网页登录 and JSAPI payment skeleton that runs locally in mock mode now and can switch to real WeChat credentials later.

**Architecture:** Keep the current static H5 and extend the existing Node `mock-api.js` service with clearly separated WeChat config, OAuth, session, and payment helpers. The browser calls capability endpoints and falls back to local mock login/payment when real credentials are not configured.

**Tech Stack:** Plain HTML/CSS/JavaScript, Node.js built-in `http`, `crypto`, `fs`, `path`, SQLite through the existing `sqlite3` CLI.

---

### Task 1: Contract Tests

**Files:**
- Modify: `tests/smoke.mjs`

- [ ] Add static assertions that the backend exposes WeChat OAuth, session, mock payment, payment notification, and environment-template markers.
- [ ] Run `node tests/smoke.mjs` and verify it fails because the skeleton does not exist yet.

### Task 2: Backend Skeleton

**Files:**
- Modify: `mock-api.js`
- Create: `.env.example`

- [ ] Add environment readers for `WECHAT_MODE`, official account credentials, merchant credentials, public base URL, and mock product price.
- [ ] Add `GET /api/wechat/config`, `GET /api/wechat/oauth-url`, `GET /api/wechat/callback`, `GET /api/auth/session`, `POST /api/pay/orders`, and `POST /api/pay/notify`.
- [ ] Keep local development safe: if credentials are missing, endpoints return mock-ready data and never pretend a real WeChat payment happened.

### Task 3: Frontend Wiring

**Files:**
- Modify: `app.js`
- Modify: `index.html`

- [ ] Add `loginWithWechatOrMock`, `loadWechatRuntimeConfig`, `createPaymentOrder`, and `startSevenDayPlan`.
- [ ] Change the login modal copy from “模拟微信登录” to a mode-aware button.
- [ ] Route the 7-day CTA through payment creation before entering the plan in mock mode.

### Task 4: Documentation And Verification

**Files:**
- Modify: `README.md`

- [ ] Document what needs to be filled after the公众号 and商户号 are ready.
- [ ] Run `node tests/smoke.mjs`.
- [ ] Run a backend smoke request against the new endpoints.
