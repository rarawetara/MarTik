# MärTik — System Design Document (SDD)

**Version:** 1.0  
**Document type:** Technical architecture  
**Related:** [Product Specification](./product-spec.md), [Product Features](./product-features.md)

This document defines the technical architecture of MärTik: database schema (Supabase Postgres), entity relationships, core system logic, storage strategy for images, outfit planning flow, and security model (RLS).

---

## 1. Technology Stack

| Layer        | Technology |
|-------------|------------|
| Hosting     | Netlify (static site + serverless functions if needed) |
| Backend     | Supabase (Postgres, Auth, Storage, Realtime) |
| Frontend    | SPA (e.g. React + Vite); communicates with Supabase client |
| Auth        | Supabase Auth (single private user) |
| Images      | Supabase Storage (buckets per asset type) |

---

## 2. Database Schema (Supabase Postgres)

### 2.1 Entity Relationship Overview

```
profiles (1) ─────────────────┬── (*) daily_entries
                              ├── (*) beauty_products
                              ├── (*) beauty_routines
                              ├── (*) wardrobe_items
                              ├── (*) outfits
                              ├── (*) planned_outfits
                              └── (*) daily_tasks

daily_entries (1) ────────────┬── (*) beauty_logs (via routine_step_id → beauty_routine_steps)
                              ├── (*) beauty_progress_photos (Phase 2D: photo per day + area)
                              ├── (*) task_sessions (via task_id → daily_tasks)
                              └── (0..1) planned_outfits (via planned_date = entry_date)

beauty_routines (1) ────────── (*) beauty_routine_steps ──→ beauty_products
beauty_routine_steps (1) ───── (*) beauty_logs (completion per step per day)

outfits (1) ──────────────────┬── (*) outfit_items ──→ wardrobe_items
                              └── (*) planned_outfits

daily_tasks (1) ───────────── (*) task_sessions
```

All user-scoped tables reference `profiles.id` (or `auth.uid()`); the app uses a single authenticated user per deployment.

---

### 2.2 Table Definitions

#### `profiles`

Extends Supabase Auth; one row per user. In a single-user app, there is exactly one profile.

| Column         | Type         | Constraints | Description |
|----------------|--------------|-------------|-------------|
| id             | uuid         | PK, FK → auth.users(id) ON DELETE CASCADE | Same as auth.users.id |
| display_name   | text         |             | Optional display name |
| avatar_url     | text         |             | Optional profile image (Storage URL) |
| water_goal_ml  | int          | default 2000 | Daily water goal for UI |
| timezone       | text         | default 'UTC' | For “today” and date handling |
| settings       | jsonb        | default '{}' | Future preferences (e.g. habits, theme) |
| created_at     | timestamptz  | default now() | |
| updated_at     | timestamptz  | default now() | |

---

#### `daily_entries`

One row per user per calendar day. The central record for the “day”; water, journal, mood, and optional JSON for daily photos / progress photos live here.

| Column          | Type         | Constraints | Description |
|-----------------|--------------|-------------|-------------|
| id              | uuid         | PK, default gen_random_uuid() | |
| user_id         | uuid         | FK → profiles(id) ON DELETE CASCADE, NOT NULL | |
| entry_date      | date         | NOT NULL | Calendar day (e.g. 2025-03-15) |
| journal_text    | text         |             | Freeform journal for the day |
| mood            | text         |             | Optional mood (e.g. 'calm', 'energetic'); single value |
| water_ml        | int          | default 0  | Total water logged for the day |
| daily_photos    | jsonb        | default '[]' | Array of { url, caption?, sort_order } for Today page photos |
| progress_photos | jsonb        | default '[]' | For Beauty progress: [{ url, type: 'face'|'hair', taken_at (date) }] |
| habits          | jsonb        | default '{}' | Optional habit checkmarks { habit_id: true/false } |
| created_at      | timestamptz  | default now() | |
| updated_at      | timestamptz  | default now() | |

**Unique:** `(user_id, entry_date)` — one entry per user per day.

---

#### `beauty_products` (Phase 2)

Catalog of skincare, haircare, and body products; each is a visual card with photo and metadata. Products are referenced by routine steps.

