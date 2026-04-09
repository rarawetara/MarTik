/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Set to `"true"` to skip `task_templates` requests (see useTaskTemplates). */
  readonly VITE_TASK_TEMPLATES_DISABLED?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
