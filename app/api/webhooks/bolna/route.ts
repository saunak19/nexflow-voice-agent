import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

/**
 * Bolna Webhook Ingestion Endpoint
 * Prevents timeouts by processing events asynchronously if needed, 
 * but here we handle direct updates for simplicity.
 * Idempotency is key.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[BOLNA WEBHOOK]:', JSON.stringify(body, null, 2));

    const { execution_id, event_type, data } = body;

    if (!execution_id) {
      return NextResponse.json({ error: 'Missing execution_id' }, { status: 400 });
    }

    // Find the local execution record
    const execution = await prisma.callExecution.findUnique({
      where: { bolnaExecutionId: execution_id },
      include: { tenant: true },
    });

    if (!execution) {
      console.warn(`[BOLNA WEBHOOK]: Execution ${execution_id} not found in local DB.`);
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }

    // Update the execution record based on event data
    const updateData: {
      status?: string;
      transcript?: string;
      recordingUrl?: string;
      duration?: number;
      cost?: number;
    } = {};
    if (data.status) updateData.status = data.status;
    if (data.transcript) updateData.transcript = data.transcript;
    if (data.recording_url) updateData.recordingUrl = data.recording_url;
    if (data.duration) updateData.duration = data.duration;
    if (data.cost) updateData.cost = data.cost;

    await prisma.callExecution.update({
      where: { id: execution.id },
      data: updateData,
    });

    // Log the event in CallLogs
    await prisma.callLog.create({
      data: {
        tenantId: execution.tenantId,
        callExecutionId: execution.id,
        event: event_type || 'unspecified_event',
        payload: data,
      },
    });

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    console.error('[BOLNA WEBHOOK ERROR]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
