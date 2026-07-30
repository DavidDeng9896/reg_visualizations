package main

import (
	"log"
	"net/http"
	"os"

	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/api"
	"github.com/DavidDeng9896/reg_visualizations/insight-api-go/internal/store"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8787"
	}
	st, err := store.Open("")
	if err != nil {
		log.Fatalf("open store: %v", err)
	}
	defer st.Close()

	srv := api.New(st)
	addr := "0.0.0.0:" + port
	log.Printf("[insight-api-go] listening on http://127.0.0.1:%s", port)
	if err := http.ListenAndServe(addr, srv.Handler()); err != nil {
		log.Fatal(err)
	}
}
