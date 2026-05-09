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

---

## 十、习惯统计页面（Phase 4） ✅ 已完成

### 实现状态
- ✅ 趋势图：饮水+运动双Y轴折线图（显示近7天数据）
- ✅ 热力图：阅读/学语言/补充剂标签式切换（微信读书风格）
- ✅ 渐变绿色：连续打卡越久颜色越深
- ✅ 从Obsidian文件读取历史数据并缓存到IndexedDB
- ✅ 统计汇总基于30天计算（平均值、达标率）

### 最终组件结构

```
src/components/
├── StatsPage.tsx           # 统计页面容器（固定30天）
├── HabitStats.tsx          # 习惯统计总览（趋势7天+热力图30天）
├── CombinedTrendChart.tsx  # 合并趋势图（双Y轴折线图）
└── HabitHeatmap.tsx        # 热力图（微信读书风格）
```

### 关键文件

| 文件 | 说明 |
|------|------|
| `src/services/habitStats.ts` | 历史数据提取、解析习惯区块 |
| `src/services/fileSync.ts` | readFile公开方法供统计页面调用 |
| `src/components/CombinedTrendChart.tsx` | Recharts双Y轴折线图 |
| `src/components/HabitHeatmap.tsx` | 微信读书风格热力图（渐变绿） |

---

## 十一、历史日记页面（Phase 5） 📋 待开发

### 功能概述

用户可以查看历史日记，通过日历视图选择日期，查看该天的日记内容（不含习惯追踪模块）。

### 核心功能

1. **日历视图**
   - 月度日历展示（类似iOS日历风格）
   - 当前日期高亮显示
   - 有日记的日期可点击
   - 月份切换（左右箭头或下拉选择）

2. **影像缩略图**
   - 日历中每个日期格子显示该天的影像缩略图（如果有）
   - 缩略图来源：日记文件中的 `## 📸 影像记录` 区块
   - 支持的图片格式：Obsidian内嵌图片 `![[image.png]]`
   - 缩略图尺寸：小圆形或方形（约20-30px）

3. **日记详情页**
   - 点击日期后展开/跳转到详情视图
   - 显示区块（不含习惯追踪）：
     - ✍️ 随手记 & 灵感
     - ✨ 每日小确幸
     - 💡 觉察与迭代
     - 🧠 荔枝喵说
     - 📸 影像记录（如果有）
   - 阅读模式渲染（无Markdown标记）

### 组件结构

```
src/components/
├── HistoryPage.tsx        # 历史页面容器
├── CalendarView.tsx       # 日历组件（月视图）
├── CalendarCell.tsx       # 日历格子（含缩略图）
├── DiaryDetail.tsx        # 日记详情视图
└── ImageThumbnail.tsx     # 图片缩略图组件
```

### 技术要点

#### 日历数据加载

```typescript
// 扫描月度目录获取该月所有日记文件
async function getMonthDiaries(year: number, month: number): Promise<DiaryMeta[]> {
  const path = `workspace/生活/日记/${year}/${month.toString().padStart(2, '0')}.${monthNames[month - 1]}`;
  // 获取目录下所有 YYYY-MM-DD.md 文件
  // 解析文件元数据：是否有影像、是否有随手记等
}
```

#### 影像缩略图提取

```typescript
// 从日记文件提取图片引用
function extractImages(diary: DiaryEntry): string[] {
  return diary.sections.images
    .filter(line => line.includes('![['))
    .map(line => {
      const match = line.match(/!\[\[(.*?)\]\]/);
      return match ? match[1] : null;
    })
    .filter(Boolean);
}

// 图片路径处理
function getImagePath(imageName: string, diaryDate: string): string {
  // Obsidian图片路径：workspace/生活/日记/YYYY/assets/imageName
  // 或 Vault 根目录的 attachments 文件夹
}
```

#### 日历格子UI

```tsx
// 日历格子组件
function CalendarCell({ date, diary, images }) {
  return (
    <div className="relative">
      <span className="text-sm">{date.getDate()}</span>
      {images.length > 0 && (
        <img 
          src={images[0]} 
          className="absolute bottom-0 right-0 w-6 h-6 rounded-full object-cover"
          alt="thumbnail"
        />
      )}
    </div>
  );
}
```

### UI设计草图

```
┌─────────────────────────────────────┐
│  📅 2026年5月                    < > │
├─────────────────────────────────────┤
│  日  一  二  三  四  五  六         │
│                                    │
│      1   2   3   4   5   6         │
│  7   8   9  [10] 11  12  13        │
│ 14  15  16  17  18  19  20         │
│ 21  22  23  24  25  26  27         │
│ 28  29  30  31                     │
│                                    │
│  [img] 表示有影像记录的日期          │
├─────────────────────────────────────┤
│  📅 2026-05-09 星期四               │
│  ─────────────────────────          │
│  ✍️ 手记 (3条)                     │
│  • 10:30 晨间播客感悟...            │
│  • 14:20 下午会议记录...            │
│  • 20:00 夜间阅读心得...            │
│  ─────────────────────────          │
│  ✨ 小确幸                           │
│  早上阳光洒进窗户，温暖又惬意        │
│  ─────────────────────────          │
│  💡 觉察与迭代                       │
│  今天发现自己在压力下容易拖延...     │
│  ─────────────────────────          │
│  🧠 荔枝喵说                         │
│  你今天的工作节奏有点不规律...       │
│  ─────────────────────────          │
│  📸 影像记录 (2张)                   │
│  [图片1缩略图] [图片2缩略图]         │
└─────────────────────────────────────┘
```

### 数据流

1. 用户进入历史页面 → 加载当前月份日历
2. 扫描月度目录 → 获取该月所有日记文件列表
3. 解析每个文件 → 提取元数据（是否有影像、随手记数量）
4. 渲染日历 → 有日记的日期可点击，有影像的显示缩略图
5. 点击日期 → 加载完整日记内容 → 渲染详情视图

### 性能优化

- 月度文件列表缓存到 IndexedDB
- 影像缩略图按需加载（懒加载）
- 详情页只在点击时才完整解析日记
- 使用虚拟滚动处理大月份列表

### 待定问题

- [ ] 图片路径解析：Obsidian可能有多种图片存储位置
- [ ] 图片读取权限：File System API是否能直接读取图片文件
- [ ] 日历与详情页的切换方式：内嵌展开还是独立页面
- [ ] 月份切换时的加载动画