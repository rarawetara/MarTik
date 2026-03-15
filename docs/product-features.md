# MärTik — Full Feature Specification

**Version:** 1.0  
**Document type:** Feature specification  
**Related:** [Product Specification](./product-spec.md)

This document defines all main modules of MärTik with purpose, user flow, and interactions. It assumes a single private user, editorial moodboard-style UI, and the emotional design direction described in the product spec.

---

## 1. Home Dashboard

### Purpose

The Home Dashboard is the **landing experience** of MärTik: a magical, moodboard-style screen that greets the user and surfaces the most relevant “today” information at a glance. It should feel like opening a personal editorial spread—not a productivity dashboard. The goal is to orient the user, invite gentle action (water, beauty, focus, outfit), and create a sense of “this is my day.”

### User Flow

1. User opens the app → lands on Home Dashboard.
2. User sees the current day as a narrative moment (date, optional greeting or intention).
3. User scrolls or swipes through **widgets** (order can be configurable or fixed):
   - **Day hero** — Date, optional one-line (e.g. journal snippet or intention).
   - **Planned outfit** — Card for today’s outfit (if assigned); tap to view details or change.
   - **Water** — Filling glass; tap to add +250 ml.
   - **Beauty** — Quick morning/evening check-in or “Mark routine”; tap to open full beauty view.
   - **Focus** — Next or current focus task with start timer; tap to open Focus system.
   - **Journal** — “Add a note” or “Open today’s journal”; tap to go to Today page journal section.
   - **Progress** — Optional teaser (e.g. “Your progress this month”) linking to Beauty progress.
   - **Weekly reflection** — If relevant (e.g. end of week), gentle CTA to open Weekly reflection.
4. From any widget, user can tap through to the corresponding module (Today, Beauty, Wardrobe, Focus, etc.).
5. Global navigation (e.g. bottom nav or sidebar) allows direct access to Today, Beauty, Wardrobe, Focus, Diary history, Settings.

### Interactions

- **Scroll / swipe:** Smooth, possibly parallax or subtle fade as widgets enter view; no jagged transitions.
- **Tap widget:** Navigate to full module or expand inline (e.g. water can be tap-to-add on dashboard without leaving).
- **Water:** Single tap adds +250 ml; glass fills with animation; optional soft sound or sparkle on add; progress toward daily goal shown gently (e.g. “1.5 L”).
- **Beauty:** Tap “Morning done” or “Evening done” with optional soft feedback (sound, checkmark animation); incomplete state is neutral, not alarming.
- **Focus:** “Start” begins timer; minimal distraction (e.g. compact timer on dashboard or slide-over).
- **Planned outfit:** Card shows outfit image/name; tap to see items or change outfit for today.
- **No aggressive notifications:** No red badges or “you missed X”; information is present and calm. Optional gentle reminder tone (e.g. “You haven’t logged water yet”) only if designed as non-guilt-inducing.

---

## 2. Today Page

### Purpose

The Today page is the **daily life record**: one page per day containing habits, beauty routine status, tasks (focus items), notes (journal), mood, water tracking, and photos. It is the central place to both *plan* and *capture* a single day. Everything that belongs to “this day” lives here, making the day a first-class entity.

### User Flow

1. User navigates to “Today” (from Home or nav).
2. User sees the **date** clearly (and can switch to another day via date picker or timeline link).
3. User scrolls through sections (order can be fixed or collapsible):
   - **Habits** — Quick toggles or checkmarks for habits (e.g. morning routine, exercise, reading); optional link to custom habit list.
   - **Beauty routine** — Morning/evening product check-off for this day; can be summary (e.g. “Morning ✓”) or expand to list of products used.
   - **Tasks** — List of focus tasks for today; add, complete, or start timer from here; completion triggers soft feedback.
   - **Notes (journal)** — Freeform text area for the day’s journal; auto-save; optional prompts or mood tag.
   - **Mood** — Optional mood selector (e.g. icons or words) for the day; single selection or none.
   - **Water** — Same +250 ml / filling glass as on dashboard; total for the day visible; persists with the day record.
   - **Photos** — Optional daily photos (e.g. one or more images attached to this day); upload or camera; displayed as a small gallery.
