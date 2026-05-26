import { NextResponse } from "next/server";
import { parseVentureReadinessText } from "@/lib/venture-readiness/parser";

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

    // pdf-parse v2: class-based API. require() keeps it out of the webpack bundle.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFParse } = require("pdf-parse") as {
      PDFParse: new (opts: { data: Buffer }) => { getText(): Promise<{ text: string }> };
    };
    const { text } = await new PDFParse({ data: buffer }).getText();

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
