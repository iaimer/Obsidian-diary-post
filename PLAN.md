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

- [ ] **多设备同步**（Phase 6）：支持手机和电脑数据同步
- [ ] PWA离线支持（manifest.json + service worker）
- [ ] 习惯月度汇总表生成
- [ ] 标签统计可视化
- [ ] 日记搜索功能
- [ ] 焦虑时刻区块输入
- [ ] 图片懒加载优化（虚拟滚动）
- [ ] 月份数据IndexedDB缓存

---

## 十三、多设备同步方案（Phase 6） 📋 待开发

### 功能概述

支持在手机和电脑之间同步日记数据，确保多设备访问时数据一致性。

### 问题分析

**当前限制：**
- File System Access API 仅在桌面浏览器完全支持
- 移动端浏览器支持有限（iOS Safari不支持）
- 每次打开App需要重新授权Vault访问
- 无法在手机上直接写入Obsidian文件

**核心挑战：**
1. **移动端写入困难**：File System API在移动端受限
2. **权限临时性**：页面刷新后需要重新授权
3. **数据一致性**：多设备同时修改的冲突处理
4. **离线场景**：无网络时的数据暂存和同步

---

### 解决方案

#### 方案A：Obsidian Sync + 双向缓存（推荐）

**设计思路：**
- 依赖Obsidian官方同步服务（Obsidian Sync或iCloud）
- 手机端只读取已同步的文件，不直接写入
- 使用IndexedDB作为本地缓存层
- 在电脑端定期同步缓存数据到Obsidian文件

**优点：**
- ✅ 无需开发同步服务器
- ✅ 利用Obsidian现有的可靠同步机制
- ✅ 减少技术复杂度
- ✅ 数据安全性高（由Obsidian保障）

**缺点：**
- ❌ 需要Obsidian Sync订阅（$8/月）
- ❌ 手机端不能实时写入
- ❌ 数据同步延迟（依赖Obsidian Sync频率）

**实现步骤：**
```
1. 电脑端：直接写入Obsidian文件（当前已实现）
2. 手机端：读取IndexedDB缓存 + 定期拉取Obsidian文件
3. 同步策略：
   - 电脑端写入后，自动更新IndexedDB
   - 手机端从Obsidian读取最新文件（通过Obsidian Sync）
   - 手机端修改暂存到IndexedDB，标记为"待同步"
   - 电脑端检测"待同步"数据，合并写入Obsidian文件
```

---

#### 方案B：第三方云存储同步

**设计思路：**
- 使用第三方云存储（如Google Drive、Dropbox）
- App直接读写云端文件
- 通过云服务商API实现跨平台访问

**优点：**
- ✅ 移动端完全支持
- ✅ 实时写入能力
- ✅ 跨平台统一体验

**缺点：**
- ❌ 需要开发云存储集成
- ❌ 不直接写入Obsidian Vault
- ❌ 需要额外的云服务账号
- ❌ 数据隐私风险

**实现复杂度：**
- 高：需要OAuth认证、文件API集成、冲突解决

---

#### 方案C：自建同步服务器

**设计思路：**
- 开发简单的同步服务器（Node.js + SQLite）
- App通过REST API同步数据
- 服务器作为Obsidian文件的中转层

**优点：**
- ✅ 完全自主控制
- ✅ 移动端实时写入
- ✅ 可定制同步策略

**缺点：**
- ❌ 需要服务器运维成本
- ❌ 开发工作量最大
- ❌ 需要处理数据安全和隐私
- ❌ 增加用户配置复杂度

**实现复杂度：**
- 最高：需要后端开发、数据库设计、API安全、部署运维

---

### 推荐方案实现细节

#### 采用方案A：Obsidian Sync + 双向缓存

**技术架构：**

```
┌──────────────┐              ┌──────────────┐
│  电脑端 App  │              │  手机端 App  │
│              │              │              │
│ ┌──────────┐ │              │ ┌──────────┐ │
│ │ Obsidian │ │              │ │IndexedDB │ │
│ │  文件    │ │              │ │  缓存    │ │
│ └──────────┘ │              │ └──────────┘ │
│      ↕       │              │      ↕       │
│ ┌──────────┐ │              │ ┌──────────┐ │
│ │IndexedDB │ │              │ │ 网络     │ │
│ │  缓存    │ │              │ │ 拉取     │ │
│ └──────────┘ │              │ └──────────┘ │
└──────────────┘              └──────────────┘
       ↕                              ↕
       └──────────────────────────────┘
                  Obsidian Sync
                  (官方同步服务)
```

