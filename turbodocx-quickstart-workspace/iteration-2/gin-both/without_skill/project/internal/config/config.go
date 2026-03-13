package config

import (
	"fmt"
	"os"
)

// Config holds all TurboDocx configuration for both TurboSign and TurboPartner.
type Config struct {
	// TurboDocx shared
	APIKey  string
	BaseURL string

	// TurboSign
	TurboSignWebhookSecret string

	// TurboPartner
	TurboPartnerWebhookSecret string

	// Server
	Port string
}

// Load reads configuration from environment variables and returns a Config.
// It returns an error if any required variable is missing.
func Load() (*Config, error) {
	cfg := &Config{
		APIKey:                    os.Getenv("TURBODOCX_API_KEY"),
		BaseURL:                   getEnvOrDefault("TURBODOCX_BASE_URL", "https://api.turbodocx.com"),
		TurboSignWebhookSecret:   os.Getenv("TURBOSIGN_WEBHOOK_SECRET"),
		TurboPartnerWebhookSecret: os.Getenv("TURBOPARTNER_WEBHOOK_SECRET"),
		Port:                      getEnvOrDefault("PORT", "8080"),
	}

	if cfg.APIKey == "" {
		return nil, fmt.Errorf("TURBODOCX_API_KEY is required")
	}

	return cfg, nil
}

func getEnvOrDefault(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
