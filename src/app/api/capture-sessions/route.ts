import { NextResponse } from "next/server";
import { createCaptureSession } from "@/lib/captureSessions";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(await createCaptureSession());
}
