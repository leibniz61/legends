-- Migration: Add read tracking, view counts, and last seen
-- Features: Thread read status, view counts, last seen timestamps

-- ============================================================================
-- Thread Read Tracking (foundation for unread indicators)
-- ============================================================================

CREATE TABLE thread_reads (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  last_post_number INT DEFAULT 0 NOT NULL,
  PRIMARY KEY (user_id, thread_id)
);

-- Index for efficient user queries (e.g., "What's New" page)
CREATE INDEX idx_thread_reads_user ON thread_reads(user_id);

-- RLS policies
ALTER TABLE thread_reads ENABLE ROW LEVEL SECURITY;

-- Users can only see/manage their own read status
CREATE POLICY "Users can view own read status"
  ON thread_reads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own read status"
  ON thread_reads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own read status"
  ON thread_reads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own read status"
  ON thread_reads FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- View Counts on Threads
-- ============================================================================

ALTER TABLE threads ADD COLUMN view_count INT DEFAULT 0 NOT NULL;

-- ============================================================================
-- Last Seen on Profiles
-- ============================================================================

ALTER TABLE profiles ADD COLUMN last_seen_at TIMESTAMPTZ;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Atomic view count increment (prevents race conditions)
CREATE OR REPLACE FUNCTION increment_view_count(thread_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE threads SET view_count = view_count + 1 WHERE id = thread_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE thread_reads IS 'Tracks when users last read each thread for unread indicators';
COMMENT ON COLUMN thread_reads.last_post_number IS 'The post number (1-indexed) of the last post the user has seen';
COMMENT ON COLUMN threads.view_count IS 'Number of unique users who have viewed this thread';
COMMENT ON COLUMN profiles.last_seen_at IS 'Timestamp of user''s last activity for online status';
