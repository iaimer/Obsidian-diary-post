# Obsidian Diary Post

一个与 Obsidian 无缝集成的日记应用，支持多设备同步和 AI 润色。

## 项目特点

### 🎯 核心亮点

- **Obsidian Vault 集成**：直接读写 Obsidian 日记文件，无需手动同步
- **多设备同步**：手机 + Mac 远程访问，Mac mini 作为本地服务器
- **三层标签系统**：领域 → 能力 → 方法，自动生成结构化标签
- **AI 润色引擎**：支持 Claude、OpenAI、DeepSeek 等多种 API
- **习惯追踪统计**：可自定义习惯配置，可视化趋势和热力图
- **过往日记查看**：月视图日历，自动预览昨天，选中高亮

### 📱 主要功能

| 功能模块 | 说明 |
|---------|------|
| **随手记** | 快速记录日常事件，三层标签选择器，AI 润色 |
| **习惯打卡** | 可自定义习惯配置：名称、图标、目标值、颜色 |
| **习惯管理** | 设置页面添加/编辑/删除习惯，10种背景颜色 |
| **觉察与小确幸** | 快速输入弹窗，支持润色和标签 |
| **人生教练** | AI 教练式反馈，基于当天日记生成模式识别和行动建议 |
| **图片上传** | 支持手机/电脑上传照片，浏览器端 Canvas 压缩 |
| **过往日记** | 月视图日历，自动预览昨天，选中高亮，小圆点标记有内容日期 |
| **习惯统计** | 近 30 天趋势柱状图和热力图，动态生成标签页 |

### 🏗️ 技术架构

- **前端**：React + TypeScript + Vite + Tailwind CSS
- **后端**：Express + TypeScript（可选，用于远程模式）
- **状态管理**：Zustand + localStorage 持久化
- **离线缓存**：IndexedDB (Dexie.js)
- **文件系统**：File System Access API（本地模式）

## 使用场景

### 1. 本地模式（Mac/桌面浏览器）

直接连接 Obsidian Vault，适合桌面端快速记录。

### 2. 远程模式（手机 + Mac mini）

手机浏览器访问 Mac mini API，随时随地记录。

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（端口 4000）
npm run dev

# 构建生产版本
npm run build
```

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
│   └── src/services/       # 服务层
├── dist/                   # 构建输出
├── CHANGELOG.md            # 更新日志
└── PLAN.md                 # 开发计划
```

## 日记格式

路径格式：`01.日记/YYYY/MM.English/YYYY-MM-DD.md`

日记文件包含以下区块：
- 🏃 习惯打卡
- ✍️ 随手记 & 灵感
- ✨ 每日小确幸
- 😰 焦虑时刻
- 💡 觉察与迭代
- 🧠 人生教练（AI生成）
- 🌙 明日寄语
- 📸 影像记录

## 配置

### AI 润色配置

支持多种 API：Claude、OpenAI、DeepSeek、Moonshot、本地 Ollama

在设置页面选择预设模板或自定义配置。

### 远程模式配置

API 地址 + Token 配置，详见设置页面。

## 更新日志

详见 [CHANGELOG.md](CHANGELOG.md)

**当前版本：v0.11.0**

## 开发计划

详见 [PLAN.md](PLAN.md)

## License

MIT