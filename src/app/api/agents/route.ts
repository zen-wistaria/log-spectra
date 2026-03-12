import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateToken } from "@/lib/token";

// ── POST: Create new agent ─────────────────────────────────

interface CreateAgentBody {
  name: string;
  description?: string;
  hostname?: string;
  ip_address?: string;
  os?: string;
}

export async function POST(request: Request) {
  try {
    const body: CreateAgentBody = await request.json();

    // Validate
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { status: "error", message: "Field 'name' is required" },
        { status: 400 },
      );
    }

    // Create agent
    const agent = await prisma.agent.create({
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || null,
      },
    });

    // Auto-generate API token for this agent
    const tokenValue = generateToken();
    await prisma.apiToken.create({
      data: {
        agent_id: agent.id,
        token: tokenValue,
      },
    });

    return NextResponse.json({
      status: "ok",
      data: {
        agent: {
          id: agent.id,
          machine_id: agent.machine_id,
          name: agent.name,
          description: agent.description,
          hostname: agent.hostname,
          ip_address: agent.ip_address,
          os: agent.os,
          status: agent.status,
          created_at: agent.created_at,
        },
        // Token is shown ONLY on creation
        token: tokenValue,
      },
    });
  } catch (error) {
    console.error("Error creating agent:", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: 500 },
    );
  }
}

// ── GET: List all agents ────────────────────────────────────

export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      orderBy: { created_at: "desc" },
      include: {
        _count: {
          select: {
            anomaly_logs: true,
            tokens: true,
          },
        },
      },
    });

    return NextResponse.json({
      status: "ok",
      data: agents,
    });
  } catch (error) {
    console.error("Error listing agents:", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: 500 },
    );
  }
}
