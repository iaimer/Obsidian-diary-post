# AGENTS.md

Instructions for AI agents working in this repository.

## Commands

```bash
npm run dev      # Dev server at port 4000 (strict)
npm run build    # TypeScript check + Vite build
npm run preview  # Preview production build
```

No lint or test commands exist.

## Key Constraints

### Dev Server Port
Port 4000 is **strictly enforced** (`strictPort: true`). This ensures localStorage data consistency across sessions. Do not change or auto-switch ports.

### Diary Write Operations
**Critical**: Never overwrite diary files. Use the append pattern:
- `appendToSection()` in `src/services/fileSync.ts` reads → appends → writes
- Habits use `updateHabits()` which replaces the entire section
- 人生教练 uses `replaceLizhiSays()` which replaces the entire section
- 明日寄语 uses `appendTomorrow()` for AI-extracted action suggestions
- 焦虑引导 uses `RecordWizard` which collects 4 answers → calls `appendAnxiety()` → `appendToSection(DiarySection.ANXIETY, ...)`
- `## 📈 每日复盘` is NOT a registered section but IS a boundary marker in `appendToSection` (added to `allHeaders`)

### Timezone
All timestamps use **Asia/Shanghai** timezone.

### UI Language
UI labels and diary content are in Chinese. Code comments are in Chinese.

### File System Access
Uses browser **File System Access API**, not Node.js fs. Vault paths are relative to user-selected directory root.

## Architecture

### Obsidian Vault Integration
- Uses **File System Access API** to read/write diary files directly
- Path format: `01.日记/YYYY/MM.EnglishMonth/YYYY-MM-DD.md`
- **Safe append mode**: reads file first, then appends to specific section without overwriting
- Section headers are defined in `src/services/fileSync.ts` and `src/utils/markdown.ts`

### Diary Sections
Eight sections defined in `src/types/index.ts` (DiarySection enum):
- HABITS, QUICK_NOTES, HAPPINESS, ANXIETY, REFLECTION, LIZHI_SAYS, TOMORROW, IMAGES

### State Management
- **Zustand** with persist middleware (`src/stores/diaryStore.ts`)
- Persisted: `wasConnected`, `habitData`, `habitConfigs`
- Non-persisted: `vaultConnected`, `currentDiary`, `refreshKey`

### Habit Configuration
- **Dynamic habit configs** (`src/types/index.ts`)
  - `HabitConfig` interface: id, name, emoji, type, goal, unit, description, enabled, order, color
  - Default 5 habits: water, steps, reading, language, supplements
  - Users can add/edit/delete habits in Settings page
- **HabitTracker** (`src/components/HabitTracker.tsx`)
  - Renders habits dynamically from `habitConfigs`
  - Number type: progress bar with custom color
  - Boolean type: checkbox with custom color
- **HabitConfigEditModal** (`src/components/HabitConfigEditModal.tsx`)
  - Add/edit habit configuration
  - 10 color options: blue, sky, green, emerald, orange, amber, purple, violet, pink, rose
  - Grouped emoji picker (常用, 生活, 食物, 学习, 活动, 表情)

### Offline Storage
- **IndexedDB** via Dexie (`src/db/index.ts`)
- Primary key: date string (YYYY-MM-DD)
- Used for caching diary entries when vault is disconnected

### Statistics
- **Recharts** for trend charts (dual Y-axis LineChart)
- Historical data fetched from Obsidian files via `src/services/habitStats.ts`
- Habit goals: water ≥1500mL, steps ≥6000

### AI Services
- Located in `src/services/aiPolish.ts`
- Supports both **Claude API** and **OpenAI-compatible APIs**
- Config stored in localStorage as `diary-ai-config`
- **润色**：`polishContent()` — 3-layer tag system (domain + capability + method)
- **人生教练**：`generateLizhiSays()` — collects all diary sections as context, generates 250-300字 coaching feedback (📌 模式识别 / ⚠️ 矛盾指出 / 💬 暖心鼓励)
  - 🎯 行动建议 extracted and appended to 明日寄语 section
  - Coach prompt configurable in Settings via 「教练提示词」tab
  - Section header `### 🧠 人生教练` (backward compat with legacy `### 🧠 荔枝喵说`)

### Page Navigation
- Single app with bottom navigation
- Pages: home, stats, settings (type: `PageView` in App.tsx)
- Navigation bar is always visible, current page highlighted with `text-indigo-600 font-medium`