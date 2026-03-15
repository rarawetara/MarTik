-- Phase 2F: extend beauty_routines with optional scheduling.
-- Run after 007_phase2e_beauty_progress_photos_metadata.sql
-- Scheduling only affects which routines are shown as due; beauty_logs unchanged.

ALTER TABLE public.beauty_routines
  ADD COLUMN IF NOT EXISTS cadence_type text NOT NULL DEFAULT 'none'
  CHECK (cadence_type IN ('daily', 'weekly', 'monthly', 'none'));

ALTER TABLE public.beauty_routines
  ADD COLUMN IF NOT EXISTS weekly_days smallint[];

ALTER TABLE public.beauty_routines
  ADD COLUMN IF NOT EXISTS monthly_days smallint[];

ALTER TABLE public.beauty_routines
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.beauty_routines.cadence_type IS 'When routine is due: none=always, daily=every day, weekly=on weekly_days, monthly=on monthly_days';
COMMENT ON COLUMN public.beauty_routines.weekly_days IS 'Weekdays 0-6 (0=Sunday) when cadence_type=weekly';
COMMENT ON COLUMN public.beauty_routines.monthly_days IS 'Days of month 1-31 when cadence_type=monthly';
COMMENT ON COLUMN public.beauty_routines.is_active IS 'If false, routine is hidden from due list';
