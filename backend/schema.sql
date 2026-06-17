-- backend/schema.sql
-- Balik-Suling PostgreSQL schema (Neon).
-- Idempotent: safe to run multiple times.

-- View counters. Keys are mixed: route paths ("/chords/.."), "title:Name", and plain titles.
CREATE TABLE IF NOT EXISTS views (
    view_key   TEXT PRIMARY KEY,
    count      INTEGER NOT NULL DEFAULT 0
);

-- User feedback submissions.
-- id mirrors the original Date.now() millisecond value so existing data keeps its ids.
CREATE TABLE IF NOT EXISTS feedback (
    id          BIGINT PRIMARY KEY,
    name        TEXT        NOT NULL,
    email       TEXT        NOT NULL,
    rating      INTEGER     NOT NULL DEFAULT 5,
    comment     TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Songs catalog (built-in songs + admin-managed songs).
CREATE TABLE IF NOT EXISTS songs (
    id            BIGINT PRIMARY KEY,
    title         TEXT NOT NULL,
    image         TEXT DEFAULT '',
    audio         TEXT DEFAULT '',
    path          TEXT DEFAULT '',
    youtube_link  TEXT DEFAULT ''
);
-- For tables that already exist from an earlier deploy:
ALTER TABLE songs ADD COLUMN IF NOT EXISTS youtube_link TEXT DEFAULT '';

-- Per-track listen counts (was Firestore "listenCounts").
CREATE TABLE IF NOT EXISTS listen_counts (
    track_id  TEXT PRIMARY KEY,
    count     INTEGER NOT NULL DEFAULT 0
);

-- Dictionary lookup cache (was cache/dict-cache.json). Optional / performance cache.
CREATE TABLE IF NOT EXISTS dict_cache (
    term        TEXT PRIMARY KEY,
    entry       JSONB NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users who log in to the site (Google OAuth or local email/password).
-- email is the natural key across both providers (stored lowercased).
-- No passwords are stored here.
CREATE TABLE IF NOT EXISTS users (
    id             BIGSERIAL PRIMARY KEY,
    email          TEXT UNIQUE NOT NULL,
    name           TEXT,
    picture        TEXT,
    provider       TEXT NOT NULL DEFAULT 'local',   -- 'google' | 'local'
    google_sub     TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    login_count    INTEGER NOT NULL DEFAULT 0
);
