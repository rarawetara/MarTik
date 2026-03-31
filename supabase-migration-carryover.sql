-- Add carried_over flag to daily_tasks
-- Tasks that were not completed yesterday get copied to today with carried_over = true
ALTER TABLE daily_tasks ADD COLUMN IF NOT EXISTS carried_over boolean NOT NULL DEFAULT false;
