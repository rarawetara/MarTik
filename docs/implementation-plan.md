# MärTik — Implementation Plan

**Version:** 1.0  
**Document type:** Implementation roadmap  
**Related:** [Product Specification](./product-spec.md), [Product Features](./product-features.md), [SDD](./sdd.md), [UI Architecture](./ui-architecture.md)

This document splits MärTik development into phases. Each phase lists goals, components to implement, and database tables used. Phases build on each other; complete Phase 1 before moving to Phase 2.

---

## Phase 1: Foundation — Auth, Daily Entries, Home, Today, Water, Basic Tasks

### Goals

- User can sign up / sign in and have a profile.
- Each day has a single daily entry (create-on-demand via `getOrCreateToday()`).
- Home dashboard exists as a skeleton with greeting and placeholder structure.
- Today page is the main daily record: journal, mood, water, and basic tasks.
- Water tracking works: +250 ml per tap, persisted to today’s entry, simple fill animation.
- Basic task list: create, complete, and optionally reorder tasks (no timer yet).
- App shell and bottom navigation (Home, Today, Diary, Settings; Beauty and Wardrobe can be placeholders or disabled).

### Components to Implement

| Component | Description |
|-----------|-------------|
| **App shell** | Layout wrapper: optional header, main content area, bottom tab bar (Home, Today, Diary, Settings; Beauty/Wardrobe stubbed). |
| **Auth gate** | Login/sign-up screen; redirect to Home when authenticated. Supabase Auth (email/password or magic link). |
| **Profile creation** | On first sign-up, create or upsert `profiles` row (trigger or client). |
| **Home (skeleton)** | Greeting / day hero (date, optional “Good morning”), placeholder cards for: planned outfit (empty state), water widget, beauty (link/placeholder), focus (link/placeholder), quick action to Today. Single-column scroll. |
| **Today page** | Date header with prev/next or date picker; sections: journal (textarea, auto-save), mood (single-select), water (same widget as Home), task list (add, complete, reorder). Call `getOrCreateToday()` on load. |
| **Water widget** | Reusable component: glass/bottle visual, tap to add +250 ml, display total and optional goal; fill animation; used on Home and Today. |
| **Task list (basic)** | List of tasks for “today” or global; add task (modal/sheet), mark complete, delete. No timer yet. |
| **getOrCreateToday()** | Client helper or Supabase RPC: ensure today’s `daily_entries` row exists for current user, return it. Used by Home, Today, water widget. |
| **Diary (minimal)** | List or simple calendar of past days; tap day → same Today layout for that date (read/edit). |
| **Settings (minimal)** | Screen with placeholders or basic options: water goal, timezone. Sound can be Phase 5. |

### Database Tables Used

| Table | Usage in Phase 1 |
|-------|------------------|
| **profiles** | Create on sign-up; read for water_goal_ml, timezone in Settings and water widget. |
| **daily_entries** | Create via getOrCreateToday(); read/update journal_text, mood, water_ml. |
| **daily_tasks** | CRUD for task list; link to user. No task_sessions yet. |

**Migrations:** Create `profiles`, `daily_entries`, `daily_tasks` with columns needed for Phase 1 (see [SDD](./sdd.md)). Add RLS policies. Optional: Postgres function `get_or_create_today(p_user_id uuid)`.

---

## Phase 2: Beauty (split into 2A–2D)

Phase 2 Beauty includes **products** (cards), **routines** (ordered steps from products), **daily routine logging** (mark steps done per day; historical data preserved when routines change), **progress photos** (upload, gallery, Phase 2D), **progress photo enhancements** (optional routine link and soft ratings, Phase 2E), and **routine scheduling** (Phase 2F: daily/weekly/monthly; Today shows only due routines). Implement in order: 2A → 2B → 2C → 2D → 2E → 2F.

---

### Phase 2A: Beauty Products

**Goals:** User can create beauty product cards with photo, name, category, area (face/hair/body), time_of_day (morning/evening/anytime), optional notes. Products are visual and collectible; product library is the foundation for routines.

**Components:** Beauty section/tab; Product library (grid of cards, filter by category/area/time_of_day); Add/Edit product (modal: photo upload, name, category, area, time_of_day, notes); Beauty product card (photo, name, category; tap to edit/delete). Storage: bucket `beauty-products`; RLS.

