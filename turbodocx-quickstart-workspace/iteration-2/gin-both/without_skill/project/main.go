package main

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	turbodocx "github.com/turbodocx/sdk-go"

	"github.com/myorg/myapp/internal/config"
	"github.com/myorg/myapp/internal/handlers"
)

func main() {
	// Load .env file (optional — will use system env vars if .env is absent)
	_ = godotenv.Load()

	// Load and validate configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Initialize the TurboDocx SDK client
	client, err := turbodocx.NewClient(cfg.APIKey, &turbodocx.ClientOptions{
		BaseURL: cfg.BaseURL,
	})
	if err != nil {
		log.Fatalf("Failed to initialize TurboDocx client: %v", err)
	}

	// Create Gin router
	r := gin.Default()

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	// --- TurboSign routes ---
	turboSignHandler := handlers.NewTurboSignHandler(client)
	turboSign := r.Group("/turbosign")
	{
		turboSign.POST("/signature-requests", turboSignHandler.CreateSignatureRequest)
		turboSign.GET("/signature-requests/:id", turboSignHandler.GetSignatureRequest)
		turboSign.GET("/signature-requests", turboSignHandler.ListSignatureRequests)
		turboSign.POST("/webhooks", func(c *gin.Context) {
			c.Set("turbosign_webhook_secret", cfg.TurboSignWebhookSecret)
			turboSignHandler.HandleWebhook(c)
		})
	}

	// --- TurboPartner routes ---
	turboPartnerHandler := handlers.NewTurboPartnerHandler(client)
	turboPartner := r.Group("/turbopartner")
	{
		turboPartner.POST("/organizations", turboPartnerHandler.CreatePartnerOrg)
		turboPartner.GET("/organizations/:id", turboPartnerHandler.GetPartnerOrg)
		turboPartner.GET("/organizations", turboPartnerHandler.ListPartnerOrgs)
		turboPartner.POST("/organizations/:id/users", turboPartnerHandler.CreatePartnerUser)
		turboPartner.POST("/webhooks", func(c *gin.Context) {
			c.Set("turbopartner_webhook_secret", cfg.TurboPartnerWebhookSecret)
			turboPartnerHandler.HandleWebhook(c)
		})
	}

	log.Printf("Server starting on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
