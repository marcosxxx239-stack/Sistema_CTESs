-- Storage policies for CTES-uploaded request documents (stored under 'ctes/' prefix)
-- CTES/admin can upload, update, delete; students can read if they own the request
CREATE POLICY "ctes_storage_insert" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'ctes' AND current_user_role() = ANY (ARRAY['ctes', 'admin']));

CREATE POLICY "ctes_storage_read" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = 'ctes'
    AND (
      current_user_role() = ANY (ARRAY['ctes', 'admin'])
      OR EXISTS (
        SELECT 1 FROM documents d
        WHERE d.file_path = storage.objects.name
        AND d.source = 'ctes'
        AND EXISTS (
          SELECT 1 FROM enrollment_requests er
          WHERE er.id = d.request_id
          AND er.student_id = current_profile_id()
        )
      )
      OR EXISTS (
        SELECT 1 FROM documents d
        JOIN advisor_assignments aa ON aa.student_id = d.student_id
        WHERE d.file_path = storage.objects.name
        AND d.source = 'ctes'
        AND aa.advisor_id = current_profile_id()
      )
      OR EXISTS (
        SELECT 1 FROM documents d
        JOIN supervisor_assignments sa ON sa.student_id = d.student_id
        WHERE d.file_path = storage.objects.name
        AND d.source = 'ctes'
        AND sa.supervisor_id = current_profile_id()
      )
    )
  );

CREATE POLICY "ctes_storage_update" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'ctes' AND current_user_role() = ANY (ARRAY['ctes', 'admin']));

CREATE POLICY "ctes_storage_delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'ctes' AND current_user_role() = ANY (ARRAY['ctes', 'admin']));
