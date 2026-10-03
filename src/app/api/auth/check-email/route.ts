import { NextResponse } from "next/server";
// Retired: login failures must not disclose whether an account exists.
export async function POST() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
