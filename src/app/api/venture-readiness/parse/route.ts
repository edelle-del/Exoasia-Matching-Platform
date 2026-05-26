import { NextResponse } from "next/server";
import { parseVentureReadinessText } from "@/lib/venture-readiness/parser";

type PDFParseInstance = {
  getText(): Promise<{ text: string }>;
  destroy(): Promise<void>;
};
type PDFParseConstructor = new (opts: { data: Buffer }) => PDFParseInstance;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "File must be a PDF" },
        { status: 400 },
      );
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File must be under 20 MB" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // require() inside the handler prevents webpack from bundling pdf-parse;
    // v2 uses a class-based API: new PDFParse({ data }) then .getText()
    const { PDFParse } = require("pdf-parse") as { PDFParse: PDFParseConstructor };
    const parser = new PDFParse({ data: buffer });
    const { text } = await parser.getText();
    await parser.destroy();

    if (!text?.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from PDF. Ensure the file is not scanned/image-only." },
        { status: 422 },
      );
    }

    const report = parseVentureReadinessText(text);

    return NextResponse.json({ success: true, data: report });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to parse PDF";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
