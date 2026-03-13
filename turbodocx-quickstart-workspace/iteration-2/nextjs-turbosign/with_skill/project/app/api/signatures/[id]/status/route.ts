import { NextRequest, NextResponse } from 'next/server';
import { TurboSign } from '@/lib/turbodocx';
import { TurboDocxError } from '@turbodocx/sdk';

/**
 * GET /api/signatures/:id/status
 *
 * Returns the signing status and per-recipient details for a document.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;

    const status = await TurboSign.getStatus(id);

    return NextResponse.json(status);
  } catch (error) {
    if (error instanceof TurboDocxError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status ?? 500 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to get document status' },
      { status: 500 },
    );
  }
}
