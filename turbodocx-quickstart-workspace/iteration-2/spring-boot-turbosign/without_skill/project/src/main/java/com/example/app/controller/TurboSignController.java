package com.example.app.controller;

import com.example.app.dto.SignatureRequest;
import com.example.app.dto.SignatureResponse;
import com.example.app.service.TurboSignService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST controller for TurboSign digital signature operations.
 *
 * Endpoints:
 *   POST   /api/signatures         - Send a document for signing
 *   GET    /api/signatures/{id}    - Check signature request status
 *   DELETE /api/signatures/{id}    - Cancel a signature request
 *   POST   /api/signatures/webhook - Receive TurboSign status callbacks
 */
@RestController
@RequestMapping("/api/signatures")
public class TurboSignController {

    private static final Logger log = LoggerFactory.getLogger(TurboSignController.class);

    private final TurboSignService turboSignService;

    public TurboSignController(TurboSignService turboSignService) {
        this.turboSignService = turboSignService;
    }

    /**
     * Send a document for digital signature.
     *
     * @param request the signature request payload
     * @return the created signature request with its ID and status
     */
    @PostMapping
    public ResponseEntity<SignatureResponse> sendForSignature(@RequestBody SignatureRequest request) {
        if (request.getDocumentUrl() == null || request.getDocumentUrl().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        if (request.getSigners() == null || request.getSigners().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        SignatureResponse response = turboSignService.sendForSignature(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get the current status of a signature request.
     *
     * @param id the signature request ID
     * @return the current status including per-signer details
     */
    @GetMapping("/{id}")
    public ResponseEntity<SignatureResponse> getSignatureStatus(@PathVariable String id) {
        SignatureResponse response = turboSignService.getSignatureStatus(id);
        return ResponseEntity.ok(response);
    }

    /**
     * Cancel a pending signature request.
     *
     * @param id the signature request ID to cancel
     * @return 204 No Content on success
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancelSignatureRequest(@PathVariable String id) {
        turboSignService.cancelSignatureRequest(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Webhook endpoint for receiving TurboSign status update callbacks.
     * Configure this URL in your TurboSign dashboard or pass it as callbackUrl
     * in the signature request.
     *
     * @param payload the webhook event payload from TurboSign
     * @return 200 OK acknowledgement
     */
    @PostMapping("/webhook")
    public ResponseEntity<Map<String, String>> handleWebhook(@RequestBody Map<String, Object> payload) {
        log.info("Received TurboSign webhook: event={}, signatureRequestId={}",
                payload.get("event"), payload.get("signatureRequestId"));

        String event = (String) payload.get("event");

        switch (event != null ? event : "") {
            case "signature_request.completed":
                log.info("All signers have signed document for request: {}",
                        payload.get("signatureRequestId"));
                break;
            case "signature_request.signer_completed":
                log.info("Signer {} completed signing for request: {}",
                        payload.get("signerEmail"), payload.get("signatureRequestId"));
                break;
            case "signature_request.declined":
                log.warn("Signature request {} was declined",
                        payload.get("signatureRequestId"));
                break;
            case "signature_request.expired":
                log.warn("Signature request {} has expired",
                        payload.get("signatureRequestId"));
                break;
            default:
                log.info("Unhandled TurboSign webhook event: {}", event);
        }

        return ResponseEntity.ok(Map.of("status", "received"));
    }
}
