# Phase 1 Implementation — Notes

## 1. Goal of Phase 1 (restated)

- **Authentication:** User can sign up and sign in; a profile row is created on first sign-up.
- **Daily entries:** Each day has a single record; `getOrCreateToday()` creates today’s entry if missing.
- **Home dashboard (skeleton):** Greeting/day hero, placeholder cards (planned outfit empty state, water widget, beauty/focus placeholders), quick action to Today.
- **Today page:** Date header (prev/next), journal (auto-save), mood (single-select), water widget, basic task list (add, complete, no timer).
- **Water tracking:** +250 ml per tap, persisted to today’s entry, simple fill animation; optional goal from profile.
- **Diary (minimal):** List of past days; tap a day to open the same Today layout for that date.
- **Settings (minimal):** Water goal, timezone.
- **App shell:** Bottom nav with Home, Today, Diary, Settings; Beauty and Wardrobe stubbed/disabled.
- **Russian UI:** All user-facing text (buttons, labels, headings, placeholders, empty states, messages) in Russian.

## 2. Files created or modified

**Created:**
- `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`
- `src/main.tsx`, `src/App.tsx`
- `src/lib/supabase.ts`
- `src/hooks/useGetOrCreateToday.ts`, `src/hooks/useAuth.ts`
- `src/components/Layout/AppShell.tsx`, `src/components/Layout/BottomNav.tsx`
- `src/pages/LoginPage.tsx`, `src/pages/Home.tsx`, `src/pages/Today.tsx`, `src/pages/Diary.tsx`, `src/pages/Settings.tsx`
- `src/components/WaterWidget.tsx`, `src/components/TaskList.tsx`
- `src/constants/ru.ts` (Russian copy)
- `supabase/migrations/001_phase1_schema.sql`
- `src/index.css`, `src/vite-env.d.ts`
- `.env.example`

**Modified:** None (new project).

## 3. Database tables involved

- **profiles** — Create on sign-up; read for `water_goal_ml`, `timezone` in Settings and water widget.
- **daily_entries** — Create via `getOrCreateToday()`; read/update `journal_text`, `mood`, `water_ml`.
- **daily_tasks** — CRUD for task list; linked to user. No `task_sessions` in Phase 1.

## 4. Russian UI

- All visible text is defined in `src/constants/ru.ts` and imported where needed.
- Buttons, labels, headings, placeholders, empty states, and messages use these constants.
- Internal code (variables, file names, component names) stays in English.