**数据流程：**

**电脑端写入流程：**
```
1. 用户在电脑端添加随手记
2. 直接写入Obsidian文件
3. 同时更新IndexedDB缓存
4. Obsidian Sync自动推送到云端
```

**手机端读取流程：**
```
1. 手机App打开
2. 尝试连接Obsidian Vault（移动端可能失败）
3. 读取IndexedDB缓存数据
4. 如果网络可用，从云端拉取最新文件（通过Obsidian Sync）
5. 更新IndexedDB缓存
```

**手机端写入流程（暂存模式）：**
```
1. 用户在手机端添加随手记
2. 写入IndexedDB缓存，标记为"待同步"
3. 显示"已暂存，等待同步到Obsidian"
4. 用户在电脑端打开App
5. 电脑端检测"待同步"数据
6. 合并写入Obsidian文件
7. 清除"待同步"标记
```

---

### 实现功能清单

#### Phase 6.1：缓存层增强（1周）

**IndexedDB扩展：**
- [ ] 添加"待同步"标记字段
- [ ] 实现增量同步队列
- [ ] 添加同步状态管理
- [ ] 实现冲突检测机制

**同步状态类型：**
```typescript
interface SyncStatus {
  localModified: boolean;    // 本地已修改
  syncedAt: Date;            // 最后同步时间
  pendingChanges: number;   // 待同步数量
  conflicts: ConflictItem[]; // 冲突条目
}

interface ConflictItem {
  date: string;
  section: DiarySection;
  localContent: string;
  remoteContent: string;
  resolvedAt?: Date;
}
```

---

#### Phase 6.2：同步检测和合并（1周）

**电脑端功能：**
- [ ] 检测IndexedDB中的"待同步"数据
- [ ] 实现数据合并逻辑（追加而非覆盖）
- [ ] 冲突解决UI（显示冲突条目，用户选择）
- [ ] 自动同步触发（定时或手动）

**合并策略：**
```
原则：追加优先，避免覆盖

场景1：手机端添加随手记 → 电脑端合并追加
  - 手机：添加"10:30 播客感悟 #学习"
  - 电脑：检测到新增 → 追加到对应区块

场景2：手机和电脑同时修改同一区块
  - 冲突检测：时间戳对比
  - UI提示："手机端新增3条，电脑端新增2条，全部保留？"
  - 用户确认后合并

场景3：习惯数据冲突
  - 优先保留最新值（时间戳）
  - 或提供选择界面
```

---

#### Phase 6.3：移动端优化（1周）

**手机端功能：**
- [ ] 离线模式增强（完全依赖IndexedDB）
- [ ] 网络状态检测（Online/Offline）
- [ ] 尝试拉取最新文件（通过Obsidian Sync）
- [ ] 暂存写入提示（"已暂存，等待同步"）
- [ ] 同步状态显示（待同步数量）

**UI优化：**
```
┌─────────────────────────────┐
│ 📅 今天 · 3条待同步          │ ← 显示同步状态
├─────────────────────────────┤
│ [添加随手记]                │
│                             │
│ ✅ 已暂存到本地             │ ← 暂存提示
│ ⏳ 等待同步到Obsidian       │
│                             │
│ [手动同步] [查看待同步]     │ ← 操作按钮
└─────────────────────────────┘
```

---

#### Phase 6.4：PWA离线支持（1周）

**PWA配置：**
- [ ] 创建 manifest.json
- [ ] 实现Service Worker
- [ ] 离线资源缓存
- [ ] 后台同步API（Background Sync）
- [ ] 推送通知（可选）

**manifest.json示例：**
```json
{
  "name": "Diary Post",
  "short_name": "日记",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

### 数据同步API设计

#### 同步服务接口

```typescript
// src/services/syncService.ts

export interface SyncService {
  // 检查同步状态
  checkSyncStatus(): Promise<SyncStatus>;
  
