# Phase 1 Fixes — Plan

## 1. Bugs and proposed fix approach

### 1.1 Task architecture
- **Bug:** Tasks are global (daily_tasks has only user_id). They appear on every day. Completion is local state only and resets on navigation.
- **Fix:** Tie tasks to a specific day. Add `daily_entry_id` (FK to daily_entries, NOT NULL) and `completed` (boolean, default false) to daily_tasks. Remove global task list: load tasks only for the current daily entry. Add task with `daily_entry_id = entry.id`. Persist completion in DB. Each day has its own tasks; no cross-day visibility.

### 1.2 Task CRUD stability
- **Fix:** Add task → insert with current entry id. Mark complete → update daily_tasks.completed. Delete → delete by id. Load tasks when entry is set (effect dependency on entry?.id). TaskList uses task.completed from DB; toggle handler calls API and parent refetches tasks.

### 1.3 Auth messaging
- **Bug:** "Ошибка регистрации" shown even when signup succeeded (e.g. email confirmation pending).
- **Fix:** On signUp: if `!error && data?.user` → show success message (e.g. "Регистрация прошла успешно. Подтвердите email по ссылке из письма."). If `data?.user?.identities?.length === 0` → "Этот email уже зарегистрирован." If `error` → map to Russian: "User already registered" / "already been registered" → errorUserExists; 429 / rate limit → errorRateLimit; invalid credentials → errorInvalidLogin. On signIn: map error.message to Russian.

### 1.4 Home greeting with display_name
- **Fix:** If profile?.display_name is set, show "Доброе утро, {display_name}" (and same for afternoon/evening). Otherwise keep current greeting without name.

### 1.5 Today page date in Russian
- **Fix:** Show readable Russian date: for today "Сегодня, 15 марта"; for other days "Пятница, 15 марта" (weekday + date). Use toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }) and prefix with "Сегодня, " when the date is today.

### 1.6 Russian UI
- All new or changed user-facing strings go into ru.ts. No English visible text.

---

## 2. Files and database changes

| Item | Action |
|------|--------|
| `supabase/migrations/002_daily_tasks_per_day.sql` | **Create** — Drop daily_tasks, create with daily_entry_id + completed; RLS by entry ownership. |
| `src/lib/supabase.ts` | **Modify** — DailyTask type: add daily_entry_id, completed; remove default_duration_minutes (or keep for Phase 5). |
| `src/pages/Today.tsx` | **Modify** — Load tasks by entry?.id; add task with daily_entry_id; handleToggleTask (update completed, refetch); formatDateLabel → "Сегодня, 15 марта" style. |
| `src/components/TaskList.tsx` | **Modify** — Use task.completed from DB; require onToggleTask and call it (persist in parent); remove completedIds state. |
| `src/pages/LoginPage.tsx` | **Modify** — SignUp success message; map auth errors to Russian. |
| `src/pages/Home.tsx` | **Modify** — Greeting includes display_name when present. |
| `src/constants/ru.ts` | **Modify** — Add auth and date strings (signupSuccessConfirmEmail, errorUserExists, errorRateLimit, errorInvalidLogin, dateFormatTodayWithName). |

---

## 3. Migration needed?

**Yes.** A new migration `002_daily_tasks_per_day.sql` is required:
- Drop existing `daily_tasks` table (or alter; dropping is simpler and Phase 1 may have no production data).
- Create `daily_tasks` with columns: id, user_id (for RLS), daily_entry_id (NOT NULL, FK to daily_entries), title, completed (boolean default false), sort_order, created_at, updated_at.
- RLS policies: allow SELECT/INSERT/UPDATE/DELETE where daily_entry_id IN (SELECT id FROM daily_entries WHERE user_id = auth.uid()).
