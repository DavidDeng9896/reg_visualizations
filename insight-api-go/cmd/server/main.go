package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/api"
	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/mcp"
	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/skills"
	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/store"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8787"
	}
	dbPath := os.Getenv("INSIGHT_DB_PATH")
	if dbPath == "" {
		dbPath = filepath.Join("data", "insight.sqlite")
	}
	dataDir := os.Getenv("INSIGHT_DATA_DIR")
	if dataDir == "" {
		dataDir = filepath.Dir(dbPath)
	}

	st, err := store.Open(dbPath)
	if err != nil {
		log.Fatalf("open store: %v", err)
	}
	defer st.Close()

	skillStore, err := skills.NewStore(dataDir)
	if err != nil {
		log.Fatalf("skills store: %v", err)
	}
	officialSeed := os.Getenv("INSIGHT_SKILLS_SEED")
	if officialSeed == "" {
		officialSeed = filepath.Join("skills", "official")
	}
	if err := skillStore.SeedOfficial(officialSeed); err != nil {
		log.Printf("warn: seed official skills: %v", err)
	}

	mcpStore, err := mcp.NewStore(dataDir)
	if err != nil {
		log.Fatalf("mcp store: %v", err)
	}

	cfgPath := filepath.Join(dataDir, "ai-config.json")
	srv := api.NewWithOptions(st, cfgPath, skillStore, mcpStore)
	addr := "0.0.0.0:" + port
	log.Printf("[insight-api-go] listening on http://127.0.0.1:%s (data=%s)", port, dataDir)
	if err := http.ListenAndServe(addr, srv.Handler()); err != nil {
		log.Fatal(err)
	}
}
