import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import prisma from "@/lib/db";

// ── Event shapes from Bolna ────────────────────────────────────────────────────

interface BolnaWebhookBody {
  call_id: string;
  event_type: string;
  data?: {
    status?: string;
    transcript?: string;
    recording_url?: string;
    duration?: number;
    cost?: number;
  };
}

// ── HMAC verification ──────────────────────────────────────────────────────────

function verifySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.BOLNA_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[BOLNA WEBHOOK] BOLNA_WEBHOOK_SECRET not set — skipping HMAC check");
    return true; // permissive in dev; set the secret in prod
  }
  try {
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const expectedBuf = Buffer.from(expected, "utf8");
    const receivedBuf = Buffer.from(signature, "utf8");
    if (expectedBuf.length !== receivedBuf.length) return false;
    return timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    return false;
  }
}

// ── Status map ────────────────────────────────────────────────────────────────

const EVENT_STATUS_MAP: Record<string, string> = {
  call_initiated: "in-progress",
  call_completed: "completed",
  call_failed: "failed",
};

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Always return 200 to Bolna to prevent infinite retries; log errors internally.
  try {
    const rawBody = await req.text();

    // ── HMAC verification ──────────────────────────────────────────────────
    const signature = req.headers.get("x-bolna-signature") ?? "";
    if (!verifySignature(rawBody, signature)) {
      console.error("[BOLNA WEBHOOK] Invalid signature — request rejected");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Parse body ─────────────────────────────────────────────────────────
    let body: BolnaWebhookBody;
    try {
      body = JSON.parse(rawBody) as BolnaWebhookBody;
    } catch {
      console.error("[BOLNA WEBHOOK] Invalid JSON body");
      return NextResponse.json({ ok: true }); // still 200
    }

    const { call_id, event_type, data } = body;
    console.log(`[BOLNA WEBHOOK] event=${event_type} call_id=${call_id}`);

    if (!call_id) {
      console.warn("[BOLNA WEBHOOK] Missing call_id — ignoring");
      return NextResponse.json({ ok: true });
    }

    // ── Look up local execution by Bolna's call_id ─────────────────────────
    const execution = await prisma.callExecution.findUnique({
      where: { bolnaExecutionId: call_id },
    });

    if (!execution) {
      console.warn(`[BOLNA WEBHOOK] call_id=${call_id} not in local DB — ignoring`);
      return NextResponse.json({ ok: true });
    }

    // ── Idempotency: skip if this exact event was already processed ────────
    const existing = await prisma.callLog.findFirst({
      where: { callExecutionId: execution.id, event: event_type },
    });
    if (existing) {
      console.log(`[BOLNA WEBHOOK] Duplicate event=${event_type} for call_id=${call_id} — skipping`);
      return NextResponse.json({ ok: true });
    }

    // ── Build update payload ───────────────────────────────────────────────
    const updateData: {
      status?: string;
      transcript?: string;
      recordingUrl?: string;
      duration?: number;
      cost?: number;
    } = {};

    if (EVENT_STATUS_MAP[event_type]) updateData.status = EVENT_STATUS_MAP[event_type];

    if (event_type === "transcript_updated" && data?.transcript) {
      updateData.transcript = data.transcript;
    }
    if (event_type === "recording_ready" && data?.recording_url) {
      updateData.recordingUrl = data.recording_url;
    }
    if (event_type === "call_completed") {
      if (data?.transcript) updateData.transcript = data.transcript;
      if (data?.recording_url) updateData.recordingUrl = data.recording_url;
      if (data?.duration !== undefined) updateData.duration = data.duration;
      if (data?.cost !== undefined) updateData.cost = data.cost;
    }

    // ── Persist ────────────────────────────────────────────────────────────
    await prisma.$transaction([
      prisma.callExecution.update({
        where: { id: execution.id },
        data: updateData,
      }),
      prisma.callLog.create({
        data: {
          tenantId: execution.tenantId,
          callExecutionId: execution.id,
          event: event_type ?? "unknown",
          payload: data as object,
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("[BOLNA WEBHOOK] Unhandled error:", error);
    // Return 200 so Bolna does not retry-bomb
    return NextResponse.json({ ok: true });
  }
}
