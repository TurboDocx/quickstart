package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	turbodocx "github.com/turbodocx/sdk-go"
)

// TurboSignHandler holds the TurboDocx client for TurboSign operations.
type TurboSignHandler struct {
	client *turbodocx.Client
}

// NewTurboSignHandler creates a new TurboSignHandler with the given client.
func NewTurboSignHandler(client *turbodocx.Client) *TurboSignHandler {
	return &TurboSignHandler{client: client}
}

// CreateSignatureRequest creates a new digital signature request.
//
//	POST /turbosign/signature-requests
//	Body: { "document_url": "...", "signers": [{ "email": "...", "name": "..." }] }
func (h *TurboSignHandler) CreateSignatureRequest(c *gin.Context) {
	var req struct {
		DocumentURL string `json:"document_url" binding:"required"`
		Signers     []struct {
			Email string `json:"email" binding:"required"`
			Name  string `json:"name" binding:"required"`
		} `json:"signers" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	signers := make([]turbodocx.Signer, len(req.Signers))
	for i, s := range req.Signers {
		signers[i] = turbodocx.Signer{
			Email: s.Email,
			Name:  s.Name,
		}
	}

	result, err := h.client.TurboSign.CreateSignatureRequest(&turbodocx.CreateSignatureRequestParams{
		DocumentURL: req.DocumentURL,
		Signers:     signers,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"signature_request": result,
	})
}

// GetSignatureRequest retrieves a signature request by ID.
//
//	GET /turbosign/signature-requests/:id
func (h *TurboSignHandler) GetSignatureRequest(c *gin.Context) {
	id := c.Param("id")

	result, err := h.client.TurboSign.GetSignatureRequest(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"signature_request": result,
	})
}

// ListSignatureRequests lists all signature requests.
//
//	GET /turbosign/signature-requests
func (h *TurboSignHandler) ListSignatureRequests(c *gin.Context) {
	results, err := h.client.TurboSign.ListSignatureRequests()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"signature_requests": results,
	})
}

// HandleWebhook processes incoming TurboSign webhook events.
//
//	POST /turbosign/webhooks
func (h *TurboSignHandler) HandleWebhook(c *gin.Context) {
	payload, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read request body"})
		return
	}

	signature := c.GetHeader("X-TurboSign-Signature")
	webhookSecret := c.GetString("turbosign_webhook_secret")

	event, err := h.client.TurboSign.VerifyWebhook(payload, signature, webhookSecret)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid webhook signature"})
		return
	}

	switch event.Type {
	case "signature_request.completed":
		// All signers have signed the document
		// TODO: Add your business logic here
		break
	case "signature_request.signed":
		// A single signer has signed
		// TODO: Add your business logic here
		break
	case "signature_request.declined":
		// A signer has declined to sign
		// TODO: Add your business logic here
		break
	default:
		// Unhandled event type — log and acknowledge
		break
	}

	c.JSON(http.StatusOK, gin.H{"received": true})
}
