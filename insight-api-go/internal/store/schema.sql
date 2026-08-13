-- MariaDB schema for Insight Studio long-term storage.
-- Product rule: store data content only; do NOT store imported raw files.

CREATE TABLE IF NOT EXISTS analyses (
  id            CHAR(36) NOT NULL,
  workspace_id  CHAR(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  name          VARCHAR(512) NOT NULL,
  revision      BIGINT NOT NULL DEFAULT 0,
  document      JSON NOT NULL,
  created_at    VARCHAR(32) NOT NULL,
  updated_at    VARCHAR(32) NOT NULL,
  deleted_at    VARCHAR(32) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS analyses_workspace_updated
  ON analyses (workspace_id, updated_at);

CREATE TABLE IF NOT EXISTS dashboards (
  id            CHAR(36) NOT NULL,
  workspace_id  CHAR(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  name          VARCHAR(512) NOT NULL,
  revision      BIGINT NOT NULL DEFAULT 0,
  document      JSON NOT NULL,
  created_at    VARCHAR(32) NOT NULL,
  updated_at    VARCHAR(32) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS dashboards_workspace_updated
  ON dashboards (workspace_id, updated_at);

CREATE TABLE IF NOT EXISTS table_snapshots (
  id              CHAR(36) NOT NULL,
  analysis_id     CHAR(36) NOT NULL,
  table_id        VARCHAR(128) NOT NULL,
  step_id         VARCHAR(128) NULL,
  data_version    VARCHAR(64) NOT NULL,
  columns         JSON NOT NULL,
  row_data        JSON NOT NULL,
  row_count       INT NOT NULL DEFAULT 0,
  created_at      VARCHAR(32) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY table_snapshots_version (analysis_id, table_id, data_version),
  CONSTRAINT table_snapshots_analysis_fk
    FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS table_snapshots_latest
  ON table_snapshots (analysis_id, table_id, created_at);

CREATE TABLE IF NOT EXISTS data_sources (
  id                CHAR(36) NOT NULL,
  analysis_id       CHAR(36) NOT NULL,
  kind              VARCHAR(64) NOT NULL,
  name              VARCHAR(512) NOT NULL,
  config            JSON NOT NULL,
  secret_ref        VARCHAR(256) NULL,
  last_data_version VARCHAR(64) NULL,
  last_synced_at    VARCHAR(32) NULL,
  status            VARCHAR(32) NOT NULL DEFAULT 'idle',
  error             TEXT NULL,
  step_id           VARCHAR(128) NULL,
  table_id          VARCHAR(128) NULL,
  created_at        VARCHAR(32) NOT NULL,
  updated_at        VARCHAR(32) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT data_sources_analysis_fk
    FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS data_sources_analysis ON data_sources (analysis_id);

CREATE TABLE IF NOT EXISTS event_outbox (
  id            BIGINT NOT NULL AUTO_INCREMENT,
  workspace_id  CHAR(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  event_type    VARCHAR(64) NOT NULL,
  payload       JSON NOT NULL,
  created_at    VARCHAR(32) NOT NULL,
  published_at  VARCHAR(32) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS event_outbox_created ON event_outbox (created_at);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id            VARCHAR(64) NOT NULL,
  analysis_id   VARCHAR(64) NULL,
  title         VARCHAR(512) NOT NULL DEFAULT '',
  created_at    VARCHAR(32) NOT NULL,
  updated_at    VARCHAR(32) NOT NULL,
  messages      JSON NOT NULL,
  user_id       VARCHAR(64) NOT NULL DEFAULT 'david',
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS ai_conv_updated ON ai_conversations (updated_at);
CREATE INDEX IF NOT EXISTS idx_ai_conv_user_updated ON ai_conversations (user_id, updated_at);
