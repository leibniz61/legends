-- Post reactions table (likes, etc.)
CREATE TABLE post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction_type VARCHAR(20) NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id, reaction_type)
);

-- Indexes
CREATE INDEX idx_post_reactions_post ON post_reactions(post_id);
CREATE INDEX idx_post_reactions_user ON post_reactions(user_id);

-- Add reaction count to posts for quick display
ALTER TABLE posts ADD COLUMN reaction_count INTEGER NOT NULL DEFAULT 0;

-- Function to update reaction count
CREATE OR REPLACE FUNCTION update_post_reaction_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET reaction_count = reaction_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET reaction_count = reaction_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for reaction count
CREATE TRIGGER on_reaction_change
  AFTER INSERT OR DELETE ON post_reactions
  FOR EACH ROW EXECUTE FUNCTION update_post_reaction_count();

-- RLS policies
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;

-- Anyone can view reactions
CREATE POLICY "Anyone can view reactions" ON post_reactions
  FOR SELECT USING (true);

-- Users can add their own reactions
CREATE POLICY "Users can add reactions" ON post_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can remove their own reactions
CREATE POLICY "Users can remove own reactions" ON post_reactions
  FOR DELETE USING (auth.uid() = user_id);