| Column          | Type         | Constraints | Description |
|-----------------|--------------|-------------|-------------|
| id              | uuid         | PK, default gen_random_uuid() | |
| user_id         | uuid         | FK → profiles(id) ON DELETE CASCADE, NOT NULL | |
| name            | text         | NOT NULL | e.g. "Vitamin C serum" |
| category        | text         |             | e.g. 'cleanser', 'serum', 'moisturizer', 'hair' |
| area            | text         |             | 'face' | 'hair' | 'body' — where the product is used |
| time_of_day     | text         |             | 'morning' | 'evening' | 'anytime' — suggested time of use |
| notes           | text         |             | Optional user notes |
| image_url       | text         |             | Supabase Storage public URL or path |
| sort_order      | int          | default 0  | Display order in library |
| created_at      | timestamptz  | default now() | |
| updated_at      | timestamptz  | default now() | |

---

#### `beauty_routines` (Phase 2, extended in 2F)

User-defined routines (e.g. morning routine, evening routine, hair routine). Each routine has ordered steps in `beauty_routine_steps`. **Phase 2F** adds optional scheduling so a routine can be due daily, on specific weekdays, or on specific days of the month.

| Column         | Type        | Constraints | Description |
|----------------|-------------|-------------|-------------|
| id             | uuid        | PK, default gen_random_uuid() | |
| user_id        | uuid        | FK → profiles(id) ON DELETE CASCADE, NOT NULL | |
| name           | text        | NOT NULL   | e.g. "Morning routine", "Hair routine" |
| type           | text        |             | 'morning' | 'evening' | 'hair' | 'custom' — optional preset type |
| sort_order     | int         | default 0  | Display order |
| **cadence_type** | text       | default 'none'; CHECK IN ('daily','weekly','monthly','none') | When the routine is due (Phase 2F) |
| **weekly_days** | smallint[]  | nullable   | For cadence_type = 'weekly': weekdays 0–6 (0 = Sunday). e.g. [1,3,5] = Mon, Wed, Fri |
| **monthly_days** | smallint[] | nullable   | For cadence_type = 'monthly': days of month 1–31. e.g. [1, 15] = 1st and 15th |
| **is_active**   | boolean     | default true | If false, routine is hidden from due list (Phase 2F) |
| created_at     | timestamptz | default now() | |
| updated_at     | timestamptz | default now() | |

---

#### `beauty_routine_steps` (Phase 2)

One step in a routine: references one beauty product. Order is given by `sort_order`. Steps are soft-deleted (`deleted_at`) so historical `beauty_logs` remain valid when the user removes a step from a routine.

| Column      | Type        | Constraints | Description |
|-------------|-------------|-------------|-------------|
| id          | uuid        | PK, default gen_random_uuid() | |
| routine_id  | uuid        | FK → beauty_routines(id) ON DELETE CASCADE, NOT NULL | |
| product_id  | uuid        | FK → beauty_products(id) ON DELETE CASCADE, NOT NULL | |
| sort_order  | int         | NOT NULL DEFAULT 0 | Order within the routine |
| deleted_at  | timestamptz |             | Set when step is removed from routine; logs still reference this row |
| created_at  | timestamptz | default now() | |
| updated_at  | timestamptz | default now() | |

**Historical integrity:** When displaying “today” we show only steps with `deleted_at IS NULL`. When displaying a past day’s completion, we join `beauty_logs` to `beauty_routine_steps` (and to `beauty_products`); if a step was later soft-deleted, the log still shows “completed” for that day.

---

#### `beauty_logs` (Phase 2 — daily routine completion)

Records “routine step X was completed on day Y.” One row per step per day. Completion is tied to **routine_step_id**, not to product or routine name, so historical daily data stays correct when the user edits routines or products later.

| Column           | Type        | Constraints | Description |
|------------------|-------------|-------------|-------------|
| id               | uuid        | PK, default gen_random_uuid() | |
| daily_entry_id   | uuid        | FK → daily_entries(id) ON DELETE CASCADE, NOT NULL | |
| routine_step_id  | uuid        | FK → beauty_routine_steps(id) ON DELETE CASCADE, NOT NULL | |
| completed_at     | timestamptz | default now() | When the user marked the step done |

**Unique:** `(daily_entry_id, routine_step_id)` — at most one completion per step per day.  
`user_id` is derived via `daily_entries.user_id` for RLS.

