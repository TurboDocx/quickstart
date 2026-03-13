import { NextRequest, NextResponse } from 'next/server';
import { sendForSignature } from '@/lib/turbosign';
import type { Recipient, Field } from '@/lib/turbosign';

/**
 * POST /api/turbosign/send
 *
 * Send a document for e-signature. Accepts JSON with:
 *   - fileLink (string)        — URL to a PDF file
 *   - deliverableId (string)   — TurboDocx deliverable ID
 *   - recipients (Recipient[]) — signers with name, email, signingOrder
 *   - fields (Field[])         — signature/field placement configuration
 *   - documentName (string)    — optional display name
 *   - documentDescription (string) — optional description
 *
 * Returns { success, documentId, message }.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      fileLink,
      deliverableId,
      recipients,
      fields,
      documentName,
      documentDescription,
    } = body as {
      fileLink?: string;
      deliverableId?: string;
      recipients: Recipient[];
      fields: Field[];
      documentName?: string;
      documentDescription?: string;
    };

    // Validate required fields
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: 'recipients array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json(
        { error: 'fields array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (!fileLink && !deliverableId) {
      return NextResponse.json(
        { error: 'Either fileLink or deliverableId is required' },
        { status: 400 }
      );
    }

    const result = await sendForSignature({
      fileLink,
      deliverableId,
      recipients,
      fields,
      documentName,
      documentDescription,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    const statusCode =
      error && typeof error === 'object' && 'statusCode' in error
        ? (error as { statusCode: number }).statusCode
        : 500;

    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