  // 拉取远程数据（从Obsidian Sync）
  pullRemoteData(): Promise<void>;
  
  // 推送本地数据（到Obsidian文件）
  pushLocalData(): Promise<void>;
  
  // 合并冲突数据
  mergeConflicts(conflicts: ConflictItem[]): Promise<void>;
  
  // 自动同步（定时）
  autoSync(): Promise<void>;
  
  // 手动同步触发
  manualSync(): Promise<void>;
}
```

#### IndexedDB扩展

```typescript
// src/db/syncDB.ts

export interface SyncEntry extends DiaryEntry {
  syncStatus: SyncStatus;
  pendingChanges: PendingChange[];
}

export interface PendingChange {
  id: string;
  section: DiarySection;
  content: string;
  timestamp: Date;
  synced: boolean;
}

// 新增数据库表
class SyncDatabase extends Dexie {
  entries!: Table<SyncEntry, string>;
  pendingChanges!: Table<PendingChange, string>;
  syncLog!: Table<SyncLogItem, number>;
}
```

---

### 用户使用流程

#### 电脑端使用（完整功能）

```
1. 打开App，授权Obsidian Vault
2. 直接添加随手记、习惯打卡等
3. 数据实时写入Obsidian文件
4. Obsidian Sync自动推送到云端
5. IndexedDB缓存同步更新
```

#### 手机端使用（缓存模式）

```
1. 打开App（PWA离线可用）
2. 读取IndexedDB缓存数据
3. 尝试网络连接：
   - ✅ 有网络：从Obsidian Sync拉取最新文件
   - ❌ 无网络：使用缓存数据
4. 添加新内容：
   - 写入IndexedDB，标记"待同步"
   - 显示"已暂存"
5. 回到电脑端：
   - App检测"待同步"数据
   - 自动或手动合并到Obsidian文件
```

---

### 技术风险评估

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| Obsidian Sync不可用 | 手机端无法拉取最新数据 | 完全依赖IndexedDB缓存 |
| 数据冲突频繁 | 用户需要频繁手动合并 | 智能合并策略，减少冲突 |
| IndexedDB存储限制 | 大量历史数据占用空间 | 实现数据清理策略（只保留近90天） |
| Service Worker缓存失效 | 离线功能不稳定 | 多层缓存策略 + 失败重试 |
| 手机端权限问题 | 无法访问Obsidian Vault | 完全切换到缓存模式 |

---

### 实现优先级

**Phase 6.1（必须实现）：**
- ✅ IndexedDB缓存增强（当前已实现基础版）
- ✅ "待同步"标记机制
- ✅ 基础同步状态显示

**Phase 6.2（高优先级）：**
- ✅ 数据合并逻辑
- ✅ 冲突检测和解决UI
- ✅ 电脑端自动同步

**Phase 6.3（中优先级）：**
- ✅ 手机端暂存模式优化
- ✅ 网络状态检测
- ✅ 暂存提示UI

**Phase 6.4（低优先级）：**
- ✅ PWA离线支持
- ✅ Service Worker
- ✅ 后台同步API

---

### 时间估算

**总开发周期：4-5周**

- Phase 6.1：缓存层增强 → 1周
- Phase 6.2：同步检测合并 → 1周
- Phase 6.3：移动端优化 → 1周
- Phase 6.4：PWA离线支持 → 1周
- 测试和优化 → 1周

---

### 最终用户体验

**理想使用场景：**

**早晨（手机端）：**
- 手机打开App，查看今天日记
- 添加晨间随手记（暂存到IndexedDB）
- 标记习惯打卡（暂存）

**上午（电脑端）：**
- 电脑打开App，检测到3条待同步
- 自动合并到Obsidian文件
- Obsidian Sync推送到云端

**下午（手机端）：**
- 手机App拉取最新数据（从Obsidian Sync）
- 看到上午添加的内容已同步
- 继续添加新的随手记

**晚上（电脑端）：**
- 电脑端最终汇总和查看
- 所有数据完整同步

---

### 功能增强建议

- 图片点击后支持缩放、拖动
- 日历支持年视图切换
- 日记详情支持Markdown渲染（代码块、链接等）
- 支持分享日记到社交媒体
- 支持导出日记为PDF