import { supabase } from './supabase'
import type { BeautyRoutine, BeautyRoutineStep } from './supabase'
import { deduplicateByTimeSlot, isRoutineDue } from './beautyRoutineDue'

export const BEAUTY_HABIT_DAYS = 21

export type BeautySlotKind = 'morning' | 'evening'

type RoutineWithStepsLike = {
  routine: BeautyRoutine
  steps: ReadonlyArray<{ step: Pick<BeautyRoutineStep, 'id'> }>
}

function isoAddDays(iso: string, delta: number): string {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}

function expectedStepIdsForDate(routinesWithSteps: RoutineWithStepsLike[], dateStr: string): Set<string> {
  const due = routinesWithSteps.filter(({ routine }) => isRoutineDue(routine, dateStr))
  const deduped = deduplicateByTimeSlot(due)
  const ids = new Set<string>()
  for (const { steps } of deduped) {
    for (const { step } of steps) {
      ids.add(step.id)
    }
  }
  return ids
}

/** Шаги только утренней или только вечерней рутины, запланированной на этот день. */
function expectedStepIdsForSlot(
  routinesWithSteps: RoutineWithStepsLike[],
  dateStr: string,
  slot: BeautySlotKind
): Set<string> {
  const due = routinesWithSteps.filter(({ routine }) => isRoutineDue(routine, dateStr))
  const deduped = deduplicateByTimeSlot(due)
  const ids = new Set<string>()
  for (const { routine, steps } of deduped) {
    if ((routine.type ?? '') !== slot) continue
    for (const { step } of steps) {
      ids.add(step.id)
    }
  }
  return ids
}

async function fetchStreakForExpected(
  userId: string,
  endDate: string,
  getExpectedForDate: (dateStr: string) => Set<string>,
  maxLookback = 200
): Promise<number> {
  const startBound = isoAddDays(endDate, -maxLookback)
  const { data: entries, error: eErr } = await supabase
    .from('daily_entries')
    .select('id, entry_date')
    .eq('user_id', userId)
    .gte('entry_date', startBound)
    .lte('entry_date', endDate)

  if (eErr || !entries?.length) return 0

  const entryByDate = new Map(entries.map((row: { id: string; entry_date: string }) => [row.entry_date, row.id]))
  const entryIds = entries.map((row: { id: string }) => row.id)

  const { data: logs, error: lErr } = await supabase
    .from('beauty_logs')
    .select('daily_entry_id, routine_step_id')
    .in('daily_entry_id', entryIds)

  if (lErr) return 0

  const logsByEntry = new Map<string, Set<string>>()
  for (const row of logs ?? []) {
    const eid = (row as { daily_entry_id: string }).daily_entry_id
    const sid = (row as { routine_step_id: string }).routine_step_id
    if (!logsByEntry.has(eid)) logsByEntry.set(eid, new Set())
    logsByEntry.get(eid)!.add(sid)
  }

  let streak = 0
  let d = endDate
  let iterations = 0

  while (iterations < maxLookback) {
    if (d < startBound) break

    const expected = getExpectedForDate(d)
    if (expected.size === 0) {
      d = isoAddDays(d, -1)
      iterations++
      continue
    }

    const eid = entryByDate.get(d)
    if (!eid) break

    const done = logsByEntry.get(eid) ?? new Set()
    const allDone = [...expected].every((id) => done.has(id))
    if (!allDone) break

    streak++
    d = isoAddDays(d, -1)
    iterations++
  }

  return streak
}

/**
 * Серия дней подряд для слота (утро или вечер): на каждый день считаются только шаги
 * этой рутины; дни без такого плана пропускаются; учитываются сохранённые beauty_logs по daily_entries.
 */
export async function fetchBeautySlotStreak(
  userId: string,
  endDate: string,
  routinesWithSteps: RoutineWithStepsLike[],
  slot: BeautySlotKind,
  maxLookback = 200
): Promise<number> {
  if (routinesWithSteps.length === 0) return 0
  return fetchStreakForExpected(
    userId,
    endDate,
    (dateStr) => expectedStepIdsForSlot(routinesWithSteps, dateStr, slot),
    maxLookback
  )
}

/** Все запланированные на день шаги (утро + вечер + прочее) — для совместимости. */
export async function fetchBeautyCareStreak(
  userId: string,
  endDate: string,
  routinesWithSteps: RoutineWithStepsLike[],
  maxLookback = 200
): Promise<number> {
  if (routinesWithSteps.length === 0) return 0
  return fetchStreakForExpected(
    userId,
    endDate,
    (dateStr) => expectedStepIdsForDate(routinesWithSteps, dateStr),
    maxLookback
  )
}
