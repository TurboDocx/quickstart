package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	turbodocx "github.com/turbodocx/sdk"
)

// TurboSignHandler holds the TurboDocx client for signature operations.
type TurboSignHandler struct {
	client *turbodocx.Client
}

// NewTurboSignHandler creates a new handler with the given TurboDocx client.
func NewTurboSignHandler(client *turbodocx.Client) *TurboSignHandler {
	return &TurboSignHandler{client: client}
}

// RegisterRoutes registers TurboSign routes on the given router group.
func (h *TurboSignHandler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.POST("/signatures/send", h.SendSignature)
	rg.GET("/signatures/:id/status", h.GetStatus)
}

// SendSignature handles POST /api/signatures/send
// Accepts a multipart form with file, document_name, recipients (JSON), and fields (JSON).
func (h *TurboSignHandler) SendSignature(c *gin.Context) {
	// Read uploaded PDF file
	file, _, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}
	defer file.Close()

	fileBytes, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read file"})
		return
	}

	// Parse document name
	documentName := c.PostForm("document_name")
	if documentName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "document_name is required"})
		return
	}

	// Parse recipients from JSON string
	var recipients []turbodocx.Recipient
	if err := json.Unmarshal([]byte(c.PostForm("recipients")), &recipients); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid recipients JSON"})
		return
	}

	// Parse fields from JSON string
	var fields []turbodocx.Field
	if fieldsStr := c.PostForm("fields"); fieldsStr != "" {
		if err := json.Unmarshal([]byte(fieldsStr), &fields); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid fields JSON"})
			return
		}
	}

	// Send the document for signature via TurboSign
	result, err := h.client.TurboSign.SendSignature(c.Request.Context(), &turbodocx.SendSignatureRequest{
		File:         fileBytes,
		DocumentName: documentName,
		Recipients:   recipients,
		Fields:       fields,
	})
	if err != nil {
		handleTurboDocxError(c, err)
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetStatus handles GET /api/signatures/:id/status
// Returns the current status of a signature request.
func (h *TurboSignHandler) GetStatus(c *gin.Context) {
	id := c.Param("id")

	status, err := h.client.TurboSign.GetStatus(c.Request.Context(), id)
	if err != nil {
		handleTurboDocxError(c, err)
		return
	}

	c.JSON(http.StatusOK, status)
}

// handleTurboDocxError maps TurboDocx SDK errors to appropriate HTTP responses.
func handleTurboDocxError(c *gin.Context, err error) {
	var tdxErr *turbodocx.TurboDocxError
	if errors.As(err, &tdxErr) {
		c.JSON(tdxErr.StatusCode, gin.H{"error": tdxErr.Message})
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
}
