import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { generateToken } from "@/lib/token";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ── POST: Generate new token for agent ──────────────────────

export async function POST(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session) {
    return NextResponse.json(
      { status: "error", message: "Unauthorized" },
      { status: 401 },
    );
  }
  try {
    const { id } = await params;

    const agent = await prisma.agents.findUnique({ where: { id } });
    if (!agent) {
      return NextResponse.json(
        { status: "error", message: "Agent not found" },
        { status: 404 },
      );
    }

    if (agent.status === "deleted") {
      return NextResponse.json(
        { status: "error", message: "Cannot generate token for deleted agent" },
        { status: 400 },
      );
    }

    const tokenValue = generateToken();
    const apiToken = await prisma.apiTokens.create({
      data: {
        agent_id: agent.id,
        token: tokenValue,
      },
    });

    return NextResponse.json({
      status: "ok",
      data: {
        id: apiToken.id,
        // Token shown ONLY on creation
        token: tokenValue,
        created_at: apiToken.created_at,
      },
    });
  } catch (error) {
    console.error("Error generating token:", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: 500 },
    );
  }
}

// ── GET: List tokens for agent ──────────────────────────────

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session) {
    return NextResponse.json(
      { status: "error", message: "Unauthorized" },
      { status: 401 },
    );
  }
  try {
    const { id } = await params;

    const agent = await prisma.agents.findUnique({ where: { id } });
    if (!agent) {
      return NextResponse.json(
        { status: "error", message: "Agent not found" },
        { status: 404 },
      );
    }

    const tokens = await prisma.apiTokens.findMany({
      where: { agent_id: id },
      select: {
        id: true,
        is_active: true,
        last_used: true,
        created_at: true,
        // Do NOT expose the token value in list
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ status: "ok", data: tokens });
  } catch (error) {
    console.error("Error listing tokens:", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: 500 },
    );
  }
}
