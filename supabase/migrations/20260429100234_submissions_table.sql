-- ============================================================
-- Submissions: CV submissions tracking table
-- Idempotent migration — safe to run multiple times
-- ============================================================

-- 1. ENUM for submission response status
DO $$ BEGIN
  CREATE TYPE public.submission_response_status AS ENUM ('pending', 'viewed', 'interview', 'rejected', 'offer', 'ghosted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  cv_name TEXT NOT NULL DEFAULT '',
  job_title TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  job_url TEXT DEFAULT '',
  response_status public.submission_response_status DEFAULT 'pending',
  submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON public.submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_response_status ON public.submissions(response_status);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON public.submissions(submitted_at DESC);

-- 4. FUNCTION for updated_at (reuse existing set_updated_at if available)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- 5. ENABLE RLS
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES
DROP POLICY IF EXISTS "users_manage_own_submissions" ON public.submissions;
CREATE POLICY "users_manage_own_submissions"
ON public.submissions FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 7. TRIGGERS
DROP TRIGGER IF EXISTS set_submissions_updated_at ON public.submissions;
CREATE TRIGGER set_submissions_updated_at
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8. SEED MOCK DATA FOR EXISTING USERS
DO $$
DECLARE
  demo_user_id UUID;
BEGIN
  SELECT id INTO demo_user_id FROM public.user_profiles LIMIT 1;

  IF demo_user_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.submissions WHERE user_id = demo_user_id LIMIT 1) THEN
      INSERT INTO public.submissions (user_id, cv_name, job_title, company, job_url, response_status, submitted_at, notes)
      VALUES
        (demo_user_id, 'Marko_Novak_CV_2026.pdf', 'Senior React Developer', 'FinCore Solutions', 'https://upwork.com/jobs/fincore-react', 'interview', now() - interval '3 days', 'Tailored CV with FinTech dashboard case study. Interview scheduled for next week.'),
        (demo_user_id, 'Marko_Novak_CV_2026.pdf', 'Next.js Full-Stack Developer', 'RetailFlow GmbH', 'https://upwork.com/jobs/retailflow-nextjs', 'viewed', now() - interval '5 days', 'Highlighted e-commerce and Stripe experience. Client viewed proposal twice.'),
        (demo_user_id, 'Marko_Novak_CV_2026.pdf', 'Frontend Engineer - SaaS Analytics', 'DataPulse Inc.', 'https://upwork.com/jobs/datapulse-frontend', 'pending', now() - interval '1 day', 'Sent with Recharts and D3.js portfolio links.'),
        (demo_user_id, 'Marko_Novak_CV_2026.pdf', 'Tailwind CSS UI Component Library', 'Stackify Labs', 'https://upwork.com/jobs/stackify-tailwind', 'offer', now() - interval '10 days', 'Shortlisted after portfolio review. Offer received at $4,000 fixed.'),
        (demo_user_id, 'Marko_Novak_CV_2026.pdf', 'TypeScript API Integration Specialist', 'ClearLedger Corp.', 'https://upwork.com/jobs/clearledger-ts', 'rejected', now() - interval '14 days', 'Client went with a candidate who had Plaid-specific experience.'),
        (demo_user_id, 'Marko_Novak_CV_2026.pdf', 'React Dashboard Developer - IoT', 'SensorGrid GmbH', 'https://upwork.com/jobs/sensorgrid-iot', 'ghosted', now() - interval '20 days', 'No response after initial message. Followed up twice.'),
        (demo_user_id, 'Marko_Novak_CV_2026.pdf', 'Senior Full-Stack - Real-Time SaaS', 'CoLaborate Inc.', 'https://upwork.com/jobs/colaborate-realtime', 'pending', now() - interval '12 hours', 'Emphasized WebSocket and Redis experience. Waiting for response.');
    END IF;
  ELSE
    RAISE NOTICE 'No users found in user_profiles. Mock data will be seeded on first login.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Mock data insertion failed: %', SQLERRM;
END $$;
