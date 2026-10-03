-- KYC files are served only through authenticated server routes.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('kyc-documents', 'kyc-documents', false, 10485760,
        ARRAY['application/pdf', 'image/png', 'image/jpeg'])
ON CONFLICT (id) DO UPDATE SET public = false,
  file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Members cannot approve or alter the review outcome of their own documents.
DROP POLICY IF EXISTS "documents owner update" ON public.member_documents;
CREATE POLICY "documents reviewer update" ON public.member_documents
FOR UPDATE TO authenticated
USING (authorize('profiles.admin')) WITH CHECK (authorize('profiles.admin'));

DROP POLICY IF EXISTS "documents owner insert" ON public.member_documents;
CREATE POLICY "documents owner insert" ON public.member_documents
FOR INSERT TO authenticated WITH CHECK (
  member_id = auth.uid() AND status = 'submitted'
  AND reviewed_by IS NULL AND reviewed_at IS NULL AND reject_reason IS NULL
  AND file_path LIKE auth.uid()::text || '/%'
);
