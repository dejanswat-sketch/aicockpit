-- ============================================================
-- Submissions Email Trigger via Supabase Edge Function (Resend)
-- Fires on INSERT into public.submissions
-- Idempotent migration — safe to run multiple times
-- ============================================================

-- 1. Enable pg_net extension (required for HTTP calls from triggers)
-- pg_net is pre-installed in Supabase managed environments
-- CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Trigger function: calls the send-submission-email Edge Function
CREATE OR REPLACE FUNCTION public.notify_submission_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_function_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Build the Edge Function URL from Supabase project URL
  edge_function_url := current_setting('app.supabase_url', true) || '/functions/v1/send-submission-email';
  service_role_key  := current_setting('app.service_role_key', true);

  -- Fire-and-forget HTTP POST to the Edge Function
  -- Uses pg_net for non-blocking async HTTP
  PERFORM net.http_post(
    url     := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body    := jsonb_build_object(
      'type',   'INSERT',
      'table',  'submissions',
      'record', row_to_json(NEW)
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Never block the INSERT if email fails
    RAISE WARNING 'notify_submission_email failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 3. Attach trigger to submissions table
DROP TRIGGER IF EXISTS on_submission_inserted ON public.submissions;
CREATE TRIGGER on_submission_inserted
  AFTER INSERT ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_submission_email();