---

#### `wardrobe_items` (Phase 3A)

Clothing items (tops, bottoms, shoes, accessories, etc.) with photo and metadata. Each item is a card in the user's wardrobe library. Phase 3A: items only; no outfit_items or planned_outfits usage yet.

| Column     | Type        | Constraints | Description |
|------------|-------------|-------------|-------------|
| id         | uuid        | PK, default gen_random_uuid() | |
| user_id    | uuid        | FK → profiles(id) ON DELETE CASCADE, NOT NULL | |
| name       | text        | NOT NULL   | e.g. "White linen shirt" |
| category   | text        |             | 'top' | 'bottom' | 'dress' | 'shoes' | 'accessory' |
| color      | text        |             | Optional color (e.g. "white", "navy") |
| season     | text        |             | Optional season (e.g. "summer", "winter", "all") |
| notes      | text        |             | Optional user notes |
| photo_url  | text        |             | Supabase Storage URL (bucket `wardrobe`) |
| sort_order | int         | default 0  | Display order in wardrobe |
| created_at | timestamptz | default now() | |
| updated_at | timestamptz | default now() | |

---

#### `outfits` (Phase 3B)

Saved outfit entity: a named look composed of wardrobe items. Phase 3B: create/save/view/edit/delete outfits only; no assignment to dates (Phase 4) or display on Home/Today yet.

| Column     | Type        | Constraints | Description |
|------------|-------------|-------------|-------------|
| id         | uuid        | PK, default gen_random_uuid() | |
| user_id    | uuid        | FK → profiles(id) ON DELETE CASCADE, NOT NULL | |
| name       | text        | NOT NULL   | e.g. "Coffee date look" |
| notes      | text        |             | Optional user notes (Phase 3B) |
| created_at | timestamptz | default now() | |
| updated_at | timestamptz | default now() | |

Optional for later: `cover_image_url` (composite/hero image). Not required for Phase 3B MVP.

---

#### `outfit_items` (Phase 3B)

Links wardrobe items to an outfit with a **slot type**. Each row = one wardrobe item in one outfit, assigned to a slot (top, bottom, dress, outerwear, shoes, accessory). Same item cannot appear twice in one outfit.

| Column           | Type        | Constraints | Description |
|------------------|-------------|-------------|-------------|
| id               | uuid        | PK, default gen_random_uuid() | |
| outfit_id        | uuid        | FK → outfits(id) ON DELETE CASCADE, NOT NULL | |
| wardrobe_item_id | uuid        | FK → wardrobe_items(id) ON DELETE CASCADE, NOT NULL | |
| slot_type        | text        |             | 'top' \| 'bottom' \| 'dress' \| 'outerwear' \| 'shoes' \| 'accessory' — which slot this item fills |
| sort_order       | int         | default 0  | Display order within outfit (e.g. for multiple accessories) |
| created_at       | timestamptz | default now() | |

**Unique:** `(outfit_id, wardrobe_item_id)` — same item cannot appear twice in one outfit. MVP may allow some slots to be empty (no row for that slot).

---

#### `planned_outfits` (Phase 3C)

Assigns a saved outfit to a specific date. A **planned outfit** is a separate entity from the outfit: one outfit can be planned on multiple different dates. At most one planned outfit per user per day. Optional status (planned / worn / skipped) and notes.

| Column       | Type        | Constraints | Description |
|--------------|-------------|-------------|-------------|
| id           | uuid        | PK, default gen_random_uuid() | |
| user_id      | uuid        | FK → profiles(id) ON DELETE CASCADE, NOT NULL | |
| outfit_id    | uuid        | FK → outfits(id) ON DELETE CASCADE, NOT NULL | |
| planned_date | date        | NOT NULL   | Date this outfit is planned for |
| status       | text        | default 'planned' | Values: planned, worn, skipped (Phase 3C) |
| notes        | text        |             | Optional notes for this planned instance |
| created_at   | timestamptz | default now() | |
| updated_at   | timestamptz | default now() | |

**Unique:** `(user_id, planned_date)` — at most one planned outfit per user per day.

---

#### `daily_tasks`

Focus tasks (reusable); used with timers and linked to days via `task_sessions`.

