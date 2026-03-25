# MärTik — UI Architecture

**Version:** 1.0  
**Document type:** UI / screen architecture  
**Related:** [Product Specification](./product-spec.md), [Product Features](./product-features.md), [SDD](./sdd.md)

This document defines the main screens of MärTik, their structure and components, layout, and navigation. The UI should feel like a **dreamy editorial moodboard**: image-led, calm, and personal—not a corporate dashboard.

---

## 1. Layout Structure

### 1.1 App Shell

The app uses a **single shell** that wraps all main screens:

- **Header (optional, minimal):** App name / logo; optional avatar or “Today” date. No dense menus. On mobile, a compact top bar (e.g. logo + profile/settings) is enough.
- **Main content area:** Full-width, scrollable. Each screen fills this area; no persistent sidebar on small viewports.
- **Navigation:** Primary nav is **bottom tab bar** on mobile and tablet; on desktop it can be a **bottom bar** or a **collapsed sidebar** (icons + labels on expand). Nav is always visible so the user can jump between Home, Today, Beauty, Wardrobe, Diary, and Settings without going “back” through multiple levels.

### 1.2 Layout Principles

- **Full-bleed content:** Screens use the full width; content has generous horizontal padding (e.g. 16–24px) and no fixed max-width unless for readability (e.g. journal text).
- **Vertical flow:** Content stacks vertically. No multi-column dashboard grid; the moodboard is a **single-column scroll** of cards and blocks (with optional 2-column card grids inside sections, e.g. wardrobe items).
- **Whitespace:** Ample space between sections so the UI feels calm and editorial.
- **No persistent chrome beyond nav:** Modals, sheets, or slide-over panels are used for forms (add product, add task) so the main screen stays uncluttered.
- **Responsive:** Mobile-first; same screens work on tablet and desktop with adjusted card sizes and optional side-by-side layout where it helps (e.g. outfit builder: wardrobe list + canvas).

### 1.3 Visual Language (Summary)

- **Cards:** Rounded corners, soft shadow or subtle border; image-first where applicable.
- **Typography:** Clear hierarchy (one strong headline per section, readable body); avoid dense tables or tiny labels.
- **Color:** Soft, muted palette; no alarm reds or harsh contrast. Accents for interactive elements (e.g. water fill, “done” state) should feel gentle.
- **Motion:** Subtle—e.g. fade-in on load, gentle hover/focus states. Optional parallax or stagger on scroll for moodboard feel.
- **Feedback:** Soft sounds and light sparkles on meaningful actions (water +1, routine done, task complete); never mandatory or loud.

---

## 2. Navigation

### 2.1 Primary Navigation (Tab Bar / Sidebar)

Primary destinations are always one tap away:

| Destination    | Icon/label   | Role |
|----------------|--------------|------|
| **Home**      | Home / house | Moodboard dashboard; default landing. |
| **Today**     | Today / sun or calendar | Daily page for the current (or selected) day. |
| **Beauty**    | Beauty / droplet or mirror | Product library + routine builder. |
| **Wardrobe**  | Wardrobe / hanger or shirt | Clothing item library. |
| **Diary**     | Diary / book or timeline | History: calendar or timeline of past days. |
| **Settings**  | Settings / gear | Preferences (sound, water target, timezone). |

**Outfit Builder** and **Outfit Planner** are reached from Wardrobe (e.g. “New outfit”, “Plan outfits”) or from Home/Today when the user taps “Plan your look” or “Change outfit”. They are **secondary screens**, not tabs.

**Beauty Progress** (face/hair comparison) is reached from Beauty (e.g. “Progress” or “Compare photos”).

**Weekly Reflection** is reachable from Home (widget CTA) or from Today/Diary (e.g. “This week’s reflection”).

### 2.2 Navigation Flow (High Level)

```
Home ──┬── Today (tab)
       ├── Beauty (tab) ──→ Beauty Progress
       ├── Wardrobe (tab) ──┬── Outfit Builder
       │                    └── Outfit Planner
       ├── Diary (tab) ──→ [day] (same layout as Today, different date)
       └── Settings (tab)

Today ──→ Diary (e.g. “View past days”)
Home widgets ──→ Today, Beauty, Focus (Today or modal), Outfit Planner, Weekly Reflection
```

