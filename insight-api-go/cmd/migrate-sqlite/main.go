package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/migrate"
	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/store"
)

func main() {
	from := flag.String("from", "", "path to insight.sqlite (default INSIGHT_DB_PATH or data/insight.sqlite)")
	flag.Parse()
	src := *from
	if src == "" {
		src = os.Getenv("INSIGHT_DB_PATH")
	}
	if src == "" {
		src = "data/insight.sqlite"
	}
	if _, err := os.Stat(src); err != nil {
		log.Fatalf("sqlite source: %v", err)
	}

	st, err := store.OpenFromEnv()
	if err != nil {
		log.Fatalf("open mariadb: %v", err)
	}
	defer st.Close()

	stats, err := migrate.FromSQLite(src, st)
	if err != nil {
		log.Fatalf("migrate: %v", err)
	}
	fmt.Printf("migrated from %s → MariaDB: analyses=%d dashboards=%d snapshots=%d outbox=%d conversations=%d\n",
		src, stats.Analyses, stats.Dashboards, stats.Snapshots, stats.Outbox, stats.Conversations)
}
