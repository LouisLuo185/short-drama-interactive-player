# 短剧即时互动播放器

## 技术栈

- 前端：React 19、Vite、TypeScript、Tailwind CSS、Zustand、React Router
- 后端：Node.js、Express、TypeScript
- 数据库：SQLite
- 本地媒体服务：Express 静态文件服务，视频文件放在 `apps/server/media/videos`
- AI/离线处理：项目内保留 ASR、OCR、LLM 高光分析相关脚本；日常运行和看短剧不需要先执行这些脚本

## 环境要求

- Node.js 20 或更高版本
- npm

## 安装依赖

在项目根目录执行：

```powershell
npm install
```

## 启动项目

在项目根目录执行：

```powershell
npm run dev
```

启动后访问：

- 前端页面：http://localhost:5173
- 后端服务：http://localhost:3001
- 后端健康检查：http://localhost:3001/api/health

如果需要分别启动前后端，也可以使用：

```powershell
npm run dev:web
npm run dev:server
```

## 导入短剧文件夹

### 1. 准备视频文件夹

把同一部短剧的视频放到后端媒体目录下，建议每部短剧单独一个文件夹：

```txt
apps/server/media/videos/{短剧文件夹名}/
```

例如：

```txt
apps/server/media/videos/yunmiao1/ep_001.mp4
apps/server/media/videos/yunmiao1/ep_002.mp4
apps/server/media/videos/yunmiao1/ep_003.mp4
```

建议视频文件名按集数排序，例如 `ep_001.mp4`、`ep_002.mp4`、`ep_003.mp4`。

### 2. 打开导入页面

启动项目后，在浏览器打开：

```txt
http://localhost:5173/admin/import
```

### 3. 选择本地短剧文件夹

在导入页面选择本地短剧文件夹。页面会读取文件名和视频时长，并生成一份导入 JSON。

注意：浏览器选择文件夹只用于生成导入信息，不会把视频上传到后端。因此后端必须已经存在同名文件：

```txt
apps/server/media/videos/{短剧文件夹名}/{视频文件名}
```

如果你选择的文件夹名是 `yunmiao1`，生成的视频地址会类似：

```txt
/media/videos/yunmiao1/ep_001.mp4
/media/videos/yunmiao1/ep_002.mp4
```

### 4. 提交导入

检查页面生成的短剧标题、简介、集数和视频地址后，点击提交。提交成功后，系统会写入本地 SQLite 数据库，并跳转到短剧详情页。

本地数据库默认生成在：

```txt
apps/server/data/short-drama.sqlite
```

## 观看短剧

### 1. 打开短剧列表

访问：

```txt
http://localhost:5173/dramas
```

也可以直接访问首页，系统会进入短剧列表。

### 2. 进入短剧详情

在短剧列表中点击某一部短剧，进入详情页后选择要观看的剧集。

### 3. 播放与互动

播放页支持：

- 播放、暂停
- 拖动进度条
- 音量控制
- 全屏播放
- 高光点互动
- 互动开关
- 全屏状态下滚轮切换上一集/下一集

如果当前剧集存在高光点或 AI 高光候选，播放到对应时间点时会出现互动入口，点击后会触发表情、音效或互动反馈。

## 常用地址

```txt
短剧列表：http://localhost:5173/dramas
导入页面：http://localhost:5173/admin/import
后端健康检查：http://localhost:3001/api/health
```