| Column                  | Type        | Constraints | Description |
|-------------------------|-------------|-------------|-------------|
| id                      | uuid        | PK, default gen_random_uuid() | |
| user_id                 | uuid        | FK → profiles(id) ON DELETE CASCADE, NOT NULL | |
| title                   | text        | NOT NULL   | e.g. "Read 30 min" |
| default_duration_minutes| int         |             | Optional default for countdown (e.g. 25) |
| sort_order              | int         | default 0  | Order in task list |
| created_at              | timestamptz | default now() | |
| updated_at              | timestamptz | default now() | |

---

#### `task_sessions`

One focus session: task + start/end time and duration, tied to a day.

| Column          | Type        | Constraints | Description |
|-----------------|-------------|-------------|-------------|
| id              | uuid        | PK, default gen_random_uuid() | |
| task_id         | uuid        | FK → daily_tasks(id) ON DELETE CASCADE, NOT NULL | |
| daily_entry_id  | uuid        | FK → daily_entries(id) ON DELETE CASCADE, NOT NULL | Day this session belongs to |
| started_at      | timestamptz | NOT NULL   | |
| ended_at        | timestamptz |             | Null until session ends |
| duration_seconds| int         |             | Filled when session ends (countdown or stopwatch) |
| completed       | boolean     | default false | True when user marks complete or timer ends |
| created_at      | timestamptz | default now() | |

`user_id` is derived via `daily_tasks.user_id` or `daily_entries.user_id` for RLS.

---

#### `beauty_progress_photos` (Phase 2D, extended in 2E)

Stores face or hair progress photos, each tied to a **user**, a **day** (via `daily_entry_id`), and an **area** (face / hair). Optional notes; `taken_at` reflects when the photo was taken. **Phase 2E** adds optional **routine link** (`routine_id`) and **soft qualitative ratings** (4-level scale: `low` | `medium` | `good` | `great`) for face condition, hair quality, and hair length feeling—all nullable so existing photos and minimal flows keep working.

| Column                      | Type        | Constraints | Description |
|-----------------------------|-------------|-------------|-------------|
| id                          | uuid        | PK, default gen_random_uuid() | |
| user_id                     | uuid        | FK → profiles(id) ON DELETE CASCADE, NOT NULL | |
| daily_entry_id              | uuid        | FK → daily_entries(id) ON DELETE CASCADE, NOT NULL | Day this photo belongs to |
| area                        | text        | NOT NULL   | 'face' | 'hair' |
| photo_url                   | text        | NOT NULL   | Supabase Storage URL (bucket `beauty-progress`) |
| notes                       | text        |             | Optional user notes |
| taken_at                    | timestamptz | default now() | When the photo was taken (for display/sort) |
| **routine_id**              | uuid        | FK → beauty_routines(id) ON DELETE SET NULL, NULLABLE | Optional: related beauty routine (Phase 2E) |
| **face_condition_rating**   | text        | NULLABLE; CHECK IN ('low','medium','good','great') | Soft rating for face condition (Phase 2E) |
| **hair_quality_rating**    | text        | NULLABLE; CHECK IN ('low','medium','good','great') | Soft rating for hair quality (Phase 2E) |
| **hair_length_feeling_rating** | text     | NULLABLE; CHECK IN ('low','medium','good','great') | Soft rating for hair length feeling (Phase 2E) |
| created_at                  | timestamptz | default now() | |
| updated_at                   | timestamptz | default now() | |

Multiple photos per day per area are allowed. All new columns are optional; existing rows remain valid. RLS: by `user_id = auth.uid()`. Storage path: `{user_id}/{area}/filename.{ext}` in bucket `beauty-progress`.

---

### 2.4 Table Relationships Summary

