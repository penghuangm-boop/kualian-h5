import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist");

const files = [
  "index.html",
  "styles.css",
  "app.js",
  "admin.html",
  "admin.css",
  "admin.js",
  "config.js",
  "README.md"
];

const directories = [
  "assets"
];

function copyFile(relativePath) {
  const source = path.join(root, relativePath);
  const target = path.join(dist, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function copyDirectory(relativePath) {
  const source = path.join(root, relativePath);
  const target = path.join(dist, relativePath);
  fs.cpSync(source, target, { recursive: true });
}

function writeDeployReadme() {
  const content = `# 垮脸自救 H5 部署包

这个目录是静态 HTTPS 部署包，可直接上传到静态站点根目录。

## 入口

- H5：\`index.html\`
- 后台原型：\`admin.html\`

## 包含

- H5 页面、后台页面、样式与前端脚本
- \`assets/\` 静态图片资源
- 项目 README

## 不包含

- \`design/\` 设计图
- \`yuanxing/\` 原型和 PRD 源文件
- \`audit/\` 分析文档
- \`data/\` 本地 SQLite 数据库
- \`mock-api.js\` 本地 Node API 服务
- \`tests/\` 开发检查脚本

## 上线前检查

1. 上传整个 \`dist/\` 目录内容到 HTTPS 站点根目录。
2. 用微信内置浏览器打开首页，完整走一遍 10 题测评。
3. 确认第 10 题后进入照片页。
4. 确认报告页、7 天打卡、海报生成可用。
5. 后台 \`admin.html\` 当前没有鉴权，正式公开前建议隐藏入口或加登录保护。

## 数据说明

静态部署后，如果没有后端 API，页面会回退到浏览器本地数据和演示数据。真实用户同步、后台真实数据统计和配置同步需要单独部署后端接口。
`;
  fs.writeFileSync(path.join(dist, "DEPLOY.md"), content);
}

function collectFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(absolute);
    return absolute;
  });
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

files.forEach(copyFile);
directories.forEach(copyDirectory);
writeDeployReadme();

const outputFiles = collectFiles(dist);
const totalBytes = outputFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);

console.log(JSON.stringify({
  dist,
  fileCount: outputFiles.length,
  totalBytes
}, null, 2));
