package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	turbodocx "github.com/turbodocx/sdk"
)

// TurboPartnerHandler holds the TurboDocx partner client for organization management.
type TurboPartnerHandler struct {
	partner *turbodocx.PartnerClient
}

// NewTurboPartnerHandler creates a new handler with the given TurboDocx partner client.
func NewTurboPartnerHandler(partner *turbodocx.PartnerClient) *TurboPartnerHandler {
	return &TurboPartnerHandler{partner: partner}
}

// RegisterRoutes registers TurboPartner routes on the given router group.
func (h *TurboPartnerHandler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.POST("/organizations", h.CreateOrganization)
	rg.GET("/organizations", h.ListOrganizations)
}

// createOrgRequest is the request body for creating an organization.
type createOrgRequest struct {
	Name     string             `json:"name" binding:"required"`
	Features *turbodocx.Features `json:"features,omitempty"`
}

// CreateOrganization handles POST /api/organizations
// Provisions a new customer organization via TurboPartner.
func (h *TurboPartnerHandler) CreateOrganization(c *gin.Context) {
	var req createOrgRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}

	// Create the organization via TurboPartner
	org, err := h.partner.CreateOrganization(c.Request.Context(), &turbodocx.CreateOrganizationRequest{
		Name:     req.Name,
		Features: req.Features,
	})
	if err != nil {
		handleTurboDocxError(c, err)
		return
	}

	c.JSON(http.StatusCreated, org)
}

// ListOrganizations handles GET /api/organizations
// Lists managed organizations with optional pagination via ?page= and ?limit= query params.
func (h *TurboPartnerHandler) ListOrganizations(c *gin.Context) {
	// Parse optional pagination query params
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	orgs, err := h.partner.ListOrganizations(c.Request.Context(), &turbodocx.ListOrganizationsRequest{
		Page:  page,
		Limit: limit,
	})
	if err != nil {
		handleTurboDocxError(c, err)
		return
	}

	c.JSON(http.StatusOK, orgs)
}
