import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ── GET: Agent detail ───────────────────────────────────────

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        tokens: {
          select: {
            id: true,
            is_active: true,
            last_used: true,
            created_at: true,
          },
          orderBy: { created_at: "desc" },
        },
        anomaly_logs: {
          orderBy: { updated_at: "desc" },
          take: 20,
        },
        _count: {
          select: { anomaly_logs: true, tokens: true },
        },
      },
    });

    if (!agent) {
      return NextResponse.json(
        { status: "error", message: "Agent not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ status: "ok", data: agent });
  } catch (error) {
    console.error("Error fetching agent:", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: 500 },
    );
  }
}

// ── PATCH: Update agent metadata ────────────────────────────

interface UpdateAgentBody {
  name?: string;
  description?: string;
  hostname?: string;
  ip_address?: string;
  os?: string;
  status?: string;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: UpdateAgentBody = await request.json();

    const existing = await prisma.agent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { status: "error", message: "Agent not found" },
        { status: 404 },
      );
    }

    const agent = await prisma.agent.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.description !== undefined && {
          description: body.description?.trim() || null,
        }),
        ...(body.hostname !== undefined && {
          hostname: body.hostname?.trim() || null,
        }),
        ...(body.ip_address !== undefined && {
          ip_address: body.ip_address?.trim() || null,
        }),
        ...(body.os !== undefined && { os: body.os?.trim() || null }),
        ...(body.status !== undefined && { status: body.status }),
      },
    });

    return NextResponse.json({ status: "ok", data: agent });
  } catch (error) {
    console.error("Error updating agent:", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: 500 },
    );
  }
}

// ── DELETE: Soft delete agent + deactivate tokens ───────────

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const existing = await prisma.agent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { status: "error", message: "Agent not found" },
        { status: 404 },
      );
    }

    await prisma.$transaction([
      // Deactivate all tokens
      prisma.apiToken.updateMany({
        where: { agent_id: id },
        data: { is_active: false },
      }),
      // Soft delete agent
      prisma.agent.update({
        where: { id },
        data: { status: "deleted" },
      }),
    ]);

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Error deleting agent:", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: 500 },
    );
  }
}