4. User edits any section in place; changes persist to that day.
5. User can navigate to “yesterday” or “tomorrow” (or pick a date) to view/edit that day’s record.
6. Link to “Diary history” for timeline/calendar of all past days.

### Interactions

- **Section expand/collapse:** Optional; sections can be always visible or collapsible to reduce scroll.
- **Habits:** Tap to toggle done/not done; soft checkmark or gentle animation; no penalty for “not done.”
- **Beauty:** Tap “Mark morning” / “Mark evening” or tap individual products; checkmarks with optional sound/sparkle.
- **Tasks:** Add task (inline or modal); tap to start timer or mark complete; completion = soft celebration.
- **Notes:** Focus to edit; auto-save on blur or debounced; optional character count or “saved” indicator.
- **Mood:** Tap to select; one selection per day; clear selection allowed.
- **Water:** Same as dashboard: tap to add +250 ml; glass fills; total and optional goal shown.
- **Photos:** Tap to add (upload or capture); tap photo to view full or delete; drag to reorder if multiple.
- **Date change:** Date picker or prev/next day; smooth transition to that day’s data; “Today” button to return to current day.

---

## 3. Beauty System (Phase 2)

Beauty includes **products** (cards) and **routines** (ordered steps built from those products). Daily completion is logged per day and preserved when routines or products are edited later.

### 3a. Beauty Products

**Purpose:** A visual, collectible library of skincare, haircare, and body products. Each product is a card with photo and metadata; products can be used in one or more routines.

**User flow:**

1. User opens “Beauty” from nav or Home widget → can open **Product library**.
2. User **adds product:** Upload or take photo → enter name (e.g. “Vitamin C serum”), category (e.g. cleanser, serum, moisturizer), area (face / hair / body), time of day (morning / evening / anytime), and optional notes → save. Product appears as a card in the library.
3. User can **edit or delete** a product (tap card or menu). Delete with soft confirmation; if product is used in routines, show optional warning.
4. User can **filter or sort** (e.g. by category, area, time of day). Products should feel visual and collectible—photo-first cards, not a plain list.

**Interactions:**

- Add product: photo upload, name, category, area, time_of_day, notes → save; card appears with subtle animation.
- Edit/delete: via card tap or long-press menu; soft confirmation on delete.
- Filter/sort: chips or dropdown by category, area, or time of day.

### 3b. Beauty Routines

**Purpose:** User-defined routines (e.g. morning routine, evening routine, hair routine). Each routine is an ordered list of **steps**; each step references one beauty product. Routines are displayed as elegant visual cards or checklists. **Phase 2F** adds optional **scheduling**: a routine can repeat daily, weekly (with chosen weekdays), or monthly (with chosen days of the month).

**User flow:**

1. From Beauty, user opens **Routine builder** (or “My routines”).
2. User **creates a routine:** Name it (e.g. “Morning routine”, “Hair routine”) and add steps. Each step = one product from the library, in order (e.g. cleanser → serum → moisturizer). Reorder by drag-and-drop.
3. User can **set schedule (Phase 2F):** Optionally choose cadence: daily, weekly, or monthly. For weekly: pick one or more weekdays. For monthly: pick one or more days of the month (e.g. 1st, 15th). Routines without a schedule are treated as "always due" (see Today behavior below).
4. User can **edit routine:** Add step (pick product), remove step, reorder steps. Removing a step does not delete the product from the library; it only removes it from this routine. For historical accuracy, “removed” steps are soft-deleted so past daily logs still show what was completed.
5. User **views routines** as elegant cards or checklists—not boring admin tables.

**Interactions:**

- Create routine: name + add steps (select product from library), set order.
- **Scheduling (Phase 2F):** Cadence selector (daily / weekly / monthly / none); for weekly: weekday picker (one or more); for monthly: day-of-month picker (one or more, or single day for MVP). Russian UI only.
- Edit: add/remove/reorder steps; optional “Mark all done” for today when executing.
- Visual: routine card shows name and list of product thumbnails or names in order.

