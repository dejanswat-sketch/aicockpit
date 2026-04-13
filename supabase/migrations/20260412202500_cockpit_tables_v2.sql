-- ============================================================
-- Cockpit v2: job_listings, vault_documents, tasks, notes
-- Idempotent migration — safe to run multiple times
-- ============================================================

-- 1. ENUMS (safe create)
DO $$ BEGIN
  CREATE TYPE public.job_budget_type AS ENUM ('fixed', 'hourly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.job_status AS ENUM ('new', 'reviewed', 'proposal-sent', 'shortlisted', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.task_priority AS ENUM ('critical', 'high', 'medium', 'low');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.task_status AS ENUM ('todo', 'in-progress', 'done');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.vault_doc_type AS ENUM ('CV', 'Portfolio', 'Case Study', 'Cover Letter', 'Template', 'Contract', 'Skills');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. USER PROFILES
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. JOB LISTINGS
CREATE TABLE IF NOT EXISTS public.job_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  client TEXT NOT NULL DEFAULT '',
  client_rating NUMERIC(3,1) DEFAULT 0,
  client_spend TEXT DEFAULT '',
  budget TEXT DEFAULT '',
  budget_type public.job_budget_type DEFAULT 'fixed',
  posted TEXT DEFAULT '',
  skills TEXT[] DEFAULT ARRAY[]::TEXT[],
  description TEXT DEFAULT '',
  proposals INTEGER DEFAULT 0,
  match_score INTEGER DEFAULT 0,
  job_status public.job_status DEFAULT 'new',
  saved BOOLEAN DEFAULT false,
  category TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. VAULT DOCUMENTS
CREATE TABLE IF NOT EXISTS public.vault_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  doc_type public.vault_doc_type DEFAULT 'Portfolio',
  size_bytes BIGINT DEFAULT 0,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  usage_count INTEGER DEFAULT 0,
  uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. TASKS
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  priority public.task_priority DEFAULT 'medium',
  task_status public.task_status DEFAULT 'todo',
  due_date TEXT DEFAULT 'No date',
  project TEXT DEFAULT 'General',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. NOTES
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Note',
  content TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. INDEXES
CREATE INDEX IF NOT EXISTS idx_job_listings_user_id ON public.job_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_job_listings_job_status ON public.job_listings(job_status);
CREATE INDEX IF NOT EXISTS idx_vault_documents_user_id ON public.vault_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_task_status ON public.tasks(task_status);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);

-- 8. FUNCTIONS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- 9. ENABLE RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- 10. RLS POLICIES
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
CREATE POLICY "users_manage_own_user_profiles"
ON public.user_profiles FOR ALL TO authenticated
USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "users_manage_own_job_listings" ON public.job_listings;
CREATE POLICY "users_manage_own_job_listings"
ON public.job_listings FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_manage_own_vault_documents" ON public.vault_documents;
CREATE POLICY "users_manage_own_vault_documents"
ON public.vault_documents FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_manage_own_tasks" ON public.tasks;
CREATE POLICY "users_manage_own_tasks"
ON public.tasks FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_manage_own_notes" ON public.notes;
CREATE POLICY "users_manage_own_notes"
ON public.notes FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 11. TRIGGERS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS set_job_listings_updated_at ON public.job_listings;
CREATE TRIGGER set_job_listings_updated_at
  BEFORE UPDATE ON public.job_listings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_tasks_updated_at ON public.tasks;
CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_notes_updated_at ON public.notes;
CREATE TRIGGER set_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 12. SEED MOCK DATA FOR EXISTING USERS
DO $$
DECLARE
  demo_user_id UUID;
