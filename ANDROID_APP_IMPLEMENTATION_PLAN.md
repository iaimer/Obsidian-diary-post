# 荔枝日记 Android App 实施计划

> 交接用途：本文档用于指导其他 AI 或工程师直接实施 Android 自用 APK。
>
> 计划确认日期：2026-06-02
>
> 当前阶段：代码改造和 debug APK 已完成，待部署新版远程 API 后完成真机验收与签名打包。

## 1. 目标与边界

### 1.1 目标

将现有 React + Vite 日记 Web App 打包为 Android 原生容器 App，桌面名称为 **荔枝日记**。

Android App 只作为手机记录入口，不直接访问手机本地 Obsidian Vault。所有正式写入仍通过现有 HTTPS 远程 API 完成，由部署在 Mac mini 上的 Express 服务写入 Vault。

### 1.2 首版必须完成

- 可安装的 Android 自用 APK。
- 首次打开时预填远程 API 地址，由用户手动填写 Token 并测试连接。
- 支持现有日常功能：创建当日日记、文字记录、习惯打卡、图片上传、历史查看、统计、AI 润色和人生教练。
- 文字记录、习惯和压缩后的图片支持离线暂存。
- App 启动、回到前台、网络恢复时自动补同步。
- 顶部状态条展示离线、待同步数量、同步失败和手动重试入口。
- 弱网重试不会重复写入文字或图片。

### 1.3 首版明确不做

- 不让 Android 直接读写手机本地 Obsidian Vault。
- 不实现完整离线历史浏览和离线统计。
- 不将 AI 润色或人生教练请求加入离线队列。
- 不预置远程 API Token 或 AI Key 到安装包。
- 不上架 Google Play，不准备商店素材和审核材料。
- 不加入通知、桌面快捷动作或复杂后台常驻同步。

## 2. 当前项目事实

### 2.1 已有架构

- 前端：React 18 + TypeScript + Vite + Tailwind CSS。
- 状态：Zustand + persist，中间件将配置保存到 localStorage。
- 离线缓存：Dexie / IndexedDB，当前仅有 `entries` 表，用于缓存已读取日记。
- 数据服务：`src/services/dataService.ts` 已抽象 `LocalDataService` 与 `RemoteDataService`。
- 桌面本地模式：通过浏览器 File System Access API 连接 Vault。
- 手机远程模式：通过 HTTPS API 访问 Mac mini 上的 Express 服务。
- 服务端：Express + TypeScript，配置存放于本地 `server/config.json`，禁止提交真实 Token 和 Vault 路径。
- 时区约束：所有归档与时间戳必须使用 `Asia/Shanghai`。

### 2.2 已验证事项

- `npm run build` 已通过。
- 当前尚未安装 Capacitor。
- 当前开发机器尚未安装 Java Runtime、Android Studio 和 Android SDK。
- npm registry 查询确认可使用以下稳定版本：
  - `@capacitor/core@8.3.4`
  - `@capacitor/android@8.3.4`
  - `@capacitor/cli@8.3.4`
  - `@capacitor/app@8.1.0`
  - `@capacitor/network@8.0.1`

### 2.3 必须注意的现有问题

Capacitor Android WebView 通常使用 `localhost` 作为前端 host。现有代码通过 `window.location.hostname` 判断本地或生产环境，会将 Android App 误判为桌面本地模式。

Android 改造必须显式识别 Capacitor 原生平台，并在原生环境默认启用远程模式。

## 3. 已确认的产品决策

| 项目 | 决策 |
|------|------|
| Android 首版形态 | Capacitor 原生容器，不重写 React UI |
| 应用名称 | 荔枝日记 |
| 英文名 | Litchi Journal |
| GitHub 建议名 | `litchi-journal` |
| Android applicationId | `com.iaimer.litchijournal` |
| Vault 写入位置 | 远端 Mac mini Vault |
| 分发方式 | 自用 APK，手动侧载 |
| API 配置 | 地址预填，Token 首次启动手填 |
| AI Key | 继续由用户在设备本地配置 |
| 离线范围 | 文字记录、习惯、压缩图片 |
| AI 离线行为 | AI 润色和人生教练仅联网可用 |
| 冲突策略 | 文字按顺序追加；习惯按日期末次状态覆盖 |
| 自动同步时机 | App 启动、回到前台、网络恢复 |
| 同步提示 | 顶部状态条 + 手动重试 |
| 防重复策略 | Markdown 中加入不可见 HTML 操作标记 |
| 网络策略 | 仅允许 HTTPS，不开放 Android 明文 HTTP |

## 4. 实施阶段

### 阶段 A：建立 Android 容器

#### A1. 安装工具链

在开发机器安装：