### 3c. Daily Routine Logging

**Purpose:** On the Today page (and in the Beauty routine view), the user marks **routine steps** as completed for that specific day. Completion is stored per day and per step; historical logs are never overwritten when routines are changed later. **Phase 2F:** Only routines that are **due** for the selected day are shown in the main list (e.g. "Сегодняшний уход").

**User flow:**

1. On **Today page:** Beauty section shows **only routines due for the selected day** (Phase 2F). For each due routine, steps are listed; user taps to mark “done” for that day. **MVP recommendation:** Routines with no schedule (cadence = none or unset) are treated as **always due** and appear every day in the same list—no separate section. Alternatively, unscheduled routines can be shown in a separate section (e.g. “Other routines”) so the main list is strictly “due today”.
2. In **Beauty section:** Same behaviour—select day (default today), show **due** routines and steps; mark steps completed for that day.
3. **Persistence:** Each completion is stored as “routine step X completed on daily_entry Y”. If the user later edits the routine (reorder, remove a step), past days still show the correct completion state for what was there that day (via step IDs and soft-delete of steps). Scheduling does not modify or corrupt historical logs; it only filters which routines are displayed for a given day.

**Interactions:**

- Mark step done: tap step → persisted to DB; optional soft sound or sparkle.
- “Mark routine done”: mark all steps in that routine for the day at once; gentle celebration.
- View past day: when viewing a past day, show due routines for that day and their completed steps (read-only or editable depending on design).

---

## 4. Beauty Progress (Phase 2D, enhanced in 2E)

### Purpose

Beauty progress lets the user **save face or hair progress photos by day** and view them later in a **history or gallery**. Each photo belongs to a user, a specific day (via daily entry), and an area (face or hair); the user can optionally add notes. **Phase 2E** adds optional **linking to a beauty routine** and **soft qualitative ratings** (face condition, hair quality, hair length feeling) on a gentle 4-level scale—suitable for emoji-style or soft-label UI; no harsh numeric scoring. **Phase 2F** adds routine scheduling (daily/weekly/monthly) to the routine builder; comparison mode and AI analysis remain out of scope.

### User Flow

1. User opens “Progress photos” from the Beauty section (e.g. tab “Прогресс”).
2. User sees a **timeline or gallery** of saved progress photos (face and/or hair), with date, area, and optionally linked routine and ratings.
3. User can **upload progress photo:** choose area (Face or Hair) → pick or capture image → optionally choose day (default: today) → **optional:** related routine, notes, soft ratings (e.g. face condition, hair quality, hair length feeling) → save. Photo is stored for that day and area with metadata.
4. User can view a photo; edit or delete. **Edit** allows changing optional routine link, notes, and soft ratings.
5. (Postponed) Compare mode (side-by-side) and AI analysis. Phase 2F adds routine scheduling to the routine builder (see §3b, §3c).

### Interactions

- **Upload / edit:** Area (face/hair); optional day; **optional related routine** (dropdown of user’s routines); optional notes; **optional soft ratings** (4-level scale: e.g. low / medium / good / great—UI shows warm, soft labels or emoji-style controls). Save; photo appears in gallery/timeline.
- **Gallery/timeline:** List or grid by date; tap photo for detail; show optional routine name and ratings if set; optional delete or edit (routine, notes, ratings).
- **Tone:** Calm, personal, non-judgmental; no percentages or harsh scoring. All visible UI text in Russian.

---

## 5. Wardrobe System

### Purpose

The Wardrobe system is the user’s **wardrobe library** (digital closet): a collection of **cards** representing real clothing items (tops, bottoms, dresses, shoes, accessories, etc.) that the user uploads. Each card has a photo and optional label/category. The purpose is to have a single source of truth for “what I own” and to use these cards later in the **Outfit builder** and **Outfit planning**.

### User Flow

