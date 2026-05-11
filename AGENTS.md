# AGENTS.md

Instructions for AI agents working in this repository.

## Commands

```bash
npm run dev      # Dev server at port 3000 (strict)
npm run build    # TypeScript check + Vite build
npm run preview  # Preview production build
```

No lint or test commands exist.

## Key Constraints

### Dev Server Port
Port 3000 is **strictly enforced** (`strictPort: true`). This ensures localStorage data consistency across sessions. Do not change or auto-switch ports.

### Diary Write Operations
**Critical**: Never overwrite diary files. Use the append pattern:
- `appendToSection()` in `src/services/fileSync.ts` reads → appends → writes
- Habits use `updateHabits()` which replaces the entire section

### Timezone
All timestamps use **Asia/Shanghai** timezone.

### UI Language
UI labels and diary content are in Chinese. Code comments are in Chinese.

### File System Access
Uses browser **File System Access API**, not Node.js fs. Vault paths are relative to user-selected directory root.

## Architecture Summary

- **State**: Zustand with persist middleware (`src/stores/diaryStore.ts`)
- **Offline**: IndexedDB via Dexie (`src/db/index.ts`)
- **Charts**: Recharts for habit trends
- **Sections**: Eight diary sections defined as enum in `src/types/index.ts`

See `CLAUDE.md` for detailed architecture notes.