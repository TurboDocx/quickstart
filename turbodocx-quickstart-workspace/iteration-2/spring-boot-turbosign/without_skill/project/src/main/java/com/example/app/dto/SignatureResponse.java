package com.example.app.dto;

import java.time.Instant;
import java.util.List;

/**
 * Response DTO representing the status of a TurboSign signature request.
 */
public class SignatureResponse {

    private String signatureRequestId;
    private String status;
    private String documentName;
    private List<SignerStatus> signers;
    private Instant createdAt;
    private Instant updatedAt;
    private String signedDocumentUrl;

    public String getSignatureRequestId() {
        return signatureRequestId;
    }

    public void setSignatureRequestId(String signatureRequestId) {
        this.signatureRequestId = signatureRequestId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getDocumentName() {
        return documentName;
    }

    public void setDocumentName(String documentName) {
        this.documentName = documentName;
    }

    public List<SignerStatus> getSigners() {
        return signers;
    }

    public void setSigners(List<SignerStatus> signers) {
        this.signers = signers;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getSignedDocumentUrl() {
        return signedDocumentUrl;
    }

    public void setSignedDocumentUrl(String signedDocumentUrl) {
        this.signedDocumentUrl = signedDocumentUrl;
    }

    /**
     * Status of an individual signer within a signature request.
     */
    public static class SignerStatus {
        private String name;
        private String email;
        private String status;
        private Instant signedAt;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public Instant getSignedAt() {
            return signedAt;
        }

        public void setSignedAt(Instant signedAt) {
            this.signedAt = signedAt;
        }
    }
}