1. User opens “Wardrobe” from nav.
2. User sees a **grid or list of clothing cards** (photo + label); optional filter by category (e.g. tops, bottoms, shoes).
3. User **adds item:** Tap “Add item” → upload or take photo of clothing → optional crop → enter name (e.g. “White linen shirt”) and category → save; card appears in wardrobe.
4. User can **edit** card: tap or long-press → change photo, name, or category.
5. User can **delete** card: with soft confirmation; if item is part of outfits, optional warning (“Used in X outfits”).
6. User can **search** by name or filter by category to find items quickly.
7. From a card, user has a clear path to “Add to outfit” or “Create new outfit” (linking to Outfit builder).

### Interactions

- **Add item:** Tap “Add item” → photo source (upload/camera) → crop → name + category → save; card appears with subtle animation (e.g. fade-in).
- **Card tap:** Opens detail (full photo, name, category, “Use in outfit” CTA); or direct “Add to outfit” from card.
- **Edit/delete:** Via card menu or long-press; edit form pre-filled; delete with confirmation; optional list of outfits using this item.
- **Filter/sort:** Dropdown or chips for category; optional sort by name or date added.
- **Visual style:** Cards should feel tactile and beautiful—photo-first, consistent aspect ratio, soft shadows; editorial rather than spreadsheet.

---

## 6. Outfit Builder

### Purpose

The Outfit builder is a **drag-and-drop (or selection) interface** where the user combines **wardrobe cards** into a single **outfit**. An outfit is a named look (e.g. “Summer Friday”) that can be reused and assigned to dates in **Outfit planning**. The experience should feel creative and playful—like styling on a moodboard.

### User Flow

1. User opens “Outfit builder” (or “New outfit” from Wardrobe or Outfit planning).
2. User sees two areas: **wardrobe items** (source) and **outfit canvas** (destination). Alternatively: pick-from-wardrobe flow (multi-select then save as outfit).
3. **Drag-and-drop:** User drags clothing cards from wardrobe onto the outfit canvas; cards stack or arrange in a predefined layout (e.g. mannequin slots: top, bottom, shoes, accessory).
4. **Selection:** Alternatively, user selects multiple items from wardrobe (e.g. checkboxes) then taps “Save as outfit”; items are associated with the outfit.
5. User **names the outfit** (e.g. “Coffee date look”) and saves; outfit appears in “My outfits” list with a composed preview (e.g. collage of items or mannequin view).
6. User can **edit outfit:** Add/remove items, change name, replace photo if outfit has a custom cover image.
7. User can **delete outfit;** soft confirmation.

### Interactions

- **Drag-and-drop:** Drag card from wardrobe grid to canvas; drop zone highlights; card snaps to slot or position; optional sound on drop.
- **Slots (optional):** Canvas has slots (e.g. top, bottom, shoes, accessory); dropping fills next available or specific slot; user can reorder by dragging within canvas.
- **Remove from outfit:** Drag card off canvas to “remove” or tap X on card in canvas; card returns to wardrobe in list.
- **Name & save:** Inline field or modal for outfit name; “Save” creates outfit and shows success (e.g. soft checkmark, “Saved”); redirect to “My outfits” or Outfit planning.
- **Preview:** Outfit card shows composed look (grid of item thumbnails or single composite image); tap to edit or assign to date.
- **Responsive:** On smaller screens, drag-and-drop can be replaced by “Select items” multi-select then “Add to outfit” for same outcome.

---

## 7. Outfit Planning

### Purpose

Outfit planning lets the user **assign outfits to specific future dates** (or today). On that date, the **Home dashboard** and **Today page** show the **planned look** so the user sees “what I’m wearing today” at a glance. This supports intention and reduces daily decision fatigue while keeping the experience personal and visual.

### User Flow

