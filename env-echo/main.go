package main

import (
	"bytes"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
)

func main() {
	loadEnv()

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Hello, %s", os.Getenv("MESSAGE"))
	})

	log.Println("running http server port 80")
	http.ListenAndServe(":80", nil)
}

func loadEnv() error {
	dotenvBody := os.Getenv("DOTENV_BODY")
	if len(dotenvBody) > 0 {
		envMap, err := godotenv.Parse(bytes.NewBufferString(dotenvBody))
		if err != nil {
			return err
		}
		for k, v := range envMap {
			if err := os.Setenv(k, v); err != nil {
				return err
			}
		}
		return nil
	}

	if _, err := os.Stat(".env"); err == nil {
		if err := godotenv.Overload(".env"); err != nil {
			return err
		}
	}
	return nil
}