- **Back behavior:** From Outfit Builder, Outfit Planner, Beauty Progress, or a specific day in Diary, “Back” returns to the previous screen (Wardrobe, Home, Beauty, or Diary list).
- **Deep links:** If the app supports URLs, routes might look like: `/`, `/today`, `/today/:date`, `/beauty`, `/beauty/progress`, `/wardrobe`, `/wardrobe/outfits/new`, `/wardrobe/plan`, `/diary`, `/diary/:date`, `/settings`.

---

## 3. Screen Definitions

---

### 3.1 Home

**Purpose:** The landing experience—a magical moodboard dashboard that greets the user and surfaces “today” at a glance: water, beauty, focus, planned outfit, and quick actions. It should feel like opening a personal editorial spread, not a productivity dashboard.

**Layout:** Single-column vertical scroll. No fixed grid; blocks stack with generous spacing.

**Structure:**

1. **Greeting / day hero**
   - Date (e.g. “Sunday, March 15”) and optional time-based greeting (“Good morning”, “Good evening”).
   - Optional one-line from today’s journal or an intention (e.g. “Today: slow and steady”). Tappable to open Today page.

2. **Planned outfit card**
   - If today has a planned outfit: large card with outfit name and composed preview (collage of item thumbnails or one cover image). Tap → outfit detail or “Change” → Outfit Planner.
   - If none: soft CTA card “Plan your look” → Outfit Planner or “Assign outfit”.

3. **Water widget**
   - Visual: glass (or bottle) that fills as the user logs water. Tap to add +250 ml; animation and optional sound.
   - Shows current total (e.g. “1.5 L”) and optional goal (e.g. “2 L”). No guilt if under goal.

4. **Beauty preview**
   - Compact block: “Morning” / “Evening” with checkmarks or empty state. Tap “Mark done” or individual products → expand or navigate to Beauty screen.
   - Optional: “Open routine” → full Beauty screen.

5. **Focus widget**
   - One focus task (e.g. next or suggested) with “Start” to begin timer. Optional compact timer if already running.
   - Tap → Today page (Focus section) or inline timer modal/sheet.

6. **Quick actions**
   - Shortcuts: “Add a note” (→ Today journal), “Today’s page”, “Weekly reflection” (if relevant). Presented as subtle buttons or a small action row, not a dense list.

7. **Optional: Progress teaser**
   - One line or small card: “Your progress this month” or “Compare photos” → Beauty Progress. Image-led, calm.

8. **Optional: Weekly reflection CTA**
   - At end of week: gentle card “Reflect on your week” → Weekly Reflection.

**Interactions:** Scroll to see all blocks. Tap widgets to drill in or perform inline actions (e.g. +water). No aggressive badges or alerts.

---

### 3.2 Today

**Purpose:** The daily life record for one day—habits, beauty routine, tasks, focus timer, water, mood, notes, and daily photo. Everything that belongs to “this day” lives here.

**Layout:** Single-column scroll. Sections stack in a fixed or configurable order. Optional collapsible sections to shorten scroll.

**Structure:**

1. **Date header**
   - Prominent date (e.g. “Sunday, March 15”). Controls: “Yesterday” / “Tomorrow” or date picker; “Today” button to jump to current day. Optional “View in Diary” → Diary/History.

2. **Habits**
   - List of habit toggles (e.g. “Morning routine”, “Exercise”, “Reading”). Each is a checkbox or toggle; state saved to daily entry. No penalty for unchecked.

