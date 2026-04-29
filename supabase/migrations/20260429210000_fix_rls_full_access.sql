-- ============================================================
-- RLS Fix: Ensure authenticated users have full access to their own data
-- Also ensures user_profiles row exists for authenticated users (upsert on login)
-- Idempotent — safe to run multiple times
-- ============================================================

-- 1. Re-enable RLS on all tables (idempotent)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- 2. Drop and recreate all RLS policies to ensure they are correct

-- user_profiles: allow authenticated users to manage their own row
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
CREATE POLICY "users_manage_own_user_profiles"
ON public.user_profiles FOR ALL TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Allow authenticated users to INSERT their own profile (needed for first login)
DROP POLICY IF EXISTS "users_insert_own_user_profiles" ON public.user_profiles;
CREATE POLICY "users_insert_own_user_profiles"
ON public.user_profiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

-- job_listings
DROP POLICY IF EXISTS "users_manage_own_job_listings" ON public.job_listings;
CREATE POLICY "users_manage_own_job_listings"
ON public.job_listings FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- vault_documents
DROP POLICY IF EXISTS "users_manage_own_vault_documents" ON public.vault_documents;
CREATE POLICY "users_manage_own_vault_documents"
ON public.vault_documents FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- tasks
DROP POLICY IF EXISTS "users_manage_own_tasks" ON public.tasks;
CREATE POLICY "users_manage_own_tasks"
ON public.tasks FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- notes
DROP POLICY IF EXISTS "users_manage_own_notes" ON public.notes;
CREATE POLICY "users_manage_own_notes"
ON public.notes FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- submissions
DROP POLICY IF EXISTS "users_manage_own_submissions" ON public.submissions;
CREATE POLICY "users_manage_own_submissions"
ON public.submissions FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- chat_analyses
DROP POLICY IF EXISTS "users_manage_own_chat_analyses" ON public.chat_analyses;
CREATE POLICY "users_manage_own_chat_analyses"
ON public.chat_analyses FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- user_settings
DROP POLICY IF EXISTS "users_manage_own_user_settings" ON public.user_settings;
CREATE POLICY "users_manage_own_user_settings"
ON public.user_settings FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 3. Ensure handle_new_user trigger function is correct and recreated
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

-- Recreate trigger to ensure it's attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Backfill: ensure user_profiles row exists for all existing auth.users
-- This fixes 403 errors for users who logged in before the trigger was set up
INSERT INTO public.user_profiles (id, email, full_name)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1))
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles up WHERE up.id = au.id
)
ON CONFLICT (id) DO NOTHING;
