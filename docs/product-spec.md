# MärTik — Product Specification

**Version:** 1.0  
**Document type:** Product specification  
**Audience:** Engineering, design, stakeholders

---

## 1. Product Vision

### 1.1 What is MärTik?

MärTik is a **personal digital life diary and visual life dashboard** for a single private user. It is not a productivity tool for teams or a traditional task manager. It is a private space where one person can capture, reflect on, and gently structure their daily life—from journaling and beauty tracking (routines) to wardrobe planning, focus sessions, and weekly reflection—all presented through a dreamy, editorial-style interface.

### 1.2 Core Philosophy

- **Life-first, not task-first.** The primary unit is the **day** as a lived experience, not the task as a unit of output.
- **Reflection over efficiency.** The product supports looking back (journal, progress photos, weekly reflection) as much as looking forward (planning outfits, focus timers).
- **One user, one life.** MärTik is designed for a single private user. There are no workspaces, no sharing, no collaboration—only a personal digital companion.
- **Beauty in the mundane.** Routine tracking (skincare, water, outfits) is framed as self-care and self-expression, not as chores to complete.

### 1.3 Strategic Differentiation

| Traditional task manager | MärTik |
|-------------------------|--------|
| Tasks and projects are the center | The **day** and **life narrative** are the center |
| Optimized for output and completion | Optimized for reflection, routine, and feeling good |
| Often corporate, utilitarian UI | Editorial, moodboard-style, emotionally resonant UI |
| Shared workspaces, teams, deadlines | Single private user, no sharing |
| Task lists and boards | Journal + routines + wardrobe + focus + reflection in one place |

MärTik does not replace a task manager for heavy project work; it complements life by making the personal, daily layer visible and beautiful.

---

## 2. Emotional Design Direction

### 2.1 Emotional Tone

The product should feel:

- **Magical** — Delightful micro-interactions (e.g. gentle sparkles, soft sounds) that make actions feel special without being childish.
- **Calm** — No urgency, no red alerts, no overwhelming lists. Plenty of whitespace, soft transitions, and a pace that doesn’t rush the user.
- **Visually beautiful** — Editorial, moodboard-like layouts: imagery, cards, and typography that could sit in a lifestyle magazine or a premium app.
- **Personal** — The dashboard reflects *their* life: their face progress, their wardrobe, their journal. It should feel like “my place.”
- **Inspiring** — Seeing their own progress (skin, hair, outfits, reflections) should feel motivating, not judgmental.

### 2.2 Main Screen: Editorial Moodboard, Not Dashboard

The main screen must **not** feel like a corporate productivity dashboard (widgets, charts, dense task lists). It should feel like a **dreamy editorial moodboard**:

- **Hero:** Current day as a narrative moment (date, optional journal snippet, planned outfit).
- **Visual blocks:** Large, image-led cards (e.g. today’s outfit, water glass, beauty check-in, focus block) rather than rows of text.
- **Atmosphere:** Soft gradients, gentle shadows, curated typography. Optional subtle motion (e.g. parallax, gentle hover states).
- **No clutter:** No notification badges screaming for attention; information is present but calm.

### 2.3 Interaction Philosophy

- **Soft gamification:** Bubble sounds, gentle sparkles, or subtle confetti on meaningful actions (e.g. completing a routine step, logging water, finishing a focus block). Never punitive or stressful.
- **Low friction:** Adding a journal entry, marking a product as used, or logging water should be quick and pleasant.
- **Forgiving:** Missing a day or skipping a routine is neutral—no guilt-inducing streaks or shaming. The tone is “when you’re ready” not “you must.”

---

## 3. Feature Overview & User Flows

### 3.1 Daily System

**Concept:** Each day is a first-class record. The user can open “today” and see everything that belongs to that day: journal, routines, planned outfit, focus, water, and reflection (for past days).

**User flow:**

1. User lands on main screen → sees **today** as the default view.
2. User can open “today” to add/edit: journal entry, routine check-ins, planned outfit, focus sessions, water.
3. User can navigate to past days (e.g. calendar or timeline) to view or edit that day’s record.
4. Weekly reflection (see below) can aggregate or reference specific days.

