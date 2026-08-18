import { NextResponse } from "next/server";
import { cleanupExpiredBlobs } from "@/lib/blobCleanup";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorized = secret
    ? request.headers.get("authorization") === `Bearer ${secret}`
    : request.headers.get("user-agent") === "vercel-cron/1.0";

  if (!authorized) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  const deletedFiles = await cleanupExpiredBlobs();
  return NextResponse.json({ success: true, deletedFiles });
}
