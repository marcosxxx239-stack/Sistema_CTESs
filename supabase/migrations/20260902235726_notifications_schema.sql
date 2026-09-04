-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  request_id uuid REFERENCES enrollment_requests(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON notifications(user_id) WHERE is_read = false;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies: users can only see/manage their own notifications
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  TO authenticated USING (user_id = current_profile_id());

CREATE POLICY "notifications_insert_own" ON notifications FOR INSERT
  TO authenticated WITH CHECK (user_id = current_profile_id());

-- CTES/admin can insert notifications for any user (to notify students)
CREATE POLICY "notifications_insert_ctes" ON notifications FOR INSERT
  TO authenticated WITH CHECK (current_user_role() = ANY (ARRAY['ctes', 'admin']));

-- Users can update their own notifications (mark as read)
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  TO authenticated USING (user_id = current_profile_id()) WITH CHECK (user_id = current_profile_id());

-- Users can delete their own notifications
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE
  TO authenticated USING (user_id = current_profile_id());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
