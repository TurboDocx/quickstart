package config

import (
	"log"
	"os"

	turbodocx "github.com/turbodocx/sdk"
)

// TurboSignClient returns a configured TurboDocx client for TurboSign operations.
func TurboSignClient() *turbodocx.Client {
	client, err := turbodocx.NewClientWithConfig(turbodocx.ClientConfig{
		APIKey:      os.Getenv("TURBODOCX_API_KEY"),
		OrgID:       os.Getenv("TURBODOCX_ORG_ID"),
		SenderEmail: os.Getenv("TURBODOCX_SENDER_EMAIL"),
		SenderName:  os.Getenv("TURBODOCX_SENDER_NAME"),
	})
	if err != nil {
		log.Fatalf("Failed to initialize TurboSign client: %v", err)
	}
	return client
}

// TurboPartnerClient returns a configured TurboDocx partner client for TurboPartner operations.
func TurboPartnerClient() *turbodocx.PartnerClient {
	partner, err := turbodocx.NewPartnerClient(turbodocx.PartnerConfig{
		PartnerAPIKey: os.Getenv("TURBODOCX_PARTNER_API_KEY"),
		PartnerID:     os.Getenv("TURBODOCX_PARTNER_ID"),
	})
	if err != nil {
		log.Fatalf("Failed to initialize TurboPartner client: %v", err)
	}
	return partner
}
