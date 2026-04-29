-- ============================================================
-- RADAR: Seed job_listings for every new user on signup
-- Also backfills any existing users who have no listings
-- Idempotent — safe to run multiple times
-- ============================================================

-- 1. Update handle_new_user trigger to also seed job listings
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  -- Create user profile
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  -- Seed initial job listings for the new user
  INSERT INTO public.job_listings (user_id, title, client, client_rating, client_spend, budget, budget_type, posted, skills, description, proposals, match_score, job_status, saved, category)
  VALUES
    (NEW.id, 'Senior React Developer for FinTech Dashboard Redesign', 'FinCore Solutions', 4.9, '$48K+', '$3,500-$6,000', 'fixed', '23 min ago', ARRAY['React','TypeScript','Tailwind CSS','REST API','Figma'], 'We need an experienced React developer to redesign our trading dashboard. Must have strong TypeScript skills and experience with real-time data visualization.', 7, 94, 'new', false, 'Web Development'),
    (NEW.id, 'Next.js Full-Stack Developer - E-commerce Platform', 'RetailFlow GmbH', 4.7, '$22K+', '$45-$65/hr', 'hourly', '1 hr ago', ARRAY['Next.js','Node.js','PostgreSQL','Stripe','AWS'], 'Looking for a full-stack developer to build a custom e-commerce platform with headless CMS integration and payment processing.', 12, 87, 'reviewed', true, 'Full-Stack'),
    (NEW.id, 'Frontend Engineer - SaaS Analytics Product (Long-term)', 'DataPulse Inc.', 5.0, '$130K+', '$55-$80/hr', 'hourly', '2 hr ago', ARRAY['React','Recharts','D3.js','GraphQL','TypeScript'], 'Seeking a frontend engineer to join our core team. Long-term engagement building analytics dashboards and data visualization components.', 4, 91, 'proposal-sent', true, 'Frontend'),
    (NEW.id, 'Tailwind CSS UI Component Library - Design System Build', 'Stackify Labs', 4.8, '$19K+', '$2,800-$4,200', 'fixed', '5 hr ago', ARRAY['Tailwind CSS','React','Storybook','Figma','TypeScript'], 'Build a comprehensive UI component library with Storybook docs. 40+ components needed, must match provided Figma design system.', 9, 96, 'shortlisted', true, 'Frontend'),
    (NEW.id, 'TypeScript API Integration Specialist - Fintech', 'ClearLedger Corp.', 4.9, '$67K+', '$50-$75/hr', 'hourly', '8 hr ago', ARRAY['TypeScript','Node.js','REST API','OpenAPI','PostgreSQL'], 'Need a TypeScript specialist to integrate 3rd-party financial APIs (Plaid, Stripe, Wise) into our existing Node.js backend.', 6, 83, 'new', false, 'Backend'),
    (NEW.id, 'React Dashboard Developer - IoT Monitoring Platform', 'SensorGrid GmbH', 4.7, '$44K+', '$40-$60/hr', 'hourly', '1 day ago', ARRAY['React','MQTT','WebSockets','Chart.js','TypeScript'], 'Build a real-time IoT monitoring dashboard displaying sensor data, alerts, and historical charts for industrial equipment.', 11, 85, 'proposal-sent', true, 'Frontend'),
    (NEW.id, 'Senior Full-Stack - Real-Time Collaboration SaaS', 'CoLaborate Inc.', 4.8, '$91K+', '$65-$95/hr', 'hourly', '12 hr ago', ARRAY['React','Node.js','WebSockets','Redis','TypeScript','AWS'], 'Long-term engagement building real-time collaborative features (similar to Notion/Figma multiplayer). Strong WebSocket and Redis experience required.', 3, 88, 'new', false, 'Full-Stack'),
    (NEW.id, 'React Native Mobile App - Healthcare Scheduling', 'MedSlot Ltd.', 4.6, '$35K+', '$4,000-$8,500', 'fixed', '4 hr ago', ARRAY['React Native','Expo','Firebase','TypeScript','iOS/Android'], 'Develop a cross-platform mobile app for appointment scheduling between patients and healthcare providers. Push notifications required.', 22, 72, 'new', false, 'Mobile');

  RETURN NEW;
END;
$func$;

