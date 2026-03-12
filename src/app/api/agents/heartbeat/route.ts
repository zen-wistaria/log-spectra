import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ── Types ───────────────────────────────────────────────────

interface HeartbeatPayload {
  server_id: string;
  machine_id: string;
  version: string;
  os: string;
  hostname: string;
  ip_address?: string;
  timestamp: string;
  buffer_size: number;
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

  // Update token last_used
  await prisma.apiToken.update({
    where: { id: apiToken.id },
    data: { last_used: new Date() },
  });

  return {
    valid: true,
    agentId: apiToken.agent.id,
  };
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
    const body: HeartbeatPayload = await request.json();

    // 3. Validate
    if (!body.machine_id || typeof body.machine_id !== "string") {
      return NextResponse.json(
        { status: "error", message: "Missing or invalid machine_id" },
        { status: 400 },
      );
    }

    const agentId = auth.agentId as string;

    // 4. Verify agent exists and machine_id matches
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return NextResponse.json(
        { status: "error", message: "Agent not found" },
        { status: 404 },
      );
    }

    // First heartbeat — register machine_id
    if (!agent.machine_id) {
      await prisma.agent.update({
        where: { id: agentId },
        data: {
          machine_id: body.machine_id,
          version: body.version,
          os: body.os,
          hostname: body.hostname,
          ip_address: body.ip_address,
          status: "online",
          last_seen: new Date(),
        },
      });
    } else {
      // Verify machine_id matches
      if (agent.machine_id !== body.machine_id) {
        return NextResponse.json(
          {
            status: "error",
            message: "Token is not authorized for this machine",
          },
          { status: 403 },
        );
      }

      // Update agent status and metadata
      await prisma.agent.update({
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
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Error processing heartbeat:", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: 500 },
    );
  }
}
