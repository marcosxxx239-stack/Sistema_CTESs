-- 1. Add description column to deadlines
ALTER TABLE deadlines ADD COLUMN IF NOT EXISTS description text;

-- 2. Add source and uploaded_by columns to documents (to distinguish student uploads from CTES uploads)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS source text DEFAULT 'student';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES profiles(id);

-- 3. Create library_documents table — documents published by CTES for students to download
CREATE TABLE IF NOT EXISTS library_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  activity_id uuid REFERENCES activities(id) ON DELETE SET NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  mime_type text,
  is_visible boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Enable RLS on library_documents
ALTER TABLE library_documents ENABLE ROW LEVEL SECURITY;

-- 5. Policies for library_documents
CREATE POLICY "library_select" ON library_documents FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "library_insert" ON library_documents FOR INSERT
  TO authenticated WITH CHECK (current_user_role() = ANY (ARRAY['ctes', 'admin']));

CREATE POLICY "library_update" ON library_documents FOR UPDATE
  TO authenticated USING (current_user_role() = ANY (ARRAY['ctes', 'admin']))
  WITH CHECK (current_user_role() = ANY (ARRAY['ctes', 'admin']));

CREATE POLICY "library_delete" ON library_documents FOR DELETE
  TO authenticated USING (current_user_role() = ANY (ARRAY['ctes', 'admin']));

-- 6. Update documents INSERT policy to allow CTES to insert (source = 'ctes')
-- Current policy: WITH CHECK (student_id = current_profile_id())
-- We need a new policy for CTES-uploaded docs
CREATE POLICY "documents_insert_ctes" ON documents FOR INSERT
  TO authenticated
  WITH CHECK (current_user_role() = ANY (ARRAY['ctes', 'admin']));

-- 7. Storage policies for library documents — store in 'documents' bucket under 'library/' prefix
-- CTES can upload to library/ folder; students can read library/ files
CREATE POLICY "library_storage_insert" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'library' AND current_user_role() = ANY (ARRAY['ctes', 'admin']));

CREATE POLICY "library_storage_read" ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'library');

CREATE POLICY "library_storage_update" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'library' AND current_user_role() = ANY (ARRAY['ctes', 'admin']));

CREATE POLICY "library_storage_delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'library' AND current_user_role() = ANY (ARRAY['ctes', 'admin']));

-- 8. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON library_documents TO authenticated;
