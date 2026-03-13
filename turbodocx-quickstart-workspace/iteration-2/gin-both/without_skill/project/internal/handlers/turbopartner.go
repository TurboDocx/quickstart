package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	turbodocx "github.com/turbodocx/sdk-go"
)

// TurboPartnerHandler holds the TurboDocx client for TurboPartner operations.
type TurboPartnerHandler struct {
	client *turbodocx.Client
}

// NewTurboPartnerHandler creates a new TurboPartnerHandler with the given client.
func NewTurboPartnerHandler(client *turbodocx.Client) *TurboPartnerHandler {
	return &TurboPartnerHandler{client: client}
}

// CreatePartnerOrg creates a new partner organization.
//
//	POST /turbopartner/organizations
//	Body: { "name": "...", "email": "..." }
func (h *TurboPartnerHandler) CreatePartnerOrg(c *gin.Context) {
	var req struct {
		Name  string `json:"name" binding:"required"`
		Email string `json:"email" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	org, err := h.client.TurboPartner.CreateOrganization(&turbodocx.CreateOrganizationParams{
		Name:  req.Name,
		Email: req.Email,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"organization": org,
	})
}

// GetPartnerOrg retrieves a partner organization by ID.
//
//	GET /turbopartner/organizations/:id
func (h *TurboPartnerHandler) GetPartnerOrg(c *gin.Context) {
	id := c.Param("id")

	org, err := h.client.TurboPartner.GetOrganization(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"organization": org,
	})
}

// ListPartnerOrgs lists all partner organizations.
//
//	GET /turbopartner/organizations
func (h *TurboPartnerHandler) ListPartnerOrgs(c *gin.Context) {
	orgs, err := h.client.TurboPartner.ListOrganizations()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"organizations": orgs,
	})
}

// CreatePartnerUser creates a user within a partner organization.
//
//	POST /turbopartner/organizations/:id/users
//	Body: { "email": "...", "name": "...", "role": "admin|member" }
func (h *TurboPartnerHandler) CreatePartnerUser(c *gin.Context) {
	orgID := c.Param("id")

	var req struct {
		Email string `json:"email" binding:"required"`
		Name  string `json:"name" binding:"required"`
		Role  string `json:"role" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.client.TurboPartner.CreateUser(orgID, &turbodocx.CreateUserParams{
		Email: req.Email,
		Name:  req.Name,
		Role:  req.Role,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"user": user,
	})
}

// HandleWebhook processes incoming TurboPartner webhook events.
//
//	POST /turbopartner/webhooks
func (h *TurboPartnerHandler) HandleWebhook(c *gin.Context) {
	payload, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read request body"})
		return
	}

	signature := c.GetHeader("X-TurboPartner-Signature")
	webhookSecret := c.GetString("turbopartner_webhook_secret")

	event, err := h.client.TurboPartner.VerifyWebhook(payload, signature, webhookSecret)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid webhook signature"})
		return
	}

	switch event.Type {
	case "organization.created":
		// A new partner organization was created
		// TODO: Add your business logic here
		break
	case "organization.updated":
		// A partner organization was updated
		// TODO: Add your business logic here
		break
	case "user.invited":
		// A user was invited to a partner organization
		// TODO: Add your business logic here
		break
	default:
		// Unhandled event type — log and acknowledge
		break
	}

	c.JSON(http.StatusOK, gin.H{"received": true})
}