- Android Studio。
- Android SDK。
- Android Studio 推荐的 JDK。
- Android 模拟器或启用 USB 调试的 Android 真机。

验证：

```bash
java -version
adb version
```

#### A2. 安装 Capacitor

在前端项目根目录安装：

```bash
npm install @capacitor/core@8.3.4 @capacitor/android@8.3.4 @capacitor/app@8.1.0 @capacitor/network@8.0.1
npm install --save-dev @capacitor/cli@8.3.4
npx cap init "荔枝日记" "com.iaimer.litchijournal" --web-dir dist
npx cap add android
```

新增或确认 `capacitor.config.ts`：

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.iaimer.litchijournal',
  appName: '荔枝日记',
  webDir: 'dist'
};

export default config;
```

为 `package.json` 增加便捷命令：

```json
{
  "scripts": {
    "android:sync": "npm run build && npx cap sync android",
    "android:open": "npx cap open android"
  }
}
```

#### A3. 原生基础体验

- 配置应用图标和启动页。
- 检查顶部与底部安全区，统一使用 `env(safe-area-inset-top)` 和 `env(safe-area-inset-bottom)`。
- 使用 `@capacitor/app` 监听 Android 返回键：
  - 模态框打开时先关闭模态框。
  - 非主页时返回主页。
  - 主页无弹层时允许系统退出或后台化。
- 图片选择首版继续复用 `<input type="file" accept="image/*" multiple>`，在真机验证系统相册选择器可用。

### 阶段 B：原生环境识别与首次配置

#### B1. 平台判断

新增小型平台工具，例如 `src/utils/platform.ts`：

```ts
import { Capacitor } from '@capacitor/core';

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}
```

调整 `src/App.tsx` 与 `src/stores/diaryStore.ts`：

- Android 原生环境默认 `remoteMode = true`。
- Android 原生环境默认 API 地址为现有 HTTPS 生产地址。
- 桌面 `localhost:4000` 继续默认本地 Vault 模式。
- Web 生产环境继续默认远程模式。
- 不将 Token 硬编码进仓库或前端产物。

#### B2. 首次配置引导

新增轻量首次配置页面或遮罩：

- 仅在 Android 原生环境且 Token 为空时显示。
- API 地址预填现有生产 HTTPS 地址，但允许编辑。
- Token 必须由用户手动填写。
- 提供“测试连接”按钮。
- 测试成功后进入主页。
- 测试失败时保留输入并给出明确错误。

可复用设置页现有连接测试逻辑，避免复制请求实现。

#### B3. 上海时区

前端目前部分日期逻辑仍使用设备本地时区。Android 版必须新增统一的上海时区日期工具，并用于：

- 当日日记日期。
- outbox 操作日期。
- 图片归档日期。
- 历史页默认日期。
- 所有远程 API 日期参数。

服务端已有 `server/src/utils/date.ts`，继续使用现有上海时区工具。

### 阶段 C：离线 Outbox

#### C1. Dexie 数据结构

扩展 `src/db/index.ts`。保留现有 `entries` 表，新增 outbox 表。

建议结构：

```ts
export type OutboxOperationType =
  | 'create_diary'
  | 'append_quick_note'
  | 'append_happiness'
  | 'append_reflection'
  | 'append_anxiety'
  | 'update_habits'
  | 'upload_image';

