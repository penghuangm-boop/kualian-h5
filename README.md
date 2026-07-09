# 垮脸自救 H5 MVP

这是一个纯前端移动端 H5，当前用于验证完整产品流程：

- 10 题上镜状态测评
- 基于规则生成可解释报告
- 本地照片亮度、清晰度与尺寸粗评
- 重要场合准备建议
- 7 天状态管理与本地进度保存
- 登录用户首页历史报告
- Canvas 进度海报
- 后台管理原型，包括数据概览、用户管理、用户历史报告、用户级运营标记、用户/报告 CSV 导出、用户报告筛选与详情、运营备注、可编辑问卷题库、6 种垮脸类型参数配置、报告内容配置、报告配置和页面文案

照片不会上传服务器，也不会进行身份识别或真实脸部结构诊断。

## 本地运行

在项目目录启动任意静态文件服务，例如：

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

可选启动本地 SQLite API。推荐使用生产后端入口：

```bash
node server/index.js
```

旧命令 `node mock-api.js` 仍然可用，它现在只是兼容入口，会转到同一个 `server/index.js` 服务。

后端当前使用 SQLite 本地库，并通过系统 `sqlite3` 命令读写数据；部署服务器需要安装 Node.js 和 `sqlite3`。

然后访问：

```text
http://127.0.0.1:4173
```

后台管理原型访问：

```text
http://127.0.0.1:4173/admin.html
```

本地 API 默认地址：

```text
GET http://127.0.0.1:4174/api/admin/reports
GET http://127.0.0.1:4174/api/admin/reports/:id
PUT http://127.0.0.1:4174/api/admin/reports/:id/note
POST http://127.0.0.1:4174/api/auth/mock-login
GET http://127.0.0.1:4174/api/admin/users
GET http://127.0.0.1:4174/api/admin/users/:id
POST http://127.0.0.1:4174/api/reports
PUT http://127.0.0.1:4174/api/reports/:id/photo
PUT http://127.0.0.1:4174/api/reports/:id/checkin
GET http://127.0.0.1:4174/api/admin/config/:key
PUT http://127.0.0.1:4174/api/admin/config/:key
GET http://127.0.0.1:4174/api/admin/orders
GET http://127.0.0.1:4174/api/admin/orders/:id
```

微信登录与支付骨架也在本地 API 中，未配置真实公众号和商户号时默认使用 mock 模式：

```text
GET http://127.0.0.1:4174/api/wechat/config
GET http://127.0.0.1:4174/api/wechat/oauth-url
GET http://127.0.0.1:4174/api/wechat/callback
GET http://127.0.0.1:4174/api/auth/session
POST http://127.0.0.1:4174/api/pay/orders
POST http://127.0.0.1:4174/api/pay/notify
```

H5 会在模拟微信登录时创建/读取本地用户，并在完成测评、完成照片辅助、完成打卡时尝试写入本地 API；登录用户首页会同步展示自己的历史报告。后台会优先读取本地 API，数据概览、用户管理和用户报告会优先展示 SQLite 真实数据。后台问卷题库、垮脸类型参数和报告内容配置会同步到 SQLite，H5 打开时也会尝试读取这份远程配置。如果 API 没开启，页面会自动回退到本地演示数据。SQLite 数据文件位于：

```text
data/kuailian.sqlite
```

不要直接双击 `index.html` 作为正式测试方式。部分移动浏览器会限制本地文件的存储、图片读取和下载能力。

## 发布

生成干净的静态部署包：

```bash
node scripts/build-dist.mjs
```

然后将 `dist/` 目录里的内容部署到 HTTPS 静态站点根目录。

`dist/` 会包含：

```text
index.html
styles.css
app.js
admin.html
admin.css
admin.js
config.js
assets/
README.md
DEPLOY.md
```

`dist/` 不包含设计图、原型源文件、本地 SQLite 数据库、测试脚本和本地 `mock-api.js` 服务。

推荐部署到已备案的国内 HTTPS 域名，便于在微信内置浏览器中访问，并为以后嵌入小程序 `web-view` 做准备。

上线前建议在真机至少验证：

