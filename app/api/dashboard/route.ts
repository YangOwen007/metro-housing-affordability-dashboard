import { NextResponse } from "next/server";
import { getDashboardDataset } from "@/lib/dashboard-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// This route uses the same repository logic as the page so file-backed and DB-backed modes stay in sync.
export async function GET() {
  try {
    return NextResponse.json(await getDashboardDataset(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    // Database errors can contain private connection details; keep the public response generic.
    return NextResponse.json({ error: "Dashboard data unavailable." }, {
      status: 503, headers: { "Cache-Control": "no-store" }
    });
  }
}
