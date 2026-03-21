-- ============================================================
-- Obsidian Audio — PostgreSQL Schema
-- Run: node utils/migrate.js
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- fuzzy search

-- ─── Users ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firebase_uid    TEXT UNIQUE,
  email           TEXT UNIQUE NOT NULL,
  display_name    TEXT NOT NULL DEFAULT 'User',
  avatar_url      TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  is_premium      BOOLEAN DEFAULT FALSE,
  preferences     JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_email ON users(email);

-- ─── Tracks (cached metadata) ────────────────────────────
CREATE TABLE IF NOT EXISTS tracks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  youtube_id      TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  artist          TEXT NOT NULL,
  album           TEXT,
  duration        INTEGER,         -- seconds
  thumbnail_url   TEXT,
  is_playable     BOOLEAN DEFAULT TRUE,
  cached_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tracks_youtube_id ON tracks(youtube_id);
CREATE INDEX idx_tracks_title_trgm ON tracks USING GIN (title gin_trgm_ops);
CREATE INDEX idx_tracks_artist_trgm ON tracks USING GIN (artist gin_trgm_ops);

-- ─── Playlists ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS playlists (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  cover_url       TEXT,
  is_public       BOOLEAN DEFAULT FALSE,
  track_count     INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_playlists_user_id ON playlists(user_id);

-- ─── Playlist Tracks ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS playlist_tracks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playlist_id     UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_id        UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  position        INTEGER NOT NULL DEFAULT 0,
  added_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(playlist_id, track_id)
);

CREATE INDEX idx_playlist_tracks_playlist_id ON playlist_tracks(playlist_id);

-- ─── Liked Tracks ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS liked_tracks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id        UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  liked_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, track_id)
);

CREATE INDEX idx_liked_tracks_user_id ON liked_tracks(user_id);

-- ─── Play History ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS play_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id        UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  played_at       TIMESTAMPTZ DEFAULT NOW(),
  play_duration   INTEGER DEFAULT 0,  -- seconds actually listened
  device_type     TEXT DEFAULT 'web'  -- web | extension | mobile
);

CREATE INDEX idx_play_history_user_id ON play_history(user_id);
CREATE INDEX idx_play_history_played_at ON play_history(played_at DESC);
-- Partition hint: for large datasets, partition by month

-- ─── Search History ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS search_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query           TEXT NOT NULL,
  result_count    INTEGER DEFAULT 0,
  searched_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_search_history_user_id ON search_history(user_id);
CREATE INDEX idx_search_history_searched_at ON search_history(searched_at DESC);

-- ─── Podcasts ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS podcasts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  youtube_channel TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  cover_url       TEXT,
  category        TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS podcast_episodes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  podcast_id      UUID NOT NULL REFERENCES podcasts(id) ON DELETE CASCADE,
  youtube_id      TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  duration        INTEGER,
  thumbnail_url   TEXT,
  published_at    TIMESTAMPTZ,
  cached_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Podcast Progress ────────────────────────────────────
CREATE TABLE IF NOT EXISTS podcast_progress (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  episode_id      UUID NOT NULL REFERENCES podcast_episodes(id) ON DELETE CASCADE,
  position        INTEGER DEFAULT 0,  -- seconds
  completed       BOOLEAN DEFAULT FALSE,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, episode_id)
);

-- ─── Auto-update updated_at ───────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tracks_updated_at BEFORE UPDATE ON tracks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER playlists_updated_at BEFORE UPDATE ON playlists FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Auto-update playlist track count ────────────────────
CREATE OR REPLACE FUNCTION update_playlist_track_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE playlists SET track_count = track_count + 1 WHERE id = NEW.playlist_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE playlists SET track_count = GREATEST(track_count - 1, 0) WHERE id = OLD.playlist_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER playlist_track_count_trigger
AFTER INSERT OR DELETE ON playlist_tracks
FOR EACH ROW EXECUTE FUNCTION update_playlist_track_count();
