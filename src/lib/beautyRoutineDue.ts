import type { BeautyRoutine } from './supabase'

/** Whether this routine is scheduled for the given calendar day (YYYY-MM-DD). */
export function isRoutineDue(routine: BeautyRoutine, entryDate: string): boolean {
  if (routine.is_active === false) return false
  const ct = routine.cadence_type ?? 'none'
  if (ct === 'none' || ct === 'daily') return true
  if (ct === 'weekly') {
    const d = new Date(entryDate + 'T12:00:00')
    return (routine.weekly_days ?? []).includes(d.getDay())
  }
  if (ct === 'monthly') {
    const d = new Date(entryDate + 'T12:00:00')
    return (routine.monthly_days ?? []).includes(d.getDate())
  }
  return true
}

/**
 * Morning and evening are single-slot blocks — only one routine per type per day.
 * If several are due, keep the one with the most steps (most detailed), else first by sort_order.
 */
export function deduplicateByTimeSlot<T extends { routine: BeautyRoutine; steps: readonly unknown[] }>(
  routines: T[]
): T[] {
  const SINGLE_SLOT_TYPES = new Set(['morning', 'evening'])
  const best = new Map<string, T>()
  const rest: T[] = []

  for (const rws of routines) {
    const t = rws.routine.type ?? ''
    if (SINGLE_SLOT_TYPES.has(t)) {
      const current = best.get(t)
      if (!current || rws.steps.length > current.steps.length) {
        best.set(t, rws)
      }
    } else {
      rest.push(rws)
    }
  }

  const ORDER = ['morning', 'evening']
  const slotWinners = ORDER.flatMap((slot) => (best.has(slot) ? [best.get(slot)!] : []))
  return [...slotWinners, ...rest]
}
