package main

import (
	"bytes"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	"github.com/spf13/cobra"
)

func main() {
	loadEnv()

	api := &cobra.Command{
		Use:   "api",
		Short: "",
		RunE: func(cmd *cobra.Command, args []string) error {
			http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
				fmt.Fprintf(w, "Hello World, %s", os.Getenv("MESSAGE"))
			})

			log.Println("running http server port 80")
			http.ListenAndServe(":80", nil)

			return nil
		},
	}

	batch := &cobra.Command{
		Use:   "batch",
		Short: "",
		RunE: func(cmd *cobra.Command, args []string) error {
			fmt.Printf("Hello World, %s", os.Getenv("MESSAGE"))
			return nil
		},
	}

	cmd := &cobra.Command{
		Use:   "enc-echo",
		Short: "",
	}

	cmd.AddCommand(api, batch)
	if err := cmd.Execute(); err != nil {
		os.Exit(1)
	}
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