**Database tables:** `beauty_products` (id, user_id, name, category, area, time_of_day, notes, image_url, sort_order, created_at, updated_at). Migrations: create table + RLS; Storage bucket + RLS.

---

### Phase 2B: Beauty Routines

**Goals:** User can create routines (e.g. morning, evening, hair). Each routine is an ordered list of steps; each step references one beauty product. Routines displayed as elegant visual cards/checklists. Edit: add/remove/reorder steps; when a step is removed, soft-delete (set `deleted_at`) so historical daily logs remain valid.

**Components:** Routine builder screen; list of routines (cards with name + steps); Create/Edit routine (name, add steps by picking products, reorder drag-and-drop, remove step); routine card (name, ordered product thumbnails or names).

**Database tables:** `beauty_routines` (id, user_id, name, type, sort_order, created_at, updated_at); `beauty_routine_steps` (id, routine_id, product_id, sort_order, deleted_at, created_at, updated_at). RLS: routines by user_id; steps by routine ownership.

---

### Phase 2C: Daily Routine Logging

**Goals:** On the Today page (and in Beauty), user marks routine steps as completed for that specific day. Completion stored per day per step (`beauty_logs`). Historical daily logs are never overwritten when the user later edits routines. Full CRUD stability: add/complete/persist/refetch; state preserved after refresh and navigation.

