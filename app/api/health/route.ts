import { NextResponse } from "next/server";
import { resolveDashboardDataSource } from "@/lib/dashboard-repository";
import { getDataSourceMode } from "@/lib/runtime-config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// A tiny health route makes deployment checks and uptime debugging much easier once the app is hosted.
export async function GET() {
  try {
    const { dataset, resolvedSource } = await resolveDashboardDataSource();

    return NextResponse.json({
      ok: true,
      dataSourceMode: getDataSourceMode(),
      resolvedSource,
      updatedAt: dataset.updatedAt,
      regions: dataset.regions.length
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Dashboard data unavailable. Check server configuration and import status."
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