export interface OutboxOperation {
  id: string;
  type: OutboxOperationType;
  date: string; // Asia/Shanghai, YYYY-MM-DD
  payload: Record<string, unknown>;
  imageBlob?: Blob;
  createdAt: string;
  retryCount: number;
  lastError?: string;
  status: 'pending' | 'syncing' | 'failed';
}
```

Dexie schema 升级为新版本：

```ts
this.version(2).stores({
  entries: 'date',
  outbox: 'id, type, date, status, createdAt'
});
```

要求：

- `id` 使用 `crypto.randomUUID()`。
- 图片在入队前先按现有 Canvas 逻辑压缩，队列只保存压缩后的 Blob。
- 同步成功后删除对应 outbox 记录。
- 同步失败时保留记录、增加 `retryCount`、写入可展示错误。
- App 重启后队列仍然存在。

#### C2. 远程写入统一进入队列

为远程模式增加 outbox service，例如 `src/services/outboxService.ts`。

核心职责：

- `enqueue(operation)`：先持久化，再尝试同步。
- `syncPending()`：按创建时间顺序发送。
- `retryFailed()`：将失败项重新置为 pending 后同步。
- `getOutboxSummary()`：返回待同步数量、失败数量和同步中状态。

远程模式下以下操作必须先入队：

- 创建今日日记。
- 随手记。
- 小确幸。
- 觉察。
- 焦虑记录。
- 习惯更新。
- 图片上传。

注意：

- 本地 Vault 模式保持现有行为，不走 outbox。
- 远程读取、历史和统计仍直接请求 API；离线失败时保留现有缓存降级逻辑。
- AI 请求直接请求 AI API，不走 outbox。

#### C3. 合并规则

文字记录与图片：

- 保持用户创建顺序。
- 一条操作同步成功后再处理下一条。
- 不并发上传，避免顺序混乱。

习惯更新：

- 按 `date` 合并。
- 入队新习惯状态时删除同一天仍未同步的旧 `update_habits` 操作，仅保留最新完整状态。
- 服务端继续整体替换习惯区块。

创建日记：

- 同步任何当日写操作前，先确保对应日期的日记存在。
- 创建接口必须幂等。文件已存在也返回成功。

#### C4. 自动同步触发器

使用：

- `@capacitor/network`：监听网络恢复。
- `@capacitor/app`：监听 App 回到前台。
- React 初始化：App 启动后尝试同步。

触发器只调用同一个 `syncPending()`，并通过内部锁避免并发重复同步。

### 阶段 D：服务端幂等

#### D1. API 请求增加 operationId

以下远程写入请求增加 `operationId`：

- `/api/v1/diary/create`
- `/api/v1/diary/quick-note`
- `/api/v1/diary/happiness`
- `/api/v1/diary/reflection`
- `/api/v1/diary/anxiety`
- `/api/v1/diary/habit`
- `/api/v1/diary/image/upload`

服务端校验：

- `operationId` 必须是非空字符串。
- 建议只允许 UUID 格式。
- 不将 Token 或其他敏感值写入日志。

#### D2. 旁路幂等索引

服务端不得将 `operationId` 写入 Markdown 正文。幂等状态写入同日期 assets 目录下的旁路索引文件：

```text
01.日记/YYYY/MM.EnglishMonth/assets/.diary-ops.json
```

处理逻辑：

1. 写入前读取原文件。
2. 读取 `.diary-ops.json` 中的已完成 operationId。
3. 已存在则直接返回成功，不再次追加。
4. 不存在则写入对应区块；写入成功后把 operationId 追加到旁路索引。
5. 兼容旧版 `<!-- diary-op:UUID -->`，写入时自动清理旧注释行。

图片上传：

1. 图片文件名应由服务端按现有规则生成。
2. 写入图片前检查旁路索引中是否已有同一 `operationId`。
3. 已存在则直接返回成功。
4. 不存在才保存图片并追加：

```md
![[Image-YYYYMMDD-NNN.jpg]]
```

习惯更新：

- 可接受重复执行，因为是整体替换区块。
- 仍携带 `operationId`，保持接口一致。

创建日记：

- 文件已存在时直接返回 `{ success: true, exists: true }`。
- 不再将“已存在”作为错误。

#### D3. 兼容性

- 桌面本地模式仍可写入不带操作标记的内容。
- 解析与渲染逻辑必须忽略 HTML 注释，不在 UI 显示操作标记。
- 旧日记无标记时仍正常读取。

### 阶段 E：同步状态 UI

新增顶部状态条，例如 `src/components/SyncStatusBar.tsx`。

显示规则：

| 状态 | 展示 |
|------|------|
| 在线且队列为空 | 默认隐藏 |
| 离线 | “当前离线，N 项记录将在联网后同步” |
| 正在同步 | “正在同步 N 项记录...” |
| 有失败项 | “有 N 项同步失败” + “重试”按钮 |
| 同步完成 | 可短暂显示“同步完成”，随后隐藏 |

要求：

- 状态条只在远程模式显示。
- 不用弹窗打断用户记录。
- 图片 Blob 失败时保留，可手动重试。
- 可以在设置页补充一个简短队列状态摘要，但首版不需要复杂任务列表。

### 阶段 F：Android 构建与签名

每次同步 Android 工程：

```bash
npm run android:sync
npm run android:open
```

在 Android Studio 中：

1. 等待 Gradle 同步完成。
2. 使用真机或模拟器运行 debug 版本。
3. 验收通过后生成签名 APK。
4. 将 keystore 保存在项目目录之外，不提交 Git。
5. 记录 keystore 存放方式，但禁止在仓库中记录真实密码。

## 5. 关键代码改动范围

优先最小化修改，不进行无关重构。

### 前端重点文件

| 文件 | 改动 |
|------|------|
| `package.json` | 增加 Capacitor 依赖和 Android 命令 |
| `capacitor.config.ts` | 新增 Android 容器配置 |
| `src/utils/platform.ts` | 新增原生平台识别 |
| `src/utils/date.ts` | 统一上海时区日期工具 |
| `src/db/index.ts` | Dexie schema v2，新增 outbox |
| `src/services/outboxService.ts` | 新增队列、重试、合并、同步锁 |
| `src/services/dataService.ts` | 远程写入接入 outbox |
| `src/App.tsx` | 原生初始化、首次配置、同步触发器、状态条 |
| `src/components/SyncStatusBar.tsx` | 新增同步状态 UI |
| `src/components/ImageUploadButton.tsx` | 远程图片上传改为 Blob 入队 |

### 服务端重点文件

| 文件 | 改动 |
|------|------|
| `server/src/routes/diary.ts` | operationId 校验、创建幂等、追加与图片查重 |
| `server/src/services/markdown.ts` | 如有需要，集中封装隐藏标记查重和追加 |

### Android 工程

`android/` 目录由 Capacitor 生成并纳入版本控制。仅修改必要的 Android 配置、图标与启动页资源。

## 6. 验收清单

### 6.0 当前验证状态

已完成：

- 前后端构建、Capacitor 同步和 Gradle debug APK 编译。
- Android 模拟器安装、冷启动、页面渲染、安全区和主页返回键退出。
- 上海跨日日期断言、服务端非法日期拒绝。
- 模拟器离线 outbox 持久化、遗留 `syncing` 状态恢复和启动补同步路径。

仍待完成：

- 将本次服务端改动部署到远程 API。当前运行中的远程服务仍是旧版本，无法完成新版幂等创建和按队列日期写入验收。
- 部署后按 6.2 至 6.5 在 Android 真机完整回归在线、离线、弱网、图片与幂等场景。
- 生成签名 APK。

### 6.1 Web 回归

```bash
npm run build
cd server
npm run build
```

- 桌面浏览器本地 Vault 模式仍可连接、读取和追加。
- Web 远程模式仍可配置 Token 并写入。
- HTML 操作标记不会显示在首页或历史详情。

### 6.2 Android 在线场景

- 首次安装后显示配置引导。
- API 地址已预填，Token 未预置。
- Token 测试成功后进入主页。
- 可创建今日日记。
- 可新增四类文字记录。
- 可修改习惯。
- 可从相册选择并上传多张图片。
- 可查看历史、统计、AI 润色和人生教练。

### 6.3 Android 离线场景

开启飞行模式后：

- 可暂存四类文字记录。
- 可暂存习惯更新，重复修改后仅保留末次状态。
- 可选择多张图片，压缩后进入队列。
- 顶部状态条准确显示待同步数量。
- 杀掉 App 后重新打开，队列仍存在。

恢复网络后：

- 自动触发同步。
- 文字按创建顺序追加。
- 习惯以最后状态覆盖。
- 图片上传成功并出现在影像记录区块。
- 队列清空，状态条隐藏。

### 6.4 弱网与幂等

- 模拟服务端已写入但客户端未收到成功响应。
- 重试相同 `operationId`。
- 确认文字没有重复。
- 确认图片没有重复文件或重复 WikiLink。
- 创建已存在日记时返回成功。

### 6.5 Android 体验

- 系统返回键符合预期。
- 模态框可以先关闭。
- 深色与浅色模式正常。
- 顶部和底部不被状态栏或导航栏遮挡。
- App 切后台再恢复时自动尝试同步。
- 手机切换到非上海时区后，日记仍归档到上海日期。

## 7. 实施约束

- 遵守项目现有“安全追加”原则：文字记录不得覆盖整个日记文件。
- 服务端 Token、Vault 路径、AI Key、keystore 密码不得进入 Git、日志或前端产物。
- 仅新增必要依赖，不引入额外状态管理库。
- 保留 LocalDataService，不破坏桌面本地 Vault 使用场景。
- 错误必须可见、可重试，不静默丢弃 outbox 项目。
- 图片 Blob 只在同步成功后删除。
- 所有日期归档以 `Asia/Shanghai` 为准。

## 8. 文档与版本更新

实现完成并准备推送前，按项目流程更新：

1. `package.json` 主版本号。
2. `AGENTS.md`：补充 Capacitor Android、outbox 和幂等标记约束。
3. `SESSION_LOG.md`：记录本次实现、决策和验证结果。
4. `CHANGELOG.md`：记录 Android APK 与离线同步能力。
5. `README.md`：补充 Android 构建、首次配置和安装说明。
6. 本文档：将已完成阶段标记清楚，并记录仍未完成事项。

## 9. 推荐执行顺序

1. 安装 Android 工具链并生成最小 Capacitor APK。
2. 修复 Android `localhost` 误判，完成首次 Token 配置。
3. 增加 Dexie outbox 和同步状态条。
4. 依次接入文字、习惯、图片离线队列。
5. 服务端增加 operationId 幂等处理。
6. 真机完成在线、离线、弱网和回归验收。
7. 生成签名 APK，更新项目文档。
