-- PostgreSQL schema for Insight Studio long-term storage
-- Product rule: store data content only; do NOT store imported raw files.

CREATE TABLE IF NOT EXISTS analyses (
  id            UUID PRIMARY KEY,
  workspace_id  UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  name          TEXT NOT NULL,
  revision      BIGINT NOT NULL DEFAULT 0,
  document      JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS analyses_workspace_updated ON analyses (workspace_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS dashboards (
  id            UUID PRIMARY KEY,
  workspace_id  UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  name          TEXT NOT NULL,
  revision      BIGINT NOT NULL DEFAULT 0,
  document      JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dashboards_workspace_updated ON dashboards (workspace_id, updated_at DESC);

-- Table data content (import / edit / step materialization)
CREATE TABLE IF NOT EXISTS table_snapshots (
  id              UUID PRIMARY KEY,
  analysis_id     UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  table_id        TEXT NOT NULL,
  step_id         TEXT,
  data_version    TEXT NOT NULL,
  columns         JSONB NOT NULL,
  rows            JSONB NOT NULL,
  row_count       INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (analysis_id, table_id, data_version)
);
CREATE INDEX IF NOT EXISTS table_snapshots_latest
  ON table_snapshots (analysis_id, table_id, created_at DESC);

CREATE TABLE IF NOT EXISTS data_sources (
  id                UUID PRIMARY KEY,
  analysis_id       UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  kind              TEXT NOT NULL,
  name              TEXT NOT NULL,
  config            JSONB NOT NULL DEFAULT '{}',
  secret_ref        TEXT,
  last_data_version TEXT,
  last_synced_at    TIMESTAMPTZ,
  status            TEXT NOT NULL DEFAULT 'idle',
  error             TEXT,
  step_id           TEXT,
  table_id          TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS data_sources_analysis ON data_sources (analysis_id);

CREATE TABLE IF NOT EXISTS event_outbox (
  id            BIGSERIAL PRIMARY KEY,
  workspace_id  UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  event_type    TEXT NOT NULL,
  payload       JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS event_outbox_pending ON event_outbox (created_at)
  WHERE published_at IS NULL;

-- AI assistant conversations (config lives in ai-config.json)
CREATE TABLE IF NOT EXISTS ai_conversations (
  id            TEXT PRIMARY KEY,
  analysis_id   TEXT,
  title         TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  messages      JSONB NOT NULL DEFAULT '[]',
  user_id       TEXT NOT NULL DEFAULT 'david'
);
CREATE INDEX IF NOT EXISTS ai_conv_updated ON ai_conversations (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conv_user_updated ON ai_conversations (user_id, updated_at DESC);
