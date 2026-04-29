-- Migration: chat_analyses table
-- Persists Gemini AI BRAIN chat analyses with job context and linked VAULT documents

-- 1. Create chat_analyses table
CREATE TABLE IF NOT EXISTS public.chat_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Analysis',
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  job_title TEXT NOT NULL DEFAULT '',
  job_budget TEXT NOT NULL DEFAULT '',
  job_match_score INTEGER NOT NULL DEFAULT 0,
  job_skills TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  vault_doc_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  vault_doc_names TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_chat_analyses_user_id ON public.chat_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_analyses_created_at ON public.chat_analyses(created_at DESC);

-- 3. Enable RLS
ALTER TABLE public.chat_analyses ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "users_manage_own_chat_analyses" ON public.chat_analyses;
CREATE POLICY "users_manage_own_chat_analyses"
ON public.chat_analyses
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
