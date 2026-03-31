-- ── Vitamins ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vitamins (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  dosage      text DEFAULT NULL,        -- e.g. "1 капсула", "1000 IU"
  notes       text DEFAULT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vitamins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vitamins: user owns" ON vitamins FOR ALL USING (auth.uid() = user_id);

-- ── Vitamin logs ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vitamin_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vitamin_id  uuid NOT NULL REFERENCES vitamins(id) ON DELETE CASCADE,
  log_date    date NOT NULL,            -- the calendar date vitamins were taken
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, vitamin_id, log_date)
);

ALTER TABLE vitamin_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vitamin_logs: user owns" ON vitamin_logs FOR ALL USING (auth.uid() = user_id);

-- Index for fast monthly lookups
CREATE INDEX IF NOT EXISTS vitamin_logs_user_date ON vitamin_logs (user_id, log_date);
