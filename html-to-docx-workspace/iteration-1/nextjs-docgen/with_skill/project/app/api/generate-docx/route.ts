import { NextRequest, NextResponse } from 'next/server';
import { generateDocx } from '@/lib/generate-docx';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { html, filename = 'document', options } = body;

    if (!html || typeof html !== 'string') {
      return NextResponse.json(
        { error: 'html field is required and must be a string' },
        { status: 400 },
      );
    }

    const buffer = await generateDocx(html, options);

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}.docx"`,
      },
    });
  } catch (error) {
    console.error('DOCX generation failed:', error);
    return NextResponse.json(
      { error: 'Document generation failed' },
      { status: 500 },
    );
  }
}