| Child table           | Parent(s)              | Relationship |
|-----------------------|------------------------|--------------|
| daily_entries         | profiles               | N entries per user |
| beauty_products       | profiles               | N products per user |
| beauty_routines       | profiles               | N routines per user; Phase 2F: optional cadence_type, weekly_days, monthly_days, is_active for scheduling |
| beauty_routine_steps  | beauty_routines, beauty_products | N steps per routine; each step references one product |
| beauty_logs           | daily_entries, beauty_routine_steps | One completion per step per day; historical data preserved when steps soft-deleted |
| beauty_progress_photos| profiles, daily_entries; optional → beauty_routines | N progress photos per user; each tied to a daily_entry (day) and area (face/hair); optional routine_id and soft ratings (Phase 2E) |
| wardrobe_items        | profiles               | N items per user |
| outfits          | profiles               | N outfits per user |
| outfit_items     | outfits, wardrobe_items| N items per outfit; each row has slot_type (top/bottom/dress/outerwear/shoes/accessory); Phase 3B |
| planned_outfits  | profiles, outfits      | N plans per user; one per (user, date); status (planned/worn/skipped), notes (Phase 3C) |
| daily_tasks      | profiles               | N tasks per user |
| task_sessions    | daily_tasks, daily_entries | N sessions per task, N sessions per day |

**Outfit composition (Phase 3B):** An outfit is composed of wardrobe items via `outfit_items`; each row has `slot_type` (top, bottom, dress, outerwear, shoes, accessory). **Outfit planning (Phase 3C):** `planned_outfits` is a separate entity: it assigns an `outfit_id` to a `planned_date` (one per user per day); optional `status` (planned/worn/skipped) and `notes`. One outfit can be planned on multiple dates. Dashboard and Today show today's planned outfit when a row exists for current date.

---

## 3. Core System Logic

### 3.1 `getOrCreateToday()`

The app must always have a **daily entry for today** so that water, journal, beauty logs, task sessions, and “today’s planned outfit” have a single place to attach to. `getOrCreateToday()` is the central function that returns the current day’s `daily_entries` row and creates it if it does not exist.

**Pseudocode (client or Edge Function):**

```
function getOrCreateToday(userId: uuid):
  today = currentDate()  // in user's timezone from profiles.timezone
  entry = select from daily_entries where user_id = userId and entry_date = today
  if entry is null:
    entry = insert into daily_entries (user_id, entry_date) values (userId, today)
  return entry
```

**Implementation options:**

1. **Client (Supabase client):**  
   - `select().eq('user_id', userId).eq('entry_date', today).maybeSingle()`.  
   - If no row, `insert({ user_id: userId, entry_date: today }).select().single()`.  
   - Use the returned row (created or existing) as “today’s entry” for the rest of the session.

2. **Database function (recommended for consistency):**  
   - Postgres function `get_or_create_today(p_user_id uuid)` that:  
     - Computes “today” in the user’s timezone (from `profiles.timezone`), or uses `CURRENT_DATE` if timezone is not critical.  
     - `INSERT INTO daily_entries (user_id, entry_date) VALUES (p_user_id, today) ON CONFLICT (user_id, entry_date) DO UPDATE SET updated_at = now() RETURNING *;`  
     - Requires unique constraint on `(user_id, entry_date)`.  
   - Client calls `rpc('get_or_create_today', { p_user_id: auth.uid() })` and uses the returned row.

**When to call:**

- On app load (Home dashboard, Today page).
- Before logging water, beauty, or starting a focus session for “today.”
- When opening the Today page so that the page always has a valid `daily_entry_id` for the current day.

**Result:** All daily actions (water, journal, beauty logs, task sessions) reference the same `daily_entries.id` for today, and the dashboard can show today’s planned outfit, water, and summary from this single record.

---

### 3.2 Resolving “Today’s Planned Outfit”

- Query: `planned_outfits` where `user_id = auth.uid()` and `planned_date = current_date` (in user timezone). Phase 3C: row includes optional `status` (planned/worn/skipped) and `notes`.
- If a row exists, load `outfits` by `outfit_id`, then load `outfit_items` + `wardrobe_items` for that outfit to show the composed look (names, images) on the Home dashboard and Today page.
- **Planned outfit for any date:** To show planned outfit for a selected day (e.g. date picker or Diary): same query with `planned_date = selected_date`. One row per (user, date); optional status/notes for that day.
- If no row exists for the date, show an empty state or “Plan your look” CTA.

---

### 3.3 Beauty Routine Completion (Phase 2)

Routines are made of steps (each step = one product). Daily completion is stored in **beauty_logs** as (daily_entry_id, routine_step_id). When a step is removed from a routine, set step.deleted_at so historical logs remain valid. See §2.2 tables beauty_routines, beauty_routine_steps, beauty_logs.

