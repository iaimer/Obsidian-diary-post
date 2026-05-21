# Progress - Phase 6 多设备同步

## Phase 6.1: API Server 搭建 - ✅ 完成

（内容已记录在 commit 86d9ed6）

---

## Phase 6.2: PWA 改造 - ✅ 完成

（内容已记录在 commit 86d9ed6）

---

## Phase 6.3: pm2 部署优化 - ✅ 完成

### 已完成
- [x] 完善 pm2 配置（ecosystem.config.cjs）
  - 日志分离：error.log + out.log
  - 时间格式：YYYY-MM-DD HH:mm:ss Z
  - 自动重启：autorestart + max_memory_restart 1G
- [x] 创建一键部署脚本（deploy.sh）
  - 依赖安装 + TypeScript 构建
  - pm2 安装 + 启动 + 状态显示
  - 开机自启提示
- [x] 创建日志目录（server/logs/）
- [x] 添加 package.json pm2 scripts
  - pm2:start, pm2:stop, pm2:logs, pm2:restart
- [x] 创建 Mac mini 部署指南（DEPLOY.md）
- [x] 测试崩溃自动重启（kill -9 后自动重启）

### pm2 测试结果
- 进程崩溃后 2秒内自动重启
- 日志正常记录（时间戳格式）
- API 响应正常（health endpoint）

### 常用命令
```bash
pm2 status              # 查看状态
pm2 logs diary-api      # 查看日志
pm2 monit               # 监控面板
pm2 startup             # 开机自启
```

---

## 关键配置

- **MacBook Air**（开发调试）- Tailscale: `100.67.123.39`
- **Mac mini**（生产部署）- Tailscale: `100.127.58.104`
- API 端口：`4001`
- API Token：`diary-app-secret-token-2026`
- API 地址：
  - MacBook: `http://100.67.123.39:4001`
  - Mac mini: `http://100.127.58.104:4001`

---

## Phase 6 完成状态

- ✅ Phase 6.1: API Server 搭建
- ✅ Phase 6.2: PWA 远程模式
- ✅ Phase 6.3: pm2 部署优化
- ⏸️ Phase 6.4: 手机端优化（可选，暂不开发）

---

## Phase 7: AI 人生教练 - ✅ 完成

### 已完成
- [x] **设置页教练提示词**：AI 润色引擎内新增「教练提示词」Tab，与润色规则并排切换
  - 默认提示词：250-300 字教练式反馈，📌 模式识别/⚠️ 矛盾指出/🎯 行动建议/💬 暖心鼓励
  - 自定义提示词保存到 `diary-ai-config` localStorage
- [x] **AI 生成服务**：`src/services/aiPolish.ts` 新增 `generateLizhiSays()`
  - 收集当天日记全部区块作为上下文
  - 支持 Claude API + OpenAI 兼容 API（复用现有调用分支）
  - max_tokens: 800
- [x] **数据层**：新增 `replaceLizhiSays()` 和 `appendTomorrow()` 方法
  - DataService 接口 + LocalDataService + RemoteDataService
  - fileSync.ts：仿 updateHabits 替换整个区块
  - API Server：`POST /api/v1/diary/lizhi-says` + `POST /api/v1/diary/tomorrow`
- [x] **DiaryView 卡片布局**：
  - 人生教练卡片：空时显示「🧠 生成今日教练反馈」按钮，有内容时标题右侧「🔄 重新生成」
  - 明日寄语卡片：显示在人生教练与影像记录之间（sky-50 天蓝色背景）
- [x] **行动建议分离**：AI 输出的 🎯 行动建议自动提取并追加到明日寄语区块
- [x] **向后兼容**：旧日记 `🧠 荔枝喵说` 标题自动识别，下次写入迁移为 `🧠 人生教练`
- [x] **版本号**：`0.6.9` → `0.7.0`

### 涉及文件（15 files, +673/-87）
| 文件 | 改动 |
|---|---|
| `src/services/aiPolish.ts` | +121 行，新增 generateLizhiSays() + DEFAULT_COACH_PROMPT |
| `src/components/DiaryView.tsx` | +107 行，人生教练 + 明日寄语卡片 |
| `src/components/SettingsPage.tsx` | +112 行，教练提示词 Tab |
| `src/services/fileSync.ts` | +74 行，replaceLizhiSays() |
| `server/src/routes/diary.ts` | +83 行，2 条新路由 |
| `src/services/dataService.ts` | +32 行，replaceLizhiSays + appendTomorrow |
| `src/utils/markdown.ts` | +13 行，旧版标题兼容 |
| `server/src/services/markdown.ts` | +9 行，旧版标题兼容 |
| `server/src/services/template.ts` | 新版标题 |
| `src/components/SettingsPage.tsx` | 教练提示词 Tab |
| `src/App.tsx` | 明日寄语触发刷新 |
| `CHANGELOG.md` | v0.7.0 条目 |
| `CLAUDE.md` | AI 服务架构说明 |
| `AGENTS.md` | 写入操作模式文档 |

### 关键配置
- 提示词缓存检测：自动跳过含"第一人称"的旧版提示词（v0.7.0 之前）
- 教练提示词默认值：`理性的人生教练。250-300字，第三人称"你"视角...`