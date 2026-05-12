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

## 十一、历史日记页面（Phase 5） ✅ 已完成

### 功能概述

用户可以查看历史日记，通过日历视图选择日期，查看该天的日记内容（不含习惯追踪模块）。

### 实现状态

- ✅ 月视图日历组件（CalendarView）
- ✅ 当前日期高亮显示（indigo-600背景）
- ✅ 有日记的日期显示蓝色标记
- ✅ 月份切换（左右箭头）
- ✅ 影像缩略图显示（CalendarDayCell）
  - 图片存储支持月份assets和年份assets两种路径
  - 图片URL缓存机制，避免重复加载
  - 渐变遮罩层确保日期数字清晰可见
  - 加载状态和错误处理提示
- ✅ 日记详情组件（DiaryDetail）
  - 显示日记区块（不含习惯追踪）
  - 影像记录网格显示
- ✅ 图片放大查看（ImageModal）
  - 全屏弹窗显示大图
  - 支持左右箭头切换多图
  - 键盘操作（ESC关闭，箭头切换）
  - 超过3张图片显示底部缩略图导航
- ✅ 底部导航"历史"按钮切换

### 最终组件结构

```
src/components/
├── HistoryPage.tsx        # 历史页面容器（底部导航切换）
├── CalendarView.tsx       # 月视图日历组件
├── CalendarDayCell.tsx    # 日历格子（含图片缩略图）
├── DiaryDetail.tsx        # 日记详情视图（不含习惯追踪）
└── ImageModal.tsx         # 图片放大弹窗（全屏查看）

src/services/
└── historyService.ts      # 历史日记数据服务
  - getMonthDiaries(): 获取月份日记元数据
  - loadDiary(): 加载完整日记内容
  - loadImage(): 加载图片并转为Blob URL
  - imageCache: 图片URL缓存

src/types/
├── history.ts             # DiaryMeta类型定义
└── fileSystem.d.ts        # File System API类型声明
```

### 关键文件

| 文件 | 说明 |
|------|------|
| `src/components/HistoryPage.tsx` | 历史页面容器，协调日历和详情 |
| `src/components/CalendarView.tsx` | 月视图日历，7列格子布局 |
| `src/components/CalendarDayCell.tsx` | 日历格子，图片缩略图+渐变遮罩 |
| `src/components/DiaryDetail.tsx` | 日记详情，分区块显示（不含习惯） |
| `src/components/ImageModal.tsx` | 图片放大弹窗，全屏查看+键盘操作 |
| `src/services/historyService.ts` | 历史数据服务，图片加载+缓存 |
| `src/types/history.ts` | DiaryMeta类型（日期、图片、随手记数量） |

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
6. 点击图片 → 打开ImageModal全屏查看 → 支持切换和关闭

### 性能优化

- ✅ 图片URL缓存机制（Map缓存，避免重复加载）
- ✅ 图片懒加载（按需加载，只在需要时请求）
- ✅ 详情页只在点击时才完整解析日记
- 📋 月度文件列表缓存到 IndexedDB（待实现）
- 📋 使用虚拟滚动处理大月份列表（暂不需要）

### 已解决问题

- ✅ 图片路径解析：支持月份assets和年份assets两种存储位置
- ✅ 图片读取权限：File System API可读取图片并转为Blob URL
- ✅ 日历与详情页的切换方式：点击日期后详情在日历下方展开
- ✅ 月份切换：通过左右箭头实现，数据按需加载

### UI设计实现

日历月视图：
- 7列格子布局（日、一、二、三、四、五、六）
- 当前日期：indigo-600背景 + 白色文字 + 加粗
- 有日记日期：blue-50背景 + 灰色文字
- 有图片日期：图片背景 + 渐变黑色遮罩（20%-40%）+ 白色文字 + 📷图标
- 无日记日期：灰色文字 + hover浅灰背景

日记详情视图：
- 随手记、小确幸、觉察、荔枝喵说区块（不含习惯追踪）
- 影像记录：3列网格 + 正方形裁剪 + hover放大110%
- 点击图片：全屏弹窗 + 最大90%视窗尺寸

