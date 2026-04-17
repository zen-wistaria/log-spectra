import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ── Types ───────────────────────────────────────────────────

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
  machine_id: string;
  version: string;
  os: string;
  hostname: string;
  ip_address?: string;
  server_id: string;
  timestamp: string;
  results: AnalysisResult[];
}

// ── Auth Helper ─────────────────────────────────────────────

async function authenticateRequest(request: Request): Promise<{
  valid: boolean;
  error?: string;
  agentId?: string;
}> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { valid: false, error: "Missing or invalid Authorization header" };
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    return { valid: false, error: "Empty token" };
  }

  try {
    const apiToken = await prisma.apiToken.findUnique({
      where: { token },
      include: { agent: true },
    });

    if (!apiToken) {
      return { valid: false, error: "Invalid token" };
    }

    if (!apiToken.is_active) {
      return { valid: false, error: "Token is deactivated" };
    }

    // if (apiToken.agent.status === "deleted") {
    //   return { valid: false, error: "Agent has been deleted" };
    // }

    // Update token last_used
    await prisma.apiToken.update({
      where: { id: apiToken.id },
      data: { last_used: new Date() },
    });

    return {
      valid: true,
      agentId: apiToken.agent.id,
    };
  } catch {
    return { valid: false, error: "Invalid token" };
  }
}

// ── POST Handler ────────────────────────────────────────────

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

    // Enforce: token must belong to the agent with this server_id
    const agent = await prisma.agent.findUnique({
      where: {
        id: auth.agentId,
      },
    });
    if (!agent) {
      return NextResponse.json(
        {
          status: "error",
          message: "Agent not found",
        },
        { status: 404 },
      );
    }
    if (!agent.machine_id) {
      // registration
      await prisma.agent.update({
        where: {
          id: auth.agentId,
        },
        data: {
          machine_id: body.machine_id,
          version: body.version,
          os: body.os,
          hostname: body.hostname,
          ip_address: body.ip_address,
        },
      });
    } else {
      if (agent.machine_id !== body.machine_id) {
        return NextResponse.json(
          {
            status: "error",
            message: "Token is not authorized for this server_id",
          },
          { status: 403 },
        );
      }
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

    const agentId = auth.agentId as string;

    // Collect current report IPs for cleanup
    const currentIps = body.results.map((r) => r.ip);

    await prisma.$transaction(async (tx) => {
      // Upsert each result — replace (not increment) since agent
      // now sends analysis of the full accumulated buffer
      for (const result of body.results) {
        const riskReasons = Array.isArray(result.risk_reasons)
          ? result.risk_reasons
          : [];

        const data = {
          request_count: result.request_count,
          error_count: result.error_count ?? 0,
          request_per_second: result.request_per_second ?? 0,
          unique_endpoint_ratio: result.unique_endpoint_ratio ?? 0,
          risk_score: result.risk_score ?? 0,
          risk_category: result.risk_category ?? "LOW",
          risk_reasons: riskReasons,
        };

        await tx.anomalyLog.upsert({
          where: {
            agent_id_ip: {
              agent_id: agentId,
              ip: result.ip,
            },
          },
          create: {
            agent_id: agentId,
            ip: result.ip,
            ...data,
          },
          update: data,
        });
      }

      // Remove stale IPs no longer present in the latest report
      await tx.anomalyLog.deleteMany({
        where: {
          agent_id: agentId,
          ip: { notIn: currentIps },
        },
      });

      // Update agent metadata
      await tx.agent.update({
        where: { id: agentId },
        data: {
          status: "online",
          last_seen: new Date(),
          version: body.version,
          os: body.os,
          hostname: body.hostname,
          ip_address: body.ip_address,
        },
      });
    });

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Error processing log analysis:", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: 500 },
    );
  }
}