BEGIN
  SELECT id INTO demo_user_id FROM public.user_profiles LIMIT 1;

  IF demo_user_id IS NOT NULL THEN

    -- Job listings mock data (only if none exist for this user)
    IF NOT EXISTS (SELECT 1 FROM public.job_listings WHERE user_id = demo_user_id LIMIT 1) THEN
      INSERT INTO public.job_listings (user_id, title, client, client_rating, client_spend, budget, budget_type, posted, skills, description, proposals, match_score, job_status, saved, category)
      VALUES
        (demo_user_id, 'Senior React Developer for FinTech Dashboard Redesign', 'FinCore Solutions', 4.9, '$48K+', '$3,500-$6,000', 'fixed', '23 min ago', ARRAY['React','TypeScript','Tailwind CSS','REST API','Figma'], 'We need an experienced React developer to redesign our trading dashboard. Must have strong TypeScript skills and experience with real-time data visualization.', 7, 94, 'new', false, 'Web Development'),
        (demo_user_id, 'Next.js Full-Stack Developer - E-commerce Platform', 'RetailFlow GmbH', 4.7, '$22K+', '$45-$65/hr', 'hourly', '1 hr ago', ARRAY['Next.js','Node.js','PostgreSQL','Stripe','AWS'], 'Looking for a full-stack developer to build a custom e-commerce platform with headless CMS integration and payment processing.', 12, 87, 'reviewed', true, 'Full-Stack'),
        (demo_user_id, 'Frontend Engineer - SaaS Analytics Product (Long-term)', 'DataPulse Inc.', 5.0, '$130K+', '$55-$80/hr', 'hourly', '2 hr ago', ARRAY['React','Recharts','D3.js','GraphQL','TypeScript'], 'Seeking a frontend engineer to join our core team. Long-term engagement building analytics dashboards and data visualization components.', 4, 91, 'proposal-sent', true, 'Frontend'),
        (demo_user_id, 'Tailwind CSS UI Component Library - Design System Build', 'Stackify Labs', 4.8, '$19K+', '$2,800-$4,200', 'fixed', '5 hr ago', ARRAY['Tailwind CSS','React','Storybook','Figma','TypeScript'], 'Build a comprehensive UI component library with Storybook docs. 40+ components needed, must match provided Figma design system.', 9, 96, 'shortlisted', true, 'Frontend'),
        (demo_user_id, 'TypeScript API Integration Specialist - Fintech', 'ClearLedger Corp.', 4.9, '$67K+', '$50-$75/hr', 'hourly', '8 hr ago', ARRAY['TypeScript','Node.js','REST API','OpenAPI','PostgreSQL'], 'Need a TypeScript specialist to integrate 3rd-party financial APIs (Plaid, Stripe, Wise) into our existing Node.js backend.', 6, 83, 'new', false, 'Backend'),
        (demo_user_id, 'React Dashboard Developer - IoT Monitoring Platform', 'SensorGrid GmbH', 4.7, '$44K+', '$40-$60/hr', 'hourly', '1 day ago', ARRAY['React','MQTT','WebSockets','Chart.js','TypeScript'], 'Build a real-time IoT monitoring dashboard displaying sensor data, alerts, and historical charts for industrial equipment.', 11, 85, 'proposal-sent', true, 'Frontend'),
        (demo_user_id, 'Senior Full-Stack - Real-Time Collaboration SaaS', 'CoLaborate Inc.', 4.8, '$91K+', '$65-$95/hr', 'hourly', '12 hr ago', ARRAY['React','Node.js','WebSockets','Redis','TypeScript','AWS'], 'Long-term engagement building real-time collaborative features (similar to Notion/Figma multiplayer). Strong WebSocket and Redis experience required.', 3, 88, 'new', false, 'Full-Stack'),
        (demo_user_id, 'React Native Mobile App - Healthcare Scheduling', 'MedSlot Ltd.', 4.6, '$35K+', '$4,000-$8,500', 'fixed', '4 hr ago', ARRAY['React Native','Expo','Firebase','TypeScript','iOS/Android'], 'Develop a cross-platform mobile app for appointment scheduling between patients and healthcare providers. Push notifications required.', 22, 72, 'new', false, 'Mobile');
    END IF;

    -- Vault documents mock data (only if none exist for this user)
    IF NOT EXISTS (SELECT 1 FROM public.vault_documents WHERE user_id = demo_user_id LIMIT 1) THEN
      INSERT INTO public.vault_documents (user_id, name, doc_type, size_bytes, tags, usage_count, uploaded_at, last_used_at)
      VALUES
        (demo_user_id, 'Marko_Novak_CV_2026.pdf', 'CV', 284000, ARRAY['primary','latest'], 18, now() - interval '2 days', now() - interval '2 hours'),
        (demo_user_id, 'Portfolio_Case_Studies_v3.pdf', 'Portfolio', 4200000, ARRAY['featured','2025'], 12, now() - interval '4 days', now() - interval '5 hours'),
        (demo_user_id, 'FinTech_Dashboard_Case_Study.pdf', 'Case Study', 1800000, ARRAY['fintech','react'], 7, now() - interval '14 days', now() - interval '1 day'),
        (demo_user_id, 'Cover_Letter_Senior_Dev.docx', 'Cover Letter', 42000, ARRAY['template','senior'], 9, now() - interval '21 days', now() - interval '3 days'),
        (demo_user_id, 'React_Skills_Summary_2026.pdf', 'Skills', 156000, ARRAY['react','typescript'], 5, now() - interval '28 days', now() - interval '5 days'),
        (demo_user_id, 'E-Commerce_Platform_Case.pdf', 'Case Study', 2100000, ARRAY['ecommerce','nextjs'], 3, now() - interval '53 days', now() - interval '14 days'),
        (demo_user_id, 'Freelance_Contract_Template.docx', 'Contract', 68000, ARRAY['legal','template'], 2, now() - interval '82 days', now() - interval '30 days');
    END IF;

    -- Tasks mock data (only if none exist for this user)
    IF NOT EXISTS (SELECT 1 FROM public.tasks WHERE user_id = demo_user_id LIMIT 1) THEN
      INSERT INTO public.tasks (user_id, text, priority, task_status, due_date, project)
      VALUES
        (demo_user_id, 'Submit proposal for FinTech Dashboard job', 'critical', 'in-progress', 'Today', 'Proposals'),
        (demo_user_id, 'Update portfolio with IoT Dashboard screenshots', 'high', 'todo', 'Apr 13', 'Vault'),
        (demo_user_id, 'Deliver milestone 2 - CoLaborate SaaS', 'critical', 'in-progress', 'Apr 14', 'Active Work'),
        (demo_user_id, 'Write DataPulse weekly progress report', 'medium', 'todo', 'Apr 15', 'Active Work'),
        (demo_user_id, 'Review and respond to SensorGrid feedback', 'high', 'todo', 'Apr 15', 'Active Work'),
        (demo_user_id, 'Refresh CV with new projects', 'medium', 'todo', 'Apr 18', 'Vault'),
        (demo_user_id, 'Research AI integration trends for proposals', 'low', 'todo', 'Apr 20', 'Research'),
        (demo_user_id, 'Set up automated invoice template', 'low', 'done', 'Apr 10', 'Admin'),
        (demo_user_id, 'Send invoice to RetailFlow GmbH', 'high', 'done', 'Apr 11', 'Admin');
    END IF;

    -- Notes mock data (only if none exist for this user)
    IF NOT EXISTS (SELECT 1 FROM public.notes WHERE user_id = demo_user_id LIMIT 1) THEN
      INSERT INTO public.notes (user_id, title, content, updated_at)
      VALUES
        (demo_user_id, 'FinTech Dashboard - Proposal Notes',
         E'Client wants real-time data refresh - ask about WebSocket vs polling preference.\n\nBudget seems flexible ($3.5K-6K). They are a funded startup, probably fine going to $5.5K if I justify it well.\n\nKey differentiator: I have the exact case study. Lead with the trading dashboard project - similar domain, similar tech stack.\n\nQuestions to ask:\n- Current stack they are migrating FROM?\n- Timeline pressure? (sounds urgent based on "redesign" wording)\n- Design system exists or starting from scratch?',
         now() - interval '2 hours'),
        (demo_user_id, 'Rate Strategy - Q2 2026',
         E'Current rate: $55/hr\nTarget rate: $70/hr by June 2026\n\nStrategy:\n- Raise on new clients only (do not rock existing boats)\n- Lead with portfolio quality, not hours\n- Fixed-price for smaller projects - hides hourly math\n\nTop Rated Plus badge is now live - use it in every proposal intro.',
         now() - interval '1 day');
    END IF;

  ELSE
    RAISE NOTICE 'No users found in user_profiles. Mock data will be seeded on first login.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Mock data insertion failed: %', SQLERRM;
END $$;
