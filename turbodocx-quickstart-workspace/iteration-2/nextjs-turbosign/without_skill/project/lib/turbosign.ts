import { TurboSign } from '@turbodocx/sdk';
import type {
  SendSignatureRequest,
  SendSignatureResponse,
  DocumentStatusResponse,
} from '@turbodocx/sdk';

/**
 * Initialize TurboSign with environment variables.
 * Call this once before using any TurboSign methods.
 *
 * Required env vars:
 *   TURBODOCX_API_KEY     - Your TurboDocx API key
 *   TURBODOCX_ORG_ID      - Your organization ID
 *   TURBODOCX_SENDER_EMAIL - Reply-to email for signature requests
 *
 * Optional env vars:
 *   TURBODOCX_SENDER_NAME  - Sender display name (recommended)
 *   TURBODOCX_BASE_URL     - API base URL (defaults to https://api.turbodocx.com)
 */
let initialized = false;

function ensureInitialized(): void {
  if (initialized) return;

  TurboSign.configure({
    apiKey: process.env.TURBODOCX_API_KEY,
    orgId: process.env.TURBODOCX_ORG_ID,
    senderEmail: process.env.TURBODOCX_SENDER_EMAIL,
    senderName: process.env.TURBODOCX_SENDER_NAME,
    baseUrl: process.env.TURBODOCX_BASE_URL,
  });

  initialized = true;
}

/**
 * Send a document for e-signature.
 *
 * Accepts a PDF via URL, file buffer, or TurboDocx deliverable ID.
 * Immediately sends signature request emails to all recipients.
 */
export async function sendForSignature(
  request: SendSignatureRequest
): Promise<SendSignatureResponse> {
  ensureInitialized();
  return TurboSign.sendSignature(request);
}

/**
 * Check the status of a previously sent document.
 *
 * Possible statuses: 'under_review', 'sent', 'completed', 'voided', etc.
 */
export async function getDocumentStatus(
  documentId: string
): Promise<DocumentStatusResponse> {
  ensureInitialized();
  return TurboSign.getStatus(documentId);
}

// Re-export types for convenience
export type {
  SendSignatureRequest,
  SendSignatureResponse,
  DocumentStatusResponse,
  Recipient,
  Field,
  SignatureFieldType,
} from '@turbodocx/sdk';
