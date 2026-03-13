import { NextRequest, NextResponse } from 'next/server';
import { getDocumentStatus } from '@/lib/turbosign';

/**
 * GET /api/turbosign/status/:documentId
 *
 * Check the signing status of a document.
 *
 * Returns { status } where status is one of:
 *   'under_review', 'sent', 'completed', 'voided', etc.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const { documentId } = params;

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      );
    }

    const result = await getDocumentStatus(documentId);

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
