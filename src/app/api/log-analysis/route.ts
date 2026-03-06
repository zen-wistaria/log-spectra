import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface AnalysisResult {
  ip: string;
  request_count: number;
  error_count: number;
  request_per_second: number;
  unique_endpoint_ratio: number;
  risk_score: number;
  risk_category: string;
  risk_reasons: string[];
}

interface AnalysisPayload {
  server_id: string;
  timestamp: string;
  results: AnalysisResult[];
}

async function authenticateRequest(
  request: Request,
): Promise<{ valid: boolean; error?: string; serverId?: string }> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { valid: false, error: "Missing or invalid Authorization header" };
  }

  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return { valid: false, error: "Empty token" };
  }

  const apiToken = await prisma.apiToken.findUnique({
    where: { token },
  });

  if (!apiToken) {
    return { valid: false, error: "Invalid token" };
  }

  if (!apiToken.is_active) {
    return { valid: false, error: "Token is deactivated" };
  }

  // Update last_used timestamp
  await prisma.apiToken.update({
    where: { id: apiToken.id },
    data: { last_used: new Date() },
  });

  return { valid: true, serverId: apiToken.server_id ?? undefined };
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate
    const auth = await authenticateRequest(request);
    if (!auth.valid) {
      return NextResponse.json(
        { status: "error", message: auth.error },
        { status: 401 },
      );
    }

    // 2. Parse body
    const body: AnalysisPayload = await request.json();

    // 3. Validate payload
    if (!body.server_id || typeof body.server_id !== "string") {
      return NextResponse.json(
        { status: "error", message: "Missing or invalid server_id" },
        { status: 400 },
      );
    }

    // If token is restricted to a specific server_id, enforce it
    if (auth.serverId && auth.serverId !== body.server_id) {
      return NextResponse.json(
        {
          status: "error",
          message: "Token is not authorized for this server_id",
        },
        { status: 403 },
      );
    }

    if (!body.timestamp || typeof body.timestamp !== "string") {
      return NextResponse.json(
        { status: "error", message: "Missing or invalid timestamp" },
        { status: 400 },
      );
    }

    if (!Array.isArray(body.results) || body.results.length === 0) {
      return NextResponse.json(
        { status: "error", message: "Missing or empty results array" },
        { status: 400 },
      );
    }

    // 4. Validate each result
    for (const result of body.results) {
      if (!result.ip || typeof result.ip !== "string") {
        return NextResponse.json(
          {
            status: "error",
            message: "Each result must have a valid ip",
          },
          { status: 400 },
        );
      }
      if (typeof result.request_count !== "number") {
        return NextResponse.json(
          {
            status: "error",
            message: `Invalid request_count for ip ${result.ip}`,
          },
          { status: 400 },
        );
      }
    }

    // 5. Upsert each result (accumulate counts, update other fields)
    const operations = body.results.map((result) => {
      const riskReasonsJson = JSON.stringify(result.risk_reasons || []);

      return prisma.anomalyLog.upsert({
        where: {
          server_id_ip: {
            server_id: body.server_id,
            ip: result.ip,
          },
        },
        create: {
          server_id: body.server_id,
          ip: result.ip,
          request_count: result.request_count,
          error_count: result.error_count ?? 0,
          request_per_second: result.request_per_second ?? 0,
          unique_endpoint_ratio: result.unique_endpoint_ratio ?? 0,
          risk_score: result.risk_score ?? 0,
          risk_category: result.risk_category ?? "LOW",
          risk_reasons: riskReasonsJson,
        },
        update: {
          request_count: { increment: result.request_count },
          error_count: { increment: result.error_count ?? 0 },
          request_per_second: result.request_per_second ?? 0,
          unique_endpoint_ratio: result.unique_endpoint_ratio ?? 0,
          risk_score: result.risk_score ?? 0,
          risk_category: result.risk_category ?? "LOW",
          risk_reasons: riskReasonsJson,
        },
      });
    });

    await prisma.$transaction(operations);

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Error processing log analysis:", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: 500 },
    );
  }
}
