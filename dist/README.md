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

可选启动本地 SQLite API：

```bash
node mock-api.js
```

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
```

该检查会验证页面数量、重复 ID、静态资源引用和关键业务代码是否存在。
