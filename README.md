# 短剧即时互动播放器

一个面向短剧观看和剧情高光互动的 Web 播放器。项目支持短剧列表、剧集详情、视频播放、高光点触发互动、弹幕/管理抽屉等能力。ASR、OCR、LLM 高光分析脚本保留在项目中，但日常本地运行和观看短剧不需要先执行这些离线脚本。

## 技术栈

- 前端：React 19、Vite、TypeScript、Tailwind CSS、Zustand、React Router
- 后端：Node.js、Express、TypeScript
- 数据库：SQLite
- 媒体服务：本地开发时由 Express 静态服务提供 `/media` 资源
- 离线处理：保留 ASR、OCR、LLM 高光分析脚本，用于后续数据生产流程

## 目录结构

```txt
apps/web                 前端应用
apps/server              后端服务
apps/server/data         本地 SQLite 数据目录，默认不提交
apps/server/media        本地媒体目录，默认不提交
tools                    离线处理和分析脚本
```

## 环境要求

- Node.js 20 或更高版本
- npm

## 本地部署

### 1. 安装依赖

在项目根目录执行：

```powershell
npm install
```

### 2. 准备本地媒体文件

本地视频建议放在：

```txt
apps/server/media/videos/{短剧文件夹名}/
```

例如：

```txt
apps/server/media/videos/yunmiao1/ep_001.mp4
apps/server/media/videos/yunmiao1/ep_002.mp4
apps/server/media/videos/yunmiao1/ep_003.mp4
```

本地封面可放在：

```txt
apps/server/media/covers/
```

本地媒体目录默认被 `.gitignore` 忽略，不会上传到 GitHub。

### 3. 启动开发服务

在项目根目录执行：

```powershell
npm run dev
```

启动后访问：

```txt
前端页面：http://localhost:5173
后端服务：http://localhost:3001
健康检查：http://localhost:3001/api/health
短剧列表：http://localhost:5173/dramas
```

也可以分别启动前后端：

```powershell
npm run dev:web
npm run dev:server
```

### 4. 本地数据说明

SQLite 默认生成在：

```txt
apps/server/data/short-drama.sqlite
```

`apps/server/data` 默认不提交。更换机器或重新拉取代码后，需要重新准备本地数据库或导入数据。

当前前端已暂时移除 JSON 导入页面；本地数据导入流程后续会重新整理为更稳定的方式。

## 云端部署

云端部署方案目前仍在调整中，后续会更新完整、稳定的国内可访问部署链路。

当前已验证过的方向：

- 前端可以部署为静态站点。
- 后端需要可运行 Node.js/Express 的服务。
- SQLite 如果要长期保存数据，需要持久化磁盘或改造为云数据库。
- 视频文件不建议放 GitHub，也不建议放普通 Web 后端实例，推荐使用对象存储和 CDN。

### 临时公网方案

如果只是临时演示，可以拆成：

```txt
前端：静态站点服务
后端：Node.js Web Service
视频：对象存储
数据库：SQLite 临时数据或持久磁盘
```

前端线上请求后端时，需要配置：

```txt
VITE_API_BASE_URL=https://你的后端域名
```

本地开发不需要配置这个变量，默认仍使用 `/api`，由 Vite proxy 转发到 `localhost:3001`。

### 国内访问方案调整中

面向国内稳定访问时，Vercel、Render、Cloudflare R2 等海外链路可能不稳定。更合适的方向是：

```txt
国内云服务器托管前端和后端
Nginx 反向代理 /api
OSS/COS + CDN 托管视频资源
备案域名用于正式访问
```

这部分部署文档还在调整，后续会补充到 README。

## 常用命令

```powershell
npm install
npm run dev
npm run dev:web
npm run dev:server
npm run build
npm run typecheck
```

## 常用地址

```txt
短剧列表：http://localhost:5173/dramas
后端健康检查：http://localhost:3001/api/health
```

## 注意事项

- 不要提交 `apps/server/media`，视频文件通常很大，也可能涉及版权。
- 不要提交 `apps/server/data`，其中包含本地 SQLite 和生成数据。
- 不要提交 `.env`、`.env.*`、`config.local.json` 或任何密钥文件。
- 离线 AI 脚本不是观看短剧的必需步骤，普通运行只需要前端、后端和 SQLite。
