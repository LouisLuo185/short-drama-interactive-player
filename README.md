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


