import { NextResponse } from "next/server";
import { getDashboardDataset } from "@/lib/dashboard-repository";

// This route uses the same repository logic as the page so file-backed and DB-backed modes stay in sync.
export async function GET() {
  return NextResponse.json(await getDashboardDataset());
}
