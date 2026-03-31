-- Add category column to daily_tasks
ALTER TABLE daily_tasks ADD COLUMN IF NOT EXISTS category text DEFAULT NULL;
