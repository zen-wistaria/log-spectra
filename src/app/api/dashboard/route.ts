import { NextResponse } from "next/server";
import { AnomalyService } from "@/services/anomaly.service";

export async function GET() {
  try {
    const [topIps, stats] = await Promise.all([
      AnomalyService.getTop10SuspiciousIP(),
      AnomalyService.getDashboardStats(),
    ]);

    return NextResponse.json({
      status: "ok",
      stats,
      top_ips: topIps,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: 500 },
    );
  }
}
