# AGENTS.md — 项目知识库

> 本文件也可能命名为 `CLAUDE.md`（取决于使用哪个 AI 工具），内容结构保持一致。

本项目是一个与 Obsidian 无缝集成的日记应用，支持多设备同步、AI 润色、习惯追踪。

## 快速命令

```bash
npm run dev      # 本地开发（端口 4000，strictPort: true）
npm run build    # TypeScript 检查 + Vite 构建
npm run preview  # 预览生产构建
```

无 lint 或测试命令。

## 发布前更新流程

推送前更新以下文件（版本号新增时同步更新）：
1. **package.json version** — 递增版本号（主版本）
2. **AGENTS.md** — 项目知识库（架构/约束/决策有变更时更新）
3. **SESSION_LOG.md** — 追加本次开发会话记录
4. **CHANGELOG.md** — 按版本记录功能变更
5. **README.md** — 功能说明/配置/结构/版本号有变更时更新

关于页会自动读取 `CHANGELOG.md` 中与当前 `package.json version` 对应的版本段落，发版时只需保证 CHANGELOG 当前版本内容完整。

## 关键约束

### Dev Server 端口
端口 **4000** 严格固定（`strictPort: true`），确保 localStorage 数据跨 Session 一致。**禁止修改或自动切换端口。**

### 日记写入模式
**禁止覆盖日记文件**，统一使用安全追加模式：
- `appendToSection()` — 先读 → 追加到指定区块 → 写回
- 习惯打卡：`updateHabits()` — 替换整个区块
- 人生教练：`replaceLizhiSays()` — 替换整个区块
- 明日寄语：`appendTomorrow()` — AI 行动建议追加
- 焦虑引导：`RecordWizard` 收集 4 个答案 → `appendAnxiety()` → `appendToSection(DiarySection.ANXIETY, ...)`
- `## 📈 每日复盘` 不是注册区块，但 `appendToSection` 中作为区块边界标记（加入 `allHeaders`）

### 时区
所有时间戳使用 **Asia/Shanghai** 时区。
服务端日期归档必须使用 `server/src/utils/date.ts` 中的上海时区工具，禁止依赖服务器本地时区。

### UI 语言
UI 标签和日记内容均为中文。代码注释用中文。

### 文件系统
使用浏览器 **File System Access API**，非 Node.js fs。路径相对于用户选择的 Vault 根目录。

### 远程 API 配置
- `server/config.json` 仅保存在部署机器本地，已加入 `.gitignore`
- 初始化时复制 `server/config.example.json`，再填写 Vault 路径和随机 Token
- 禁止将真实 Token、本地路径或内网地址提交到仓库或打包进前端
- 图片读取必须限制文件名并校验路径仍在目标 `assets` 目录内

## 架构概览

### Vault 路径结构

```
01.日记/YYYY/MM.EnglishMonth/YYYY-MM-DD.md
```

### 日记区块（DiarySection 枚举）

共 8 个区块（定义在 `src/types/index.ts`）：

| 区块 | 标题 |
|------|------|
| HABITS | `🏃 习惯打卡` |
| QUICK_NOTES | `✍️ 随手记 & 灵感` |
| HAPPINESS | `✨ 每日小确幸` |
| ANXIETY | `😰 焦虑时刻` |
| REFLECTION | `💡 觉察与迭代` |
| LIZHI_SAYS | `🧠 人生教练` |
| TOMORROW | `🌙 明日寄语` |
| IMAGES | `📸 影像记录` |

### 状态管理
- **Zustand** + persist 中间件（`src/stores/diaryStore.ts`）
- 持久化：`wasConnected`、`habitData`、`habitConfigs`
- 不持久化：`vaultConnected`、`currentDiary`、`refreshKey`

### 习惯系统
- **动态配置**：`HabitConfig` 接口（id, name, emoji, type, goal, unit, enabled, order, color）
- 默认 5 项：饮水、步数、阅读、学语言、补充剂
- 设置页支持添加/编辑/删除
- `HabitTracker` 根据配置动态渲染，数值型进度条 + 勾选型复选框

### AI 服务（`src/services/aiPolish.ts`）
- 支持 **Claude API** 和 **OpenAI 兼容 API**
- 配置存 localStorage（key: `diary-ai-config`）
- **润色** `polishContent()`：三层标签系统（领域 + 主题 + 可选方法）
  - 用户可编辑润色风格；标签分类规则由应用固定附加，避免配置漂移
- **人生教练** `generateLizhiSays()`：收集所有日记区块 → 生成 250-300 字教练反馈
  - 格式：📌 模式识别 / ⚠️ 矛盾指出 / 💬 暖心鼓励 + 🎯 行动建议（自动追加到明日寄语）
  - 教练提示词可在设置页自定义
  - 区块标题兼容旧版 `### 🧠 荔枝喵说`

### 页面导航
- 单页应用 + 底部导航（PageView: home / stats / settings）
- 当前页高亮：`text-indigo-600 font-medium`

### 离线存储
- **IndexedDB** via Dexie（`src/db/index.ts`）
- 主键：日期字符串 YYYY-MM-DD
- Vault 断开时缓存日记条目

### 统计页面
- **Recharts** 双 Y 轴折线图
- 历史数据从 Obsidian 文件读取（`src/services/habitStats.ts`）
- 默认目标：饮水 ≥1500mL，步数 ≥6000

