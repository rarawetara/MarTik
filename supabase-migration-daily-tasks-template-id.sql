-- Add template_id to daily_tasks (recurring / persistent tasks).
-- Run in Supabase SQL Editor. Requires task_templates table — run
-- supabase-migration-task-templates.sql first if you don't have it.

ALTER TABLE public.daily_tasks
  ADD COLUMN IF NOT EXISTS template_id uuid DEFAULT NULL;

-- Foreign key (skip if task_templates does not exist yet)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.table_constraints
       WHERE constraint_name = 'daily_tasks_template_id_fkey'
     ) THEN
    ALTER TABLE public.daily_tasks
      ADD CONSTRAINT daily_tasks_template_id_fkey
      FOREIGN KEY (template_id) REFERENCES public.task_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- After migration: in Supabase Dashboard → Settings → API → reload schema if errors persist.
