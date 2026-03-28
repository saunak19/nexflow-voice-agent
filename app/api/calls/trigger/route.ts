import { NextRequest, NextResponse } from 'next/server';
import { bolnaClient } from '@/lib/bolna-client';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, agentId, tenantId } = await req.json();

    if (!phoneNumber || !agentId || !tenantId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        tenantId,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found for this tenant' }, { status: 404 });
    }

    // Securely invoke Bolna API from the server (client never sees API keys)
    const { execution_id } = await bolnaClient.triggerCall({
      phone_number: phoneNumber,
      agent_id: agent.bolnaAgentId,
    });

    // Log the initiation in NexFlow DB
    const execution = await prisma.callExecution.create({
      data: {
        tenantId,
        agentId,
        phoneNumber,
        bolnaExecutionId: execution_id,
        status: 'queued',
      },
    });

    return NextResponse.json({ 
      success: true, 
      executionId: execution.id, 
      bolnaExecutionId: execution_id 
    });

  } catch (error: unknown) {
    console.error('Failed to trigger AI call:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