1. User opens “Outfit planning” (or “Plan outfit” from dashboard/Today when no outfit is set).
2. User sees a **calendar or date list** (e.g. next 7–14 days or month view) with optional indicators for which days already have an outfit assigned.
3. User **assigns outfit:** Select a date → choose from “My outfits” list (from Outfit builder) → confirm; that date now shows the chosen outfit.
4. User can **change** assigned outfit for a date: select date → pick different outfit or “Clear” to remove assignment.
5. User can **create new outfit** from this flow (link to Outfit builder) then assign it.
6. On **the day:** Home dashboard and Today page display the planned outfit card (image, name, optional item list); user can tap to view details or change outfit for today.

### Interactions

- **Calendar/date picker:** Tap date to see assigned outfit (if any) and “Assign” / “Change” / “Clear.”
- **Assign:** Modal or side panel with list of saved outfits (thumbnails + names); tap to assign; confirmation (e.g. “Outfit set for March 16”); optional soft feedback.
- **Clear:** “Clear outfit” for date removes assignment; no penalty messaging.
- **Dashboard/Today:** Planned outfit appears as a card; tap to open detail or “Change outfit for today” (opens Outfit planning with today pre-selected).
- **Empty state:** If no outfits exist, CTA “Create your first outfit” → Outfit builder.

---

## 8. Focus System

### Purpose

The Focus system provides **light task management with a timer and focus mode**. Tasks are simple (title, optional duration); the user can run a **countdown** (e.g. 25 min) or **stopwatch**, with optional soft celebration on completion. The goal is to support focused work or rituals without the complexity of a full project manager—tasks exist in service of the day and well-being.

### User Flow

1. User opens “Focus” from nav or Home widget.
2. User sees **task list** (e.g. for today or “active” list): add, edit, complete, or start timer for each task.
3. User **creates task:** Tap “Add task” → enter title, optionally set default duration (e.g. 25 min) → save; task appears in list.
4. User **starts focus:** Tap “Start” on a task → timer starts (countdown or stopwatch, per task or global setting); optional full-screen or compact focus mode (minimal UI, optional ambient sound).
5. When **timer ends** (countdown reaches 0): optional notification or in-app alert; soft celebration (sound, sparkle); task can auto-complete or user marks complete.
6. User can **pause / resume / cancel** timer; optional log of completed focus sessions (e.g. “Today: 2 sessions, 50 min total”) on Today page or in Focus view.
7. Completed tasks can be hidden or shown in a “Completed today” section; no heavy reporting—just enough for daily awareness and weekly reflection.

### Interactions

- **Add task:** Inline or modal; title + optional duration; save adds to list with subtle animation.
- **Start timer:** Tap “Start” → countdown or stopwatch runs; large, readable timer; Pause / Resume / End buttons.
- **End/Cancel:** “End” stops timer; optional “Mark complete” with soft celebration (bubble sound, sparkle); “Cancel” discards session without completing.
- **Completion:** On complete, brief celebration; task moves to “Done” or checkmark state; optional session duration saved to day record.
- **Focus mode:** Optional full-screen or minimal view (timer only, mute distractions); exit returns to full Focus or Home.
- **Task list:** Reorder (drag) optional; edit/delete via task menu; no deadlines or priorities required—keep simple.

---

## 9. Weekly Reflection

### Purpose

Weekly reflection is a **dedicated space to look back at the past week**: habits, focus time, progress, and freeform reflection. It supports the product’s “reflection over efficiency” philosophy by giving the user a calm, structured way to review and optionally write (e.g. prompts or freeform). Data can be summarized from the daily records (habits, focus, water, beauty, mood) to reduce manual recall.

### User Flow

1. User opens “Weekly reflection” from nav or dashboard CTA (e.g. at end of week).
2. User sees **current or most recent week** (e.g. Mon–Sun) with optional **summary blocks**:
   - Days with journal entries, habits completed, focus time total, water average, beauty routines completed, mood distribution.
   - Optional simple visuals (e.g. bar or gentle chart) — nothing harsh or judgmental.
3. User can **write reflection:** Freeform text and/or structured prompts (e.g. “What went well?” “One thing to try next week”); auto-save.
4. User **saves** reflection; it is stored with that week and viewable later.
5. User can **browse past weeks** (e.g. list or calendar of weeks); tap to view that week’s summary and reflection.
6. No scoring or “productivity grade”—only gentle summarization and space for reflection.