### 3.4 Due Routine Computation (Phase 2F)

Scheduling determines **which routines are due** for a given calendar day. It does not modify or backfill historical data; it only filters which routines to show on the Today page (and in Beauty when a day is selected).

**Rules:**

- **cadence_type = 'none' (or null):** Routine is **always due** (recommended MVP: show in the main list every day). No separate “unscheduled” section required.
- **cadence_type = 'daily':** Routine is due every day (when is_active = true).
- **cadence_type = 'weekly':** Routine is due on days whose weekday (0 = Sunday … 6 = Saturday) is in `weekly_days`. Example: weekly_days = [0, 6] → Sunday and Saturday.
- **cadence_type = 'monthly':** Routine is due on days whose day-of-month (1–31) is in `monthly_days`. Example: monthly_days = [1, 15] → 1st and 15th of each month. Handle short months by checking if the day exists (e.g. 31 in February: not due).

**Computation (client or DB):** Given a date `d` and a routine row: if cadence_type is 'none' or null → due; if 'daily' → due; if 'weekly' → due iff extract(dow from d) (or equivalent) is in weekly_days; if 'monthly' → due iff extract(day from d) is in monthly_days. Filter by is_active = true.

**Historical logs:** beauty_logs are unchanged. Past days still show completion for whatever routines were displayed then; changing a routine’s schedule does not rewrite old logs.

---

## 4. Storage Strategy for Uploaded Images

All images are stored in **Supabase Storage** with Row Level Security so only the owning user can read/write. Paths are stored in Postgres (as URLs or paths) for display and queries.

### 4.1 Bucket Layout

| Bucket name       | Purpose                     | Path pattern (suggestion) |
|-------------------|-----------------------------|----------------------------|
| `beauty-products` | Beauty product photos       | `{user_id}/{product_id}.{ext}` or `{user_id}/{uuid}.{ext}` |
| `beauty-progress` | Face/hair progress photos (Phase 2D) | `{user_id}/{area}/filename.{ext}` (e.g. `{user_id}/face/abc.webp`) |
| `wardrobe`        | Clothing item photos (Phase 3A) | `{user_id}/{category}/filename.{ext}` (e.g. `{user_id}/top/abc.webp`) |
| `outfit-covers`   | Optional outfit cover image | `{user_id}/{outfit_id}.{ext}` |
| `daily-photos`    | Today page daily photos     | `{user_id}/{entry_date}/{uuid}.{ext}` |

- **`user_id`** = `auth.uid()` so RLS can restrict by user.
- Use **UUIDs** in paths where multiple files per entity are possible (e.g. daily photos, progress photos).

### 4.2 Beauty Product Photos

- **Upload:** On create/update of `beauty_products`, upload file to `beauty-products/{user_id}/{product_id}.{ext}` (or new UUID before insert).
- **URL:** After upload, get public URL from Storage and set `beauty_products.image_url`.
- **Policy:** Only the authenticated user can read/write their own prefix `{user_id}/*`.

### 4.3 Face / Hair Progress Photos (Phase 2D)

- **Bucket:** `beauty-progress` (public or RLS-restricted). Path: **`{user_id}/{area}/filename.{ext}`** (e.g. `{user_id}/face/abc123.webp`, `{user_id}/hair/def456.jpg`). Per-user folder and area subfolder keep storage organized and RLS simple.
- **Upload:** Client uploads to `beauty-progress/{user_id}/{area}/{unique_id}.{ext}`; then insert row into `beauty_progress_photos` with `user_id`, `daily_entry_id` (the day the photo belongs to), `area` ('face' | 'hair'), `photo_url` (from Storage public URL), optional `notes`, `taken_at`.
- **RLS (storage):** Users can read/write only objects under `storage.objects` where the path prefix matches their `auth.uid()` (e.g. `(storage.foldername(name))[1] = auth.uid()::text`).
- **Metadata:** Table `beauty_progress_photos` is the source of truth; no duplicate data in `daily_entries.progress_photos` required for Phase 2D.

### 4.4 Clothing Photos (Wardrobe — Phase 3A)

