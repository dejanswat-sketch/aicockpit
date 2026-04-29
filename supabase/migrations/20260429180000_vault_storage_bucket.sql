-- ============================================================
-- Vault Storage: Create vault-documents bucket + add storage_path column
-- Idempotent migration — safe to run multiple times
-- ============================================================

-- 1. Add storage_path column to vault_documents (if not already present)
ALTER TABLE public.vault_documents
ADD COLUMN IF NOT EXISTS storage_path TEXT DEFAULT NULL;

-- 2. Create vault-documents storage bucket (idempotent via INSERT ... ON CONFLICT)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vault-documents',
  'vault-documents',
  false,
  20971520, -- 20 MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS policies for vault-documents bucket

-- Allow authenticated users to upload their own files
DROP POLICY IF EXISTS "vault_documents_upload" ON storage.objects;
CREATE POLICY "vault_documents_upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vault-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to read their own files
DROP POLICY IF EXISTS "vault_documents_read" ON storage.objects;
CREATE POLICY "vault_documents_read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'vault-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own files
DROP POLICY IF EXISTS "vault_documents_delete" ON storage.objects;
CREATE POLICY "vault_documents_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'vault-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
