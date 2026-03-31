-- Task categories per user
CREATE TABLE IF NOT EXISTS task_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  sort_order  int  NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_task_categories" ON task_categories
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add category column to daily_tasks (если ещё не добавлена)
ALTER TABLE daily_tasks
  ADD COLUMN IF NOT EXISTS category text DEFAULT NULL;
