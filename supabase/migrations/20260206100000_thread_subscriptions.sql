-- Thread subscriptions table for "Watch Thread" feature
CREATE TABLE thread_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(thread_id, user_id)
);

-- Indexes for efficient lookups
CREATE INDEX idx_thread_subscriptions_thread ON thread_subscriptions(thread_id);
CREATE INDEX idx_thread_subscriptions_user ON thread_subscriptions(user_id, created_at DESC);

-- RLS policies
ALTER TABLE thread_subscriptions ENABLE ROW LEVEL SECURITY;

-- Anyone can view subscription counts
CREATE POLICY "Thread subscriptions are viewable" ON thread_subscriptions
  FOR SELECT USING (true);

-- Users can subscribe to threads
CREATE POLICY "Users can subscribe to threads" ON thread_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can unsubscribe from threads
CREATE POLICY "Users can unsubscribe from threads" ON thread_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Add watched_thread to notification types
-- First check if constraint exists and drop it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_type_check'
  ) THEN
    ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
  END IF;
END
$$;

-- Add new constraint with watched_thread type
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('reply_to_thread', 'reply_to_post', 'mention', 'admin', 'watched_thread'));

-- Enable realtime for subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE thread_subscriptions;
