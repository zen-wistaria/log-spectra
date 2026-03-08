import { NextResponse } from "next/server";
import { AnomalyService } from "@/services/anomaly.service";

export async function GET() {
  try {
    const data = await AnomalyService.latestLogsReport();
    return NextResponse.json({ status: "ok", data });
  } catch (error) {
    console.error("Dashboard reports API error:", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: 500 },
    );
  }
}
