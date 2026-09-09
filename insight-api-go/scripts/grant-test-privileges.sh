#!/usr/bin/env bash
# Grant MariaDB privileges needed by insight-api-go store tests.
# Safe to re-run (idempotent). Does not change production API behavior.
#
# Usage:
#   cd insight-api-go && ./scripts/grant-test-privileges.sh
#
# Env (optional):
#   MARIADB_ROOT_PASSWORD  (default: insight)
#   INSIGHT_DB_USER        (default: insight)
#   INSIGHT_TEST_DB        (default: insight_test)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ROOT_PASS="${MARIADB_ROOT_PASSWORD:-insight}"
TEST_USER="${INSIGHT_DB_USER:-insight}"
TEST_DB="${INSIGHT_TEST_DB:-insight_test}"

SQL=$(cat <<SQL
CREATE DATABASE IF NOT EXISTS \`${TEST_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON \`${TEST_DB}\`.* TO '${TEST_USER}'@'%';
GRANT ALL PRIVILEGES ON \`${TEST_DB}\`.* TO '${TEST_USER}'@'localhost';
GRANT ALL PRIVILEGES ON \`${TEST_DB}\`.* TO '${TEST_USER}'@'127.0.0.1';
-- Per-test CREATE DATABASE insight_test_* isolation (optional but preferred).
GRANT ALL PRIVILEGES ON *.* TO '${TEST_USER}'@'%';
GRANT ALL PRIVILEGES ON *.* TO '${TEST_USER}'@'localhost';
GRANT ALL PRIVILEGES ON *.* TO '${TEST_USER}'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL
)

run_sql() {
  local desc="$1"
  shift
  echo "==> ${desc}"
  "$@"
}

if command -v docker >/dev/null 2>&1 && docker compose ps --status running 2>/dev/null | grep -q mariadb; then
  run_sql "docker compose MariaDB (root)" \
    docker compose exec -T mariadb mariadb -uroot -p"${ROOT_PASS}" -e "${SQL}"
  echo "OK: grants applied via docker compose."
  exit 0
fi

if command -v mysql >/dev/null 2>&1; then
  SOCK_ARGS=()
  if [[ -S /var/run/mysqld/mysqld.sock ]]; then
    SOCK_ARGS=(--socket=/var/run/mysqld/mysqld.sock)
  elif [[ -S /run/mysqld/mysqld.sock ]]; then
    SOCK_ARGS=(--socket=/run/mysqld/mysqld.sock)
  fi
  if mysql "${SOCK_ARGS[@]}" -uroot -p"${ROOT_PASS}" -e "SELECT 1" >/dev/null 2>&1; then
    run_sql "local mysql as root (password)" \
      mysql "${SOCK_ARGS[@]}" -uroot -p"${ROOT_PASS}" -e "${SQL}"
    echo "OK: grants applied via local mysql."
    exit 0
  fi
  if sudo mysql "${SOCK_ARGS[@]}" -e "SELECT 1" >/dev/null 2>&1; then
    run_sql "local mysql via sudo" \
      sudo mysql "${SOCK_ARGS[@]}" -e "${SQL}"
    echo "OK: grants applied via sudo mysql."
    exit 0
  fi
fi

cat <<EOF
ERROR: could not reach MariaDB as root.

Options:
  1) Start compose:  docker compose up -d
     then re-run:    ./scripts/grant-test-privileges.sh
  2) Or set INSIGHT_TEST_DSN to a pre-created database the test user can use, e.g.
       export INSIGHT_TEST_DSN='insight:insight@tcp(127.0.0.1:3306)/insight_test?parseTime=false&charset=utf8mb4&loc=UTC'
  3) Manually as root:
       CREATE DATABASE IF NOT EXISTS ${TEST_DB} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
       GRANT ALL PRIVILEGES ON ${TEST_DB}.* TO '${TEST_USER}'@'%';
       GRANT ALL PRIVILEGES ON *.* TO '${TEST_USER}'@'%';
       FLUSH PRIVILEGES;
EOF
exit 1