-- Re-attach the trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Backfill job listings for any existing users who have none
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id FROM public.user_profiles
    WHERE NOT EXISTS (
      SELECT 1 FROM public.job_listings WHERE user_id = public.user_profiles.id
    )
  LOOP
    INSERT INTO public.job_listings (user_id, title, client, client_rating, client_spend, budget, budget_type, posted, skills, description, proposals, match_score, job_status, saved, category)
    VALUES
      (rec.id, 'Senior React Developer for FinTech Dashboard Redesign', 'FinCore Solutions', 4.9, '$48K+', '$3,500-$6,000', 'fixed', '23 min ago', ARRAY['React','TypeScript','Tailwind CSS','REST API','Figma'], 'We need an experienced React developer to redesign our trading dashboard. Must have strong TypeScript skills and experience with real-time data visualization.', 7, 94, 'new', false, 'Web Development'),
      (rec.id, 'Next.js Full-Stack Developer - E-commerce Platform', 'RetailFlow GmbH', 4.7, '$22K+', '$45-$65/hr', 'hourly', '1 hr ago', ARRAY['Next.js','Node.js','PostgreSQL','Stripe','AWS'], 'Looking for a full-stack developer to build a custom e-commerce platform with headless CMS integration and payment processing.', 12, 87, 'reviewed', true, 'Full-Stack'),
      (rec.id, 'Frontend Engineer - SaaS Analytics Product (Long-term)', 'DataPulse Inc.', 5.0, '$130K+', '$55-$80/hr', 'hourly', '2 hr ago', ARRAY['React','Recharts','D3.js','GraphQL','TypeScript'], 'Seeking a frontend engineer to join our core team. Long-term engagement building analytics dashboards and data visualization components.', 4, 91, 'proposal-sent', true, 'Frontend'),
      (rec.id, 'Tailwind CSS UI Component Library - Design System Build', 'Stackify Labs', 4.8, '$19K+', '$2,800-$4,200', 'fixed', '5 hr ago', ARRAY['Tailwind CSS','React','Storybook','Figma','TypeScript'], 'Build a comprehensive UI component library with Storybook docs. 40+ components needed, must match provided Figma design system.', 9, 96, 'shortlisted', true, 'Frontend'),
      (rec.id, 'TypeScript API Integration Specialist - Fintech', 'ClearLedger Corp.', 4.9, '$67K+', '$50-$75/hr', 'hourly', '8 hr ago', ARRAY['TypeScript','Node.js','REST API','OpenAPI','PostgreSQL'], 'Need a TypeScript specialist to integrate 3rd-party financial APIs (Plaid, Stripe, Wise) into our existing Node.js backend.', 6, 83, 'new', false, 'Backend'),
      (rec.id, 'React Dashboard Developer - IoT Monitoring Platform', 'SensorGrid GmbH', 4.7, '$44K+', '$40-$60/hr', 'hourly', '1 day ago', ARRAY['React','MQTT','WebSockets','Chart.js','TypeScript'], 'Build a real-time IoT monitoring dashboard displaying sensor data, alerts, and historical charts for industrial equipment.', 11, 85, 'proposal-sent', true, 'Frontend'),
      (rec.id, 'Senior Full-Stack - Real-Time Collaboration SaaS', 'CoLaborate Inc.', 4.8, '$91K+', '$65-$95/hr', 'hourly', '12 hr ago', ARRAY['React','Node.js','WebSockets','Redis','TypeScript','AWS'], 'Long-term engagement building real-time collaborative features (similar to Notion/Figma multiplayer). Strong WebSocket and Redis experience required.', 3, 88, 'new', false, 'Full-Stack'),
      (rec.id, 'React Native Mobile App - Healthcare Scheduling', 'MedSlot Ltd.', 4.6, '$35K+', '$4,000-$8,500', 'fixed', '4 hr ago', ARRAY['React Native','Expo','Firebase','TypeScript','iOS/Android'], 'Develop a cross-platform mobile app for appointment scheduling between patients and healthcare providers. Push notifications required.', 22, 72, 'new', false, 'Mobile');

    RAISE NOTICE 'Seeded job listings for user: %', rec.id;
  END LOOP;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Backfill failed: %', SQLERRM;
END $$;
