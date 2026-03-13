package com.example.app.service;

import com.example.app.dto.SignatureRequest;
import com.example.app.dto.SignatureResponse;
import com.turbodocx.TurboDocxClient;
import com.turbodocx.model.SignRequest;
import com.turbodocx.model.SignRequestSigner;
import com.turbodocx.model.SignRequestResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service layer for TurboSign digital signature operations.
 * Wraps the TurboDocx SDK client and translates between DTOs and SDK models.
 */
@Service
public class TurboSignService {

    private static final Logger log = LoggerFactory.getLogger(TurboSignService.class);

    private final TurboDocxClient client;

    @Value("${turbosign.webhook-url:}")
    private String defaultWebhookUrl;

    public TurboSignService(TurboDocxClient client) {
        this.client = client;
    }

    /**
     * Sends a document for digital signature to all specified signers.
     *
     * @param request the signature request containing document URL and signer details
     * @return a SignatureResponse with the created request ID and initial status
     */
    public SignatureResponse sendForSignature(SignatureRequest request) {
        log.info("Sending document '{}' for signature to {} signer(s)",
                request.getDocumentName(), request.getSigners().size());

        List<SignRequestSigner> signers = request.getSigners().stream()
                .map(s -> new SignRequestSigner.Builder()
                        .name(s.getName())
                        .email(s.getEmail())
                        .order(s.getOrder())
                        .build())
                .collect(Collectors.toList());

        String callbackUrl = request.getCallbackUrl() != null
                ? request.getCallbackUrl()
                : defaultWebhookUrl;

        SignRequest signRequest = new SignRequest.Builder()
                .documentUrl(request.getDocumentUrl())
                .documentName(request.getDocumentName())
                .signers(signers)
                .callbackUrl(callbackUrl)
                .message(request.getMessage())
                .build();

        SignRequestResult result = client.turboSign().sendSignatureRequest(signRequest);

        SignatureResponse response = new SignatureResponse();
        response.setSignatureRequestId(result.getSignatureRequestId());
        response.setStatus(result.getStatus());
        response.setDocumentName(request.getDocumentName());
        response.setCreatedAt(result.getCreatedAt());

        log.info("Signature request created with ID: {}", result.getSignatureRequestId());
        return response;
    }

    /**
     * Retrieves the current status of a signature request.
     *
     * @param signatureRequestId the unique ID of the signature request
     * @return a SignatureResponse with current status and per-signer details
     */
    public SignatureResponse getSignatureStatus(String signatureRequestId) {
        log.info("Fetching status for signature request: {}", signatureRequestId);

        SignRequestResult result = client.turboSign().getSignatureRequest(signatureRequestId);

        SignatureResponse response = new SignatureResponse();
        response.setSignatureRequestId(result.getSignatureRequestId());
        response.setStatus(result.getStatus());
        response.setDocumentName(result.getDocumentName());
        response.setCreatedAt(result.getCreatedAt());
        response.setUpdatedAt(result.getUpdatedAt());
        response.setSignedDocumentUrl(result.getSignedDocumentUrl());

        if (result.getSigners() != null) {
            List<SignatureResponse.SignerStatus> signerStatuses = result.getSigners().stream()
                    .map(s -> {
                        SignatureResponse.SignerStatus ss = new SignatureResponse.SignerStatus();
                        ss.setName(s.getName());
                        ss.setEmail(s.getEmail());
                        ss.setStatus(s.getStatus());
                        ss.setSignedAt(s.getSignedAt());
                        return ss;
                    })
                    .collect(Collectors.toList());
            response.setSigners(signerStatuses);
        }

        return response;
    }

    /**
     * Cancels a pending signature request.
     *
     * @param signatureRequestId the unique ID of the signature request to cancel
     */
    public void cancelSignatureRequest(String signatureRequestId) {
        log.info("Cancelling signature request: {}", signatureRequestId);
        client.turboSign().cancelSignatureRequest(signatureRequestId);
        log.info("Signature request {} cancelled successfully", signatureRequestId);
    }
}