**Data:** One “day” record per calendar day: journal text, routine completion flags, outfit reference, focus log, water total, optional mood or tags.

---

### 3.2 Beauty System (Phase 2)

**Concept:** Beauty in MärTik has two pillars: **products** (visual, collectible cards) and **routines** (ordered steps built from those products). The user builds a product library, assembles routines (e.g. morning routine, evening routine, hair routine), and logs completion per day. Historical daily logs remain correct even when products or routines are edited later.

**Products:**

- User creates beauty product cards with photo, name, category, area (face / hair / body), time of day (morning / evening / anytime), and optional notes.
- Products are visual and collectible—the library should feel personal and satisfying to browse.

**Routines:**

- User creates routines (e.g. “Morning routine”, “Evening routine”, “Hair routine”). Each routine is an ordered list of steps; each step references one beauty product.
- Routines are displayed as elegant visual cards or checklists, not boring admin tables.

**Daily logging:**

- On the Today page (and in the Beauty section), the user marks routine steps as completed for that specific day.
- Completion is stored per day. Historical daily logs are never overwritten when the user later edits or reorders routines or products.

**Routine scheduling (Phase 2F):**

- Each beauty routine can have an **optional schedule**: daily, weekly, or monthly. For **weekly** routines the user chooses one or more weekdays; for **monthly** routines, one or more days of the month (e.g. 1st and 15th). On the **Today** page, only routines that are **due** for the selected day are shown in the main list (e.g. “Сегодняшний уход”). Routines without a schedule can be treated as always visible in the same list (recommended MVP) or shown in a separate “Other routines” section. Scheduling does not change historical beauty logs; it only controls which routines appear on which day.

**Face and hair progress (Phase 2D, enhanced in 2E):**

- User can upload **beauty progress photos** (face or hair) and attach them to a specific day. Each photo belongs to the user, a day (via daily entry), and an area (face / hair); optional notes are supported. In **Phase 2E**, the user can optionally **link a progress photo to a beauty routine** (e.g. “evening routine”) and add **soft qualitative ratings** (e.g. face condition, hair quality, hair length feeling) on a gentle 4-level scale—no harsh numeric scoring; the UI stays warm and diary-like. Photos are stored separately from routine completion; the user views them in a simple **timeline or gallery** in the Beauty section. The interface is visual, calm, and personal; all visible text in Russian. Advanced comparison mode (e.g. side-by-side before/after) and AI analysis are postponed until later; **Phase 2F** adds routine scheduling as above.

---

### 3.3 Wardrobe System

**Concept:** The user builds a digital wardrobe by uploading photos of clothing items (tops, bottoms, shoes, accessories) as cards. Items can be combined into **outfits**.

**User flow:**

1. **Setup:** User uploads item photos, adds labels (e.g. “White linen shirt”), optionally categories (top, bottom, dress, shoes, etc.).
2. **Outfit creation:** User selects multiple items and saves as an outfit (e.g. “Summer Friday”).
3. **Outfit planning:** User assigns an outfit to a specific **date** (today, tomorrow, or any day).
4. **On the day:** The main dashboard shows the **planned look** for that day (outfit card with photo and items), so the user sees “what I’m wearing today” at a glance.

---

### 3.4 Focus System

**Concept:** Light task management with **timers**: tasks can have countdown (e.g. 25 min) or stopwatch modes. Purpose is focus sessions, not full project management.

**User flow:**

1. User creates a focus task (e.g. “Read 30 min”) and optionally sets a duration.
2. User starts timer (countdown or stopwatch).
3. On completion, optional soft celebration (sound, sparkle).
4. History of focus sessions can feed into daily record or a simple “focus this week” summary.

---

### 3.5 Water Tracking

**Concept:** Simple, satisfying water intake tracking with a **visual +250 ml** interaction and a **filling glass animation**.

**User flow:**

1. On dashboard or dedicated block, user sees a glass (or bottle) illustration.
2. Each tap (or click) adds +250 ml; the glass fills visually (e.g. level rises).
3. Optional daily goal (e.g. 2 L) with gentle progress indication—no harsh “you failed” messaging.
4. Persisted per day; can be part of the “today” record.

