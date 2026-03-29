import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { bolnaClient } from "@/lib/bolna-client";
import prisma from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Parse body ────────────────────────────────────────────────────────
    const body = await req.json() as {
      phoneNumber?: string;
      agentId?: string;
      tenantId?: string;
      fromNumber?: string;
      userData?: Record<string, string | number | boolean>;
    };

    const { phoneNumber, agentId, tenantId, fromNumber, userData } = body;

    if (!phoneNumber || !agentId || !tenantId) {
      return NextResponse.json(
        { error: "Missing required fields: phoneNumber, agentId, tenantId" },
        { status: 400 }
      );
    }

    // ── Tenant isolation ──────────────────────────────────────────────────
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, tenantId },
    });

    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found for this tenant" },
        { status: 404 }
      );
    }

    // ── Trigger Bolna call ────────────────────────────────────────────────
    let bolnaResponse: { call_id: string; status: string };
    try {
      bolnaResponse = await bolnaClient.triggerCall({
        agent_id: agent.bolnaAgentId,
        recipient_phone_number: phoneNumber,
        from_phone_number: fromNumber,
        user_data: userData,
      });
    } catch (bolnaErr) {
      console.error("[trigger/route] Bolna API error:", bolnaErr);
      return NextResponse.json(
        { error: "Failed to connect to Bolna. Please try again." },
        { status: 502 }
      );
    }

    const { call_id } = bolnaResponse;

    // ── Persist in local DB ───────────────────────────────────────────────
    const execution = await prisma.callExecution.create({
      data: {
        tenantId,
        agentId,
        phoneNumber,
        bolnaExecutionId: call_id, // Bolna's call_id stored as bolnaExecutionId
        status: "queued",
      },
    });

    return NextResponse.json({
      success: true,
      callId: execution.id,
      bolnaCallId: call_id,
    });
  } catch (error: unknown) {
    console.error("[trigger/route] Internal error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