**Components:** Routine execution view (for selected day: show routines and steps; tap step to mark done; optional "Mark routine done"); Today page Beauty block (show today's routines + steps, mark done); load completion from `beauty_logs` (daily_entry_id + routine_step_id); persist on toggle. Home beauty widget: compact status (e.g. morning/evening done), link to Beauty.

**Database tables:** `beauty_logs` (id, daily_entry_id, routine_step_id, completed_at). Unique (daily_entry_id, routine_step_id). RLS via daily_entries ownership. When displaying a past day, join logs to steps (and products); include soft-deleted steps for historical accuracy.

---

### Phase 2D: Beauty Progress Photos

**Goals:** User can save face or hair progress photos by day and view them in a simple timeline or gallery. Each photo belongs to a user, a day (daily entry), and an area (face/hair); optional notes. No before/after comparison UI and no AI analysis in Phase 2D.

**Split into reviewable steps:**

- **Phase 2D.1 — Schema + storage:** Create `beauty_progress_photos` table (id, user_id, daily_entry_id, area, photo_url, notes, taken_at, created_at, updated_at). Create Storage bucket `beauty-progress` with path `{user_id}/{area}/filename.{ext}` and RLS for database and storage.
- **Phase 2D.2 — Upload UI:** In Beauty section, add “Progress photos” area with “Upload face photo” and “Upload hair photo” (or single add flow with area select). Upload to Storage, create daily entry for selected day if needed, insert row into `beauty_progress_photos`. Optional notes field. Russian UI only.
- **Phase 2D.3 — Gallery / timeline view:** Display saved progress photos in a simple gallery or timeline (e.g. by date, filter by face/hair). Tap to view full-screen; optional delete or edit notes. Visual, calm, personal; Russian UI.

**Database tables:** `beauty_progress_photos` (id, user_id, daily_entry_id, area, photo_url, notes, taken_at, created_at, updated_at). Storage: bucket `beauty-progress`, path `{user_id}/{area}/filename.webp` (or .jpg/.png); RLS so users access only their own folder.

**Postponed (not in Phase 2D):** Before/after comparison mode (side-by-side, slider); AI analysis; any scoring or “improvement” labels.

---

### Phase 2E: Progress Photo Enhancements

**Goals:** Enhance beauty progress photos so each can optionally be **linked to a beauty routine** and include **soft qualitative ratings** and notes. No harsh numeric scoring; use a 4-level soft scale (e.g. low / medium / good / great) suitable for emoji-style or soft-label UI. All new fields optional; existing progress photos continue to work. No routine scheduling; no AI analysis.

**Split into reviewable steps:**

- **Phase 2E.1 — Schema update:** Extend `beauty_progress_photos` with nullable columns: `routine_id` (FK → beauty_routines ON DELETE SET NULL), `face_condition_rating`, `hair_quality_rating`, `hair_length_feeling_rating` (nullable text, CHECK in 'low','medium','good','great'). Migration only adds columns; no data migration required.
- **Phase 2E.2 — Upload / edit UI update:** In progress photo upload and edit flows, add optional: (1) related routine picker (dropdown of user's routines), (2) notes (existing), (3) soft rating controls for face condition, hair quality, hair length feeling (4-level scale; warm labels in Russian). Save/update with new fields; existing photos remain valid.
- **Phase 2E.3 — Detail display update:** In gallery and photo detail view, show optional linked routine name and soft ratings when present. Keep UI calm and diary-like.

**Database:** Same table `beauty_progress_photos`; new nullable columns only. RLS unchanged. No changes to daily routine execution (beauty_logs, Today page) or to routine scheduling.

**Postponed (not in Phase 2E):** Routine scheduling; AI analysis; before/after comparison; harsh numeric scoring.

---

### Phase 2F: Routine Scheduling

**Goals:** Add optional scheduling to beauty routines so a routine can repeat daily, weekly (on chosen weekdays), or monthly (on chosen days of the month). The Today page (and Beauty when a day is selected) shows **only routines that are due** for that day. Historical beauty logs are unchanged; scheduling only filters which routines are displayed.

**Split into reviewable steps:**

- **Phase 2F.1 — Schema update:** Extend `beauty_routines` with nullable/optional columns: `cadence_type` (text: 'daily' | 'weekly' | 'monthly' | 'none', default 'none'), `weekly_days` (nullable smallint[] or int[], 0–6 for weekdays), `monthly_days` (nullable smallint[] or int[], 1–31), `is_active` (boolean, default true). Migration only; no data migration. Existing routines behave as unscheduled (always due) until the user sets a schedule.
- **Phase 2F.2 — Routine editor scheduling UI:** In Beauty routine builder (create/edit routine), add: cadence selector (daily / weekly / monthly / none); for weekly: weekday picker (one or more); for monthly: day-of-month picker (one or more, or single day for MVP); optional is_active toggle. Russian UI only. Save/update routine with new fields.
- **Phase 2F.3 — Due routine filtering on Today:** When loading the Today page (or Beauty execution view for a selected day), compute which routines are due for that date: cadence_type 'none' or null → always due; 'daily' → due every day; 'weekly' → due if weekday in weekly_days; 'monthly' → due if day-of-month in monthly_days. Filter by is_active = true. **MVP recommendation:** Routines with no schedule (cadence_type = 'none' or unset) are shown every day in the same list—no separate “Other routines” section. Optionally, unscheduled routines can be shown in a separate section. Section title e.g. “Сегодняшний уход” (Today’s care).

**Database:** Same table `beauty_routines`; new columns only. RLS unchanged. No changes to `beauty_logs`, `beauty_routine_steps`, or daily completion logic.

**Postponed (not in Phase 2F):** Reminders or push notifications; AI analysis; any backfilling or rewriting of past days.

---

### Phase 2 Summary Table

| Step | Focus | Main tables | Deliverable |
|------|--------|-------------|-------------|
| **2A** | Beauty products | beauty_products; Storage | Product library with cards (photo, name, category, area, time_of_day, notes). |
| **2B** | Beauty routines | beauty_routines, beauty_routine_steps | Routine builder; routines as ordered steps from products; soft-delete steps for history. |
| **2C** | Daily logging | beauty_logs | Mark steps done per day on Today/Beauty; historical logs preserved; Home widget. |
| **2D** | Progress photos | beauty_progress_photos; Storage | Upload face/hair photos per day; simple gallery/timeline; schema + storage + upload UI + view. No comparison or AI. |
| **2E** | Progress photo enhancements | beauty_progress_photos (extended) | Optional routine link and soft ratings (face/hair); schema update + upload/edit UI + detail display. No scheduling or AI. |
| **2F** | Routine scheduling | beauty_routines (extended) | Optional cadence (daily/weekly/monthly), weekly_days, monthly_days, is_active; routine editor scheduling UI; Today shows only due routines. No reminders or AI. |

**Phase 2 Beauty — brief summary**

1. **Proposed Beauty data model:** `beauty_products` (photo, name, category, area, time_of_day, notes); `beauty_routines` (name, type; **Phase 2F:** optional cadence_type, weekly_days, monthly_days, is_active for scheduling); `beauty_routine_steps` (routine_id, product_id, sort_order, deleted_at for soft-delete); `beauty_logs` (daily_entry_id, routine_step_id, completed_at); `beauty_progress_photos` (user_id, daily_entry_id, area, photo_url, notes, taken_at; **Phase 2E:** optional routine_id, face_condition_rating, hair_quality_rating, hair_length_feeling_rating). Products are standalone cards; routines are ordered lists of steps; each step points to one product. Completion is stored per step per day. Progress photos are stored per day and area, with optional notes and (2E) optional routine link and soft ratings. Scheduling (2F) only determines which routines are due on a given day; it does not change historical logs.

2. **How routines relate to products:** A routine has many steps; each step has one `product_id` (FK to beauty_products). The user builds a routine by adding products in order (e.g. cleanser → serum → moisturizer). The same product can appear in multiple routines. Removing a step sets `deleted_at` on the step row; the product is unchanged.

3. **How daily completion is stored:** When the user marks a step “done” for a day, we insert (or upsert) a row in `beauty_logs` with `daily_entry_id` = that day’s entry and `routine_step_id` = the step’s id. So completion is “step X completed on day Y.” Historical logs reference step IDs; if a step is later soft-deleted, we still join to it when showing past days so “what I completed on March 15” stays accurate.

4. **Phase 2D progress photos:** Schema ties each photo to `daily_entry_id` (day), `user_id`, and `area` (face/hair); optional notes. Storage: bucket `beauty-progress`, path `{user_id}/{area}/filename.{ext}`. Phase 2D = schema + storage + upload UI + gallery/timeline only; before/after comparison and AI analysis are postponed.

5. **Phase 2E progress photo enhancements:** Extend `beauty_progress_photos` with optional `routine_id` (FK to beauty_routines), optional soft ratings: `face_condition_rating`, `hair_quality_rating`, `hair_length_feeling_rating` (4-level: low/medium/good/great). Upload/edit UI: optional routine picker, notes, soft rating controls; detail view shows routine and ratings. No routine scheduling; no AI. Existing photos unchanged (all new columns nullable).

6. **Phase 2F routine scheduling:** Extend `beauty_routines` with optional `cadence_type` ('daily' | 'weekly' | 'monthly' | 'none'), `weekly_days` (array of weekdays 0–6), `monthly_days` (array of days 1–31), `is_active` (boolean). Routine builder: cadence selector, weekday picker for weekly, day-of-month picker for monthly; Russian UI. Today (and Beauty for selected day): show only routines due for that date. Unscheduled routines (cadence none/unset) = always due (MVP: same list). Historical beauty_logs unchanged; scheduling only filters display.

---

## Phase 3: Wardrobe — Items, Outfit Builder, Saving Outfits

### Goals

- User can add wardrobe items (photo, name, category) and see them as cards in a grid.
- Outfit builder: user selects/drags wardrobe items into an “outfit” and names it; outfit is saved (outfits + outfit_items).
- User can view, edit, and delete saved outfits.
- No date assignment yet; just the wardrobe library and outfit composition.
- Storage: bucket for wardrobe images; RLS.

### Components to Implement

| Component | Description |
|-----------|-------------|
| **Wardrobe screen** | Tab in nav. Grid of wardrobe item cards; filter by category; “+ Add item”; “New outfit”, “Plan outfits” (Plan can go to Phase 4). |
| **Wardrobe item card** | Image, name, category; tap for detail (edit/delete, “Use in outfit”). |
| **Add/Edit item** | Modal/sheet: photo upload, name, category. Upload to Storage, save to `wardrobe_items`. |
| **Outfit builder** | Screen: wardrobe source (list/grid of items) + outfit canvas (slots or list). Add items to outfit (tap or drag); name outfit; Save. Edit outfit: same screen with pre-filled items. |
| **Outfit card (in list)** | After saving: list of “My outfits” with name and thumbnail (first item or cover). Tap to view/edit or delete. |
| **Storage integration** | Bucket `wardrobe`; upload on add/edit item; optional `outfit-covers` if custom cover image is supported. |

### Database Tables Used

| Table | Usage in Phase 3 |
|-------|------------------|
| **wardrobe_items** | CRUD; image_url from Storage. |
| **outfits** | Create on “Save outfit”; name, optional cover_image_url. |
| **outfit_items** | Insert/delete when user adds/removes items from outfit; sort_order for display order. |

**Migrations:** Create `wardrobe_items`, `outfits`, `outfit_items`; RLS; Storage bucket `wardrobe`.

---

## Phase 4: Outfit Planning — Assign to Dates, Outfit of the Day on Dashboard

### Goals

- User can assign an outfit to a specific date (one outfit per day).
- Outfit planner UI: calendar or week view; pick a day, choose outfit from saved outfits, assign or change.
- Home dashboard and Today page show “today’s planned outfit” when one is set; empty state or “Plan your look” when not.
- Clearing or changing the planned outfit for a day works and updates the dashboard/Today view.

### Components to Implement

| Component | Description |
|-----------|-------------|
| **Outfit planner screen** | Week strip or calendar; each day shows assigned outfit thumbnail or “Assign.” Tap day → list of saved outfits; tap outfit to assign; “Clear” to remove. “Create new outfit” → Outfit builder. |
| **Planned outfit card (Home / Today)** | If today has planned outfit: card with outfit name and preview (item thumbnails or cover). Tap → detail or “Change” → Outfit planner with today selected. If none: “Plan your look” CTA → Outfit planner. |
| **Hook/query for today’s outfit** | Load planned_outfits where user_id and planned_date = today; then load outfit + outfit_items + wardrobe_items for display. |
| **Navigation** | From Wardrobe: “Plan outfits.” From Home/Today: “Plan your look” / “Change outfit.” |

### Database Tables Used

| Table | Usage in Phase 4 |
|-------|------------------|
| **planned_outfits** | Insert when user assigns outfit to date; update (replace outfit_id) when changing; delete when clearing. Unique (user_id, planned_date). |
| **outfits** | Read for planner and for “today’s outfit” card. |
| **outfit_items** | Read with wardrobe_items to show composed look. |
| **wardrobe_items** | Read for thumbnails/names on planned outfit card. |
| **daily_entries** | No new columns; today’s entry used for “today” date. |

**Migrations:** Create `planned_outfits`; RLS. Tables from Phase 3 already exist.

---

## Phase 5: Focus Timer, Weekly Review, Polish, Soft Sound Feedback

### Goals

- Focus system: tasks can have a timer (countdown or stopwatch); start/pause/end; session saved to task_sessions linked to today’s daily_entry.
- Weekly review: screen that summarizes the past week (e.g. days with journal, water, routines) and allows freeform reflection text (stored in a simple way, e.g. weekly_reflections table or in daily_entries).
- Visual polish: consistent moodboard styling, gentle animations, soft shadows, typography; no corporate feel.
- Soft sound feedback: optional bubble/sparkle sounds when logging water, marking routine done, completing a task or focus session; respect Settings “Sounds on/off.”

### Components to Implement

| Component | Description |
|-----------|-------------|
| **Focus timer** | On Today (and optionally Home): start timer for a task (countdown from default_duration_minutes or custom). Pause, resume, end. On end: save task_session (task_id, daily_entry_id, started_at, ended_at, duration_seconds, completed); optional celebration. |
| **Task session list** | Optional: “Focus today” summary (total time or list of sessions) on Today or in Weekly review. |
| **Weekly reflection screen** | View past 7 days (or current week); summary blocks (e.g. journal days, water average, routines completed); text area for reflection; save. Link from Home (“Reflect on your week”) or Diary. |
| **Weekly reflection storage** | Either new table (e.g. weekly_reflections: user_id, week_start_date, content) or store in a dedicated structure; see SDD for optional extension. |
| **Settings: Sound** | Toggle “Sounds” on/off; persist in profiles.settings or a dedicated column. |
| **Sound effects** | Play soft sound on: +water, routine done, task complete, focus session complete. Only if Sounds on. |
| **Visual polish** | Global styles: cards, spacing, gradients, typography; subtle fade-in/stagger on scroll; water fill animation refined; consistent empty states and loading states. |
| **Home focus widget** | Show next/suggested task with “Start”; if timer running, show compact countdown; tap → Today focus section or inline timer. |

### Database Tables Used

| Table | Usage in Phase 5 |
|-------|------------------|
| **daily_tasks** | Already used; ensure default_duration_minutes is used for countdown. |
| **task_sessions** | Insert on focus session end; link task_id, daily_entry_id (today), started_at, ended_at, duration_seconds, completed. |
| **daily_entries** | getOrCreateToday() so task_sessions have a daily_entry_id. |
| **profiles** | settings jsonb or new column for sound preference; optional weekly_reflections or equivalent. |

**Optional:** `weekly_reflections` table (user_id, week_start_date date, content text, created_at, updated_at) if not storing in profiles.settings.

**Migrations:** Create `task_sessions`; add RLS. Optional weekly_reflections table. No new Storage buckets.

---

## Phase Summary Table

| Phase | Focus | Main tables | Deliverable |
|-------|--------|-------------|-------------|
| **1** | Auth, daily entries, Home skeleton, Today, water, basic tasks | profiles, daily_entries, daily_tasks | Working app with journal, water, tasks; nav to Home, Today, Diary, Settings. |
| **2** | Beauty: products (2A), routines (2B), daily logging (2C), progress photos (2D), progress enhancements (2E), scheduling (2F) | beauty_products, beauty_routines, beauty_routine_steps, beauty_logs, beauty_progress_photos; Storage | Product library; routine builder; step completion per day; progress photos; optional routine link and soft ratings; routine scheduling (daily/weekly/monthly); Today shows only due routines. |
| **3** | Wardrobe items, outfit builder, save outfits | wardrobe_items, outfits, outfit_items; Storage | Wardrobe tab; outfit builder; “My outfits” list. |
| **4** | Outfit planning by date, outfit of the day | planned_outfits | Outfit planner; today’s outfit on Home and Today. |
| **5** | Focus timer, weekly review, polish, sounds | task_sessions; optional weekly_reflections; profiles.settings | Timer on tasks; weekly reflection screen; visual and sound polish. |

---

## Recommended Order of Work Within Each Phase

- **Phase 1:** Supabase project + Auth → migrations (profiles, daily_entries, daily_tasks) + RLS → getOrCreateToday() → App shell + nav → Auth screen → Home skeleton → Today page + water + tasks → Diary (minimal) → Settings (minimal).
- **Phase 2:** 2A product library + Storage → 2B routines + steps (soft-delete) → 2C beauty_logs + Today/Beauty execution + Home widget → 2D.1 schema + beauty-progress storage → 2D.2 upload UI → 2D.3 gallery/timeline → 2E.1 schema (routine_id, soft ratings) → 2E.2 upload/edit UI → 2E.3 detail display → 2F.1 schema (cadence_type, weekly_days, monthly_days, is_active) → 2F.2 routine editor scheduling UI → 2F.3 due routine filtering on Today.
- **Phase 3:** Migrations + Storage for wardrobe → Wardrobe screen + item CRUD → Outfit builder (add items, name, save) → My outfits list + edit/delete.
- **Phase 4:** planned_outfits migration → Outfit planner screen → today’s outfit query → Planned outfit card on Home and Today.
- **Phase 5:** task_sessions migration → Focus timer UI → Weekly reflection screen + storage → Settings sound toggle → Sound effects → Global visual polish.

---

## Document History

| Version | Date       | Change |
|---------|------------|--------|
| 1.0     | 2025-03-15 | Initial implementation plan |
| 1.1     | 2025-03-15 | Phase 2 Beauty split into 2A (products), 2B (routines), 2C (daily logging), 2D (progress photos); data model and MVP vs later clarified |
| 1.2     | 2025-03-15 | Phase 2D detailed: beauty_progress_photos schema (daily_entry_id, area, notes, taken_at), storage path {user_id}/{area}/filename; split into 2D.1 schema+storage, 2D.2 upload UI, 2D.3 gallery/timeline; comparison and AI postponed |
| 1.3     | 2025-03-15 | Phase 2E: progress photo enhancements—optional routine_id, soft ratings (face_condition, hair_quality, hair_length_feeling; 4-level); schema update + upload/edit UI + detail display; no scheduling or AI |
| 1.4     | 2025-03-15 | Phase 2F: routine scheduling—cadence_type, weekly_days, monthly_days, is_active on beauty_routines; routine editor scheduling UI; due routine filtering on Today; MVP: unscheduled = always due |

---

*Development should follow this plan and align with [SDD](./sdd.md) (schema, RLS, storage) and [UI Architecture](./ui-architecture.md) (screens and components).*
