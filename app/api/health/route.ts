import { NextResponse } from "next/server";
import { resolveDashboardDataSource } from "@/lib/dashboard-repository";
import { getDataSourceMode } from "@/lib/runtime-config";

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
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        dataSourceMode: getDataSourceMode(),
        error: error instanceof Error ? error.message : "Unknown health-check error"
      },
      { status: 500 }
    );
  }
}
