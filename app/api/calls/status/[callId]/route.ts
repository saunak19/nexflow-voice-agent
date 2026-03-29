import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { bolnaClient } from "@/lib/bolna-client";
import prisma from "@/lib/db";

const RATE_LIMIT_SECONDS = 30;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { callId } = await params;
    if (!callId) {
      return NextResponse.json({ error: "Missing callId" }, { status: 400 });
    }

    // ── Look up local execution ────────────────────────────────────────────
    const execution = await prisma.callExecution.findFirst({
      where: { id: callId },
      include: { agent: true },
    });

    if (!execution) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    // ── Rate limit: skip Bolna poll if recently updated ────────────────────
    const secondsSinceUpdate =
      (Date.now() - execution.updatedAt.getTime()) / 1000;
    if (secondsSinceUpdate < RATE_LIMIT_SECONDS) {
      return NextResponse.json({
        id: execution.id,
        status: execution.status,
        transcript: execution.transcript,
        recordingUrl: execution.recordingUrl,
        duration: execution.duration,
        cost: execution.cost,
        updatedAt: execution.updatedAt,
        cached: true,
      });
    }

    // ── Poll Bolna for latest status ───────────────────────────────────────
    let bolnaData;
    try {
      bolnaData = await bolnaClient.getCallStatus(execution.bolnaExecutionId);
    } catch (bolnaErr) {
      console.error("[status/route] Bolna poll failed:", bolnaErr);
      // Return stale local data rather than erroring
      return NextResponse.json({
        id: execution.id,
        status: execution.status,
        transcript: execution.transcript,
        recordingUrl: execution.recordingUrl,
        duration: execution.duration,
        cost: execution.cost,
        updatedAt: execution.updatedAt,
        cached: true,
      });
    }

    // ── Update Prisma with fresh data ──────────────────────────────────────
    const updated = await prisma.callExecution.update({
      where: { id: execution.id },
      data: {
        status: bolnaData.status ?? execution.status,
        transcript: bolnaData.transcript ?? execution.transcript,
        recordingUrl: bolnaData.recording_url ?? execution.recordingUrl,
        duration: bolnaData.duration ?? execution.duration,
        cost: bolnaData.cost ?? execution.cost,
      },
    });

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      transcript: updated.transcript,
      recordingUrl: updated.recordingUrl,
      duration: updated.duration,
      cost: updated.cost,
      updatedAt: updated.updatedAt,
      cached: false,
    });
  } catch (error: unknown) {
    console.error("[status/route] Internal error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
