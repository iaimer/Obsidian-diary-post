# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (Vite)
npm run build    # Build for production (TypeScript check + Vite build)
npm run preview  # Preview production build locally
```

## Architecture

### Obsidian Vault Integration
- Uses **File System Access API** to read/write diary files directly
- Path format: `workspace/生活/日记/YYYY/MM.EnglishMonth/YYYY-MM-DD.md`
- **Safe append mode**: reads file first, then appends to specific section without overwriting
- Section headers are defined in `src/services/fileSync.ts` and `src/utils/markdown.ts`

### Diary Sections
Eight sections defined in `src/types/index.ts` (DiarySection enum):
- HABITS, QUICK_NOTES, HAPPINESS, ANXIETY, REFLECTION, LIZHI_SAYS, TOMORROW, IMAGES

### State Management
- **Zustand** with persist middleware (`src/stores/diaryStore.ts`)
- Persisted: `wasConnected`, `habitData`
- Non-persisted: `vaultConnected`, `currentDiary`, `refreshKey`

### Offline Storage
- **IndexedDB** via Dexie (`src/db/index.ts`)
- Primary key: date string (YYYY-MM-DD)
- Used for caching diary entries when vault is disconnected

### Statistics
- **Recharts** for trend charts (dual Y-axis LineChart)
- Historical data fetched from Obsidian files via `src/services/habitStats.ts`
- Habit goals: water ≥1500mL, steps ≥6000

### AI Polish Service
- Located in `src/services/aiPolish.ts`
- Supports both **Claude API** and **OpenAI-compatible APIs**
- Config stored in localStorage as `diary-ai-config`
- Tag system: 3-layer (domain + capability + method), domain and capability are required

### Page Navigation
- Single app with bottom navigation
- Pages: home, stats, settings (type: `PageView` in App.tsx)
- Navigation bar is always visible, current page highlighted with `text-indigo-600 font-medium`

## Key Constraints

1. **Never overwrite diary content**: always use `appendToSection` pattern (read → parse → append → write)
2. **Tag format for quick notes**: `- **HH:MM** content #领域 #能力 #方法`
3. **Timezone**: Asia/Shanghai for timestamps
4. **Mobile-first layout**: max-width 448px (max-w-md), sticky header
5. **Habit update replaces entire section**: not append (see `updateHabits` in fileSync.ts)