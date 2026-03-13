package com.example.app.controller;

import com.turbodocx.TurboDocxClient;
import com.turbodocx.models.*;
import com.turbodocx.exceptions.TurboDocxException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;

import java.util.List;
import java.util.Map;

/**
 * REST controller for TurboSign digital signature operations.
 *
 * Endpoints:
 *   POST /api/signatures/send   — Send a document for e-signature
 *   GET  /api/signatures/{id}/status — Check the signing status of a document
 */
@RestController
@RequestMapping("/api/signatures")
public class SignatureController {

    private final TurboDocxClient client;
    private final ObjectMapper objectMapper;

    public SignatureController(TurboDocxClient client, ObjectMapper objectMapper) {
        this.client = client;
        this.objectMapper = objectMapper;
    }

    /**
     * Send a document for digital signature.
     *
     * @param file          The PDF file to be signed (multipart upload)
     * @param documentName  Human-readable name for the document
     * @param recipientsJson JSON array of recipients, e.g.
     *                       [{"name":"John Doe","email":"john@example.com","order":1}]
     * @param fieldsJson    JSON array of signature fields, e.g.
     *                       [{"type":"signature","recipientEmail":"john@example.com",
     *                         "template":{"anchor":"{signature1}","placement":"replace",
     *                         "size":{"width":100,"height":30}}}]
     * @return The send signature response containing the document ID
     */
    @PostMapping("/send")
    public ResponseEntity<?> sendSignature(
        @RequestParam("file") MultipartFile file,
        @RequestParam("documentName") String documentName,
        @RequestParam("recipients") String recipientsJson,
        @RequestParam("fields") String fieldsJson
    ) {
        try {
            // Parse the recipients and fields from JSON strings
            List<Recipient> recipients = objectMapper.readValue(
                recipientsJson, new TypeReference<>() {}
            );
            List<Field> fields = objectMapper.readValue(
                fieldsJson, new TypeReference<>() {}
            );

            // Build and send the signature request
            SendSignatureResponse result = client.turboSign().sendSignature(
                new SendSignatureRequest.Builder()
                    .file(file.getBytes())
                    .fileName(file.getOriginalFilename())
                    .documentName(documentName)
                    .recipients(recipients)
                    .fields(fields)
                    .build()
            );

            return ResponseEntity.ok(result);
        } catch (TurboDocxException e) {
            // Return the SDK error status code and message
            return ResponseEntity.status(e.getStatusCode())
                .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Signature request failed"));
        }
    }

    /**
     * Check the signing status of a document.
     *
     * @param id The document ID returned from the send endpoint
     * @return Document status including per-recipient signing status
     */
    @GetMapping("/{id}/status")
    public ResponseEntity<?> getStatus(@PathVariable String id) {
        try {
            // Retrieve the current status of the document
            DocumentStatus status = client.turboSign().getStatus(id);
            return ResponseEntity.ok(status);
        } catch (TurboDocxException e) {
            return ResponseEntity.status(e.getStatusCode())
                .body(Map.of("error", e.getMessage()));
        }
    }
}