- 微信内置浏览器首页打开正常。
- 10 题测评可以完整完成。
- 第 10 题后进入照片增强分析页。
- 暂不上传照片时可以进入报告页。
- 登录弹窗、报告页、7 天打卡、海报生成可用。
- `admin.html` 当前没有鉴权，正式公开前建议隐藏入口或加登录保护。

## 公众号登录与微信支付

当前仓库已经预留公众号网页登录和微信 JSAPI 支付骨架。真实密钥不要写进代码，也不要提交到 GitHub；复制 `.env.example` 为 `.env` 后只在服务器上填写。

本地开发默认值：

```text
WECHAT_MODE=mock
WECHAT_PAY_MODE=mock
```

这时点击登录会走本地模拟登录，点击“开始 7 天打卡”会创建 mock 支付订单并显示“模拟支付成功”。

等公众号和商户号注册完成后，需要准备：

- 已认证公众号的 `AppID` 和 `AppSecret`
- HTTPS 正式域名
- 公众号后台配置的网页授权域名
- 微信商户号 `mchid`
- API v3 密钥
- 商户 API 证书私钥路径和证书序列号
- 支付回调地址，例如 `https://你的域名/api/pay/notify`

服务器 `.env` 切换示例：

```text
NODE_ENV=production
PUBLIC_BASE_URL=https://你的域名
WECHAT_MODE=wechat
WECHAT_APP_ID=公众号 AppID
WECHAT_APP_SECRET=公众号 AppSecret
WECHAT_OAUTH_REDIRECT_URI=https://你的域名/api/wechat/callback
WECHAT_PAY_MODE=wechat_jsapi
WECHAT_MCH_ID=商户号
WECHAT_PAY_API_V3_KEY=API v3 密钥
WECHAT_PAY_PRIVATE_KEY_PATH=/secure/path/apiclient_key.pem
WECHAT_PAY_SERIAL_NO=证书序列号
WECHAT_PAY_NOTIFY_URL=https://你的域名/api/pay/notify
```

骨架目前会在真实支付资料未配齐时返回 `wechat_pay_not_configured`，不会假装真实支付成功。后续接正式支付时，需要在 `server/services/payments.js` 中补微信支付 v3 JSAPI 下单签名和平台回调验签。

当 `NODE_ENV=production` 时，后端启动会校验生产配置。`PUBLIC_BASE_URL` 必须是 HTTPS；如果启用 `WECHAT_MODE=wechat`，必须配置公众号 AppID、AppSecret 和网页授权回调；如果启用 `WECHAT_PAY_MODE=wechat_jsapi`，必须配置商户号、API v3 密钥、私钥路径、证书序列号和支付回调地址。缺配置时服务会拒绝启动，并输出明确的缺失项。

服务器代码部署可在服务器仓库目录外直接执行：

```bash
bash /home/ubuntu/kualian-h5/scripts/deploy-production.sh
```

脚本会依次执行 `git pull --ff-only`、`node scripts/build-dist.mjs`、同步 `dist/` 到 `/var/www/faceok`、安装 `deploy/nginx-faceok.conf`、`nginx -t`、重载 Nginx、重启并保存 PM2 进程。默认值可通过 `APP_DIR`、`WEB_ROOT`、`NGINX_SITE_NAME`、`PM2_APP`、`NODE_BIN` 环境变量覆盖。

后端已经预留 `orders` 表，用于记录 7 天状态管理订单：

```text
pending  待支付
paid     已支付
failed   支付失败
closed   已关闭
refunded 已退款
```

本地 mock 支付会创建订单并立即标记为 `paid`，后台可通过 `/api/admin/orders` 查看订单列表。

## 当前数据范围

- 问卷答案、报告状态和打卡进度存储在浏览器 `localStorage`。
- 清理浏览器数据或更换设备后，进度不会自动同步。
- 用户选择的照片只保留在当前页面内存中；刷新后照片预览会消失。
- 登录按钮为 MVP 演示，不会调用真实微信账号。
- 本地 API 使用 SQLite 持久化用户、报告、报告事件、后台配置和运营备注，方便后续替换成真实服务端数据库。

## 静态检查

使用 Node.js 运行：

```bash
node tests/smoke.mjs
node tests/api-orders.mjs
```

该检查会验证页面数量、重复 ID、静态资源引用和关键业务代码是否存在。
