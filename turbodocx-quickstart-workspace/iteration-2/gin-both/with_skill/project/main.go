package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/myorg/myapp/internal/config"
	"github.com/myorg/myapp/internal/handlers"
)

func main() {
	// Load environment variables from .env file
	godotenv.Load()

	// Initialize TurboDocx clients
	turboSignClient := config.TurboSignClient()
	turboPartnerClient := config.TurboPartnerClient()

	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	// Register TurboDocx API routes
	api := r.Group("/api")
	handlers.NewTurboSignHandler(turboSignClient).RegisterRoutes(api)
	handlers.NewTurboPartnerHandler(turboPartnerClient).RegisterRoutes(api)

	r.Run(":8080")
}
