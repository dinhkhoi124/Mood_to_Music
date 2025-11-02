-- Create songs table for better music catalog management
CREATE TABLE IF NOT EXISTS public.songs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  genre TEXT,
  spotify_url TEXT,
  youtube_url TEXT,
  preview_url TEXT,
  duration_ms INTEGER,
  popularity INTEGER DEFAULT 0,
  energy NUMERIC(3,2), -- 0.00 to 1.00
  valence NUMERIC(3,2), -- 0.00 to 1.00 (happiness level)
  tempo NUMERIC(6,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster song lookups
CREATE INDEX idx_songs_genre ON public.songs(genre);
CREATE INDEX idx_songs_artist ON public.songs(artist);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  favorite_genres TEXT[],
  preferred_energy NUMERIC(3,2), -- 0.00 to 1.00
  preferred_tempo TEXT, -- 'slow', 'medium', 'fast'
  language_preference TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create playlists table
CREATE TABLE IF NOT EXISTS public.playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create playlist_songs junction table
CREATE TABLE IF NOT EXISTS public.playlist_songs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, song_id)
);

-- Create recommendation_feedback table
CREATE TABLE IF NOT EXISTS public.recommendation_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emotion_history_id UUID REFERENCES public.emotion_history(id) ON DELETE SET NULL,
  song_id UUID REFERENCES public.songs(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create emotion_song_mapping table for ML/recommendation system
CREATE TABLE IF NOT EXISTS public.emotion_song_mapping (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  emotion_type TEXT NOT NULL,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  weight NUMERIC(3,2) DEFAULT 1.0, -- relevance weight
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(emotion_type, song_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emotion_song_mapping ENABLE ROW LEVEL SECURITY;

-- RLS Policies for songs (public read, admin write)
CREATE POLICY "Songs are viewable by everyone"
ON public.songs FOR SELECT
USING (true);

-- RLS Policies for user_preferences
CREATE POLICY "Users can view their own preferences"
ON public.user_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
ON public.user_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON public.user_preferences FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for playlists
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

-- RLS Policies for playlist_songs
CREATE POLICY "Users can view songs in their playlists or public playlists"
ON public.playlist_songs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.playlists
    WHERE playlists.id = playlist_songs.playlist_id
    AND (playlists.user_id = auth.uid() OR playlists.is_public = true)
  )
);

CREATE POLICY "Users can add songs to their own playlists"
ON public.playlist_songs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.playlists
    WHERE playlists.id = playlist_songs.playlist_id
    AND playlists.user_id = auth.uid()
  )
);

CREATE POLICY "Users can remove songs from their own playlists"
ON public.playlist_songs FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.playlists
    WHERE playlists.id = playlist_songs.playlist_id
    AND playlists.user_id = auth.uid()
  )
);

-- RLS Policies for recommendation_feedback
CREATE POLICY "Users can view their own feedback"
ON public.recommendation_feedback FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback"
ON public.recommendation_feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback"
ON public.recommendation_feedback FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for emotion_song_mapping (public read for recommendations)
CREATE POLICY "Emotion mappings are viewable by everyone"
ON public.emotion_song_mapping FOR SELECT
USING (true);

-- Create triggers for updated_at columns
CREATE TRIGGER update_songs_updated_at
BEFORE UPDATE ON public.songs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_playlists_updated_at
BEFORE UPDATE ON public.playlists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_playlists_user_id ON public.playlists(user_id);
CREATE INDEX idx_playlist_songs_playlist_id ON public.playlist_songs(playlist_id);
CREATE INDEX idx_playlist_songs_song_id ON public.playlist_songs(song_id);
CREATE INDEX idx_recommendation_feedback_user_id ON public.recommendation_feedback(user_id);
CREATE INDEX idx_emotion_song_mapping_emotion ON public.emotion_song_mapping(emotion_type);