3. **Beauty routine (Phase 2F: due routines only)**
   - Section title e.g. "Сегодняшний уход" (Today's care). Only **routines that are due** for the selected day are shown (daily = every day; weekly = on selected weekdays; monthly = on selected days of month; no schedule = always due). Each due routine shows its steps; user taps to mark used. Optional “Mark all done” for a routine. Optional separate section for unscheduled routines (e.g. “Other routines”) if not treating them as always due. Link “Manage products” → Beauty.

4. **Tasks & focus**
   - List of focus tasks. Each: title, optional “Start” (timer), “Done”. Add task via “+ Add task”. Active timer can show inline (countdown or stopwatch). Completion → soft celebration. Link to full task list or Focus view if needed.

5. **Water tracker**
   - Same as Home: filling glass, +250 ml per tap, total and optional goal. Shared state with Home for today.

6. **Mood**
   - Single-select mood (e.g. icons or words: calm, energetic, tired, happy). Optional “Clear” to remove.

7. **Notes (journal)**
   - Text area for the day’s journal. Auto-save. Optional placeholder or prompt. “Saved” indicator. Full-screen or expandable for longer writing.

8. **Daily photo**
   - One or more photos for the day. “Add photo” (upload/camera); gallery of thumbnails; tap to view full or delete; optional drag to reorder.

**Interactions:** All sections editable in place. Date change reloads that day’s data. Today page uses `getOrCreateToday()` so today’s entry always exists.

---

### 3.3 Beauty (Phase 2)

**Purpose:** Beauty includes (1) a **product library** (visual, collectible cards), (2) **routines** built from those products (ordered steps), (3) a **routine view for execution** (mark steps done per day), and (4) a **progress photos** section. The section should feel beautiful, calm, personal, and diary-like—visual cards, not boring admin tables.

**Layout:** Single-column or tabbed. Entry points: Product library, My routines, Progress photos. Routine execution can live in Beauty or on the Today page.

**Structure:**

1. **Beauty section entry** — Screen title. Tabs or links: Product library | Routines | Progress photos.

2. **Product library** — Grid of product cards (photo, name, category, area). Filter by category, area, time of day. “+ Add product”: photo upload, name, category, area (face/hair/body), time_of_day (morning/evening/anytime), optional notes. Tap card → edit/delete. Visual, collectible feel.

3. **Routine builder** — List of routines (e.g. Morning, Evening, Hair). Each routine = card with name + ordered steps (product thumbnails). Create routine: name + add steps (pick products, set order). **Phase 2F — Scheduling:** In create/edit routine: cadence selector (daily / weekly / monthly / none); for weekly: weekday picker (one or more); for monthly: day-of-month picker (one or more, or single day for MVP). Optional is_active toggle. Russian UI only. Edit: add/remove/reorder steps (removed steps soft-deleted for historical logs). Elegant cards or checklists, not tables.

4. **Routine view (execution)** — For selected day (default today): show **only routines due for that day** (Phase 2F). Due = cadence daily every day; weekly on chosen weekdays; monthly on chosen days of month; none/unset = always due (MVP: same list, no separate section). Optional: separate section for unscheduled. Tap step to mark done for that day. Optional “Mark routine done”. Persist to beauty_logs per step per day. Can be on Today page or in Beauty.

5. **Progress photos (Phase 2D, enhanced in 2E)** — Sub-section or tab within Beauty: upload face/hair photo (tied to a day; **Phase 2E:** optional related routine, notes, and soft ratings—face condition, hair quality, hair length feeling—on a 4-level gentle scale). Edit flow allows changing optional routine, notes, and ratings. Display saved photos in a **simple gallery or timeline** (by date/area); detail view shows optional routine and ratings. Visual, calm, personal; all UI text in Russian. No before/after comparison, routine scheduling, or AI analysis in Phase 2E.

6. **Optional: This week** — Soft summary (routines completed X days). Informational only.

**Interactions:** Add/edit product = modal (photo, name, category, area, time_of_day, notes). Build routine = add/reorder/remove steps (remove = soft-delete). Mark step done = tap → persist; optional sound/sparkle. Russian UI; calm, personal, diary-like.

---

### 3.4 Wardrobe (Phase 3A: Items Only)

**Purpose:** Library of clothing items as **visual cards**—the user’s digital closet. Phase 3A is items only: add, edit, delete, filter. No Outfit Builder or Outfit Planner in this phase.

**Layout:** Grid of cards (e.g. 2 columns on mobile, 3–4 on desktop). Optional filter by category (top, bottom, dress, shoes, accessory). Visual cards, not a raw admin table.

**Structure:**

1. **Screen title**
   - “Гардероб” (Wardrobe). Optional category filter.

2. **Item grid**
   - Each item = card: photo (dominant), name, category; optional color, season. Tap → detail or edit (full photo, name, category, color, season, notes). Edit / Delete. No “Use in outfit” in Phase 3A.

3. **Add item**
   - “+ Add item”. Flow: upload/take photo → name, category (top / bottom / dress / shoes / accessory), optional color, season, notes → save. New card appears in grid.

4. **Phase 3A scope**
   - No “New outfit” or “Plan outfits” buttons yet. Those belong to Phase 3B and Phase 4.

**Interactions:** Delete with soft confirmation. All visible UI text in Russian. Outfit builder and outfit planning are not implemented in Phase 3A.

---

### 3.5 Outfit Builder (Phase 3B)

**Purpose:** Combine wardrobe items into saved outfits. User assigns items to **slots** (top, bottom, dress, outerwear, shoes, accessory), names the outfit (and optional notes), and saves. Phase 3B: no outfit planning by date, no display on Home or Today.

**Layout:** Two main areas: **wardrobe** (scrollable list or grid of items) and **outfit canvas** with **slots**. On mobile, canvas can be below wardrobe; on desktop, side-by-side. Visual, card-based. All visible UI text in Russian.

**Structure:**

1. **Header**
   - "New outfit" / "Edit outfit". "Cancel" / "Back".

2. **Wardrobe source**
   - All (or filtered) wardrobe items as selectable/draggable cards. User picks an item then assigns it to a slot, or drags onto slot.

3. **Outfit canvas — slots**
   - Slots: **top**, **bottom**, **dress**, **outerwear**, **shoes**, **accessory**. Each slot shows one assigned item (thumbnail) or placeholder. MVP may allow empty slots. One item per slot; same item cannot appear twice.

4. **Outfit name and notes**
   - Name (required). Optional notes field.

5. **Save**
   - "Save" creates or updates the outfit; success feedback; return to "My outfits" list. No link to Outfit Planner or calendar in Phase 3B.

6. **My outfits list (Phase 3B)**
   - List or grid of saved outfit cards (name + composed preview, e.g. thumbnails by slot). Tap to view detail or edit; delete with confirmation.

**Interactions:** Assign item from wardrobe to slot (tap or drag). Remove from slot (e.g. X). Name required. Save → success feedback. No "Plan outfits" in Phase 3B.

### 3.6 Outfit Planner (Phase 3C)

**Purpose:** Allow the user to **assign a saved outfit to a specific date** and view the planned outfit for a selected day. Simple flow: from outfit card or outfit detail, user chooses a date to plan; or by date, user assigns/changes/clears the outfit. Optional status (planned / worn / skipped) and notes per planned day. Home and Today can show “today’s planned outfit”. No complex calendar or drag-and-drop weekly grid in Phase 3C.

**Layout:** Simple planning flow: (1) From “My outfits” or outfit detail: “Plan for date” → date picker → confirm. (2) Or: pick a date (simple date picker or list) → show planned outfit for that date; assign / change / clear. Optional status and notes for the planned day.

**Structure:**

1. **Plan from outfit**
   - From outfit card or outfit detail: “Plan for date” (or “Assign to date”) → date picker → confirm. Creates/updates planned_outfits row (user_id, outfit_id, planned_date, status, notes).

2. **View by date**
   - User selects a date → show planned outfit for that date (if any). Option to change outfit, clear, or set status (planned / worn / skipped) and notes.

3. **Today / Home**
   - When planned_outfits has a row for current date: show “planned outfit” card (outfit name, preview). Tap to view detail or change. If none: empty state or “Plan your look” CTA.

4. **Status (optional)**
   - For a planned day: optional control to mark as planned / worn / skipped; optional notes field. All visible UI text in Russian.

**Interactions:** Assign outfit to date (from outfit or by date). View planned outfit for selected date. Change or clear. Optionally set status and notes. One outfit per user per day.

### 3.7 Diary / History

**Purpose:** Calendar or timeline of past days so the user can open any day and see (or edit) that day’s record—same structure as Today but for a chosen date.

**Layout:** Either **timeline** (list of days, most recent first) or **calendar** (month grid). Tapping a day opens the day view (same layout as Today).

**Structure:**

1. **Screen title**
   - “Diary” or “History”. Optional view toggle: Timeline / Calendar.

2. **Timeline view**
   - Rows: date, optional thumbnail (first daily photo or mood icon), optional first line of journal or “No entry”. Tap row → day view for that date.

3. **Calendar view**
   - Month grid. Dots or subtle indicator on days that have content (journal, photo, or any activity). Tap date → day view.

4. **Day view**
   - Reuses Today page layout and components but for the selected date. Data loaded for that `entry_date`. “Back” → Diary list/calendar. Edits persist to that day.

**Interactions:** Scroll timeline or change month. Tap day → navigate to day view. Optional search by date or journal text if in scope.

---

### 3.8 Settings

**Purpose:** User preferences: sound on/off, water target, timezone, and any future options (theme, habits, notifications). Single private user only.

**Layout:** Single-column list of settings groups. No dashboard; simple, scannable list.

**Structure:**

1. **Screen title**
   - “Settings”.

2. **Sound**
   - Toggle: “Sounds” (e.g. bubble, sparkle on water/routine/task complete). On/off. Optional volume if needed.

3. **Water**
   - “Daily water goal”: number input or stepper (e.g. 1500–3000 ml, step 250). Stored in `profiles.water_goal_ml`.

4. **Timezone**
   - Picker or dropdown for “Timezone” (e.g. “Europe/Berlin”). Used for “today” and date display. Stored in `profiles.timezone`.

5. **Optional**
   - “Profile”: display name, avatar. “Data” or “About”: app version, privacy note (data stays on device/account). No team or sharing options.

**Interactions:** All changes save on change (or “Save” button). No destructive actions unless “Delete account” is in scope (handled separately).

---

## 4. Screen Summary Table

| Screen          | Role                         | Primary nav | Key components |
|-----------------|------------------------------|-------------|-----------------|
| Home            | Moodboard dashboard          | Tab         | Greeting, outfit card, water, beauty preview, focus, quick actions |
| Today           | Daily record for one day     | Tab         | Date header, habits, beauty, tasks, water, mood, notes, daily photo |
| Beauty          | Product library + routines + execution + progress | Tab         | Product library, routine builder (Phase 2F: scheduling), routine view (due only), progress photos (Phase 2) |
| Wardrobe        | Clothing item library (Phase 3A: items only) | Tab         | Item grid (visual cards), add/edit/delete item; photo, name, category, color, season, notes. No Outfit Builder/Planner in 3A. |
| Outfit Builder  | Compose outfit from items (Phase 3B: slots, save, "My outfits") | From Wardrobe | Wardrobe source, slot canvas (top/bottom/dress/outerwear/shoes/accessory), name, notes, save; no Plan/calendar in 3B |
| Outfit Planner (Phase 3C) | Assign outfit to date; view by date | From Wardrobe/Home/outfit | Plan from outfit (date picker) or by date; status (planned/worn/skipped), notes; today's outfit on Home/Today |
| Diary           | Past days list/calendar      | Tab         | Timeline or calendar, day view (same as Today) |
| Settings        | Preferences                  | Tab         | Sound, water goal, timezone, profile |

---

## 5. Cross-Screen Consistency

- **Today vs Diary day view:** Same layout and sections; only the date and data source differ. Reuse one “Day” page component with a `date` prop.
- **Water widget:** Same component on Home and Today for the current day; single source of truth (today’s `daily_entry.water_ml`).
- **Planned outfit:** Home and Today both show “today’s planned outfit” from the same query (`planned_outfits` where `planned_date = today`). One shared component or hook.
- **Focus:** Task list and timer can live on Today; Home shows a compact “next task” + Start. Timer state (running task, remaining time) can be global (e.g. context or store) so it persists across Home ↔ Today.

---

## 6. Document History

| Version | Date       | Change          |
|---------|------------|-----------------|
| 1.0     | 2025-03-15 | Initial UI architecture |
| 1.1     | 2025-03-15 | Phase 2F: routine scheduling in builder (cadence, weekly/monthly pickers); Today shows only due routines; optional “Сегодняшний уход” / “Other routines” |
| 1.2     | 2025-03-15 | Phase 3A: Wardrobe items only—visual cards grid, add/edit/delete (photo, name, category, color, season, notes); no Outfit Builder or Planner links |
| 1.3     | 2025-03-15 | Phase 3B: Outfit Builder—slots (top, bottom, dress, outerwear, shoes, accessory), create/save outfit, "My outfits" list; no planning by date or Home/Today |
| 1.4     | 2025-03-15 | Phase 3C: Outfit planning by date—assign outfit to date (planned_outfits); view by date; optional status (planned/worn/skipped), notes; simple flow; today's outfit on Home/Today |

---

*Implementation (routes, components, and layout) should follow this document and align with [Product Specification](./product-spec.md), [Product Features](./product-features.md), and [SDD](./sdd.md).*
