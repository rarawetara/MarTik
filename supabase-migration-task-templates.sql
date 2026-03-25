-- Recurring task templates
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS task_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         text NOT NULL,
  recurrence_type text NOT NULL DEFAULT 'daily',
  -- 'daily' | 'weekly' | 'weekdays' | 'weekends'
  -- for 'weekly': recurrence_days = [1,3,5] means Mon,Wed,Fri (0=Sun,...,6=Sat)
  recurrence_days int[] DEFAULT NULL,
  is_active     bool NOT NULL DEFAULT true,
  sort_order    int  NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE daily_tasks
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES task_templates(id) ON DELETE SET NULL;

ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_templates" ON task_templates
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add category column to task_templates
ALTER TABLE task_templates
  ADD COLUMN IF NOT EXISTS category text DEFAULT NULL;
