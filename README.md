# Obsidian Diary Post

一个与 Obsidian 无缝集成的日记应用，支持多设备同步和 AI 润色。

## 项目特点

### 🎯 核心亮点

- **Obsidian Vault 集成**：直接读写 Obsidian 日记文件，无需手动同步
- **多设备同步**：手机 + Mac 远程访问，Mac mini 作为本地服务器
- **三层标签系统**：领域 → 能力 → 方法，自动生成结构化标签
- **AI 润色引擎**：支持 Claude、OpenAI、DeepSeek 等多种 API
- **习惯追踪统计**：饮水、运动、阅读等 5 项习惯，可视化趋势和热力图
- **历史日记查看**：月视图日历，支持图片缩略图和放大查看

### 📱 主要功能

| 功能模块 | 说明 |
|---------|------|
| **随手记** | 快速记录日常事件，三层标签选择器，AI润色 |
| **习惯打卡** | 饮水(mL)、运动(步)、阅读、学语言、补充剂 |
| **觉察与小确幸** | 快速输入弹窗，支持润色和标签，追加到指定区块 |
| **AI 润色** | 自动润色内容并添加标签，可自定义润色规则 |
| **历史日记** | 月视图日历，点击查看详情，支持图片查看 |
| **习惯统计** | 近 30 天趋势图和热力图 |

### 🏗️ 技术架构

```
┌─────────────┐      ┌──────────────┐
│   手机端    │ ──── │  Mac mini    │
│  (浏览器)   │      │ (API Server) │
└─────────────┘      └──────────────┘
                            │
                     ┌──────▼──────┐
                     │   Obsidian  │
                     │    Vault    │
                     └─────────────┘
```

- **前端**：React + TypeScript + Vite + Tailwind CSS
- **后端**：Express + TypeScript（可选）
- **状态管理**：Zustand + localStorage 持久化
- **离线缓存**：IndexedDB (Dexie.js)
- **文件系统**：File System Access API（本地模式）

## 使用场景

### 1. 本地模式（Mac/桌面浏览器）

直接连接 Obsidian Vault，适合桌面端快速记录：

```
连接 Vault → 选择日记文件夹 → 开始记录
```

### 2. 远程模式（手机 + Mac mini）

手机浏览器访问 Mac mini API，随时随地记录：

```
Mac mini: 运行 API Server
手机端: 配置 API 地址 + Token → 开始记录
```

## 快速开始

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器（端口 3000）
npm run dev

# 构建生产版本
npm run build
```

### 远程服务器部署

```bash
# Mac mini 上部署
cd server
npm install
npm run build
pm2 start npm --name diary-api -- run start
```

详见 [DEPLOY.md](DEPLOY.md)

## 目录结构

```
diary-post/
├── src/                    # 前端源码
│   ├── components/         # React 组件
│   ├── services/           # 数据服务层
│   ├── stores/             # Zustand 状态管理
│   └── utils/              # 工具函数
├── server/                 # API Server（可选）
│   ├── src/routes/         # API 路由
│   ├── src/services/       # 服务层
│   └── src/middleware/     # 认证中间件
├── dist/                   # 构建输出
└── CHANGELOG.md            # 更新日志
```

## 日记格式

日记文件遵循 Obsidian 模板格式：

```markdown
---
tags:
  - 日记
---
# 🌿 周一 · 此时此刻

## 🏃 习惯打卡
- 🥛饮水 1500 mL
- 🧘 运动/拉伸/快走 6000 步
- [x] 📖 阅读/亲子共读
- [x] 🇬🇧 学语言
- [ ] 💊 鱼油/植物甾醇

## ✍️ 随手记 & 灵感
- **10:30** 完成项目方案 #工作 #项目管理

## ✨ 每日小确幸
> 和家人一起散步，感受春日的温暖

### 💡 觉察与迭代
- 发现自己在面对复杂问题时容易焦虑，需要学会拆解

### 🧠 荔枝喵说
- 记录本身就是一种成长的方式
```

路径格式：`workspace/生活/日记/YYYY/MM.English/YYYY-MM-DD.md`

## 配置

### AI 润色配置

支持多种 API：

- Claude API（推荐）
- OpenAI API
- DeepSeek
- Moonshot
- 本地 Ollama

在设置页面选择预设模板或自定义配置。

### 远程模式配置

```typescript
// 设置页面配置
API 地址: http://macmini.local:3001
Token: your-secret-token
```

## 开发指南

详见 [AGENTS.md](AGENTS.md)，包含：

- 项目约束和架构说明
- 开发命令和端口配置
- 文件操作规范
- UI 语言约定

## 更新日志

详见 [CHANGELOG.md](CHANGELOG.md)

最新版本：v0.6.5

- 觉察和小确幸润色功能
- 自定义润色规则
- 设置页面折叠分组
- 日记不存在时新建按钮

## License

MIT