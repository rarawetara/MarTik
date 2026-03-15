-- Phase 1 fix: tasks belong to a specific day (daily_entry_id) and have persisted completion.
-- Run after 001_phase1_schema.sql

DROP TABLE IF EXISTS public.daily_tasks;

CREATE TABLE public.daily_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  daily_entry_id uuid NOT NULL REFERENCES public.daily_entries(id) ON DELETE CASCADE,
  title text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_daily_tasks_daily_entry_id ON public.daily_tasks(daily_entry_id);

ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;

-- RLS: user can only access tasks whose daily_entry belongs to them
CREATE POLICY "Users can read own daily_tasks"
  ON public.daily_tasks FOR SELECT
  USING (daily_entry_id IN (SELECT id FROM public.daily_entries WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own daily_tasks"
  ON public.daily_tasks FOR INSERT
  WITH CHECK (user_id = auth.uid() AND daily_entry_id IN (SELECT id FROM public.daily_entries WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own daily_tasks"
  ON public.daily_tasks FOR UPDATE
  USING (daily_entry_id IN (SELECT id FROM public.daily_entries WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own daily_tasks"
  ON public.daily_tasks FOR DELETE
  USING (daily_entry_id IN (SELECT id FROM public.daily_entries WHERE user_id = auth.uid()));
