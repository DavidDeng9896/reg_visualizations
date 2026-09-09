-- Dev/test harness grants (docker-entrypoint-initdb.d; runs on fresh volumes only).
-- Store tests prefer CREATE DATABASE insight_test_* when permitted; otherwise they
-- reuse the fixed insight_test database (see internal/storetest).
CREATE DATABASE IF NOT EXISTS insight_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON insight_test.* TO 'insight'@'%';
-- Optional: allow per-test CREATE/DROP DATABASE for stronger isolation.
GRANT ALL PRIVILEGES ON *.* TO 'insight'@'%';
FLUSH PRIVILEGES;