---

### 3.6 Weekly Reflection

**Concept:** A dedicated space for weekly reflection—looking back at the week (journal snippets, mood, highlights, gratitude, or freeform notes).

**User flow:**

1. User opens “Weekly reflection” (e.g. from main nav or end-of-week prompt).
2. User sees the past 7 days (or current week) with optional summaries (e.g. days journaled, focus time, routines completed).
3. User writes reflection (structured prompts or freeform).
4. Reflections are stored and viewable later (e.g. “Past weeks”) for continuity.

---

### 3.7 Visual Moodboard-Style Dashboard (Main Screen)

**Concept:** The main screen is the emotional and functional heart: a single, scrollable (or paged) moodboard for **today**.

**Suggested blocks (order and presence can vary):**

1. **Day hero** — Date, optional one-line or snippet (e.g. from journal or intention).
2. **Planned outfit** — Card showing today’s outfit (if set) with image and item names.
3. **Water** — Filling glass +250 ml interaction.
4. **Beauty** — Quick morning/evening check-in or “Mark routine” with soft feedback.
5. **Focus** — Current or next focus task + start timer.
6. **Journal** — Quick add or “Open today’s journal.”
7. **Progress** — Optional teaser (e.g. “Your skin progress this month”) linking to beauty progress.
8. **Weekly reflection** — If it’s reflection day, a gentle CTA to open weekly reflection.

Navigation to deeper sections (full journal, full wardrobe, beauty progress, past days) is clear but secondary; the main screen stays uncluttered and image-led.

---

## 4. How MärTik Is Different From a Normal Task Manager

### 4.1 Structural Differences

- **Primary entity:** In a task manager, the primary entity is the **task** (or project/epic). In MärTik, the primary entity is the **day** (and the life narrative that unfolds day by day). Tasks (focus items) exist in service of the day, not the other way around.
- **Success metric:** Task managers optimize for completion (tasks done, velocity). MärTik optimizes for **presence and reflection**—did I show up for my routines? Did I capture how I felt? Did I plan something that made me feel good?
- **Scope:** Task managers often handle work, side projects, and sometimes personal to-dos. MärTik is **purely personal**: journal, body/beauty, wardrobe, focus, and reflection. No shared projects, no team visibility.

### 4.2 Functional Differences

- **Journaling and reflection** are first-class, not “notes” attached to tasks.
- **Routine and habit tracking** (beauty, water) are visual and gentle, not checklist-style productivity.
- **Wardrobe and outfit planning** have no analogue in standard task apps; they are about self-expression and daily intention.
- **Progress over time** (face, hair, possibly mood) is about seeing oneself, not delivering output.
- **Focus timers** are lightweight (countdown/stopwatch) and supportive, not a full project/time-tracking system.

### 4.3 Experience Differences

- **UI/UX:** Corporate dashboards vs. editorial moodboard (see §2.2).
- **Tone:** Urgent and efficient vs. calm, magical, and personal.
- **Gamification:** Streaks and points vs. soft sounds and sparkles, with no guilt for missing days.
- **User model:** Single private user vs. multi-user/workspace/team.

---

## 5. Technical Context (Summary)

- **Hosting:** Netlify (static or serverless).
- **Backend / data:** Supabase (auth, database, storage for images).
- **User model:** Single private user only (one account; no teams, no sharing).
- **Data scope:** All data is private to that user; no collaboration features in scope.

---

## 6. Out of Scope (for This Spec)

- Multi-user or team features.
- Public sharing of journal, outfit, or progress.
- Heavy project management (Gantt, dependencies, assignees).
- Integrations with calendar/email (can be considered later).
- Native mobile apps (web-first; responsive is in scope).

---

## 7. Document History

| Version | Date       | Author / change |
|---------|------------|-----------------|
| 1.0     | 2025-03-15 | Initial product spec |
| 1.1     | 2025-03-15 | Phase 2F: routine scheduling (daily/weekly/monthly); Today shows only due routines; MVP behavior for unscheduled |

---

*This document is the single source of truth for product vision, emotional design, and user flows. Technical architecture and API design should align with this spec.*
