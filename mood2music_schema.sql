-- =====================================================
-- Mood2Music Database Schema
-- =====================================================
-- This schema defines the complete database structure for
-- the Mood2Music emotion-based music recommendation system
-- =====================================================

-- =====================================================
-- EXTENSIONS
-- =====================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLES
-- =====================================================

-- -----------------------------------------------------
-- Table: profiles
-- Purpose: Store additional user profile information
-- -----------------------------------------------------
CREATE TABLE public.profiles (
    id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

COMMENT ON TABLE public.profiles IS 'Extended user profile information linked to auth.users';

-- -----------------------------------------------------
-- Table: songs
-- Purpose: Store music tracks with their attributes
-- -----------------------------------------------------
CREATE TABLE public.songs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title text NOT NULL,
    artist text NOT NULL,
    album text,
    genre text,
    duration_ms integer,
    energy numeric,
    valence numeric,
    tempo numeric,
    popularity integer DEFAULT 0,
    spotify_url text,
    youtube_url text,
    preview_url text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

COMMENT ON TABLE public.songs IS 'Music tracks database with audio features and streaming links';
COMMENT ON COLUMN public.songs.energy IS 'Energy level (0-1) - intensity and activity of the track';
COMMENT ON COLUMN public.songs.valence IS 'Valence (0-1) - musical positiveness of the track';
COMMENT ON COLUMN public.songs.tempo IS 'Tempo in BPM (beats per minute)';

-- -----------------------------------------------------
-- Table: emotion_song_mapping
-- Purpose: Map emotions to recommended songs
-- -----------------------------------------------------
CREATE TABLE public.emotion_song_mapping (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    emotion_type text NOT NULL,
    song_id uuid NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
    weight numeric DEFAULT 1.0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

COMMENT ON TABLE public.emotion_song_mapping IS 'Mapping between emotion types and recommended songs';
COMMENT ON COLUMN public.emotion_song_mapping.weight IS 'Recommendation weight/priority (higher = more relevant)';

-- -----------------------------------------------------
-- Table: emotion_history
-- Purpose: Track user emotion detection history
-- -----------------------------------------------------
CREATE TABLE public.emotion_history (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    emotion_type text NOT NULL,
    source text NOT NULL,
    confidence numeric NOT NULL DEFAULT 0.8,
    song_title text,
    song_artist text,
    song_url text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

COMMENT ON TABLE public.emotion_history IS 'Historical record of user emotion detections';
COMMENT ON COLUMN public.emotion_history.source IS 'Detection source: "face" or "voice"';
COMMENT ON COLUMN public.emotion_history.confidence IS 'AI model confidence score (0-1)';

-- -----------------------------------------------------
-- Table: playlists
-- Purpose: User-created playlists
-- -----------------------------------------------------
CREATE TABLE public.playlists (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    is_public boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

COMMENT ON TABLE public.playlists IS 'User-created music playlists';

-- -----------------------------------------------------
-- Table: playlist_songs
-- Purpose: Songs within playlists (many-to-many)
-- -----------------------------------------------------
CREATE TABLE public.playlist_songs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    playlist_id uuid NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
    song_id uuid NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
    position integer NOT NULL DEFAULT 0,
    added_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

COMMENT ON TABLE public.playlist_songs IS 'Junction table linking playlists and songs';

-- -----------------------------------------------------
-- Table: user_preferences
-- Purpose: Store user music preferences
-- -----------------------------------------------------
CREATE TABLE public.user_preferences (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    favorite_genres text[],
    preferred_tempo text,
    preferred_energy numeric,
    language_preference text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

COMMENT ON TABLE public.user_preferences IS 'User music taste and preference settings';

-- -----------------------------------------------------
-- Table: recommendation_feedback
-- Purpose: Track user feedback on recommendations
-- -----------------------------------------------------
CREATE TABLE public.recommendation_feedback (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    emotion_history_id uuid REFERENCES public.emotion_history(id) ON DELETE SET NULL,
    song_id uuid REFERENCES public.songs(id) ON DELETE SET NULL,
    rating integer,
    feedback_text text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

COMMENT ON TABLE public.recommendation_feedback IS 'User feedback on song recommendations';

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_emotion_history_user_id ON public.emotion_history(user_id);
CREATE INDEX idx_emotion_history_created_at ON public.emotion_history(created_at DESC);
CREATE INDEX idx_emotion_song_mapping_emotion ON public.emotion_song_mapping(emotion_type);
CREATE INDEX idx_playlists_user_id ON public.playlists(user_id);
CREATE INDEX idx_playlist_songs_playlist_id ON public.playlist_songs(playlist_id);
CREATE INDEX idx_songs_genre ON public.songs(genre);
CREATE INDEX idx_songs_popularity ON public.songs(popularity DESC);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- -----------------------------------------------------
-- Function: update_updated_at_column
-- Purpose: Automatically update updated_at timestamp
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- -----------------------------------------------------
-- Function: handle_new_user
-- Purpose: Create profile when new user signs up
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email)
  );
  RETURN new;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update timestamps
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_songs_updated_at
    BEFORE UPDATE ON public.songs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_playlists_updated_at
    BEFORE UPDATE ON public.playlists
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emotion_song_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emotion_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_feedback ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- RLS Policies: profiles
-- -----------------------------------------------------
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- -----------------------------------------------------
-- RLS Policies: songs
-- -----------------------------------------------------
CREATE POLICY "Songs are viewable by everyone"
    ON public.songs FOR SELECT
    USING (true);

-- -----------------------------------------------------
-- RLS Policies: emotion_song_mapping
-- -----------------------------------------------------
CREATE POLICY "Emotion mappings are viewable by everyone"
    ON public.emotion_song_mapping FOR SELECT
    USING (true);

-- -----------------------------------------------------
-- RLS Policies: emotion_history
-- -----------------------------------------------------
CREATE POLICY "Users can view their own emotion history"
    ON public.emotion_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own emotion history"
    ON public.emotion_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own emotion history"
    ON public.emotion_history FOR DELETE
    USING (auth.uid() = user_id);

-- -----------------------------------------------------
-- RLS Policies: playlists
-- -----------------------------------------------------
CREATE POLICY "Users can view their own playlists"
    ON public.playlists FOR SELECT
    USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert their own playlists"
    ON public.playlists FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own playlists"
    ON public.playlists FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playlists"
    ON public.playlists FOR DELETE
    USING (auth.uid() = user_id);

-- -----------------------------------------------------
-- RLS Policies: playlist_songs
-- -----------------------------------------------------
CREATE POLICY "Users can view songs in their playlists or public playlists"
    ON public.playlist_songs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM playlists
            WHERE playlists.id = playlist_songs.playlist_id
            AND (playlists.user_id = auth.uid() OR playlists.is_public = true)
        )
    );

CREATE POLICY "Users can add songs to their own playlists"
    ON public.playlist_songs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM playlists
            WHERE playlists.id = playlist_songs.playlist_id
            AND playlists.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can remove songs from their own playlists"
    ON public.playlist_songs FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM playlists
            WHERE playlists.id = playlist_songs.playlist_id
            AND playlists.user_id = auth.uid()
        )
    );

