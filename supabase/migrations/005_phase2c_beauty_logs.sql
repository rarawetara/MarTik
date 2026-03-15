-- Phase 2C: beauty_logs — daily routine step completion per day.
-- Run after 004_phase2b_beauty_routines.sql
-- Completion is stored per daily_entry; historical logs stay valid when routines/steps are edited (steps are soft-deleted).

CREATE TABLE IF NOT EXISTS public.beauty_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_entry_id uuid NOT NULL REFERENCES public.daily_entries(id) ON DELETE CASCADE,
  routine_step_id uuid NOT NULL REFERENCES public.beauty_routine_steps(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (daily_entry_id, routine_step_id)
);

CREATE INDEX IF NOT EXISTS idx_beauty_logs_daily_entry_id
  ON public.beauty_logs(daily_entry_id);

ALTER TABLE public.beauty_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own beauty_logs" ON public.beauty_logs;
DROP POLICY IF EXISTS "Users can insert own beauty_logs" ON public.beauty_logs;
DROP POLICY IF EXISTS "Users can update own beauty_logs" ON public.beauty_logs;
DROP POLICY IF EXISTS "Users can delete own beauty_logs" ON public.beauty_logs;

CREATE POLICY "Users can read own beauty_logs"
  ON public.beauty_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.daily_entries e WHERE e.id = daily_entry_id AND e.user_id = auth.uid()));

CREATE POLICY "Users can insert own beauty_logs"
  ON public.beauty_logs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.daily_entries e WHERE e.id = daily_entry_id AND e.user_id = auth.uid()));

CREATE POLICY "Users can update own beauty_logs"
  ON public.beauty_logs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.daily_entries e WHERE e.id = daily_entry_id AND e.user_id = auth.uid()));

CREATE POLICY "Users can delete own beauty_logs"
  ON public.beauty_logs FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.daily_entries e WHERE e.id = daily_entry_id AND e.user_id = auth.uid()));
