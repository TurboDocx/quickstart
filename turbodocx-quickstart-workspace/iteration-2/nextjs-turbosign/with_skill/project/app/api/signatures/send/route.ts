import { NextRequest, NextResponse } from 'next/server';
import { TurboSign } from '@/lib/turbodocx';
import { TurboDocxError } from '@turbodocx/sdk';

/**
 * POST /api/signatures/send
 *
 * Accepts a multipart form upload with:
 *   - file: PDF file to send for signature
 *   - documentName: display name for the document
 *   - recipients: JSON string — array of { name, email, signingOrder }
 *   - fields: JSON string — array of field placement objects
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Extract the uploaded PDF file
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json(
        { error: 'Missing required field: file' },
        { status: 400 },
      );
    }

    const documentName = formData.get('documentName') as string;
    if (!documentName) {
      return NextResponse.json(
        { error: 'Missing required field: documentName' },
        { status: 400 },
      );
    }

    // Parse recipients and fields from JSON strings
    const recipientsRaw = formData.get('recipients') as string;
    const fieldsRaw = formData.get('fields') as string;

    if (!recipientsRaw || !fieldsRaw) {
      return NextResponse.json(
        { error: 'Missing required fields: recipients, fields' },
        { status: 400 },
      );
    }

    const recipients = JSON.parse(recipientsRaw);
    const fields = JSON.parse(fieldsRaw);

    // Convert the uploaded file to a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Send the document for e-signature
    const result = await TurboSign.sendSignature({
      file: buffer,
      documentName,
      recipients,
      fields,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TurboDocxError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status ?? 500 },
      );
    }

    return NextResponse.json(
      { error: 'Signature request failed' },
      { status: 500 },
    );
  }
}
