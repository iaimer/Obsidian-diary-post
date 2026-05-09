# 日记APP设计方案

## Context

用户目前使用 hermes agent 通过即时通讯工具记录日记、随手记、习惯追踪和觉察。希望构建一个独立的APP，不依赖飞书/Telegram等平台，直接写入Obsidian Vault。

**这是一个全新的独立项目**，项目目录 `/Users/yezi/Coding/Diary Post` 当前为空，需要从零开始创建。

**核心功能划分**：
- ✅ APP实现：随手记输入、润色、觉察、小确幸、习惯追踪
- 🔄 hermes agent保留：荔枝喵说（定时触发生成）
- 不需要内置语音功能（用户使用系统输入法）
- 完全本地存储，Obsidian Vault是唯一数据源
- 跨平台使用（手机+电脑）

---

## 一、技术栈

| 维度 | 选择 | 理由 |
|------|------|------|
| **应用形态** | PWA（渐进式Web应用） | 手机+电脑跨平台，一次开发 |
| **前端框架** | React + TypeScript | 用户选择，类型安全，组件化 |
| **样式** | Tailwind CSS | 快速开发，原子化样式 |
| **状态管理** | Zustand + LocalStorage | 轻量级，无需Redux复杂度 |
| **本地缓存** | IndexedDB (Dexie.js) | 离线缓存日记内容 |
| **文件系统** | File System Access API | 直接写入Obsidian Vault |
| **构建工具** | Vite | macOS和跨平台友好，开发体验好，构建快 |

---

## 二、核心功能

### 2.1 必须实现（MVP）

1. **快速随手记输入**
   - 单行输入框 + 标签选择器
   - 自动获取时间戳
   - **润色功能**：生动化扩写（事实零增补、去官腔、口语化）
   - 一键追加到Obsidian日记文件

2. **觉察与小确幸**
   - 觉察区块快速输入（追加到"💡 觉察与迭代"）
   - 小确幸区块输入（追加到"✨ 每日小确幸"）
   - 保留引导文字格式

3. **习惯打卡**
   - 5项习惯：饮水(mL)、运动(步)、阅读、学语言、补充剂
   - 快速更新数值
   - 自动写入日记习惯区块

4. **日记查看**
   - 查看当日/历史日记
   - 查看荔枝喵说（只读，由hermes agent生成）
   - 查看习惯汇总

5. **文件系统集成**
   - 用户授权Obsidian Vault目录
   - 自动创建月度目录 `YYYY/序号.英文月份名/`
   - 安全追加模式（先读再追加，不覆盖）

6. **润色引擎（可选AI增强）**
   - 基础润色：格式规范化、时间戳生成
   - AI润色（可选）：生动化扩写，需配置API Key

### 2.2 后续增强

- AI润色引擎（需配置API Key）
- 习惯月度汇总表生成
- 标签统计可视化
- 日记搜索
- 焦虑时刻区块输入

---

## 三、文件结构

```
diary-app/
├── public/
│   ├── manifest.json          # PWA配置
│   └── icons/                 # 应用图标
├── src/
│   ├── components/
│   │   ├── QuickInput.tsx     # 随手记输入
│   │   ├── HabitTracker.tsx   # 习惯打卡
│   │   ├── DiaryView.tsx      # 日记查看
│   │   └── Calendar.tsx       # 日期选择
│   ├── services/
│   │   ├── fileSync.ts        # Obsidian文件读写
│   │   ├── diary.ts           # 日记解析/生成
│   │   ├── habit.ts           # 习惯数据处理
│   │   └── template.ts        # 日记模板
│   ├── stores/
│   │   ├── diaryStore.ts      # Zustand状态
│   │   └── habitStore.ts
│   ├── utils/
│   │   ├── date.ts            # 日期处理（英文月份名）
│   │   ├── markdown.ts        # Markdown解析
│   │   └── path.ts            # Obsidian路径生成
│   ├── db/
│   │   └── index.ts           # IndexedDB (Dexie)
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 四、关键实现要点

### 4.1 Obsidian路径生成

```typescript
// 路径格式：YYYY/序号.英文月份名/YYYY-MM-DD.md
function getDiaryPath(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const day = date.toISOString().split('T')[0];

  return `${year}/${month.toString().padStart(2, '0')}.${monthNames[month - 1]}/${day}.md`;
}
```

### 4.2 安全追加模式

```typescript
async function appendToSection(date: string, section: string, content: string) {
  // 1. 先读取现有文件
  const file = await getFile(date);
  const existing = await file.text();

  // 2. 解析Markdown结构
  const parsed = parseDiary(existing);

  // 3. 在指定区块追加（不覆盖）
  if (!parsed.sections[section]) {
    parsed.sections[section] = [];
  }
  parsed.sections[section].push(content);

  // 4. 重新序列化并写入
  await file.write(serializeDiary(parsed));
}
```

### 4.3 随手记格式

```markdown
- **HH:MM** 内容 #领域 #能力 #方法
```

时间戳获取：
```typescript
function getTimestamp(): string {
  // 使用 Asia/Shanghai 时区
  return new Date().toLocaleTimeString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}