-- -----------------------------------------------------
-- RLS Policies: user_preferences
-- -----------------------------------------------------
CREATE POLICY "Users can view their own preferences"
    ON public.user_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
    ON public.user_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
    ON public.user_preferences FOR UPDATE
    USING (auth.uid() = user_id);

-- -----------------------------------------------------
-- RLS Policies: recommendation_feedback
-- -----------------------------------------------------
CREATE POLICY "Users can view their own feedback"
    ON public.recommendation_feedback FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback"
    ON public.recommendation_feedback FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback"
    ON public.recommendation_feedback FOR UPDATE
    USING (auth.uid() = user_id);

-- =====================================================
-- SEED DATA (Optional)
-- =====================================================

-- Sample songs for testing
INSERT INTO public.songs (title, artist, genre, energy, valence, tempo, popularity, youtube_url) VALUES
('Happy', 'Pharrell Williams', 'Pop', 0.8, 0.95, 160, 95, 'https://www.youtube.com/watch?v=ZbZSe6N_BXs'),
('Someone Like You', 'Adele', 'Pop', 0.3, 0.2, 67, 90, 'https://www.youtube.com/watch?v=hLQl3WQQoQ0'),
('Eye of the Tiger', 'Survivor', 'Rock', 0.9, 0.7, 109, 85, 'https://www.youtube.com/watch?v=btPJPFnesV4'),
('Weightless', 'Marconi Union', 'Ambient', 0.1, 0.5, 60, 70, 'https://www.youtube.com/watch?v=UfcAVejslrU'),
('Smells Like Teen Spirit', 'Nirvana', 'Rock', 0.95, 0.4, 117, 88, 'https://www.youtube.com/watch?v=hTWKbfoikeg');

-- =====================================================
-- GRANTS (Optional - adjust based on your needs)
-- =====================================================

-- Grant usage to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated;

-- =====================================================
-- END OF SCHEMA
-- =====================================================
