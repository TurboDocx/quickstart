import { NextRequest, NextResponse } from "next/server";
import { htmlToDocx } from "@turbodocx/html-to-docx";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { html } = body;

    if (!html || typeof html !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'html' field in request body" },
        { status: 400 }
      );
    }

    const docxBuffer = await htmlToDocx(html);

    return new NextResponse(docxBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="document.docx"',
      },
    });
  } catch (error) {
    console.error("DOCX generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate DOCX" },
      { status: 500 }
    );
  }
}