---

## 十二、后续开发计划（Phase 6+）

### 待开发功能

- [ ] **应用图标设计**（Phase 7）：添加完整的图标系统
- [ ] **多设备同步**（Phase 6）：支持手机和电脑数据同步
- [ ] PWA离线支持（manifest.json + service worker）
- [ ] 习惯月度汇总表生成
- [ ] 标签统计可视化
- [ ] 日记搜索功能
- [ ] 焦虑时刻区块输入
- [ ] 图片懒加载优化（虚拟滚动）
- [ ] 月份数据IndexedDB缓存

---

## 十四、应用图标系统（Phase 7） 📋 待开发

### 功能概述

为应用添加完整的图标系统，包括应用图标、功能图标、导航图标等，提升视觉体验和品牌识别度。

### 图标分类

#### 1. 应用图标（App Icon）

**用途：**
- PWA安装后的桌面图标
- 浏览器标签页favicon
- iOS/Android主屏幕图标
- 应用启动图标

**要求：**
- 尺寸：192px, 512px（PWA标准）
- 格式：PNG（透明背景）
- 风格：简洁、现代、符合日记主题
- 设计元素：
  - 主色调：indigo-600 (#4F46E5)
  - 图标元素：日历、笔、叶子（参考现有emoji风格）
  - 圆角：适应iOS/Android风格

**设计参考：**
```
┌─────────────┐
│             │
│   📅 ✍️     │ ← 日历 + 笔记符号
│             │
│  Diary Post │ ← 应用名称
│             │
└─────────────┘

或更简洁：
┌─────────────┐
│             │
│    🌿       │ ← 叶子（代表日记）
│             │
│             │
└─────────────┘
```

---

#### 2. 功能图标（Feature Icons）

**用途：**
- 功能按钮图标
- 操作提示图标
- 状态指示图标

**现有使用emoji：**
- 📅 日历
- ✍️ 随手记
- ✨ 小确幸
- 💡 觉察
- 🧠 荔枝喵说
- 📸 影像记录
- 🏃 习惯追踪
- 💧 饮水
- 📖 阅读
- 🇬🇧 学语言
- 💊 补充剂
- 📊 统计

**优化方向：**
- 保留emoji风格（用户习惯）
- 或替换为自定义SVG图标（更专业）
- 考虑图标库：Lucide Icons, Heroicons, Phosphor Icons

---

#### 3. 导航图标（Navigation Icons）

**用途：**
- 底部导航栏图标
- 页面切换指示

**当前导航：**
- "今天" - 无图标（纯文字）
- "历史" - 无图标（纯文字）
- "统计" - 无图标（纯文字）
- "设置" - 无图标（纯文字）

**建议图标：**
```
今天：🏠 Home (home icon)
历史：📅 History (calendar icon)
统计：📊 Stats (chart icon)
设置：⚙️ Settings (settings icon)
```

---

#### 4. 操作图标（Action Icons）

**用途：**
- 按钮操作指示
- 状态反馈

**需要图标：**
- ➕ 添加/新建
- ✅ 完成/确认
- ❌ 删除/取消
- 🔄 刷新/同步
- 💾 保存
- 🔗 连接
- 🔍 搜索
- ↩️ 返回/关闭
- 📤 分享
- ⬇️ 下载

---

### 实现方案

#### 方案A：保留Emoji + 关键图标优化（推荐）✅

**设计思路：**
- 大部分功能继续使用emoji（用户习惯）
- 应用图标和导航图标使用专业SVG图标
- 降低开发成本，保持现有风格

**优点：**
- ✅ 用户已经熟悉emoji风格
- ✅ 无需大量图标设计
- ✅ emoji跨平台兼容性好
- ✅ 开发成本低

**缺点：**
- ❌ emoji在不同平台显示不一致
- ❌ 应用图标不够专业

**实现重点：**
- 应用图标：设计专业PNG图标
- 导航图标：使用Lucide Icons等图标库
- 功能图标：保留现有emoji

---

#### 方案B：全面替换为SVG图标系统

**设计思路：**
- 所有图标替换为统一SVG图标
- 建立图标组件库
- 统一风格和尺寸

**优点：**
- ✅ 视觉统一专业
- ✅ 可定制颜色和尺寸
- ✅ 跨平台显示一致
- ✅ 符合现代设计规范

**缺点：**
- ❌ 需要设计大量图标
- ❌ 开发成本高
- ❌ 用户需要适应新图标

**实现复杂度：**
- 高：需要设计30+图标，建立图标系统

---

#### 方案C：混合方案（Emoji + 关键SVG）

**设计思路：**
- 功能区块使用emoji（保持亲切感）
- UI操作使用SVG图标（提升专业性）
- 应用图标专业设计

**优点：**
- ✅ 平衡用户习惯和专业性
- ✅ 适度开发成本
- ✅ 关键UI更专业

**缺点：**
- ❌ 风格不够完全统一

---

### 推荐方案实现细节

#### 采用方案A：保留Emoji + 关键图标优化

**Phase 7.1：应用图标设计**（2天）

**设计要求：**
- 尺寸：192x192px, 512x512px
- 格式：PNG（透明背景）
- 风格：Material Design或iOS风格
- 主色调：indigo-600 (#4F46E5)

**设计工具：**
- Figma（免费）
- Canva（简单快速）
- 或AI生成图标

**设计元素建议：**
```
方案1：日历 + 笔记
- 日历形状（圆角矩形）
- 笔记线条
- indigo渐变背景

方案2：叶子符号
- 简洁叶子图形
- 代表日记/记录
- 绿色/indigo配色

方案3：字母D
- 大写字母"D"（Diary）
- 圆角背景
- indigo主色
```

**输出文件：**
```
public/icons/
├── icon-192.png    # PWA标准图标
├── icon-512.png    # 高清图标
├── icon-maskable.png # 适配图标（有边距）
├── favicon.ico      # 浏览器标签图标
└── apple-touch-icon.png # iOS图标
```

---

**Phase 7.2：导航图标添加**（1天）

**使用Lucide Icons图标库：**

**安装：**
```bash
npm install lucide-react
```

**图标映射：**
```typescript
import { Home, Calendar, BarChart2, Settings } from 'lucide-react';

const NAV_ICONS = {
  home: Home,
  history: Calendar,
  stats: BarChart2,
  settings: Settings
};
```

**导航按钮设计：**
```tsx
function BottomNav() {
  const navItems = [
    { label: '今天', view: 'home', icon: Home },
    { label: '历史', view: 'history', icon: Calendar },
    { label: '统计', view: 'stats', icon: BarChart2 },
    { label: '设置', view: 'settings', icon: Settings }
  ];

  return (
    <nav>
      {navItems.map(item => (
        <button key={item.view}>
          <item.icon size={20} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
```

---

**Phase 7.3：操作图标优化**（1天）

**关键操作图标替换：**

**刷新/同步图标：**
```tsx
import { RefreshCw } from 'lucide-react';

// 替换现有的emoji 🔄
<RefreshCw size={16} className="animate-spin" />
```

**连接图标：**
```tsx
import { Link2, Link2Off } from 'lucide-react';

// 连接状态指示
{vaultConnected ? <Link2 size={16} /> : <Link2Off size={16} />}
```

**添加/新建图标：**
```tsx
import { Plus, X } from 'lucide-react';

// 弹窗关闭按钮
<button onClick={onClose}>
  <X size={20} />
</button>
```

---

**Phase 7.4：PWA manifest配置**（1天）

**manifest.json配置：**
```json
{
  "name": "Diary Post - 日记记录应用",
  "short_name": "Diary",
  "description": "快速记录日记，追踪习惯，连接Obsidian",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#4F46E5",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["productivity", "utilities"],
  "screenshots": [
    {
      "src": "/screenshots/home.png",
      "sizes": "1280x720",
      "type": "image/png"
    }
  ]
}
```

**HTML配置：**
```html
<link rel="icon" type="image/png" href="/icons/icon-192.png" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
<meta name="theme-color" content="#4F46E5" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
```

---

### 图标设计清单

#### 必须实现（高优先级）

- [ ] 应用图标（192x192, 512x512）
- [ ] Favicon（浏览器标签图标）
- [ ] 导航图标（底部导航4个图标）
- [ ] 刷新/同步图标
- [ ] 连接/断开图标

#### 可选实现（中优先级）

- [ ] 关闭/取消图标（弹窗）
- [ ] 添加/新建图标
- [ ] 保存图标
- [ ] 分享图标
- [ ] 搜索图标

#### 延后实现（低优先级）

- [ ] 功能区块图标替换（保留emoji）
- [ ] 习惯追踪图标替换
- [ ] 日记区块图标替换

---

### 图标库选择

#### Lucide Icons（推荐）✅

**优点：**
- ✅ 300+高质量图标
- ✅ React组件形式
- ✅ 可定制尺寸和颜色
- ✅ 开源免费（MIT）
- ✅ 轻量级（无依赖）

**使用示例：**
```tsx
import { Home, Calendar, Settings } from 'lucide-react';

<Home size={24} color="#4F46E5" />
<Calendar size={20} strokeWidth={1.5} />
```

---

#### Heroicons

**优点：**
- ✅ Tailwind CSS官方图标
- ✅ SVG和React组件形式
- ✅ 多种风格（outline, solid）

**缺点：**
- ❌ 图标数量较少

---

#### Phosphor Icons

**优点：**
- ✅ 1000+图标
- ✅ 多种粗细风格
- ✅ 开源免费

**缺点：**
- ❌ 包体积较大

---

#### Emoji（当前使用）

**优点：**
- ✅ 无需额外依赖
- ✅ 用户熟悉亲切
- ✅ 跨平台兼容（大部分）

**缺点：**
- ❌ 显示效果不统一
- ❌ 部分设备不支持
- ❌ 不够专业

---

### 实现步骤

#### Step 1：设计应用图标（2天）

**任务：**
- 设计主图标（192x192, 512x512）
- 生成favicon.ico
- 生成apple-touch-icon.png
- 设计maskable版本（带边距）

**工具：**
- Figma在线设计
- 或使用Canva快速制作
- 或AI图标生成工具

**验收标准：**
- ✅ 符合PWA标准尺寸
- ✅ indigo主色调
- ✅ 简洁现代风格
- ✅ 透明PNG格式

---

#### Step 2：安装Lucide Icons（半天）

**操作：**
```bash
npm install lucide-react
```

**验证：**
- ✅ 包安装成功
- ✅ 可正常导入图标组件
- ✅ 图标渲染正常

---

#### Step 3：替换导航图标（半天）

**修改文件：**
- `src/App.tsx` - 底部导航栏

**实现：**
```tsx
import { Home, Calendar, BarChart2, Settings } from 'lucide-react';

{navItems.map(item => (
  <button>
    <item.icon size={20} className={currentView === item.view ? 'text-indigo-600' : 'text-gray-400'} />
    <span>{item.label}</span>
  </button>
))}
```

**验收：**
- ✅ 底部导航显示图标
- ✅ 当前页面图标高亮
- ✅ 图标和文字对齐美观

---

#### Step 4：替换关键操作图标（1天）

**修改文件：**
- `src/components/PullToRefresh.tsx` - 刷新图标
- `src/App.tsx` - 连接按钮
- `src/components/ReflectionModal.tsx` - 关闭按钮
- `src/components/HappinessModal.tsx` - 关闭按钮

**实现：**
```tsx
import { RefreshCw, Link2, X } from 'lucide-react';

// 下拉刷新
<RefreshCw size={24} className="animate-spin" />

// 连接状态
<Link2 size={16} /> // 已连接
<Link2Off size={16} /> // 未连接

// 关闭按钮
<X size={20} />
```

---

#### Step 5：配置manifest.json（1天）

**创建文件：**
- `public/manifest.json`
- `public/icons/`目录

**修改文件：**
- `index.html` - 添加图标链接

**验证：**
- ✅ PWA安装时显示自定义图标
- ✅ 浏览器标签显示favicon
- ✅ iOS添加到主屏幕显示图标

---

### 时间估算

**总开发周期：5天**

- Phase 7.1：应用图标设计 → 2天
- Phase 7.2：导航图标添加 → 1天
- Phase 7.3：操作图标优化 → 1天
- Phase 7.4：PWA manifest配置 → 1天

---

### 技术风险评估

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 图标设计质量不高 | 应用不够专业 | 使用专业设计工具或外包设计 |
| Lucide包体积过大 | 性能影响 | 实测包体积（约50KB，可接受） |
| PWA图标显示不正确 | 用户体验差 | 测试多平台（iOS/Android/Chrome） |
| emoji在某些设备不显示 | 功能图标缺失 | 关键图标用SVG，emoji仅辅助 |

---

### 最终用户体验

**安装PWA后：**
```
手机主屏幕：
┌─────────────┐
│             │
│   [自定义图标] │ ← 专业应用图标
│             │
│  Diary Post │ ← 应用名称
└─────────────┘
```

**应用内导航：**
```
底部导航栏：
┌─────────────────────────┐
│ [🏠] 今天               │ ← SVG图标 + 文字
│ [📅] 历史               │
│ [📊] 统计               │
│ [⚙️] 设置               │
└─────────────────────────┘
```

**功能区块：**
```
日记区块：
┌─────────────────────────┐
│ ✍️ 随手记              │ ← 保留emoji（亲切）
│ ✨ 每日小确幸           │
│ 💡 觉察与迭代           │
└─────────────────────────┘
```

---

### 实现优先级

**Phase 7.1（必须实现）：**
- ✅ 应用图标设计
- ✅ Favicon配置

**Phase 7.2（高优先级）：**
- ✅ 导航图标添加
- ✅ PWA manifest配置

**Phase 7.3（中优先级）：**
- ✅ 操作图标优化
- ✅ 连接/刷新图标

**Phase 7.4（低优先级）：**
- 📋 功能区块图标替换
- 📋 图标主题系统

---

### 后续优化方向

- 图标主题切换（跟随系统暗色模式）
- 图标动画效果（加载、成功状态）
- 图标尺寸自适应（响应式）
- 图标颜色定制（用户主题）
- 更多图标设计（后续功能）

---

## 十三、多设备同步方案（Phase 6） 📋 待开发

### 功能概述

支持手机和电脑多设备实时同步日记数据。Mac mini 作为中心服务器，手机通过 Tailscale 网络调用 API Server 实时写入 Vault。

### 问题分析

**当前限制：**
- File System Access API 仅在桌面浏览器完全支持
- 移动端浏览器不支持（iOS Safari、Android Chrome）
- 手机无法直接写入 Obsidian Vault

**用户环境：**
- Mac mini 24小时在线，作为服务器
- 手机有网络流量，可实时访问
- Vault 通过 Syncthing 在 Mac mini 和 MacBook 之间同步
- Tailscale 提供私有网络连接

---

### 方案设计

#### 核心思路：远程 API + 用户自托管

**架构图：**

```
                    Tailscale 网络 (私有，安全)
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
┌───▼───┐            ┌─────▼─────┐          ┌─────▼─────┐
│手机PWA│            │ Mac mini  │          │ MacBook   │
│(远程) │ ──HTTP───→ │ API Server│ ←─HTTP── │浏览器     │
│       │            │ → Vault   │          │(本地API)  │
└───────┘            └───────────┘          └───────────┘
                           │
                    Syncthing 同步
                           │
                      MacBook Vault
                      (本地编辑)
```

**设计原则：**
- 文件优先：Vault 作为唯一数据源（数据库）
- 用户自托管：用户部署自己的 API Server
- 无云端部署：数据完全本地，无隐私风险
- 预留公开接口：API 设计通用，支持未来多用户扩展

---

### API Server 设计

#### 技术栈

```
Express/Fastify + TypeScript
├── 复用现有 fileSync.ts 核心逻辑
├── REST API 接口包装
├── 简单 Token 认证（预留 JWT 扩展）
└── pm2 进程管理（崩溃自动重启）
```

#### 项目结构

```
server/
├── package.json
├── tsconfig.json
├── ecosystem.config.js      # pm2配置
├── config.json              # Vault路径、Token配置
├── src/
│   ├── index.ts             # Express入口
│   ├── routes/
│   │   ├── diary.ts         # 日记读写接口
│   │   ├── habit.ts         # 习惯统计接口
│   │   ├── history.ts       # 历史查询接口
│   ├── middleware/
│   │   ├── auth.ts          # Token认证（预留JWT）
│   ├── services/
│   │   ├── fileSync.ts      # 复用现有代码
│   │   ├── vault.ts         # Vault路径配置
│   ├── config/
│   │   ├── index.ts         # 配置聚合
```

---

### API 接口规范

#### 日记接口

| 接口 | 方法 | 功能 | 请求体 | 预留字段 |
|------|------|------|--------|---------|
| `/api/v1/diary/:date` | GET | 获取日记 | - | `X-User-ID` |
| `/api/v1/diary/quick-note` | POST | 追加随手记 | `{content, tags[]}` | `X-User-ID` |
| `/api/v1/diary/habit` | POST | 更新习惯 | `{water, steps, reading...}` | `X-User-ID` |
| `/api/v1/diary/happiness` | POST | 追加小确幸 | `{content}` | `X-User-ID` |
| `/api/v1/diary/reflection` | POST | 追加觉察 | `{content}` | `X-User-ID` |

#### 统计接口

| 接口 | 方法 | 功能 | 参数 |
|------|------|------|------|
| `/api/v1/stats/habit` | GET | 获取习惯统计 | `?days=30` |
| `/api/v1/history/:year/:month` | GET | 获取历史日记列表 | - |

#### 认证头

```
当前个人版：
Authorization: Token <simple-token>

未来公开版（预留）：
Authorization: Bearer <JWT>
X-User-ID: <user-id>
```

---

### 认证方案

#### 当前实现：简单 Token

```typescript
// middleware/auth.ts
export function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Token ', '')
  const validToken = process.env.API_TOKEN || config.token
  
  if (token !== validToken) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  // 预留：未来可扩展为 JWT 验证
  // const decoded = verifyJWT(token)
  // req.userId = decoded.userId
  
  next()
}
```

#### 配置方式

- 环境变量 `API_TOKEN=your-secret-token`
- 或配置文件 `config.json` 中的 `token` 字段
- 预留字段 `X-User-ID` 用于未来多用户扩展

---

### PWA 改造设计

#### 数据抽象层

```typescript
// src/services/dataService.ts

export interface DataService {
  getDiary(date: string): Promise<DiaryEntry>
  appendQuickNote(content: string, tags: string[]): Promise<void>
  updateHabit(data: HabitData): Promise<void>
  appendHappiness(content: string): Promise<void>
  appendReflection(content: string): Promise<void>
  getHabitStats(days: number): Promise<DailyHabitStats[]>
  getMonthDiaries(year: number, month: number): Promise<MonthData>
}
```

#### 实现类

**本地模式（File System API）：**
```typescript
export class LocalDataService implements DataService {
  private fileSync = getFileSyncService()
  // MacBook 浏览器直接读写本地 Vault
}
```

**远程模式（HTTP API）：**
```typescript
export class RemoteDataService implements DataService {
  private apiBase = 'http://100.x.x.x:3001/api/v1'
  private token = 'your-token'
  // 手机通过 Tailscale 调用 Mac mini API
}
```

#### 模式自动检测

```typescript
export function getDataService(): DataService {
  const isMobile = /Android|iPhone|iPad/.test(navigator.userAgent)
  const hasFileSystemAPI = 'showDirectoryPicker' in window
  
  if (isMobile) {
    return new RemoteDataService()
  }
  return new LocalDataService()
}
```

---

### 公开版预留设计

#### 产品定位

> **「Obsidian 日记伴侣」—— 为 Obsidian 用户提供快速记录的移动端工具**

**特点：**
- 用户需有自己的 Obsidian Vault
- 用户自托管 API Server（或提供托管选项）
- 数据完全由用户掌控，应用不存储

#### 扩展路径

| 维度 | 个人版 | 公开版迁移 |
|------|--------|-----------|
| 认证 | 简单Token | JWT/OAuth（认证中间件替换） |
| 数据存储 | 单一Vault | 每用户独立Vault（自托管模式） |
| API Server | Mac mini单实例 | 用户自托管或云端选项 |

---

### 实施计划

#### Phase 6.1：API Server 搭建（1-2小时）

**任务：**
- [ ] 创建 `server/` 目录结构
- [ ] 实现日记读写接口（复用 fileSync.ts）
- [ ] 实现简单 Token 认证
- [ ] pm2 配置和启动

**验收：**
- Mac mini 启动 API Server
- curl 测试 API 正常响应

---

#### Phase 6.2：PWA 改造（2-3小时）

**任务：**
- [ ] 创建 `dataService.ts` 抽象层
- [ ] 实现 `RemoteDataService`（HTTP客户端）
- [ ] 改造组件调用方式
- [ ] 配置 API 地址和 Token

**验收：**
- 手机浏览器访问 PWA
- 随手记、习惯打卡功能正常
- Mac mini Vault 文件同步更新

---

#### Phase 6.3：优化和部署（1小时）

**任务：**
- [ ] pm2 配置（崩溃自动重启）
- [ ] 日志管理
- [ ] 监控面板
- [ ] 更新 PLAN.md

**验收：**
- API Server 24小时稳定运行
- 日志可查询

---

#### Phase 6.4：手机端优化（可选）

**任务：**
- [ ] 网络错误提示
- [ ] 请求失败重试
- [ ] 加载状态优化

---

### 原生应用迁移路径

#### Android 原生应用

**迁移复杂度：低**

HTTP 客户端代码几乎完全复用：
- API 接口不变
- Kotlin/Java HTTP 客户端调用相同接口
- 数据模型一致

**技术栈选择：**
- React Native：JS 代码复用度最高
- Flutter：性能好但需重写
- 原生 Kotlin：性能最好，HTTP 简单

---

#### Mac 原生应用

**迁移复杂度：低**

两种选择：
- 继续使用 HTTP API（代码复用）
- 直接本地文件读写（File System API 不再需要）

---

### 技术风险评估

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| Mac mini 网络中断 | 手机无法访问 | 网络错误提示， IndexedDB 缓存 |
| API Server 崩溃 | 服务不可用 | pm2 自动重启 |
| Tailscale 连接问题 | 无法访问 | 配置备用局域网 IP |
| Token 泄露 | 未授权访问 | Tailscale 网络隔离 + 定期更换 Token |

---

### 需要配置的信息

**实施前需要用户提供：**

1. **Mac mini Vault 路径** - Vault 的绝对路径
2. **Tailscale 地址** - Mac mini 的 IP 或 MagicDNS
3. **API 端口** - 默认 3001 或其他（避免冲突）

---

### 最终用户体验

**手机使用流程：**
```
1. 手机浏览器打开 PWA（通过 Tailscale）
2. 自动检测为远程模式
3. 添加随手记 → HTTP POST → Mac mini API
4. API Server 写入 Vault
5. Syncthing 同步到 MacBook
6. MacBook Obsidian 显示最新内容
```

**MacBook 使用流程：**
```
1. MacBook 浏览器打开 PWA
2. 自动检测为本地模式
3. File System API 直接读写 Vault
4. Syncthing 同步到 Mac mini
5. Mac mini Vault 保持一致
```

---

### 时间估算

**总开发周期：4-6小时**

- Phase 6.1：API Server 搭建 → 1-2小时
- Phase 6.2：PWA 改造 → 2-3小时
- Phase 6.3：优化部署 → 1小时
- Phase 6.4：手机优化 → 可选

---