### Capacitor Android（`android/`）

- Android APK 通过 Capacitor v8 构建，英文名为 **Litchi Journal**，包名为 `com.iaimer.litchijournal`，手机显示名仍为「荔枝日记」
- 前端 `isNativeApp()` 检测原生平台，自动启用 `remoteMode = true`、隐藏本地 Vault 连接按钮
- 首次 Token 为空时显示 `FirstTimeConfig` 配置导引页
- 使用 `@capacitor/network` 监听网络恢复，`@capacitor/app` 监听 App 回到前台，自动触发同步
- Android 禁止备份应用数据，避免本地 Token 和 AI Key 被系统备份
- Android 测试命令：`npm run android:sync && npm run android:open`

### 离线 Outbox 与幂等

- **存储**：IndexedDB `outbox` 表（Dexie schema v2），字段 `id, type, date, status, createdAt`
- **入队**：远程模式下的文字记录、习惯更新、图片上传通过 `enqueue()` 写入 outbox 后再尝试同步
- **跨日同步**：操作必须保存记录时的上海日期；文字额外保存原始 `HH:MM`，禁止补同步时改写为当前日期或时间
- **图片暂存**：压缩后的 Blob 存入 outbox，同步成功后才删除
- **习惯合并**：同日期新 `update_habits` 入队时删除旧操作，包括失败状态，仅保留最后一次完整状态
- **同步锁**：`syncLock` 防止并发同步，按创建时间顺序处理；启动同步时先将遗留 `syncing` 恢复为 `pending`
- **服务端幂等**：写入 API 携带 `operationId`（UUID），服务端写入同日期 `assets/.diary-ops.json` 旁路索引；禁止把幂等注释写入日记正文
- **创建日记幂等**：`POST /create` 文件已存在时返回成功
- AI 润色和人生教练不走离线队列，保持直接请求

## 标签系统

三层结构，定义在 `src/config/tags.ts`：

| 层级 | 说明 | 数量 |
|------|------|------|
| 领域（domain） | #亲子 #育儿 #工作 #学习 #阅读 #技术 #生活 | 7 |
| 主题（topic） | 每个领域有独立的主题列表 | 34 |
| 方法（method） | #反思 #方法论 #问题分析 #回忆 | 4 |

`#工作` 新增 `#专业学习`，承接服务于职业任务的标准方法、行业文献和职业培训。

`#生活` 主题标签（8 个）：健康管理、财务管理、生活整理、兴趣探索、消费选择、情绪感受、人际关系、日常记录。

领域判定先看人生场景；明确职业用途时优先归工作，无明确场景时默认归 `#生活 #日常记录`。

亲子与育儿不再复用相同主题：亲子使用陪伴互动、亲子沟通、关系连接；育儿使用教育引导、健康照护、情绪管理、表达能力、成长观察、自主探索。

> 标签系统详情见 `src/config/tags.ts` 和 `标签规范.md`。

## 重要决策记录

| 决策 | 原因 | 影响范围 |
|------|------|----------|
| File System Access API 而非 Node.js | 浏览器端直接操作 Vault，无需后端 | 全系统 |
| 追加模式而非全量写入 | 避免多人/多设备并发时覆盖他人内容 | fileSync.ts |
| 标签系统三层结构 | 平衡分类精度与使用成本 | tags.ts, 3 个 Modal |
| 标签配置统一提取到 tags.ts | 消除 3 个 Modal 中的三份重复代码 | v0.11.0 |
| 标签规则与润色风格分离 | 保证不同模型和旧配置使用同一分类边界 | prompts.ts, aiPolish.ts |
| Asia/Shanghai 固定时区 | 用户在中国，避免 UTC 导致的日期偏移 | 全系统 |
| Zustand 而非 Redux | 简单项目不需要 Redux 的复杂度 | stores/ |
| 双模式（本地 + 远程） | 手机需要远程访问，Mac 用本地模式 | DataService, server/ |
| 远程 API 凭据仅运行时配置 | 避免 Token 进入 Git 历史和前端产物 | server/config.json, 前端设置页 |
| 服务端显式使用 Asia/Shanghai | 避免服务器本地时区导致跨日写错文件 | server/src/utils/date.ts |
| Capacitor 原生容器 | 快速打包 Web App 为 Android APK，无需重写 UI | android/, platform.ts, capacitor.config.ts |
| 离线 Outbox + 索引幂等 | 手机弱网环境下不丢数据、不重复写入 | outboxService.ts, diary.ts |
| 写入先入队再同步 | 保证离线可用；AI 实时操作除外 | dataService.ts |
| 设置页现代化重构 | 概览→详情导航，手机单栏+桌面双栏，草稿模式远端API/AI/图片 | SettingsPage.tsx, settings/* |
| 运行时标签系统 | 自定义领域/主题/方法，远程同步，AI 和记录弹窗改为运行时读取 | TagConfig, SettingsTags, tagSync.ts |
| 日记条目编辑/删除 | 显式 `⋯` 入口，手机端底部操作面板，图片右上角直接删除；内容匹配定位，多自然段续行处理 | DiaryView.tsx, fileSync.ts |

## 工作流

场景 → skill 速查表见 `docs/workflow.md`。

## Agent skills

### Issue tracker

Issues tracked as GitHub issues via `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

All five canonical labels use their default names. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — root-level only. See `docs/agents/domain.md`.