### Interactions

- **Week selector:** Dropdown or “Previous week” / “Next week” to switch week; summary and reflection load for that week.
- **Summary blocks:** Read-only summaries from daily data; optional expand/collapse; no red/yellow/green—neutral or soft positive tone.
- **Reflection text:** Focus to edit; auto-save; optional prompts as placeholder or above field; “Saved” indicator when persisted.
- **Past weeks:** List of weeks (e.g. “Week of Mar 9”); tap to open; empty state if no reflection written (“Nothing written yet”).
- **Tone:** Copy like “Your week at a glance” or “Look back”; avoid “You only did X” or guilt-inducing language.

---

## 10. Diary History

### Purpose

Diary history is the **timeline or calendar of previous days**. It lets the user navigate to any past day to view or edit that day’s record (journal, habits, beauty, tasks, mood, water, photos). It reinforces that each day is a first-class record and that the user can always return to revisit or complete past entries.

### User Flow

1. User opens “Diary” or “History” from nav (or “View past days” from Today page).
2. User sees **timeline or calendar**:
   - **Timeline:** Chronological list of days (e.g. most recent first); each row shows date, optional thumbnail or first line of journal, and maybe mood or key stats (e.g. “Journal ✓, 1.5 L water”).
   - **Calendar:** Month grid with dots or indicators for days that have content (e.g. journal, photo, or any activity); tap date to open that day.
3. User **taps a day** → navigates to **Today page for that date** (read-only or editable depending on design).
4. User can **scroll or paginate** to load older days; optional search by date or by content (e.g. search journal text) if in scope.
5. Empty or low-activity days are still visible (e.g. date only); no “empty” shaming—user can add to any day later.

### Interactions

- **Timeline:** Scroll to load more; tap day row to open that day’s full record; optional swipe actions (e.g. “Open,” “Edit”).
- **Calendar:** Tap date → open that day; optional legend for “has journal,” “has photo,” “has focus” etc.; prev/next month.
- **Day view:** Same layout as Today page but for selected date; all sections editable; “Back to Diary” returns to timeline/calendar.
- **Search (optional):** Search icon → by date or by journal content; results as list of matching days; tap to open.
- **Visual:** Consistent with moodboard tone—soft, spacious; timeline could use cards or simple rows with subtle imagery (e.g. day’s first photo as thumbnail).

---

## Summary: Module Map

| Module           | Purpose in one line                                                                 |
|------------------|--------------------------------------------------------------------------------------|
| Home dashboard   | Moodboard-style landing with widgets (water, beauty, focus, outfit, journal, reflection). |
| Today page       | Single-day record: habits, beauty, tasks, notes, mood, water, photos.                |
| Beauty system    | Product library (cards) + routines (ordered steps) + daily step completion; progress photos; **Phase 2F:** optional routine scheduling (daily/weekly/monthly); Today shows only due routines. |
| Beauty progress  | Progress photos per day (face/hair), optional routine link and soft ratings (Phase 2E); upload + gallery/timeline; comparison and AI postponed. |
| Wardrobe system  | Wardrobe library: catalog of clothing items as cards (photo + name/category).       |
| Outfit builder   | Drag-and-drop (or select) to combine wardrobe items into named outfits.              |
| Outfit planning  | Assign outfits to future dates; show planned look on dashboard/Today.                |
| Focus system     | Tasks with countdown/stopwatch timer and soft completion feedback.                   |
| Weekly reflection| Week summary (habits, focus, etc.) + freeform/structured reflection.                 |
| Diary history    | Timeline or calendar of past days; open any day to view/edit.                       |

---

## Document History

| Version | Date       | Change        |
|---------|------------|---------------|
| 1.0     | 2025-03-15 | Initial feature spec |

---

*Feature implementation (UI and API) should follow this spec and align with [Product Specification](./product-spec.md) vision and emotional design.*
