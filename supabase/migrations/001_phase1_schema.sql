-- Phase 1: profiles, daily_entries, daily_tasks + RLS
-- Run this in Supabase SQL Editor or via Supabase CLI

-- profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  water_goal_ml int NOT NULL DEFAULT 2000,
  timezone text NOT NULL DEFAULT 'UTC',
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- daily_entries (one per user per day)
CREATE TABLE IF NOT EXISTS public.daily_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  journal_text text,
  mood text,
  water_ml int NOT NULL DEFAULT 0,
  daily_photos jsonb NOT NULL DEFAULT '[]',
  progress_photos jsonb NOT NULL DEFAULT '[]',
  habits jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_date)
);

-- daily_tasks (focus tasks, no task_sessions in Phase 1)
CREATE TABLE IF NOT EXISTS public.daily_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  default_duration_minutes int,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Profile creation on sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, water_goal_ml, timezone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), 2000, 'UTC')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;

-- profiles: own row only (id = auth.uid())
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (id = auth.uid());

-- daily_entries: own rows only
CREATE POLICY "Users can read own daily_entries"
  ON public.daily_entries FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own daily_entries"
  ON public.daily_entries FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own daily_entries"
  ON public.daily_entries FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own daily_entries"
  ON public.daily_entries FOR DELETE USING (user_id = auth.uid());

-- daily_tasks: own rows only
CREATE POLICY "Users can read own daily_tasks"
  ON public.daily_tasks FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own daily_tasks"
  ON public.daily_tasks FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own daily_tasks"
  ON public.daily_tasks FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own daily_tasks"
  ON public.daily_tasks FOR DELETE USING (user_id = auth.uid());
