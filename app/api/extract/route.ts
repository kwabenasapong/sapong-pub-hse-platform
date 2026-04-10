import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Max file size: 10MB
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    if (ext === "txt") {
      // Plain text — decode directly
      text = buffer.toString("utf-8");

    } else if (ext === "docx") {
      // Use mammoth to extract text from Word documents
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;

    } else if (ext === "pdf") {
      // Use pdf-parse to extract text from PDF
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse");
      const data = await pdfParse(buffer);
      text = data.text;

    } else {
      return NextResponse.json(
        { error: `Unsupported file type ".${ext}". Use .txt, .docx, or .pdf` },
        { status: 400 }
      );
    }

    // Clean up extracted text
    text = text
      .replace(/\r\n/g, "\n")           // normalise line endings
      .replace(/\r/g, "\n")
      .replace(/\n{3,}/g, "\n\n")       // collapse excessive blank lines
      .trim();

    if (!text) {
      return NextResponse.json(
        { error: "Could not extract text from this file. It may be scanned/image-only." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      filename: file.name,
      text,
      charCount: text.length,
      wordCount: text.split(/\s+/).filter(Boolean).length,
    });

  } catch (err) {
    console.error("File extraction error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Extraction failed" },
      { status: 500 }
    );
  }
}