- **Bucket:** `wardrobe` (separate bucket for wardrobe item photos). Path: **`{user_id}/{category}/filename.{ext}`** (e.g. `{user_id}/top/abc123.webp`). Per-user folder and category subfolder; RLS restricts by first path segment = `auth.uid()`.
- **Upload:** When creating or updating a wardrobe item, upload file to `wardrobe/{user_id}/{category}/{unique_id}.{ext}`; then set `wardrobe_items.photo_url` to the Storage public URL.
- **Policy:** Only the authenticated user can read/write objects under their `{user_id}/*` prefix in the `wardrobe` bucket (see §6.4).

### 4.5 Outfit Cover Images (Optional)

- **Upload:** To `outfit-covers/{user_id}/{outfit_id}.{ext}` when user sets a custom cover for an outfit.
- **URL:** Set `outfits.cover_image_url`. If not set, UI can derive a preview from the first (or all) `wardrobe_items` images of the outfit.

### 4.6 Daily Photos (Today Page)

- **Upload:** To `daily-photos/{user_id}/{entry_date}/{uuid}.{ext}` (entry_date as `YYYY-MM-DD`).
- **Metadata:** Append `{ url, caption?, sort_order }` to `daily_entries.daily_photos` for that day. Ensure the day exists via `getOrCreateToday()` before uploading.

### 4.7 General Conventions

- Use **public** buckets with RLS so that URLs are stable and no signed URLs are required for the app (or use signed URLs if you prefer private buckets).
- Prefer **image optimization** (resize/compress) in the client or via a small serverless function on upload to keep storage and load times low.
- **Delete:** When a product/item/outfit/entry is deleted, remove the corresponding object(s) from Storage (e.g. trigger or application logic) to avoid orphaned files.

---

## 5. Outfit Planning: End-to-End Flow

1. **Outfit is composed of wardrobe items**  
   - User creates an outfit in the Outfit builder and adds items via `outfit_items` (each row = one `wardrobe_item_id` + `sort_order`).  
   - The outfit is stored in `outfits`; its “composition” is the set of rows in `outfit_items` for that `outfit_id`.

2. **Assigning an outfit to a date (Phase 3C)**  
   - User selects a date (e.g. today or a future date) and selects an outfit (from outfit card/detail or by date).  
   - App inserts or updates `planned_outfits`: `(user_id, outfit_id, planned_date, status, notes)`. Default status `'planned'`; optional later: mark as `'worn'` or `'skipped'`.  
   - Unique on `(user_id, planned_date)` means one outfit per day; “change outfit for this day” is an update to the same row (new `outfit_id`). Planned outfit is separate from outfit entity; one outfit can be planned on many dates.

3. **Displaying today’s planned outfit on the dashboard**  
   - On load, call `getOrCreateToday()` so “today” is defined.  
   - Query:  
     `planned_outfits` where `user_id = auth.uid()` and `planned_date = current_date` (in user timezone).  
   - If found, fetch `outfits` by `outfit_id`, then `outfit_items` joined with `wardrobe_items` to get names and `image_url`s.  
   - Home dashboard and Today page render this as the “planned look” card (outfit name + item list/images).  
   - If not found, show “Plan your look” or leave the widget empty.

4. **Changing or clearing today’s outfit**  
   - **Change:** Update `planned_outfits` for `(user_id, today)` with a new `outfit_id`.  
   - **Clear:** Delete the row in `planned_outfits` for `(user_id, today)`.

---

## 6. Security Model (Supabase RLS)

Principle: **every table is scoped to the authenticated user**. Only `auth.uid()` may access their own rows.

### 6.1 Enable RLS on All User Tables

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE beauty_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE beauty_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE beauty_routine_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE beauty_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE beauty_progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE wardrobe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE planned_outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_sessions ENABLE ROW LEVEL SECURITY;
```

### 6.2 Policies: Direct User Ownership

Tables with `user_id`: **profiles**, **daily_entries**, **beauty_products**, **beauty_routines**, **beauty_progress_photos**, **wardrobe_items**, **outfits**, **planned_outfits**, **daily_tasks**.

For each, allow **SELECT, INSERT, UPDATE, DELETE** only when `user_id = auth.uid()`.

Example for `daily_entries`:

```sql
-- daily_entries: user can only access own rows
CREATE POLICY "Users can read own daily_entries"
  ON daily_entries FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own daily_entries"
  ON daily_entries FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own daily_entries"
  ON daily_entries FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own daily_entries"
  ON daily_entries FOR DELETE USING (user_id = auth.uid());
