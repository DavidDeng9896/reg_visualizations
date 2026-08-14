package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/api"
	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/store"
	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/userscope"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8787"
	}
	dataDir := store.DataDirFromEnv()
	if err := os.MkdirAll(dataDir, 0o755); err != nil {
		log.Fatalf("data dir: %v", err)
	}

	st, err := store.OpenFromEnv()
	if err != nil {
		log.Fatalf("open store: %v", err)
	}
	defer st.Close()

	officialSeed := os.Getenv("INSIGHT_SKILLS_SEED")
	if officialSeed == "" {
		officialSeed = filepath.Join("skills", "official")
	}
	if err := userscope.MigrateOnce(dataDir, officialSeed); err != nil {
		log.Printf("warn: user scope migrate: %v", err)
	}

	cfgPath := filepath.Join(dataDir, "ai-config.json")
	srv := api.NewWithUserData(st, cfgPath, dataDir, officialSeed)
	addr := "0.0.0.0:" + port
	log.Printf("[insight-api-go] listening on http://127.0.0.1:%s storage=mariadb data=%s", port, dataDir)
	if err := http.ListenAndServe(addr, srv.Handler()); err != nil {
		log.Fatal(err)
	}
}