```

### 4.4 习惯打卡格式

```markdown
## 🏃 习惯打卡
- 🥛🥤🥤🥤🥤饮水 1500 mL
- 🧘 运动/拉伸/快走 8000 步
- [x] 📖 阅读/亲子共读
- [ ] 🇬🇧 学语言
- [ ] 💊 鱼油/植物甾醇
```

---

## 五、UI设计（简洁优先）

### 5.1 主界面

```
┌─────────────────────────────┐
│  📅 2026-05-09  星期六      │
├─────────────────────────────┤
│  ┌─────────────────────────┐│
│  │ 📝 快速记录...          ││
│  │ [#亲子] [#工作] [润色] ││
│  │ [发送]                  ││
│  └─────────────────────────┘│
│                             │
│  快捷入口：                  │
│  [💡觉察] [✨小确幸]        │
├─────────────────────────────┤
│  今日习惯                    │
│  💧 500mL  🏃 0步  📖☐  🇬🇧☐ │
├─────────────────────────────┤
│  今日记录 (3条)              │
│  • 10:30 播客感悟...        │
│  • 14:20 会议灵感...        │
├─────────────────────────────┤
│  🧠 荔枝喵说（查看）         │
├─────────────────────────────┤
│  [历史] [统计] [设置]       │
└─────────────────────────────┘
```

### 5.2 设置页

- Obsidian Vault路径授权
- 标签管理（预设三层标签）
- 习惯配置（目标值设置）

---

## 六、跨平台文件同步方案

### 问题：File System Access API在移动端支持有限

**方案**：
1. **电脑端**：直接使用File System Access API写入Obsidian Vault
2. **移动端**：
   - 方案A：依赖Obsidian Sync/iCloud同步（用户自行配置）
   - 方案B：PWA仅作为查看端，写入需电脑端完成

**推荐**：方案A，用户使用Obsidian官方同步服务，APP读取同步后的文件。

---

## 七、实现计划

### Phase 1: MVP核心（1-2周）

| 任务 | 验证标准 |
|------|----------|
| 创建Vite+React项目 | `npm run dev`正常运行 |
| 实现日记模板解析 | 能正确解析现有日记文件的7大区块 |
| 实现路径生成 | 生成正确的Obsidian路径（YYYY/序号.英文月份名/） |
| 实现随手记输入+追加 | 内容出现在Obsidian文件的"✍️ 随手记"区块 |
| 实现润色功能（基础） | 格式规范化、时间戳自动添加 |
| 实现觉察输入 | 追加到"💡 觉察与迭代"区块 |
| 实现小确幸输入 | 追加到"✨ 每日小确幸"区块 |
| 实现习惯打卡 | 数值正确更新到日记习惯区块 |
| IndexedDB缓存 | 离线可查看日记 |

### Phase 2: UI完善（1周）

- 标签选择器（三层标签体系：领域+能力+方法）
- 日记查看页面（分区块展示）
- 设置页面（路径授权、标签管理）
- PWA配置（离线可用）

### Phase 3: 增强功能（可选）

- AI润色引擎（生动化扩写，需配置API Key）
- 习惯月度汇总表
- 标签统计可视化
- 日记搜索
- 焦虑时刻区块输入

---

## 八、参考文件

| 文件 | 参考内容 |
|------|----------|
| `/Users/yezi/Obsidian Vault/_Templates/journal.md` | 日记模板结构（7大区块） |
| `/Users/yezi/Obsidian Vault/workspace/生活/日记/` | 日记文件格式、路径命名规则 |
| diary-workflow skill规则 | 标签体系、润色原则、追加规则 |

---

## 九、关键风险

| 风险 | 应对 |
|------|------|
| File System API移动端限制 | 用户依赖Obsidian同步服务 |
| 追加覆盖风险 | 严格遵循"先读再追加"规则 |
| 标签体系变化 | 从skill动态加载，缓存本地 |
| AI润色API成本 | 基础润色无需API，AI润色可选配置 |
| 同一输入合并规则 | UI提示用户，后端实现合并逻辑 |

---

## 总结

这是一个轻量级的PWA应用，核心功能分工：

**APP负责**：
1. **随手记**：输入、润色（基础格式化+可选AI生动化）、追加到Obsidian
2. **觉察与小确幸**：快速输入，追加到对应区块
3. **习惯追踪**：打卡、数值更新、可视化展示
4. **日记查看**：分区块展示当日/历史日记

**hermes agent保留**：
- 荔枝喵说（定时触发的AI教练反馈）
- Wiki维护、标签系统维护等复杂任务

核心价值：减少打开Obsidian的操作成本，手机也能快速记录和查看。