```

Repeat the same pattern for `profiles`, `beauty_products`, `beauty_routines`, `beauty_progress_photos`, `wardrobe_items`, `outfits`, `planned_outfits`, `daily_tasks` (replace table name and keep `user_id = auth.uid()`).

**Profiles:** Ensure the user can only update their own profile (and optionally restrict INSERT to the same `id` as `auth.uid()` for profile creation on signup).

### 6.3 Policies: Tables Without `user_id` (Child Tables)

**beauty_routine_steps**  
- Allowed only if the routine belongs to the user:  
  `routine_id IN (SELECT id FROM beauty_routines WHERE user_id = auth.uid())`.  
- Apply for SELECT, INSERT, UPDATE, DELETE.

**beauty_logs**  
- Allowed only if the related daily entry belongs to the user:  
  `daily_entry_id IN (SELECT id FROM daily_entries WHERE user_id = auth.uid())`.  
- Apply for SELECT, INSERT, UPDATE, DELETE (and for INSERT, ensure the referenced `daily_entries` row is owned by the user).

**outfit_items**  
- Allowed only if the outfit belongs to the user:  
  `outfit_id IN (SELECT id FROM outfits WHERE user_id = auth.uid())`.  
- Same for SELECT, INSERT, UPDATE, DELETE.

**task_sessions**  
- Allowed only if the task belongs to the user:  
  `task_id IN (SELECT id FROM daily_tasks WHERE user_id = auth.uid())`.  
- Or alternatively: allow if the linked daily entry is owned:  
  `daily_entry_id IN (SELECT id FROM daily_entries WHERE user_id = auth.uid())`.  
- Both paths should be consistent; prefer checking via `daily_tasks.user_id` so that only the task owner can create sessions for their tasks.

### 6.4 Storage RLS (Supabase Storage)

For each bucket, create policies so that:

- **SELECT:** `auth.uid()::text = (storage.foldername(name))[1]` (first path segment = user_id).
- **INSERT/UPDATE:** Same condition so users can only upload under their folder.
- **DELETE:** Same condition so users can only delete their own files.

Example for bucket `wardrobe`:

```sql
-- Allow read for own folder
CREATE POLICY "Users can read own wardrobe files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'wardrobe' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow insert under own folder
CREATE POLICY "Users can upload to own wardrobe"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'wardrobe' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow update/delete for own folder
CREATE POLICY "Users can update own wardrobe files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'wardrobe' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own wardrobe files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'wardrobe' AND (storage.foldername(name))[1] = auth.uid()::text);
```

Repeat for `beauty-products`, `beauty-progress`, `outfit-covers`, `daily-photos` with the corresponding `bucket_id`.

### 6.5 Auth and Profile Creation

- On first sign-up (Supabase Auth), create a row in `profiles` with `id = auth.uid()` (e.g. via trigger on `auth.users` or from the client after sign-up). This ensures every authenticated user has exactly one profile and all RLS policies that depend on `user_id` or `profiles` work as intended.

---

## 7. Document History

| Version | Date       | Change           |
|---------|------------|------------------|
| 1.0     | 2025-03-15 | Initial SDD      |
| 1.1     | 2025-03-15 | Phase 2F: beauty_routines scheduling (cadence_type, weekly_days, monthly_days, is_active); §3.4 due routine computation |
| 1.2     | 2025-03-15 | Phase 3A: wardrobe_items (photo_url, color, season, notes); separate bucket `wardrobe`, path {user_id}/{category}/filename; §4.4 |
| 1.3     | 2025-03-15 | Phase 3B: outfits (name, notes) + outfit_items (slot_type: top/bottom/dress/outerwear/shoes/accessory); create/save outfits; no planned_outfits or Home/Today yet |
| 1.4     | 2025-03-15 | Phase 3C: planned_outfits extended with status (planned/worn/skipped), notes; assign outfit to date; view by date; simple flow |

---

*Implementation (migrations, RLS policies, and client usage of `getOrCreateToday()` and storage paths) should follow this document and stay consistent with [Product Specification](./product-spec.md) and [Product Features](./product-features.md).*
